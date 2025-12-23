import { query, runInTransaction } from '@/db';
import { generateAssetNumberWithFormat } from '@/repositories/assetRepository';
import { getInventoryById } from '@/repositories/inventoryRepository';
import { loadSession } from '@/repositories/sessionRepository';
import { computeInventoryDiff } from '@/services/inventory/inventoryCompareService';
import { loadSettings } from '@/services/settings/settingsStorage';
import { InventoryDiff } from '@/types';

import { deriveFinalQuantity } from './rules';

type ResolutionChoice = 'L1' | 'L2' | 'IGNORE';

async function fetchDiffs(inventoryId: number) {
  const result = await query(
    `SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at
     FROM inventory_diff WHERE inventory_id = ?`,
    [inventoryId],
  );
  return result.rows._array.map((row) => ({
    id: row.id as number,
    inventoryId: row.inventory_id as number,
    assetId: row.asset_id as number | null,
    assetNumber: row.asset_number as string | null,
    assetName: row.asset_name as string,
    areaId: row.area_id as number | null,
    l0Quantity: row.l0_quantity as number,
    l1Quantity: row.l1_quantity as number,
    l2Quantity: row.l2_quantity as number | null,
    finalQuantity: row.final_quantity as number | null,
    resolutionChoice: row.resolution_choice as ResolutionChoice | null,
    resolutionNote: row.resolution_note as string | null,
    status: row.status as InventoryDiff['status'],
    createdAt: row.created_at as number,
  })) as InventoryDiff[];
}

type AdjustmentDeps = {
  getInventoryById: typeof getInventoryById;
  loadSettings: typeof loadSettings;
  loadSession: typeof loadSession;
  fetchDiffs: typeof fetchDiffs;
  runInTransaction: typeof runInTransaction;
  computeInventoryDiff: typeof computeInventoryDiff;
  generateAssetNumberWithFormat: typeof generateAssetNumberWithFormat;
};

let deps: AdjustmentDeps = {
  getInventoryById,
  loadSettings,
  loadSession,
  fetchDiffs,
  runInTransaction,
  computeInventoryDiff,
  generateAssetNumberWithFormat,
};

export function __setInventoryAdjustmentDeps(overrides: Partial<AdjustmentDeps>) {
  deps = { ...deps, ...overrides };
}

export async function applyInventoryAdjustments(inventoryId: number) {
  const inventory = await deps.getInventoryById(inventoryId);
  if (!inventory) {
    throw new Error('Inventario nao encontrado.');
  }
  if (inventory.status === 'finished') {
    throw new Error('Inventario ja finalizado.');
  }

  const settings = await deps.loadSettings();
  const session = await deps.loadSession();
  const diffs = await deps.fetchDiffs(inventoryId);
  if (!diffs.length) {
    throw new Error('Nenhuma divergencia para ajustar.');
  }
  if (diffs.some((d) => !d.resolutionChoice)) {
    throw new Error('Defina L1/L2/ignorar para todos os itens antes de aplicar.');
  }

  for (const diff of diffs) {
    if (diff.status === 'NEW' && !diff.assetNumber && settings.allowCreateNew) {
      diff.assetNumber = await deps.generateAssetNumberWithFormat(
        settings.patrimonyFormat,
      );
    }
    if (
      diff.status === 'NEW' &&
      settings.allowCreateNew &&
      diff.resolutionChoice !== 'IGNORE' &&
      !diff.areaId &&
      !inventory.areaId
    ) {
      throw new Error('Itens novos precisam de uma area para serem criados no ajuste.');
    }
  }

  const now = Date.now();

  await deps.runInTransaction((tx) => {
    const userId = session?.userId ?? null;
    diffs.forEach((diff) => {
      const decision = (diff.resolutionChoice as ResolutionChoice) ?? 'L1';
      const derived = deriveFinalQuantity(diff, settings);
      const finalQty = derived ?? diff.finalQuantity ?? 0;
      const note = diff.resolutionNote ?? null;

      if (diff.status === 'NEW') {
        if (!settings.allowCreateNew || decision === 'IGNORE') {
          tx.executeSql(
            'UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ? WHERE id = ?',
            [0, decision, note, diff.id],
          );
          tx.executeSql(
            `INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inventoryId,
              null,
              diff.assetNumber ?? null,
              0,
              0,
              decision,
              note,
              userId,
              now,
            ],
          );
          return;
        }
        const areaId = diff.areaId ?? inventory.areaId ?? null;
        if (!areaId) {
          throw new Error('Area obrigatoria para criar item novo no ajuste.');
        }
        const num = diff.assetNumber;
        tx.executeSql(
          `INSERT INTO asset_items (asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [num, diff.assetName, null, finalQty, null, areaId, now, now],
          (_, result) => {
            const assetId = result.insertId ?? null;
            tx.executeSql(
              'UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = ? WHERE id = ?',
              [finalQty, decision, note, assetId, diff.id],
            );
            tx.executeSql(
              `INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [inventoryId, assetId, num, 0, finalQty, decision, note, userId, now],
            );
          },
        );
        return;
      }

      const applyToAsset = (
        assetId: number,
        assetNumber: string | null,
        beforeQty: number,
      ) => {
        tx.executeSql(
          'UPDATE asset_items SET quantity = ?, updated_at = ? WHERE id = ?',
          [finalQty, now, assetId],
        );
        tx.executeSql(
          'UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = ? WHERE id = ?',
          [finalQty, decision, note, assetId, diff.id],
        );
        tx.executeSql(
          `INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inventoryId,
            assetId,
            assetNumber,
            beforeQty,
            finalQty,
            decision,
            note,
            userId,
            now,
          ],
        );
      };

      if (diff.assetId) {
        tx.executeSql(
          'SELECT quantity FROM asset_items WHERE id = ? LIMIT 1',
          [diff.assetId],
          (_t, res) => {
            const beforeQty = res.rows.length
              ? ((res.rows.item(0).quantity as number) ?? 0)
              : 0;
            applyToAsset(diff.assetId as number, diff.assetNumber ?? null, beforeQty);
          },
        );
        return;
      }

      if (diff.assetNumber) {
        tx.executeSql(
          'SELECT id, quantity FROM asset_items WHERE asset_number = ? LIMIT 1',
          [diff.assetNumber],
          (_t, res) => {
            if (!res.rows.length) {
              tx.executeSql(
                'UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = NULL WHERE id = ?',
                [finalQty, decision, note, diff.id],
              );
              tx.executeSql(
                `INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  inventoryId,
                  null,
                  diff.assetNumber,
                  0,
                  finalQty,
                  decision,
                  note,
                  userId,
                  now,
                ],
              );
              return;
            }
            const row = res.rows.item(0);
            const beforeQty = (row.quantity as number) ?? 0;
            applyToAsset(row.id as number, diff.assetNumber ?? null, beforeQty);
          },
        );
      }
    });

    tx.executeSql('UPDATE inventories SET status = ?, finished_at = ? WHERE id = ?', [
      'finished',
      now,
      inventoryId,
    ]);
  });

  await deps.computeInventoryDiff(inventoryId);
}
