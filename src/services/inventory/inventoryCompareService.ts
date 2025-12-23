import { execute, query, runInTransaction } from '@/db';
import { InventoryDiff, InventoryDiffStatus } from '@/types';

import { buildDiffsFromSnapshotAndReads, ReadRow, SnapshotRow } from './diffUtils';

type DiffFilters = {
  onlyDivergent?: boolean;
  search?: string;
  page: number;
  pageSize: number;
};

type DiffRow = {
  id: number;
  inventory_id: number;
  asset_id: number | null;
  asset_number: string | null;
  asset_name: string;
  area_id: number | null;
  l0_quantity: number;
  l1_quantity: number;
  l2_quantity: number | null;
  final_quantity: number | null;
  resolution_choice: string | null;
  resolution_note: string | null;
  status: InventoryDiffStatus;
  created_at: number;
};

let executeFn = execute;

export function __setInventoryCompareDeps(overrides: { execute?: typeof execute }) {
  if (overrides.execute) {
    executeFn = overrides.execute;
  }
}

function mapDiff(row: DiffRow): InventoryDiff {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    assetId: row.asset_id,
    assetNumber: row.asset_number,
    assetName: row.asset_name,
    areaId: row.area_id,
    l0Quantity: row.l0_quantity,
    l1Quantity: row.l1_quantity,
    l2Quantity: row.l2_quantity ?? undefined,
    finalQuantity: row.final_quantity ?? undefined,
    resolutionChoice: row.resolution_choice as InventoryDiff['resolutionChoice'],
    resolutionNote: row.resolution_note ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function computeInventoryDiff(inventoryId: number) {
  const [snapshotResult, readResult] = await Promise.all([
    query(
      `SELECT asset_id, asset_number, asset_name, area_id, quantity FROM inventory_snapshot_items WHERE inventory_id = ?`,
      [inventoryId],
    ),
    query(
      `SELECT asset_id, asset_number, asset_name, area_id, quantity, is_new_item FROM inventory_read_items WHERE inventory_id = ?`,
      [inventoryId],
    ),
  ]);

  const now = Date.now();
  const diffs = buildDiffsFromSnapshotAndReads(
    snapshotResult.rows._array as SnapshotRow[],
    readResult.rows._array as ReadRow[],
  );

  await runInTransaction((tx) => {
    tx.executeSql('DELETE FROM inventory_diff WHERE inventory_id = ?', [inventoryId]);
    diffs.forEach((diff) => {
      tx.executeSql(
        `INSERT INTO inventory_diff (inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inventoryId,
          diff.asset_id,
          diff.asset_number,
          diff.asset_name,
          diff.area_id,
          diff.l0_quantity,
          diff.l1_quantity,
          diff.l2_quantity,
          diff.final_quantity,
          diff.resolution_choice,
          diff.resolution_note,
          diff.status,
          now,
        ],
      );
    });
  });

  const divergentCount = diffs.filter((d) => d.status !== 'OK').length;
  return { total: diffs.length, divergent: divergentCount };
}

export async function listInventoryDiffs(
  inventoryId: number,
  filters: DiffFilters,
): Promise<{ items: InventoryDiff[]; total: number; divergent: number }> {
  const where: string[] = ['inventory_id = ?'];
  const params: (string | number | null)[] = [inventoryId];

  if (filters.onlyDivergent) {
    where.push("status != 'OK'");
  }
  if (filters.search?.trim()) {
    where.push('(asset_name LIKE ? COLLATE NOCASE OR asset_number LIKE ?)');
    params.push(`%${filters.search.trim()}%`, `%${filters.search.trim()}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.pageSize;

  const listResult = await query(
    `SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at
     FROM inventory_diff
     ${whereClause}
     ORDER BY asset_name COLLATE NOCASE ASC
     LIMIT ? OFFSET ?`,
    [...params, filters.pageSize, offset],
  );

  const countResult = await query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status != 'OK' THEN 1 ELSE 0 END) as divergent
     FROM inventory_diff ${whereClause}`,
    params,
  );

  const total = countResult.rows.item(0)?.total as number | undefined;
  const divergent = countResult.rows.item(0)?.divergent as number | undefined;

  return {
    items: listResult.rows._array.map((row) => mapDiff(row as DiffRow)),
    total: total ?? 0,
    divergent: divergent ?? 0,
  };
}

export async function updateDiffL2Quantity(diffId: number, l2Quantity: number) {
  await executeFn(
    `UPDATE inventory_diff
     SET l2_quantity = ?,
         final_quantity = CASE
           WHEN resolution_choice = 'L2' THEN ?
           WHEN final_quantity IS NULL THEN ?
           ELSE final_quantity
         END
     WHERE id = ?`,
    [l2Quantity, l2Quantity, l2Quantity, diffId],
  );
}

export async function saveDiffResolution(params: {
  diffId: number;
  choice: 'L1' | 'L2' | 'IGNORE';
  finalQuantity: number | null;
  l1Quantity?: number;
  l2Quantity?: number | null;
  note?: string;
}) {
  if (!params.choice) {
    throw new Error('Escolha L1 ou L2 antes de salvar.');
  }
  const finalQuantity =
    params.choice === 'L2'
      ? (params.l2Quantity ?? params.finalQuantity)
      : params.choice === 'L1'
        ? (params.l1Quantity ?? params.finalQuantity)
        : params.finalQuantity;
  const safeFinal = finalQuantity ?? 0;
  await executeFn(
    'UPDATE inventory_diff SET resolution_choice = ?, final_quantity = ?, resolution_note = ? WHERE id = ?',
    [params.choice, safeFinal, params.note ?? null, params.diffId],
  );
}

export async function hasInventoryDivergences(inventoryId: number) {
  const result = await query(
    `SELECT COUNT(*) as divergent FROM inventory_diff WHERE inventory_id = ? AND status != 'OK'`,
    [inventoryId],
  );
  const divergent = result.rows.item(0)?.divergent as number | undefined;
  return (divergent ?? 0) > 0;
}
