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
exports.submitAvailabilityAnon = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const TASK_ID_RE = /^[\w-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
exports.submitAvailabilityAnon = functions
    .region('asia-northeast3')
    .https.onCall(async (data) => {
    const { taskId, token, respondedSlots } = data;
    if (!taskId || !TASK_ID_RE.test(taskId) || !token) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid request');
    }
    if (!Array.isArray(respondedSlots) || respondedSlots.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'respondedSlots must be a non-empty array');
    }
    for (const slot of respondedSlots) {
        if (typeof slot.date !== 'string' || !DATE_RE.test(slot.date)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid slot date');
        }
        if (typeof slot.startTime !== 'string' || !TIME_RE.test(slot.startTime)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid slot startTime');
        }
        if (typeof slot.endTime !== 'string' || !TIME_RE.test(slot.endTime)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid slot endTime');
        }
    }
    const db = admin.firestore();
    const taskRef = db.collection('tasks').doc(taskId);
    await db.runTransaction(async (tx) => {
        const taskSnap = await tx.get(taskRef);
        if (!taskSnap.exists || taskSnap.data().respondToken !== token) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid link');
        }
        const task = taskSnap.data();
        if (task.status === 'completed' || task.status === 'expired') {
            throw new functions.https.HttpsError('failed-precondition', 'Task is no longer accepting responses');
        }
        if (task.type !== 'select_interview') {
            throw new functions.https.HttpsError('invalid-argument', 'This task type does not accept slot responses');
        }
        tx.update(taskRef, {
            respondedSlots,
            status: 'responded',
            respondedAt: new Date().toISOString(),
        });
    });
    return { success: true };
});
//# sourceMappingURL=submitAvailabilityAnon.js.map