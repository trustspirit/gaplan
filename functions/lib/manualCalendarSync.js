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
exports.manualCalendarSync = void 0;
/**
 * manualCalendarSync — callable by admin to re-trigger Google Calendar sync
 * for all confirmed schedules that don't have a googleCalendarEventId yet.
 *
 * This handles the case where the calendarSync Firestore trigger failed
 * (e.g. due to missing regionId on the seventy user).
 */
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const unitRegionMap_1 = require("./unitRegionMap");
const unitNameMap_1 = require("./unitNameMap");
function getCalendarClient() {
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    return googleapis_1.google.calendar({ version: 'v3', auth });
}
exports.manualCalendarSync = functions
    .region('asia-northeast3')
    .https.onCall(async (_data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const db = admin.firestore();
    const callerSnap = await db.collection('users').doc(context.auth.uid).get();
    if (((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const settingsSnap = await db.collection('settings').doc('calendar').get();
    const calendars = (_c = (_b = settingsSnap.data()) === null || _b === void 0 ? void 0 : _b.calendars) !== null && _c !== void 0 ? _c : {};
    // Find all confirmed schedules without a calendar event
    const snap = await db.collection('schedules')
        .where('status', '==', 'confirmed')
        .get();
    const pending = snap.docs.filter(d => !d.data().googleCalendarEventId);
    if (pending.length === 0) {
        return { success: true, synced: 0, message: '모든 일정이 이미 캘린더에 등록되어 있습니다.' };
    }
    const calendar = getCalendarClient();
    let synced = 0;
    let failed = 0;
    for (const docSnap of pending) {
        const s = docSnap.data();
        const regionId = (_e = unitRegionMap_1.UNIT_REGION_MAP[(_d = s.unitId) !== null && _d !== void 0 ? _d : '']) !== null && _e !== void 0 ? _e : '';
        const calendarId = calendars[regionId];
        if (!calendarId) {
            functions.logger.warn(`manualCalendarSync: no calendar for regionId="${regionId}" (unitId=${s.unitId})`);
            failed++;
            continue;
        }
        const unitName = (_h = (_g = unitNameMap_1.UNIT_NAME_MAP[(_f = s.unitId) !== null && _f !== void 0 ? _f : '']) !== null && _g !== void 0 ? _g : s.unitId) !== null && _h !== void 0 ? _h : '';
        let title;
        if (s.customTitle) {
            title = s.customTitle;
        }
        else if (s.type === 'ward_visit') {
            title = s.wardName ? `${unitName} - ${s.wardName} 방문` : `${unitName} 방문`;
        }
        else if (s.type === 'interview') {
            title = `${unitName} 접견`;
        }
        else {
            title = unitName ? `${unitName} 모임` : '모임';
        }
        const startDateTime = `${s.date}T${s.startTime}:00+09:00`;
        const endDateTime = `${s.date}T${s.endTime}:00+09:00`;
        const zoomLinkValue = (_k = (_j = s.zoomLink) === null || _j === void 0 ? void 0 : _j.trim()) !== null && _k !== void 0 ? _k : '';
        try {
            const event = await calendar.events.insert({
                calendarId,
                requestBody: Object.assign({ summary: title, start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' }, end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' } }, (zoomLinkValue ? { location: zoomLinkValue } : {})),
            });
            await docSnap.ref.update({ googleCalendarEventId: event.data.id });
            synced++;
        }
        catch (err) {
            functions.logger.error(`manualCalendarSync: failed for ${docSnap.id}`, err);
            failed++;
        }
    }
    return {
        success: true,
        synced,
        failed,
        message: `${synced}개 일정을 캘린더에 등록했습니다.${failed > 0 ? ` (${failed}개 실패)` : ''}`,
    };
});
//# sourceMappingURL=manualCalendarSync.js.map