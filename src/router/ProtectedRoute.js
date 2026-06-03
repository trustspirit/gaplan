import { jsx as _jsx } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { Navigate, Outlet } from 'react-router-dom';
import { authUserAtom, authLoadingAtom } from '@/store/authAtom';
import { Spinner } from '@/components/ui';
import styles from './Router.module.scss';
export function ProtectedRoute() {
    const user = useAtomValue(authUserAtom);
    const loading = useAtomValue(authLoadingAtom);
    if (loading)
        return _jsx("div", { className: styles.loadingScreen, children: _jsx(Spinner, {}) });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (user.role === 'president' && !user.unitId)
        return _jsx(Navigate, { to: "/onboarding", replace: true });
    return _jsx(Outlet, {});
}
