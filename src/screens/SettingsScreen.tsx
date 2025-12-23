import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AlertBanner, Button, ConfirmModal, Input, Screen, Surface } from '@/components';
import { useAuth } from '@/services/auth/AuthContext';
import { loadSettings, saveSettings } from '@/services/settings/settingsStorage';
import { colors, spacing } from '@/theme';
import { AppSettings } from '@/types';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { session, signOut } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
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
    loadSettings().then(setSettings);
  }, []);

  const handleLogout = async () => {
    setConfirmVisible(false);
    await signOut();
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      const merged = await saveSettings(settings);
      setSettings(merged);
      setToast({ visible: true, message: 'Configuracoes salvas.', type: 'success' });
    } catch {
      setToast({
        visible: true,
        message: 'Erro ao salvar configuracoes.',
        type: 'error',
      });
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

      <Text style={styles.title}>Configuracoes</Text>
      <Text style={styles.subtitle}>Ajustes e sessao atual.</Text>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <Input
          label="Itens por pagina"
          keyboardType="numeric"
          value={settings ? String(settings.itemsPerPage) : ''}
          onChangeText={(text) =>
            setSettings((prev) =>
              prev
                ? { ...prev, itemsPerPage: Math.max(5, Number.parseInt(text, 10) || 10) }
                : prev,
            )
          }
        />
        <Input
          label="Formato numero patrimonio"
          placeholder="PAT-{seq}"
          value={settings?.patrimonyFormat ?? ''}
          onChangeText={(text) =>
            setSettings((prev) => (prev ? { ...prev, patrimonyFormat: text } : prev))
          }
        />
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Permitir criar novos no ajuste</Text>
            <Text style={styles.helper}>
              Itens &quot;Novo&quot; poderao ser criados no patrimonio.
            </Text>
          </View>
          <Switch
            value={settings?.allowCreateNew ?? true}
            onValueChange={(value) =>
              setSettings((prev) => (prev ? { ...prev, allowCreateNew: value } : prev))
            }
          />
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Regra para ausente</Text>
            <Text style={styles.helper}>
              Zerar quantidade ao aplicar ajuste ou manter quantidade original.
            </Text>
          </View>
          <View style={styles.inlineButton}>
            <Button
              title="Zerar"
              variant={settings?.missingRule === 'zero' ? 'primary' : 'secondary'}
              onPress={() =>
                setSettings((prev) => (prev ? { ...prev, missingRule: 'zero' } : prev))
              }
            />
            <Button
              title="Manter"
              variant={settings?.missingRule === 'keep' ? 'primary' : 'secondary'}
              onPress={() =>
                setSettings((prev) => (prev ? { ...prev, missingRule: 'keep' } : prev))
              }
            />
          </View>
        </View>
        <Button title="Salvar" onPress={handleSave} />
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Sessao</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Usuario</Text>
          <Text style={styles.value}>{session?.username ?? 'Nao identificado'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sessao armazenada</Text>
          <Text style={styles.value}>{session ? 'Sim (Secure Store)' : 'Nao'}</Text>
        </View>
        {session?.mustChangePassword ? (
          <View style={styles.infoRow}>
            <Text style={[styles.label, styles.warning]}>Senha padrao</Text>
            <Text style={[styles.value, styles.warning]}>Altere a senha do admin.</Text>
          </View>
        ) : null}
        <Button
          title="Encerrar sessao"
          variant="danger"
          onPress={() => setConfirmVisible(true)}
          style={styles.logout}
        />
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Modo Mestre</Text>
        <Text style={styles.helper}>
          Ative a recepção de coletas para sincronizar dados com coletores.
        </Text>
        <Button
          title="Receber Coletas"
          variant="outline"
          onPress={() => navigation.navigate('MasterReceive' as never)}
          style={{ marginTop: spacing.sm }}
        />
      </Surface>

      <ConfirmModal
        visible={confirmVisible}
        title="Encerrar sessao?"
        message="Isso limpara a sessao salva no Secure Store e voltara para a tela de login."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleLogout}
      />
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.textMuted,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
  },
  value: {
    color: colors.text,
    fontWeight: '600',
  },
  warning: {
    color: colors.warning,
  },
  logout: {
    marginTop: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  inlineButton: {
    marginTop: spacing.xs,
    maxWidth: 220,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
