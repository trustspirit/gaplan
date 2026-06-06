import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Trash2, Calendar, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import { authUserAtom } from '@/store/authAtom';
import { manualCalendarSync, deleteSchedule, updateSchedule } from '@/services/scheduleService';
import { useSchedules } from '@/hooks/useSchedules';
import { db } from '@/firebase';
import { REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Button, Modal } from '@/components/ui';
import { ScheduleFormModal } from '@/components/domain';
import styles from './CalendarSettings.module.scss';
function scheduleTypeLabel(schedule, t) {
    return schedule.type === 'ward_visit'
        ? t('schedule.type.ward_visit')
        : schedule.type === 'interview'
            ? t('schedule.type.interview')
            : t('schedule.type.meeting');
}
function EditScheduleModal({ schedule, onClose, }) {
    const { t } = useTranslation();
    const [date, setDate] = useState(schedule.date);
    const [startTime, setStartTime] = useState(schedule.startTime);
    const [endTime, setEndTime] = useState(schedule.endTime);
    const [notes, setNotes] = useState(schedule.notes ?? '');
    const [loading, setLoading] = useState(false);
    const handleSave = async (e) => {
        e.preventDefault();
        if (endTime <= startTime) {
            toast.error(t('admin.scheduleTimeError'));
            return;
        }
        setLoading(true);
        try {
            await updateSchedule(schedule.id, { date, startTime, endTime, notes: notes.trim() || undefined });
            toast.success(t('admin.scheduleEditSuccess'));
            onClose();
        }
        catch {
            toast.error(t('admin.scheduleEditFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('admin.scheduleEdit'), children: _jsxs("form", { className: styles.editForm, onSubmit: handleSave, children: [_jsxs("div", { className: styles.editMeta, children: [_jsx("span", { className: styles.scheduleType, children: scheduleTypeLabel(schedule, t) }), schedule.wardName && _jsx("span", { className: styles.scheduleWard, children: schedule.wardName })] }), _jsx(Input, { label: t('task.dueDate'), type: "date", value: date, onChange: e => setDate(e.target.value), required: true }), _jsxs("div", { className: styles.timeRow, children: [_jsx(Input, { label: t('common.startTime'), type: "time", value: startTime, onChange: e => setStartTime(e.target.value), required: true }), _jsx(Input, { label: t('common.endTime'), type: "time", value: endTime, onChange: e => setEndTime(e.target.value), required: true })] }), _jsxs("div", { className: styles.textareaField, children: [_jsx("label", { className: styles.textareaLabel, children: t('task.noteLabel') }), _jsx("textarea", { className: styles.textarea, value: notes, onChange: e => setNotes(e.target.value), rows: 3, placeholder: t('admin.scheduleNotesPlaceholder') })] }), schedule.googleCalendarEventId && (_jsx("p", { className: styles.calendarHint, children: t('admin.scheduleEditCalendarHint') })), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { type: "submit", loading: loading, children: t('common.save') })] })] }) }));
}
function DeleteScheduleModal({ schedule, onClose, onDeleted, }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteSchedule(schedule.id);
            toast.success(t('admin.scheduleCancelSuccess'));
            onDeleted();
            onClose();
        }
        catch {
            toast.error(t('admin.scheduleCancelFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Modal, { open: true, onClose: onClose, title: t('admin.scheduleCancelTitle'), children: [_jsxs("p", { className: styles.deleteDesc, children: [_jsx("strong", { children: dayjs(schedule.date).format('YYYY.MM.DD (ddd)') }), schedule.startTime && ` ${schedule.startTime}–${schedule.endTime}`, _jsx("br", {}), scheduleTypeLabel(schedule, t), schedule.wardName && ` · ${schedule.wardName}`, _jsx("br", {}), t('admin.scheduleCancelWarning')] }), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "danger", loading: loading, onClick: handleDelete, children: t('admin.scheduleDelete') })] })] }));
}
function ScheduleRow({ schedule, onEdit, onCancel, }) {
    const { t } = useTranslation();
    return (_jsxs("div", { className: styles.scheduleRow, children: [_jsxs("div", { className: styles.scheduleDate, children: [_jsx(Calendar, { size: 13, className: styles.scheduleDateIcon }), _jsx("span", { children: dayjs(schedule.date).format('YYYY.MM.DD (ddd)') }), schedule.startTime && (_jsxs("span", { className: styles.scheduleTime, children: [schedule.startTime, "\u2013", schedule.endTime] }))] }), _jsxs("div", { className: styles.scheduleMeta, children: [_jsx("span", { className: styles.scheduleType, children: scheduleTypeLabel(schedule, t) }), schedule.wardName && _jsx("span", { className: styles.scheduleWard, children: schedule.wardName }), schedule.googleCalendarEventId && (_jsx("span", { className: styles.calSynced, children: t('admin.calSynced') }))] }), _jsxs("div", { className: styles.rowActions, children: [_jsx("button", { type: "button", className: styles.editBtn, title: t('admin.scheduleEdit'), onClick: onEdit, children: _jsx(Pencil, { size: 14 }) }), _jsx("button", { type: "button", className: styles.cancelBtn, title: t('admin.scheduleDelete'), onClick: onCancel, children: _jsx(Trash2, { size: 14 }) })] })] }));
}
export function CalendarSettings() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const [calendarIds, setCalendarIds] = useState({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [editTarget, setEditTarget] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const { schedules } = useSchedules({});
    const confirmedSchedules = schedules
        .filter(s => s.status === 'confirmed')
        .sort((a, b) => a.date.localeCompare(b.date));
    useEffect(() => {
        getDoc(doc(db, 'settings', 'calendar')).then(snap => {
            const data = snap.data();
            if (data?.calendars)
                setCalendarIds(data.calendars);
        }).finally(() => setFetching(false));
    }, []);
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await setDoc(doc(db, 'settings', 'calendar'), { calendars: calendarIds }, { merge: true });
            toast.success(t('admin.calendarSaved'));
        }
        catch {
            toast.error(t('common.saveFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const result = await manualCalendarSync();
            toast.success(result.message);
        }
        catch (e) {
            toast.error(e?.message ?? t('common.syncError'));
        }
        finally {
            setSyncing(false);
        }
    };
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.calendar') }), children: [_jsxs("div", { className: styles.page, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.calendar') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('admin.calendarDesc2') }), fetching ? (_jsx("p", { className: styles.desc, children: t('common.loading') })) : (_jsxs("form", { className: styles.form, onSubmit: handleSave, children: [REGIONS.map(region => (_jsx(Input, { label: `${region.name} ${t('admin.calendarRegionLabel')}`, value: calendarIds[region.id] ?? '', onChange: e => setCalendarIds(prev => ({ ...prev, [region.id]: e.target.value })), placeholder: "xxxxxxxx@group.calendar.google.com" }, region.id))), _jsx(Button, { type: "submit", loading: loading, children: t('common.save') })] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.confirmedSchedules'), action: _jsx(Button, { variant: "primary", size: "sm", onClick: () => setFormOpen(true), children: "+ \uC77C\uC815 \uCD94\uAC00" }) }), formOpen && (_jsx(ScheduleFormModal, { onClose: () => setFormOpen(false), onSaved: () => { setFormOpen(false); toast.success('일정이 등록되었습니다.'); } })), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('admin.confirmedSchedulesDesc') }), confirmedSchedules.length === 0 ? (_jsx("p", { className: styles.empty, children: t('admin.noConfirmedSchedules') })) : (_jsx("div", { className: styles.scheduleList, children: confirmedSchedules.map(s => (_jsx(ScheduleRow, { schedule: s, onEdit: () => setEditTarget(s), onCancel: () => setCancelTarget(s) }, s.id))) }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: t('calendar.syncCardTitle') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('calendar.syncCardDesc') }), _jsxs(Button, { onClick: handleManualSync, loading: syncing, variant: "secondary", children: [_jsx(RefreshCw, { size: 14 }), "\u00A0", t('calendar.syncManual')] })] })] })] }), editTarget && (_jsx(EditScheduleModal, { schedule: editTarget, onClose: () => setEditTarget(null) })), cancelTarget && (_jsx(DeleteScheduleModal, { schedule: cancelTarget, onClose: () => setCancelTarget(null), onDeleted: () => setCancelTarget(null) }))] }));
}
