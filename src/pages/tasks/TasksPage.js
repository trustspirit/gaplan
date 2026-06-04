import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button, BottomSheet, Skeleton } from '@/components/ui';
import { TaskCard, TimeSlotPicker } from '@/components/domain';
import styles from './TasksPage.module.scss';
export function TasksPage() {
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const isMobile = useIsMobile();
    const { activeTask, selectedSlot, setSelectedSlot, submitting, slotsLoading, availableSlots, openTask, closeTask, handleConfirm, } = useTaskConfirm(user.uid, user.unitId);
    const slotPickerContent = (_jsxs(_Fragment, { children: [slotsLoading
                ? _jsx(Skeleton, { height: "120px" })
                : _jsx(TimeSlotPicker, { slots: availableSlots, selected: selectedSlot, onSelect: setSelectedSlot }), _jsx(Button, { onClick: handleConfirm, loading: submitting, disabled: !selectedSlot || slotsLoading, fullWidth: true, className: styles.confirmBtn, children: "\uC77C\uC815 \uD655\uC815" })] }));
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: tasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsx("div", { className: styles.mainCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694 Task" }), _jsx(CardBody, { children: tasksLoading
                                        ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                        : tasks.length === 0
                                            ? _jsx("p", { className: styles.empty, children: "\uBAA8\uB4E0 task\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })
                                            : tasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }) }), !isMobile && (_jsx("div", { className: styles.sideCol, children: activeTask ? (_jsxs("div", { className: styles.sidePickerCard, children: [_jsx("div", { className: styles.sidePickerHeader, children: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD" }), _jsx("div", { className: styles.sidePickerBody, children: slotPickerContent })] })) : (_jsx("div", { className: styles.sidePlaceholder, children: "Task\uB97C \uC120\uD0DD\uD558\uBA74 \uC5EC\uAE30\uC11C \uC77C\uC815\uC744 \uD655\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" })) }))] }), isMobile && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD", children: slotPickerContent }))] }));
}
