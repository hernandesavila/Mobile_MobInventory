import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AlertBanner,
  Button,
  ConfirmModal,
  EmptyState,
  Input,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { AssetsStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import { deleteAsset, listAssetsPaginated } from '@/repositories/assetRepository';
import { exportAssetsToPDF, exportAssetsToXLSX } from '@/services/export/assetExport';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { AssetItem, Area } from '@/types';

type Navigation = NativeStackNavigationProp<AssetsStackParamList, 'AssetList'>;

export function AssetListScreen() {
  const navigation = useNavigation<Navigation>();

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [debouncedSearchName, setDebouncedSearchName] = useState('');
  const [debouncedSearchNumber, setDebouncedSearchNumber] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(20);
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
    const timer = setTimeout(() => setDebouncedSearchName(searchName.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchName]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchNumber(searchNumber.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchNumber]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadSettings().then((s) => {
        if (isActive) setPageSize(s.itemsPerPage);
      });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const fetchAreas = useCallback(async () => {
    try {
      const data = await listAllAreas();
      setAreas(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar areas.';
      setToast({ visible: true, message, type: 'error' });
    }
  }, []);

  const fetchAssets = useCallback(
    async (pageNumber: number, append = false) => {
      setLoading(true);
      try {
        const result = await listAssetsPaginated({
          searchName: debouncedSearchName,
          searchNumber: debouncedSearchNumber,
          areaId: selectedArea ?? undefined,
          page: pageNumber,
          pageSize,
        });
        setAssets((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(pageNumber);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar patrimonios.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearchName, debouncedSearchNumber, selectedArea, pageSize],
  );

  useFocusEffect(
    useCallback(() => {
      fetchAreas();
      fetchAssets(1, false);
    }, [fetchAssets, fetchAreas]),
  );

  useEffect(() => {
    fetchAssets(1, false);
  }, [debouncedSearchName, debouncedSearchNumber, selectedArea, fetchAssets]);

  const handleEndReached = () => {
    if (loading || assets.length >= total) {
      return;
    }
    fetchAssets(page + 1, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssets(1, false);
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    try {
      await deleteAsset(selectedAsset.id);
      setToast({ visible: true, message: 'Patrimonio removido.', type: 'success' });
      fetchAssets(1, false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel remover o patrimonio selecionado.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setSelectedAsset(null);
      setConfirmVisible(false);
    }
  };

  const handleExport = useCallback(
    async (type: 'pdf' | 'xlsx') => {
      setExporting(true);
      const filters = {
        searchName: debouncedSearchName,
        searchNumber: debouncedSearchNumber,
        areaId: selectedArea ?? undefined,
      };
      try {
        if (type === 'pdf') {
          await exportAssetsToPDF(filters, areas);
        } else {
          await exportAssetsToXLSX(filters, areas);
        }
        setToast({ visible: true, message: 'Exportacao concluida.', type: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao exportar.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setExporting(false);
      }
    },
    [areas, debouncedSearchName, debouncedSearchNumber, selectedArea],
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Patrimonios</Text>
          <Text style={styles.subtitle}>Gerencie seus bens.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setExportModalVisible(true)}
          >
            <Ionicons name="share-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Button title="Novo" onPress={() => navigation.navigate('AssetForm')} />
        </View>
      </View>
    ),
    [navigation],
  );

  const renderAreaFilter = () => (
    <View style={styles.areaFilter}>
      <Text style={styles.inputLabel}>Filtrar por area</Text>
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, selectedArea === null && styles.chipSelected]}
          onPress={() => setSelectedArea(null)}
        >
          <Text style={styles.chipText}>Todas</Text>
        </TouchableOpacity>
        {areas.map((area) => (
          <TouchableOpacity
            key={area.id}
            style={[
              styles.chip,
              selectedArea === area.id && styles.chipSelected,
              !area.active && styles.chipInactive,
            ]}
            onPress={() => setSelectedArea(area.id)}
          >
            <Text style={styles.chipText}>{area.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const areaNameById = useMemo(() => {
    const map: Record<number, string> = {};
    areas.forEach((area) => {
      map[area.id] = area.name;
    });
    return map;
  }, [areas]);

  const renderItem = useCallback(
    ({ item }: { item: AssetItem }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
      >
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.assetNumber ? (
              <Text style={styles.badge}>{item.assetNumber}</Text>
            ) : null}
          </View>
          <Text style={styles.cardSubtitle}>
            Area: {areaNameById[item.areaId] ?? item.areaId}
          </Text>
          <Text style={styles.cardMeta}>
            Quantidade: {item.quantity.toLocaleString()} | Valor unitario:{' '}
            {item.unitValue !== null && item.unitValue !== undefined
              ? item.unitValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '-'}
          </Text>
        </Surface>
      </TouchableOpacity>
    ),
    [areaNameById, navigation],
  );

  return (
    <Screen>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {header}

      <FlatList
        data={assets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 120, offset: 120 * index, index })}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        windowSize={6}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nenhum patrimonio encontrado"
              description="Crie um patrimonio ou ajuste os filtros."
              actionLabel="Novo patrimonio"
              onAction={() => navigation.navigate('AssetForm')}
            />
          ) : null
        }
      />

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Patrimonios</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Input
                label="Buscar por nome"
                placeholder="Digite para filtrar..."
                value={searchName}
                onChangeText={setSearchName}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Buscar por numero"
                placeholder="Ex.: PAT-000010"
                value={searchNumber}
                onChangeText={setSearchNumber}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {renderAreaFilter()}
            </View>

            <Button
              title="Aplicar Filtros"
              onPress={() => setFilterModalVisible(false)}
              style={styles.modalButton}
            />
          </Surface>
        </View>
      </Modal>

      <Modal
        visible={exportModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exportar Dados</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Escolha o formato para exportar a lista atual (respeitando os filtros
              aplicados).
            </Text>

            <View style={styles.exportActions}>
              <Button
                title="PDF"
                disabled={exporting || loading}
                onPress={() => {
                  handleExport('pdf');
                  setExportModalVisible(false);
                }}
                style={styles.exportButton}
              />
              <Button
                title="Excel (XLSX)"
                disabled={exporting || loading}
                onPress={() => {
                  handleExport('xlsx');
                  setExportModalVisible(false);
                }}
                style={styles.exportButton}
              />
            </View>
          </Surface>
        </View>
      </Modal>

      <LoadingOverlay
        visible={loading && !refreshing}
        message="Carregando patrimonios..."
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Remover patrimonio?"
        message={
          selectedAsset
            ? `Excluir "${selectedAsset.name}" (${selectedAsset.assetNumber})?`
            : ''
        }
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedAsset(null);
        }}
        onConfirm={handleDelete}
      />
      <LoadingOverlay visible={exporting} message="Gerando arquivo..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    gap: spacing.md,
  },
  modalButton: {
    marginTop: spacing.lg,
  },
  modalDescription: {
    color: colors.text,
    marginBottom: spacing.lg,
    fontSize: 16,
  },
  exportActions: {
    gap: spacing.md,
  },
  exportButton: {
    width: '100%',
  },
  inputLabel: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  areaFilter: {
    marginTop: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipInactive: {
    opacity: 0.5,
  },
  chipText: {
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
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cardMeta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
