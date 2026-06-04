import { useEffect, useState } from 'react';
import { subscribeToTasks, subscribeToAllTasks } from '@/services/taskService';
export function useTasks(assignedTo) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!assignedTo) {
            setLoading(false);
            return;
        }
        const unsub = subscribeToTasks(assignedTo, data => {
            setTasks(data);
            setLoading(false);
        });
        return unsub;
    }, [assignedTo]);
    return { tasks, loading };
}
export function useAllTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsub = subscribeToAllTasks(data => {
            setTasks(data);
            setLoading(false);
        });
        return unsub;
    }, []);
    return { tasks, loading };
}
