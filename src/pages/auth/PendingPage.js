import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { signOut } from '@/services/authService';
import { Button } from '@/components/ui';
import styles from './PendingPage.module.scss';
export function PendingPage() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const handleSignOut = async () => {
        try {
            await signOut();
        }
        catch {
            toast.error(t('auth.logoutFailed'));
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.iconWrap, children: _jsx(Clock, { size: 32 }) }), _jsx("h1", { className: styles.title, children: t('auth.pendingTitle') }), _jsxs("p", { className: styles.desc, children: [user?.name ? `${user.name}님, ` : '', t('auth.pendingDesc'), _jsx("br", {}), t('auth.pendingHint')] }), _jsx("p", { className: styles.email, children: user?.email }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleSignOut, children: t('auth.logout') })] }) }));
}
