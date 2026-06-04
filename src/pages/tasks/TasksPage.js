import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { X } from 'lucide-react';
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
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const isMobile = useIsMobile();
    const { activeTask, selectedSlots, toggleSlot, isSlotSelected, submitting: slotSubmitting, availableSlots, isVisit, openTask, closeTask, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const respondedTasks = tasks.filter(t => t.status === 'responded');
    const pickerTitle = taskPickerTitle(activeTask);
    const pickerContent = activeTask ? (_jsx(TaskPickerContent, { activeTask: activeTask, user: user, availableSlots: availableSlots, isSlotSelected: isSlotSelected, onToggleSlot: toggleSlot, slotSubmitting: slotSubmitting, selectedSlots: selectedSlots, onSubmitAvailability: handleSubmitAvailability, onSubmitWards: handleSubmitWards, wardSubmitting: wardSubmitting })) : null;
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: pendingTasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694" }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : pendingTasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: "\uCC98\uB9AC\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                                : pendingTasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), !tasksLoading && respondedTasks.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC81C\uCD9C \uC644\uB8CC \u00B7 \uD655\uC815 \uB300\uAE30" }), _jsx(CardBody, { children: respondedTasks.map(t => (_jsx(TaskCard, { task: t, onAction: t.type === 'select_visit' ? openTask : undefined }, t.id))) })] })), !isMobile && isVisit && activeTask && (_jsxs(Card, { children: [_jsx(CardHeader, { title: pickerTitle, action: _jsx("button", { type: "button", className: styles.closeBtn, onClick: closeTask, children: _jsx(X, { size: 16 }) }) }), _jsx(CardBody, { children: pickerContent })] }))] }), !isMobile && !isVisit && (_jsx("div", { className: styles.sideCol, children: activeTask ? (_jsxs("div", { className: styles.sidePickerCard, children: [_jsx("div", { className: styles.sidePickerHeader, children: pickerTitle }), _jsx("div", { className: styles.sidePickerBody, children: pickerContent })] })) : (_jsx("div", { className: styles.sidePlaceholder, children: "Task\uB97C \uC120\uD0DD\uD558\uBA74 \uC5EC\uAE30\uC11C \uCC98\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" })) }))] }), isMobile && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: pickerTitle, children: pickerContent }))] }));
}
