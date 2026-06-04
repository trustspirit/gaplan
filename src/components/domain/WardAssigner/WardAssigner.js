import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { Button } from '@/components/ui';
import styles from './WardAssigner.module.scss';
export function WardAssigner({ availableDates, wards, onSubmit, submitting }) {
    const [rows, setRows] = useState([
        { wardId: '', date: availableDates[0] ?? '' },
    ]);
    function addRow() {
        setRows(prev => [...prev, { wardId: '', date: availableDates[0] ?? '' }]);
    }
    function removeRow(idx) {
        setRows(prev => prev.filter((_, i) => i !== idx));
    }
    function setRowWard(idx, wardId) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, wardId } : r));
    }
    function setRowDate(idx, date) {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, date } : r));
    }
    const isValid = rows.length > 0 && rows.every(r => r.wardId && r.date);
    const handleSubmit = async () => {
        if (!isValid)
            return;
        const assignments = rows.map(r => ({
            wardName: wards.find(w => w.id === r.wardId)?.name ?? r.wardId,
            date: r.date,
        }));
        await onSubmit(assignments);
    };
    return (_jsxs("div", { className: styles.assigner, children: [_jsx("p", { className: styles.hint, children: "\uAC01 \uC640\uB4DC/\uC9C0\uBD80\uC5D0 \uBC29\uBB38 \uB0A0\uC9DC\uB97C \uBC30\uC815\uD558\uC138\uC694." }), rows.map((row, idx) => (_jsxs("div", { className: styles.row, children: [_jsxs("select", { className: styles.wardSelect, value: row.wardId, onChange: e => setRowWard(idx, e.target.value), children: [_jsx("option", { value: "", children: "\uC640\uB4DC/\uC9C0\uBD80 \uC120\uD0DD" }), wards.map(w => (_jsx("option", { value: w.id, children: w.name }, w.id)))] }), _jsx("div", { className: styles.dateBtns, children: availableDates.map(d => (_jsx("button", { type: "button", className: clsx(styles.dateBtn, row.date === d && styles.dateBtnSelected), onClick: () => setRowDate(idx, d), children: dayjs(d).format('M/D') }, d))) }), rows.length > 1 && (_jsx("button", { type: "button", className: styles.removeBtn, onClick: () => removeRow(idx), children: _jsx(Trash2, { size: 14 }) }))] }, idx))), _jsxs("button", { type: "button", className: styles.addBtn, onClick: addRow, children: [_jsx(Plus, { size: 14 }), "\uC640\uB4DC/\uC9C0\uBD80 \uCD94\uAC00"] }), _jsxs(Button, { fullWidth: true, onClick: handleSubmit, loading: submitting, disabled: !isValid, className: styles.submitBtn, children: ["\uBC30\uC815 \uC81C\uCD9C (", rows.filter(r => r.wardId && r.date).length, "\uAC1C)"] })] }));
}
