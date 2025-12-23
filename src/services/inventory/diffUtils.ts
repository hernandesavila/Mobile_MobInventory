import { InventoryDiffStatus } from '@/types';

export type SnapshotRow = {
  asset_id: number;
  asset_number: string;
  asset_name: string;
  area_id: number;
  quantity: number;
};

export type ReadRow = {
  asset_id: number | null;
  asset_number: string | null;
  asset_name: string;
  area_id: number | null;
  quantity: number;
  is_new_item: number;
};

function makeKey(assetNumber: string | null, assetId: number | null) {
  if (assetNumber) {
    return assetNumber.toUpperCase();
  }
  if (assetId !== null && assetId !== undefined) {
    return `ID:${assetId}`;
  }
  return null;
}

export function buildDiffsFromSnapshotAndReads(
  snapshotRows: SnapshotRow[],
  readRows: ReadRow[],
) {
  const diffs: {
    asset_id: number | null;
    asset_number: string | null;
    asset_name: string;
    area_id: number | null;
    l0_quantity: number;
    l1_quantity: number;
    l2_quantity: number;
    final_quantity: number | null;
    resolution_choice: string | null;
    resolution_note: string | null;
    status: InventoryDiffStatus;
  }[] = [];

  const snapshotMap = new Map<
    string,
    {
      asset_id: number;
      asset_number: string;
      asset_name: string;
      area_id: number | null;
      qty: number;
    }
  >();

  snapshotRows.forEach((row) => {
    const key = makeKey(row.asset_number ?? null, row.asset_id);
    if (!key) return;
    snapshotMap.set(key, {
      asset_id: row.asset_id,
      asset_number: row.asset_number,
      asset_name: row.asset_name,
      area_id: row.area_id,
      qty: row.quantity ?? 0,
    });
  });

  const processed = new Set<string>();

  readRows.forEach((row) => {
    const key = makeKey(row.asset_number, row.asset_id);
    processed.add(key);
    const snap = snapshotMap.get(key);
    if (!snap) {
      diffs.push({
        asset_id: row.asset_id ?? null,
        asset_number: row.asset_number,
        asset_name: row.asset_name,
        area_id: row.area_id ?? null,
        l0_quantity: 0,
        l1_quantity: row.quantity ?? 0,
        l2_quantity: 0,
        final_quantity: null,
        resolution_choice: null,
        resolution_note: null,
        status: 'NEW',
      });
      return;
    }

    const l0 = snap.qty ?? 0;
    const l1 = row.quantity ?? 0;
    const status: InventoryDiffStatus = l0 === l1 ? 'OK' : 'DIVERGENT';

    diffs.push({
      asset_id: snap.asset_id,
      asset_number: snap.asset_number,
      asset_name: snap.asset_name,
      area_id: snap.area_id,
      l0_quantity: l0,
      l1_quantity: l1,
      l2_quantity: 0,
      final_quantity: null,
      resolution_choice: null,
      resolution_note: null,
      status,
    });
  });

  snapshotMap.forEach((snap, key) => {
    if (processed.has(key)) return;
    diffs.push({
      asset_id: snap.asset_id,
      asset_number: snap.asset_number,
      asset_name: snap.asset_name,
      area_id: snap.area_id,
      l0_quantity: snap.qty ?? 0,
      l1_quantity: 0,
      l2_quantity: 0,
      final_quantity: null,
      resolution_choice: null,
      resolution_note: null,
      status: 'MISSING',
    });
  });

  return diffs;
}
