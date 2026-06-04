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
import styles from './VisitPlanner.module.scss';
export function VisitPlanner() {
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
                toast.error('담당 지역 칠십인을 선택해주세요.');
            else if (availableDates.length === 0)
                toast.error('가능 방문 일요일을 하나 이상 선택해주세요.');
            else
                toast.error('대상 회장을 한 명 이상 선택해주세요.');
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
            toast.success(`와드 방문 Task ${selectedPresidents.size}건이 생성되었습니다.`);
            setSelectedPresidents(new Set());
            setSeventyUid('');
            setAvailableDates([]);
            setTaskNote('');
        }
        catch {
            toast.error('Task 생성에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uBC29\uBB38 \uC77C\uC815 \uACC4\uD68D" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC640\uB4DC \uBC29\uBB38 Task \uC0DD\uC131" }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: "\uAC00\uB2A5\uD55C \uBC29\uBB38 \uC77C\uC694\uC77C\uC744 \uC120\uD0DD\uD558\uACE0 \uD68C\uC7A5\uB4E4\uC5D0\uAC8C Task\uB97C \uBC30\uC815\uD569\uB2C8\uB2E4. \uD68C\uC7A5\uB4E4\uC740 Task\uC5D0\uC11C \uAC01 \uC640\uB4DC/\uC9C0\uBD80\uC5D0 \uB0A0\uC9DC\uB97C \uBC30\uC815\uD574 \uC81C\uCD9C\uD569\uB2C8\uB2E4." }), _jsxs("form", { className: styles.form, onSubmit: handleCreate, children: [_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED \uCE60\uC2ED\uC778", value: seventyUid, onChange: e => setSeventyUid(e.target.value), options: seventyOptions }), _jsxs("div", { className: styles.section, children: [_jsx("p", { className: styles.sectionLabel, children: "\uAC00\uB2A5 \uBC29\uBB38 \uC77C\uC694\uC77C \uC120\uD0DD" }), _jsx("p", { className: styles.sectionHint, children: "\uAE08\uC2DD\uC77C\uC744 \uC81C\uC678\uD55C \uC77C\uC694\uC77C\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx(MultiDatePicker, { selected: availableDates, onChange: setAvailableDates, sundayOnly: true }), availableDates.length > 0 && (_jsx("div", { className: styles.selectedSundays, children: availableDates.map(d => (_jsx("span", { className: styles.sundayChip, children: dayjs(d).format('M/D (ddd)') }, d))) }))] }), _jsxs("div", { className: styles.presidentSection, children: [_jsxs("div", { className: styles.presidentHeader, children: [_jsx("span", { className: styles.presidentLabel, children: "\uB300\uC0C1 \uD68C\uC7A5" }), selectedPresidents.size > 0 && (_jsxs(Badge, { variant: "default", children: [selectedPresidents.size, "\uBA85 \uC120\uD0DD\uB428"] })), _jsx("button", { type: "button", className: styles.selectAllBtn, onClick: toggleAll, children: filteredPresidents.every(p => selectedPresidents.has(p.uid)) ? '해제' : '전체 선택' })] }), _jsxs("div", { className: styles.regionFilter, children: [_jsx("button", { type: "button", className: clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive), onClick: () => setFilterRegion(''), children: "\uC804\uCCB4" }), REGIONS.map(r => (_jsx("button", { type: "button", className: clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive), onClick: () => handleRegionFilter(r.id), children: r.name }, r.id)))] }), _jsx("div", { className: styles.presidentList, children: filteredPresidents.length === 0 ? (_jsx("p", { className: styles.noneText, children: filterRegion ? '해당 지역에 등록된 회장이 없습니다.' : '등록된 회장이 없습니다.' })) : (filteredPresidents.map(p => {
                                                    const unit = ALL_UNITS.find(u => u.id === p.unitId);
                                                    return (_jsxs("label", { className: styles.presidentRow, children: [_jsx("input", { type: "checkbox", checked: selectedPresidents.has(p.uid), onChange: () => togglePresident(p.uid), className: styles.checkbox }), _jsx("span", { className: styles.presidentName, children: p.name }), unit && _jsx("span", { className: styles.presidentUnit, children: unit.name })] }, p.uid));
                                                })) })] }), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs("div", { className: styles.textareaField, children: [_jsx("label", { className: styles.textareaLabel, children: "\uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8 (\uC120\uD0DD)" }), _jsx("textarea", { className: styles.textarea, value: taskNote, onChange: e => setTaskNote(e.target.value), placeholder: "\uD68C\uC7A5\uC774 Task\uB97C \uBC1B\uC744 \uB54C \uD568\uAED8 \uBCFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694.", rows: 3 })] }), _jsxs(Button, { type: "submit", loading: loading, disabled: !isValid, children: ["Task ", selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : '', "\uC0DD\uC131"] })] })] })] }) }) }));
}
