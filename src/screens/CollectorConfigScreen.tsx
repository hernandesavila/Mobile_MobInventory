import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Button, Input, Screen, Surface } from '@/components';
import {
  getCollectorId,
  getCollectorName,
  logCollectorEvent,
  setCollectorName,
} from '@/services/collector/collectorService';
import { colors, spacing } from '@/theme';

export function CollectorConfigScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedId = await getCollectorId();
      const storedName = await getCollectorName();
      setId(storedId);
      if (storedName) setName(storedName);
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao carregar dados.', type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ visible: true, message: 'Nome é obrigatório.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await setCollectorName(name.trim());
      await logCollectorEvent('COLLECTOR_CONFIGURED', { name: name.trim() });
      setToast({ visible: true, message: 'Configuração salva!', type: 'success' });
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao salvar.', type: 'error' });
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
        <Text style={styles.title}>Modo Coletor</Text>
        <Text style={styles.subtitle}>Configuração Inicial</Text>
      </View>

      <Surface style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID do Dispositivo:</Text>
          <Text style={styles.value}>{id || 'Gerando...'}</Text>
        </View>

        <Input
          label="Nome do Coletor"
          placeholder="Ex: João - Equipe 2"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Button
          title="Salvar Configuração"
          onPress={handleSave}
          disabled={loading}
          style={styles.button}
        />

        <View style={styles.divider} />

        <Button
          title="Conectar ao Mestre"
          variant="outline"
          onPress={() => navigation.navigate('CollectorConnect' as never)}
          style={styles.button}
        />
      </Surface>

      <Button
        title="Voltar para Login"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  infoRow: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.lg,
  },
});
