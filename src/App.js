import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { toast, Toaster } from 'sonner';
import { authUserAtom, authLoadingAtom } from '@/store/authAtom';
import { subscribeToAuthState, consumeRedirectResult } from '@/services/authService';
import i18n from '@/i18n';
import { AppRouter } from '@/router';
export default function App() {
    const setUser = useSetAtom(authUserAtom);
    const setLoading = useSetAtom(authLoadingAtom);
    useEffect(() => {
        consumeRedirectResult();
        return subscribeToAuthState(setUser, setLoading, () => {
            toast.error(i18n.t('common.loginError'));
        });
    }, [setUser, setLoading]);
    return (_jsxs(_Fragment, { children: [_jsx(AppRouter, {}), _jsx(Toaster, { position: "top-right", richColors: true })] }));
}
