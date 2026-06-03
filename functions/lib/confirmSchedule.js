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
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        // Check for conflict: same seventy, same date, already confirmed
        const conflictSnap = await db.collection('schedules')
            .where('seventyUid', '==', data.seventyUid)
            .where('date', '==', data.slot.date)
            .where('status', '==', 'confirmed')
            .get();
        if (!conflictSnap.empty) {
            return {
                success: false,
                error: '해당 날짜에 이미 확정된 일정이 있습니다. 다른 날짜를 선택해주세요.',
            };
        }
        const scheduleRef = db.collection('schedules').doc();
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
        const taskRef = db.collection('tasks').doc(data.taskId);
        tx.update(taskRef, { status: 'completed' });
        return { success: true, scheduleId: scheduleRef.id };
    });
});
//# sourceMappingURL=confirmSchedule.js.map