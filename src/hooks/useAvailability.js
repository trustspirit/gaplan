import { useEffect, useState } from 'react';
import { getAvailabilitySlots } from '@/services/availabilityService';
export function useAvailability(seventyUid) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!seventyUid) {
            setSlots([]);
            setLoading(false);
            setError(null);
            return;
        }
        let cancelled = false;
        setSlots([]); // immediately clear previous seventy's slots
        setLoading(true);
        setError(null);
        getAvailabilitySlots(seventyUid)
            .then(data => {
            if (!cancelled) {
                setSlots(data);
                setLoading(false);
            }
        })
            .catch(e => {
            if (!cancelled) {
                setError(e);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [seventyUid]);
    return { slots, loading, error, setSlots };
}
