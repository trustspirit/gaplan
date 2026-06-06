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
exports.getPublicTaskInfo = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.getPublicTaskInfo = functions
    .region('asia-northeast3')
    .https.onCall(async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { taskId, token } = data;
    if (!taskId || !token) {
        throw new functions.https.HttpsError('invalid-argument', 'taskId and token required');
    }
    const taskRef = admin.firestore().collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found');
    }
    const task = taskSnap.data();
    if (task.respondToken !== token) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid token');
    }
    return {
        taskId,
        title: (_a = task.title) !== null && _a !== void 0 ? _a : '',
        note: (_b = task.note) !== null && _b !== void 0 ? _b : '',
        type: task.type,
        status: task.status,
        dueDate: task.dueDate,
        availableDates: (_c = task.availableDates) !== null && _c !== void 0 ? _c : [],
        availableDateSlots: (_d = task.availableDateSlots) !== null && _d !== void 0 ? _d : [],
        slotDurationMinutes: (_e = task.slotDurationMinutes) !== null && _e !== void 0 ? _e : 30,
        unitId: (_f = task.unitId) !== null && _f !== void 0 ? _f : '',
        assignedTo: task.assignedTo,
        respondedSlots: (_g = task.respondedSlots) !== null && _g !== void 0 ? _g : [],
        wardAssignments: (_h = task.wardAssignments) !== null && _h !== void 0 ? _h : [],
    };
});
//# sourceMappingURL=getPublicTaskInfo.js.map