import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Button, Input, Screen, Surface } from '@/components';
import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/services/auth/AuthContext';
import { colors, spacing } from '@/theme';

export function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleLogin = async () => {
    try {
      await signIn({ username, password });
      setToast({
        visible: true,
        message: 'Login realizado.',
        type: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel iniciar a sessao.';
      setToast({ visible: true, message, type: 'error' });
    }
  };

  return (
    <Screen scroll>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ visible: false, message: '', type: 'info' })}
      />

      <View style={styles.hero}>
        <Text style={styles.subtitle}>Mob Inventory</Text>
        <Text style={styles.title}>Acesse sua conta</Text>
        <Text style={styles.description}>
          Armazenamos a sessao localmente usando Secure Store e validamos usuario/senha no
          SQLite.
        </Text>
      </View>

      <Surface style={styles.card}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Input
              label="Usuario"
              placeholder="admin"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={styles.field}>
            <Input
              label="Senha"
              placeholder="********"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <Button title="Entrar" onPress={handleLogin} style={styles.submit} />

          <Button
            title="Esqueci minha senha"
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          />

          <View style={styles.divider} />

          <Button
            title="Modo Coletor"
            variant="outline"
            onPress={() => navigation.navigate('CollectorConfig')}
          />
        </View>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  subtitle: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  card: {
    marginTop: spacing.sm,
  },
  form: {
    width: '100%',
  },
  field: {
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.sm,
  },
  forgotPassword: {
    marginTop: spacing.sm,
  },
});
