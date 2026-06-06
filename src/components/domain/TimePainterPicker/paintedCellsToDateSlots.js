function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
function fromMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function paintedCellsToDateSlots(paintedCells, periodMinutes) {
    const byDate = new Map();
    for (const key of paintedCells) {
        const [date, hhmm] = key.split('_');
        if (!byDate.has(date))
            byDate.set(date, []);
        byDate.get(date).push(hhmm);
    }
    const result = [];
    for (const [date, times] of byDate) {
        const sorted = times.map(toMinutes).sort((a, b) => a - b);
        const ranges = [];
        let rangeStart = sorted[0];
        let rangeEnd = sorted[0] + periodMinutes;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === rangeEnd) {
                rangeEnd = sorted[i] + periodMinutes;
            }
            else {
                ranges.push({ startTime: fromMinutes(rangeStart), endTime: fromMinutes(rangeEnd) });
                rangeStart = sorted[i];
                rangeEnd = sorted[i] + periodMinutes;
            }
        }
        ranges.push({ startTime: fromMinutes(rangeStart), endTime: fromMinutes(rangeEnd) });
        result.push({ date, timeRanges: ranges });
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
}
