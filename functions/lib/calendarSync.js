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
const unitRegionMap_1 = require("./unitRegionMap");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const db = admin.firestore();
    // Resolve which regional calendar to use via the seventy's regionId
    const after = change.after.data();
    const before = change.before.data();
    const seventyUid = (_a = after === null || after === void 0 ? void 0 : after.seventyUid) !== null && _a !== void 0 ? _a : before === null || before === void 0 ? void 0 : before.seventyUid;
    const seventySnap = seventyUid
        ? await db.collection('users').doc(seventyUid).get()
        : null;
    // Determine regionId from the schedule's unitId (which stake/district this visit is for).
    // This correctly routes to the right regional calendar even when one seventy
    // serves multiple regions. Fall back to seventy's own regionId, then empty.
    const scheduleUnitId = (_c = (_b = after === null || after === void 0 ? void 0 : after.unitId) !== null && _b !== void 0 ? _b : before === null || before === void 0 ? void 0 : before.unitId) !== null && _c !== void 0 ? _c : '';
    const regionId = (_f = (_d = unitRegionMap_1.UNIT_REGION_MAP[scheduleUnitId]) !== null && _d !== void 0 ? _d : (_e = seventySnap === null || seventySnap === void 0 ? void 0 : seventySnap.data()) === null || _e === void 0 ? void 0 : _e.regionId) !== null && _f !== void 0 ? _f : '';
    const settingsSnap = await db.collection('settings').doc('calendar').get();
    const calendars = (_h = (_g = settingsSnap.data()) === null || _g === void 0 ? void 0 : _g.calendars) !== null && _h !== void 0 ? _h : {};
    // Fall back to legacy single-calendar field if present
    const sharedCalendarId = (_j = calendars[regionId]) !== null && _j !== void 0 ? _j : (_k = settingsSnap.data()) === null || _k === void 0 ? void 0 : _k.sharedCalendarId;
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
    // Only skip creation if there's already an event AND the date/time haven't changed
    const dateChanged = (before === null || before === void 0 ? void 0 : before.date) !== after.date || (before === null || before === void 0 ? void 0 : before.startTime) !== after.startTime || (before === null || before === void 0 ? void 0 : before.endTime) !== after.endTime;
    if (after.googleCalendarEventId && !dateChanged)
        return;
    const unitSnap = after.unitId
        ? await db.collection('units').doc(after.unitId).get()
        : null;
    const unitName = (_o = (_m = (_l = unitSnap === null || unitSnap === void 0 ? void 0 : unitSnap.data()) === null || _l === void 0 ? void 0 : _l.name) !== null && _m !== void 0 ? _m : after.unitId) !== null && _o !== void 0 ? _o : '';
    const startDateTime = `${after.date}T${after.startTime}:00+09:00`;
    const endDateTime = `${after.date}T${after.endTime}:00+09:00`;
    let title;
    if (after.type === 'ward_visit') {
        title = after.wardName ? `${unitName} - ${after.wardName} 방문` : `${unitName} 방문`;
    }
    else if (after.type === 'interview') {
        title = `${unitName} 접견`;
    }
    else {
        title = unitName ? `${unitName} 모임` : '모임';
    }
    const calendar = getCalendarClient();
    const existingEventId = before === null || before === void 0 ? void 0 : before.googleCalendarEventId;
    try {
        if (existingEventId) {
            // Update existing event (re-confirmation after schedule was overwritten)
            await calendar.events.update({
                calendarId: sharedCalendarId,
                eventId: existingEventId,
                requestBody: {
                    summary: title,
                    start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
                    end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
                },
            });
        }
        else {
            // Create new event
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
    }
    catch (err) {
        functions.logger.error('Google Calendar sync failed', err);
    }
});
//# sourceMappingURL=calendarSync.js.map