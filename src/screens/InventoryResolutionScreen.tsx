/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AlertBanner, Button, EmptyState, LoadingOverlay, Screen } from '@/components';
import { InventoryDiffItem } from '@/components/InventoryDiffItem';
import { InventoriesStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import {
  exportInventoryAdjustmentPDF,
  exportInventoryAdjustmentXLSX,
} from '@/services/export/inventoryAdjustmentExport';
import { applyInventoryAdjustments } from '@/services/inventory/inventoryAdjustmentService';
import {
  listInventoryDiffs,
  saveDiffResolution,
} from '@/services/inventory/inventoryCompareService';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Area, InventoryDiff } from '@/types';

type Props = NativeStackScreenProps<InventoriesStackParamList, 'InventoryResolution'>;

export function InventoryResolutionScreen({ route, navigation }: Props) {
  const { inventoryId } = route.params;

  const [diffs, setDiffs] = useState<InventoryDiff[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [dirtyNotes, setDirtyNotes] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

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
            onlyDivergent: false,
            page: 1,
            pageSize,
          }),
        ]);
        setAreas(areaData);
        const nextDiffs = diffResult.items
          .filter((d) => d.status !== 'OK')
          .map((d) => ({
            ...d,
            finalQuantity:
              d.finalQuantity ??
              (d.resolutionChoice === 'L2'
                ? (d.l2Quantity ?? d.l1Quantity ?? 0)
                : d.resolutionChoice === 'IGNORE'
                  ? (d.l0Quantity ?? 0)
                  : (d.l1Quantity ?? 0)),
          }));
        setDiffs(nextDiffs);
        if (!nextDiffs.length) {
          setToast({
            visible: true,
            message: 'Sem divergencias para resolver. Recalcule antes de continuar.',
            type: 'warning',
          });
          navigation.goBack();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar resolucao.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [inventoryId, navigation, pageSize]);

  const areaLookup: Record<number, string> = {};
  areas.forEach((a) => {
    areaLookup[a.id] = a.name;
  });

  const computeFinal = (choice: 'L1' | 'L2' | 'IGNORE', diff: InventoryDiff) => {
    if (choice === 'L2') {
      return diff.l2Quantity ?? diff.l1Quantity ?? 0;
    }
    if (choice === 'IGNORE') {
      return diff.l0Quantity ?? 0;
    }
    return diff.l1Quantity ?? 0;
  };

  const persistResolution = async (
    diff: InventoryDiff,
    choice: 'L1' | 'L2' | 'IGNORE',
    note: string,
  ) => {
    const finalQuantity = computeFinal(choice, diff);
    const nextDiff = {
      ...diff,
      resolutionChoice: choice,
      resolutionNote: note,
      finalQuantity,
    };
    setDiffs((prev) => prev.map((d) => (d.id === diff.id ? nextDiff : d)));
    await saveDiffResolution({
      diffId: diff.id,
      choice,
      finalQuantity,
      l1Quantity: diff.l1Quantity,
      l2Quantity: diff.l2Quantity,
      note,
    });
    setDirtyNotes((prev) => {
      const clone = { ...prev };
      delete clone[diff.id];
      return clone;
    });
  };

  const handleSaveNote = async (diff: InventoryDiff) => {
    if (!diff.resolutionChoice) {
      setToast({
        visible: true,
        message: 'Escolha L1/L2/ignorar antes de salvar a nota.',
        type: 'warning',
      });
      return;
    }
    await persistResolution(diff, diff.resolutionChoice, diff.resolutionNote ?? '');
  };

  const renderItem = React.useCallback(
    ({ item }: { item: InventoryDiff }) => (
      <InventoryDiffItem
        item={item}
        areaLookup={areaLookup}
        note={item.resolutionNote ?? ''}
        onChoose={(choice) => {
          persistResolution(item, choice, item.resolutionNote ?? '').catch((error) => {
            const message =
              error instanceof Error ? error.message : 'Erro ao salvar resolucao.';
            setToast({ visible: true, message, type: 'error' });
          });
        }}
        onNoteChange={(text) => {
          setDiffs((prev) =>
            prev.map((d) => (d.id === item.id ? { ...d, resolutionNote: text } : d)),
          );
          setDirtyNotes((prev) => ({ ...prev, [item.id]: true }));
          handleSaveNote({ ...item, resolutionNote: text }).catch((error) => {
            const message =
              error instanceof Error ? error.message : 'Erro ao salvar resolucao.';
            setToast({ visible: true, message, type: 'error' });
          });
        }}
        footer={
          <TextInput
            style={styles.noteInput}
            placeholder="Nota opcional"
            value={item.resolutionNote ?? ''}
            onChangeText={(text) => {
              setDiffs((prev) =>
                prev.map((d) => (d.id === item.id ? { ...d, resolutionNote: text } : d)),
              );
              setDirtyNotes((prev) => ({ ...prev, [item.id]: true }));
            }}
            onBlur={() => {
              if (!item.resolutionChoice || !dirtyNotes[item.id]) {
                return;
              }
              (async () => {
                try {
                  await handleSaveNote({
                    ...item,
                    resolutionNote: item.resolutionNote ?? '',
                  });
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : 'Erro ao salvar resolucao.';
                  setToast({ visible: true, message, type: 'error' });
                }
              })();
            }}
          />
        }
        actions={
          <View style={styles.noteActions}>
            <Button
              title="Salvar nota/decisao"
              disabled={!dirtyNotes[item.id]}
              style={styles.noteSaveButton}
              onPress={() => {
                handleSaveNote(item).catch((error) => {
                  const message =
                    error instanceof Error ? error.message : 'Erro ao salvar resolucao.';
                  setToast({ visible: true, message, type: 'error' });
                });
              }}
            />
          </View>
        }
      />
    ),
    [areaLookup, dirtyNotes, persistResolution],
  );

  const handleApply = async () => {
    const pending = diffs.some((d) => !d.resolutionChoice);
    if (pending) {
      setToast({
        visible: true,
        message: 'Defina L1/L2/ignorar para todos os itens antes de aplicar.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const dirtyIds = Object.keys(dirtyNotes);
      if (dirtyIds.length) {
        await Promise.all(
          dirtyIds.map(async (id) => {
            const diff = diffs.find((d) => d.id === Number(id));
            if (diff?.resolutionChoice) {
              await persistResolution(
                diff,
                diff.resolutionChoice,
                diff.resolutionNote ?? '',
              );
            }
          }),
        );
      }
      await applyInventoryAdjustments(inventoryId);
      setToast({
        visible: true,
        message: 'Ajuste aplicado e inventario finalizado.',
        type: 'success',
      });
      navigation.navigate('InventoryList');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao aplicar ajuste.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'xlsx') => {
    setLoading(true);
    try {
      if (type === 'pdf') {
        await exportInventoryAdjustmentPDF({ inventoryId }, areas);
      } else {
        await exportInventoryAdjustmentXLSX({ inventoryId }, areas);
      }
      setToast({ visible: true, message: 'Exportacao concluida.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao exportar.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Resolucao</Text>
        <View style={styles.headerButtons}>
          <Button title="PDF" disabled={loading} onPress={() => handleExport('pdf')} />
          <Button title="XLSX" disabled={loading} onPress={() => handleExport('xlsx')} />
          <Button title="Aplicar ajuste" disabled={loading} onPress={handleApply} />
        </View>
      </View>

      <FlatList
        data={diffs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 170, offset: 170 * index, index })}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        windowSize={7}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nada a resolver"
              description="Recalcule ou habilite leitura 2."
              actionLabel="Voltar"
              onAction={() => navigation.goBack()}
            />
          ) : null
        }
      />

      <LoadingOverlay visible={loading} message="Processando..." />
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
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  noteSaveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
