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
import styles from './VisitPlanner.module.scss';
export function VisitPlanner() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const { users } = useUsers();
    const presidents = users.filter(u => u.role === 'president');
    const seventies = users.filter(u => u.role === 'seventy');
    const [seventyUid, setSeventyUid] = useState('');
    const [availableDates, setAvailableDates] = useState([]);
    const [filterRegion, setFilterRegion] = useState('');
    const [selectedPresidents, setSelectedPresidents] = useState(new Set());
    const [taskNote, setTaskNote] = useState('');
    const [dueDate, setDueDate] = useState(dayjs().add(14, 'day').format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
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
    const isValid = !!seventyUid && availableDates.length > 0 && selectedPresidents.size > 0;
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isValid) {
            if (!seventyUid)
                toast.error(t('common.selectSeventy'));
            else if (availableDates.length === 0)
                toast.error(t('common.selectSunday'));
            else
                toast.error(t('common.selectPresident'));
            return;
        }
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                return createTask({
                    type: 'select_visit',
                    assignedTo,
                    seventyUid,
                    regionId: unit?.regionId ?? '',
                    dueDate,
                    createdBy: user.uid,
                    availableDays: [0],
                    availableDates,
                    note: taskNote.trim() || undefined,
                });
            }));
            toast.success(t('task.createSuccess', { count: selectedPresidents.size }));
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setAvailableDates([]);
            setTaskNote('');
        }
        catch {
            toast.error(t('task.createFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.visitPlanner') }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.visitTaskCreateTitle') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('task.visitTaskDesc') }), _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx(Select, { label: t('role.seventy'), value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.section, children: [_jsx("p", { className: styles.sectionLabel, children: t('ward.noSundaysAvailable', { defaultValue: '가능 방문 일요일 선택' }) }), _jsx("p", { className: styles.sectionHint, children: t('ward.sundayOnlyHint', { defaultValue: '금식일을 제외한 일요일만 선택할 수 있습니다.' }) }), _jsx(MultiDatePicker, { selected: availableDates, onChange: setAvailableDates, sundayOnly: true }), availableDates.length > 0 && (_jsx("div", { className: styles.selectedSundays, children: availableDates.map(d => (_jsx("span", { className: styles.sundayChip, children: dayjs(d).format('M/D (ddd)') }, d))) }))] }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: t('task.targetPresidents', { defaultValue: '대상 회장' }) }), selectedPresidents.size > 0 && (_jsx(Badge, { variant: "default", children: t('task.selectedCount', { count: selectedPresidents.size, defaultValue: `${selectedPresidents.size}명 선택됨` }) })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: filteredPresidents.every(p => selectedPresidents.has(p.uid))
                                                            ? t('common.deselectAll', { defaultValue: '해제' })
                                                            : t('common.selectAll', { defaultValue: '전체 선택' }) })] }), _jsxs("div", { className: styles.regionFilter, children: [_jsx("button", { type: "button", className: clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive), onClick: () => setFilterRegion(''), children: "\uC804\uCCB4" }), REGIONS.map(r => (_jsx("button", { type: "button", className: clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive), onClick: () => handleRegionFilter(r.id), children: r.name }, r.id)))] }), _jsx("div", { className: styles.presidentList, children: filteredPresidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: filterRegion
                                                        ? t('task.noPresidentsInRegion', { defaultValue: '해당 지역에 등록된 회장이 없습니다.' })
                                                        : t('task.noPresidents', { defaultValue: '등록된 회장이 없습니다.' }) })) : (filteredPresidents.map(p => {
                                                    const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                    return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                                })) })] }), _jsx(Input, { label: t('task.dueDate'), type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs("div", { className: styles.textareaField, children: [_jsx("label", { className: styles.textareaLabel, children: t('task.noteLabel', { defaultValue: '요청 사항 / 메모 (선택)' }) }), _jsx("textarea", { className: styles.textarea, value: taskNote, onChange: e => setTaskNote(e.target.value), placeholder: t('task.notePlaceholder', { defaultValue: '회장이 Task를 받을 때 함께 볼 내용을 입력하세요.' }), rows: 3 })] }), _jsx(Button, { type: "submit", loading: loading, disabled: !isValid, children: selectedPresidents.size > 0
                                            ? t('task.createCount', { count: selectedPresidents.size, defaultValue: `Task ${selectedPresidents.size}건 생성` })
                                            : t('task.create') })] })] })] }) }) }));
}
