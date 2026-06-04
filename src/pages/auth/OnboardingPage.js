import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import { auth, db } from '@/firebase';
import { authUserAtom } from '@/store/authAtom';
import { ALL_UNITS } from '@/constants/regions';
import { Input, Select, Button } from '@/components/ui';
import styles from './OnboardingPage.module.scss';
export function OnboardingPage() {
    const [name, setName] = useState('');
    const [unitId, setUnitId] = useState('');
    const [loading, setLoading] = useState(false);
    const setUser = useSetAtom(authUserAtom);
    const navigate = useNavigate();
    const unitOptions = ALL_UNITS.map(u => ({ value: u.id, label: u.name }));
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
            const newUser = {
                email: firebaseUser.email ?? '',
                name: name.trim(),
                role: 'president',
                unitId,
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser({ uid: firebaseUser.uid, ...newUser, createdAt: new Date().toISOString() });
            toast.success('환영합니다!');
            navigate('/dashboard');
        }
        catch {
            toast.error('저장에 실패했습니다. 다시 시도해주세요.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.card, children: [_jsx("h1", { className: styles.title, children: "\uCC98\uC74C \uC624\uC168\uAD70\uC694!" }), _jsx("p", { className: styles.subtitle, children: "\uC18C\uC18D\uACFC \uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." }), _jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [_jsx(Input, { label: "\uC774\uB984", value: name, onChange: e => setName(e.target.value), placeholder: "\uD64D\uAE38\uB3D9", required: true }), _jsx(Select, { label: "\uC18C\uC18D \uC2A4\uD14C\uC774\uD06C/\uC9C0\uBC29\uBD80", value: unitId, onChange: e => setUnitId(e.target.value), options: unitOptions, required: true }), _jsx(Button, { type: "submit", loading: loading, fullWidth: true, size: "lg", children: "\uC2DC\uC791\uD558\uAE30" })] })] }) }));
}
