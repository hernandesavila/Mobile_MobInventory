import type * as SQLite from 'expo-sqlite';

type SQLiteType = typeof import('expo-sqlite');

const DB_NAME = 'patrimonio_simples.db';

type Statement = {
  sql: string;
  args?: (string | number | null)[];
};

let SQLiteModule: SQLiteType | null = null;
let database: SQLite.WebSQLDatabase | null = null;

function ensureSQLite() {
  if (!SQLiteModule && process.env.UNIT_TEST !== '1') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SQLiteModule = require('expo-sqlite') as SQLiteType;
  }
  if (!SQLiteModule) {
    throw new Error('SQLite indisponivel no modo de teste.');
  }
  return SQLiteModule;
}

function getDatabase() {
  if (!database) {
    const sqlite = ensureSQLite();
    database = sqlite.openDatabase(DB_NAME);
  }
  return database;
}

function runTransaction(statements: Statement[]) {
  return new Promise<void>((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => {
        tx.executeSql('PRAGMA foreign_keys = ON;');
        statements.forEach(({ sql, args }) => tx.executeSql(sql, args ?? []));
      },
      (error) => reject(error),
      () => resolve(),
    );
  });
}

export function query(sql: string, params: (string | number | null)[] = []) {
  return new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    const db = getDatabase();
    db.readTransaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            reject(error);
            return false;
          },
        );
      },
      (error) => reject(error),
    );
  });
}

export function execute(sql: string, params: (string | number | null)[] = []) {
  return new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => {
        tx.executeSql('PRAGMA foreign_keys = ON;');
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            reject(error);
            return false;
          },
        );
      },
      (error) => reject(error),
    );
  });
}

async function getSchemaVersion(): Promise<number> {
  try {
    const result = await query('SELECT version FROM schema_version LIMIT 1');
    const version = result.rows.item(0)?.version as number | undefined;
    return version ?? 0;
  } catch {
    return 0;
  }
}

const migrationV1: Statement[] = [
  {
    sql: 'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)',
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS asset_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      asset_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      unit_value REAL,
      area_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`,
  },
];

const migrationV2: Statement[] = [
  {
    sql: 'ALTER TABLE areas ADD COLUMN active INTEGER NOT NULL DEFAULT 1',
  },
  {
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_name ON areas(name COLLATE NOCASE)',
  },
  {
    sql: 'UPDATE areas SET active = 1 WHERE active IS NULL',
  },
];

const migrationV3: Statement[] = [
  {
    sql: 'CREATE TABLE IF NOT EXISTS sequences (name TEXT PRIMARY KEY NOT NULL, value INTEGER NOT NULL)',
  },
  {
    sql: 'ALTER TABLE asset_items ADD COLUMN updated_at INTEGER',
  },
  {
    sql: 'ALTER TABLE asset_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0',
  },
  {
    sql: 'UPDATE asset_items SET updated_at = created_at WHERE updated_at IS NULL',
  },
  {
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_number ON asset_items(asset_number)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_asset_area ON asset_items(area_id)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_asset_name ON asset_items(name COLLATE NOCASE)',
  },
];

const migrationV4: Statement[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS app_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`,
  },
];

const migrationV5: Statement[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS inventories (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      area_id INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL,
      finished_at INTEGER,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS inventory_snapshot_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      inventory_id INTEGER NOT NULL,
      asset_id INTEGER NOT NULL,
      asset_number TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      area_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES asset_items(id) ON DELETE CASCADE
    )`,
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS inventory_read_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      inventory_id INTEGER NOT NULL,
      asset_id INTEGER,
      asset_number TEXT,
      asset_name TEXT NOT NULL,
      area_id INTEGER,
      is_new_item INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES asset_items(id) ON DELETE SET NULL,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`,
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_status ON inventories(status)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_read_asset_number ON inventory_read_items(asset_number)',
  },
];

const migrationV6: Statement[] = [
  {
    sql: `CREATE TABLE IF NOT EXISTS inventory_diff (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      inventory_id INTEGER NOT NULL,
      asset_number TEXT,
      asset_name TEXT NOT NULL,
      area_id INTEGER,
      l0_quantity INTEGER NOT NULL DEFAULT 0,
      l1_quantity INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`,
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_diff_inventory ON inventory_diff(inventory_id)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_diff_status ON inventory_diff(status)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_diff_asset_number ON inventory_diff(asset_number)',
  },
];

const migrationV7: Statement[] = [
  {
    sql: 'ALTER TABLE inventory_diff ADD COLUMN l2_quantity INTEGER NOT NULL DEFAULT 0',
  },
  {
    sql: 'ALTER TABLE inventory_diff ADD COLUMN resolution_choice TEXT',
  },
  {
    sql: 'ALTER TABLE inventory_diff ADD COLUMN resolution_note TEXT',
  },
  {
    sql: 'ALTER TABLE inventory_diff ADD COLUMN final_quantity INTEGER',
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS inventory_adjustment_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      inventory_id INTEGER NOT NULL,
      asset_id INTEGER,
      asset_number TEXT,
      before_qty INTEGER,
      after_qty INTEGER,
      decision TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES asset_items(id) ON DELETE SET NULL
    )`,
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_adjust_inv ON inventory_adjustment_log(inventory_id)',
  },
];

const migrationV8: Statement[] = [
  {
    sql: 'ALTER TABLE inventory_diff ADD COLUMN asset_id INTEGER',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_diff_asset_id ON inventory_diff(asset_id)',
  },
];

const migrationV9: Statement[] = [
  {
    sql: 'ALTER TABLE inventory_adjustment_log ADD COLUMN user_id INTEGER',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_inv_adjust_user ON inventory_adjustment_log(user_id)',
  },
];

const migrationV10: Statement[] = [
  // permitir numero de patrimonio opcional
  {
    sql: 'PRAGMA foreign_keys=OFF',
  },
  {
    sql: 'ALTER TABLE asset_items RENAME TO asset_items_old',
  },
  {
    sql: `CREATE TABLE asset_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      asset_number TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      unit_value REAL,
      area_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
    )`,
  },
  {
    sql: `INSERT INTO asset_items (id, asset_number, name, description, unit_value, area_id, created_at, updated_at, quantity)
          SELECT id, asset_number, name, description, unit_value, area_id, created_at, updated_at, quantity FROM asset_items_old`,
  },
  {
    sql: 'DROP TABLE asset_items_old',
  },
  {
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_number ON asset_items(asset_number)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_asset_area ON asset_items(area_id)',
  },
  {
    sql: 'CREATE INDEX IF NOT EXISTS idx_asset_name ON asset_items(name COLLATE NOCASE)',
  },
  // snapshot permitir numero nulo
  {
    sql: 'ALTER TABLE inventory_snapshot_items RENAME TO inventory_snapshot_items_old',
  },
  {
    sql: `CREATE TABLE inventory_snapshot_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      inventory_id INTEGER NOT NULL,
      asset_id INTEGER NOT NULL,
      asset_number TEXT,
      asset_name TEXT NOT NULL,
      area_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES asset_items(id) ON DELETE CASCADE
    )`,
  },
  {
    sql: `INSERT INTO inventory_snapshot_items (id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at)
          SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at FROM inventory_snapshot_items_old`,
  },
  {
    sql: 'DROP TABLE inventory_snapshot_items_old',
  },
  {
    sql: 'PRAGMA foreign_keys=ON',
  },
];

const migrationV11: Statement[] = [
  {
    sql: 'ALTER TABLE users ADD COLUMN security_question TEXT',
  },
  {
    sql: 'ALTER TABLE users ADD COLUMN security_answer_hash TEXT',
  },
  {
    sql: 'ALTER TABLE users ADD COLUMN security_answer_salt TEXT',
  },
];

const migrationV12: Statement[] = [
  {
    sql: `CREATE TABLE collector_event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      event_id TEXT NOT NULL,
      collector_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    )`,
  },
];

const migrationV13: Statement[] = [
  {
    sql: `CREATE TABLE collector_cached_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      master_area_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      updated_at INTEGER
    )`,
  },
  {
    sql: `CREATE TABLE collector_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      collector_id TEXT NOT NULL,
      collector_name TEXT,
      master_base_url TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      status TEXT DEFAULT 'open'
    )`,
  },
  {
    sql: `CREATE TABLE collector_batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      batch_id INTEGER NOT NULL,
      temp_id TEXT NOT NULL,
      master_area_id INTEGER NOT NULL,
      area_name TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      patrimony_number TEXT,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_value REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES collector_batches(id) ON DELETE CASCADE
    )`,
  },
];

const migrationV14: Statement[] = [
  {
    sql: `CREATE TABLE sync_batches (
      id TEXT PRIMARY KEY NOT NULL,
      collector_id TEXT NOT NULL,
      collector_name TEXT,
      received_at INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      checksum TEXT
    )`,
  },
  {
    sql: `CREATE TABLE sync_batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      batch_id TEXT NOT NULL,
      temp_id TEXT NOT NULL,
      area_id_from_master INTEGER NOT NULL,
      area_name TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      patrimony_number TEXT,
      description TEXT,
      quantity INTEGER NOT NULL,
      unit_value REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES sync_batches(id) ON DELETE CASCADE
    )`,
  },
  {
    sql: `CREATE TABLE sync_event_log (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      batch_id TEXT,
      collector_id TEXT,
      created_at INTEGER NOT NULL,
      payload TEXT
    )`,
  },
];

const migrationV15: Statement[] = [
  {
    sql: `CREATE TABLE asset_import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      batch_id TEXT NOT NULL,
      collector_id TEXT,
      asset_id INTEGER,
      asset_number TEXT,
      action_type TEXT NOT NULL,
      before_qty INTEGER,
      after_qty INTEGER,
      applied_at INTEGER NOT NULL,
      user_id INTEGER
    )`,
  },
];

async function setSchemaVersion(version: number) {
  await runTransaction([
    {
      sql: 'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)',
    },
    { sql: 'DELETE FROM schema_version' },
    { sql: 'INSERT INTO schema_version (version) VALUES (?)', args: [version] },
  ]);
}

export async function initializeDatabase() {
  const current = await getSchemaVersion();
  const migrations: { version: number; statements: Statement[] }[] = [
    { version: 1, statements: migrationV1 },
    { version: 2, statements: migrationV2 },
    { version: 3, statements: migrationV3 },
    { version: 4, statements: migrationV4 },
    { version: 5, statements: migrationV5 },
    { version: 6, statements: migrationV6 },
    { version: 7, statements: migrationV7 },
    { version: 8, statements: migrationV8 },
    { version: 9, statements: migrationV9 },
    { version: 10, statements: migrationV10 },
    { version: 11, statements: migrationV11 },
    { version: 12, statements: migrationV12 },
    { version: 13, statements: migrationV13 },
    { version: 14, statements: migrationV14 },
    { version: 15, statements: migrationV15 },
  ];

  for (const migration of migrations) {
    if (migration.version > current) {
      await runTransaction(migration.statements);
      await setSchemaVersion(migration.version);
    }
  }
}

export function resetDatabaseConnection() {
  database = null;
}

export async function getCurrentSchemaVersion() {
  return getSchemaVersion();
}

export function runInTransaction(
  actions: (tx: SQLite.SQLTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => {
        tx.executeSql('PRAGMA foreign_keys = ON;');
        actions(tx);
      },
      (error) => reject(error),
      () => resolve(),
    );
  });
}

export { getDatabase };
