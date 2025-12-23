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
import { AreasStackParamList } from '@/navigation/types';
import { deleteArea, listAreasPaginated } from '@/repositories/areaRepository';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Area } from '@/types';

type Navigation = NativeStackNavigationProp<AreasStackParamList, 'AreaList'>;

export function AreaListScreen() {
  const navigation = useNavigation<Navigation>();

  const [areas, setAreas] = useState<Area[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
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
      let isActive = true;
      loadSettings().then((s) => {
        if (isActive) setPageSize(s.itemsPerPage);
      });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const fetchPage = useCallback(
    async (pageNumber: number, append = false) => {
      setLoading(true);
      try {
        const result = await listAreasPaginated({
          search: debouncedSearch,
          page: pageNumber,
          pageSize,
          order,
        });
        setAreas((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(pageNumber);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar areas.';
        setToast({
          visible: true,
          message,
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, order, pageSize],
  );

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, false);
    }, [fetchPage]),
  );

  const handleEndReached = () => {
    if (loading || areas.length >= total) {
      return;
    }
    fetchPage(page + 1, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPage(1, false);
  };

  const handleDelete = async () => {
    if (!selectedArea) {
      return;
    }
    try {
      await deleteArea(selectedArea.id);
      setToast({ visible: true, message: 'Area removida.', type: 'success' });
      fetchPage(1, false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel remover a area selecionada.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setSelectedArea(null);
      setConfirmVisible(false);
    }
  };

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Areas</Text>
          <Text style={styles.subtitle}>
            Gerencie ambientes para vincular patrimonios.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="filter" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Button title="Nova area" onPress={() => navigation.navigate('AreaForm')} />
        </View>
      </View>
    ),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Area }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AreaForm', { areaId: item.id })}
      >
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: item.active ? colors.primaryLight : '#e2e8f0' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: item.active ? colors.primary : colors.text },
                ]}
              >
                {item.active ? 'Ativa' : 'Inativa'}
              </Text>
            </View>
          </View>
          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.cardActions}>
            <Button
              title="Editar"
              onPress={() => navigation.navigate('AreaForm', { areaId: item.id })}
            />
            <Button
              title="Excluir"
              variant="danger"
              onPress={() => {
                setSelectedArea(item);
                setConfirmVisible(true);
              }}
            />
          </View>
        </Surface>
      </TouchableOpacity>
    ),
    [navigation],
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
        data={areas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 88, offset: 88 * index, index })}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        windowSize={5}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="Nenhuma area encontrada"
              description="Cadastre uma nova area ou ajuste sua busca."
              actionLabel="Nova area"
              onAction={() => navigation.navigate('AreaForm')}
            />
          ) : null
        }
      />

      <LoadingOverlay visible={loading && !refreshing} message="Carregando areas..." />

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar e Ordenar</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Buscar por nome"
              placeholder="Digite para filtrar..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.sortSection}>
              <Text style={styles.sortLabel}>Ordenação</Text>
              <View style={styles.sortButtons}>
                <Button
                  title="A → Z"
                  variant={order === 'asc' ? 'primary' : 'outline'}
                  onPress={() => {
                    setOrder('asc');
                    fetchPage(1, false);
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Z → A"
                  variant={order === 'desc' ? 'primary' : 'outline'}
                  onPress={() => {
                    setOrder('desc');
                    fetchPage(1, false);
                  }}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>

            <Button
              title="Aplicar Filtros"
              onPress={() => setFilterModalVisible(false)}
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmVisible}
        title="Remover area?"
        message={
          selectedArea
            ? `Excluir "${selectedArea.name}"? Areas com patrimonio vinculado nao podem ser removidas.`
            : ''
        }
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedArea(null);
        }}
        onConfirm={handleDelete}
      />
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  badgeText: {
    fontWeight: '600',
  },
  cardDescription: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  sortSection: {
    marginTop: spacing.lg,
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
