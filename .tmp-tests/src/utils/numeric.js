"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatIntegerInput = formatIntegerInput;
exports.formatCurrencyInput = formatCurrencyInput;
exports.applyThousandSeparator = applyThousandSeparator;
function formatIntegerInput(value) {
    var digits = value.replace(/[^0-9]/g, '');
    return digits.replace(/^0+/, '') || '0';
}
function formatCurrencyInput(value) {
    var digits = value.replace(/[^0-9]/g, '');
    if (!digits)
        return '';
    var normalized = digits.padStart(3, '0');
    var intPart = normalized.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
    var decimal = normalized.slice(-2);
    return "".concat(intPart, ".").concat(decimal);
}
function applyThousandSeparator(value) {
    var _a = value.split('.'), intPart = _a[0], _b = _a[1], decimal = _b === void 0 ? '00' : _b;
    var withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return "".concat(withSep, ",").concat(decimal.padEnd(2, '0'));
}
