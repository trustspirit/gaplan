import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { httpsCallable } from 'firebase/functions';
import { useAtomValue } from 'jotai';
import { X } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { functions } from '@/firebase';
import { useUsers } from '@/hooks/useUsers';
import { ALL_UNITS, getWardsByUnit } from '@/constants/regions';
import { Button, Select, Input } from '@/components/ui';
import styles from './ScheduleFormModal.module.scss';
const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule');
export function ScheduleFormModal({ initialDate, onClose, onSaved }) {
    const user = useAtomValue(authUserAtom);
    const { users } = useUsers();
    const [type, setType] = useState('ward_visit');
    const [seventyUid, setSeventyUid] = useState(user.role === 'seventy' ? user.uid : '');
    const [unitId, setUnitId] = useState('');
    const [wardName, setWardName] = useState('');
    const [presidentUid, setPresidentUid] = useState('');
    const [date, setDate] = useState(initialDate ?? '');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    // Reset ward when stake changes
    useEffect(() => { setWardName(''); }, [unitId]);
    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);
    const seventyUsers = users.filter(u => u.role === 'seventy');
    const wardOptions = unitId ? getWardsByUnit(unitId).map(w => ({ value: w.name, label: w.name })) : [];
    const unitOptions = ALL_UNITS.map(u => ({ value: u.id, label: u.name }));
    const seventyOptions = seventyUsers.map(u => ({ value: u.uid, label: u.name }));
    const presidentOptions = users
        .filter(u => u.role === 'president' && u.unitId === unitId && !!unitId)
        .map(u => ({ value: u.uid, label: u.name }));
    const handleSave = async () => {
        setError(null);
        if (!date || !startTime || !endTime) {
            setError('날짜와 시간을 입력해주세요.');
            return;
        }
        if (startTime >= endTime) {
            setError('종료 시간은 시작 시간보다 늦어야 합니다.');
            return;
        }
        if (user.role === 'admin' && !seventyUid) {
            setError('담당 칠십인을 선택해주세요.');
            return;
        }
        if (type === 'ward_visit' && (!unitId || !wardName)) {
            setError('스테이크/지방부와 와드/지부를 선택해주세요.');
            return;
        }
        if (type === 'interview' && !unitId) {
            setError('스테이크/지방부를 선택해주세요.');
            return;
        }
        setSaving(true);
        try {
            await adminCreateScheduleFn({
                type,
                seventyUid,
                ...(unitId ? { unitId } : {}),
                ...(wardName ? { wardName } : {}),
                ...(presidentUid ? { presidentUid } : {}),
                date,
                startTime,
                endTime,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
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
    const TYPE_TABS = [
        { value: 'ward_visit', label: '와드 방문' },
        { value: 'interview', label: '접견' },
        { value: 'meeting', label: '모임' },
    ];
    return createPortal(_jsx("div", { className: styles.overlay, onClick: onClose, children: _jsxs("div", { className: styles.sheet, role: "dialog", "aria-modal": "true", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: styles.header, children: [_jsx("h3", { className: styles.title, children: "\uC0C8 \uC77C\uC815 \uB4F1\uB85D" }), _jsx("button", { type: "button", onClick: onClose, className: styles.closeBtn, children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: styles.segmented, children: TYPE_TABS.map(tab => (_jsx("button", { type: "button", className: type === tab.value ? styles.segBtnActive : styles.segBtn, onClick: () => { setType(tab.value); setUnitId(''); setWardName(''); setPresidentUid(''); }, children: tab.label }, tab.value))) }), error && _jsx("div", { className: styles.errorBanner, children: error }), _jsxs("div", { className: styles.fields, children: [user.role === 'admin' && (_jsx(Select, { label: "\uB2F4\uB2F9 \uCE60\uC2ED\uC778", value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions })), _jsx(Select, { label: type === 'meeting' ? '스테이크/지방부 (선택)' : '스테이크/지방부', value: unitId, onChange: e => setUnitId(e.target.value), options: unitOptions }), type === 'ward_visit' && (_jsx(Select, { label: "\uC640\uB4DC/\uC9C0\uBD80", value: wardName, onChange: e => setWardName(e.target.value), options: wardOptions, disabled: !unitId })), type === 'interview' && (_jsx(Select, { label: "\uD68C\uC7A5 (\uC120\uD0DD)", value: presidentUid, onChange: e => setPresidentUid(e.target.value), options: presidentOptions, disabled: !unitId })), _jsx(Input, { type: "date", label: "\uB0A0\uC9DC", value: date, onChange: e => setDate(e.target.value) }), _jsxs("div", { className: styles.timeRow, children: [_jsx(Input, { type: "time", label: "\uC2DC\uC791 \uC2DC\uAC04", value: startTime, onChange: e => setStartTime(e.target.value) }), _jsx(Input, { type: "time", label: "\uC885\uB8CC \uC2DC\uAC04", value: endTime, onChange: e => setEndTime(e.target.value) })] }), _jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.fieldLabel, children: "\uBA54\uBAA8 (\uC120\uD0DD)" }), _jsx("textarea", { className: styles.textarea, value: notes, onChange: e => setNotes(e.target.value), placeholder: "\uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694", rows: 3 })] })] }), _jsxs("div", { className: styles.footer, children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: saving, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: handleSave, loading: saving, children: "\uC77C\uC815 \uC800\uC7A5" })] })] }) }), document.body);
}
