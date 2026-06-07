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
exports.adminDeletePreRegisteredUser = exports.adminAddPreRegisteredUser = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
async function assertAdmin(uid) {
    var _a;
    const snap = await admin.firestore().collection('users').doc(uid).get();
    if (!snap.exists || ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
}
exports.adminAddPreRegisteredUser = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    await assertAdmin(context.auth.uid);
    if (!((_a = data.name) === null || _a === void 0 ? void 0 : _a.trim())) {
        throw new functions.https.HttpsError('invalid-argument', 'name required');
    }
    if (!['president', 'seventy'].includes(data.role)) {
        throw new functions.https.HttpsError('invalid-argument', 'role must be president or seventy');
    }
    const db = admin.firestore();
    const ref = db.collection('users').doc();
    await ref.set(Object.assign(Object.assign(Object.assign(Object.assign({ name: data.name.trim(), email: ((_b = data.email) !== null && _b !== void 0 ? _b : '').trim().toLowerCase(), role: data.role }, (data.unitId ? { unitId: data.unitId } : {})), (data.regionId ? { regionId: data.regionId } : {})), (data.regionIds ? { regionIds: data.regionIds } : {})), { preRegistered: true, createdBy: context.auth.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
    return { uid: ref.id };
});
exports.adminDeletePreRegisteredUser = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
    var _a;
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    await assertAdmin(context.auth.uid);
    if (!data.uid)
        throw new functions.https.HttpsError('invalid-argument', 'uid required');
    const db = admin.firestore();
    const snap = await db.collection('users').doc(data.uid).get();
    if (!snap.exists || !((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.preRegistered)) {
        throw new functions.https.HttpsError('not-found', 'Pre-registered user not found');
    }
    await db.collection('users').doc(data.uid).delete();
    return { success: true };
});
//# sourceMappingURL=adminPreRegistration.js.map