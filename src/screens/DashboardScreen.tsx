import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState, Screen, Surface } from '@/components';
import {
  countAreas,
  countAssets,
  countInventories,
} from '@/repositories/dashboardRepository';
import { useAuth } from '@/services/auth/AuthContext';
import { colors, spacing } from '@/theme';

export function DashboardScreen() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState({
    assets: 0,
    areas: 0,
    inventories: 0,
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const [assets, areas, inventories] = await Promise.all([
          countAssets(),
          countAreas(),
          countInventories(),
        ]);
        setMetrics({ assets, areas, inventories });
      } catch {
        // ignore dashboard errors
      }
    };
    loadMetrics();
  }, []);

  return (
    <Screen scroll>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>
        Ola {session?.username ?? 'visitante'}, acompanhe os principais indicadores.
      </Text>

      <View style={styles.grid}>
        <Surface style={styles.card}>
          <Text style={styles.metricValue}>{metrics.assets}</Text>
          <Text style={styles.metricLabel}>Patrimonios</Text>
        </Surface>
        <Surface style={styles.card}>
          <Text style={styles.metricValue}>{metrics.areas}</Text>
          <Text style={styles.metricLabel}>Areas</Text>
        </Surface>
        <Surface style={styles.card}>
          <Text style={styles.metricValue}>{metrics.inventories}</Text>
          <Text style={styles.metricLabel}>Inventarios</Text>
        </Surface>
      </View>

      <Surface style={styles.section}>
        <EmptyState
          title="Sem movimentacoes recentes"
          description="As atividades recentes aparecem aqui quando voce registrar inventarios e backups."
        />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: spacing.md,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
  },
  section: {
    marginTop: spacing.lg,
  },
});
