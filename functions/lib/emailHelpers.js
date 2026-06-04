"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_TYPE_LABELS = exports.APP_URL = void 0;
exports.resolveTaskTypeLabel = resolveTaskTypeLabel;
exports.APP_URL = 'https://gaplan-fccfe.web.app';
exports.TASK_TYPE_LABELS = {
    select_visit: '와드 방문 일정',
    select_interview: '접견/모임 일정',
};
function resolveTaskTypeLabel(type, title) {
    return title || exports.TASK_TYPE_LABELS[type] || 'Task';
}
//# sourceMappingURL=emailHelpers.js.map