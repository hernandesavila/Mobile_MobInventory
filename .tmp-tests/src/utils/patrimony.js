"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPatrimonyNumber = formatPatrimonyNumber;
function formatPatrimonyNumber(sequence, format, pad) {
    if (format === void 0) { format = 'PAT-{seq}'; }
    if (pad === void 0) { pad = 6; }
    var padded = sequence.toString().padStart(pad, '0');
    if (format.includes('{seq}')) {
        return format.replace('{seq}', padded);
    }
    return "PAT-".concat(padded);
}
