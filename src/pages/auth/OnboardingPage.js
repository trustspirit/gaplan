import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAtomValue, useSetAtom } from 'jotai';
import { auth, db } from '@/firebase';
import { authUserAtom } from '@/store/authAtom';
import { ALL_UNITS } from '@/constants/regions';
import { Input, Select, Button } from '@/components/ui';
import styles from './OnboardingPage.module.scss';
export function OnboardingPage() {
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
            toast.error('로그인이 필요합니다.');
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
            toast.error('저장에 실패했습니다. 다시 시도해주세요.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("h1", { className: styles.title, children: "\uCC98\uC74C \uC624\uC168\uAD70\uC694!" }), _jsx("p", { className: styles.subtitle, children: isPending
                        ? '이름과 소속을 입력하면 관리자 승인 후 이용하실 수 있습니다.'
                        : '소속과 이름을 입력해주세요.' }), _jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [_jsx(Input, { label: "\uC774\uB984", value: name, onChange: e => setName(e.target.value), placeholder: "\uD64D\uAE38\uB3D9", required: true }), _jsx(Select, { label: "\uC18C\uC18D \uC2A4\uD14C\uC774\uD06C/\uC9C0\uBC29\uBD80", value: unitId, onChange: e => setUnitId(e.target.value), options: unitOptions, required: true }), _jsx(Button, { type: "submit", loading: loading, fullWidth: true, size: "lg", children: isPending ? '제출하기' : '시작하기' })] })] }) }));
}
