import { execute, query } from '@/db';

export interface CachedArea {
  id: number;
  master_area_id: number;
  name: string;
  description?: string;
  updated_at?: number;
}

export interface CollectorBatch {
  id: number;
  collector_id: string;
  collector_name: string;
  master_base_url: string;
  started_at: number;
  finished_at?: number;
  status: 'open' | 'finished';
}

export interface CollectorBatchItem {
  id: number;
  batch_id: number;
  temp_id: string;
  master_area_id: number;
  area_name: string;
  asset_name: string;
  patrimony_number?: string;
  description?: string;
  quantity: number;
  unit_value?: number;
  created_at: number;
}

export async function saveCachedAreas(
  areas: {
    id: number;
    name: string;
    description?: string;
    updatedAt?: string | number;
    createdAt?: number;
  }[],
) {
  await execute('DELETE FROM collector_cached_areas');
  for (const area of areas) {
    const updatedAt = area.updatedAt
      ? new Date(area.updatedAt).getTime()
      : area.createdAt || Date.now();
    await execute(
      `INSERT INTO collector_cached_areas (master_area_id, name, description, updated_at)
       VALUES (?, ?, ?, ?)`,
      [area.id, area.name, area.description, updatedAt],
    );
  }
}

export async function listCachedAreas(): Promise<CachedArea[]> {
  const result = await query('SELECT * FROM collector_cached_areas ORDER BY name ASC');
  // @ts-expect-error _array exists in expo-sqlite result sets
  return result.rows._array;
}

export async function createBatch(
  collectorId: string,
  collectorName: string,
  masterBaseUrl: string,
): Promise<number> {
  const result = await execute(
    `INSERT INTO collector_batches (collector_id, collector_name, master_base_url, started_at, status)
     VALUES (?, ?, ?, ?, 'open')`,
    [collectorId, collectorName, masterBaseUrl, Date.now()],
  );
  return result.insertId!;
}

export async function getOpenBatch(): Promise<CollectorBatch | null> {
  const result = await query(
    "SELECT * FROM collector_batches WHERE status = 'open' LIMIT 1",
  );
  // @ts-expect-error item exists in expo-sqlite result sets
  return result.rows.length > 0 ? result.rows.item(0) : null;
}

export async function finishBatch(batchId: number) {
  await execute(
    "UPDATE collector_batches SET status = 'finished', finished_at = ? WHERE id = ?",
    [Date.now(), batchId],
  );
}

export async function updateBatchStatus(batchId: number, status: string) {
  await execute('UPDATE collector_batches SET status = ? WHERE id = ?', [
    status,
    batchId,
  ]);
}

export async function getBatchItems(batchId: number): Promise<CollectorBatchItem[]> {
  const result = await query('SELECT * FROM collector_batch_items WHERE batch_id = ?', [
    batchId,
  ]);
  // @ts-expect-error _array exists in expo-sqlite result sets
  return result.rows._array;
}

export async function addBatchItem(item: Omit<CollectorBatchItem, 'id'>) {
  await execute(
    `INSERT INTO collector_batch_items (
      batch_id, temp_id, master_area_id, area_name, asset_name, 
      patrimony_number, description, quantity, unit_value, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.batch_id,
      item.temp_id,
      item.master_area_id,
      item.area_name,
      item.asset_name,
      item.patrimony_number ?? null,
      item.description ?? null,
      item.quantity,
      item.unit_value ?? null,
      item.created_at,
    ],
  );
}

export async function countBatchItems(batchId: number): Promise<number> {
  const result = await query(
    'SELECT COUNT(*) as count FROM collector_batch_items WHERE batch_id = ?',
    [batchId],
  );
  return result.rows.item(0).count;
}
