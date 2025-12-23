import { useNavigation } from '@react-navigation/native';
import { BarCodeScanningResult, Camera } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button, Input, Screen, Surface } from '@/components';
import {
  addBatchItem,
  CachedArea,
  getOpenBatch,
  listCachedAreas,
} from '@/repositories/collectorRepository';
import { colors, spacing } from '@/theme';

export function CollectorScanScreen() {
  const navigation = useNavigation();
  const [areas, setAreas] = useState<CachedArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<CachedArea | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    loadAreas();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const loadAreas = async () => {
    const list = await listCachedAreas();
    setAreas(list);
    if (list.length > 0) {
      setSelectedArea(list[0]);
    }
  };

  const handleBarCodeScanned = ({ data }: BarCodeScanningResult) => {
    setScanned(true);
    setShowCamera(false);
    setCode(data);
    // Reset description if needed, or keep it?
    // setDescription('');
  };

  const handleSave = async () => {
    if (!selectedArea) {
      Alert.alert('Erro', 'Selecione uma área.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Erro', 'Informe o código do patrimônio.');
      return;
    }

    try {
      const batch = await getOpenBatch();
      if (!batch) {
        Alert.alert('Erro', 'Nenhum lote aberto encontrado.');
        return;
      }

      await addBatchItem({
        batch_id: batch.id,
        temp_id: Crypto.randomUUID(),
        master_area_id: selectedArea.master_area_id,
        area_name: selectedArea.name,
        asset_name: description || `Item ${code}`,
        patrimony_number: code,
        description: description,
        quantity: parseInt(quantity, 10) || 1,
        created_at: Date.now(),
      });

      Alert.alert('Sucesso', 'Item salvo!');
      setCode('');
      setDescription('');
      setQuantity('1');
      setScanned(false);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar item.');
    }
  };

  const renderAreaItem = ({ item }: { item: CachedArea }) => (
    <TouchableOpacity
      style={styles.areaItem}
      onPress={() => {
        setSelectedArea(item);
        setModalVisible(false);
      }}
    >
      <Text style={styles.areaItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen style={styles.container}>
      <Surface style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{'< Voltar'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coleta</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.label}>Área Selecionada:</Text>
        <TouchableOpacity
          style={styles.areaSelector}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.areaSelectorText}>
            {selectedArea ? selectedArea.name : 'Selecione uma área'}
          </Text>
        </TouchableOpacity>
      </Surface>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Input
            label="Código / Patrimônio"
            value={code}
            onChangeText={setCode}
            placeholder="Digite ou escaneie"
          />
          <Button
            title="Scan"
            onPress={() => {
              setScanned(false);
              setShowCamera(true);
            }}
            variant="outline"
            style={styles.scanButton}
          />
        </View>

        <Input
          label="Descrição (Opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Nome do item"
        />

        <Input
          label="Quantidade"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <Button
          title="Salvar Item"
          onPress={handleSave}
          variant="primary"
          style={styles.saveButton}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Área</Text>
            <FlatList
              data={areas}
              renderItem={renderAreaItem}
              keyExtractor={(item) => item.id.toString()}
            />
            <Button
              title="Cancelar"
              onPress={() => setModalVisible(false)}
              variant="ghost"
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          {hasPermission === null ? (
            <Text>Solicitando permissão de câmera...</Text>
          ) : hasPermission === false ? (
            <Text>Sem acesso à câmera</Text>
          ) : (
            <Camera
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <Button
            title="Fechar"
            onPress={() => setShowCamera(false)}
            style={styles.closeCameraButton}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  areaSelector: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  areaSelectorText: {
    fontSize: 16,
    color: colors.text,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  scanButton: {
    marginBottom: 2, // Align with input
    width: 80,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  areaItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  areaItemText: {
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  closeCameraButton: {
    marginBottom: spacing.xl,
  },
});
