import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { usePublicTask } from './usePublicTask';
import { SlotSelectionGrid } from './SlotSelectionGrid';
import styles from './RespondPage.module.scss';
const submitAvailabilityAnonFn = httpsCallable(functions, 'submitAvailabilityAnon');
const submitWardAssignmentsAnonFn = httpsCallable(functions, 'submitWardAssignmentsAnon');
export default function RespondPage() {
    const { taskId } = useParams();
    const [search] = useSearchParams();
    const token = search.get('t');
    const { task, loading, error } = usePublicTask(taskId, token);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [wardDateMap, setWardDateMap] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [success, setSuccess] = useState(false);
    const handleToggleSlot = (slot) => {
        const key = `${slot.date}_${slot.startTime}_${slot.endTime}`;
        setSelectedSlots(prev => {
            const exists = prev.some(s => `${s.date}_${s.startTime}_${s.endTime}` === key);
            return exists ? prev.filter(s => `${s.date}_${s.startTime}_${s.endTime}` !== key) : [...prev, slot];
        });
    };
    const handleSubmit = async () => {
        if (!taskId || !token || !task)
            return;
        setSubmitError(null);
        setSubmitting(true);
        try {
            if (task.type === 'select_interview') {
                await submitAvailabilityAnonFn({ taskId, token, respondedSlots: selectedSlots });
            }
            else {
                const wardAssignments = Object.entries(wardDateMap)
                    .filter(([, date]) => date)
                    .map(([wardName, date]) => ({ wardName, date }));
                await submitWardAssignmentsAnonFn({ taskId, token, wardAssignments });
            }
            setSuccess(true);
        }
        catch (e) {
            setSubmitError(e instanceof Error ? e.message : '제출 중 오류가 발생했습니다.');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading) {
        return _jsx("div", { className: styles.loadingBox, children: "\uBD88\uB7EC\uC624\uB294 \uC911..." });
    }
    if (error || !task) {
        return (_jsx("div", { className: styles.page, children: _jsx("div", { className: styles.content, children: _jsx("div", { className: styles.errorBanner, children: error ?? '태스크를 찾을 수 없습니다.' }) }) }));
    }
    if (success) {
        return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.successBox, children: [_jsx("div", { className: styles.successIcon, children: "\u2705" }), _jsx("div", { className: styles.successTitle, children: "\uC751\uB2F5\uC774 \uC81C\uCD9C\uB418\uC5C8\uC2B5\uB2C8\uB2E4" }), _jsx("div", { className: styles.successSub, children: "\uB2F4\uB2F9\uC790\uC5D0\uAC8C \uC751\uB2F5\uC774 \uC804\uB2EC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })] }) }));
    }
    const isInterview = task.type === 'select_interview';
    const canSubmit = isInterview
        ? selectedSlots.length > 0
        : Object.values(wardDateMap).some(d => d);
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.header, children: [_jsx("div", { className: styles.headerTitle, children: "\uC77C\uC815 \uC751\uB2F5" }), _jsx("div", { className: styles.headerSub, children: "\uB85C\uADF8\uC778 \uC5C6\uC774 \uC751\uB2F5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" })] }), _jsxs("div", { className: styles.content, children: [_jsxs("div", { className: styles.taskCard, children: [_jsx("div", { className: styles.taskTitle, children: task.title || '일정 요청' }), task.note && _jsx("div", { className: styles.taskNote, children: task.note })] }), submitError && _jsx("div", { className: styles.errorBanner, children: submitError }), isInterview ? (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.sectionTitle, children: "\uAC00\uB2A5\uD55C \uC2DC\uAC04\uC744 \uC120\uD0DD\uD558\uC138\uC694" }), _jsx(SlotSelectionGrid, { availableDateSlots: task.availableDateSlots, selectedSlots: selectedSlots, onToggle: handleToggleSlot })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.sectionTitle, children: "\uAC01 \uC640\uB4DC\uC758 \uBC29\uBB38 \uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uC138\uC694" }), _jsx("div", { className: styles.wardList, children: task.wardAssignments.map(({ wardName }) => (_jsxs("div", { className: styles.wardItem, children: [_jsx("span", { className: styles.wardName, children: wardName }), _jsxs("select", { className: styles.wardDateSelect, value: wardDateMap[wardName] ?? '', onChange: e => setWardDateMap(prev => ({ ...prev, [wardName]: e.target.value })), children: [_jsx("option", { value: "", children: "\uB0A0\uC9DC \uC120\uD0DD" }), task.availableDates.map(date => (_jsx("option", { value: date, children: date }, date)))] })] }, wardName))) })] })), _jsx("div", { className: styles.submitSection, children: _jsx("button", { type: "button", className: styles.submitBtn, disabled: !canSubmit || submitting, onClick: handleSubmit, children: submitting ? '제출 중...' : '응답 제출' }) })] })] }));
}
