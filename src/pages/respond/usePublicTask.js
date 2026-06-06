import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
const getPublicTaskInfoFn = httpsCallable(functions, 'getPublicTaskInfo');
export function usePublicTask(taskId, token) {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!taskId || !token) {
            setError('잘못된 링크입니다.');
            setLoading(false);
            return;
        }
        getPublicTaskInfoFn({ taskId, token })
            .then((res) => setTask(res.data))
            .catch((err) => setError(err.message ?? '정보를 불러올 수 없습니다.'))
            .finally(() => setLoading(false));
    }, [taskId, token]);
    return { task, loading, error };
}
