import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AlertBanner,
  Button,
  Input,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { InventoriesStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import { createInventory } from '@/repositories/inventoryRepository';
import { colors, spacing } from '@/theme';
import { Area, InventoryScope } from '@/types';

type Navigation = NativeStackNavigationProp<InventoriesStackParamList, 'InventoryForm'>;

export function InventoryFormScreen() {
  const navigation = useNavigation<Navigation>();

  const [name, setName] = useState('');
  const [scope, setScope] = useState<InventoryScope>('ALL');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
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
    const loadAreas = async () => {
      try {
        const data = await listAllAreas();
        setAreas(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar areas.';
        setToast({ visible: true, message, type: 'error' });
      }
    };
    loadAreas();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const inventory = await createInventory({
        name,
        scopeType: scope,
        areaId: scope === 'AREA' ? (areaId ?? undefined) : undefined,
      });
      setToast({
        visible: true,
        message: 'Inventario criado. Leitura 0 gerada.',
        type: 'success',
      });
      navigation.replace('InventoryRead', { inventoryId: inventory.id });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel criar o inventario.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const scopeOption = (value: InventoryScope, label: string, helper?: string) => (
    <TouchableOpacity
      style={[styles.scopeOption, scope === value && styles.scopeSelected]}
      onPress={() => setScope(value)}
    >
      <Text style={styles.scopeLabel}>{label}</Text>
      {helper ? <Text style={styles.scopeHelper}>{helper}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <Screen scroll>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <Surface>
        <Input
          label="Nome"
          placeholder="Ex.: Inventario trimestre"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionTitle}>Escopo</Text>
        {scopeOption('ALL', 'Todas as areas', 'Inclui todo o patrimonio.')}
        {scopeOption('AREA', 'Apenas uma area', 'Snapshot limitado a uma area.')}

        {scope === 'AREA' ? (
          <View style={styles.areaList}>
            {areas.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaItem,
                  areaId === area.id && styles.areaItemSelected,
                  !area.active && styles.areaItemInactive,
                ]}
                onPress={() => setAreaId(area.id)}
              >
                <Text style={styles.areaName}>{area.name}</Text>
                {area.description ? (
                  <Text style={styles.areaDescription}>{area.description}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
            {!areas.length ? (
              <Text style={styles.helper}>Cadastre uma area para continuar.</Text>
            ) : null}
          </View>
        ) : null}

        <Button title="Iniciar inventario" onPress={handleSubmit} />
      </Surface>

      <LoadingOverlay visible={loading} message="Gerando leitura 0..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scopeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  scopeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  scopeLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  scopeHelper: {
    color: colors.textMuted,
    marginTop: 2,
  },
  areaList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  areaItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
  },
  areaItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  areaItemInactive: {
    opacity: 0.5,
  },
  areaName: {
    fontWeight: '700',
    color: colors.text,
  },
  areaDescription: {
    color: colors.textMuted,
    marginTop: 2,
  },
  helper: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
