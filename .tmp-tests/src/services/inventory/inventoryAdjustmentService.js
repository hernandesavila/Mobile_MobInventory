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
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setInventoryAdjustmentDeps = __setInventoryAdjustmentDeps;
exports.applyInventoryAdjustments = applyInventoryAdjustments;
var db_1 = require("@/db");
var assetRepository_1 = require("@/repositories/assetRepository");
var inventoryRepository_1 = require("@/repositories/inventoryRepository");
var sessionRepository_1 = require("@/repositories/sessionRepository");
var inventoryCompareService_1 = require("@/services/inventory/inventoryCompareService");
var settingsStorage_1 = require("@/services/settings/settingsStorage");
var rules_1 = require("./rules");
function fetchDiffs(inventoryId) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at\n     FROM inventory_diff WHERE inventory_id = ?", [inventoryId])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows._array.map(function (row) { return ({
                            id: row.id,
                            inventoryId: row.inventory_id,
                            assetId: row.asset_id,
                            assetNumber: row.asset_number,
                            assetName: row.asset_name,
                            areaId: row.area_id,
                            l0Quantity: row.l0_quantity,
                            l1Quantity: row.l1_quantity,
                            l2Quantity: row.l2_quantity,
                            finalQuantity: row.final_quantity,
                            resolutionChoice: row.resolution_choice,
                            resolutionNote: row.resolution_note,
                            status: row.status,
                            createdAt: row.created_at,
                        }); })];
            }
        });
    });
}
var deps = {
    getInventoryById: inventoryRepository_1.getInventoryById,
    loadSettings: settingsStorage_1.loadSettings,
    loadSession: sessionRepository_1.loadSession,
    fetchDiffs: fetchDiffs,
    runInTransaction: db_1.runInTransaction,
    computeInventoryDiff: inventoryCompareService_1.computeInventoryDiff,
    generateAssetNumberWithFormat: assetRepository_1.generateAssetNumberWithFormat,
};
function __setInventoryAdjustmentDeps(overrides) {
    deps = __assign(__assign({}, deps), overrides);
}
function applyInventoryAdjustments(inventoryId) {
    return __awaiter(this, void 0, void 0, function () {
        var inventory, settings, session, diffs, _i, diffs_1, diff, _a, now;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, deps.getInventoryById(inventoryId)];
                case 1:
                    inventory = _b.sent();
                    if (!inventory) {
                        throw new Error('Inventario nao encontrado.');
                    }
                    if (inventory.status === 'finished') {
                        throw new Error('Inventario ja finalizado.');
                    }
                    return [4 /*yield*/, deps.loadSettings()];
                case 2:
                    settings = _b.sent();
                    return [4 /*yield*/, deps.loadSession()];
                case 3:
                    session = _b.sent();
                    return [4 /*yield*/, deps.fetchDiffs(inventoryId)];
                case 4:
                    diffs = _b.sent();
                    if (!diffs.length) {
                        throw new Error('Nenhuma divergencia para ajustar.');
                    }
                    if (diffs.some(function (d) { return !d.resolutionChoice; })) {
                        throw new Error('Defina L1/L2/ignorar para todos os itens antes de aplicar.');
                    }
                    _i = 0, diffs_1 = diffs;
                    _b.label = 5;
                case 5:
                    if (!(_i < diffs_1.length)) return [3 /*break*/, 9];
                    diff = diffs_1[_i];
                    if (!(diff.status === 'NEW' && !diff.assetNumber && settings.allowCreateNew)) return [3 /*break*/, 7];
                    _a = diff;
                    return [4 /*yield*/, deps.generateAssetNumberWithFormat(settings.patrimonyFormat)];
                case 6:
                    _a.assetNumber = _b.sent();
                    _b.label = 7;
                case 7:
                    if (diff.status === 'NEW' &&
                        settings.allowCreateNew &&
                        diff.resolutionChoice !== 'IGNORE' &&
                        !diff.areaId &&
                        !inventory.areaId) {
                        throw new Error('Itens novos precisam de uma area para serem criados no ajuste.');
                    }
                    _b.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 5];
                case 9:
                    now = Date.now();
                    return [4 /*yield*/, deps.runInTransaction(function (tx) {
                            var _a;
                            var userId = (_a = session === null || session === void 0 ? void 0 : session.userId) !== null && _a !== void 0 ? _a : null;
                            diffs.forEach(function (diff) {
                                var _a, _b, _c, _d, _e, _f;
                                var decision = (_a = diff.resolutionChoice) !== null && _a !== void 0 ? _a : 'L1';
                                var derived = (0, rules_1.deriveFinalQuantity)(diff, settings);
                                var finalQty = (_b = derived !== null && derived !== void 0 ? derived : diff.finalQuantity) !== null && _b !== void 0 ? _b : 0;
                                var note = (_c = diff.resolutionNote) !== null && _c !== void 0 ? _c : null;
                                if (diff.status === 'NEW') {
                                    if (!settings.allowCreateNew || decision === 'IGNORE') {
                                        tx.executeSql('UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ? WHERE id = ?', [0, decision, note, diff.id]);
                                        tx.executeSql("INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)\n             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                            inventoryId,
                                            null,
                                            (_d = diff.assetNumber) !== null && _d !== void 0 ? _d : null,
                                            0,
                                            0,
                                            decision,
                                            note,
                                            userId,
                                            now,
                                        ]);
                                        return;
                                    }
                                    var areaId = (_f = (_e = diff.areaId) !== null && _e !== void 0 ? _e : inventory.areaId) !== null && _f !== void 0 ? _f : null;
                                    if (!areaId) {
                                        throw new Error('Area obrigatoria para criar item novo no ajuste.');
                                    }
                                    var num_1 = diff.assetNumber;
                                    tx.executeSql("INSERT INTO asset_items (asset_number, name, description, quantity, unit_value, area_id, created_at, updated_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [num_1, diff.assetName, null, finalQty, null, areaId, now, now], function (_, result) {
                                        var _a;
                                        var assetId = (_a = result.insertId) !== null && _a !== void 0 ? _a : null;
                                        tx.executeSql('UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = ? WHERE id = ?', [finalQty, decision, note, assetId, diff.id]);
                                        tx.executeSql("INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)\n               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [inventoryId, assetId, num_1, 0, finalQty, decision, note, userId, now]);
                                    });
                                    return;
                                }
                                var applyToAsset = function (assetId, assetNumber, beforeQty) {
                                    tx.executeSql('UPDATE asset_items SET quantity = ?, updated_at = ? WHERE id = ?', [finalQty, now, assetId]);
                                    tx.executeSql('UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = ? WHERE id = ?', [finalQty, decision, note, assetId, diff.id]);
                                    tx.executeSql("INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                        inventoryId,
                                        assetId,
                                        assetNumber,
                                        beforeQty,
                                        finalQty,
                                        decision,
                                        note,
                                        userId,
                                        now,
                                    ]);
                                };
                                if (diff.assetId) {
                                    tx.executeSql('SELECT quantity FROM asset_items WHERE id = ? LIMIT 1', [diff.assetId], function (_t, res) {
                                        var _a, _b;
                                        var beforeQty = res.rows.length
                                            ? ((_a = res.rows.item(0).quantity) !== null && _a !== void 0 ? _a : 0)
                                            : 0;
                                        applyToAsset(diff.assetId, (_b = diff.assetNumber) !== null && _b !== void 0 ? _b : null, beforeQty);
                                    });
                                    return;
                                }
                                if (diff.assetNumber) {
                                    tx.executeSql('SELECT id, quantity FROM asset_items WHERE asset_number = ? LIMIT 1', [diff.assetNumber], function (_t, res) {
                                        var _a, _b;
                                        if (!res.rows.length) {
                                            tx.executeSql('UPDATE inventory_diff SET final_quantity = ?, resolution_choice = ?, resolution_note = ?, asset_id = NULL WHERE id = ?', [finalQty, decision, note, diff.id]);
                                            tx.executeSql("INSERT INTO inventory_adjustment_log (inventory_id, asset_id, asset_number, before_qty, after_qty, decision, note, user_id, created_at)\n                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                                inventoryId,
                                                null,
                                                diff.assetNumber,
                                                0,
                                                finalQty,
                                                decision,
                                                note,
                                                userId,
                                                now,
                                            ]);
                                            return;
                                        }
                                        var row = res.rows.item(0);
                                        var beforeQty = (_a = row.quantity) !== null && _a !== void 0 ? _a : 0;
                                        applyToAsset(row.id, (_b = diff.assetNumber) !== null && _b !== void 0 ? _b : null, beforeQty);
                                    });
                                }
                            });
                            tx.executeSql('UPDATE inventories SET status = ?, finished_at = ? WHERE id = ?', [
                                'finished',
                                now,
                                inventoryId,
                            ]);
                        })];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, deps.computeInventoryDiff(inventoryId)];
                case 11:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
