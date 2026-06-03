import { jsx as _jsx } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { Navigate, Outlet } from 'react-router-dom';
import { authUserAtom } from '@/store/authAtom';
export function RoleRoute({ allow }) {
    const user = useAtomValue(authUserAtom);
    if (!user || !allow.includes(user.role))
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    return _jsx(Outlet, {});
}
