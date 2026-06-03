"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransport = getTransport;
exports.getSenderEmail = getSenderEmail;
const functions = __importStar(require("firebase-functions/v1"));
const nodemailer = __importStar(require("nodemailer"));
function getTransport() {
    var _a, _b, _c, _d;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: (_b = (_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : process.env.EMAIL_USER,
            pass: (_d = (_c = functions.config().email) === null || _c === void 0 ? void 0 : _c.pass) !== null && _d !== void 0 ? _d : process.env.EMAIL_PASS,
        },
    });
}
function getSenderEmail() {
    var _a, _b, _c;
    return (_c = (_b = (_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : process.env.EMAIL_USER) !== null && _c !== void 0 ? _c : '';
}
//# sourceMappingURL=emailTransport.js.map