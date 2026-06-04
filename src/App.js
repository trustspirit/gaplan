import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { toast, Toaster } from 'sonner';
import { authUserAtom, authLoadingAtom } from '@/store/authAtom';
import { subscribeToAuthState, handleRedirectResult } from '@/services/authService';
import { AppRouter } from '@/router';
export default function App() {
    const setUser = useSetAtom(authUserAtom);
    const setLoading = useSetAtom(authLoadingAtom);
    useEffect(() => {
        handleRedirectResult().catch(() => {
            toast.error('로그인에 실패했습니다. 다시 시도해주세요.');
        });
        return subscribeToAuthState(setUser, setLoading, () => {
            toast.error('접근 권한이 없습니다. 관리자에게 문의하세요.');
        });
    }, [setUser, setLoading]);
    return (_jsxs(_Fragment, { children: [_jsx(AppRouter, {}), _jsx(Toaster, { position: "top-right", richColors: true })] }));
}
