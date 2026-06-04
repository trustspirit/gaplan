import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Badge, Button } from '@/components/ui';
import styles from './TaskCard.module.scss';
export function TaskCard({ task, onAction }) {
    const { t } = useTranslation();
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isUrgent = daysLeft <= 3;
    const isOverdue = daysLeft < 0;
    const isResponded = task.status === 'responded';
    // Ward visit tasks in responded state can be reopened for editing
    const canReopen = isResponded && task.type === 'select_visit';
    const TASK_LABELS = {
        select_visit: t('schedule.type.ward_visit'),
        select_interview: t('task.type.select_interview'),
    };
    const label = task.title ?? (TASK_LABELS[task.type] ?? task.type);
    const dDayLabel = isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`;
    return (_jsxs("div", { className: clsx(styles.card, isUrgent && !isResponded && styles.urgent, isResponded && styles.responded), children: [_jsxs("div", { className: styles.left, children: [isResponded
                        ? _jsx(Clock, { size: 14, className: styles.iconResponded })
                        : _jsx(AlertCircle, { size: 14, className: styles.icon }), _jsxs("div", { className: styles.labelGroup, children: [_jsx("span", { className: styles.label, children: label }), isResponded && (_jsx("span", { className: styles.respondedHint, children: t('task.awaitingConfirmation') }))] })] }), _jsxs("div", { className: styles.right, children: [!isResponded && (_jsx(Badge, { variant: isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning', children: dDayLabel })), isResponded && !canReopen && (_jsx(Badge, { variant: "default", children: t('common.waiting') })), (!isResponded || canReopen) && onAction && (_jsx(Button, { size: "sm", variant: canReopen ? 'secondary' : 'primary', onClick: () => onAction(task), children: canReopen ? t('common.edit') : t('common.process') }))] })] }));
}
