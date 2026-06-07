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
exports.adminConfirmSchedule = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.adminConfirmSchedule = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test((_b = (_a = data.slot) === null || _a === void 0 ? void 0 : _a.date) !== null && _b !== void 0 ? _b : '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
    }
    if (!/^\d{2}:\d{2}$/.test((_d = (_c = data.slot) === null || _c === void 0 ? void 0 : _c.startTime) !== null && _d !== void 0 ? _d : '') || !/^\d{2}:\d{2}$/.test((_f = (_e = data.slot) === null || _e === void 0 ? void 0 : _e.endTime) !== null && _f !== void 0 ? _f : '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid time format');
    }
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerSnap = await db.collection('users').doc(callerUid).get();
    const callerRole = (_g = callerSnap.data()) === null || _g === void 0 ? void 0 : _g.role;
    if (!['admin', 'seventy'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admin or seventy can confirm');
    }
    const taskRef = db.collection('tasks').doc(data.taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found');
    }
    const taskData = taskSnap.data();
    if (taskData.status !== 'responded') {
        return { success: false, error: '아직 회장이 가능 시간을 제출하지 않았습니다.' };
    }
    if (taskData.type !== 'select_interview') {
        throw new functions.https.HttpsError('invalid-argument', 'Only interview tasks can be confirmed this way');
    }
    // Verify the selected slot is one the president submitted
    const respondedSlots = (_h = taskData.respondedSlots) !== null && _h !== void 0 ? _h : [];
    const slotValid = respondedSlots.some(s => s.date === data.slot.date && s.startTime === data.slot.startTime);
    if (!slotValid) {
        throw new functions.https.HttpsError('invalid-argument', '제출된 가능 시간 중에 없는 슬롯입니다.');
    }
    const scheduleType = 'interview';
    const scheduleId = `${taskData.seventyUid}_${data.slot.date}_${data.slot.startTime.replace(':', '')}`;
    const scheduleRef = db.collection('schedules').doc(scheduleId);
    return db.runTransaction(async (tx) => {
        var _a;
        const existing = await tx.get(scheduleRef);
        if (existing.exists) {
            return { success: false, error: '해당 슬롯에 이미 확정된 일정이 있습니다.' };
        }
        tx.set(scheduleRef, {
            type: scheduleType,
            seventyUid: taskData.seventyUid,
            unitId: (_a = taskData.unitId) !== null && _a !== void 0 ? _a : '',
            presidentUid: taskData.assignedTo,
            date: data.slot.date,
            startTime: data.slot.startTime,
            endTime: data.slot.endTime,
            notes: null,
            zoomLink: null,
            customTitle: null,
            status: 'confirmed',
            taskId: data.taskId,
            createdBy: callerUid,
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(taskRef, { status: 'completed', scheduleId });
        return { success: true, scheduleId };
    });
});
//# sourceMappingURL=adminConfirmSchedule.js.map