// Ensure native modules are not loaded during unit tests
process.env.UNIT_TEST = '1';

import assert from 'assert';

import { __setBackupDeps, restoreBackup } from '../src/services/backup/backupService';
import { buildDiffsFromSnapshotAndReads } from '../src/services/inventory/diffUtils';
import {
  __setInventoryAdjustmentDeps,
  applyInventoryAdjustments,
} from '../src/services/inventory/inventoryAdjustmentService';
import {
  __setInventoryCompareDeps,
  saveDiffResolution,
  updateDiffL2Quantity,
} from '../src/services/inventory/inventoryCompareService';
import { deriveFinalQuantity } from '../src/services/inventory/rules';
import { AppSettings, InventoryDiff } from '../src/types';
import {
  applyThousandSeparator,
  formatCurrencyInput,
  formatIntegerInput,
} from '../src/utils/numeric';
import { formatPatrimonyNumber } from '../src/utils/patrimony';

function testPatrimonyFormat() {
  const num = formatPatrimonyNumber(1);
  assert.strictEqual(num, 'PAT-000001');
  const custom = formatPatrimonyNumber(42, 'ITEM-{seq}');
  assert.strictEqual(custom, 'ITEM-000042');
}

function testBuildDiffs() {
  const diffs = buildDiffsFromSnapshotAndReads(
    [
      { asset_id: 1, asset_number: 'PAT-1', asset_name: 'PC', area_id: 1, quantity: 5 },
      { asset_id: 2, asset_number: 'PAT-2', asset_name: 'Mesa', area_id: 1, quantity: 2 },
    ],
    [
      {
        asset_id: 1,
        asset_number: 'PAT-1',
        asset_name: 'PC',
        area_id: 1,
        quantity: 3,
        is_new_item: 0,
      },
      {
        asset_id: null,
        asset_number: null,
        asset_name: 'Cadeira nova',
        area_id: 1,
        quantity: 1,
        is_new_item: 1,
      },
    ],
  );

  const divergent = diffs.find((d) => d.asset_number === 'PAT-1');
  assert.ok(divergent);
  assert.strictEqual(divergent?.status, 'DIVERGENT');
  const missing = diffs.find((d) => d.asset_number === 'PAT-2');
  assert.ok(missing);
  assert.strictEqual(missing?.status, 'MISSING');
  const added = diffs.find((d) => d.status === 'NEW');
  assert.ok(added);
}

function testDeriveFinalQuantity() {
  const settings: AppSettings = {
    itemsPerPage: 20,
    missingRule: 'zero',
    allowCreateNew: true,
    patrimonyFormat: 'PAT-{seq}',
  };
  const diff: InventoryDiff = {
    id: 1,
    inventoryId: 1,
    assetId: 1,
    assetNumber: 'PAT-1',
    assetName: 'PC',
    areaId: 1,
    l0Quantity: 5,
    l1Quantity: 3,
    status: 'DIVERGENT',
    createdAt: Date.now(),
  };
  assert.strictEqual(deriveFinalQuantity(diff, settings), 3);

  const missing: InventoryDiff = { ...diff, status: 'MISSING', l1Quantity: 0 };
  assert.strictEqual(deriveFinalQuantity(missing, settings), 0);
  const missingKeep: InventoryDiff = { ...missing };
  const keepSettings = { ...settings, missingRule: 'keep' as const };
  assert.strictEqual(deriveFinalQuantity(missingKeep, keepSettings), 5);

  const l2Choice: InventoryDiff = { ...diff, l2Quantity: 10, resolutionChoice: 'L2' };
  assert.strictEqual(deriveFinalQuantity(l2Choice, settings), 10);

  const ignoreChoice: InventoryDiff = { ...diff, resolutionChoice: 'IGNORE' };
  assert.strictEqual(deriveFinalQuantity(ignoreChoice, settings), 5);
}

function testNumericMasks() {
  assert.strictEqual(formatIntegerInput('0012a'), '12');
  assert.strictEqual(formatIntegerInput(''), '0');
  assert.strictEqual(formatCurrencyInput(''), '');
  assert.strictEqual(formatCurrencyInput('5'), '0.05');
  assert.strictEqual(formatCurrencyInput('1234'), '12.34');
  assert.strictEqual(formatCurrencyInput('0099'), '0.99');
  assert.strictEqual(applyThousandSeparator('1234.50'), '1.234,50');
}

async function testApplyInventoryAdjustments() {
  const now = Date.now();
  const diffs: InventoryDiff[] = [
    {
      id: 1,
      inventoryId: 1,
      assetId: 10,
      assetNumber: 'PAT-001',
      assetName: 'PC',
      areaId: 1,
      l0Quantity: 5,
      l1Quantity: 3,
      status: 'DIVERGENT',
      createdAt: now,
      resolutionChoice: 'L1',
    },
    {
      id: 2,
      inventoryId: 1,
      assetId: null,
      assetNumber: 'PAT-NEW',
      assetName: 'Novo',
      areaId: 2,
      l0Quantity: 0,
      l1Quantity: 1,
      l2Quantity: 4,
      status: 'NEW',
      createdAt: now,
      resolutionChoice: 'L2',
    },
  ];

  const executed: { sql: string; params?: unknown[] }[] = [];
  const tx = {
    executeSql: (
      sql: string,
      params?: unknown[],
      success?: (
        _t: unknown,
        result: { rows: { length: number; item: () => unknown }; insertId?: number },
      ) => void,
    ) => {
      executed.push({ sql, params });
      if (sql.startsWith('SELECT quantity FROM asset_items')) {
        success?.(tx, { rows: { length: 1, item: () => ({ quantity: 5 }) } });
      } else if (sql.startsWith('SELECT id, quantity FROM asset_items')) {
        success?.(tx, { rows: { length: 1, item: () => ({ id: 10, quantity: 5 }) } });
      } else if (sql.startsWith('INSERT INTO asset_items')) {
        success?.(tx, { insertId: 200, rows: { length: 0, item: () => ({}) } });
      } else {
        success?.(tx, { rows: { length: 0, item: () => ({}) } });
      }
      return true;
    },
  };

  let computeCalled = false;
  __setInventoryAdjustmentDeps({
    getInventoryById: async () => ({
      id: 1,
      name: 'Inv',
      status: 'open',
      scopeType: 'ALL',
      areaId: 2,
      createdAt: now,
    }),
    loadSettings: async (): Promise<AppSettings> => ({
      itemsPerPage: 20,
      missingRule: 'zero',
      allowCreateNew: true,
      patrimonyFormat: 'PAT-{seq}',
    }),
    loadSession: async () => ({ userId: 9 }),
    fetchDiffs: async () => diffs,
    runInTransaction: async (cb) => {
      cb(tx);
    },
    computeInventoryDiff: async (): Promise<{ divergent: number }> => {
      computeCalled = true;
      return { divergent: 0 };
    },
    generateAssetNumberWithFormat: async () => 'AUTO-001',
  });

  await applyInventoryAdjustments(1);

  assert.ok(
    executed.some(
      (op) =>
        op.sql.startsWith('UPDATE asset_items SET quantity') && op.params?.[0] === 3,
    ),
    'Deve atualizar quantidade do patrimonio existente',
  );
  assert.ok(
    executed.some(
      (op) => op.sql.startsWith('INSERT INTO asset_items') && op.params?.includes(4),
    ),
    'Deve criar item novo com quantidade derivada',
  );
  assert.ok(
    executed.some(
      (op) =>
        op.sql.includes('inventory_adjustment_log') &&
        op.params?.includes(9) &&
        op.params?.includes(5),
    ),
    'Log de ajuste deve registrar before/usuario',
  );
  assert.ok(computeCalled, 'Comparacao deve ser recalculada ao final');
}

async function testLeitura2ResolucaoFlow() {
  const calls: { sql: string; params?: unknown[] }[] = [];
  __setInventoryCompareDeps({
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return {};
    },
  });

  await updateDiffL2Quantity(5, 7);
  assert.strictEqual(calls[0].params?.[0], 7, 'L2 deve propagar quantidade');

  await saveDiffResolution({
    diffId: 5,
    choice: 'L2',
    finalQuantity: null,
    l1Quantity: 3,
    l2Quantity: 8,
    note: 'usar l2',
  });
  assert.strictEqual(
    calls[1].params?.[1],
    8,
    'Resolucao deve persistir finalQuantity com base na L2',
  );
}

async function testBackupRestore() {
  const now = Date.now();
  const executed: string[] = [];
  __setBackupDeps({
    runInTransaction: async (
      cb: (tx: { executeSql: (sql: string, params?: unknown[]) => void }) => void,
    ) => {
      const tx = {
        executeSql: (sql: string) => {
          executed.push(sql);
        },
      };
      cb(tx);
    },
    getCurrentSchemaVersion: async () => 5,
  });

  await restoreBackup({
    type: 'patrimonio-simples-backup',
    schemaVersion: 5,
    checksum: 'dummy',
    data: {
      users: [
        {
          id: 1,
          username: 'admin',
          passwordHash: 'h',
          passwordSalt: 's',
          mustChangePassword: false,
          createdAt: now,
        },
      ],
      areas: [{ id: 1, name: 'Area', description: null, active: true, createdAt: now }],
      assets: [
        {
          id: 1,
          assetNumber: 'PAT-1',
          name: 'PC',
          description: null,
          quantity: 1,
          unitValue: null,
          areaId: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      sequences: [{ name: 'patrimony', value: 10 }],
      inventories: [],
      snapshots: [],
      reads: [],
      diffs: [],
      adjustmentLogs: [],
    },
  });

  assert.ok(
    executed.some((sql) => sql.startsWith('DELETE FROM asset_items')),
    'Restore deve limpar tabelas antes de inserir',
  );
  assert.ok(
    executed.some((sql) => sql.startsWith('INSERT INTO users')),
    'Restore deve inserir usuarios do backup',
  );
}

async function run() {
  testPatrimonyFormat();
  testBuildDiffs();
  testDeriveFinalQuantity();
  testNumericMasks();
  await testApplyInventoryAdjustments();
  await testLeitura2ResolucaoFlow();
  await testBackupRestore();
  // eslint-disable-next-line no-console
  console.log('All tests passed');
}

run();
