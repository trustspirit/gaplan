import { useEffect, useState } from 'react';
import { getAvailabilitySlots } from '@/services/availabilityService';
export function useAvailability(seventyUid) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!seventyUid)
            return;
        getAvailabilitySlots(seventyUid).then(data => {
            setSlots(data);
            setLoading(false);
        });
    }, [seventyUid]);
    return { slots, loading, setSlots };
}
