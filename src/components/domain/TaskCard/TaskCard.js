import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { Badge, Button } from '@/components/ui';
import styles from './TaskCard.module.scss';
export function TaskCard({ task, onAction }) {
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isUrgent = daysLeft <= 3;
    const isOverdue = daysLeft < 0;
    const label = task.type === 'select_visit' ? '와드 방문 일정 선택' : '접견 일정 선택';
    const dDayLabel = isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`;
    return (_jsxs("div", { className: clsx(styles.card, isUrgent && styles.urgent), children: [_jsxs("div", { className: styles.left, children: [_jsx(AlertCircle, { size: 14, className: styles.icon }), _jsx("span", { className: styles.label, children: label })] }), _jsxs("div", { className: styles.right, children: [_jsx(Badge, { variant: isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning', children: dDayLabel }), _jsx(Button, { size: "sm", onClick: () => onAction(task), children: "\uCC98\uB9AC" })] })] }));
}
