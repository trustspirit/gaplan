import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { auth, db } from '@/firebase';
import { authUserAtom } from '@/store/authAtom';
import { ALL_UNITS } from '@/constants/regions';
import { Input, Select, Button } from '@/components/ui';
import styles from './OnboardingPage.module.scss';
export function OnboardingPage() {
    const { t } = useTranslation();
    const currentUser = useAtomValue(authUserAtom);
    const [name, setName] = useState('');
    const [unitId, setUnitId] = useState('');
    const [loading, setLoading] = useState(false);
    const setUser = useSetAtom(authUserAtom);
    const navigate = useNavigate();
    const unitOptions = ALL_UNITS.map(u => ({ value: u.id, label: u.name }));
    // Invited president → saves as president, pending user → saves as pending
    const isPending = currentUser?.role === 'pending';
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !unitId) {
            toast.error('이름과 소속을 입력해주세요.');
            return;
        }
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
            toast.error(t('onboarding.loginRequired'));
            navigate('/login');
            return;
        }
        setLoading(true);
        try {
            const role = isPending ? 'pending' : 'president';
            const regionId = ALL_UNITS.find(u => u.id === unitId)?.regionId;
            const newUser = {
                email: firebaseUser.email ?? '',
                name: name.trim(),
                role,
                unitId,
                ...(regionId ? { regionId } : {}),
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser({ uid: firebaseUser.uid, ...newUser, createdAt: new Date().toISOString() });
            if (isPending) {
                navigate('/pending');
            }
            else {
                toast.success('환영합니다!');
                navigate('/dashboard');
            }
        }
        catch {
            toast.error(t('onboarding.saveFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("h1", { className: styles.title, children: t('onboarding.title') }), _jsx("p", { className: styles.subtitle, children: isPending ? t('onboarding.desc') : t('onboarding.descPresident') }), _jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [_jsx(Input, { label: t('onboarding.nameLabel'), value: name, onChange: e => setName(e.target.value), placeholder: "\uD64D\uAE38\uB3D9", required: true }), _jsx(Select, { label: t('onboarding.unitLabel'), value: unitId, onChange: e => setUnitId(e.target.value), options: unitOptions, required: true }), _jsx(Button, { type: "submit", loading: loading, fullWidth: true, size: "lg", children: loading ? t('onboarding.submitting') : isPending ? t('onboarding.submit') : t('onboarding.submitPresident') })] })] }) }));
}
