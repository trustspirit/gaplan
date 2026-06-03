import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { authUserAtom } from '@/store/authAtom';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { AppShell, Sidebar, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { ScheduleItem } from '@/components/domain';
import styles from './VisitsPage.module.scss';
export function VisitsPage() {
    const user = useAtomValue(authUserAtom);
    const filters = user.role === 'president' ? { presidentUid: user.uid } : { seventyUid: user.uid };
    const { schedules } = useSchedules(filters);
    const { getUnitName } = useUnits();
    const visits = schedules.filter(s => s.type === 'ward_visit' && s.status === 'confirmed');
    return (_jsx(AppShell, { sidebar: _jsx(Sidebar, { role: user.role, name: user.name }), topBar: _jsx(TopBar, { name: user.name, subtext: "\uC640\uB4DC \uBC29\uBB38 \uC77C\uC815" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC640\uB4DC \uBC29\uBB38 \uC77C\uC815" }), _jsx(CardBody, { children: visits.length === 0
                            ? _jsx("p", { className: styles.empty, children: "\uD655\uC815\uB41C \uBC29\uBB38 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                            : visits.map(s => _jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id)) })] }) }) }));
}
