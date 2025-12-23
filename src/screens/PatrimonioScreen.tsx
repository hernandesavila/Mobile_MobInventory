import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, EmptyState, Screen, Surface } from '@/components';
import { colors, spacing } from '@/theme';

export function PatrimonioScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Patrimonio</Text>
      <Text style={styles.subtitle}>Cadastre bens e acompanhe movimentacoes.</Text>

      <Surface style={styles.section}>
        <EmptyState
          title="Nenhum patrimonio cadastrado"
          description="Adicione itens para acompanhar localizacao, status e historico."
          actionLabel="Novo patrimonio"
          onAction={() => null}
        />
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Acoes rapidas</Text>
        <Button title="Registrar baixa" variant="secondary" />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
});
