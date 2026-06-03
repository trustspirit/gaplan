import { useEffect, useState } from 'react';
import { subscribeToTasks } from '@/services/taskService';
export function useTasks(assignedTo) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!assignedTo)
            return;
        const unsub = subscribeToTasks(assignedTo, data => {
            setTasks(data);
            setLoading(false);
        });
        return unsub;
    }, [assignedTo]);
    return { tasks, loading };
}
