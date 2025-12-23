import { execute, query } from '@/db';
import { countAssetsByArea } from '@/repositories/assetRepository';
import { Area } from '@/types';

type NewArea = {
  name: string;
  description?: string | null;
  active?: boolean;
};

export async function createArea(payload: NewArea): Promise<Area> {
  if (!payload.name?.trim()) {
    throw new Error('Nome da area e obrigatorio.');
  }

  const existing = await query('SELECT id FROM areas WHERE name = ? COLLATE NOCASE', [
    payload.name.trim(),
  ]);
  if (existing.rows.length > 0) {
    throw new Error('Ja existe uma area com este nome.');
  }

  const now = Date.now();
  const result = await execute(
    'INSERT INTO areas (name, description, active, created_at) VALUES (?, ?, ?, ?)',
    [
      payload.name.trim(),
      payload.description ?? null,
      payload.active === false ? 0 : 1,
      now,
    ],
  );

  const insertId = result.insertId ?? 0;
  return {
    id: insertId,
    name: payload.name.trim(),
    description: payload.description ?? null,
    active: payload.active === false ? false : true,
    createdAt: now,
  };
}

export async function getAreaById(id: number): Promise<Area | null> {
  const result = await query(
    'SELECT id, name, description, active, created_at FROM areas WHERE id = ? LIMIT 1',
    [id],
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows.item(0);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export async function listAllAreas(): Promise<Area[]> {
  const result = await query(
    'SELECT id, name, description, active, created_at FROM areas ORDER BY name COLLATE NOCASE ASC',
  );
  return result.rows._array.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    active: Boolean(row.active),
    createdAt: row.created_at,
  }));
}

export async function listAreasPaginated({
  search,
  page,
  pageSize,
  order,
}: {
  search?: string;
  page: number;
  pageSize: number;
  order?: 'asc' | 'desc';
}): Promise<{ items: Area[]; total: number }> {
  const filters: string[] = [];
  const params: (string | number | null)[] = [];

  if (search?.trim()) {
    filters.push('name LIKE ? COLLATE NOCASE');
    params.push(`%${search.trim()}%`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  const listResult = await query(
    `SELECT id, name, description, active, created_at
     FROM areas
     ${where}
     ORDER BY name COLLATE NOCASE ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  const countResult = await query(`SELECT COUNT(*) as total FROM areas ${where}`, params);
  const total = countResult.rows.item(0)?.total as number | undefined;

  const items: Area[] = listResult.rows._array.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    active: Boolean(row.active),
    createdAt: row.created_at,
  }));

  return { items, total: total ?? 0 };
}

export async function updateArea(id: number, payload: Partial<NewArea>): Promise<void> {
  const existing = await query('SELECT id FROM areas WHERE id = ?', [id]);
  if (existing.rows.length === 0) {
    throw new Error('Area nao encontrada.');
  }

  if (payload.name !== undefined) {
    if (!payload.name.trim()) {
      throw new Error('Nome da area e obrigatorio.');
    }
    const duplicate = await query(
      'SELECT id FROM areas WHERE name = ? COLLATE NOCASE AND id != ?',
      [payload.name.trim(), id],
    );
    if (duplicate.rows.length > 0) {
      throw new Error('Ja existe uma area com este nome.');
    }
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (payload.name !== undefined) {
    updates.push('name = ?');
    params.push(payload.name.trim());
  }

  if (payload.description !== undefined) {
    updates.push('description = ?');
    params.push(payload.description ?? null);
  }

  if (payload.active !== undefined) {
    updates.push('active = ?');
    params.push(payload.active ? 1 : 0);
  }

  if (!updates.length) {
    return;
  }

  params.push(id);
  await execute(`UPDATE areas SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function deleteArea(id: number): Promise<void> {
  const assetCount = await countAssetsByArea(id);
  if (assetCount > 0) {
    throw new Error('Nao e possivel excluir: existe patrimonio vinculado.');
  }
  await execute('DELETE FROM areas WHERE id = ?', [id]);
}
