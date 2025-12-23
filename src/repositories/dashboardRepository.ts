import { query } from '@/db';

export async function countAreas(): Promise<number> {
  const result = await query('SELECT COUNT(*) as total FROM areas');
  const total = result.rows.item(0)?.total as number | undefined;
  return total ?? 0;
}

export async function countAssets(): Promise<number> {
  const result = await query('SELECT COUNT(*) as total FROM asset_items');
  const total = result.rows.item(0)?.total as number | undefined;
  return total ?? 0;
}

export async function countInventories(): Promise<number> {
  const result = await query('SELECT COUNT(*) as total FROM inventories');
  const total = result.rows.item(0)?.total as number | undefined;
  return total ?? 0;
}
