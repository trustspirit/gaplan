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
exports.adminConfirmWardVisit = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.adminConfirmWardVisit = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId');
    }
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerSnap = await db.collection('users').doc(callerUid).get();
    const callerRole = (_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['admin', 'seventy'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admin or seventy can confirm');
    }
    const taskRef = db.collection('tasks').doc(data.taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found');
    }
    const taskData = taskSnap.data();
    if (taskData.type !== 'select_visit') {
        throw new functions.https.HttpsError('invalid-argument', 'Only ward visit tasks can be confirmed this way');
    }
    if (taskData.status !== 'responded') {
        return { success: false, error: '아직 회장이 와드 배정을 제출하지 않았습니다.' };
    }
    const wardAssignments = (_b = taskData.wardAssignments) !== null && _b !== void 0 ? _b : [];
    if (wardAssignments.length === 0) {
        return { success: false, error: '배정된 와드/지부가 없습니다.' };
    }
    // Get president's unitId for schedule documents
    const presidentSnap = await db.collection('users').doc(taskData.assignedTo).get();
    const unitId = (_d = (_c = presidentSnap.data()) === null || _c === void 0 ? void 0 : _c.unitId) !== null && _d !== void 0 ? _d : '';
    const batch = db.batch();
    // Delete any existing schedules for this task (handles re-confirmation)
    // These are schedules created by a previous confirmation of the same task.
    const existingSnap = await db.collection('schedules')
        .where('taskId', '==', data.taskId)
        .get();
    existingSnap.docs.forEach(doc => batch.delete(doc.ref));
    // Create one schedule document per ward assignment (index suffix prevents ID collision)
    for (const [i, assignment] of wardAssignments.entries()) {
        const safeWard = assignment.wardName.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 60);
        const scheduleId = `wv_${data.taskId}_${safeWard}_${i}`;
        const scheduleRef = db.collection('schedules').doc(scheduleId);
        batch.set(scheduleRef, {
            type: 'ward_visit',
            taskId: data.taskId, // for future re-confirmation cleanup
            wardName: assignment.wardName,
            unitId,
            presidentUid: taskData.assignedTo,
            seventyUid: taskData.seventyUid,
            date: assignment.date,
            startTime: '10:00',
            endTime: '13:00',
            status: 'confirmed',
            createdBy: callerUid,
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    batch.update(taskRef, { status: 'completed' });
    await batch.commit();
    return { success: true, scheduleCount: wardAssignments.length };
});
//# sourceMappingURL=adminConfirmWardVisit.js.map