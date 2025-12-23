"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveFinalQuantity = deriveFinalQuantity;
function deriveFinalQuantity(diff, settings) {
    var _a, _b, _c, _d;
    if (diff.status === 'MISSING') {
        return settings.missingRule === 'zero' ? 0 : diff.l0Quantity;
    }
    var choice = (_a = diff.resolutionChoice) !== null && _a !== void 0 ? _a : 'L1';
    if (choice === 'IGNORE') {
        return diff.l0Quantity;
    }
    if (choice === 'L2') {
        return (_c = (_b = diff.l2Quantity) !== null && _b !== void 0 ? _b : diff.l1Quantity) !== null && _c !== void 0 ? _c : diff.l0Quantity;
    }
    return (_d = diff.l1Quantity) !== null && _d !== void 0 ? _d : diff.l0Quantity;
}
