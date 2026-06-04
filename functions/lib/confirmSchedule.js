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
exports.confirmSchedule = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.confirmSchedule = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    // Validate all inputs before building Firestore document IDs
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId');
    }
    if (!data.unitId || !/^[\w-]+$/.test(data.unitId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid unitId');
    }
    if (!/^[\w-]+$/.test((_a = data.seventyUid) !== null && _a !== void 0 ? _a : '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test((_c = (_b = data.slot) === null || _b === void 0 ? void 0 : _b.date) !== null && _c !== void 0 ? _c : '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
    }
    if (!/^\d{2}:\d{2}$/.test((_e = (_d = data.slot) === null || _d === void 0 ? void 0 : _d.startTime) !== null && _e !== void 0 ? _e : '') || !/^\d{2}:\d{2}$/.test((_g = (_f = data.slot) === null || _f === void 0 ? void 0 : _f.endTime) !== null && _g !== void 0 ? _g : '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid time format');
    }
    if (!['ward_visit', 'interview', 'meeting'].includes(data.type)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid schedule type');
    }
    const db = admin.firestore();
    // Deterministic ID ensures tx.get participates in the transaction's optimistic lock.
    // Two concurrent requests for the same seventy+date will conflict at commit time.
    const scheduleId = `${data.seventyUid}_${data.slot.date}`;
    const scheduleRef = db.collection('schedules').doc(scheduleId);
    const taskRef = db.collection('tasks').doc(data.taskId);
    return db.runTransaction(async (tx) => {
        // Validate task ownership and data integrity before writing
        const [existingSchedule, taskSnap] = await Promise.all([
            tx.get(scheduleRef),
            tx.get(taskRef),
        ]);
        if (!taskSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Task not found');
        }
        const taskData = taskSnap.data();
        if (taskData.assignedTo !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not your task');
        }
        if (taskData.seventyUid !== data.seventyUid) {
            throw new functions.https.HttpsError('invalid-argument', 'seventyUid mismatch');
        }
        if (taskData.status === 'completed') {
            return { success: false, error: '이미 처리된 Task입니다.' };
        }
        if (existingSchedule.exists) {
            return {
                success: false,
                error: '해당 날짜에 이미 확정된 일정이 있습니다. 다른 날짜를 선택해주세요.',
            };
        }
        tx.set(scheduleRef, {
            type: data.type,
            seventyUid: data.seventyUid,
            unitId: data.unitId,
            presidentUid: context.auth.uid,
            date: data.slot.date,
            startTime: data.slot.startTime,
            endTime: data.slot.endTime,
            status: 'confirmed',
            createdBy: context.auth.uid,
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(taskRef, { status: 'completed' });
        return { success: true, scheduleId };
    });
});
//# sourceMappingURL=confirmSchedule.js.map