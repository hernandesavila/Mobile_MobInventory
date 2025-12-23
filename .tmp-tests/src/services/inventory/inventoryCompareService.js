"use strict";
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
exports.__setInventoryCompareDeps = __setInventoryCompareDeps;
exports.computeInventoryDiff = computeInventoryDiff;
exports.listInventoryDiffs = listInventoryDiffs;
exports.updateDiffL2Quantity = updateDiffL2Quantity;
exports.saveDiffResolution = saveDiffResolution;
exports.hasInventoryDivergences = hasInventoryDivergences;
var db_1 = require("@/db");
var diffUtils_1 = require("./diffUtils");
var executeFn = db_1.execute;
function __setInventoryCompareDeps(overrides) {
    if (overrides.execute) {
        executeFn = overrides.execute;
    }
}
function mapDiff(row) {
    var _a, _b, _c;
    return {
        id: row.id,
        inventoryId: row.inventory_id,
        assetId: row.asset_id,
        assetNumber: row.asset_number,
        assetName: row.asset_name,
        areaId: row.area_id,
        l0Quantity: row.l0_quantity,
        l1Quantity: row.l1_quantity,
        l2Quantity: (_a = row.l2_quantity) !== null && _a !== void 0 ? _a : undefined,
        finalQuantity: (_b = row.final_quantity) !== null && _b !== void 0 ? _b : undefined,
        resolutionChoice: row.resolution_choice,
        resolutionNote: (_c = row.resolution_note) !== null && _c !== void 0 ? _c : undefined,
        status: row.status,
        createdAt: row.created_at,
    };
}
function computeInventoryDiff(inventoryId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, snapshotResult, readResult, now, diffs, divergentCount;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        (0, db_1.query)("SELECT asset_id, asset_number, asset_name, area_id, quantity FROM inventory_snapshot_items WHERE inventory_id = ?", [inventoryId]),
                        (0, db_1.query)("SELECT asset_id, asset_number, asset_name, area_id, quantity, is_new_item FROM inventory_read_items WHERE inventory_id = ?", [inventoryId]),
                    ])];
                case 1:
                    _a = _b.sent(), snapshotResult = _a[0], readResult = _a[1];
                    now = Date.now();
                    diffs = (0, diffUtils_1.buildDiffsFromSnapshotAndReads)(snapshotResult.rows._array, readResult.rows._array);
                    return [4 /*yield*/, (0, db_1.runInTransaction)(function (tx) {
                            tx.executeSql('DELETE FROM inventory_diff WHERE inventory_id = ?', [inventoryId]);
                            diffs.forEach(function (diff) {
                                tx.executeSql("INSERT INTO inventory_diff (inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at)\n         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
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
                                ]);
                            });
                        })];
                case 2:
                    _b.sent();
                    divergentCount = diffs.filter(function (d) { return d.status !== 'OK'; }).length;
                    return [2 /*return*/, { total: diffs.length, divergent: divergentCount }];
            }
        });
    });
}
function listInventoryDiffs(inventoryId, filters) {
    return __awaiter(this, void 0, void 0, function () {
        var where, params, whereClause, offset, listResult, countResult, total, divergent;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    where = ['inventory_id = ?'];
                    params = [inventoryId];
                    if (filters.onlyDivergent) {
                        where.push("status != 'OK'");
                    }
                    if ((_a = filters.search) === null || _a === void 0 ? void 0 : _a.trim()) {
                        where.push('(asset_name LIKE ? COLLATE NOCASE OR asset_number LIKE ?)');
                        params.push("%".concat(filters.search.trim(), "%"), "%".concat(filters.search.trim(), "%"));
                    }
                    whereClause = where.length ? "WHERE ".concat(where.join(' AND ')) : '';
                    offset = (filters.page - 1) * filters.pageSize;
                    return [4 /*yield*/, (0, db_1.query)("SELECT id, inventory_id, asset_id, asset_number, asset_name, area_id, l0_quantity, l1_quantity, l2_quantity, final_quantity, resolution_choice, resolution_note, status, created_at\n     FROM inventory_diff\n     ".concat(whereClause, "\n     ORDER BY asset_name COLLATE NOCASE ASC\n     LIMIT ? OFFSET ?"), __spreadArray(__spreadArray([], params, true), [filters.pageSize, offset], false))];
                case 1:
                    listResult = _d.sent();
                    return [4 /*yield*/, (0, db_1.query)("SELECT COUNT(*) as total, SUM(CASE WHEN status != 'OK' THEN 1 ELSE 0 END) as divergent\n     FROM inventory_diff ".concat(whereClause), params)];
                case 2:
                    countResult = _d.sent();
                    total = (_b = countResult.rows.item(0)) === null || _b === void 0 ? void 0 : _b.total;
                    divergent = (_c = countResult.rows.item(0)) === null || _c === void 0 ? void 0 : _c.divergent;
                    return [2 /*return*/, {
                            items: listResult.rows._array.map(function (row) { return mapDiff(row); }),
                            total: total !== null && total !== void 0 ? total : 0,
                            divergent: divergent !== null && divergent !== void 0 ? divergent : 0,
                        }];
            }
        });
    });
}
function updateDiffL2Quantity(diffId, l2Quantity) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, executeFn("UPDATE inventory_diff\n     SET l2_quantity = ?,\n         final_quantity = CASE\n           WHEN resolution_choice = 'L2' THEN ?\n           WHEN final_quantity IS NULL THEN ?\n           ELSE final_quantity\n         END\n     WHERE id = ?", [l2Quantity, l2Quantity, l2Quantity, diffId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function saveDiffResolution(params) {
    return __awaiter(this, void 0, void 0, function () {
        var finalQuantity, safeFinal;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!params.choice) {
                        throw new Error('Escolha L1 ou L2 antes de salvar.');
                    }
                    finalQuantity = params.choice === 'L2'
                        ? ((_a = params.l2Quantity) !== null && _a !== void 0 ? _a : params.finalQuantity)
                        : params.choice === 'L1'
                            ? ((_b = params.l1Quantity) !== null && _b !== void 0 ? _b : params.finalQuantity)
                            : params.finalQuantity;
                    safeFinal = finalQuantity !== null && finalQuantity !== void 0 ? finalQuantity : 0;
                    return [4 /*yield*/, executeFn('UPDATE inventory_diff SET resolution_choice = ?, final_quantity = ?, resolution_note = ? WHERE id = ?', [params.choice, safeFinal, (_c = params.note) !== null && _c !== void 0 ? _c : null, params.diffId])];
                case 1:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function hasInventoryDivergences(inventoryId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, divergent;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("SELECT COUNT(*) as divergent FROM inventory_diff WHERE inventory_id = ? AND status != 'OK'", [inventoryId])];
                case 1:
                    result = _b.sent();
                    divergent = (_a = result.rows.item(0)) === null || _a === void 0 ? void 0 : _a.divergent;
                    return [2 /*return*/, (divergent !== null && divergent !== void 0 ? divergent : 0) > 0];
            }
        });
    });
}
