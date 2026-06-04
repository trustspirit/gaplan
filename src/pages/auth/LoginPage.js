import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { signInWithGoogle } from '@/services/authService';
import { authUserAtom, authLoadingAtom } from '@/store/authAtom';
import styles from './LoginPage.module.scss';
export function LoginPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const user = useAtomValue(authUserAtom);
    const authLoading = useAtomValue(authLoadingAtom);
    const navigate = useNavigate();
    if (!authLoading && user) {
        let dest = '/dashboard';
        if (user.role === 'pending' && !user.unitId)
            dest = '/onboarding';
        else if (user.role === 'pending')
            dest = '/pending';
        else if (user.role === 'president' && !user.unitId)
            dest = '/onboarding';
        navigate(dest, { replace: true });
        return null;
    }
    const handleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        }
        catch {
            toast.error(t('auth.loginFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.logo }), _jsx("h1", { className: styles.title, children: "gaplan" }), _jsx("p", { className: styles.subtitle, children: t('auth.loginSubtitle') }), _jsx(Button, { onClick: handleSignIn, loading: loading, fullWidth: true, size: "lg", children: t('auth.loginWith') })] }) }));
}
