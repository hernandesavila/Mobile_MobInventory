import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AlertBanner,
  Button,
  ConfirmModal,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { AssetsStackParamList } from '@/navigation/types';
import { getAreaById } from '@/repositories/areaRepository';
import { deleteAsset, getAssetById } from '@/repositories/assetRepository';
import { colors, spacing } from '@/theme';
import { AssetItem } from '@/types';

type Props = NativeStackScreenProps<AssetsStackParamList, 'AssetDetail'>;

export function AssetDetailScreen({ navigation, route }: Props) {
  const { assetId } = route.params;

  const [asset, setAsset] = useState<AssetItem | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
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
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAssetById(assetId);
        setAsset(data);
        if (data) {
          const area = await getAreaById(data.areaId);
          setAreaName(area?.name ?? null);
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

  const handleDelete = async () => {
    try {
      await deleteAsset(assetId);
      setToast({ visible: true, message: 'Patrimonio removido.', type: 'success' });
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel remover o patrimonio.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setConfirmVisible(false);
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

      <LoadingOverlay visible={loading} message="Carregando patrimonio..." />

      {asset ? (
        <Surface style={styles.card}>
          <Text style={styles.title}>{asset.name}</Text>
          {asset.assetNumber ? (
            <Text style={styles.badge}>{asset.assetNumber}</Text>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>Area:</Text>
            <Text style={styles.value}>{areaName ?? asset.areaId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Quantidade:</Text>
            <Text style={styles.value}>{asset.quantity}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valor unitario:</Text>
            <Text style={styles.value}>
              {asset.unitValue !== null && asset.unitValue !== undefined
                ? asset.unitValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '-'}
            </Text>
          </View>
          {asset.description ? (
            <View style={styles.row}>
              <Text style={styles.label}>Descricao:</Text>
              <Text style={styles.value}>{asset.description}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Editar"
              onPress={() => navigation.navigate('AssetForm', { assetId })}
            />
            <Button
              title="Excluir"
              variant="danger"
              onPress={() => setConfirmVisible(true)}
            />
          </View>
        </Surface>
      ) : null}

      <ConfirmModal
        visible={confirmVisible}
        title="Remover patrimonio?"
        message="Essa acao nao pode ser desfeita."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    marginTop: spacing.xs,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  label: {
    color: colors.textMuted,
  },
  value: {
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
