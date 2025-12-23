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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure native modules are not loaded during unit tests
process.env.UNIT_TEST = '1';
var assert_1 = __importDefault(require("assert"));
var backupService_1 = require("../src/services/backup/backupService");
var diffUtils_1 = require("../src/services/inventory/diffUtils");
var inventoryAdjustmentService_1 = require("../src/services/inventory/inventoryAdjustmentService");
var inventoryCompareService_1 = require("../src/services/inventory/inventoryCompareService");
var rules_1 = require("../src/services/inventory/rules");
var numeric_1 = require("../src/utils/numeric");
var patrimony_1 = require("../src/utils/patrimony");
function testPatrimonyFormat() {
    var num = (0, patrimony_1.formatPatrimonyNumber)(1);
    assert_1.default.strictEqual(num, 'PAT-000001');
    var custom = (0, patrimony_1.formatPatrimonyNumber)(42, 'ITEM-{seq}');
    assert_1.default.strictEqual(custom, 'ITEM-000042');
}
function testBuildDiffs() {
    var diffs = (0, diffUtils_1.buildDiffsFromSnapshotAndReads)([
        { asset_id: 1, asset_number: 'PAT-1', asset_name: 'PC', area_id: 1, quantity: 5 },
        { asset_id: 2, asset_number: 'PAT-2', asset_name: 'Mesa', area_id: 1, quantity: 2 },
    ], [
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
    ]);
    var divergent = diffs.find(function (d) { return d.asset_number === 'PAT-1'; });
    assert_1.default.ok(divergent);
    assert_1.default.strictEqual(divergent === null || divergent === void 0 ? void 0 : divergent.status, 'DIVERGENT');
    var missing = diffs.find(function (d) { return d.asset_number === 'PAT-2'; });
    assert_1.default.ok(missing);
    assert_1.default.strictEqual(missing === null || missing === void 0 ? void 0 : missing.status, 'MISSING');
    var added = diffs.find(function (d) { return d.status === 'NEW'; });
    assert_1.default.ok(added);
}
function testDeriveFinalQuantity() {
    var settings = {
        itemsPerPage: 20,
        missingRule: 'zero',
        allowCreateNew: true,
        patrimonyFormat: 'PAT-{seq}',
    };
    var diff = {
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
    assert_1.default.strictEqual((0, rules_1.deriveFinalQuantity)(diff, settings), 3);
    var missing = __assign(__assign({}, diff), { status: 'MISSING', l1Quantity: 0 });
    assert_1.default.strictEqual((0, rules_1.deriveFinalQuantity)(missing, settings), 0);
    var missingKeep = __assign({}, missing);
    var keepSettings = __assign(__assign({}, settings), { missingRule: 'keep' });
    assert_1.default.strictEqual((0, rules_1.deriveFinalQuantity)(missingKeep, keepSettings), 5);
    var l2Choice = __assign(__assign({}, diff), { l2Quantity: 10, resolutionChoice: 'L2' });
    assert_1.default.strictEqual((0, rules_1.deriveFinalQuantity)(l2Choice, settings), 10);
    var ignoreChoice = __assign(__assign({}, diff), { resolutionChoice: 'IGNORE' });
    assert_1.default.strictEqual((0, rules_1.deriveFinalQuantity)(ignoreChoice, settings), 5);
}
function testNumericMasks() {
    assert_1.default.strictEqual((0, numeric_1.formatIntegerInput)('0012a'), '12');
    assert_1.default.strictEqual((0, numeric_1.formatIntegerInput)(''), '0');
    assert_1.default.strictEqual((0, numeric_1.formatCurrencyInput)(''), '');
    assert_1.default.strictEqual((0, numeric_1.formatCurrencyInput)('5'), '0.05');
    assert_1.default.strictEqual((0, numeric_1.formatCurrencyInput)('1234'), '12.34');
    assert_1.default.strictEqual((0, numeric_1.formatCurrencyInput)('0099'), '0.99');
    assert_1.default.strictEqual((0, numeric_1.applyThousandSeparator)('1234.50'), '1.234,50');
}
function testApplyInventoryAdjustments() {
    return __awaiter(this, void 0, void 0, function () {
        var now, diffs, executed, tx, computeCalled;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = Date.now();
                    diffs = [
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
                    executed = [];
                    tx = {
                        executeSql: function (sql, params, success) {
                            executed.push({ sql: sql, params: params });
                            if (sql.startsWith('SELECT quantity FROM asset_items')) {
                                success === null || success === void 0 ? void 0 : success(tx, { rows: { length: 1, item: function () { return ({ quantity: 5 }); } } });
                            }
                            else if (sql.startsWith('SELECT id, quantity FROM asset_items')) {
                                success === null || success === void 0 ? void 0 : success(tx, { rows: { length: 1, item: function () { return ({ id: 10, quantity: 5 }); } } });
                            }
                            else if (sql.startsWith('INSERT INTO asset_items')) {
                                success === null || success === void 0 ? void 0 : success(tx, { insertId: 200, rows: { length: 0, item: function () { return ({}); } } });
                            }
                            else {
                                success === null || success === void 0 ? void 0 : success(tx, { rows: { length: 0, item: function () { return ({}); } } });
                            }
                            return true;
                        },
                    };
                    computeCalled = false;
                    (0, inventoryAdjustmentService_1.__setInventoryAdjustmentDeps)({
                        getInventoryById: function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        id: 1,
                                        name: 'Inv',
                                        status: 'open',
                                        scopeType: 'ALL',
                                        areaId: 2,
                                        createdAt: now,
                                    })];
                            });
                        }); },
                        loadSettings: function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        itemsPerPage: 20,
                                        missingRule: 'zero',
                                        allowCreateNew: true,
                                        patrimonyFormat: 'PAT-{seq}',
                                    })];
                            });
                        }); },
                        loadSession: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ userId: 9 })];
                        }); }); },
                        fetchDiffs: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, diffs];
                        }); }); },
                        runInTransaction: function (cb) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                cb(tx);
                                return [2 /*return*/];
                            });
                        }); },
                        computeInventoryDiff: function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                computeCalled = true;
                                return [2 /*return*/, { divergent: 0 }];
                            });
                        }); },
                        generateAssetNumberWithFormat: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, 'AUTO-001'];
                        }); }); },
                    });
                    return [4 /*yield*/, (0, inventoryAdjustmentService_1.applyInventoryAdjustments)(1)];
                case 1:
                    _a.sent();
                    assert_1.default.ok(executed.some(function (op) { var _a; return op.sql.startsWith('UPDATE asset_items SET quantity') && ((_a = op.params) === null || _a === void 0 ? void 0 : _a[0]) === 3; }), 'Deve atualizar quantidade do patrimonio existente');
                    assert_1.default.ok(executed.some(function (op) { var _a; return op.sql.startsWith('INSERT INTO asset_items') && ((_a = op.params) === null || _a === void 0 ? void 0 : _a.includes(4)); }), 'Deve criar item novo com quantidade derivada');
                    assert_1.default.ok(executed.some(function (op) {
                        var _a, _b;
                        return op.sql.includes('inventory_adjustment_log') &&
                            ((_a = op.params) === null || _a === void 0 ? void 0 : _a.includes(9)) &&
                            ((_b = op.params) === null || _b === void 0 ? void 0 : _b.includes(5));
                    }), 'Log de ajuste deve registrar before/usuario');
                    assert_1.default.ok(computeCalled, 'Comparacao deve ser recalculada ao final');
                    return [2 /*return*/];
            }
        });
    });
}
function testLeitura2ResolucaoFlow() {
    return __awaiter(this, void 0, void 0, function () {
        var calls;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    calls = [];
                    (0, inventoryCompareService_1.__setInventoryCompareDeps)({
                        execute: function (sql, params) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                calls.push({ sql: sql, params: params });
                                return [2 /*return*/, {}];
                            });
                        }); },
                    });
                    return [4 /*yield*/, (0, inventoryCompareService_1.updateDiffL2Quantity)(5, 7)];
                case 1:
                    _c.sent();
                    assert_1.default.strictEqual((_a = calls[0].params) === null || _a === void 0 ? void 0 : _a[0], 7, 'L2 deve propagar quantidade');
                    return [4 /*yield*/, (0, inventoryCompareService_1.saveDiffResolution)({
                            diffId: 5,
                            choice: 'L2',
                            finalQuantity: null,
                            l1Quantity: 3,
                            l2Quantity: 8,
                            note: 'usar l2',
                        })];
                case 2:
                    _c.sent();
                    assert_1.default.strictEqual((_b = calls[1].params) === null || _b === void 0 ? void 0 : _b[1], 8, 'Resolucao deve persistir finalQuantity com base na L2');
                    return [2 /*return*/];
            }
        });
    });
}
function testBackupRestore() {
    return __awaiter(this, void 0, void 0, function () {
        var now, executed;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = Date.now();
                    executed = [];
                    (0, backupService_1.__setBackupDeps)({
                        runInTransaction: function (cb) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                tx = {
                                    executeSql: function (sql) {
                                        executed.push(sql);
                                    },
                                };
                                cb(tx);
                                return [2 /*return*/];
                            });
                        }); },
                        getCurrentSchemaVersion: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, 5];
                        }); }); },
                    });
                    return [4 /*yield*/, (0, backupService_1.restoreBackup)({
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
                        })];
                case 1:
                    _a.sent();
                    assert_1.default.ok(executed.some(function (sql) { return sql.startsWith('DELETE FROM asset_items'); }), 'Restore deve limpar tabelas antes de inserir');
                    assert_1.default.ok(executed.some(function (sql) { return sql.startsWith('INSERT INTO users'); }), 'Restore deve inserir usuarios do backup');
                    return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    testPatrimonyFormat();
                    testBuildDiffs();
                    testDeriveFinalQuantity();
                    testNumericMasks();
                    return [4 /*yield*/, testApplyInventoryAdjustments()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testLeitura2ResolucaoFlow()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testBackupRestore()];
                case 3:
                    _a.sent();
                    // eslint-disable-next-line no-console
                    console.log('All tests passed');
                    return [2 /*return*/];
            }
        });
    });
}
run();
