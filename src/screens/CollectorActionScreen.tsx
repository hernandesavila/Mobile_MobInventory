import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button, Screen, Surface } from '@/components';
import { AuthStackNavigationProp } from '@/navigation/types';
import { getOpenBatch } from '@/repositories/collectorRepository';
import {
  ensureOpenBatch,
  getCollectorName,
  sendBatchToMaster,
  syncAreasFromMaster,
} from '@/services/collector/collectorService';
import { colors, spacing } from '@/theme';

export function CollectorActionScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const [collectorName, setCollectorNameState] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'sync' | 'collect' | 'send' | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    const name = await getCollectorName();
    setCollectorNameState(name || 'Coletor');
  };

  const handleSync = async () => {
    setLoadingAction('sync');
    setStatusMessage('Sincronizando áreas...');
    try {
      await syncAreasFromMaster();
      setStatusMessage('Áreas sincronizadas com sucesso!');
      Alert.alert('Sucesso', 'Áreas baixadas do mestre.');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setStatusMessage(`Erro: ${msg}`);

      if (msg.includes('Network request failed') || msg.includes('Falha na conexão')) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível conectar ao Mestre. Verifique se a tela "Receber Coletas" está aberta no dispositivo Mestre e se o IP/Porta estão corretos.',
        );
      } else {
        Alert.alert('Erro', `Falha na sincronização: ${msg}`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartCollection = async () => {
    setLoadingAction('collect');
    try {
      await ensureOpenBatch();
      navigation.navigate('CollectorScan');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível iniciar o lote de coleta.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendBatch = async () => {
    setLoadingAction('send');
    setStatusMessage('Enviando dados...');
    try {
      const batch = await getOpenBatch();
      if (!batch) {
        Alert.alert('Aviso', 'Não há lote aberto para enviar.');
        setStatusMessage('Nenhum lote para enviar.');
        setTimeout(() => setStatusMessage(''), 3000);
        return;
      }

      await sendBatchToMaster(batch.id);
      setStatusMessage('Dados enviados com sucesso!');
      Alert.alert('Sucesso', 'Lote enviado ao mestre.');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setStatusMessage(`Erro no envio: ${msg}`);

      if (msg.includes('Network request failed') || msg.includes('Falha na conexão')) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível conectar ao Mestre. Verifique se a tela "Receber Coletas" está aberta no dispositivo Mestre e se o IP/Porta estão corretos.',
        );
      } else {
        Alert.alert('Erro', `Falha ao enviar: ${msg}`);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Screen style={styles.container}>
      <Surface style={styles.header}>
        <Text style={styles.title}>Modo Coletor</Text>
        <Text style={styles.subtitle}>{collectorName}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </Surface>

      <View style={styles.content}>
        <Surface style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusText}>{statusMessage || 'Aguardando ação...'}</Text>
        </Surface>

        <View style={styles.actions}>
          <Button
            title="Sincronizar Áreas"
            onPress={handleSync}
            loading={loadingAction === 'sync'}
            disabled={!!loadingAction}
            variant="outline"
            style={styles.button}
          />

          <Button
            title="Iniciar Coleta"
            onPress={handleStartCollection}
            loading={loadingAction === 'collect'}
            disabled={!!loadingAction}
            variant="primary"
            style={styles.button}
          />

          <Button
            title="Enviar Dados"
            onPress={handleSendBatch}
            loading={loadingAction === 'send'}
            disabled={!!loadingAction}
            variant="secondary"
            style={styles.button}
          />
        </View>
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
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  logoutButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  logoutText: {
    color: colors.error,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  statusCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
});
