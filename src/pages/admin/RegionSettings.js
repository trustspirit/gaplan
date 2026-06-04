import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { authUserAtom } from '@/store/authAtom';
import { createTask } from '@/services/taskService';
import { useUsers } from '@/hooks/useUsers';
import { ALL_UNITS, REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui';
import { MultiDatePicker } from '@/components/domain';
import styles from './RegionSettings.module.scss';
const TASK_TYPE_OPTIONS = [
    { value: 'select_interview', label: '접견 일정 선택 (시간 단위)' },
    { value: 'select_meeting', label: '모임 일정 선택 (시간 단위)' },
];
const SLOT_DURATION_OPTIONS = [
    { value: '30', label: '30분 단위' },
    { value: '60', label: '1시간 단위' },
    { value: '90', label: '1.5시간 단위' },
    { value: '120', label: '2시간 단위' },
];
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';
export function TaskCreation() {
    const user = useAtomValue(authUserAtom);
    const { users } = useUsers();
    const presidents = users.filter(u => u.role === 'president');
    const seventies = users.filter(u => u.role === 'seventy');
    const [selectedPresidents, setSelectedPresidents] = useState(new Set());
    const [seventyUid, setSeventyUid] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [taskType, setTaskType] = useState('select_interview');
    const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [selectedDates, setSelectedDates] = useState([]);
    // per-date time config: date → { startTime, endTime }
    const [dateTimes, setDateTimes] = useState({});
    const [slotDuration, setSlotDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
    function handleDatesChange(dates) {
        setSelectedDates(dates);
        setDateTimes(prev => {
            const next = {};
            dates.forEach(d => {
                next[d] = prev[d] ?? { startTime: DEFAULT_START, endTime: DEFAULT_END };
            });
            return next;
        });
    }
    function setDateSlotTime(date, field, value) {
        setDateTimes(prev => ({ ...prev, [date]: { ...prev[date], [field]: value } }));
    }
    function togglePresident(uid) {
        setSelectedPresidents(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    }
    const filteredPresidents = filterRegion
        ? presidents.filter(p => {
            const unit = ALL_UNITS.find(u => u.id === p.unitId);
            return unit?.regionId === filterRegion;
        })
        : presidents;
    function toggleAll() {
        const pool = filteredPresidents;
        const allSelected = pool.every(p => selectedPresidents.has(p.uid));
        setSelectedPresidents(prev => {
            const next = new Set(prev);
            if (allSelected)
                pool.forEach(p => next.delete(p.uid));
            else
                pool.forEach(p => next.add(p.uid));
            return next;
        });
    }
    function handleRegionFilter(regionId) {
        setFilterRegion(regionId);
        if (regionId) {
            const pool = presidents.filter(p => ALL_UNITS.find(u => u.id === p.unitId)?.regionId === regionId);
            setSelectedPresidents(new Set(pool.map(p => p.uid)));
        }
    }
    const availableDateSlots = selectedDates
        .map(d => ({ date: d, ...(dateTimes[d] ?? { startTime: DEFAULT_START, endTime: DEFAULT_END }) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    const isValid = selectedPresidents.size > 0 && !!seventyUid && availableDateSlots.length > 0;
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isValid) {
            if (selectedPresidents.size === 0)
                toast.error('대상 회장을 한 명 이상 선택해주세요.');
            else if (!seventyUid)
                toast.error('담당 지역 칠십인을 선택해주세요.');
            else
                toast.error('가능 날짜를 하나 이상 선택해주세요.');
            return;
        }
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                return createTask({
                    type: taskType,
                    assignedTo,
                    seventyUid,
                    regionId: unit?.regionId ?? '',
                    dueDate,
                    createdBy: user.uid,
                    availableDays: [],
                    availableDateSlots,
                    slotDurationMinutes: parseInt(slotDuration),
                });
            }));
            toast.success(`Task ${selectedPresidents.size}건이 생성되었습니다.`);
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setSelectedDates([]);
            setDateTimes({});
        }
        catch {
            toast.error('Task 생성에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uC77C\uC815 \uC694\uCCAD \uAD00\uB9AC" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "Task \uC0DD\uC131 (\uC811\uACAC/\uBAA8\uC784 \uC77C\uC815 \uC694\uCCAD)" }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED \uCE60\uC2ED\uC778", value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: "\uB300\uC0C1 \uD68C\uC7A5" }), selectedPresidents.size > 0 && (_jsxs(Badge, { variant: "default", children: [selectedPresidents.size, "\uBA85 \uC120\uD0DD\uB428"] })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: filteredPresidents.every(p => selectedPresidents.has(p.uid)) ? '해제' : '전체 선택' })] }), _jsxs("div", { className: styles.regionFilter, children: [_jsx("button", { type: "button", className: clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive), onClick: () => setFilterRegion(''), children: "\uC804\uCCB4" }), REGIONS.map(r => (_jsx("button", { type: "button", className: clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive), onClick: () => handleRegionFilter(r.id), children: r.name }, r.id)))] }), _jsx("div", { className: styles.presidentList, children: filteredPresidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: filterRegion ? '해당 지역에 등록된 회장이 없습니다.' : '등록된 회장이 없습니다.' })) : (filteredPresidents.map(p => {
                                                const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                            })) })] }), _jsx(Select, { label: "Task \uC720\uD615", value: taskType, onChange: e => setTaskType(e.target.value), options: TASK_TYPE_OPTIONS }), _jsxs("div", { className: styles.availSection, children: [_jsx("p", { className: styles.availLabel, children: "\uAC00\uB2A5 \uB0A0\uC9DC \uC120\uD0DD" }), _jsx("p", { className: styles.availHint, children: "\uCE98\uB9B0\uB354\uC5D0\uC11C \uB0A0\uC9DC\uB97C \uD074\uB9AD\uD574 \uC120\uD0DD\uD558\uC138\uC694. \uB0A0\uC9DC\uBCC4\uB85C \uAC00\uB2A5 \uC2DC\uAC04\uC744 \uC124\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx(MultiDatePicker, { selected: selectedDates, onChange: handleDatesChange }), availableDateSlots.length > 0 && (_jsxs("div", { className: styles.dateTimeList, children: [_jsx("p", { className: styles.dateTimeTitle, children: "\uB0A0\uC9DC\uBCC4 \uAC00\uB2A5 \uC2DC\uAC04" }), availableDateSlots.map(s => (_jsxs("div", { className: styles.dateTimeRow, children: [_jsx("span", { className: styles.dateTimeLabel, children: dayjs(s.date).format('M/D (ddd)') }), _jsx("input", { type: "time", className: styles.timeInput, value: s.startTime, onChange: e => setDateSlotTime(s.date, 'startTime', e.target.value) }), _jsx("span", { className: styles.dateTimeSep, children: "~" }), _jsx("input", { type: "time", className: styles.timeInput, value: s.endTime, onChange: e => setDateSlotTime(s.date, 'endTime', e.target.value) })] }, s.date)))] })), _jsx(Select, { label: "\uC2DC\uAC04 \uB2E8\uC704", value: slotDuration, onChange: e => setSlotDuration(e.target.value), options: SLOT_DURATION_OPTIONS })] }), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs(Button, { type: "submit", loading: loading, disabled: !isValid, children: ["Task ", selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : '', "\uC0DD\uC131"] })] }) })] }) }) }));
}
