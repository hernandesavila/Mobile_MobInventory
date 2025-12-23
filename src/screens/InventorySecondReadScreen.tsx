/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AlertBanner,
  Button,
  EmptyState,
  ConfirmModal,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { InventoriesStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import {
  listInventoryDiffs,
  updateDiffL2Quantity,
} from '@/services/inventory/inventoryCompareService';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Area, InventoryDiff } from '@/types';
import { formatIntegerInput } from '@/utils';

type Props = NativeStackScreenProps<InventoriesStackParamList, 'InventorySecondRead'>;

export function InventorySecondReadScreen({ route, navigation }: Props) {
  const { inventoryId } = route.params;

  const [diffs, setDiffs] = useState<InventoryDiff[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<InventoryDiff | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSettings().then((s) => {
        if (active) setPageSize(s.itemsPerPage);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [areaData, diffResult] = await Promise.all([
          listAllAreas(),
          listInventoryDiffs(inventoryId, {
            onlyDivergent: true,
            page: 1,
            pageSize,
          }),
        ]);
        setAreas(areaData);
        setDiffs(diffResult.items);
        if ((diffResult.divergent ?? 0) === 0 || diffResult.items.length === 0) {
          setToast({
            visible: true,
            message: 'Leitura 2 exige divergencias (Divergente, Ausente ou Novo).',
            type: 'warning',
          });
          navigation.goBack();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar leitura 2.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [inventoryId, navigation, pageSize]);

  const handleChangeQty = async (diffId: number, value: string) => {
    const num = Number.parseInt(formatIntegerInput(value), 10) || 0;
    setDiffs((prev) =>
      prev.map((d) =>
        d.id === diffId
          ? {
              ...d,
              l2Quantity: num,
              finalQuantity:
                d.resolutionChoice === 'L2' ||
                d.finalQuantity === null ||
                d.finalQuantity === undefined
                  ? num
                  : d.finalQuantity,
            }
          : d,
      ),
    );
    try {
      await updateDiffL2Quantity(diffId, num);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar leitura 2.';
      setToast({ visible: true, message, type: 'error' });
    }
  };

  const areaLookup: Record<number, string> = {};
  areas.forEach((a) => {
    areaLookup[a.id] = a.name;
  });

  const renderItem = React.useCallback(
    ({ item }: { item: InventoryDiff }) => (
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.assetName}</Text>
            <Text style={styles.cardSubtitle}>
              {item.assetNumber ?? 'Sem numero'} - Area:{' '}
              {item.areaId ? (areaLookup[item.areaId] ?? item.areaId) : '-'}
            </Text>
          </View>
          <Text style={styles.badge}>{item.status}</Text>
        </View>
        <Text style={styles.meta}>
          L0: {item.l0Quantity} | L1: {item.l1Quantity} | L2:
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(item.l2Quantity ?? 0)}
          onChangeText={(text) => handleChangeQty(item.id, text)}
        />
        <Button
          title="Excluir leitura 2"
          variant="danger"
          onPress={() => {
            setSelectedDiff(item);
            setConfirmVisible(true);
          }}
        />
      </Surface>
    ),
    [areaLookup, handleChangeQty],
  );

  return (
    <Screen>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Leitura 2</Text>
        <Button
          title="Ir para resolucao"
          disabled={loading || diffs.length === 0}
          onPress={() => {
            if (!diffs.length) {
              setToast({
                visible: true,
                message:
                  'Leitura 2 exige divergencias (Divergente, Ausente ou Novo). Recalcule antes.',
                type: 'warning',
              });
              return;
            }
            navigation.navigate('InventoryResolution', { inventoryId });
          }}
        />
      </View>

      <FlatList
        data={diffs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 140, offset: 140 * index, index })}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        windowSize={7}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Sem divergencias"
              description="Nenhum item pendente para recontagem."
              actionLabel="Voltar"
              onAction={() => navigation.goBack()}
            />
          ) : null
        }
      />

      <LoadingOverlay visible={loading} message="Carregando divergencias..." />
      <ConfirmModal
        visible={confirmVisible}
        title="Remover leitura 2?"
        message="Isso zera a quantidade registrada na leitura 2 para este item."
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedDiff(null);
        }}
        onConfirm={async () => {
          if (!selectedDiff) return;
          setDiffs((prev) =>
            prev.map((d) =>
              d.id === selectedDiff.id ? { ...d, l2Quantity: 0, finalQuantity: 0 } : d,
            ),
          );
          try {
            await updateDiffL2Quantity(selectedDiff.id, 0);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Erro ao limpar leitura 2.';
            setToast({ visible: true, message, type: 'error' });
          } finally {
            setConfirmVisible(false);
            setSelectedDiff(null);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
});
