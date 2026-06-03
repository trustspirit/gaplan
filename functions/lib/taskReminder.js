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
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const dayjs_1 = __importDefault(require("dayjs"));
exports.taskReminder = functions
    .region('asia-northeast3')
    .pubsub.schedule('0 0 * * *')
    .timeZone('Asia/Seoul')
    .onRun(async () => {
    var _a, _b, _c, _d, _e, _f;
    const db = admin.firestore();
    const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
    const threshold = (0, dayjs_1.default)().add(3, 'day').format('YYYY-MM-DD');
    const snap = await db.collection('tasks')
        .where('status', '==', 'pending')
        .where('dueDate', '<=', threshold)
        .where('dueDate', '>=', today)
        .get();
    if (snap.empty)
        return;
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: (_b = (_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : process.env.EMAIL_USER,
            pass: (_d = (_c = functions.config().email) === null || _c === void 0 ? void 0 : _c.pass) !== null && _d !== void 0 ? _d : process.env.EMAIL_PASS,
        },
    });
    for (const d of snap.docs) {
        const task = d.data();
        const presidentSnap = await db.collection('users').doc(task.assignedTo).get();
        const president = presidentSnap.data();
        if (!(president === null || president === void 0 ? void 0 : president.email))
            continue;
        const label = task.type === 'select_visit' ? '와드 방문 일정 선택' : '접견 일정 선택';
        const daysLeft = (0, dayjs_1.default)(task.dueDate).diff((0, dayjs_1.default)(), 'day');
        await transport.sendMail({
            from: (_f = (_e = functions.config().email) === null || _e === void 0 ? void 0 : _e.user) !== null && _f !== void 0 ? _f : process.env.EMAIL_USER,
            to: president.email,
            subject: `[gaplan] 처리 필요: ${label} (D-${daysLeft})`,
            text: `${president.name} 회장님,\n\n미완료 task가 있습니다:\n\n• ${label} (마감: ${task.dueDate})\n\ngaplan에 로그인하여 처리해주세요.`,
        });
        await d.ref.update({
            notifiedAt: admin.firestore.FieldValue.arrayUnion(admin.firestore.Timestamp.now()),
        });
    }
});
//# sourceMappingURL=taskReminder.js.map