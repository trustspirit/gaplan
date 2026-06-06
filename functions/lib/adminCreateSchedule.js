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
exports.adminCreateSchedule = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
exports.adminCreateSchedule = functions
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
        throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only');
    }
    if (callerRole === 'seventy' && context.auth.uid !== data.seventyUid) {
        throw new functions.https.HttpsError('permission-denied', 'Seventy can only create schedules for themselves');
    }
    const seventySnap = await db.collection('users').doc(data.seventyUid).get();
    if (!seventySnap.exists || ((_b = seventySnap.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'seventy') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid: user not found or not a seventy');
    }
    const { type, seventyUid, unitId, wardName, presidentUid, date, startTime, endTime, notes } = data;
    if (!['ward_visit', 'interview', 'meeting'].includes(type)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid type');
    }
    if (!seventyUid || typeof seventyUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'seventyUid required');
    }
    if (!DATE_RE.test(date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format (YYYY-MM-DD)');
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid time format (HH:mm)');
    }
    if (startTime >= endTime) {
        throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime');
    }
    if (type === 'ward_visit') {
        if (!unitId)
            throw new functions.https.HttpsError('invalid-argument', 'unitId required for ward_visit');
        if (!wardName || wardName.trim().length < 1 || wardName.trim().length > 100) {
            throw new functions.https.HttpsError('invalid-argument', 'wardName required (1-100 chars) for ward_visit');
        }
    }
    if (type === 'interview' && !unitId) {
        throw new functions.https.HttpsError('invalid-argument', 'unitId required for interview');
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
        throw new functions.https.HttpsError('invalid-argument', 'notes max 500 chars');
    }
    await db.collection('schedules').add({
        type,
        seventyUid,
        unitId: unitId !== null && unitId !== void 0 ? unitId : '',
        wardName: wardName ? wardName.trim() : null,
        presidentUid: presidentUid !== null && presidentUid !== void 0 ? presidentUid : null,
        date,
        startTime,
        endTime,
        notes: notes !== null && notes !== void 0 ? notes : null,
        status: 'confirmed',
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=adminCreateSchedule.js.map