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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastSundayBlock = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const dayjs_1 = __importDefault(require("dayjs"));
// Run at 1am KST on 1st of each month
exports.fastSundayBlock = functions
    .region('asia-northeast3')
    .pubsub.schedule('0 1 1 * *')
    .timeZone('Asia/Seoul')
    .onRun(async () => {
    const db = admin.firestore();
    // Calculate first Sunday of next month.
    // Formula: (7 - dow) % 7  — must stay in sync with src/utils/fastSunday.ts
    const nextMonth = (0, dayjs_1.default)().add(1, 'month').startOf('month');
    const dow = nextMonth.day();
    const daysToSunday = (7 - dow) % 7;
    const firstSunday = nextMonth.add(daysToSunday, 'day').format('YYYY-MM-DD');
    const usersSnap = await db.collection('users').where('role', '==', 'seventy').get();
    for (const userDoc of usersSnap.docs) {
        const ref = db
            .collection('availability')
            .doc(userDoc.id)
            .collection('slots')
            .doc(`fast-${firstSunday}`);
        await ref.set({
            type: 'override',
            date: firstSunday,
            startTime: '00:00',
            endTime: '23:59',
            isBlocked: true,
        });
    }
});
//# sourceMappingURL=fastSundayBlock.js.map