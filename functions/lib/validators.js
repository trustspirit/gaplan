"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIME_RE = exports.DATE_RE = void 0;
exports.isValidUrl = isValidUrl;
exports.DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
exports.TIME_RE = /^\d{2}:\d{2}$/;
function isValidUrl(rawUrl) {
    try {
        const u = new URL(rawUrl.trim());
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 2;
    }
    catch (_a) {
        return false;
    }
}
//# sourceMappingURL=validators.js.map