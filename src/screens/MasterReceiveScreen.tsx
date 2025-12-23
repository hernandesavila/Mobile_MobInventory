import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import TcpSocket from 'react-native-tcp-socket';

import { AlertBanner, Button, Screen, Surface } from '@/components';
import { RootStackNavigationProp } from '@/navigation/types';
import { listAllAreas } from '@/repositories/areaRepository';
import {
  listReceivedBatches,
  saveReceivedBatch,
  SyncBatch,
} from '@/repositories/syncRepository';
import { colors, spacing } from '@/theme';

export function MasterReceiveScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [serverRunning, setServerRunning] = useState(false);
  const [ip, setIp] = useState<string | null>(null);
  const [port] = useState(8080);
  const [pin, setPin] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverRef = useRef<any>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [receivedBatches, setReceivedBatches] = useState<SyncBatch[]>([]);
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
    (async () => {
      const ipAddress = await Network.getIpAddressAsync();
      setIp(ipAddress);
      loadBatches();
    })();

    return () => {
      if (serverRef.current) {
        serverRef.current.close();
      }
    };
  }, []);

  const loadBatches = async () => {
    const batches = await listReceivedBatches();
    setReceivedBatches(batches);
  };

  const addLog = (msg: string) => {
    setLogs((prev) =>
      [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20),
    );
  };

  const getDeviceId = async () => {
    if (Platform.OS === 'android') {
      return Application.androidId;
    } else if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync();
    }
    return 'unknown-device';
  };

  const startServer = async () => {
    if (!ip) {
      setToast({ visible: true, message: 'IP não identificado.', type: 'error' });
      return;
    }

    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);

    try {
      const deviceId = await getDeviceId();
      const newServer = TcpSocket.createServer((socket) => {
        socket.on('data', async (data) => {
          const message = data.toString();

          // Helper to check PIN
          const checkPin = (msg: string) => {
            const lines = msg.split('\r\n');
            const pinHeader = lines.find((l) =>
              l.toLowerCase().startsWith('x-mobinv-pin:'),
            );
            if (!pinHeader) return false;
            const receivedPin = pinHeader.split(':')[1].trim();
            return receivedPin === newPin;
          };

          if (message.startsWith('GET /ping')) {
            // Ping might be open or protected. Let's keep it open for discovery,
            // but maybe indicate if PIN is required?
            // For now, let's protect it too to ensure full pairing security as requested "Coletor deve informar PIN antes de conectar"
            // But usually ping is for discovery. Let's protect it.

            if (!checkPin(message)) {
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.end();
              return;
            }

            setConnectionCount((c) => c + 1);
            addLog(`Ping recebido de ${socket.remoteAddress}`);

            const responseBody = JSON.stringify({
              name: 'Mob Inventory',
              version: Constants.expoConfig?.version ?? '1.0.0',
              deviceId: deviceId,
              serverTime: new Date().toISOString(),
            });

            const response =
              'HTTP/1.1 200 OK\r\n' +
              'Content-Type: application/json\r\n' +
              `Content-Length: ${responseBody.length}\r\n` +
              '\r\n' +
              responseBody;

            socket.write(response);
            socket.end();
          } else if (message.startsWith('POST /sync/batch')) {
            if (!checkPin(message)) {
              addLog(`Tentativa não autorizada de ${socket.remoteAddress}`);
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.end();
              return;
            }

            addLog(`Recebendo lote de ${socket.remoteAddress}...`);

            // Simple body extraction (assuming small payload for now or single packet)
            // In a real scenario, we need to buffer until Content-Length is met.
            const bodyIndex = message.indexOf('\r\n\r\n');
            let body = '';
            if (bodyIndex !== -1) {
              body = message.substring(bodyIndex + 4);
            }

            try {
              const payload = JSON.parse(body);
              if (!payload.collectorId || !payload.items) {
                throw new Error('Payload inválido');
              }

              const batchId = await saveReceivedBatch(payload);
              addLog(`Lote recebido! ID: ${batchId.substring(0, 8)}...`);
              setToast({
                visible: true,
                message: 'Novo lote recebido!',
                type: 'success',
              });
              loadBatches();

              const responseBody = JSON.stringify({ batchId, status: 'received' });
              const response =
                'HTTP/1.1 200 OK\r\n' +
                'Content-Type: application/json\r\n' +
                `Content-Length: ${responseBody.length}\r\n` +
                '\r\n' +
                responseBody;
              socket.write(response);
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Erro desconhecido';
              addLog(`Erro ao processar lote: ${msg}`);
              socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            }
            socket.end();
          } else if (message.startsWith('GET /areas')) {
            if (!checkPin(message)) {
              addLog(`Tentativa não autorizada de ${socket.remoteAddress}`);
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.end();
              return;
            }

            addLog(`Solicitação de áreas de ${socket.remoteAddress}`);
            try {
              const areas = await listAllAreas();
              const responseBody = JSON.stringify(areas);

              const response =
                'HTTP/1.1 200 OK\r\n' +
                'Content-Type: application/json\r\n' +
                `Content-Length: ${responseBody.length}\r\n` +
                '\r\n' +
                responseBody;

              socket.write(response);
            } catch (e) {
              addLog('Erro ao listar áreas');
              socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            }
            socket.end();
          } else {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.end();
          }
        });

        socket.on('error', (error) => {
          addLog(`Erro no socket: ${error.message}`);
        });
      });

      newServer.listen({ port, host: '0.0.0.0' }, () => {
        setServerRunning(true);
        serverRef.current = newServer;
        addLog(`Servidor iniciado em ${ip}:${port}`);
        setToast({ visible: true, message: 'Recepção iniciada.', type: 'success' });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newServer.on('error', (error: any) => {
        setServerRunning(false);
        serverRef.current = null;
        addLog(`Erro no servidor: ${error.message}`);
        setToast({ visible: true, message: 'Erro ao iniciar servidor.', type: 'error' });
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setToast({ visible: true, message: `Falha: ${msg}`, type: 'error' });
    }
  };

  const stopServer = () => {
    if (serverRef.current) {
      serverRef.current.close();
      serverRef.current = null;
      setServerRunning(false);
      addLog('Servidor parado.');
      setToast({ visible: true, message: 'Recepção parada.', type: 'warning' });
    }
  };

  const serverUrl = `http://${ip}:${port}`;

  return (
    <Screen>
      <AlertBanner
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {serverRunning ? 'Recepção ativa' : 'Recepção inativa'}
        </Text>
      </View>

      <Surface style={styles.card}>
        {serverRunning && ip ? (
          <View style={styles.qrContainer}>
            <QRCode value={serverUrl} size={200} />
            <Text style={styles.urlText}>{serverUrl}</Text>
            {pin ? (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: '#666' }}>PIN de Pareamento:</Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#333',
                    letterSpacing: 4,
                  }}
                >
                  {pin}
                </Text>
              </View>
            ) : null}
            <Text style={styles.infoText}>
              Escaneie este QR Code no dispositivo Coletor
            </Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Inicie a recepção para gerar o QR Code
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{connectionCount}</Text>
            <Text style={styles.statLabel}>Pings Recebidos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{port}</Text>
            <Text style={styles.statLabel}>Porta</Text>
          </View>
        </View>

        <Button
          title={serverRunning ? 'Parar Recepção' : 'Iniciar Recepção'}
          variant={serverRunning ? 'danger' : 'primary'}
          onPress={serverRunning ? stopServer : startServer}
          style={styles.actionButton}
        />
      </Surface>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Logs de Conexão</Text>
        <ScrollView style={styles.logsScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>

      <View style={styles.batchesContainer}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={styles.logsTitle}>Lotes Recebidos</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MasterBatchList')}>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Ver Todos</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 200 }}>
          {receivedBatches.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum lote recebido ainda.</Text>
          ) : (
            receivedBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={styles.batchItem}
                onPress={() =>
                  navigation.navigate('MasterBatchDetail', { batchId: batch.id })
                }
              >
                <View>
                  <Text style={styles.batchCollector}>
                    {batch.collector_name || 'Desconhecido'}
                  </Text>
                  <Text style={styles.batchDate}>
                    {new Date(batch.received_at).toLocaleString()}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.batchCount}>{batch.item_count} itens</Text>
                  <Text style={styles.batchStatus}>{batch.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  urlText: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  infoText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  placeholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
    width: '100%',
    borderRadius: 8,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionButton: {
    width: '100%',
  },
  logsContainer: {
    flex: 1,
    marginTop: spacing.lg,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  logsScroll: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    maxHeight: 150,
  },
  batchesContainer: {
    flex: 1,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
  },
  logItem: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  batchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  batchCollector: {
    fontWeight: 'bold',
    color: colors.text,
  },
  batchDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  batchCount: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  batchStatus: {
    fontSize: 10,
    color: colors.success,
  },
});
