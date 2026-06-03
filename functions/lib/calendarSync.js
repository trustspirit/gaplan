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
    var _a, _b, _c;
    const db = admin.firestore();
    const settingsSnap = await db.collection('settings').doc('calendar').get();
    const sharedCalendarId = (_a = settingsSnap.data()) === null || _a === void 0 ? void 0 : _a.sharedCalendarId;
    if (!sharedCalendarId)
        return;
    const after = change.after.data();
    const before = change.before.data();
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
    const unitName = (_c = (_b = unitSnap.data()) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : after.unitId;
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