import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import styles from './EditScheduleModal.module.scss';
const adminEditScheduleFn = httpsCallable(functions, 'adminEditSchedule');
const adminDeleteScheduleFn = httpsCallable(functions, 'adminDeleteSchedule');
export function EditScheduleModal({ schedule, onClose, onSaved }) {
    const [date, setDate] = useState(schedule.date);
    const [startTime, setStartTime] = useState(schedule.startTime);
    const [endTime, setEndTime] = useState(schedule.endTime);
    const [note, setNote] = useState(schedule.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await adminEditScheduleFn({
                scheduleId: schedule.id,
                updates: { date, startTime, endTime, notes: note },
            });
            onSaved();
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        setSaving(true);
        setError(null);
        try {
            await adminDeleteScheduleFn({ scheduleId: schedule.id });
            onSaved();
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { className: styles.overlay, onClick: onClose, children: _jsxs("div", { className: styles.sheet, onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uC77C\uC815 \uD3B8\uC9D1" }), _jsx("button", { type: "button", onClick: onClose, className: styles.closeBtn, children: "\u2715" })] }), error && _jsx("div", { className: styles.errorBanner, children: error }), _jsxs("div", { className: styles.fields, children: [_jsx("label", { className: styles.fieldLabel, children: "\uB0A0\uC9DC" }), _jsx("input", { type: "date", className: styles.fieldInput, value: date, onChange: e => setDate(e.target.value) }), _jsx("label", { className: styles.fieldLabel, children: "\uC2DC\uC791 \uC2DC\uAC04" }), _jsx("input", { type: "time", className: styles.fieldInput, value: startTime, onChange: e => setStartTime(e.target.value) }), _jsx("label", { className: styles.fieldLabel, children: "\uC885\uB8CC \uC2DC\uAC04" }), _jsx("input", { type: "time", className: styles.fieldInput, value: endTime, onChange: e => setEndTime(e.target.value) }), _jsx("label", { className: styles.fieldLabel, children: "\uBA54\uBAA8" }), _jsx("textarea", { className: styles.fieldTextarea, value: note, onChange: e => setNote(e.target.value), rows: 3 })] }), _jsx("div", { className: styles.actions, children: confirmDelete ? (_jsxs("div", { className: styles.deleteConfirm, children: [_jsx("p", { className: styles.deleteConfirmText, children: "\uC77C\uC815\uC744 \uC0AD\uC81C\uD558\uBA74 Google Calendar\uC5D0\uC11C\uB3C4 \uC0AD\uC81C\uB429\uB2C8\uB2E4. \uACC4\uC18D\uD560\uAE4C\uC694?" }), _jsxs("div", { className: styles.deleteConfirmBtns, children: [_jsx("button", { type: "button", className: styles.cancelBtn, onClick: () => setConfirmDelete(false), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: styles.deleteBtn, onClick: handleDelete, disabled: saving, children: saving ? '삭제 중...' : '삭제 확인' })] })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: styles.deleteBtn, onClick: () => setConfirmDelete(true), children: "\uC0AD\uC81C" }), _jsx("button", { type: "button", className: styles.saveBtn, onClick: handleSave, disabled: saving, children: saving ? '저장 중...' : '저장' })] })) })] }) }));
}
