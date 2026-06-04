import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button, BottomSheet, Skeleton } from '@/components/ui';
import { TaskCard, TimeSlotPicker, VisitDatePicker } from '@/components/domain';
import styles from './TasksPage.module.scss';
export function TasksPage() {
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const isMobile = useIsMobile();
    const { activeTask, selectedSlot, setSelectedSlot, selectedSlots, toggleSlot, isSlotSelected, submitting, availableSlots, isVisit, isMultiSelect, openTask, closeTask, handleConfirm, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const respondedTasks = tasks.filter(t => t.status === 'responded');
    const slotPickerContent = (_jsxs(_Fragment, { children: [isVisit ? (_jsx(VisitDatePicker, { slots: availableSlots, selected: selectedSlot, onSelect: setSelectedSlot })) : (_jsx(TimeSlotPicker, { slots: availableSlots, granularity: "time", multiSelect: true, isSlotSelected: isSlotSelected, onToggle: toggleSlot })), isMultiSelect ? (_jsxs(Button, { onClick: handleSubmitAvailability, loading: submitting, disabled: selectedSlots.length === 0, fullWidth: true, className: styles.confirmBtn, children: ["\uAC00\uB2A5 \uC2DC\uAC04 \uC81C\uCD9C ", selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''] })) : (_jsx(Button, { onClick: handleConfirm, loading: submitting, disabled: !selectedSlot, fullWidth: true, className: styles.confirmBtn, children: "\uBC29\uBB38 \uC77C\uC815 \uD655\uC815" }))] }));
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: pendingTasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694" }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : pendingTasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: "\uCC98\uB9AC\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                                : pendingTasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), !tasksLoading && respondedTasks.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC81C\uCD9C \uC644\uB8CC \u00B7 \uD655\uC815 \uB300\uAE30" }), _jsx(CardBody, { children: respondedTasks.map(t => _jsx(TaskCard, { task: t }, t.id)) })] }))] }), !isMobile && (_jsx("div", { className: styles.sideCol, children: activeTask ? (_jsxs("div", { className: styles.sidePickerCard, children: [_jsx("div", { className: styles.sidePickerHeader, children: isVisit
                                        ? '방문 날짜 선택'
                                        : '가능한 시간 선택 (복수 가능)' }), _jsx("div", { className: styles.sidePickerBody, children: slotPickerContent })] })) : (_jsx("div", { className: styles.sidePlaceholder, children: "Task\uB97C \uC120\uD0DD\uD558\uBA74 \uC5EC\uAE30\uC11C \uC77C\uC815\uC744 \uD655\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" })) }))] }), isMobile && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: isVisit ? '방문 날짜 선택' : '가능한 시간 선택 (복수 가능)', children: slotPickerContent }))] }));
}
