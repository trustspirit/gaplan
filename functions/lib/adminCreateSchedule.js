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
const validators_1 = require("./validators");
exports.adminCreateSchedule = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const { type, seventyUid, unitId, wardName, presidentUid, date, startTime, endTime, notes, zoomLink, customTitle } = data;
    if (!['ward_visit', 'interview', 'meeting'].includes(type)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid type');
    }
    if (!validators_1.DATE_RE.test(date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format (YYYY-MM-DD)');
    }
    if (!validators_1.TIME_RE.test(startTime) || !validators_1.TIME_RE.test(endTime)) {
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
    if (type !== 'ward_visit' && wardName) {
        throw new functions.https.HttpsError('invalid-argument', 'wardName is only allowed for ward_visit type');
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
        throw new functions.https.HttpsError('invalid-argument', 'notes max 500 chars');
    }
    if (zoomLink !== undefined) {
        // Check type restriction first for clearer error message
        if (type === 'ward_visit') {
            throw new functions.https.HttpsError('invalid-argument', 'zoomLink is not applicable to ward_visit');
        }
        const trimmed = typeof zoomLink === 'string' ? zoomLink.trim() : '';
        if (!trimmed || trimmed.length > 500 || !(0, validators_1.isValidUrl)(trimmed)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid zoomLink URL');
        }
    }
    if (customTitle !== undefined) {
        if (type === 'ward_visit') {
            throw new functions.https.HttpsError('invalid-argument', 'customTitle is not applicable to ward_visit');
        }
        if (typeof customTitle !== 'string' || customTitle.trim().length === 0 || customTitle.length > 200) {
            throw new functions.https.HttpsError('invalid-argument', 'customTitle must be 1-200 chars');
        }
    }
    const db = admin.firestore();
    const [callerSnap, seventySnap] = await Promise.all([
        db.collection('users').doc(context.auth.uid).get(),
        db.collection('users').doc(seventyUid).get(),
    ]);
    const callerRole = (_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['admin', 'seventy'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only');
    }
    if (callerRole === 'seventy' && context.auth.uid !== seventyUid) {
        throw new functions.https.HttpsError('permission-denied', 'Seventy can only create schedules for themselves');
    }
    if (!seventySnap.exists || ((_b = seventySnap.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'seventy') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid: user not found or not a seventy');
    }
    if (presidentUid) {
        const presidentSnap = await db.collection('users').doc(presidentUid).get();
        if (!presidentSnap.exists || ((_c = presidentSnap.data()) === null || _c === void 0 ? void 0 : _c.role) !== 'president') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentUid: user not found or not a president');
        }
    }
    const existing = await db.collection('schedules')
        .where('seventyUid', '==', seventyUid)
        .where('date', '==', date)
        .where('startTime', '==', startTime)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', '해당 시간에 이미 확정된 일정이 있습니다.');
    }
    await db.collection('schedules').add({
        type,
        seventyUid,
        unitId: unitId !== null && unitId !== void 0 ? unitId : '',
        wardName: (type === 'ward_visit' && wardName) ? wardName.trim() : null,
        presidentUid: presidentUid !== null && presidentUid !== void 0 ? presidentUid : null,
        date,
        startTime,
        endTime,
        notes: notes !== null && notes !== void 0 ? notes : null,
        zoomLink: (_d = zoomLink === null || zoomLink === void 0 ? void 0 : zoomLink.trim()) !== null && _d !== void 0 ? _d : null,
        customTitle: (_e = customTitle === null || customTitle === void 0 ? void 0 : customTitle.trim()) !== null && _e !== void 0 ? _e : null,
        status: 'confirmed',
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=adminCreateSchedule.js.map