import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  AlertBanner,
  Button,
  Input,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { AreasStackParamList } from '@/navigation/types';
import { createArea, getAreaById, updateArea } from '@/repositories/areaRepository';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<AreasStackParamList, 'AreaForm'>;

export function AreaFormScreen({ navigation, route }: Props) {
  const { areaId } = route.params || {};

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
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
    const loadArea = async () => {
      if (!areaId) return;
      setLoading(true);
      try {
        const area = await getAreaById(areaId);
        if (area) {
          setName(area.name);
          setDescription(area.description ?? '');
          setActive(area.active);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao carregar area.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadArea();
  }, [areaId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (areaId) {
        await updateArea(areaId, { name, description, active });
        setToast({ visible: true, message: 'Area atualizada.', type: 'success' });
      } else {
        await createArea({ name, description, active });
        setToast({ visible: true, message: 'Area criada.', type: 'success' });
      }
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar area. Tente novamente.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <Surface style={styles.card}>
        <Text style={styles.title}>{areaId ? 'Editar area' : 'Nova area'}</Text>

        <View style={styles.form}>
          <Input
            label="Nome"
            placeholder="Area de TI"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
          />
          <Input
            label="Descricao"
            placeholder="Opcional"
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Area ativa</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>
        </View>

        <Button title="Salvar" onPress={handleSave} />
      </Surface>

      <LoadingOverlay visible={loading} message="Salvando..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchLabel: {
    color: colors.text,
    fontWeight: '600',
  },
});
