/* eslint-disable react/prop-types */
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  AlertBanner,
  Button,
  EmptyState,
  Input,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { InventoryDiffItem } from '@/components/InventoryDiffItem';
import { InventoriesStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import {
  exportInventoryDiffToPDF,
  exportInventoryDiffToXLSX,
} from '@/services/export/inventoryCompareExport';
import {
  computeInventoryDiff,
  hasInventoryDivergences,
  listInventoryDiffs,
} from '@/services/inventory/inventoryCompareService';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Area, InventoryDiff } from '@/types';

type Props = NativeStackScreenProps<InventoriesStackParamList, 'InventoryCompare'>;

export function InventoryCompareScreen({ route, navigation }: Props) {
  const { inventoryId } = route.params;

  const [diffs, setDiffs] = useState<InventoryDiff[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [divergent, setDivergent] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyDivergent, setOnlyDivergent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const loadAreas = async () => {
    try {
      const data = await listAllAreas();
      setAreas(data);
    } catch {
      // ignore
    }
  };

  const loadDiffs = async (pageNumber: number, append = false) => {
    setLoading(true);
    try {
      const result = await listInventoryDiffs(inventoryId, {
        onlyDivergent,
        search: debouncedSearch,
        page: pageNumber,
        pageSize,
      });
      setDiffs((prev) => (append ? [...prev, ...result.items] : result.items));
      setTotal(result.total);
      setDivergent(result.divergent);
      setPage(pageNumber);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao carregar comparativo.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    setLoading(true);
    try {
      const result = await computeInventoryDiff(inventoryId);
      setToast({
        visible: true,
        message: `Comparacao atualizada. Divergentes: ${result.divergent}`,
        type: 'success',
      });
      await loadDiffs(1, false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao comparar leituras.';
      setToast({ visible: true, message, type: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
    handleCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDiffs(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, onlyDivergent]);

  const handleEndReached = () => {
    if (loading || diffs.length >= total) return;
    loadDiffs(page + 1, true);
  };

  const areaLookup = useMemo(() => {
    const map: Record<number, string> = {};
    areas.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [areas]);

  const renderItem = React.useCallback(
    ({ item }: { item: InventoryDiff }) => (
      <InventoryDiffItem
        item={item}
        areaLookup={areaLookup}
        note={item.resolutionNote ?? ''}
        disabled
      />
    ),
    [areaLookup],
  );

  const handleExport = async (type: 'pdf' | 'xlsx') => {
    setExporting(true);
    try {
      const filters = {
        inventoryId,
        onlyDivergent,
        search: debouncedSearch,
      };
      if (type === 'pdf') {
        await exportInventoryDiffToPDF(filters, areas);
      } else {
        await exportInventoryDiffToXLSX(filters, areas);
      }
      setToast({ visible: true, message: 'Exportacao concluida.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao exportar.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleEnableReading2 = async () => {
    const hasDiff = divergent > 0 || (await hasInventoryDivergences(inventoryId));
    if (!hasDiff) {
      setToast({
        visible: true,
        message: 'Leitura 2 disponivel apenas quando existirem divergencias.',
        type: 'warning',
      });
      return;
    }
    navigation.navigate('InventorySecondRead', { inventoryId });
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Comparativo L1 x L0</Text>
          <Text style={styles.subtitle}>
            Filtre divergencias, busque por nome/numero e exporte relatorio.
          </Text>
        </View>
        <Button title="Recalcular" onPress={handleCompare} disabled={loading} />
      </View>

      <Surface style={styles.filters}>
        <Input
          label="Buscar"
          placeholder="Nome ou numero"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Mostrar apenas divergentes</Text>
          <Button
            title={onlyDivergent ? 'Sim' : 'Nao'}
            onPress={() => setOnlyDivergent((prev) => !prev)}
          />
        </View>
        <View style={styles.actionsRow}>
          <Button
            title="PDF"
            disabled={loading || exporting}
            onPress={() => handleExport('pdf')}
          />
          <Button
            title="XLSX"
            disabled={loading || exporting}
            onPress={() => handleExport('xlsx')}
          />
          <Button
            title="Habilitar Leitura 2"
            onPress={handleEnableReading2}
            disabled={!divergent || loading}
          />
        </View>
        {!divergent ? (
          <Text style={styles.helper}>
            Leitura 2 fica disponivel somente quando houver divergencias (Divergente,
            Ausente ou Novo).
          </Text>
        ) : null}
      </Surface>

      <FlatList
        data={diffs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 96, offset: 96 * index, index })}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        initialNumToRender={10}
        windowSize={6}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nenhuma divergencia"
              description="Recalcule ou ajuste os filtros."
              actionLabel="Recalcular"
              onAction={handleCompare}
            />
          ) : null
        }
      />

      <LoadingOverlay visible={loading || exporting} message="Processando..." />
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
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filters: {
    marginBottom: spacing.md,
  },
  helper: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  filterLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  cardMeta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  status: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    fontWeight: '700',
  },
  statusOk: {
    backgroundColor: '#e5e7eb',
    color: colors.text,
  },
  statusDivergent: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  statusMissing: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusNew: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
});
