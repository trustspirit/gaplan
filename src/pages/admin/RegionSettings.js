import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { createTask } from '@/services/taskService';
import { useUsers } from '@/hooks/useUsers';
import { ALL_UNITS, REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui';
import { MultiDatePicker } from '@/components/domain';
import { paintedCellsToDateSlots } from '@/components/domain/TimePainterPicker/paintedCellsToDateSlots';
import { TimePainterPicker } from '@/components/domain/TimePainterPicker/TimePainterPicker';
import styles from './RegionSettings.module.scss';
export function TaskCreation() {
    const user = useAtomValue(authUserAtom);
    const { t } = useTranslation();
    const { users } = useUsers();
    const presidents = users.filter(u => u.role === 'president');
    const seventies = users.filter(u => u.role === 'seventy');
    const [taskType, setTaskType] = useState('select_interview');
    const [selectedPresidents, setSelectedPresidents] = useState(new Set());
    const [seventyUid, setSeventyUid] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskNote, setTaskNote] = useState('');
    const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [selectedDates, setSelectedDates] = useState([]);
    const [paintedCells, setPaintedCells] = useState(new Set());
    const [dailyRange, setDailyRange] = useState(['09:00', '21:00']);
    const [slotDuration, setSlotDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
    function handleTypeChange(type) {
        setTaskType(type);
        setSelectedDates([]);
        setPaintedCells(new Set());
    }
    function handleDatesChange(dates) {
        setSelectedDates(dates);
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
    const slotDurationMinutes = parseInt(slotDuration);
    const availableDateSlots = paintedCellsToDateSlots(paintedCells, slotDurationMinutes);
    const isValid = selectedPresidents.size > 0 && !!seventyUid && selectedDates.length > 0;
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isValid) {
            if (selectedPresidents.size === 0)
                toast.error(t('common.selectPresident'));
            else if (!seventyUid)
                toast.error(t('common.selectSeventy'));
            else
                toast.error(t('common.selectSunday'));
            return;
        }
        const batchId = `batch_${Date.now()}`;
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                if (taskType === 'select_visit') {
                    return createTask({
                        type: 'select_visit',
                        assignedTo,
                        seventyUid,
                        regionId: unit?.regionId ?? '',
                        dueDate,
                        createdBy: user.uid,
                        availableDays: [0],
                        availableDates: selectedDates,
                        note: taskNote.trim() || undefined,
                    });
                }
                return createTask({
                    type: 'select_interview',
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
                    slotDurationMinutes,
                });
            }));
            toast.success(t('task.createSuccess', { count: selectedPresidents.size }));
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setSelectedDates([]);
            setPaintedCells(new Set());
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
    const pageTitle = taskType === 'select_visit'
        ? t('admin.visitTaskCreateTitle')
        : t('admin.taskCreateTitle');
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.taskCreate') }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.taskCreate') }), _jsxs(CardBody, { children: [_jsxs("div", { className: styles.typeToggle, children: [_jsx("button", { type: "button", className: clsx(styles.typeBtn, taskType === 'select_interview' && styles.typeBtnActive), onClick: () => handleTypeChange('select_interview'), children: t('task.type.select_interview') }), _jsx("button", { type: "button", className: clsx(styles.typeBtn, taskType === 'select_visit' && styles.typeBtnActive), onClick: () => handleTypeChange('select_visit'), children: t('task.type.select_visit') })] }), _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx("p", { className: styles.availHint, children: pageTitle }), taskType === 'select_interview' && (_jsx(Input, { label: t('task.title'), value: taskTitle, onChange: e => setTaskTitle(e.target.value), placeholder: t('task.titlePlaceholder') })), _jsxs("div", { className: styles.textareaField, children: [_jsx("label", { className: styles.textareaLabel, children: t('task.noteLabel') }), _jsx("textarea", { className: styles.textarea, value: taskNote, onChange: e => setTaskNote(e.target.value), placeholder: t('task.notePlaceholder'), rows: 3 })] }), _jsx(Select, { label: t('role.seventy'), value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: t('task.targetPresidents') }), selectedPresidents.size > 0 && (_jsx(Badge, { variant: "default", children: t('task.selectedCount', { count: selectedPresidents.size }) })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: filteredPresidents.every(p => selectedPresidents.has(p.uid))
                                                            ? t('common.deselectAll')
                                                            : t('common.selectAll') })] }), _jsxs("div", { className: styles.regionFilter, children: [_jsx("button", { type: "button", className: clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive), onClick: () => setFilterRegion(''), children: t('common.all') }), REGIONS.map(r => (_jsx("button", { type: "button", className: clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive), onClick: () => handleRegionFilter(r.id), children: r.name }, r.id)))] }), _jsx("div", { className: styles.presidentList, children: filteredPresidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: filterRegion ? t('task.noPresidentsInRegion') : t('task.noPresidents') })) : (filteredPresidents.map(p => {
                                                    const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                    return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                                })) })] }), _jsxs("div", { className: styles.availSection, children: [_jsx("p", { className: styles.availLabel, children: taskType === 'select_visit' ? t('task.selectSundays') : t('task.selectDates') }), taskType === 'select_visit' && (_jsx("p", { className: styles.availHint, children: t('task.visitTaskDesc') })), _jsx(MultiDatePicker, { selected: selectedDates, onChange: handleDatesChange, sundayOnly: taskType === 'select_visit' }), taskType === 'select_interview' && (_jsx(TimePainterPicker, { selectedDates: selectedDates, dailyRange: dailyRange, periodMinutes: slotDurationMinutes, paintedCells: paintedCells, onSetCell: (key, on) => {
                                                    setPaintedCells(prev => {
                                                        const next = new Set(prev);
                                                        on ? next.add(key) : next.delete(key);
                                                        return next;
                                                    });
                                                }, onChangeRange: setDailyRange })), taskType === 'select_visit' && selectedDates.length > 0 && (_jsx("div", { className: styles.selectedSundays, children: selectedDates.map(d => (_jsx("span", { className: styles.sundayChip, children: dayjs(d).format('M/D (ddd)') }, d))) })), taskType === 'select_interview' && (_jsx(Input, { label: t('slotDuration.label'), type: "number", min: "5", max: "480", step: "5", value: slotDuration, onChange: e => setSlotDuration(e.target.value) }))] }), _jsx(Input, { label: t('task.dueDate'), type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsx(Button, { type: "submit", loading: loading, disabled: !isValid, children: selectedPresidents.size > 0
                                            ? t('task.createCount', { count: selectedPresidents.size })
                                            : t('task.create') })] })] })] }) }) }));
}
