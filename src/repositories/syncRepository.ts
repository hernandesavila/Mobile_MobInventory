import * as Crypto from 'expo-crypto';

import { execute, query } from '@/db';

export interface SyncBatch {
  id: string;
  collector_id: string;
  collector_name: string;
  received_at: number;
  item_count: number;
  status: 'PENDING' | 'RECEIVED' | 'ERROR' | 'APPROVED' | 'REJECTED';
  checksum?: string;
}

export interface SyncBatchItem {
  id?: number;
  batch_id?: string;
  tempId: string;
  areaIdFromMaster: number;
  areaName: string;
  assetName: string;
  patrimonyNumber?: string;
  description?: string;
  quantity: number;
  unitValue?: number;
  createdAt: number;
}

export interface SyncPayload {
  collectorId: string;
  collectorName: string;
  deviceInfo?: string;
  startedAt: number;
  finishedAt?: number;
  items: SyncBatchItem[];
}

export async function saveReceivedBatch(payload: SyncPayload): Promise<string> {
  const batchId = Crypto.randomUUID();
  const receivedAt = Date.now();
  const itemCount = payload.items.length;

  // Start transaction logic manually or just sequential awaits since we don't have a transaction object exposed easily
  // Ideally this should be in a transaction.

  await execute(
    `INSERT INTO sync_batches (id, collector_id, collector_name, received_at, item_count, status)
     VALUES (?, ?, ?, ?, ?, 'RECEIVED')`,
    [batchId, payload.collectorId, payload.collectorName, receivedAt, itemCount],
  );

  for (const item of payload.items) {
    await execute(
      `INSERT INTO sync_batch_items (
        batch_id, temp_id, area_id_from_master, area_name, asset_name, 
        patrimony_number, description, quantity, unit_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batchId,
        item.tempId,
        item.areaIdFromMaster,
        item.areaName,
        item.assetName,
        item.patrimonyNumber ?? null,
        item.description ?? null,
        item.quantity,
        item.unitValue ?? null,
        item.createdAt,
      ],
    );
  }

  await logSyncEvent('BATCH_RECEIVED', {
    batchId,
    collectorId: payload.collectorId,
    itemCount,
  });

  return batchId;
}

export async function getBatchById(batchId: string): Promise<SyncBatch | null> {
  const result = await query('SELECT * FROM sync_batches WHERE id = ?', [batchId]);
  if (result.rows.length === 0) return null;
  const row = result.rows.item(0);
  return {
    id: row.id,
    collector_id: row.collector_id,
    collector_name: row.collector_name,
    received_at: row.received_at,
    item_count: row.item_count,
    status: row.status,
    checksum: row.checksum,
  };
}

export async function getBatchItems(batchId: string): Promise<SyncBatchItem[]> {
  const result = await query('SELECT * FROM sync_batch_items WHERE batch_id = ?', [
    batchId,
  ]);
  // @ts-expect-error _array exists in expo-sqlite result sets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.rows._array.map((row: any) => ({
    id: row.id,
    batch_id: row.batch_id,
    tempId: row.temp_id,
    areaIdFromMaster: row.area_id_from_master,
    areaName: row.area_name,
    assetName: row.asset_name,
    patrimonyNumber: row.patrimony_number,
    description: row.description,
    quantity: row.quantity,
    unitValue: row.unit_value,
    createdAt: row.created_at,
  }));
}

export async function listReceivedBatches(): Promise<SyncBatch[]> {
  const result = await query(
    'SELECT * FROM sync_batches ORDER BY received_at DESC LIMIT 50',
  );
  // @ts-expect-error _array exists in expo-sqlite result sets
  return result.rows._array;
}

export async function logSyncEvent(eventType: string, payload: object): Promise<void> {
  const eventId = Crypto.randomUUID();
  const createdAt = Date.now();
  const payloadStr = JSON.stringify(payload);
  // Extract batchId or collectorId if present in payload for easier querying, but for now just dump json
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchId = (payload as any).batchId || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collectorId = (payload as any).collectorId || null;

  await execute(
    `INSERT INTO sync_event_log (event_id, event_type, batch_id, collector_id, created_at, payload)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [eventId, eventType, batchId, collectorId, createdAt, payloadStr],
  );
}

export async function updateBatchStatus(batchId: string, status: string) {
  await execute('UPDATE sync_batches SET status = ? WHERE id = ?', [status, batchId]);
}

export async function applyBatchItem(
  batchId: string,
  item: SyncBatchItem,
  userId?: number,
) {
  const now = Date.now();
  let actionType = 'SKIPPED';
  let assetId: number | null = null;
  let beforeQty: number | null = null;
  let afterQty: number | null = null;

  // Check if asset exists by patrimony number
  if (item.patrimonyNumber) {
    const existing = await query(
      'SELECT id, quantity FROM asset_items WHERE asset_number = ?',
      [item.patrimonyNumber],
    );

    if (existing.rows.length > 0) {
      // Update existing
      const row = existing.rows.item(0);
      assetId = row.id;
      beforeQty = row.quantity;
      afterQty = (beforeQty || 0) + item.quantity; // Add quantity? Or replace? Usually inventory adds up or confirms. Let's assume add for now or just update fields.
      // If it's a "collection", maybe we are just confirming existence.
      // But if we want to "apply", maybe we update description if provided.

      // Let's just update description if provided and not empty, and maybe update quantity if it makes sense.
      // For now, let's assume we just update the description if it's different.

      await execute(
        'UPDATE asset_items SET description = COALESCE(?, description), updated_at = ? WHERE id = ?',
        [item.description || null, now, assetId],
      );
      actionType = 'UPDATED';
    } else {
      // Create new
      const result = await execute(
        `INSERT INTO asset_items (asset_number, name, description, unit_value, area_id, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.patrimonyNumber,
          item.assetName,
          item.description || null,
          item.unitValue || 0,
          item.areaIdFromMaster, // Assuming area ID is valid on master. If area was deleted on master, this might fail or need handling.
          item.quantity,
          now,
          now,
        ],
      );
      assetId = result.insertId!;
      beforeQty = 0;
      afterQty = item.quantity;
      actionType = 'CREATED';
    }
  } else {
    // No patrimony number. Create new with NULL asset_number?
    // Or generate one?
    // Let's create with NULL asset_number for now as schema allows it.
    const result = await execute(
      `INSERT INTO asset_items (asset_number, name, description, unit_value, area_id, quantity, created_at, updated_at)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.assetName,
        item.description || null,
        item.unitValue || 0,
        item.areaIdFromMaster,
        item.quantity,
        now,
        now,
      ],
    );
    assetId = result.insertId!;
    beforeQty = 0;
    afterQty = item.quantity;
    actionType = 'CREATED_NO_NUMBER';
  }

  // Log
  await execute(
    `INSERT INTO asset_import_log (
      batch_id, collector_id, asset_id, asset_number, action_type, 
      before_qty, after_qty, applied_at, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchId,
      null, // We need collector_id passed or fetched.
      assetId,
      item.patrimonyNumber || null,
      actionType,
      beforeQty,
      afterQty,
      now,
      userId || null,
    ],
  );
}
