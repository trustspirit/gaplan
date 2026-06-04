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
exports.taskReminder = void 0;
/**
 * taskReminder — daily cron that sends escalating reminders for pending tasks.
 * Schedule: 09:00 KST every day
 * Thresholds: D-7, D-3, D-1, D+0+
 */
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const dayjs_1 = __importDefault(require("dayjs"));
const emailTransport_1 = require("./emailTransport");
const emailHelpers_1 = require("./emailHelpers");
exports.taskReminder = functions
    .region('asia-northeast3')
    .pubsub.schedule('0 9 * * *')
    .timeZone('Asia/Seoul')
    .onRun(async () => {
    const db = admin.firestore();
    const today = (0, dayjs_1.default)();
    const todayStr = today.format('YYYY-MM-DD');
    const snap = await db.collection('tasks').where('status', '==', 'pending').get();
    if (snap.empty)
        return;
    const transport = (0, emailTransport_1.getTransport)();
    const userSnaps = await Promise.all(snap.docs.map(d => db.collection('users').doc(d.data().assignedTo).get()));
    const results = await Promise.allSettled(snap.docs.map(async (d, i) => {
        var _a;
        const task = d.data();
        const president = userSnaps[i].data();
        if (!(president === null || president === void 0 ? void 0 : president.email))
            return;
        const daysLeft = (0, dayjs_1.default)(task.dueDate).diff(today, 'day');
        if (daysLeft !== 7 && daysLeft !== 3 && daysLeft !== 1 && daysLeft > 0)
            return;
        const alreadyToday = ((_a = task.notifiedAt) !== null && _a !== void 0 ? _a : []).some(t => (0, dayjs_1.default)(t.toDate()).format('YYYY-MM-DD') === todayStr);
        if (alreadyToday)
            return;
        const typeLabel = (0, emailHelpers_1.resolveTaskTypeLabel)(task.type, task.title);
        const tag = daysLeft <= 0 ? `기한 초과 D+${Math.abs(daysLeft)}` : `D-${daysLeft}`;
        const urgency = daysLeft <= 0
            ? `기한이 ${Math.abs(daysLeft)}일 지났습니다.`
            : daysLeft === 1 ? '내일이 마감입니다!'
                : `기한이 ${daysLeft}일 남았습니다.`;
        await transport.sendMail({
            from: (0, emailTransport_1.getSenderEmail)(),
            to: president.email,
            subject: `[gaplan] [${tag}] 미완료 Task: ${typeLabel}`,
            text: [
                `${president.name} 회장님,`,
                ``,
                `처리하지 않은 Task가 있습니다. ${urgency}`,
                ``,
                `• 종류: ${typeLabel}`,
                `• 마감일: ${task.dueDate}`,
                task.note ? `• 요청 사항: ${task.note}` : null,
                ``,
                `지금 처리해주세요: ${emailHelpers_1.APP_URL}/tasks`,
                ``,
                `gaplan`,
            ].filter(Boolean).join('\n'),
        });
        await d.ref.update({
            notifiedAt: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.now()),
        });
    }));
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            functions.logger.error(`taskReminder failed for ${snap.docs[i].id}`, r.reason);
        }
    });
});
//# sourceMappingURL=taskReminder.js.map