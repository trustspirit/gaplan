import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { authUserAtom } from '@/store/authAtom';
import { useSchedules } from '@/hooks/useSchedules';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AppShell, Sidebar, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { CalendarView } from '@/components/domain';
import styles from './CalendarPage.module.scss';
export function CalendarPage() {
    const user = useAtomValue(authUserAtom);
    const isMobile = useIsMobile();
    const filters = user.role === 'president' ? { presidentUid: user.uid } : user.role === 'seventy' ? { seventyUid: user.uid } : {};
    const { schedules } = useSchedules(filters);
    return (_jsx(AppShell, { sidebar: _jsx(Sidebar, { role: user.role, name: user.name }), topBar: _jsx(TopBar, { name: user.name, subtext: "\uCE98\uB9B0\uB354" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC77C\uC815 \uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules, defaultView: isMobile ? 'week' : 'month' }) })] }) }) }));
}
