import { useEffect, useState } from 'react';
import { subscribeToSchedules } from '@/services/scheduleService';
export function useSchedules(options) {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        const unsub = subscribeToSchedules(options, data => {
            setSchedules(data);
            setLoading(false);
        });
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.presidentUid, options.seventyUid]);
    return { schedules, loading };
}
