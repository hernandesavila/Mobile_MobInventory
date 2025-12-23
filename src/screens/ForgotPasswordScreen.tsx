import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Button, Input, Screen, Surface } from '@/components';
import {
  getUserByUsername,
  updatePasswordByUsername,
  verifySecurityAnswer,
} from '@/repositories/userRepository';
import { colors, spacing } from '@/theme';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handleFindUser = async () => {
    if (!username.trim()) {
      setToast({ visible: true, message: 'Informe o usuario.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const user = await getUserByUsername(username.trim());
      if (user && user.securityQuestion) {
        setSecurityQuestion(user.securityQuestion);
        setStep(2);
        setToast({ visible: false, message: '', type: 'info' });
      } else {
        setToast({
          visible: true,
          message: 'Usuario nao encontrado ou sem pergunta de seguranca configurada.',
          type: 'error',
        });
      }
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao buscar usuario.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAnswer = async () => {
    if (!securityAnswer.trim()) {
      setToast({ visible: true, message: 'Informe a resposta.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const valid = await verifySecurityAnswer(username, securityAnswer);
      if (valid) {
        setStep(3);
        setToast({ visible: false, message: '', type: 'info' });
      } else {
        setToast({ visible: true, message: 'Resposta incorreta.', type: 'error' });
      }
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao validar resposta.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setToast({
        visible: true,
        message: 'A senha deve ter no minimo 6 caracteres.',
        type: 'warning',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ visible: true, message: 'As senhas nao conferem.', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await updatePasswordByUsername(username, newPassword);
      setToast({
        visible: true,
        message: 'Senha alterada com sucesso!',
        type: 'success',
      });
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setToast({ visible: true, message: 'Erro ao atualizar senha.', type: 'error' });
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
        <Text style={styles.title}>Recuperar Senha</Text>
      </View>

      <Surface style={styles.card}>
        <View style={styles.form}>
          {step === 1 && (
            <>
              <Text style={styles.instruction}>
                Informe seu nome de usuario para continuar.
              </Text>
              <View style={styles.field}>
                <Input
                  label="Usuario"
                  placeholder="Ex: admin"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
              <Button
                title={loading ? 'Buscando...' : 'Continuar'}
                onPress={handleFindUser}
                style={styles.submit}
                disabled={loading}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.instruction}>Responda a pergunta de seguranca.</Text>
              <Text style={styles.question}>&quot;{securityQuestion}&quot;</Text>
              <View style={styles.field}>
                <Input
                  label="Resposta"
                  placeholder="Sua resposta"
                  secureTextEntry
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                />
              </View>
              <Button
                title={loading ? 'Verificando...' : 'Verificar'}
                onPress={handleVerifyAnswer}
                style={styles.submit}
                disabled={loading}
              />
              <Button
                title="Voltar"
                variant="outline"
                onPress={() => setStep(1)}
                style={styles.backButton}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.instruction}>Defina sua nova senha.</Text>
              <View style={styles.field}>
                <Input
                  label="Nova Senha"
                  placeholder="Minimo 6 caracteres"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
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
              <Button
                title={loading ? 'Salvando...' : 'Redefinir Senha'}
                onPress={handleResetPassword}
                style={styles.submit}
                disabled={loading}
              />
            </>
          )}
        </View>
      </Surface>

      {step === 1 && (
        <Button
          title="Voltar para Login"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.backLink}
        />
      )}
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
  instruction: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: spacing.sm,
  },
  backLink: {
    marginTop: spacing.lg,
  },
});
