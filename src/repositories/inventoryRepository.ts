import { execute, getDatabase, query } from '@/db';
import {
  Inventory,
  InventoryReadItem,
  InventorySnapshotItem,
  InventoryStatus,
  InventoryScope,
} from '@/types';

type NewInventory = {
  name: string;
  scopeType: InventoryScope;
  areaId?: number | null;
};

type InventoryRow = {
  id: number;
  name: string;
  scope_type: InventoryScope;
  area_id: number | null;
  status: InventoryStatus;
  created_at: number;
  finished_at: number | null;
};

type SnapshotRow = {
  id: number;
  inventory_id: number;
  asset_id: number;
  asset_number: string;
  asset_name: string;
  area_id: number;
  quantity: number;
  created_at: number;
};

type ReadRow = {
  id: number;
  inventory_id: number;
  asset_id: number | null;
  asset_number: string | null;
  asset_name: string;
  area_id: number | null;
  is_new_item: number;
  quantity: number;
  created_at: number;
};

const PAGE_SIZE_DEFAULT = 20;

function mapInventory(row: InventoryRow): Inventory {
  return {
    id: row.id,
    name: row.name,
    scopeType: row.scope_type,
    areaId: row.area_id,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function mapSnapshot(row: SnapshotRow): InventorySnapshotItem {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    assetId: row.asset_id,
    assetNumber: row.asset_number,
    assetName: row.asset_name,
    areaId: row.area_id,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

function mapRead(row: ReadRow): InventoryReadItem {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    assetId: row.asset_id,
    assetNumber: row.asset_number,
    assetName: row.asset_name,
    areaId: row.area_id,
    isNewItem: Boolean(row.is_new_item),
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

async function getAssetsForScope(scopeType: InventoryScope, areaId?: number | null) {
  const where = scopeType === 'AREA' ? 'WHERE area_id = ?' : '';
  const params = scopeType === 'AREA' ? [areaId] : [];
  const result = await query(
    `SELECT id, asset_number, name, area_id, quantity FROM asset_items ${where}`,
    params,
  );
  return result.rows._array.map((row) => ({
    id: row.id as number,
    assetNumber: row.asset_number as string,
    name: row.name as string,
    areaId: row.area_id as number,
    quantity: (row.quantity as number) ?? 0,
  }));
}

export async function createInventory(payload: NewInventory): Promise<Inventory> {
  if (!payload.name?.trim()) {
    throw new Error('Nome do inventario e obrigatorio.');
  }
  if (payload.scopeType === 'AREA' && !payload.areaId) {
    throw new Error('Selecione a area do inventario.');
  }

  const assets = await getAssetsForScope(payload.scopeType, payload.areaId);
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const db = getDatabase();
    let inventoryId = 0;

    db.transaction(
      (tx) => {
        tx.executeSql('PRAGMA foreign_keys = ON;');
        tx.executeSql(
          `INSERT INTO inventories (name, scope_type, area_id, status, created_at)
           VALUES (?, ?, ?, 'open', ?)`,
          [payload.name.trim(), payload.scopeType, payload.areaId ?? null, now],
          (_, result) => {
            inventoryId = result.insertId ?? 0;
            assets.forEach((asset) => {
              tx.executeSql(
                `INSERT INTO inventory_snapshot_items (inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  inventoryId,
                  asset.id,
                  asset.assetNumber,
                  asset.name,
                  asset.areaId,
                  asset.quantity ?? 0,
                  now,
                ],
              );
            });
          },
        );
      },
      (error) => reject(error),
      () => {
        if (!inventoryId) {
          reject(new Error('Nao foi possivel criar o inventario.'));
          return;
        }
        resolve({
          id: inventoryId,
          name: payload.name.trim(),
          scopeType: payload.scopeType,
          areaId: payload.areaId ?? null,
          status: 'open',
          createdAt: now,
          finishedAt: null,
        });
      },
    );
  });
}

export async function listInventoriesPaginated({
  page,
  pageSize = PAGE_SIZE_DEFAULT,
}: {
  page: number;
  pageSize?: number;
}): Promise<{ items: Inventory[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const listResult = await query(
    `SELECT id, name, scope_type, area_id, status, created_at, finished_at
     FROM inventories
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  const countResult = await query('SELECT COUNT(*) as total FROM inventories');
  const total = (countResult.rows.item(0)?.total as number | undefined) ?? 0;

  return {
    items: listResult.rows._array.map(mapInventory),
    total,
  };
}

export async function getInventoryById(id: number): Promise<Inventory | null> {
  const result = await query(
    `SELECT id, name, scope_type, area_id, status, created_at, finished_at
     FROM inventories WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!result.rows.length) return null;
  return mapInventory(result.rows.item(0) as InventoryRow);
}

export async function listSnapshotItems(
  inventoryId: number,
): Promise<InventorySnapshotItem[]> {
  const result = await query(
    `SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at
     FROM inventory_snapshot_items
     WHERE inventory_id = ?
     ORDER BY asset_name COLLATE NOCASE ASC`,
    [inventoryId],
  );
  return result.rows._array.map((row) => mapSnapshot(row as SnapshotRow));
}

export async function listReadItems(inventoryId: number): Promise<InventoryReadItem[]> {
  const result = await query(
    `SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at
     FROM inventory_read_items
     WHERE inventory_id = ?
     ORDER BY created_at DESC`,
    [inventoryId],
  );
  return result.rows._array.map((row) => mapRead(row as ReadRow));
}

export async function addReadItem(payload: {
  inventoryId: number;
  assetId?: number | null;
  assetNumber?: string | null;
  assetName: string;
  areaId?: number | null;
  isNewItem?: boolean;
  quantity?: number;
}): Promise<InventoryReadItem> {
  if (!payload.assetName?.trim()) {
    throw new Error('Informe o nome do item.');
  }
  if (payload.quantity !== undefined && payload.quantity < 0) {
    throw new Error('Quantidade deve ser maior ou igual a zero.');
  }

  const inventory = await getInventoryById(payload.inventoryId);
  if (!inventory) {
    throw new Error('Inventario nao encontrado.');
  }
  if (inventory.status === 'finished') {
    throw new Error('Inventario ja finalizado.');
  }

  const assetNumber = payload.assetNumber?.trim();
  if (assetNumber) {
    const duplicate = await query(
      'SELECT id FROM inventory_read_items WHERE inventory_id = ? AND asset_number = ? COLLATE NOCASE LIMIT 1',
      [payload.inventoryId, assetNumber],
    );
    if (duplicate.rows.length) {
      throw new Error('Este patrimonio ja foi lido neste inventario.');
    }
  }

  if (payload.isNewItem) {
    const duplicateNew = await query(
      `SELECT id FROM inventory_read_items
       WHERE inventory_id = ?
         AND is_new_item = 1
         AND asset_name = ? COLLATE NOCASE
         AND IFNULL(area_id, -1) = IFNULL(?, -1)
       LIMIT 1`,
      [payload.inventoryId, payload.assetName.trim(), payload.areaId ?? null],
    );
    if (duplicateNew.rows.length) {
      throw new Error('Item novo duplicado (mesmo nome/area) nesta leitura.');
    }
  }

  let effectiveAreaId = payload.areaId ?? null;
  if (payload.assetId) {
    const assetResult = await query(
      'SELECT id, area_id FROM asset_items WHERE id = ? LIMIT 1',
      [payload.assetId],
    );
    if (!assetResult.rows.length) {
      throw new Error('Patrimonio nao encontrado.');
    }
    const row = assetResult.rows.item(0);
    effectiveAreaId = row.area_id as number;

    if (
      inventory.scopeType === 'AREA' &&
      inventory.areaId &&
      row.area_id !== inventory.areaId
    ) {
      throw new Error('Patrimonio fora do escopo do inventario.');
    }
  } else if (inventory.scopeType === 'AREA' && inventory.areaId && effectiveAreaId) {
    if (effectiveAreaId !== inventory.areaId) {
      throw new Error('Item fora do escopo do inventario.');
    }
  }

  const now = Date.now();
  const result = await execute(
    `INSERT INTO inventory_read_items (inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.inventoryId,
      payload.assetId ?? null,
      assetNumber ?? null,
      payload.assetName.trim(),
      effectiveAreaId,
      payload.isNewItem ? 1 : 0,
      payload.quantity ?? 0,
      now,
    ],
  );

  return {
    id: result.insertId ?? 0,
    inventoryId: payload.inventoryId,
    assetId: payload.assetId ?? null,
    assetNumber: assetNumber ?? null,
    assetName: payload.assetName.trim(),
    areaId: payload.areaId ?? null,
    isNewItem: Boolean(payload.isNewItem),
    quantity: payload.quantity ?? 0,
    createdAt: now,
  };
}

export async function finalizeInventory(inventoryId: number): Promise<void> {
  const inventory = await getInventoryById(inventoryId);
  if (!inventory) {
    throw new Error('Inventario nao encontrado.');
  }
  if (inventory.status === 'finished') {
    return;
  }

  await execute('UPDATE inventories SET status = ?, finished_at = ? WHERE id = ?', [
    'finished',
    Date.now(),
    inventoryId,
  ]);
}

export async function updateReadItemQuantity(readId: number, quantity: number) {
  if (quantity < 0) {
    throw new Error('Quantidade deve ser maior ou igual a zero.');
  }
  const read = await query(
    'SELECT inventory_id FROM inventory_read_items WHERE id = ? LIMIT 1',
    [readId],
  );
  if (!read.rows.length) {
    throw new Error('Leitura nao encontrada.');
  }
  const inventoryId = read.rows.item(0).inventory_id as number;
  const inv = await getInventoryById(inventoryId);
  if (!inv || inv.status === 'finished') {
    throw new Error('Inventario finalizado. Nao e possivel editar.');
  }
  await execute('UPDATE inventory_read_items SET quantity = ? WHERE id = ?', [
    quantity,
    readId,
  ]);
}

export async function deleteReadItem(readId: number) {
  const read = await query(
    'SELECT inventory_id FROM inventory_read_items WHERE id = ? LIMIT 1',
    [readId],
  );
  if (!read.rows.length) {
    throw new Error('Leitura nao encontrada.');
  }
  const inventoryId = read.rows.item(0).inventory_id as number;
  const inv = await getInventoryById(inventoryId);
  if (!inv || inv.status === 'finished') {
    throw new Error('Inventario finalizado. Nao e possivel excluir.');
  }
  await execute('DELETE FROM inventory_read_items WHERE id = ?', [readId]);
}

export async function updateReadItemMeta(
  readId: number,
  payload: {
    assetName?: string;
    areaId?: number | null;
  },
) {
  const read = await query(
    'SELECT inventory_id, is_new_item, asset_name, area_id FROM inventory_read_items WHERE id = ? LIMIT 1',
    [readId],
  );
  if (!read.rows.length) {
    throw new Error('Leitura nao encontrada.');
  }
  const {
    inventory_id: inventoryId,
    is_new_item: isNew,
    asset_name,
    area_id,
  } = read.rows.item(0) as {
    inventory_id: number;
    is_new_item: number;
    asset_name: string;
    area_id: number | null;
  };
  const inv = await getInventoryById(inventoryId);
  if (!inv || inv.status === 'finished') {
    throw new Error('Inventario finalizado. Nao e possivel editar.');
  }
  if (!isNew) {
    return; // apenas itens novos podem editar nome/area
  }
  if (payload.assetName !== undefined && !payload.assetName.trim()) {
    throw new Error('Nome do item e obrigatorio.');
  }
  const nextName = payload.assetName?.trim() ?? asset_name;
  const nextAreaId =
    payload.areaId !== undefined ? (payload.areaId ?? null) : (area_id as number | null);
  const duplicateNew = await query(
    `SELECT id FROM inventory_read_items
     WHERE inventory_id = ?
       AND is_new_item = 1
       AND id != ?
       AND asset_name = ? COLLATE NOCASE
       AND IFNULL(area_id, -1) = IFNULL(?, -1)
     LIMIT 1`,
    [inventoryId, readId, nextName, nextAreaId ?? null],
  );
  if (duplicateNew.rows.length) {
    throw new Error('Item novo duplicado (mesmo nome/area) nesta leitura.');
  }
  const updates: string[] = [];
  const params: (string | number | null)[] = [];
  if (payload.assetName !== undefined) {
    updates.push('asset_name = ?');
    params.push(payload.assetName.trim());
  }
  if (payload.areaId !== undefined) {
    updates.push('area_id = ?');
    params.push(payload.areaId ?? null);
  }
  if (!updates.length) return;
  params.push(readId);
  await execute(
    `UPDATE inventory_read_items SET ${updates.join(', ')} WHERE id = ?`,
    params,
  );
}
