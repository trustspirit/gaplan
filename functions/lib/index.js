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
exports.adminDeletePreRegisteredUser = exports.adminAddPreRegisteredUser = exports.mergePreRegisteredUser = exports.adminCreateSchedule = exports.adminDeleteSchedule = exports.adminEditSchedule = exports.submitWardAssignmentsAnon = exports.submitAvailabilityAnon = exports.getPublicTaskInfo = exports.fastSundayBlock = exports.taskReminder = exports.weeklyReminder = exports.taskCreatedNotification = exports.calendarSync = exports.manualCalendarSync = exports.deleteUser = exports.adminConfirmWardVisit = exports.adminConfirmSchedule = exports.submitWardAssignments = exports.submitAvailability = exports.confirmSchedule = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var confirmSchedule_1 = require("./confirmSchedule");
Object.defineProperty(exports, "confirmSchedule", { enumerable: true, get: function () { return confirmSchedule_1.confirmSchedule; } });
var submitAvailability_1 = require("./submitAvailability");
Object.defineProperty(exports, "submitAvailability", { enumerable: true, get: function () { return submitAvailability_1.submitAvailability; } });
var submitWardAssignments_1 = require("./submitWardAssignments");
Object.defineProperty(exports, "submitWardAssignments", { enumerable: true, get: function () { return submitWardAssignments_1.submitWardAssignments; } });
var adminConfirmSchedule_1 = require("./adminConfirmSchedule");
Object.defineProperty(exports, "adminConfirmSchedule", { enumerable: true, get: function () { return adminConfirmSchedule_1.adminConfirmSchedule; } });
var adminConfirmWardVisit_1 = require("./adminConfirmWardVisit");
Object.defineProperty(exports, "adminConfirmWardVisit", { enumerable: true, get: function () { return adminConfirmWardVisit_1.adminConfirmWardVisit; } });
var adminActions_1 = require("./adminActions");
Object.defineProperty(exports, "deleteUser", { enumerable: true, get: function () { return adminActions_1.deleteUser; } });
var manualCalendarSync_1 = require("./manualCalendarSync");
Object.defineProperty(exports, "manualCalendarSync", { enumerable: true, get: function () { return manualCalendarSync_1.manualCalendarSync; } });
var calendarSync_1 = require("./calendarSync");
Object.defineProperty(exports, "calendarSync", { enumerable: true, get: function () { return calendarSync_1.calendarSync; } });
var taskCreatedNotification_1 = require("./taskCreatedNotification");
Object.defineProperty(exports, "taskCreatedNotification", { enumerable: true, get: function () { return taskCreatedNotification_1.taskCreatedNotification; } });
var weeklyReminder_1 = require("./weeklyReminder");
Object.defineProperty(exports, "weeklyReminder", { enumerable: true, get: function () { return weeklyReminder_1.weeklyReminder; } });
var taskReminder_1 = require("./taskReminder");
Object.defineProperty(exports, "taskReminder", { enumerable: true, get: function () { return taskReminder_1.taskReminder; } });
var fastSundayBlock_1 = require("./fastSundayBlock");
Object.defineProperty(exports, "fastSundayBlock", { enumerable: true, get: function () { return fastSundayBlock_1.fastSundayBlock; } });
var getPublicTaskInfo_1 = require("./getPublicTaskInfo");
Object.defineProperty(exports, "getPublicTaskInfo", { enumerable: true, get: function () { return getPublicTaskInfo_1.getPublicTaskInfo; } });
var submitAvailabilityAnon_1 = require("./submitAvailabilityAnon");
Object.defineProperty(exports, "submitAvailabilityAnon", { enumerable: true, get: function () { return submitAvailabilityAnon_1.submitAvailabilityAnon; } });
var submitWardAssignmentsAnon_1 = require("./submitWardAssignmentsAnon");
Object.defineProperty(exports, "submitWardAssignmentsAnon", { enumerable: true, get: function () { return submitWardAssignmentsAnon_1.submitWardAssignmentsAnon; } });
var adminEditSchedule_1 = require("./adminEditSchedule");
Object.defineProperty(exports, "adminEditSchedule", { enumerable: true, get: function () { return adminEditSchedule_1.adminEditSchedule; } });
var adminDeleteSchedule_1 = require("./adminDeleteSchedule");
Object.defineProperty(exports, "adminDeleteSchedule", { enumerable: true, get: function () { return adminDeleteSchedule_1.adminDeleteSchedule; } });
var adminCreateSchedule_1 = require("./adminCreateSchedule");
Object.defineProperty(exports, "adminCreateSchedule", { enumerable: true, get: function () { return adminCreateSchedule_1.adminCreateSchedule; } });
var mergePreRegisteredUser_1 = require("./mergePreRegisteredUser");
Object.defineProperty(exports, "mergePreRegisteredUser", { enumerable: true, get: function () { return mergePreRegisteredUser_1.mergePreRegisteredUser; } });
var adminPreRegistration_1 = require("./adminPreRegistration");
Object.defineProperty(exports, "adminAddPreRegisteredUser", { enumerable: true, get: function () { return adminPreRegistration_1.adminAddPreRegisteredUser; } });
Object.defineProperty(exports, "adminDeletePreRegisteredUser", { enumerable: true, get: function () { return adminPreRegistration_1.adminDeletePreRegisteredUser; } });
//# sourceMappingURL=index.js.map