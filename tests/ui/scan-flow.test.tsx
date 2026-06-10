import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { manipulateAsync } from 'expo-image-manipulator';

import ScanScreen from '@/app/scan';
import { pantryService } from '@domain/use-cases/pantry/service';
import { receiptService } from '@domain/use-cases/receipt/service';
import { ENTITLEMENTS } from '@foundation/billing/entitlements';
import { useAppContext, useEntitlements, useUser } from '@foundation/context';

jest.mock('expo-camera', () => {
  const react = jest.requireActual('react');
  return {
    CameraView: react.forwardRef((_props: unknown, ref: unknown) => {
      react.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => ({ uri: 'file://shot.jpg' }),
      }));
      return null;
    }),
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('@foundation/context', () => ({
  useUser: jest.fn(),
  useAppContext: jest.fn(),
  useEntitlements: jest.fn(),
}));
jest.mock('@domain/use-cases/receipt/service', () => ({
  receiptService: { get: jest.fn(), reconcile: jest.fn() },
}));
jest.mock('@domain/use-cases/pantry/service', () => ({
  pantryService: { lookup: jest.fn(), lookupMany: jest.fn(), count: jest.fn() },
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));

const mockManip = manipulateAsync as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseApp = useAppContext as jest.Mock;
const mockGet = receiptService.get as jest.Mock;
const mockReconcile = receiptService.reconcile as jest.Mock;
const mockLookupMany = pantryService.lookupMany as jest.Mock;
const mockCount = pantryService.count as jest.Mock;

const upload = jest.fn();
const ocr = jest.fn();

function lineItem(id: string, rawText: string, canonicalName: string | null) {
  return {
    id,
    receiptId: 'r1',
    householdId: 'h1',
    rawText,
    canonicalName,
    category: 'dairy',
    quantity: 1,
    unit: 'each',
    unitPrice: 2,
    lineTotal: 2,
    pantryItemId: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ id: 'u1', household_id: 'h1', tier: 'free', currency: 'GBP' });
  (useEntitlements as jest.Mock).mockReturnValue(ENTITLEMENTS.free);
  upload.mockResolvedValue({ error: null });
  ocr.mockResolvedValue({ status: 'succeeded', receipt_id: 'r1', created: true });
  mockUseApp.mockReturnValue({
    supabase: { storage: { from: () => ({ upload }) } },
    llmRouter: { ocr },
  });
  mockManip.mockResolvedValue({ uri: 'file://c.jpg' });
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as typeof fetch;
  mockLookupMany.mockResolvedValue(new Map());
  mockCount.mockResolvedValue(0);
  mockGet.mockResolvedValue({
    receipt: { id: 'r1', totalAmount: 4, storeName: 'Tesco' },
    lineItems: [lineItem('l1', 'MILK', 'milk'), lineItem('l2', 'EGGS', 'eggs')],
  });
  mockReconcile.mockResolvedValue({ added: 2, skipped: 0 });
});

describe('scan flow', () => {
  it('walks capture through reconcile to done', async () => {
    render(<ScanScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(screen.getByText(/recognised at Tesco/)).toBeOnTheScreen());
    expect(upload).toHaveBeenCalled();
    expect(ocr).toHaveBeenCalledWith(
      { image_storage_key: expect.stringContaining('h1/'), household_id: 'h1' },
      expect.any(String),
    );
    fireEvent.press(screen.getByRole('button', { name: /Add 2 items to pantry/ }));
    await waitFor(() => expect(screen.getByText('2 items added to pantry.')).toBeOnTheScreen());
    expect(mockReconcile).toHaveBeenCalledWith(
      'r1',
      expect.arrayContaining([expect.objectContaining({ canonicalName: 'milk' })]),
    );
  });

  it('shows the failed state when ocr does not succeed', async () => {
    ocr.mockResolvedValue({ status: 'failed', receipt_id: 'r1', created: true });
    render(<ScanScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(screen.getByText(/Couldn't read that receipt/)).toBeOnTheScreen());
  });

  it('retries a failed scan and reaches reconcile', async () => {
    ocr.mockResolvedValueOnce({ status: 'failed', receipt_id: 'r1', created: true });
    render(<ScanScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(screen.getByText(/Couldn't read that receipt/)).toBeOnTheScreen());
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText(/recognised at Tesco/)).toBeOnTheScreen());
  });

  it('keeps reconcile and shows an error when adding fails', async () => {
    mockReconcile.mockRejectedValue(new Error('nope'));
    render(<ScanScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(screen.getByText(/recognised at Tesco/)).toBeOnTheScreen());
    fireEvent.press(screen.getByRole('button', { name: /Add 2 items to pantry/ }));
    await waitFor(() => expect(screen.getByText(/Couldn't add these/)).toBeOnTheScreen());
  });

  it('fails without calling ocr when the upload errors', async () => {
    upload.mockResolvedValue({ error: { message: 'no' } });
    render(<ScanScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => expect(screen.getByText(/Couldn't read that receipt/)).toBeOnTheScreen());
    expect(ocr).not.toHaveBeenCalled();
  });
});
