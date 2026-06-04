import { useEffect, useState } from 'react';
import { subscribeToUsers } from '@/services/userService';
export function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => subscribeToUsers(data => {
        setUsers(data);
        setLoading(false);
    }), []);
    return { users, loading };
}
