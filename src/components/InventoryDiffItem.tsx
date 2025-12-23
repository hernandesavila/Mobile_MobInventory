import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Surface } from '@/components';
import { colors, spacing } from '@/theme';
import { InventoryDiff } from '@/types';

type Props = {
  item: InventoryDiff;
  areaLookup: Record<number, string>;
  onChoose?: (choice: 'L1' | 'L2' | 'IGNORE') => void;
  onNoteChange?: (note: string) => void;
  note?: string;
  disabled?: boolean;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
};

export const InventoryDiffItem = React.memo(function InventoryDiffItem({
  item,
  areaLookup,
  onChoose,
  onNoteChange,
  note,
  disabled,
  actions,
  footer,
}: Props) {
  return (
    <Surface style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.assetName}</Text>
          <Text style={styles.cardSubtitle}>
            {item.assetNumber ?? 'Sem numero'} Area:{' '}
            {item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-'}
          </Text>
        </View>
        <Text style={styles.badge}>{item.status}</Text>
      </View>
      <Text style={styles.meta}>
        L0: {item.l0Quantity} | L1: {item.l1Quantity} | L2:{' '}
        {(item.l2Quantity ?? 0).toLocaleString()}
      </Text>
      {actions ? <View style={styles.actionsRow}>{actions}</View> : null}
      {onChoose && !actions ? (
        <View style={styles.actionsRow}>
          <Button
            title="Usar L1"
            variant={item.resolutionChoice === 'L1' ? 'primary' : 'secondary'}
            disabled={disabled}
            onPress={() => onChoose('L1')}
          />
          <Button
            title="Usar L2"
            variant={item.resolutionChoice === 'L2' ? 'primary' : 'secondary'}
            disabled={disabled}
            onPress={() => onChoose('L2')}
          />
          <Button
            title="Ignorar"
            variant={item.resolutionChoice === 'IGNORE' ? 'primary' : 'ghost'}
            disabled={disabled}
            onPress={() => onChoose('IGNORE')}
          />
        </View>
      ) : null}
      {onNoteChange ? (
        <>
          <Text style={styles.noteLabel}>Nota</Text>
          <View style={styles.noteRow}>
            <Text style={styles.noteText}>{note || 'Sem nota'}</Text>
          </View>
        </>
      ) : null}
      {footer}
    </Surface>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  noteLabel: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  noteRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: {
    color: colors.text,
    flex: 1,
  },
});
