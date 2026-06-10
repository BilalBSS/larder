// / who spent what
import { View } from 'react-native';

import { proseAmount, type MembersVM } from '@domain/use-cases/spending/view-model';
import { Avatar } from '@ui/Avatar';
import { deriveAvatarColor } from '@ui/avatar-color';
import { Bar } from '@ui/Bar';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { Eyebrow } from '@ui/Eyebrow';
import { Money } from '@ui/Money';
import { Text } from '@ui/Text';

export interface MemberBreakdownProps {
  readonly members: MembersVM;
  readonly glyph: string;
  readonly onSettleUp: () => void;
}

export function MemberBreakdown({ members, glyph, onSettleUp }: MemberBreakdownProps) {
  return (
    <Card padding="md">
      <View className="flex-row items-center justify-between">
        <Eyebrow>Who spent what</Eyebrow>
        {members.pillAmount !== null ? (
          <Button
            kind="accent"
            size="sm"
            label={`Settle up · ${proseAmount(glyph, members.pillAmount)}`}
            onPress={onSettleUp}
          />
        ) : null}
      </View>
      {members.rows.map((row, index) => (
        <View
          key={row.userId}
          className={`flex-row items-center gap-3 py-2 ${
            index === 0 ? 'mt-1' : 'border-t border-hairline'
          }`}
        >
          <Avatar userId={row.userId} label={row.label} size={26} />
          <View className="flex-1 gap-1">
            <View className="flex-row items-baseline justify-between">
              <Text variant="body-strong">{row.label}</Text>
              <Text variant="meta" tone="mid">
                {`${row.receiptCount} ${row.receiptCount === 1 ? 'receipt' : 'receipts'}`}
              </Text>
            </View>
            <Bar value={row.sharePct} color={deriveAvatarColor(row.userId)} />
          </View>
          <Money value={row.total} />
        </View>
      ))}
      <View className={`pt-2 ${members.rows.length > 0 ? 'border-t border-hairline' : 'mt-1'}`}>
        <Text variant="meta" tone="mid">
          {members.footer}
        </Text>
      </View>
    </Card>
  );
}
