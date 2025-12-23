import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AlertBanner,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingOverlay,
  Screen,
  Surface,
} from '@/components';
import { resetDatabaseConnection } from '@/db';
import { AppTabsParamList } from '@/navigation/types';
import { loadSession, dropSession } from '@/repositories/sessionRepository';
import { ensureAdminUser, getUserById } from '@/repositories/userRepository';
import { useAuth } from '@/services/auth/AuthContext';
import {
  BackupFile,
  createBackupFile,
  pickBackupFile,
  restoreBackup,
} from '@/services/backup/backupService';
import { clearSettingsCache } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';

export function BackupRestoreScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const { signOut } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const backupSummary = useMemo(() => {
    if (!selectedBackup) return '';
    const { data } = selectedBackup;
    return `Schema v${selectedBackup.schemaVersion} | Usuarios: ${data.users.length} | Areas: ${data.areas.length} | Patrimonios: ${data.assets.length}`;
  }, [selectedBackup]);

  const handleBackup = async () => {
    setLoading(true);
    setLoadingMessage('Gerando backup...');
    try {
      await createBackupFile();
      setToast({
        visible: true,
        message: 'Backup exportado. Compartilhe ou salve o arquivo gerado.',
        type: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel gerar o backup.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handlePickBackup = async () => {
    setLoading(true);
    setLoadingMessage('Lendo arquivo de backup...');
    try {
      const backup = await pickBackupFile();
      if (!backup) {
        return;
      }
      setSelectedBackup(backup);
      setConfirmVisible(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Arquivo de backup invalido.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    setLoading(true);
    setLoadingMessage('Restaurando backup...');
    try {
      await restoreBackup(selectedBackup);
      resetDatabaseConnection();
      clearSettingsCache();
      await ensureAdminUser();

      let validSession = false;
      const stored = await loadSession();
      if (stored?.userId) {
        const user = await getUserById(stored.userId);
        validSession = Boolean(user);
      }
      if (!validSession) {
        await dropSession();
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        });
      }
      setToast({
        visible: true,
        message: validSession
          ? 'Backup restaurado com sucesso.'
          : 'Backup restaurado. Sessao revalidada, faca login novamente.',
        type: 'success',
      });
      if (validSession) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel restaurar o backup.';
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setConfirmVisible(false);
      setSelectedBackup(null);
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

      <Text style={styles.title}>Backup & Restore</Text>
      <Text style={styles.subtitle}>
        Exporte um snapshot completo (usuarios, areas, patrimonios) ou restaure um arquivo
        existente. Todas as operacoes rodam em transacao local no SQLite.
      </Text>

      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Backup imediato</Text>
            <Text style={styles.sectionCopy}>
              Gera um JSON com schema_version, usuarios (hash+salt), areas, patrimonios e
              sequencias.
            </Text>
          </View>
          <Button title="Exportar backup" onPress={handleBackup} disabled={loading} />
        </View>
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Restaurar dados</Text>
        <Text style={styles.sectionCopy}>
          Selecione um arquivo .json criado pelo app. A integridade e validada por
          checksum antes de substituir os dados locais.
        </Text>
        <Button title="Importar backup" disabled={loading} onPress={handlePickBackup} />
      </Surface>

      <Surface style={styles.section}>
        <EmptyState
          title="Nenhum backup carregado"
          description="Ao importar, exibiremos um resumo antes de confirmar a restauracao."
          actionLabel="Importar backup"
          onAction={handlePickBackup}
        />
      </Surface>

      <ConfirmModal
        visible={confirmVisible}
        title="Substituir base atual?"
        message={
          selectedBackup
            ? `Confirme para sobrescrever todos os dados locais.\n${backupSummary}`
            : 'Sobrescrever todos os dados locais.'
        }
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedBackup(null);
        }}
        onConfirm={handleRestore}
      />
      <LoadingOverlay visible={loading} message={loadingMessage} />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  sectionCopy: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});
