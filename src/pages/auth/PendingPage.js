import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { signOut } from '@/services/authService';
import { Button } from '@/components/ui';
import styles from './PendingPage.module.scss';
export function PendingPage() {
    const user = useAtomValue(authUserAtom);
    const handleSignOut = async () => {
        try {
            await signOut();
        }
        catch {
            toast.error('로그아웃에 실패했습니다.');
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.iconWrap, children: _jsx(Clock, { size: 32 }) }), _jsx("h1", { className: styles.title, children: "\uC2B9\uC778 \uB300\uAE30 \uC911" }), _jsxs("p", { className: styles.desc, children: [user?.name ? `${user.name}님, ` : '', "\uAD00\uB9AC\uC790\uAC00 \uACC4\uC815\uC744 \uC2B9\uC778\uD558\uBA74 \uC11C\uBE44\uC2A4\uB97C \uC774\uC6A9\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", _jsx("br", {}), "\uC2B9\uC778 \uD6C4 \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694."] }), _jsx("p", { className: styles.email, children: user?.email }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleSignOut, children: "\uB85C\uADF8\uC544\uC6C3" })] }) }));
}
