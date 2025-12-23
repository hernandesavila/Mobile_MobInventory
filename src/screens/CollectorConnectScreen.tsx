import { useNavigation } from '@react-navigation/native';
import { BarCodeScanningResult, Camera } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AlertBanner, Button, Input, Screen, Surface } from '@/components';
import {
  getMasterBaseUrl,
  getMasterPin,
  logCollectorEvent,
  setMasterBaseUrl,
  setMasterPin,
  testMasterConnection,
} from '@/services/collector/collectorService';
import { colors, spacing } from '@/theme';

export function CollectorConnectScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8080');
  const [pin, setPin] = useState('');
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
    loadStoredUrl();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const loadStoredUrl = async () => {
    const url = await getMasterBaseUrl();
    if (url) {
      try {
        const match = url.match(/http:\/\/([^:]+):(\d+)/);
        if (match) {
          setIp(match[1]);
          setPort(match[2]);
        }
      } catch (e) {
        // ignore
      }
    }
    const storedPin = await getMasterPin();
    if (storedPin) {
      setPin(storedPin);
    }
  };

  const handleBarCodeScanned = ({ data }: BarCodeScanningResult) => {
    setScanned(true);
    setShowCamera(false);

    if (data.startsWith('http')) {
      try {
        const match = data.match(/http:\/\/([^:]+):(\d+)/);
        if (match) {
          setIp(match[1]);
          setPort(match[2]);
          setToast({
            visible: true,
            message: 'QR Code lido com sucesso!',
            type: 'success',
          });
        } else {
          setToast({
            visible: true,
            message: 'Formato de URL inválido no QR Code.',
            type: 'warning',
          });
        }
      } catch (e) {
        setToast({
          visible: true,
          message: 'Erro ao processar QR Code.',
          type: 'error',
        });
      }
    } else {
      setToast({
        visible: true,
        message: 'QR Code não contém uma URL válida.',
        type: 'warning',
      });
    }
  };

  const buildUrl = () => `http://${ip.trim()}:${port.trim()}`;

  const testConnection = async () => {
    if (!ip.trim() || !port.trim()) {
      setToast({ visible: true, message: 'Informe IP e Porta.', type: 'warning' });
      return false;
    }

    if (!pin.trim()) {
      setToast({ visible: true, message: 'Informe o PIN.', type: 'warning' });
      return false;
    }

    setLoading(true);
    const baseUrl = buildUrl();
    try {
      const success = await testMasterConnection(baseUrl, pin);

      if (success) {
        setToast({
          visible: true,
          message: `Mestre encontrado!`,
          type: 'success',
        });
        return true;
      } else {
        throw new Error(`Falha na conexão ou PIN inválido.`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha na conexão.';
      setToast({ visible: true, message: `Erro: ${msg}`, type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const success = await testConnection();
    if (success) {
      const baseUrl = buildUrl();
      await setMasterBaseUrl(baseUrl);
      await setMasterPin(pin);
      await logCollectorEvent('MASTER_CONNECTED', { baseUrl, timestamp: Date.now() });
      setToast({ visible: true, message: 'Conectado e salvo!', type: 'success' });
      // @ts-expect-error Navigation type mismatch
      navigation.navigate('CollectorAction');
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

      <View style={styles.header}>
        <Text style={styles.title}>Conectar ao Mestre</Text>
        <Text style={styles.subtitle}>Escaneie o QR Code ou digite o IP.</Text>
      </View>

      <Surface style={styles.card}>
        <Button
          title="Ler QR Code"
          onPress={() => {
            setScanned(false);
            setShowCamera(true);
          }}
          style={styles.scanButton}
        />

        <View style={styles.orDivider}>
          <Text style={styles.orText}>OU</Text>
        </View>

        <Input
          label="IP do Mestre"
          placeholder="192.168.1.X"
          value={ip}
          onChangeText={setIp}
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <Input
          label="Porta"
          placeholder="3000"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
        />

        <Input
          label="PIN de Pareamento"
          placeholder="000000"
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          maxLength={6}
        />

        <View style={styles.actions}>
          <Button
            title="Testar"
            variant="outline"
            onPress={() => testConnection()}
            disabled={loading}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Conectar"
            onPress={handleConnect}
            disabled={loading}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </Surface>

      <Button
        title="Voltar"
        variant="ghost"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          {hasPermission === null ? (
            <Text style={styles.cameraText}>Solicitando permissão de câmera...</Text>
          ) : hasPermission === false ? (
            <Text style={styles.cameraText}>Sem acesso à câmera.</Text>
          ) : (
            <Camera
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <TouchableOpacity
            style={styles.closeCameraButton}
            onPress={() => setShowCamera(false)}
          >
            <Text style={styles.closeCameraText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
  },
  scanButton: {
    marginBottom: spacing.md,
  },
  orDivider: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  orText: {
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  backButton: {
    marginTop: spacing.lg,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    color: 'white',
    fontSize: 16,
  },
  closeCameraButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  closeCameraText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
