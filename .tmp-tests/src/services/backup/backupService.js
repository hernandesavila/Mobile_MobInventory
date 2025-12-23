"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setBackupDeps = __setBackupDeps;
exports.createBackupFile = createBackupFile;
exports.pickBackupFile = pickBackupFile;
exports.readBackupFromUri = readBackupFromUri;
exports.restoreBackup = restoreBackup;
var Crypto = __importStar(require("expo-crypto"));
var DocumentPicker = __importStar(require("expo-document-picker"));
var FileSystem = __importStar(require("expo-file-system"));
var Sharing = __importStar(require("expo-sharing"));
var db_1 = require("@/db");
var logger_1 = require("@/services/logger");
var deps = {
    runInTransaction: db_1.runInTransaction,
    getCurrentSchemaVersion: db_1.getCurrentSchemaVersion,
};
function __setBackupDeps(overrides) {
    deps = __assign(__assign({}, deps), overrides);
}
var BACKUP_TYPE = 'patrimonio-simples-backup';
var ASSET_SEQUENCE_NAME = 'asset_number';
function checksumData(data) {
    return __awaiter(this, void 0, void 0, function () {
        var serialized;
        return __generator(this, function (_a) {
            serialized = JSON.stringify(data);
            return [2 /*return*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, serialized)];
        });
    });
}
function normalizeData(data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        users: (_a = data.users) !== null && _a !== void 0 ? _a : [],
        areas: (_b = data.areas) !== null && _b !== void 0 ? _b : [],
        assets: (_c = data.assets) !== null && _c !== void 0 ? _c : [],
        sequences: (_d = data.sequences) !== null && _d !== void 0 ? _d : [],
        inventories: (_e = data.inventories) !== null && _e !== void 0 ? _e : [],
        inventorySnapshots: (_f = data.inventorySnapshots) !== null && _f !== void 0 ? _f : [],
        inventoryReads: (_g = data.inventoryReads) !== null && _g !== void 0 ? _g : [],
        inventoryDiffs: (_h = data.inventoryDiffs) !== null && _h !== void 0 ? _h : [],
        adjustmentLogs: (_j = data.adjustmentLogs) !== null && _j !== void 0 ? _j : [],
    };
}
function normalizeAssetSequence(data) {
    var _a, _b;
    var current = (_b = (_a = data.sequences.find(function (seq) { return seq.name === ASSET_SEQUENCE_NAME; })) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0;
    var maxFromAssets = data.assets.reduce(function (max, item) {
        var match = item.assetNumber.match(/(\d+)$/);
        if (!match)
            return max;
        var parsed = Number.parseInt(match[1], 10);
        if (Number.isNaN(parsed))
            return max;
        return Math.max(max, parsed);
    }, 0);
    var safeValue = Math.max(current, maxFromAssets);
    var withoutAssetSeq = data.sequences.filter(function (seq) { return seq.name !== ASSET_SEQUENCE_NAME; });
    return __spreadArray(__spreadArray([], withoutAssetSeq, true), [{ name: ASSET_SEQUENCE_NAME, value: safeValue }], false);
}
function fetchBackupData() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, usersResult, areasResult, assetsResult, sequencesResult, inventoriesResult, snapshotResult, readResult, diffResult, adjustmentResult;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        (0, db_1.query)('SELECT id, username, password_hash, password_salt, must_change_password, created_at FROM users'),
                        (0, db_1.query)('SELECT id, name, description, active, created_at FROM areas'),
                        (0, db_1.query)('SELECT id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at FROM asset_items'),
                        (0, db_1.query)('SELECT name, value FROM sequences'),
                        (0, db_1.query)('SELECT id, name, scope_type, area_id, status, created_at, finished_at FROM inventories'),
                        (0, db_1.query)('SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at FROM inventory_snapshot_items'),
                        (0, db_1.query)('SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at FROM inventory_read_items'),
                        (0, db_1.query)('SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at FROM inventory_diff'),
                        (0, db_1.query)('SELECT id, inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at FROM inventory_adjustment_log'),
                    ])];
                case 1:
                    _a = _b.sent(), usersResult = _a[0], areasResult = _a[1], assetsResult = _a[2], sequencesResult = _a[3], inventoriesResult = _a[4], snapshotResult = _a[5], readResult = _a[6], diffResult = _a[7], adjustmentResult = _a[8];
                    return [2 /*return*/, {
                            users: usersResult.rows._array.map(function (row) { return ({
                                id: row.id,
                                username: row.username,
                                passwordHash: row.password_hash,
                                passwordSalt: row.password_salt,
                                mustChangePassword: Boolean(row.must_change_password),
                                createdAt: row.created_at,
                            }); }),
                            areas: areasResult.rows._array.map(function (row) {
                                var _a;
                                return ({
                                    id: row.id,
                                    name: row.name,
                                    description: row.description,
                                    active: Boolean((_a = row.active) !== null && _a !== void 0 ? _a : 1),
                                    createdAt: row.created_at,
                                });
                            }),
                            assets: assetsResult.rows._array.map(function (row) {
                                var _a, _b;
                                return ({
                                    id: row.id,
                                    assetNumber: row.asset_number,
                                    name: row.name,
                                    description: row.description,
                                    quantity: (_a = row.quantity) !== null && _a !== void 0 ? _a : 0,
                                    unitValue: row.unit_value,
                                    areaId: row.area_id,
                                    createdAt: row.created_at,
                                    updatedAt: (_b = row.updated_at) !== null && _b !== void 0 ? _b : row.created_at,
                                });
                            }),
                            sequences: sequencesResult.rows._array.map(function (row) { return ({
                                name: row.name,
                                value: row.value,
                            }); }),
                            inventories: inventoriesResult.rows._array.map(function (row) { return ({
                                id: row.id,
                                name: row.name,
                                scopeType: row.scope_type,
                                areaId: row.area_id,
                                status: row.status,
                                createdAt: row.created_at,
                                finishedAt: row.finished_at,
                            }); }),
                            inventorySnapshots: snapshotResult.rows._array.map(function (row) {
                                var _a;
                                return ({
                                    id: row.id,
                                    inventoryId: row.inventory_id,
                                    assetId: row.asset_id,
                                    assetNumber: row.asset_number,
                                    assetName: row.asset_name,
                                    areaId: row.area_id,
                                    quantity: (_a = row.quantity) !== null && _a !== void 0 ? _a : 0,
                                    createdAt: row.created_at,
                                });
                            }),
                            inventoryReads: readResult.rows._array.map(function (row) {
                                var _a;
                                return ({
                                    id: row.id,
                                    inventoryId: row.inventory_id,
                                    assetId: row.asset_id,
                                    assetNumber: row.asset_number,
                                    assetName: row.asset_name,
                                    areaId: row.area_id,
                                    isNewItem: Boolean(row.is_new_item),
                                    quantity: (_a = row.quantity) !== null && _a !== void 0 ? _a : 0,
                                    createdAt: row.created_at,
                                });
                            }),
                            inventoryDiffs: diffResult.rows._array.map(function (row) {
                                var _a, _b, _c, _d;
                                return ({
                                    id: row.id,
                                    inventoryId: row.inventory_id,
                                    assetId: row.asset_id,
                                    assetNumber: row.asset_number,
                                    assetName: row.asset_name,
                                    areaId: row.area_id,
                                    l0Quantity: (_a = row.l0_quantity) !== null && _a !== void 0 ? _a : 0,
                                    l1Quantity: (_b = row.l1_quantity) !== null && _b !== void 0 ? _b : 0,
                                    l2Quantity: (_c = row.l2_quantity) !== null && _c !== void 0 ? _c : 0,
                                    finalQuantity: (_d = row.final_quantity) !== null && _d !== void 0 ? _d : null,
                                    resolutionChoice: row.resolution_choice,
                                    resolutionNote: row.resolution_note,
                                    status: row.status,
                                    createdAt: row.created_at,
                                });
                            }),
                            adjustmentLogs: adjustmentResult.rows._array.map(function (row) { return ({
                                id: row.id,
                                inventoryId: row.inventory_id,
                                assetId: row.asset_id,
                                assetNumber: row.asset_number,
                                beforeQty: row.before_qty,
                                afterQty: row.after_qty,
                                decision: row.decision,
                                note: row.note,
                                userId: row.user_id,
                                createdAt: row.created_at,
                            }); }),
                        }];
            }
        });
    });
}
function createBackupFile() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, schemaVersion, data, normalized, payload, dir, stamp, fileName, uri, error_1;
        var _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 5, , 7]);
                    return [4 /*yield*/, Promise.all([
                            deps.getCurrentSchemaVersion(),
                            fetchBackupData(),
                        ])];
                case 1:
                    _a = _e.sent(), schemaVersion = _a[0], data = _a[1];
                    normalized = normalizeData(data);
                    _b = {
                        type: BACKUP_TYPE,
                        schemaVersion: schemaVersion,
                        generatedAt: Date.now()
                    };
                    return [4 /*yield*/, checksumData(normalized)];
                case 2:
                    payload = (_b.checksum = _e.sent(),
                        _b.data = normalized,
                        _b);
                    dir = (_d = (_c = FileSystem.documentDirectory) !== null && _c !== void 0 ? _c : FileSystem.cacheDirectory) !== null && _d !== void 0 ? _d : '';
                    if (!dir) {
                        throw new Error('Nao foi possivel acessar armazenamento local.');
                    }
                    stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
                    fileName = "backup-".concat(stamp, ".json");
                    uri = "".concat(dir).concat(fileName);
                    return [4 /*yield*/, FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
                            encoding: FileSystem.EncodingType.UTF8,
                        })];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, Sharing.shareAsync(uri, {
                            dialogTitle: 'Exportar backup',
                            mimeType: 'application/json',
                        })];
                case 4:
                    _e.sent();
                    return [2 /*return*/, { uri: uri, fileName: fileName }];
                case 5:
                    error_1 = _e.sent();
                    return [4 /*yield*/, (0, logger_1.logError)('backup_export_failed', {
                            message: error_1 instanceof Error ? error_1.message : String(error_1),
                        })];
                case 6:
                    _e.sent();
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function pickBackupFile() {
    return __awaiter(this, void 0, void 0, function () {
        var result, uri;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, DocumentPicker.getDocumentAsync({
                        type: 'application/json',
                        copyToCacheDirectory: true,
                    })];
                case 1:
                    result = _c.sent();
                    if (result.canceled) {
                        return [2 /*return*/, null];
                    }
                    uri = (_b = (_a = result.assets) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri;
                    if (!uri) {
                        throw new Error('Arquivo selecionado esta invalido.');
                    }
                    return [2 /*return*/, readBackupFromUri(uri)];
            }
        });
    });
}
function readBackupFromUri(uri) {
    return __awaiter(this, void 0, void 0, function () {
        var content, parsed, normalized, computedChecksum, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    return [4 /*yield*/, FileSystem.readAsStringAsync(uri, {
                            encoding: FileSystem.EncodingType.UTF8,
                        })];
                case 1:
                    content = _a.sent();
                    parsed = JSON.parse(content);
                    if (!parsed || parsed.type !== BACKUP_TYPE) {
                        throw new Error('Arquivo de backup nao reconhecido.');
                    }
                    if (!parsed.data) {
                        throw new Error('Estrutura do backup invalida.');
                    }
                    normalized = normalizeData(parsed.data);
                    return [4 /*yield*/, checksumData(normalized)];
                case 2:
                    computedChecksum = _a.sent();
                    if (computedChecksum !== parsed.checksum) {
                        throw new Error('Checksum invalido: arquivo corrompido ou alterado.');
                    }
                    return [2 /*return*/, __assign(__assign({}, parsed), { data: normalized })];
                case 3:
                    error_2 = _a.sent();
                    return [4 /*yield*/, (0, logger_1.logError)('backup_read_failed', {
                            message: error_2 instanceof Error ? error_2.message : String(error_2),
                        })];
                case 4:
                    _a.sent();
                    throw error_2 instanceof Error ? error_2 : new Error('Nao foi possivel ler o arquivo.');
                case 5: return [2 /*return*/];
            }
        });
    });
}
function restoreBackup(backup) {
    return __awaiter(this, void 0, void 0, function () {
        var normalized, sequences, currentVersion, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    normalized = normalizeData(backup.data);
                    sequences = normalizeAssetSequence(normalized);
                    return [4 /*yield*/, deps.getCurrentSchemaVersion()];
                case 1:
                    currentVersion = _a.sent();
                    if (backup.schemaVersion > currentVersion) {
                        throw new Error('Backup criado com versao de schema mais nova. Atualize o app antes de restaurar.');
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, deps.runInTransaction(function (tx) {
                            var _a;
                            tx.executeSql('DELETE FROM asset_items');
                            tx.executeSql('DELETE FROM areas');
                            tx.executeSql('DELETE FROM users');
                            tx.executeSql('DELETE FROM sequences');
                            tx.executeSql('DELETE FROM app_log');
                            tx.executeSql('DELETE FROM inventory_read_items');
                            tx.executeSql('DELETE FROM inventory_snapshot_items');
                            tx.executeSql('DELETE FROM inventory_diff');
                            tx.executeSql('DELETE FROM inventory_adjustment_log');
                            tx.executeSql('DELETE FROM inventories');
                            tx.executeSql('DELETE FROM schema_version');
                            normalized.users.forEach(function (user) {
                                tx.executeSql("INSERT INTO users (id, username, password_hash, password_salt, must_change_password, created_at)\n           VALUES (?, ?, ?, ?, ?, ?)", [
                                    user.id,
                                    user.username,
                                    user.passwordHash,
                                    user.passwordSalt,
                                    user.mustChangePassword ? 1 : 0,
                                    user.createdAt,
                                ]);
                            });
                            normalized.areas.forEach(function (area) {
                                var _a;
                                tx.executeSql('INSERT INTO areas (id, name, description, active, created_at) VALUES (?, ?, ?, ?, ?)', [
                                    area.id,
                                    area.name,
                                    (_a = area.description) !== null && _a !== void 0 ? _a : null,
                                    area.active ? 1 : 0,
                                    area.createdAt,
                                ]);
                            });
                            normalized.assets.forEach(function (asset) {
                                var _a, _b, _c, _d;
                                tx.executeSql("INSERT INTO asset_items (id, asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                    asset.id,
                                    asset.assetNumber,
                                    asset.name,
                                    (_a = asset.description) !== null && _a !== void 0 ? _a : null,
                                    (_b = asset.quantity) !== null && _b !== void 0 ? _b : 0,
                                    (_c = asset.unitValue) !== null && _c !== void 0 ? _c : null,
                                    asset.areaId,
                                    asset.createdAt,
                                    (_d = asset.updatedAt) !== null && _d !== void 0 ? _d : asset.createdAt,
                                ]);
                            });
                            sequences.forEach(function (seq) {
                                tx.executeSql('INSERT INTO sequences (name, value) VALUES (?, ?)', [
                                    seq.name,
                                    seq.value,
                                ]);
                            });
                            normalized.inventories.forEach(function (inv) {
                                var _a, _b;
                                tx.executeSql("INSERT INTO inventories (id, name, scope_type, area_id, status, created_at, finished_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?)", [
                                    inv.id,
                                    inv.name,
                                    inv.scopeType,
                                    (_a = inv.areaId) !== null && _a !== void 0 ? _a : null,
                                    inv.status,
                                    inv.createdAt,
                                    (_b = inv.finishedAt) !== null && _b !== void 0 ? _b : null,
                                ]);
                            });
                            normalized.inventorySnapshots.forEach(function (snap) {
                                var _a;
                                tx.executeSql("INSERT INTO inventory_snapshot_items (id, inventory_id, asset_id, asset_number, asset_name, area_id, quantity, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                                    snap.id,
                                    snap.inventoryId,
                                    snap.assetId,
                                    snap.assetNumber,
                                    snap.assetName,
                                    snap.areaId,
                                    (_a = snap.quantity) !== null && _a !== void 0 ? _a : 0,
                                    snap.createdAt,
                                ]);
                            });
                            normalized.inventoryReads.forEach(function (read) {
                                var _a, _b, _c, _d;
                                tx.executeSql("INSERT INTO inventory_read_items (id, inventory_id, asset_id, asset_number, asset_name, area_id, is_new_item, quantity, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                    read.id,
                                    read.inventoryId,
                                    (_a = read.assetId) !== null && _a !== void 0 ? _a : null,
                                    (_b = read.assetNumber) !== null && _b !== void 0 ? _b : null,
                                    read.assetName,
                                    (_c = read.areaId) !== null && _c !== void 0 ? _c : null,
                                    read.isNewItem ? 1 : 0,
                                    (_d = read.quantity) !== null && _d !== void 0 ? _d : 0,
                                    read.createdAt,
                                ]);
                            });
                            normalized.inventoryDiffs.forEach(function (diff) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                                tx.executeSql("INSERT INTO inventory_diff (id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                    diff.id,
                                    diff.inventoryId,
                                    (_a = diff.assetId) !== null && _a !== void 0 ? _a : null,
                                    (_b = diff.assetNumber) !== null && _b !== void 0 ? _b : null,
                                    diff.assetName,
                                    (_c = diff.areaId) !== null && _c !== void 0 ? _c : null,
                                    (_d = diff.l0Quantity) !== null && _d !== void 0 ? _d : 0,
                                    (_e = diff.l1Quantity) !== null && _e !== void 0 ? _e : 0,
                                    (_f = diff.l2Quantity) !== null && _f !== void 0 ? _f : 0,
                                    (_g = diff.finalQuantity) !== null && _g !== void 0 ? _g : null,
                                    (_h = diff.resolutionChoice) !== null && _h !== void 0 ? _h : null,
                                    (_j = diff.resolutionNote) !== null && _j !== void 0 ? _j : null,
                                    diff.status,
                                    (_k = diff.createdAt) !== null && _k !== void 0 ? _k : Date.now(),
                                ]);
                            });
                            (_a = normalized.adjustmentLogs) === null || _a === void 0 ? void 0 : _a.forEach(function (log) {
                                var _a, _b, _c, _d, _e, _f, _g;
                                tx.executeSql("INSERT INTO inventory_adjustment_log (id, inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                    log.id,
                                    log.inventoryId,
                                    (_a = log.assetId) !== null && _a !== void 0 ? _a : null,
                                    (_b = log.assetNumber) !== null && _b !== void 0 ? _b : null,
                                    (_c = log.beforeQty) !== null && _c !== void 0 ? _c : null,
                                    (_d = log.afterQty) !== null && _d !== void 0 ? _d : null,
                                    log.decision,
                                    (_e = log.note) !== null && _e !== void 0 ? _e : null,
                                    (_f = log.userId) !== null && _f !== void 0 ? _f : null,
                                    (_g = log.createdAt) !== null && _g !== void 0 ? _g : Date.now(),
                                ]);
                            });
                            tx.executeSql('INSERT INTO schema_version (version) VALUES (?)', [currentVersion]);
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    return [4 /*yield*/, (0, logger_1.logError)('backup_restore_failed', {
                            message: error_3 instanceof Error ? error_3.message : String(error_3),
                        })];
                case 5:
                    _a.sent();
                    throw error_3;
                case 6: return [2 /*return*/];
            }
        });
    });
}
