"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDiffsFromSnapshotAndReads = buildDiffsFromSnapshotAndReads;
function buildDiffsFromSnapshotAndReads(snapshotRows, readRows) {
    var diffs = [];
    var snapshotMap = new Map();
    snapshotRows.forEach(function (row) {
        var _a;
        var key = row.asset_number.toUpperCase();
        snapshotMap.set(key, {
            asset_id: row.asset_id,
            asset_number: row.asset_number,
            asset_name: row.asset_name,
            area_id: row.area_id,
            qty: (_a = row.quantity) !== null && _a !== void 0 ? _a : 0,
        });
    });
    var processed = new Set();
    readRows.forEach(function (row) {
        var _a, _b, _c, _d, _e, _f, _g;
        var assetNumber = row.asset_number;
        if (!assetNumber) {
            diffs.push({
                asset_id: null,
                asset_number: null,
                asset_name: row.asset_name,
                area_id: (_a = row.area_id) !== null && _a !== void 0 ? _a : null,
                l0_quantity: 0,
                l1_quantity: (_b = row.quantity) !== null && _b !== void 0 ? _b : 0,
                l2_quantity: 0,
                final_quantity: null,
                resolution_choice: null,
                resolution_note: null,
                status: 'NEW',
            });
            return;
        }
        var key = assetNumber.toUpperCase();
        processed.add(key);
        var snap = snapshotMap.get(key);
        if (!snap) {
            diffs.push({
                asset_id: (_c = row.asset_id) !== null && _c !== void 0 ? _c : null,
                asset_number: assetNumber,
                asset_name: row.asset_name,
                area_id: (_d = row.area_id) !== null && _d !== void 0 ? _d : null,
                l0_quantity: 0,
                l1_quantity: (_e = row.quantity) !== null && _e !== void 0 ? _e : 0,
                l2_quantity: 0,
                final_quantity: null,
                resolution_choice: null,
                resolution_note: null,
                status: 'NEW',
            });
            return;
        }
        var l0 = (_f = snap.qty) !== null && _f !== void 0 ? _f : 0;
        var l1 = (_g = row.quantity) !== null && _g !== void 0 ? _g : 0;
        var status = l0 === l1 ? 'OK' : 'DIVERGENT';
        diffs.push({
            asset_id: snap.asset_id,
            asset_number: assetNumber,
            asset_name: snap.asset_name,
            area_id: snap.area_id,
            l0_quantity: l0,
            l1_quantity: l1,
            l2_quantity: 0,
            final_quantity: null,
            resolution_choice: null,
            resolution_note: null,
            status: status,
        });
    });
    snapshotMap.forEach(function (snap, key) {
        var _a;
        if (processed.has(key))
            return;
        diffs.push({
            asset_id: snap.asset_id,
            asset_number: snap.asset_number,
            asset_name: snap.asset_name,
            area_id: snap.area_id,
            l0_quantity: (_a = snap.qty) !== null && _a !== void 0 ? _a : 0,
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
