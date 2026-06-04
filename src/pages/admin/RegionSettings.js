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
import styles from './RegionSettings.module.scss';
const TASK_TYPE_OPTIONS = [
    { value: 'select_visit', label: '와드 방문 일정 선택' },
    { value: 'select_interview', label: '접견 일정 선택' },
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
    const [loading, setLoading] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
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
    const handleCreate = async (e) => {
        e.preventDefault();
        if (selectedPresidents.size === 0) {
            toast.error('대상 회장을 한 명 이상 선택해주세요.');
            return;
        }
        if (!seventyUid) {
            toast.error('담당 지역 칠십인을 선택해주세요.');
            return;
        }
        setLoading(true);
        try {
            await Promise.all(Array.from(selectedPresidents).map(assignedTo => {
                const president = presidents.find(p => p.uid === assignedTo);
                const unit = ALL_UNITS.find(u => u.id === president?.unitId);
                const regionId = unit?.regionId ?? '';
                return createTask({ type: taskType, assignedTo, seventyUid, regionId, dueDate, createdBy: user.uid });
            }));
            toast.success(`Task ${selectedPresidents.size}건이 생성되었습니다.`);
            setSelectedPresidents(new Set());
            setSeventyUid('');
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
                                            })) })] }), _jsx(Select, { label: "Task \uC720\uD615", value: taskType, onChange: e => setTaskType(e.target.value), options: TASK_TYPE_OPTIONS }), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsxs(Button, { type: "submit", loading: loading, disabled: selectedPresidents.size === 0 || !seventyUid, children: ["Task ", selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : '', "\uC0DD\uC131"] })] }) })] }) }) }));
}
