import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getCurrentSchemaVersion, query, runInTransaction } from '@/db';
import { logError } from '@/services/logger';
import { InventoryDiffStatus } from '@/types';

type BackupDeps = {
  runInTransaction: typeof runInTransaction;
  getCurrentSchemaVersion: typeof getCurrentSchemaVersion;
};

let deps: BackupDeps = {
  runInTransaction,
  getCurrentSchemaVersion,
};

export function __setBackupDeps(overrides: Partial<BackupDeps>) {
  deps = { ...deps, ...overrides };
}

type BackupUser = {
  id: number;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  createdAt: number;
};

type BackupArea = {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: number;
};

type BackupAsset = {
  id: number;
  assetNumber: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitValue?: number | null;
  areaId: number;
  createdAt: number;
  updatedAt: number;
};

type BackupSequence = {
  name: string;
  value: number;
};

type BackupInventory = {
  id: number;
  name: string;
  scopeType: 'ALL' | 'AREA';
  areaId?: number | null;
  status: 'open' | 'finished';
  createdAt: number;
  finishedAt?: number | null;
};

type BackupInventorySnapshot = {
  id: number;
  inventoryId: number;
  assetId: number;
  assetNumber: string;
  assetName: string;
  areaId: number;
  quantity: number;
  createdAt: number;
};

type BackupInventoryRead = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  assetName: string;
  areaId?: number | null;
  isNewItem: boolean;
  quantity: number;
  createdAt: number;
};

type BackupInventoryDiff = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  assetName: string;
  areaId?: number | null;
  l0Quantity: number;
  l1Quantity: number;
  l2Quantity?: number | null;
  finalQuantity?: number | null;
  resolutionChoice?: 'L1' | 'L2' | 'IGNORE' | null;
  resolutionNote?: string | null;
  status: InventoryDiffStatus;
  createdAt: number;
};

type BackupAdjustmentLog = {
  id: number;
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  beforeQty?: number | null;
  afterQty?: number | null;
  decision: string;
  note?: string | null;
  userId?: number | null;
  createdAt: number;
};

type BackupData = {
  users: BackupUser[];
  areas: BackupArea[];
  assets: BackupAsset[];
  sequences: BackupSequence[];
  inventories?: BackupInventory[];
  inventorySnapshots?: BackupInventorySnapshot[];
  inventoryReads?: BackupInventoryRead[];
  inventoryDiffs?: BackupInventoryDiff[];
  adjustmentLogs?: BackupAdjustmentLog[];
};

export type BackupFile = {
  type: 'patrimonio-simples-backup';
  schemaVersion: number;
  generatedAt: number;
  checksum: string;
  data: BackupData;
};

const BACKUP_TYPE = 'patrimonio-simples-backup';
const ASSET_SEQUENCE_NAME = 'asset_number';

async function checksumData(data: BackupData) {
  const serialized = JSON.stringify(data);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, serialized);
}

function normalizeData(data: BackupData): BackupData {
  return {
    users: data.users ?? [],
    areas: data.areas ?? [],
    assets: data.assets ?? [],
    sequences: data.sequences ?? [],
    inventories: data.inventories ?? [],
    inventorySnapshots: data.inventorySnapshots ?? [],
    inventoryReads: data.inventoryReads ?? [],
    inventoryDiffs: data.inventoryDiffs ?? [],
    adjustmentLogs: data.adjustmentLogs ?? [],
  };
}

function normalizeAssetSequence(data: BackupData): BackupSequence[] {
  const current =
    data.sequences.find((seq) => seq.name === ASSET_SEQUENCE_NAME)?.value ?? 0;
  const maxFromAssets = data.assets.reduce((max, item) => {
    const match = item.assetNumber.match(/(\d+)$/);
    if (!match) return max;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) return max;
    return Math.max(max, parsed);
  }, 0);

  const safeValue = Math.max(current, maxFromAssets);
  const withoutAssetSeq = data.sequences.filter(
    (seq) => seq.name !== ASSET_SEQUENCE_NAME,
  );

  return [...withoutAssetSeq, { name: ASSET_SEQUENCE_NAME, value: safeValue }];
}

async function fetchBackupData(): Promise<BackupData> {
  const [
    usersResult,
    areasResult,
    assetsResult,
    sequencesResult,
    inventoriesResult,
    snapshotResult,
    readResult,
    diffResult,
    adjustmentResult,
  ] = await Promise.all([
    query(
      'SELECT id, username, password_hash, password_salt, must_change_password, created_at FROM users',
    ),
    query('SELECT id, name, description, active, created_at FROM areas'),
    query(
      'SELECT id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at FROM asset_items',
    ),
    query('SELECT name, value FROM sequences'),
    query(
      'SELECT id, name, scope_type, area_id, status, created_at, finished_at FROM inventories',
    ),
    query(
      'SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at FROM inventory_snapshot_items',
    ),
    query(
      'SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at FROM inventory_read_items',
    ),
    query(
      'SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at FROM inventory_diff',
    ),
    query(
      'SELECT id, inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at FROM inventory_adjustment_log',
    ),
  ]);

  return {
    users: usersResult.rows._array.map((row) => ({
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      mustChangePassword: Boolean(row.must_change_password),
      createdAt: row.created_at,
    })),
    areas: areasResult.rows._array.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      active: Boolean(row.active ?? 1),
      createdAt: row.created_at,
    })),
    assets: assetsResult.rows._array.map((row) => ({
      id: row.id,
      assetNumber: row.asset_number,
      name: row.name,
      description: row.description,
      quantity: row.quantity ?? 0,
      unitValue: row.unit_value,
      areaId: row.area_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    })),
    sequences: sequencesResult.rows._array.map((row) => ({
      name: row.name,
      value: row.value,
    })),
    inventories: inventoriesResult.rows._array.map((row) => ({
      id: row.id,
      name: row.name,
      scopeType: row.scope_type,
      areaId: row.area_id,
      status: row.status,
      createdAt: row.created_at,
      finishedAt: row.finished_at,
    })),
    inventorySnapshots: snapshotResult.rows._array.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      assetId: row.asset_id,
      assetNumber: row.asset_number,
      assetName: row.asset_name,
      areaId: row.area_id,
      quantity: row.quantity ?? 0,
      createdAt: row.created_at,
    })),
    inventoryReads: readResult.rows._array.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      assetId: row.asset_id,
      assetNumber: row.asset_number,
      assetName: row.asset_name,
      areaId: row.area_id,
      isNewItem: Boolean(row.is_new_item),
      quantity: row.quantity ?? 0,
      createdAt: row.created_at,
    })),
    inventoryDiffs: diffResult.rows._array.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      assetId: row.asset_id,
      assetNumber: row.asset_number,
      assetName: row.asset_name,
      areaId: row.area_id,
      l0Quantity: row.l0_quantity ?? 0,
      l1Quantity: row.l1_quantity ?? 0,
      l2Quantity: row.l2_quantity ?? 0,
      finalQuantity: row.final_quantity ?? null,
      resolutionChoice: row.resolution_choice,
      resolutionNote: row.resolution_note,
      status: row.status,
      createdAt: row.created_at,
    })),
    adjustmentLogs: adjustmentResult.rows._array.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      assetId: row.asset_id,
      assetNumber: row.asset_number,
      beforeQty: row.before_qty,
      afterQty: row.after_qty,
      decision: row.decision,
      note: row.note,
      userId: row.user_id,
      createdAt: row.created_at,
    })),
  };
}

export async function createBackupFile() {
  try {
    const [schemaVersion, data] = await Promise.all([
      deps.getCurrentSchemaVersion(),
      fetchBackupData(),
    ]);

    const normalized = normalizeData(data);
    const payload: BackupFile = {
      type: BACKUP_TYPE,
      schemaVersion,
      generatedAt: Date.now(),
      checksum: await checksumData(normalized),
      data: normalized,
    };

    const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
    if (!dir) {
      throw new Error('Nao foi possivel acessar armazenamento local.');
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const fileName = `backup-${stamp}.json`;
    const uri = `${dir}${fileName}`;

    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Exportar backup',
      mimeType: 'application/json',
    });

    return { uri, fileName };
  } catch (error) {
    await logError('backup_export_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  const uri = result.assets?.[0]?.uri;
  if (!uri) {
    throw new Error('Arquivo selecionado esta invalido.');
  }

  return readBackupFromUri(uri);
}

export async function readBackupFromUri(uri: string): Promise<BackupFile> {
  try {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(content) as BackupFile;
    if (!parsed || parsed.type !== BACKUP_TYPE) {
      throw new Error('Arquivo de backup nao reconhecido.');
    }
    if (!parsed.data) {
      throw new Error('Estrutura do backup invalida.');
    }

    const normalized = normalizeData(parsed.data);
    const computedChecksum = await checksumData(normalized);
    if (computedChecksum !== parsed.checksum) {
      throw new Error('Checksum invalido: arquivo corrompido ou alterado.');
    }

    return {
      ...parsed,
      data: normalized,
    };
  } catch (error) {
    await logError('backup_read_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error('Nao foi possivel ler o arquivo.');
  }
}

export async function restoreBackup(backup: BackupFile) {
  const normalized = normalizeData(backup.data);
  const sequences = normalizeAssetSequence(normalized);
  const currentVersion = await deps.getCurrentSchemaVersion();

  if (backup.schemaVersion > currentVersion) {
    throw new Error(
      'Backup criado com versao de schema mais nova. Atualize o app antes de restaurar.',
    );
  }

  try {
    await deps.runInTransaction((tx) => {
      tx.executeSql('DELETE FROM asset_items');
      tx.executeSql('DELETE FROM areas');
      tx.executeSql('DELETE FROM users');
      tx.executeSql('DELETE FROM sequences');
      tx.executeSql('DELETE FROM app_log');
      tx.executeSql('DELETE FROM inventory_read_items');
      tx.executeSql('DELETE FROM inventory_snapshot_items');
      tx.executeSql('DELETE FROM inventory_diff');
      tx.executeSql('DELETE FROM inventory_adjustment_log');
      tx.executeSql('DELETE FROM inventories');
      tx.executeSql('DELETE FROM schema_version');

      normalized.users.forEach((user) => {
        tx.executeSql(
          `INSERT INTO users (id, username, password_hash, password_salt, must_change_password, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.username,
            user.passwordHash,
            user.passwordSalt,
            user.mustChangePassword ? 1 : 0,
            user.createdAt,
          ],
        );
      });

      normalized.areas.forEach((area) => {
        tx.executeSql(
          'INSERT INTO areas (id, name, description, active, created_at) VALUES (?, ?, ?, ?, ?)',
          [
            area.id,
            area.name,
            area.description ?? null,
            area.active ? 1 : 0,
            area.createdAt,
          ],
        );
      });

      normalized.assets.forEach((asset) => {
        tx.executeSql(
          `INSERT INTO asset_items (id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            asset.id,
            asset.assetNumber,
            asset.name,
            asset.description ?? null,
            asset.quantity ?? 0,
            asset.unitValue ?? null,
            asset.areaId,
            asset.createdAt,
            asset.updatedAt ?? asset.createdAt,
          ],
        );
      });

      sequences.forEach((seq) => {
        tx.executeSql('INSERT INTO sequences (name, value) VALUES (?, ?)', [
          seq.name,
          seq.value,
        ]);
      });

      normalized.inventories.forEach((inv) => {
        tx.executeSql(
          `INSERT INTO inventories (id, name, scope_type, area_id, status, created_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            inv.id,
            inv.name,
            inv.scopeType,
            inv.areaId ?? null,
            inv.status,
            inv.createdAt,
            inv.finishedAt ?? null,
          ],
        );
      });

      normalized.inventorySnapshots.forEach((snap) => {
        tx.executeSql(
          `INSERT INTO inventory_snapshot_items (id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            snap.id,
            snap.inventoryId,
            snap.assetId,
            snap.assetNumber,
            snap.assetName,
            snap.areaId,
            snap.quantity ?? 0,
            snap.createdAt,
          ],
        );
      });

      normalized.inventoryReads.forEach((read) => {
        tx.executeSql(
          `INSERT INTO inventory_read_items (id, inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            read.id,
            read.inventoryId,
            read.assetId ?? null,
            read.assetNumber ?? null,
            read.assetName,
            read.areaId ?? null,
            read.isNewItem ? 1 : 0,
            read.quantity ?? 0,
            read.createdAt,
          ],
        );
      });

      normalized.inventoryDiffs.forEach((diff) => {
        tx.executeSql(
          `INSERT INTO inventory_diff (id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            diff.id,
            diff.inventoryId,
            diff.assetId ?? null,
            diff.assetNumber ?? null,
            diff.assetName,
            diff.areaId ?? null,
            diff.l0Quantity ?? 0,
            diff.l1Quantity ?? 0,
            diff.l2Quantity ?? 0,
            diff.finalQuantity ?? null,
            diff.resolutionChoice ?? null,
            diff.resolutionNote ?? null,
            diff.status,
            diff.createdAt ?? Date.now(),
          ],
        );
      });

      normalized.adjustmentLogs?.forEach((log) => {
        tx.executeSql(
          `INSERT INTO inventory_adjustment_log (id, inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.inventoryId,
            log.assetId ?? null,
            log.assetNumber ?? null,
            log.beforeQty ?? null,
            log.afterQty ?? null,
            log.decision,
            log.note ?? null,
            log.userId ?? null,
            log.createdAt ?? Date.now(),
          ],
        );
      });

      tx.executeSql('INSERT INTO schema_version (version) VALUES (?)', [currentVersion]);
    });
  } catch (error) {
    await logError('backup_restore_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
