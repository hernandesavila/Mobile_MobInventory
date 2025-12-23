import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AlertBanner,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { InventoriesStackParamList } from '@/navigation/types';
import {
  finalizeInventory,
  listInventoriesPaginated,
} from '@/repositories/inventoryRepository';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Inventory } from '@/types';

type Navigation = NativeStackNavigationProp<InventoriesStackParamList, 'InventoryList'>;

export function InventoryListScreen() {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<Inventory[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const [selected, setSelected] = useState<Inventory | null>(null);

  const fetchInventories = useCallback(
    async (pageNumber: number, append = false) => {
      setLoading(true);
      try {
        const result = await listInventoriesPaginated({
          page: pageNumber,
          pageSize,
        });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(pageNumber);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar inventarios.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageSize],
  );

  useFocusEffect(
    useCallback(() => {
      fetchInventories(1, false);
      let active = true;
      loadSettings().then((s) => {
        if (active) setPageSize(s.itemsPerPage);
      });
      return () => {
        active = false;
      };
    }, [fetchInventories]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventories(1, false);
  };

  const handleEndReached = () => {
    if (loading || items.length >= total) return;
    fetchInventories(page + 1, true);
  };

  const handleFinalize = async () => {
    if (!selected) return;
    try {
      await finalizeInventory(selected.id);
      setToast({ visible: true, message: 'Inventario finalizado.', type: 'success' });
      fetchInventories(1, false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel finalizar.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setConfirmVisible(false);
      setSelected(null);
    }
  };

  const statusLabel = (status: Inventory['status']) =>
    status === 'finished' ? 'Finalizado' : 'Em aberto';

  const renderItem = useCallback(
    ({ item }: { item: Inventory }) => (
      <Surface style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              Escopo:{' '}
              {item.scopeType === 'ALL' ? 'Todas as areas' : `Area #${item.areaId}`}
            </Text>
          </View>
          <Text
            style={[
              styles.status,
              item.status === 'finished' ? styles.statusDone : styles.statusOpen,
            ]}
          >
            {statusLabel(item.status)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Button
            title="Abrir"
            disabled={loading}
            onPress={() => navigation.navigate('InventoryRead', { inventoryId: item.id })}
          />
          {item.status === 'open' ? (
            <Button
              title="Finalizar"
              variant="danger"
              disabled={loading}
              onPress={() => {
                setSelected(item);
                setConfirmVisible(true);
              }}
            />
          ) : null}
        </View>
      </Surface>
    ),
    [loading, navigation],
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
        <View>
          <Text style={styles.title}>Inventarios</Text>
          <Text style={styles.subtitle}>Controle snapshots e leituras.</Text>
        </View>
        <Button
          title="Novo"
          disabled={loading}
          onPress={() => navigation.navigate('InventoryForm')}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: 104, offset: 104 * index, index })}
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
              title="Nenhum inventario"
              description="Crie um inventario para gerar a leitura 0."
              actionLabel="Novo inventario"
              onAction={() => navigation.navigate('InventoryForm')}
            />
          ) : null
        }
      />

      <LoadingOverlay
        visible={loading && !refreshing}
        message="Carregando inventarios..."
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Finalizar inventario?"
        message={
          selected
            ? `Isso impede novas leituras em "${selected.name}".`
            : 'Finalizar inventario.'
        }
        onCancel={() => {
          setConfirmVisible(false);
          setSelected(null);
        }}
        onConfirm={handleFinalize}
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
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  status: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    fontWeight: '700',
  },
  statusOpen: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },
  statusDone: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
