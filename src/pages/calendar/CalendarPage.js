import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { CalendarView, ScheduleItem } from '@/components/domain';
import styles from './CalendarPage.module.scss';
export function CalendarPage() {
    const user = useAtomValue(authUserAtom);
    const [selectedDate, setSelectedDate] = useState(null);
    const { getUnitName } = useUnits();
    const filters = user.role === 'president'
        ? { presidentUid: user.uid }
        : user.role === 'seventy'
            ? { seventyUid: user.uid }
            : {};
    const { schedules } = useSchedules(filters);
    // Toggle: clicking the same date again deselects it
    const handleDateClick = (date) => {
        setSelectedDate(prev => prev === date ? null : date);
    };
    const daySchedules = selectedDate
        ? schedules.filter(s => s.status === 'confirmed' && s.date === selectedDate)
        : schedules
            .filter(s => s.status === 'confirmed' && s.date >= dayjs().format('YYYY-MM-DD'))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 10);
    const listTitle = selectedDate
        ? dayjs(selectedDate).format('M월 D일 (ddd) 일정')
        : '예정 일정 (상위 10건)';
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uCE98\uB9B0\uB354" }), children: _jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.layout, children: [_jsx("div", { className: styles.calendarCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC77C\uC815 \uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules, onDateClick: handleDateClick, selectedDate: selectedDate, getUnitName: getUnitName }) })] }) }), _jsx("div", { className: styles.listCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: listTitle, action: selectedDate ? (_jsx("button", { type: "button", className: styles.clearBtn, onClick: () => setSelectedDate(null), title: "\uC120\uD0DD \uD574\uC81C", children: _jsx(X, { size: 14 }) })) : undefined }), _jsx(CardBody, { children: daySchedules.length === 0
                                        ? _jsx("p", { className: styles.empty, children: "\uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                        : daySchedules.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId), showCalendarAdd: user.role === 'president' }, s.id))) })] }) })] }) }) }));
}
