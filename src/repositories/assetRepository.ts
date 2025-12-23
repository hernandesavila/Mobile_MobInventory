import { execute, query } from '@/db';
import { AssetItem } from '@/types';
import { formatPatrimonyNumber } from '@/utils/patrimony';

type NewAsset = {
  assetNumber?: string;
  name: string;
  description?: string | null;
  unitValue?: number | null;
  areaId: number;
  quantity?: number;
  autoGenerateNumber?: boolean;
  patrimonyFormat?: string;
};

export type AssetFilters = {
  searchName?: string;
  searchNumber?: string;
  areaId?: number | null;
  page: number;
  pageSize: number;
};

const ASSET_SEQUENCE_KEY = 'asset_number';

async function nextSequenceValue(key: string) {
  await execute('INSERT OR IGNORE INTO sequences (name, value) VALUES (?, ?)', [key, 0]);
  const result = await execute('UPDATE sequences SET value = value + 1 WHERE name = ?', [
    key,
  ]);
  if (!result.rowsAffected) {
    throw new Error('Nao foi possivel gerar numero de patrimonio.');
  }

  const row = await query('SELECT value FROM sequences WHERE name = ?', [key]);
  const value = row.rows.item(0)?.value as number | undefined;
  if (!value) {
    throw new Error('Nao foi possivel gerar numero de patrimonio.');
  }
  return value;
}

type AssetRow = {
  id: number;
  asset_number: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_value: number | null;
  area_id: number;
  created_at: number;
  updated_at: number;
};

export async function generateAssetNumberWithFormat(format?: string) {
  const sequence = await nextSequenceValue(ASSET_SEQUENCE_KEY);
  const padded = sequence.toString().padStart(6, '0');
  return formatPatrimonyNumber(Number(sequence), format, padded.length);
}

async function ensureUniqueAssetNumber(assetNumber: string, ignoreId?: number) {
  const result = await query(
    'SELECT id FROM asset_items WHERE asset_number = ? COLLATE NOCASE AND id != ?',
    [assetNumber, ignoreId ?? 0],
  );
  if (result.rows.length > 0) {
    throw new Error('Ja existe um patrimonio com este numero.');
  }
}

function mapAsset(row: AssetRow): AssetItem {
  return {
    id: row.id,
    assetNumber: row.asset_number,
    name: row.name,
    description: row.description,
    quantity: row.quantity ?? 0,
    unitValue: row.unit_value,
    areaId: row.area_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAsset(payload: NewAsset): Promise<AssetItem> {
  if (!payload.name?.trim()) {
    throw new Error('Nome do patrimonio e obrigatorio.');
  }
  if (!payload.areaId) {
    throw new Error('Area e obrigatoria.');
  }
  if (payload.quantity !== undefined && payload.quantity < 0) {
    throw new Error('Quantidade deve ser maior ou igual a zero.');
  }
  if (payload.unitValue !== undefined && payload.unitValue < 0) {
    throw new Error('Valor unitario deve ser maior ou igual a zero.');
  }

  let assetNumber = payload.assetNumber?.trim();
  if (payload.autoGenerateNumber) {
    assetNumber = await generateAssetNumberWithFormat(payload.patrimonyFormat);
  } else if (assetNumber) {
    await ensureUniqueAssetNumber(assetNumber);
  }

  const now = Date.now();
  const result = await execute(
    `INSERT INTO asset_items (asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetNumber,
      payload.name.trim(),
      payload.description ?? null,
      payload.quantity ?? 0,
      payload.unitValue ?? null,
      payload.areaId,
      now,
      now,
    ],
  );

  const insertId = result.insertId ?? 0;
  return {
    id: insertId,
    assetNumber: assetNumber ?? null,
    name: payload.name.trim(),
    description: payload.description ?? null,
    quantity: payload.quantity ?? 0,
    unitValue: payload.unitValue ?? null,
    areaId: payload.areaId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listAssetsPaginated(filters: AssetFilters): Promise<{
  items: AssetItem[];
  total: number;
}> {
  const where: string[] = [];
  const params: (string | number | null)[] = [];

  if (filters.searchName?.trim()) {
    where.push('name LIKE ? COLLATE NOCASE');
    params.push(`%${filters.searchName.trim()}%`);
  }

  if (filters.searchNumber?.trim()) {
    where.push('asset_number LIKE ?');
    params.push(`%${filters.searchNumber.trim()}%`);
  }

  if (filters.areaId) {
    where.push('area_id = ?');
    params.push(filters.areaId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.pageSize;

  const listResult = await query(
    `SELECT id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at
     FROM asset_items
     ${whereClause}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.pageSize, offset],
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM asset_items ${whereClause}`,
    params,
  );
  const total = countResult.rows.item(0)?.total as number | undefined;

  return {
    items: listResult.rows._array.map(mapAsset),
    total: total ?? 0,
  };
}

export async function getAssetById(id: number): Promise<AssetItem | null> {
  const result = await query(
    `SELECT id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at
     FROM asset_items
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  if (!result.rows.length) {
    return null;
  }

  return mapAsset(result.rows.item(0));
}

export async function updateAsset(id: number, payload: Partial<NewAsset>): Promise<void> {
  const existing = await query('SELECT id FROM asset_items WHERE id = ?', [id]);
  if (existing.rows.length === 0) {
    throw new Error('Patrimonio nao encontrado.');
  }

  if (payload.name !== undefined && !payload.name.trim()) {
    throw new Error('Nome do patrimonio e obrigatorio.');
  }
  if (payload.areaId !== undefined && !payload.areaId) {
    throw new Error('Area e obrigatoria.');
  }
  if (payload.quantity !== undefined && payload.quantity < 0) {
    throw new Error('Quantidade deve ser maior ou igual a zero.');
  }
  if (payload.unitValue !== undefined && payload.unitValue < 0) {
    throw new Error('Valor unitario deve ser maior ou igual a zero.');
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (payload.assetNumber !== undefined) {
    const trimmed = payload.assetNumber?.trim();
    if (trimmed) {
      await ensureUniqueAssetNumber(trimmed, id);
      updates.push('asset_number = ?');
      params.push(trimmed);
    } else {
      updates.push('asset_number = NULL');
    }
  }

  if (payload.name !== undefined) {
    updates.push('name = ?');
    params.push(payload.name.trim());
  }

  if (payload.description !== undefined) {
    updates.push('description = ?');
    params.push(payload.description ?? null);
  }

  if (payload.quantity !== undefined) {
    updates.push('quantity = ?');
    params.push(payload.quantity);
  }

  if (payload.unitValue !== undefined) {
    updates.push('unit_value = ?');
    params.push(payload.unitValue ?? null);
  }

  if (payload.areaId !== undefined) {
    updates.push('area_id = ?');
    params.push(payload.areaId);
  }

  updates.push('updated_at = ?');
  params.push(Date.now());

  params.push(id);
  await execute(`UPDATE asset_items SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteAsset(id: number): Promise<void> {
  await execute('DELETE FROM asset_items WHERE id = ?', [id]);
}

export async function countAssetsByArea(areaId: number): Promise<number> {
  const result = await query(
    'SELECT COUNT(*) as total FROM asset_items WHERE area_id = ?',
    [areaId],
  );
  const total = result.rows.item(0)?.total as number | undefined;
  return total ?? 0;
}
