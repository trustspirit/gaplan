import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { Badge, Button } from '@/components/ui';
import styles from './TaskCard.module.scss';
const TASK_LABELS = {
    select_visit: '와드 방문 일정 선택',
    select_interview: '접견 일정 선택',
    select_meeting: '모임 일정 선택',
};
export function TaskCard({ task, onAction }) {
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isUrgent = daysLeft <= 3;
    const isOverdue = daysLeft < 0;
    const isResponded = task.status === 'responded';
    const label = TASK_LABELS[task.type] ?? task.type;
    const dDayLabel = isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`;
    return (_jsxs("div", { className: clsx(styles.card, isUrgent && !isResponded && styles.urgent, isResponded && styles.responded), children: [_jsxs("div", { className: styles.left, children: [isResponded
                        ? _jsx(Clock, { size: 14, className: styles.iconResponded })
                        : _jsx(AlertCircle, { size: 14, className: styles.icon }), _jsxs("div", { className: styles.labelGroup, children: [_jsx("span", { className: styles.label, children: label }), isResponded && (_jsx("span", { className: styles.respondedHint, children: "\uC81C\uCD9C \uC644\uB8CC \u00B7 \uD655\uC815 \uB300\uAE30 \uC911" }))] })] }), _jsxs("div", { className: styles.right, children: [!isResponded && (_jsx(Badge, { variant: isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning', children: dDayLabel })), isResponded
                        ? _jsx(Badge, { variant: "default", children: "\uB300\uAE30 \uC911" })
                        : _jsx(Button, { size: "sm", onClick: () => onAction?.(task), children: "\uCC98\uB9AC" })] })] }));
}
