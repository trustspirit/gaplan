import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useRef } from 'react';
import dayjs from 'dayjs';
import styles from './TimePainterPicker.module.scss';
function buildAxis(start, end, step) {
    const result = [];
    const [sh, sm] = start.split(':').map(Number);
    let cur = sh * 60 + sm;
    const [eh, em] = end.split(':').map(Number);
    const endMin = eh * 60 + em === 0 ? 1440 : eh * 60 + em;
    while (cur < endMin) {
        const h = Math.floor(cur / 60) % 24;
        const m = cur % 60;
        result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        cur += step;
    }
    return result;
}
function toMin(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
export function TimePainterPicker({ selectedDates, dailyRange, periodMinutes, paintedCells, onSetCell, onChangeRange, }) {
    const axis = buildAxis(dailyRange[0], dailyRange[1], periodMinutes);
    const painting = useRef(null);
    const applyToCell = (key) => {
        const p = painting.current;
        if (!p || p.visited.has(key))
            return;
        p.visited.add(key);
        onSetCell(key, p.targetState);
    };
    const handlePointerDown = (key, currentlyOn) => {
        painting.current = { targetState: !currentlyOn, visited: new Set([key]) };
        onSetCell(key, !currentlyOn);
    };
    const handleRootPointerMove = (e) => {
        if (!painting.current)
            return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-paint-key]');
        if (cell?.dataset.paintKey)
            applyToCell(cell.dataset.paintKey);
    };
    const handlePointerUp = () => { painting.current = null; };
    if (selectedDates.length === 0) {
        return _jsx("div", { className: styles.emptyHint, children: "\uB0A0\uC9DC\uB97C \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694" });
    }
    const colCount = selectedDates.length;
    const gridStyle = {
        gridTemplateColumns: `40px repeat(${colCount}, minmax(50px, 1fr))`,
        minWidth: `${40 + colCount * 50}px`,
    };
    return (_jsxs("div", { className: styles.container, children: [_jsxs("div", { className: styles.rangeRow, children: [_jsx("span", { className: styles.rangeLabel, children: "\uAC00\uB2A5\uD55C \uC2DC\uAC04 \uC120\uD0DD" }), _jsxs("div", { className: styles.rangeInputs, children: [_jsx("input", { type: "time", className: styles.timeInput, value: dailyRange[0], onChange: (e) => {
                                    const v = e.target.value;
                                    onChangeRange([v, toMin(dailyRange[1]) > toMin(v) ? dailyRange[1] : v]);
                                } }), _jsx("span", { className: styles.separator, children: "\u2013" }), _jsx("input", { type: "time", className: styles.timeInput, value: dailyRange[1], onChange: (e) => {
                                    const v = e.target.value;
                                    const endMin = v === '00:00' ? 1440 : toMin(v);
                                    if (endMin > toMin(dailyRange[0]))
                                        onChangeRange([dailyRange[0], v]);
                                } })] })] }), _jsx("div", { className: styles.scrollWrapper, children: _jsxs("div", { className: styles.grid, style: gridStyle, onPointerMove: handleRootPointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp, onPointerLeave: handlePointerUp, children: [_jsx("div", { className: styles.timeLabel }), selectedDates.map((ymd) => (_jsxs("div", { className: styles.headerCell, children: [_jsx("span", { className: styles.dayOfWeek, children: dayjs(ymd).format('ddd') }), _jsx("span", { className: styles.dateLabel, children: dayjs(ymd).format('M/D') })] }, ymd))), axis.map((hhmm) => (_jsxs(Fragment, { children: [_jsx("div", { className: styles.timeLabel, children: hhmm }), selectedDates.map((ymd) => {
                                    const key = `${ymd}_${hhmm}`;
                                    const on = paintedCells.has(key);
                                    return (_jsx("div", { role: "gridcell", "data-paint-key": key, "aria-label": `${ymd} ${hhmm}`, "aria-selected": on, className: `${styles.cell}${on ? ` ${styles.painted}` : ''}`, onPointerDown: () => handlePointerDown(key, on) }, key));
                                })] }, hhmm)))] }) })] }));
}
