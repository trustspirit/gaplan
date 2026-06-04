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
exports.calendarSync = void 0;
// DEPLOYMENT REQUIREMENT: The Firebase service account must have the Google Calendar API
// enabled in Google Cloud Console, AND the service account email must be granted
// "Make changes to events" (Editor) access on the shared calendar.
// Service account email: <project-id>@appspot.gserviceaccount.com
// Guide: https://cloud.google.com/iam/docs/service-accounts#service_account_permissions
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
function getCalendarClient() {
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    return googleapis_1.google.calendar({ version: 'v3', auth });
}
exports.calendarSync = functions
    .region('asia-northeast3')
    .firestore.document('schedules/{scheduleId}')
    .onWrite(async (change) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const db = admin.firestore();
    // Resolve which regional calendar to use via the seventy's regionId
    const after = change.after.data();
    const before = change.before.data();
    const seventyUid = (_a = after === null || after === void 0 ? void 0 : after.seventyUid) !== null && _a !== void 0 ? _a : before === null || before === void 0 ? void 0 : before.seventyUid;
    const seventySnap = seventyUid
        ? await db.collection('users').doc(seventyUid).get()
        : null;
    const regionId = (_c = (_b = seventySnap === null || seventySnap === void 0 ? void 0 : seventySnap.data()) === null || _b === void 0 ? void 0 : _b.regionId) !== null && _c !== void 0 ? _c : '';
    const settingsSnap = await db.collection('settings').doc('calendar').get();
    const calendars = (_e = (_d = settingsSnap.data()) === null || _d === void 0 ? void 0 : _d.calendars) !== null && _e !== void 0 ? _e : {};
    // Fall back to legacy single-calendar field if present
    const sharedCalendarId = (_f = calendars[regionId]) !== null && _f !== void 0 ? _f : (_g = settingsSnap.data()) === null || _g === void 0 ? void 0 : _g.sharedCalendarId;
    if (!sharedCalendarId)
        return;
    // Document deleted or schedule cancelled — remove Google Calendar event
    const eventIdToDelete = before === null || before === void 0 ? void 0 : before.googleCalendarEventId;
    const wasCancelled = !after || after.status === 'cancelled';
    if (wasCancelled && eventIdToDelete) {
        try {
            const calendar = getCalendarClient();
            await calendar.events.delete({ calendarId: sharedCalendarId, eventId: eventIdToDelete });
        }
        catch (err) {
            functions.logger.error('Google Calendar delete failed', err);
        }
        return;
    }
    if (!after || after.status !== 'confirmed')
        return;
    if (after.googleCalendarEventId)
        return;
    const unitSnap = await db.collection('units').doc(after.unitId).get();
    const unitName = (_j = (_h = unitSnap.data()) === null || _h === void 0 ? void 0 : _h.name) !== null && _j !== void 0 ? _j : after.unitId;
    const startDateTime = `${after.date}T${after.startTime}:00+09:00`;
    const endDateTime = `${after.date}T${after.endTime}:00+09:00`;
    const title = after.type === 'ward_visit' ? `${unitName} 방문` : `${unitName} 접견`;
    try {
        const calendar = getCalendarClient();
        const event = await calendar.events.insert({
            calendarId: sharedCalendarId,
            requestBody: {
                summary: title,
                start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
                end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
            },
        });
        await change.after.ref.update({ googleCalendarEventId: event.data.id });
    }
    catch (err) {
        functions.logger.error('Google Calendar sync failed', err);
    }
});
//# sourceMappingURL=calendarSync.js.map