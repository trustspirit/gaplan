import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { createTask } from '@/services/taskService';
import { useUsers } from '@/hooks/useUsers';
import { ALL_UNITS, REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui';
import { MultiDatePicker } from '@/components/domain';
import styles from './RegionSettings.module.scss';
const SLOT_DURATION_OPTIONS = [
    { value: '30', label: '30분 단위' },
    { value: '60', label: '1시간 단위' },
    { value: '90', label: '1.5시간 단위' },
    { value: '120', label: '2시간 단위' },
];
const DEFAULT_TIME_RANGE = { startTime: '09:00', endTime: '10:00' };
export function TaskCreation() {
    const user = useAtomValue(authUserAtom);
    const { t } = useTranslation();
    const { users } = useUsers();
    const presidents = users.filter(u => u.role === 'president');
    const seventies = users.filter(u => u.role === 'seventy');
    const [selectedPresidents, setSelectedPresidents] = useState(new Set());
    const [seventyUid, setSeventyUid] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const taskType = 'select_interview';
    const [taskTitle, setTaskTitle] = useState('');
    const [taskNote, setTaskNote] = useState('');
    const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [selectedDates, setSelectedDates] = useState([]);
    // per-date time ranges: date → TimeRange[]
    const [dateRanges, setDateRanges] = useState({});
    const [slotDuration, setSlotDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
    function handleDatesChange(dates) {
        setSelectedDates(dates);
        setDateRanges(prev => {
            const next = {};
            dates.forEach(d => {
                next[d] = prev[d] ?? [{ ...DEFAULT_TIME_RANGE }];
            });
            return next;
        });
    }
    function addRange(date) {
        setDateRanges(prev => ({
            ...prev,
            [date]: [...(prev[date] ?? []), { ...DEFAULT_TIME_RANGE }],
        }));
    }
    function removeRange(date, idx) {
        setDateRanges(prev => ({
            ...prev,
            [date]: prev[date].filter((_, i) => i !== idx),
        }));
    }
    function setRangeField(date, idx, field, value) {
        setDateRanges(prev => ({
            ...prev,
            [date]: prev[date].map((r, i) => i === idx ? { ...r, [field]: value } : r),
        }));
    }
    const filteredPresidents = filterRegion
        ? presidents.filter(p => ALL_UNITS.find(u => u.id === p.unitId)?.regionId === filterRegion)
        : presidents;
    function togglePresident(uid) {
        setSelectedPresidents(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    }
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
        .map(date => ({ date, timeRanges: dateRanges[date] ?? [{ ...DEFAULT_TIME_RANGE }] }))
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
        const batchId = `batch_${Date.now()}`;
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                return createTask({
                    type: taskType,
                    batchId,
                    title: taskTitle.trim() || undefined,
                    note: taskNote.trim() || undefined,
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
            toast.success(t('task.createSuccess', { count: selectedPresidents.size }));
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setSelectedDates([]);
            setDateRanges({});
            setTaskTitle('');
            setTaskNote('');
        }
        catch {
            toast.error(t('task.createFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uC77C\uC815 \uC694\uCCAD \uAD00\uB9AC" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "Task \uC0DD\uC131 (\uC811\uACAC/\uC548\uC2DD\uC77C \uBAA8\uC784)" }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx(Input, { label: "Task \uC81C\uBAA9 (\uC120\uD0DD)", value: taskTitle, onChange: e => setTaskTitle(e.target.value), placeholder: "\uC608: 2\uBD84\uAE30 \uC811\uACAC \uC77C\uC815" }), _jsxs("div", { className: styles.textareaField, children: [_jsx("label", { className: styles.textareaLabel, children: "\uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8 (\uC120\uD0DD)" }), _jsx("textarea", { className: styles.textarea, value: taskNote, onChange: e => setTaskNote(e.target.value), placeholder: "\uD68C\uC7A5\uC774 Task\uB97C \uBC1B\uC744 \uB54C \uD568\uAED8 \uBCFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694.", rows: 3 })] }), _jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED \uCE60\uC2ED\uC778", value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: "\uB300\uC0C1 \uD68C\uC7A5" }), selectedPresidents.size > 0 && (_jsxs(Badge, { variant: "default", children: [selectedPresidents.size, "\uBA85 \uC120\uD0DD\uB428"] })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: filteredPresidents.every(p => selectedPresidents.has(p.uid)) ? '해제' : '전체 선택' })] }), _jsxs("div", { className: styles.regionFilter, children: [_jsx("button", { type: "button", className: clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive), onClick: () => setFilterRegion(''), children: "\uC804\uCCB4" }), REGIONS.map(r => (_jsx("button", { type: "button", className: clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive), onClick: () => handleRegionFilter(r.id), children: r.name }, r.id)))] }), _jsx("div", { className: styles.presidentList, children: filteredPresidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: filterRegion ? '해당 지역에 등록된 회장이 없습니다.' : '등록된 회장이 없습니다.' })) : (filteredPresidents.map(p => {
                                                const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                            })) })] }), _jsxs("div", { className: styles.availSection, children: [_jsx("p", { className: styles.availLabel, children: "\uAC00\uB2A5 \uB0A0\uC9DC \uBC0F \uC2DC\uAC04\uB300 \uC124\uC815" }), _jsx("p", { className: styles.availHint, children: "\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uACE0 \uAC01 \uB0A0\uC9DC\uB9C8\uB2E4 \uAC00\uB2A5\uD55C \uC2DC\uAC04\uB300\uB97C \uCD94\uAC00\uD558\uC138\uC694." }), _jsx(MultiDatePicker, { selected: selectedDates, onChange: handleDatesChange }), availableDateSlots.length > 0 && (_jsx("div", { className: styles.dateSlotList, children: availableDateSlots.map(s => (_jsxs("div", { className: styles.dateSlotCard, children: [_jsxs("div", { className: styles.dateSlotHeader, children: [_jsx("span", { className: styles.dateSlotLabel, children: dayjs(s.date).format('M/D (ddd)') }), _jsxs("button", { type: "button", className: styles.addRangeBtn, onClick: () => addRange(s.date), children: [_jsx(Plus, { size: 12 }), "\uC2DC\uAC04\uB300 \uCD94\uAC00"] })] }), s.timeRanges.map((range, idx) => (_jsxs("div", { className: styles.timeRangeRow, children: [_jsx("input", { type: "time", className: styles.timeInput, value: range.startTime, onChange: e => setRangeField(s.date, idx, 'startTime', e.target.value) }), _jsx("span", { className: styles.timeSep, children: "~" }), _jsx("input", { type: "time", className: styles.timeInput, value: range.endTime, onChange: e => setRangeField(s.date, idx, 'endTime', e.target.value) }), s.timeRanges.length > 1 && (_jsx("button", { type: "button", className: styles.removeRangeBtn, onClick: () => removeRange(s.date, idx), children: _jsx(Trash2, { size: 12 }) }))] }, idx)))] }, s.date))) })), _jsx(Select, { label: "\uC2DC\uAC04 \uB2E8\uC704", value: slotDuration, onChange: e => setSlotDuration(e.target.value), options: SLOT_DURATION_OPTIONS })] }), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs(Button, { type: "submit", loading: loading, disabled: !isValid, children: ["Task ", selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : '', "\uC0DD\uC131"] })] }) })] }) }) }));
}
