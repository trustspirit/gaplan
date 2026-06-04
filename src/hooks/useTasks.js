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
// seventyUid: pass the seventy's UID to restrict to their tasks only
export function useAllTasks(seventyUid) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsub = subscribeToAllTasks(data => {
            setTasks(data);
            setLoading(false);
        }, seventyUid);
        return unsub;
    }, [seventyUid]);
    return { tasks, loading };
}
