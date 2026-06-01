// / receipt scan flow
import { X } from 'lucide-react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanCapture } from '@/components/scan/ScanCapture';
import { ScanDone } from '@/components/scan/ScanDone';
import { ScanProcessing, type ProcessingState } from '@/components/scan/ScanProcessing';
import { ScanReconcile, type ScanReconcileLine } from '@/components/scan/ScanReconcile';
import type { ReceiptLineItem } from '@domain/entities/receipt-line-item';
import { normalizeName } from '@domain/entities/normalize';
import type { ReconcileLine } from '@domain/use-cases/receipt';
import { receiptService } from '@domain/use-cases/receipt/service';
import { pantryService } from '@domain/use-cases/pantry/service';
import { useAppContext, useEntitlements, useUser } from '@foundation/context';
import { clientRequestId } from '@/src/shell/client-request-id';
import { IconButton } from '@ui/IconButton';

type Phase = 'capture' | 'processing' | 'reconcile' | 'done';

type Matches = Awaited<ReturnType<typeof pantryService.lookupMany>>;

interface ScanLine {
  key: string;
  lineItemId: string;
  displayName: string;
  category: string;
  quantity: number;
  unit: string;
  lastUnitCost: number | null;
  estimatedExpirationDays: number | null;
  recognised: boolean;
}

const SLOW_AFTER_MS = 10_000;

export default function ScanScreen() {
  const user = useUser();
  const { supabase, llmRouter } = useAppContext();
  const entitlements = useEntitlements();
  const insets = useSafeAreaInsets();
  const householdId = user?.household_id ?? null;

  const [phase, setPhase] = useState<Phase>('capture');
  const [processingState, setProcessingState] = useState<ProcessingState>('working');
  const [lines, setLines] = useState<ScanLine[]>([]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptTotal, setReceiptTotal] = useState(0);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number }>({
    added: 0,
    skipped: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [pantryCount, setPantryCount] = useState(0);

  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUriRef = useRef<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const overCapAddCount = useMemo<number | null>(() => {
    const cap = entitlements.pantry_item_cap;
    if (cap === 'unlimited') return null;
    const remaining = cap - pantryCount;
    return lines.length > remaining ? Math.max(0, remaining) : null;
  }, [entitlements, pantryCount, lines]);

  const clearSlow = (): void => {
    if (slowTimer.current !== null) {
      clearTimeout(slowTimer.current);
      slowTimer.current = null;
    }
  };

  useEffect(() => clearSlow, []);

  const startProcessing = useCallback(
    async (uri: string) => {
      if (householdId === null) return;
      lastUriRef.current = uri;
      setPhase('processing');
      setProcessingState('working');
      clearSlow();
      slowTimer.current = setTimeout(() => setProcessingState('slow'), SLOW_AFTER_MS);
      try {
        const compressed = await manipulateAsync(uri, [{ resize: { width: 1200 } }], {
          compress: 0.6,
          format: SaveFormat.JPEG,
        });
        const requestId = requestIdRef.current ?? clientRequestId();
        requestIdRef.current = requestId;
        const key = `${householdId}/${requestId}.jpg`;
        const file = await fetch(compressed.uri);
        const bytes = await file.arrayBuffer();
        const uploaded = await supabase.storage
          .from('receipts')
          .upload(key, bytes, { contentType: 'image/jpeg', upsert: false });
        if (uploaded.error !== null) throw uploaded.error;
        const ocr = await llmRouter.ocr(
          { image_storage_key: key, household_id: householdId },
          requestId,
        );
        if (ocr.status !== 'succeeded') throw new Error('ocr_incomplete');
        const fetched = await receiptService.get(ocr.receipt_id);
        if (fetched === null) throw new Error('receipt_missing');
        const canonicalNames = fetched.lineItems
          .map((line) => line.canonicalName)
          .filter((name): name is string => name !== null);
        const matches = await pantryService.lookupMany(canonicalNames);
        const used =
          entitlements.pantry_item_cap === 'unlimited' ? 0 : await pantryService.count(householdId);
        clearSlow();
        setPantryCount(used);
        setReceiptId(ocr.receipt_id);
        setReceiptTotal(fetched.receipt.totalAmount);
        setStoreName(fetched.receipt.storeName);
        setLines(fetched.lineItems.map((line) => toScanLine(line, matches)));
        setPhase('reconcile');
      } catch {
        clearSlow();
        setProcessingState('failed');
      }
    },
    [householdId, supabase, llmRouter, entitlements],
  );

  const retry = (): void => {
    requestIdRef.current = null;
    const uri = lastUriRef.current;
    if (uri !== null) void startProcessing(uri);
    else setPhase('capture');
  };

  const changeName = (key: string, name: string): void => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, displayName: name } : line)),
    );
  };

  const settleName = (key: string): void => {
    const target = lines.find((line) => line.key === key);
    if (target === undefined || target.displayName.trim() === '') return;
    void pantryService.lookup(target.displayName.trim()).then((match) => {
      setLines((prev) =>
        prev.map((line) =>
          line.key === key
            ? {
                ...line,
                recognised: true,
                category: match?.category ?? line.category,
                estimatedExpirationDays:
                  match?.defaultExpirationDays ?? line.estimatedExpirationDays,
              }
            : line,
        ),
      );
    });
  };

  const deleteLine = (key: string): void => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const confirm = async (): Promise<void> => {
    if (receiptId === null || submitting) return;
    setSubmitting(true);
    setReconcileError(null);
    try {
      const reconciled = await receiptService.reconcile(receiptId, lines.map(toReconcileLine));
      setResult(reconciled);
      setPhase('done');
    } catch {
      setSubmitting(false);
      setReconcileError("Couldn't add these. Try again.");
    }
  };

  return (
    <View className="flex-1 bg-paper">
      {phase === 'capture' ? (
        <ScanCapture onCaptured={(uri) => void startProcessing(uri)} />
      ) : (
        <View
          className="flex-1"
          style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom }}
        >
          {phase === 'processing' ? (
            <ScanProcessing
              state={processingState}
              onRetry={retry}
              onAddByHand={() => router.replace('/add-item')}
            />
          ) : null}
          {phase === 'reconcile' ? (
            <ScanReconcile
              storeName={storeName}
              lines={lines.map(toReconcileView)}
              total={receiptTotal}
              attributionUserId={user?.id ?? ''}
              overCapAddCount={overCapAddCount}
              submitting={submitting}
              error={reconcileError}
              onChangeName={changeName}
              onSettleName={settleName}
              onDelete={deleteLine}
              onConfirm={() => void confirm()}
            />
          ) : null}
          {phase === 'done' ? (
            <ScanDone
              added={result.added}
              skipped={result.skipped}
              total={receiptTotal}
              attribution="you"
              onSeePantry={() => router.back()}
            />
          ) : null}
        </View>
      )}
      <View className="absolute right-4" style={{ top: insets.top + 8 }}>
        <IconButton
          icon={X}
          onPress={() => router.back()}
          accessibilityLabel="Close"
          tone="inset"
        />
      </View>
    </View>
  );
}

function toScanLine(line: ReceiptLineItem, matches: Matches): ScanLine {
  const canonical = line.canonicalName;
  const match = canonical !== null ? matches.get(canonical) : undefined;
  return {
    key: line.id,
    lineItemId: line.id,
    displayName: canonical ?? line.rawText,
    category: line.category ?? match?.category ?? 'other',
    quantity: line.quantity ?? 1,
    unit: line.unit ?? 'each',
    lastUnitCost: line.unitPrice,
    estimatedExpirationDays: match?.defaultExpirationDays ?? null,
    recognised: canonical !== null,
  };
}

function toReconcileView(line: ScanLine): ScanReconcileLine {
  return {
    key: line.key,
    displayName: line.displayName,
    category: line.category,
    quantity: line.quantity,
    unit: line.unit,
    lastUnitCost: line.lastUnitCost,
    recognised: line.recognised,
  };
}

function toReconcileLine(line: ScanLine): ReconcileLine {
  return {
    lineItemId: line.lineItemId,
    canonicalName: normalizeName(line.displayName),
    displayName: line.displayName.trim(),
    category: line.category,
    quantity: line.quantity,
    unit: line.unit,
    lastUnitCost: line.lastUnitCost,
    estimatedExpirationDays: line.estimatedExpirationDays,
    isFrozen: false,
  };
}
