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
exports.adminEditSchedule = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
exports.adminEditSchedule = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const db = admin.firestore();
    const callerSnap = await db.collection('users').doc(context.auth.uid).get();
    const callerRole = (_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['admin', 'seventy'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const { scheduleId, updates } = data;
    if (!scheduleId || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'scheduleId and updates required');
    }
    // Whitelist and validate permitted fields
    const allowed = {};
    if (updates.date !== undefined) {
        if (typeof updates.date !== 'string' || !DATE_RE.test(updates.date)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
        }
        allowed.date = updates.date;
    }
    if (updates.startTime !== undefined) {
        if (typeof updates.startTime !== 'string' || !TIME_RE.test(updates.startTime)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid startTime format');
        }
        allowed.startTime = updates.startTime;
    }
    if (updates.endTime !== undefined) {
        if (typeof updates.endTime !== 'string' || !TIME_RE.test(updates.endTime)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid endTime format');
        }
        allowed.endTime = updates.endTime;
    }
    if (updates.notes !== undefined) {
        if (typeof updates.notes !== 'string' || updates.notes.length > 500) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid notes');
        }
        allowed.notes = updates.notes;
    }
    if (Object.keys(allowed).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No valid updates provided');
    }
    const scheduleRef = db.collection('schedules').doc(scheduleId);
    const snap = await scheduleRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Schedule not found');
    }
    if (callerRole === 'seventy' && ((_b = snap.data()) === null || _b === void 0 ? void 0 : _b.seventyUid) !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Seventy can only edit their own schedules');
    }
    // calendarSync trigger handles GCal update automatically
    await scheduleRef.update(Object.assign(Object.assign({}, allowed), { updatedAt: new Date().toISOString(), updatedBy: context.auth.uid }));
    return { success: true };
});
//# sourceMappingURL=adminEditSchedule.js.map