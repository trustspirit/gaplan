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
exports.adminDeleteSchedule = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.adminDeleteSchedule = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const db = admin.firestore();
    const callerSnap = await db.collection('users').doc(context.auth.uid).get();
    const callerRole = (_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['admin', 'seventy'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const { scheduleId } = data;
    if (!scheduleId) {
        throw new functions.https.HttpsError('invalid-argument', 'scheduleId required');
    }
    const scheduleRef = db.collection('schedules').doc(scheduleId);
    const snap = await scheduleRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Schedule not found');
    }
    const schedule = snap.data();
    if (callerRole === 'seventy' && schedule.seventyUid !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Seventy can only delete their own schedules');
    }
    // calendarSync trigger handles GCal deletion when status becomes 'cancelled'
    await scheduleRef.update({ status: 'cancelled' });
    if (schedule.taskId) {
        const taskRef = db.collection('tasks').doc(schedule.taskId);
        const taskSnap = await taskRef.get();
        if (taskSnap.exists) {
            const task = taskSnap.data();
            const hasResponses = ((_c = (_b = task.respondedSlots) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0 ||
                ((_e = (_d = task.wardAssignments) === null || _d === void 0 ? void 0 : _d.length) !== null && _e !== void 0 ? _e : 0) > 0;
            await taskRef.update({
                status: hasResponses ? 'responded' : 'pending',
                scheduleId: admin.firestore.FieldValue.delete(),
            });
        }
    }
    return { success: true };
});
//# sourceMappingURL=adminDeleteSchedule.js.map