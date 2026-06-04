import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { authUserAtom } from '@/store/authAtom';
import { createTask } from '@/services/taskService';
import { useUsers } from '@/hooks/useUsers';
import { ALL_UNITS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui';
import { MultiDatePicker } from '@/components/domain';
import styles from './RegionSettings.module.scss';
const TASK_TYPE_OPTIONS = [
    { value: 'select_visit', label: '와드 방문 (일요일 일 단위 선택)' },
    { value: 'select_interview', label: '접견 일정 (특정 날짜 · 시간 단위 선택)' },
    { value: 'select_meeting', label: '모임 일정 (특정 날짜 · 시간 단위 선택)' },
];
const SLOT_DURATION_OPTIONS = [
    { value: '30', label: '30분 단위' },
    { value: '60', label: '1시간 단위' },
    { value: '90', label: '1.5시간 단위' },
    { value: '120', label: '2시간 단위' },
];
export function TaskCreation() {
    const user = useAtomValue(authUserAtom);
    const { users } = useUsers();
    const presidents = users.filter(u => u.role === 'president');
    const seventies = users.filter(u => u.role === 'seventy');
    const [selectedPresidents, setSelectedPresidents] = useState(new Set());
    const [seventyUid, setSeventyUid] = useState('');
    const [taskType, setTaskType] = useState('select_visit');
    const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    // Interview/Meeting: specific dates
    const [availableDates, setAvailableDates] = useState([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [slotDuration, setSlotDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
    const isTimeBased = taskType === 'select_interview' || taskType === 'select_meeting';
    function togglePresident(uid) {
        setSelectedPresidents(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    }
    function toggleAll() {
        if (selectedPresidents.size === presidents.length) {
            setSelectedPresidents(new Set());
        }
        else {
            setSelectedPresidents(new Set(presidents.map(p => p.uid)));
        }
    }
    const isValid = selectedPresidents.size > 0 && !!seventyUid
        && (taskType === 'select_visit' || availableDates.length > 0);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isValid) {
            if (selectedPresidents.size === 0)
                toast.error('대상 회장을 한 명 이상 선택해주세요.');
            else if (!seventyUid)
                toast.error('담당 지역 칠십인을 선택해주세요.');
            else if (isTimeBased && availableDates.length === 0)
                toast.error('가능 날짜를 하나 이상 선택해주세요.');
            return;
        }
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                const regionId = unit?.regionId ?? '';
                return createTask({
                    type: taskType,
                    assignedTo,
                    seventyUid,
                    regionId,
                    dueDate,
                    createdBy: user.uid,
                    availableDays: taskType === 'select_visit' ? [0] : [], // Sunday for visits
                    ...(isTimeBased ? {
                        availableDates,
                        availableStartTime: startTime,
                        availableEndTime: endTime,
                        slotDurationMinutes: parseInt(slotDuration),
                    } : {}),
                });
            }));
            toast.success(`Task ${selectedPresidents.size}건이 생성되었습니다.`);
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setAvailableDates([]);
        }
        catch {
            toast.error('Task 생성에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const allSelected = presidents.length > 0 && selectedPresidents.size === presidents.length;
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uC77C\uC815 \uC694\uCCAD \uAD00\uB9AC" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "Task \uC0DD\uC131 (\uC77C\uC815 \uC694\uCCAD)" }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED \uCE60\uC2ED\uC778", value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: "\uB300\uC0C1 \uD68C\uC7A5" }), selectedPresidents.size > 0 && (_jsxs(Badge, { variant: "default", children: [selectedPresidents.size, "\uBA85 \uC120\uD0DD\uB428"] })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: allSelected ? '전체 해제' : '전체 선택' })] }), _jsx("div", { className: styles.presidentList, children: presidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: "\uB4F1\uB85D\uB41C \uD68C\uC7A5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (presidents.map(p => {
                                                const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                            })) })] }), _jsx(Select, { label: "Task \uC720\uD615", value: taskType, onChange: e => setTaskType(e.target.value), options: TASK_TYPE_OPTIONS }), taskType === 'select_visit' && (_jsx("p", { className: styles.visitNote, children: "\uC640\uB4DC \uBC29\uBB38\uC740 \uC77C\uC694\uC77C(\uAE08\uC2DD\uC77C \uC81C\uC678)\uC5D0\uB9CC \uC120\uD0DD \uAC00\uB2A5\uD569\uB2C8\uB2E4." })), isTimeBased && (_jsxs("div", { className: styles.availSection, children: [_jsx("p", { className: styles.availLabel, children: "\uAC00\uB2A5 \uB0A0\uC9DC \uC120\uD0DD" }), _jsx("p", { className: styles.availHint, children: "\uCE98\uB9B0\uB354\uC5D0\uC11C \uB0A0\uC9DC\uB97C \uD074\uB9AD\uD574 \uC120\uD0DD\uD558\uC138\uC694 (\uBCF5\uC218 \uC120\uD0DD \uAC00\uB2A5)" }), _jsx(MultiDatePicker, { selected: availableDates, onChange: setAvailableDates }), _jsxs("div", { className: styles.timeRow, children: [_jsx(Input, { label: "\uAC00\uB2A5 \uC2DC\uC791 \uC2DC\uAC04", type: "time", value: startTime, onChange: e => setStartTime(e.target.value) }), _jsx(Input, { label: "\uAC00\uB2A5 \uC885\uB8CC \uC2DC\uAC04", type: "time", value: endTime, onChange: e => setEndTime(e.target.value) })] }), _jsx(Select, { label: "\uC2DC\uAC04 \uB2E8\uC704", value: slotDuration, onChange: e => setSlotDuration(e.target.value), options: SLOT_DURATION_OPTIONS })] })), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs(Button, { type: "submit", loading: loading, disabled: !isValid, children: ["Task ", selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : '', "\uC0DD\uC131"] })] }) })] }) }) }));
}
