import dayjs from 'dayjs';
export function groupByMonth(schedules) {
    const map = new Map();
    for (const s of schedules) {
        const key = dayjs(s.date).format('YYYY년 M월');
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(s);
    }
    return map;
}
export function sortMonthKeys(keys) {
    return [...keys].sort((a, b) => {
        const da = dayjs(a, 'YYYY년 M월');
        const db = dayjs(b, 'YYYY년 M월');
        return da.isBefore(db) ? -1 : 1;
    });
}
