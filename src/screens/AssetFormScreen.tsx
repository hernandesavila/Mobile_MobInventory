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
import { AssetsStackParamList } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import { createAsset, getAssetById, updateAsset } from '@/repositories/assetRepository';
import { loadSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { Area } from '@/types';
import { formatCurrencyInput, formatIntegerInput } from '@/utils';

type Props = NativeStackScreenProps<AssetsStackParamList, 'AssetForm'>;

export function AssetFormScreen({ navigation, route }: Props) {
  const { assetId } = route.params || {};

  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unitValue, setUnitValue] = useState('');
  const [autoNumber, setAutoNumber] = useState(true);
  const [patrimonyFormat, setPatrimonyFormat] = useState<string | null>(null);
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
        const list = await listAllAreas();
        setAreas(list);
        if (!areaId && list.length) {
          setAreaId(list[0].id);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Erro ao carregar areas para cadastro.';
        setToast({ visible: true, message, type: 'error' });
      }
    };

    loadAreas();
  }, [areaId]);

  useEffect(() => {
    loadSettings().then((settings) => setPatrimonyFormat(settings.patrimonyFormat));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!assetId) return;
      setLoading(true);
      try {
        const data = await getAssetById(assetId);
        if (data) {
          setAreaId(data.areaId);
          setName(data.name);
          setAssetNumber(data.assetNumber);
          setDescription(data.description ?? '');
          setQuantity(String(data.quantity ?? 0));
          setUnitValue(
            data.unitValue !== null && data.unitValue !== undefined
              ? String(data.unitValue)
              : '',
          );
          setAutoNumber(false);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao carregar patrimonio.';
        setToast({ visible: true, message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [assetId]);

  const handleSave = async () => {
    if (!areaId) {
      setToast({ visible: true, message: 'Selecione uma area.', type: 'error' });
      return;
    }
    if (!name.trim()) {
      setToast({
        visible: true,
        message: 'Informe o nome do patrimonio.',
        type: 'error',
      });
      return;
    }
    const qtyNumber = quantity === '' ? NaN : Number(quantity);
    if (Number.isNaN(qtyNumber) || qtyNumber < 0) {
      setToast({
        visible: true,
        message: 'Quantidade deve ser informada e maior ou igual a zero.',
        type: 'error',
      });
      return;
    }
    if (!autoNumber && !assetNumber.trim()) {
      // opcional quando nao gera automaticamente
    }

    const unitNumber =
      unitValue.trim() === ''
        ? null
        : Number.isNaN(Number(unitValue))
          ? null
          : Number(unitValue);
    if (unitNumber !== null && unitNumber < 0) {
      setToast({
        visible: true,
        message: 'Valor unitario deve ser maior ou igual a zero (ou deixe em branco).',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        areaId,
        name: name.trim(),
        description,
        quantity: qtyNumber || 0,
        unitValue: unitNumber,
        assetNumber: autoNumber ? undefined : assetNumber.trim() || undefined,
        autoGenerateNumber: autoNumber,
        patrimonyFormat: patrimonyFormat ?? undefined,
      };

      if (assetId) {
        await updateAsset(assetId, payload);
        setToast({ visible: true, message: 'Patrimonio atualizado.', type: 'success' });
      } else {
        await createAsset(payload);
        setToast({ visible: true, message: 'Patrimonio criado.', type: 'success' });
      }

      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar patrimonio.';
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
        <Text style={styles.title}>
          {assetId ? 'Editar patrimonio' : 'Novo patrimonio'}
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Area</Text>
            <View style={styles.chipsRow}>
              {areas.map((area) => (
                <Text
                  key={area.id}
                  style={[
                    styles.chip,
                    areaId === area.id && styles.chipSelected,
                    !area.active && styles.chipInactive,
                  ]}
                  onPress={() => setAreaId(area.id)}
                >
                  {area.name}
                </Text>
              ))}
            </View>
          </View>

          <Input
            label="Nome"
            placeholder="Notebook Dell"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Descricao"
            placeholder="Opcional"
            value={description}
            onChangeText={setDescription}
          />
          <Input
            label="Quantidade"
            keyboardType="numeric"
            value={quantity}
            onChangeText={(text) => setQuantity(formatIntegerInput(text))}
          />
          <Input
            label="Valor unitario (opcional)"
            keyboardType="numeric"
            value={unitValue}
            onChangeText={(text) => setUnitValue(formatCurrencyInput(text))}
            placeholder="Ex.: 123.45"
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Gerar numero automaticamente</Text>
              <Text style={styles.muted}>
                Formato: PAT-000001 (ou personalize em Configuracoes)
              </Text>
            </View>
            <Switch value={autoNumber} onValueChange={setAutoNumber} />
          </View>

          {!autoNumber ? (
            <Input
              label="Numero de patrimonio"
              placeholder="PAT-000999 (opcional se desligar geracao automatica)"
              value={assetNumber}
              onChangeText={setAssetNumber}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : null}
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
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipInactive: {
    opacity: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
