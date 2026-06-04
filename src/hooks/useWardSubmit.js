import { useState } from 'react';
import { toast } from 'sonner';
import { submitWardAssignments } from '@/services/taskService';
export function useWardSubmit(activeTask, onDone) {
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
            const err = e;
            const msg = err?.details ?? err?.message ?? err?.code ?? '알 수 없는 오류가 발생했습니다.';
            console.error('[submitWardAssignments]', e);
            toast.error(msg);
        }
        finally {
            setSubmitting(false);
        }
    };
    return { handleSubmitWards, wardSubmitting: submitting };
}
