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
exports.fastSundayBlock = exports.taskReminder = exports.weeklyReminder = exports.calendarSync = exports.confirmSchedule = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var confirmSchedule_1 = require("./confirmSchedule");
Object.defineProperty(exports, "confirmSchedule", { enumerable: true, get: function () { return confirmSchedule_1.confirmSchedule; } });
var calendarSync_1 = require("./calendarSync");
Object.defineProperty(exports, "calendarSync", { enumerable: true, get: function () { return calendarSync_1.calendarSync; } });
var weeklyReminder_1 = require("./weeklyReminder");
Object.defineProperty(exports, "weeklyReminder", { enumerable: true, get: function () { return weeklyReminder_1.weeklyReminder; } });
var taskReminder_1 = require("./taskReminder");
Object.defineProperty(exports, "taskReminder", { enumerable: true, get: function () { return taskReminder_1.taskReminder; } });
var fastSundayBlock_1 = require("./fastSundayBlock");
Object.defineProperty(exports, "fastSundayBlock", { enumerable: true, get: function () { return fastSundayBlock_1.fastSundayBlock; } });
//# sourceMappingURL=index.js.map