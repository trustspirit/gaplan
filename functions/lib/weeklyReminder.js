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
exports.weeklyReminder = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const dayjs_1 = __importDefault(require("dayjs"));
const isoWeek_1 = __importDefault(require("dayjs/plugin/isoWeek"));
const emailTransport_1 = require("./emailTransport");
dayjs_1.default.extend(isoWeek_1.default);
// Every Monday 9am KST (timeZone: Asia/Seoul → cron is in KST)
exports.weeklyReminder = functions
    .region('asia-northeast3')
    .pubsub.schedule('0 9 * * 1')
    .timeZone('Asia/Seoul')
    .onRun(async () => {
    const db = admin.firestore();
    const weekStart = (0, dayjs_1.default)().startOf('isoWeek').format('YYYY-MM-DD');
    const weekEnd = (0, dayjs_1.default)().endOf('isoWeek').format('YYYY-MM-DD');
    const snap = await db.collection('schedules')
        .where('status', '==', 'confirmed')
        .where('date', '>=', weekStart)
        .where('date', '<=', weekEnd)
        .get();
    if (snap.empty)
        return;
    const byPresident = {};
    snap.docs.forEach(d => {
        var _a;
        const uid = d.data().presidentUid;
        byPresident[uid] = [...((_a = byPresident[uid]) !== null && _a !== void 0 ? _a : []), d];
    });
    const transport = (0, emailTransport_1.getTransport)();
    const presidentUids = Object.keys(byPresident);
    // Fetch all president user docs in parallel
    const presidentSnaps = await Promise.all(presidentUids.map(uid => db.collection('users').doc(uid).get()));
    await Promise.all(presidentSnaps.map(async (snap, i) => {
        const president = snap.data();
        if (!(president === null || president === void 0 ? void 0 : president.email))
            return;
        const uid = presidentUids[i];
        const docs = byPresident[uid];
        const lines = docs.map(d => {
            const s = d.data();
            return `• ${s.date} ${s.startTime} — ${s.type === 'ward_visit' ? '와드 방문' : '접견'}`;
        }).join('\n');
        await transport.sendMail({
            from: (0, emailTransport_1.getSenderEmail)(),
            to: president.email,
            subject: `[gaplan] 이번 주 일정 안내 (${weekStart} ~ ${weekEnd})`,
            text: `${president.name} 회장님,\n\n이번 주 확정된 일정입니다:\n\n${lines}\n\ngaplan`,
        });
    }));
});
//# sourceMappingURL=weeklyReminder.js.map