import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { submitWardAssignments } from '@/services/taskService';
import { getWardsByUnit } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button, BottomSheet, Skeleton } from '@/components/ui';
import { TaskCard, TimeSlotPicker, WardAssigner } from '@/components/domain';
import styles from './TasksPage.module.scss';
function useWardSubmit(activeTask, onDone) {
    const [submitting, setSubmitting] = useState(false);
    const handleSubmitWards = async (assignments) => {
        if (!activeTask)
            return;
        setSubmitting(true);
        try {
            const result = await submitWardAssignments({ taskId: activeTask.id, wardAssignments: assignments });
            if (result.success) {
                toast.success('와드 방문 배정이 제출되었습니다!');
                onDone();
            }
            else {
                toast.error(result.error ?? '제출에 실패했습니다.');
            }
        }
        catch (e) {
            const msg = e?.message
                ?? e?.code
                ?? '알 수 없는 오류가 발생했습니다.';
            console.error('[submitWardAssignments]', e);
            toast.error(msg);
        }
        finally {
            setSubmitting(false);
        }
    };
    return { handleSubmitWards, submitting };
}
export function TasksPage() {
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const isMobile = useIsMobile();
    const { activeTask, selectedSlot, setSelectedSlot, selectedSlots, toggleSlot, isSlotSelected, submitting: slotSubmitting, availableSlots, isVisit, isMultiSelect, openTask, closeTask, handleConfirm, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const { handleSubmitWards, submitting: wardSubmitting } = useWardSubmit(activeTask, closeTask);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const respondedTasks = tasks.filter(t => t.status === 'responded');
    const availableWards = isVisit && activeTask
        ? getWardsByUnit(user.unitId ?? '')
        : [];
    // Interview / time-based slot picker (used in sidePanel on PC + BottomSheet on mobile)
    const slotPickerContent = (_jsxs(_Fragment, { children: [_jsx(TimeSlotPicker, { slots: availableSlots, granularity: "time", multiSelect: true, isSlotSelected: isSlotSelected, onToggle: toggleSlot }), _jsxs(Button, { onClick: handleSubmitAvailability, loading: slotSubmitting, disabled: selectedSlots.length === 0, fullWidth: true, className: styles.confirmBtn, children: ["\uAC00\uB2A5 \uC2DC\uAC04 \uC81C\uCD9C ", selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''] })] }));
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: pendingTasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694" }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : pendingTasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: "\uCC98\uB9AC\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                                : pendingTasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), !tasksLoading && respondedTasks.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC81C\uCD9C \uC644\uB8CC \u00B7 \uD655\uC815 \uB300\uAE30" }), _jsx(CardBody, { children: respondedTasks.map(t => _jsx(TaskCard, { task: t }, t.id)) })] })), !isMobile && isVisit && activeTask && (_jsxs(Card, { children: [_jsx(CardHeader, { title: activeTask.title ?? '와드/지부 방문 날짜 배정', action: _jsx("button", { type: "button", className: styles.closeBtn, onClick: closeTask, children: _jsx(X, { size: 16 }) }) }), _jsx(CardBody, { children: _jsx(WardAssigner, { availableDates: activeTask.availableDates ?? [], wards: availableWards, note: activeTask.note, onSubmit: handleSubmitWards, submitting: wardSubmitting }) })] }))] }), !isMobile && !isVisit && (_jsx("div", { className: styles.sideCol, children: activeTask ? (_jsxs("div", { className: styles.sidePickerCard, children: [_jsx("div", { className: styles.sidePickerHeader, children: "\uAC00\uB2A5\uD55C \uC2DC\uAC04 \uC120\uD0DD (\uBCF5\uC218 \uAC00\uB2A5)" }), _jsx("div", { className: styles.sidePickerBody, children: slotPickerContent })] })) : (_jsx("div", { className: styles.sidePlaceholder, children: "Task\uB97C \uC120\uD0DD\uD558\uBA74 \uC5EC\uAE30\uC11C \uCC98\uB9AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" })) }))] }), isMobile && isVisit && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: activeTask?.title ?? '와드/지부 방문 날짜 배정', children: activeTask && (_jsx(WardAssigner, { availableDates: activeTask.availableDates ?? [], wards: availableWards, note: activeTask.note, onSubmit: handleSubmitWards, submitting: wardSubmitting })) })), isMobile && !isVisit && (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: "\uAC00\uB2A5\uD55C \uC2DC\uAC04 \uC120\uD0DD (\uBCF5\uC218 \uAC00\uB2A5)", children: slotPickerContent }))] }));
}
