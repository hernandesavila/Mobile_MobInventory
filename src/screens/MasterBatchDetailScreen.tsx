import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, Surface } from '@/components';
import { RootStackParamList } from '@/navigation/types';
import {
  applyBatchItem,
  getBatchById,
  getBatchItems,
  SyncBatch,
  SyncBatchItem,
  updateBatchStatus,
} from '@/repositories/syncRepository';
import { colors, spacing } from '@/theme';

export function MasterBatchDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MasterBatchDetail'>>();
  const { batchId } = route.params;

  const [batch, setBatch] = useState<SyncBatch | null>(null);
  const [items, setItems] = useState<SyncBatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    const loadData = async () => {
      const [b, i] = await Promise.all([getBatchById(batchId), getBatchItems(batchId)]);
      setBatch(b);
      setItems(i);
      if (b) setStatus(b.status);
    };
    loadData();
  }, [batchId]);

  const handleApply = async () => {
    setLoading(true);
    try {
      // Apply all items
      for (const item of items) {
        await applyBatchItem(batchId, item);
      }
      await updateBatchStatus(batchId, 'APPROVED');
      setStatus('APPROVED');
      Alert.alert('Sucesso', 'Lote aplicado ao patrimônio!');
      navigation.goBack();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', `Falha ao aplicar lote: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Confirmar Rejeição',
      'Tem certeza que deseja rejeitar este lote? Ele não será aplicado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateBatchStatus(batchId, 'REJECTED');
              setStatus('REJECTED');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erro', 'Falha ao rejeitar lote.');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: SyncBatchItem }) => (
    <View style={styles.item}>
      <View style={styles.row}>
        <Text style={styles.assetName}>{item.assetName}</Text>
        <Text style={styles.patrimony}>{item.patrimonyNumber || 'S/N'}</Text>
      </View>
      <Text style={styles.area}>{item.areaName}</Text>
      {item.description && <Text style={styles.description}>{item.description}</Text>}
      <View style={styles.footer}>
        <Text style={styles.quantity}>Qtd: {item.quantity}</Text>
        <Text style={styles.status}>
          {item.patrimonyNumber ? 'Verificando...' : 'Novo (S/N)'}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen style={styles.container}>
      <Surface style={styles.header}>
        {batch && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.subtitle}>Coletor: {batch.collector_name}</Text>
            <Text style={styles.subtitle}>
              ID: {batch.collector_id.substring(0, 8)}...
            </Text>
            <Text style={styles.subtitle}>
              Recebido em: {new Date(batch.received_at).toLocaleString()}
            </Text>
            <Text style={[styles.status, { marginTop: 4 }]}>Status: {status}</Text>
          </View>
        )}
      </Surface>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.tempId}
        contentContainerStyle={styles.list}
      />

      <View style={styles.actions}>
        <Button
          title="Rejeitar Lote"
          onPress={handleReject}
          variant="danger"
          style={styles.button}
          disabled={loading || status !== 'PENDING'}
        />
        <Button
          title="Aplicar ao Patrimônio"
          onPress={handleApply}
          variant="primary"
          style={styles.button}
          loading={loading}
          disabled={status !== 'PENDING'}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  subtitle: {
    color: colors.textMuted,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  item: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  assetName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  patrimony: {
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  area: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quantity: {
    fontWeight: 'bold',
  },
  status: {
    fontSize: 12,
    color: colors.warning,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  button: {
    flex: 1,
  },
});
