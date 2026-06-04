import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useWardSubmit } from '@/hooks/useWardSubmit';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, BottomSheet, Skeleton } from '@/components/ui';
import { TaskCard, TaskPickerContent, taskPickerTitle } from '@/components/domain';
import styles from './TasksPage.module.scss';
export function TasksPage() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const isMobile = useIsMobile();
    const { activeTask, selectedSlots, toggleSlot, isSlotSelected, submitting: slotSubmitting, availableSlots, isVisit, openTask, closeTask, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const respondedTasks = tasks.filter(t => t.status === 'responded');
    const pickerTitle = taskPickerTitle(activeTask);
    const pickerContent = activeTask ? (_jsx(TaskPickerContent, { activeTask: activeTask, user: user, availableSlots: availableSlots, isSlotSelected: isSlotSelected, onToggleSlot: toggleSlot, slotSubmitting: slotSubmitting, selectedSlots: selectedSlots, onSubmitAvailability: handleSubmitAvailability, onSubmitWards: handleSubmitWards, wardSubmitting: wardSubmitting })) : null;
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: pendingTasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: t('task.needsAction') }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : pendingTasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: t('task.noTasks') })
                                                : pendingTasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), !tasksLoading && respondedTasks.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: t('task.responded') }), _jsx(CardBody, { children: respondedTasks.map(t => (_jsx(TaskCard, { task: t, onAction: t.type === 'select_visit' ? openTask : undefined }, t.id))) })] })), !isMobile && isVisit && activeTask && (_jsxs(Card, { children: [_jsx(CardHeader, { title: pickerTitle, action: _jsx("button", { type: "button", className: styles.closeBtn, onClick: closeTask, children: _jsx(X, { size: 16 }) }) }), _jsx(CardBody, { children: pickerContent })] }))] }), !isMobile && !isVisit && (_jsx("div", { className: styles.sideCol, children: activeTask ? (_jsxs("div", { className: styles.sidePickerCard, children: [_jsx("div", { className: styles.sidePickerHeader, children: pickerTitle }), _jsx("div", { className: styles.sidePickerBody, children: pickerContent })] })) : (_jsx("div", { className: styles.sidePlaceholder, children: t('task.selectTask') })) }))] }), isMobile && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: pickerTitle, children: pickerContent }))] }));
}
