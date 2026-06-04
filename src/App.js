import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { toast, Toaster } from 'sonner';
import { authUserAtom, authLoadingAtom } from '@/store/authAtom';
import { subscribeToAuthState, consumeRedirectResult } from '@/services/authService';
import { AppRouter } from '@/router';
export default function App() {
    const setUser = useSetAtom(authUserAtom);
    const setLoading = useSetAtom(authLoadingAtom);
    useEffect(() => {
        consumeRedirectResult();
        return subscribeToAuthState(setUser, setLoading, () => {
            toast.error('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        });
    }, [setUser, setLoading]);
    return (_jsxs(_Fragment, { children: [_jsx(AppRouter, {}), _jsx(Toaster, { position: "top-right", richColors: true })] }));
}
