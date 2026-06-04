import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { AppShell, TopBar } from '@/components/layout';
import { ScheduleItem } from '@/components/domain';
import styles from './VisitsPage.module.scss';
function groupByMonth(schedules) {
    const map = new Map();
    for (const s of schedules) {
        const key = dayjs(s.date).format('YYYY년 M월');
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(s);
    }
    return map;
}
function sortMonthKeys(keys) {
    return [...keys].sort((a, b) => {
        const da = dayjs(a, 'YYYY년 M월');
        const db = dayjs(b, 'YYYY년 M월');
        return da.isBefore(db) ? -1 : 1;
    });
}
export function VisitsPage() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const [activeTab, setActiveTab] = useState('all');
    const filters = user.role === 'president'
        ? { presidentUid: user.uid }
        : user.role === 'seventy'
            ? { seventyUid: user.uid }
            : {};
    const { schedules } = useSchedules(filters);
    const { getUnitName } = useUnits();
    const today = dayjs();
    const thisMonth = today.format('YYYY-M');
    const allVisits = schedules.filter(s => s.type === 'ward_visit' && s.status === 'confirmed');
    const upcomingCount = allVisits.filter(s => !dayjs(s.date).isBefore(today, 'day')).length;
    const completedCount = allVisits.filter(s => dayjs(s.date).isBefore(today, 'day')).length;
    const thisMonthCount = allVisits.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length;
    const filtered = allVisits.filter(s => {
        if (activeTab === 'upcoming')
            return !dayjs(s.date).isBefore(today, 'day');
        if (activeTab === 'completed')
            return dayjs(s.date).isBefore(today, 'day');
        return true;
    });
    const sorted = [...filtered].sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);
    const grouped = groupByMonth(sorted);
    const monthKeys = sortMonthKeys(Array.from(grouped.keys()));
    // Sort: current month first, then future, then past
    const currentMonthKey = today.format('YYYY년 M월');
    const orderedKeys = [
        ...monthKeys.filter(k => k === currentMonthKey),
        ...monthKeys.filter(k => {
            const d = dayjs(k, 'YYYY년 M월');
            return d.isAfter(today, 'month');
        }),
        ...monthKeys.filter(k => {
            const d = dayjs(k, 'YYYY년 M월');
            return d.isBefore(today, 'month');
        }),
    ];
    // Upcoming: next 5 visits (date >= today, sorted ascending)
    const upcomingVisits = allVisits
        .filter(s => !dayjs(s.date).isBefore(today, 'day'))
        .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1)
        .slice(0, 5);
    const TABS = ['all', 'upcoming', 'completed'];
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('visits.title') }), children: _jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs("div", { className: styles.stats, children: [_jsxs("div", { className: styles.statCard, children: [_jsx("span", { className: styles.statValue, children: thisMonthCount }), _jsx("span", { className: styles.statLabel, children: t('visits.thisMonth') })] }), _jsx("div", { className: styles.statDivider }), _jsxs("div", { className: styles.statCard, children: [_jsx("span", { className: styles.statValue, children: upcomingCount }), _jsx("span", { className: styles.statLabel, children: t('visits.upcoming') })] }), _jsx("div", { className: styles.statDivider }), _jsxs("div", { className: styles.statCard, children: [_jsx("span", { className: styles.statValue, children: completedCount }), _jsx("span", { className: styles.statLabel, children: t('visits.completed') })] })] }), _jsx("div", { className: styles.tabBar, children: TABS.map(tab => (_jsx("button", { type: "button", className: styles.tabBtn, "data-active": activeTab === tab, onClick: () => setActiveTab(tab), children: t(`visits.tabs.${tab}`) }, tab))) }), _jsx("div", { className: styles.content, children: orderedKeys.length === 0 ? (_jsxs("div", { className: styles.empty, children: [_jsx(MapPin, { size: 32, className: styles.emptyIcon }), _jsx("p", { className: styles.emptyTitle, children: t('visits.empty') }), _jsx("p", { className: styles.emptyDesc, children: activeTab === 'upcoming' ? t('visits.noUpcoming') : activeTab === 'completed' ? t('visits.noCompleted') : t('visits.noAll') })] })) : (orderedKeys.map(monthKey => {
                                const items = grouped.get(monthKey);
                                return (_jsxs("div", { className: styles.monthGroup, children: [_jsx("h3", { className: styles.monthLabel, children: monthKey }), _jsx("div", { className: styles.itemList, children: items.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId), showCalendarAdd: user.role === 'president' }, s.id))) })] }, monthKey));
                            })) })] }), _jsx("div", { className: styles.sideCol, children: _jsxs("div", { className: styles.sideCard, children: [_jsx("div", { className: styles.sideCardHeader, children: t('visits.nextVisits') }), _jsx("div", { className: styles.sideCardBody, children: upcomingVisits.length === 0 ? (_jsx("p", { className: styles.sideEmpty, children: t('visits.noUpcoming') })) : (upcomingVisits.map(s => (_jsxs("div", { className: styles.upcomingItem, children: [_jsx("span", { className: styles.upcomingDate, children: dayjs(s.date).format('M/D (ddd)') }), _jsx("span", { className: styles.upcomingUnit, children: getUnitName(s.unitId) })] }, s.id)))) })] }) })] }) }));
}
