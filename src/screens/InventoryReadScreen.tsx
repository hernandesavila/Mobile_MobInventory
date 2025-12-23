/* eslint-disable react/prop-types */
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AlertBanner,
  Button,
  EmptyState,
  Input,
  LoadingOverlay,
  Screen,
  Surface,
  ConfirmModal,
} from '@/components';
import { InventoriesStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import { listAssetsPaginated } from '@/repositories/assetRepository';
import {
  addReadItem,
  deleteReadItem,
  getInventoryById,
  listReadItems,
  listSnapshotItems,
  updateReadItemQuantity,
  updateReadItemMeta,
} from '@/repositories/inventoryRepository';
import { computeInventoryDiff } from '@/services/inventory/inventoryCompareService';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import {
  AssetItem,
  Inventory,
  InventoryReadItem,
  InventorySnapshotItem,
  Area,
} from '@/types';
import { formatIntegerInput } from '@/utils';

type Props = NativeStackScreenProps<InventoriesStackParamList, 'InventoryRead'>;

export function InventoryReadScreen({ route }: Props) {
  const { inventoryId } = route.params;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [snapshot, setSnapshot] = useState<InventorySnapshotItem[]>([]);
  const [reads, setReads] = useState<InventoryReadItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [divergentCount, setDivergentCount] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedRead, setSelectedRead] = useState<InventoryReadItem | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadSettings().then((s) => setPageSize(s.itemsPerPage));
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, snap, readItems] = await Promise.all([
        getInventoryById(inventoryId),
        listSnapshotItems(inventoryId),
        listReadItems(inventoryId),
      ]);
      setInventory(inv);
      setSnapshot(snap);
      setReads(readItems);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao carregar inventario.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const result = await listAssetsPaginated({
          searchName: debouncedSearch,
          searchNumber: debouncedSearch,
          areaId:
            inventory?.scopeType === 'AREA' ? (inventory.areaId ?? undefined) : undefined,
          page: 1,
          pageSize,
        });
        setAssets(result.items);
      } catch {
        // ignore errors in suggestions
      }
    };

    if (debouncedSearch) {
      fetchAssets();
    } else {
      setAssets([]);
    }
    // load areas once for edition of novos
    listAllAreas()
      .then(setAreas)
      .catch(() => {});
  }, [debouncedSearch, inventory, pageSize]);

  const handleAddAsset = useCallback(
    async (asset: AssetItem) => {
      if (inventory?.status === 'finished') return;
      setAdding(true);
      try {
        const read = await addReadItem({
          inventoryId,
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          areaId: asset.areaId,
          isNewItem: false,
          quantity: 1,
        });
        setReads((prev) => [read, ...prev]);
        setToast({ visible: true, message: 'Item registrado.', type: 'success' });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Falha ao registrar item.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setAdding(false);
      }
    },
    [inventory?.status, inventoryId, setReads],
  );

  const handleAddNew = async () => {
    if (inventory?.status === 'finished') return;
    const qtyNumber = Number.parseInt(newQty, 10) || 0;
    setAdding(true);
    try {
      const read = await addReadItem({
        inventoryId,
        assetName: newName,
        isNewItem: true,
        quantity: qtyNumber,
      });
      setReads((prev) => [read, ...prev]);
      setNewName('');
      setNewQty('1');
      setToast({ visible: true, message: 'Item novo registrado.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao registrar item.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    try {
      const result = await computeInventoryDiff(inventoryId);
      setDivergentCount(result.divergent);
      setToast({
        visible: true,
        message: `Comparacao atualizada. Divergentes: ${result.divergent}`,
        type: 'success',
      });
      return result.divergent;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao comparar.';
      setToast({ visible: true, message, type: 'error' });
      return 0;
    } finally {
      setComparing(false);
    }
  };

  const scopeLabel = useMemo(() => {
    if (!inventory) return '';
    return inventory.scopeType === 'ALL' ? 'Todas as areas' : `Area #${inventory.areaId}`;
  }, [inventory]);

  const renderSuggestion = useCallback(
    ({ item }: { item: AssetItem }) => (
      <TouchableOpacity style={styles.suggestion} onPress={() => handleAddAsset(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.suggestionTitle}>{item.name}</Text>
          <Text style={styles.suggestionSubtitle}>
            {item.assetNumber} - Area #{item.areaId}
          </Text>
        </View>
        <Button title="Adicionar" onPress={() => handleAddAsset(item)} />
      </TouchableOpacity>
    ),
    [handleAddAsset],
  );

  const handleUpdateReadQty = useCallback(
    async (read: InventoryReadItem, value: string) => {
      const num = Number.parseInt(value, 10) || 0;
      setReads((prev) =>
        prev.map((r) => (r.id === read.id ? { ...r, quantity: num } : r)),
      );
      try {
        await updateReadItemQuantity(read.id, num);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Falha ao atualizar quantidade.';
        setToast({ visible: true, message, type: 'error' });
      }
    },
    [setReads, setToast],
  );

  const handleDeleteRead = useCallback(
    async (read: InventoryReadItem) => {
      setConfirmVisible(false);
      setSelectedRead(null);
      try {
        await deleteReadItem(read.id);
        setReads((prev) => prev.filter((r) => r.id !== read.id));
        setToast({ visible: true, message: 'Leitura removida.', type: 'success' });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Falha ao excluir leitura.';
        setToast({ visible: true, message, type: 'error' });
      }
    },
    [setConfirmVisible, setSelectedRead, setReads, setToast],
  );

  const renderReadItem = React.useCallback(
    ({ item }: { item: InventoryReadItem }) => (
      <Surface style={styles.readCard}>
        <Text style={styles.readTitle}>{item.assetName}</Text>
        <Text style={styles.readSubtitle}>
          {item.assetNumber ? item.assetNumber : 'Novo observado'}
        </Text>
        {item.isNewItem ? (
          <View style={styles.readActions}>
            <Input
              label="Nome"
              value={item.assetName}
              onChangeText={(text) => {
                setReads((prev) =>
                  prev.map((r) => (r.id === item.id ? { ...r, assetName: text } : r)),
                );
                updateReadItemMeta(item.id, { assetName: text }).catch((error) => {
                  const message =
                    error instanceof Error ? error.message : 'Falha ao atualizar item.';
                  setToast({ visible: true, message, type: 'error' });
                });
              }}
            />
            <View style={styles.areaChips}>
              {areas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.areaChip,
                    item.areaId === area.id && styles.areaChipSelected,
                    !area.active && styles.areaChipInactive,
                  ]}
                  onPress={() => {
                    setReads((prev) =>
                      prev.map((r) => (r.id === item.id ? { ...r, areaId: area.id } : r)),
                    );
                    updateReadItemMeta(item.id, { areaId: area.id }).catch((error) => {
                      const message =
                        error instanceof Error
                          ? error.message
                          : 'Falha ao atualizar item.';
                      setToast({ visible: true, message, type: 'error' });
                    });
                  }}
                >
                  <Text style={styles.areaChipText}>{area.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
        {inventory?.status !== 'finished' ? (
          <View style={styles.readActions}>
            <Input
              label="Quantidade"
              keyboardType="numeric"
              value={String(item.quantity)}
              onChangeText={(text) => handleUpdateReadQty(item, formatIntegerInput(text))}
            />
            <Button
              title="Excluir"
              variant="danger"
              onPress={() => {
                setSelectedRead(item);
                setConfirmVisible(true);
              }}
            />
          </View>
        ) : (
          <Text style={styles.readSubtitle}>Qtd: {item.quantity.toLocaleString()}</Text>
        )}
      </Surface>
    ),
    [areas, handleUpdateReadQty, inventory?.status, setConfirmVisible, setSelectedRead],
  );

  return (
    <Screen scroll>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {inventory ? (
        <Surface style={styles.headerCard}>
          <Text style={styles.title}>{inventory.name}</Text>
          <Text style={styles.subtitle}>
            Escopo: {scopeLabel} | Status:{' '}
            {inventory.status === 'finished' ? 'Finalizado' : 'Aberto'}
          </Text>
          <Text style={styles.meta}>
            Snapshot: {snapshot.length} itens | Leituras: {reads.length}
          </Text>
          <View style={styles.headerActions}>
            <Button
              title="Comparar L1 x L0"
              onPress={handleCompare}
              disabled={loading || comparing}
            />
            <Button
              title="Ver comparacao"
              disabled={loading || comparing}
              onPress={() => {
                handleCompare().then(() =>
                  navigation.navigate('InventoryCompare', { inventoryId }),
                );
              }}
            />
            <Button
              title="Leitura 2"
              disabled={!divergentCount || loading || comparing}
              onPress={() => {
                if (!divergentCount) {
                  setToast({
                    visible: true,
                    message:
                      'Leitura 2 disponivel apenas quando existirem divergencias (Divergente, Ausente ou Novo).',
                    type: 'warning',
                  });
                  return;
                }
                navigation.navigate('InventorySecondRead', { inventoryId });
              }}
            />
            <Button
              title="Resolucao"
              disabled={loading || comparing}
              onPress={() => {
                handleCompare().then((count) => {
                  const nextCount = count ?? divergentCount;
                  if (!nextCount) {
                    setToast({
                      visible: true,
                      message:
                        'Resolucao disponivel apenas quando existirem divergencias (Divergente, Ausente ou Novo).',
                      type: 'warning',
                    });
                    return;
                  }
                  navigation.navigate('InventoryResolution', { inventoryId });
                });
              }}
            />
          </View>
        </Surface>
      ) : null}

      {inventory?.status === 'finished' ? (
        <Surface style={styles.notice}>
          <Text style={styles.noticeText}>
            Inventario finalizado. Leituras bloqueadas.
          </Text>
        </Surface>
      ) : null}

      {inventory?.status !== 'finished' ? (
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Registrar leitura</Text>
          <Input
            label="Buscar patrimonio ou nome"
            placeholder="Digite para buscar..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {assets.length ? (
            <FlatList
              data={assets}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSuggestion}
              getItemLayout={(_, index) => ({ length: 68, offset: 68 * index, index })}
              style={styles.suggestionsList}
            />
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Novo item observado</Text>
          <Input
            label="Nome do item"
            value={newName}
            onChangeText={setNewName}
            placeholder="Descreva o item"
          />
          <Input
            label="Quantidade"
            value={newQty}
            onChangeText={(text) => setNewQty(formatIntegerInput(text))}
            keyboardType="numeric"
          />
          <Button title="Adicionar novo" onPress={handleAddNew} />
        </Surface>
      ) : null}

      <Text style={styles.sectionTitle}>Leituras registradas</Text>
      <FlatList
        data={reads}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReadItem}
        getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nenhuma leitura"
              description="Adicione itens encontrados para registrar a leitura."
            />
          ) : null
        }
      />

      <LoadingOverlay
        visible={loading || adding || comparing}
        message={
          comparing ? 'Comparando leitura...' : adding ? 'Salvando...' : 'Carregando...'
        }
      />
      <ConfirmModal
        visible={confirmVisible}
        title="Excluir leitura?"
        message={
          selectedRead
            ? `Remover "${selectedRead.assetName}" desta leitura? Isso impacta a comparacao.`
            : ''
        }
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedRead(null);
        }}
        onConfirm={() => {
          if (selectedRead) {
            handleDeleteRead(selectedRead);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  suggestionsList: {
    maxHeight: 240,
    marginTop: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  suggestionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  readCard: {
    marginBottom: spacing.sm,
  },
  readTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  readSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  areaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  areaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
  },
  areaChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  areaChipInactive: {
    opacity: 0.5,
  },
  areaChipText: {
    color: colors.text,
  },
  notice: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
