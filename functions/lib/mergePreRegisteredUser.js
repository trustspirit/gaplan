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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergePreRegisteredUser = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
exports.mergePreRegisteredUser = functions
    .region('asia-northeast3')
    .https.onCall(async (_data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const callerEmail = ((_a = context.auth.token.email) !== null && _a !== void 0 ? _a : '').trim().toLowerCase();
    const callerEmailVerified = context.auth.token.email_verified === true;
    if (!callerEmail || !callerEmailVerified) {
        return null; // No verified email → no pre-registration possible
    }
    const db = admin.firestore();
    const realUid = context.auth.uid;
    // Idempotency: if real user doc already exists, return it
    const realUserSnap = await db.collection('users').doc(realUid).get();
    if (realUserSnap.exists) {
        return Object.assign(Object.assign({}, realUserSnap.data()), { uid: realUid });
    }
    // Server-side lookup by email (bypasses Firestore client Rules)
    const emailSnap = await db.collection('users').where('email', '==', callerEmail).get();
    const preRegDoc = emailSnap.docs.find(d => d.data().preRegistered === true);
    if (!preRegDoc)
        return null; // No pre-registration found → normal login flow
    const preUserData = preRegDoc.data();
    // Verify the placeholder was admin-created (prevents self-issued placeholders)
    if (preUserData.createdBy) {
        const createdBySnap = await db.collection('users').doc(preUserData.createdBy).get();
        if (!createdBySnap.exists || ((_b = createdBySnap.data()) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Pre-registered user was not created by an admin');
        }
    }
    const preUid = preRegDoc.id;
    const [seventySchedules, presidentSchedules] = await Promise.all([
        db.collection('schedules').where('seventyUid', '==', preUid).get(),
        db.collection('schedules').where('presidentUid', '==', preUid).get(),
    ]);
    const totalOps = 2 + seventySchedules.size + presidentSchedules.size;
    if (totalOps > 498) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many schedule references to merge in one batch');
    }
    const batch = db.batch();
    const { preRegistered: _drop, createdBy: _by } = preUserData, userData = __rest(preUserData, ["preRegistered", "createdBy"]);
    const mergedUserData = Object.assign(Object.assign({}, userData), { mergedAt: admin.firestore.FieldValue.serverTimestamp() });
    batch.set(db.collection('users').doc(realUid), mergedUserData);
    batch.delete(db.collection('users').doc(preUid));
    for (const snap of seventySchedules.docs)
        batch.update(snap.ref, { seventyUid: realUid });
    for (const snap of presidentSchedules.docs)
        batch.update(snap.ref, { presidentUid: realUid });
    await batch.commit();
    return userData; // Return without serverTimestamp fields (not serializable)
});
//# sourceMappingURL=mergePreRegisteredUser.js.map