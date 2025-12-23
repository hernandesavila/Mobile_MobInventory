import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Screen } from '@/components';
import { RootStackNavigationProp } from '@/navigation/types';
import { listReceivedBatches, SyncBatch } from '@/repositories/syncRepository';
import { colors, spacing } from '@/theme';

export function MasterBatchListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [batches, setBatches] = useState<SyncBatch[]>([]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const list = await listReceivedBatches();
    setBatches(list);
  };

  const renderItem = ({ item }: { item: SyncBatch }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('MasterBatchDetail', { batchId: item.id })}
    >
      <View style={styles.row}>
        <Text style={styles.collector}>{item.collector_name || 'Desconhecido'}</Text>
        <Text style={styles.date}>{new Date(item.received_at).toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.count}>{item.item_count} itens</Text>
        <Text
          style={[
            styles.status,
            item.status === 'APPROVED' && styles.statusApproved,
            item.status === 'REJECTED' && styles.statusRejected,
          ]}
        >
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen style={styles.container}>
      <FlatList
        data={batches}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum lote recebido.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
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
  collector: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  count: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.warning,
  },
  statusApproved: {
    color: colors.success,
  },
  statusRejected: {
    color: colors.error,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textMuted,
  },
});
