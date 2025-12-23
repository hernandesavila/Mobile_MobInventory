import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Button, Input, Screen, Surface } from '@/components';
import { createUser } from '@/repositories/userRepository';
import { useAuth } from '@/services/auth/AuthContext';
import { colors, spacing } from '@/theme';

export function RegisterUserScreen() {
  const { signIn, checkHasUsers } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const handleRegister = async () => {
    if (
      !username ||
      !password ||
      !confirmPassword ||
      !securityQuestion ||
      !securityAnswer
    ) {
      setToast({ visible: true, message: 'Preencha todos os campos.', type: 'warning' });
      return;
    }

    if (password.length < 6) {
      setToast({
        visible: true,
        message: 'A senha deve ter no minimo 6 caracteres.',
        type: 'warning',
      });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ visible: true, message: 'As senhas nao conferem.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await createUser({
        username,
        password,
        securityQuestion,
        securityAnswer,
        mustChangePassword: false,
      });

      await checkHasUsers(); // Update context
      await signIn({ username, password }); // Auto login
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar usuario.';
      setToast({ visible: true, message, type: 'error' });
      setLoading(false);
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
        <Text style={styles.title}>Primeiro Acesso</Text>
        <Text style={styles.description}>
          Crie o usuario administrador para comecar a usar o sistema.
        </Text>
      </View>

      <Surface style={styles.card}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Input
              label="Usuario"
              placeholder="Ex: admin"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={styles.field}>
            <Input
              label="Senha"
              placeholder="Minimo 6 caracteres"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View style={styles.field}>
            <Input
              label="Confirmar Senha"
              placeholder="Repita a senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Recuperacao de Senha</Text>

          <View style={styles.field}>
            <Input
              label="Pergunta de Seguranca"
              placeholder="Ex: Qual o nome do seu primeiro pet?"
              value={securityQuestion}
              onChangeText={setSecurityQuestion}
            />
          </View>
          <View style={styles.field}>
            <Input
              label="Resposta"
              placeholder="Sua resposta secreta"
              secureTextEntry
              value={securityAnswer}
              onChangeText={setSecurityAnswer}
            />
          </View>

          <Button
            title={loading ? 'Criando...' : 'Criar Conta'}
            onPress={handleRegister}
            style={styles.submit}
            disabled={loading}
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
  subtitle: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  card: {
    padding: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
