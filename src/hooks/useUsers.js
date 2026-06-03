import { useEffect, useState } from 'react';
import { subscribeToUsers } from '@/services/userService';
export function useUsers() {
    const [users, setUsers] = useState([]);
    useEffect(() => subscribeToUsers(setUsers), []);
    return { users };
}
