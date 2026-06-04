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
exports.submitAvailability = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.submitAvailability = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId');
    }
    if (!Array.isArray(data.slots) || data.slots.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one slot required');
    }
    for (const slot of data.slots) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test((_a = slot.date) !== null && _a !== void 0 ? _a : '')) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid slot date');
        }
        if (!/^\d{2}:\d{2}$/.test((_b = slot.startTime) !== null && _b !== void 0 ? _b : '') || !/^\d{2}:\d{2}$/.test((_c = slot.endTime) !== null && _c !== void 0 ? _c : '')) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid slot time');
        }
    }
    const db = admin.firestore();
    const taskRef = db.collection('tasks').doc(data.taskId);
    return db.runTransaction(async (tx) => {
        const taskSnap = await tx.get(taskRef);
        if (!taskSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Task not found');
        }
        const taskData = taskSnap.data();
        if (taskData.assignedTo !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not your task');
        }
        if (!['select_interview', 'select_meeting'].includes(taskData.type)) {
            throw new functions.https.HttpsError('invalid-argument', 'Only interview/meeting tasks support availability submission');
        }
        if (taskData.status === 'completed') {
            return { success: false, error: '이미 완료된 Task입니다.' };
        }
        tx.update(taskRef, {
            status: 'responded',
            respondedSlots: data.slots,
            respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    });
});
//# sourceMappingURL=submitAvailability.js.map