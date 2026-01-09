/**
 * cdom DATE/TIME HELPERS
 */

export const now = () => new Date().getTime();
export const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const date = (val) => new Date(val).getTime();

export const formatDate = (val, format) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';

    // Minimal formatter, can be expanded
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    if (format === 'long') options.month = 'long';
    return d.toLocaleDateString(undefined, options);
};

export const year = (val) => new Date(val).getFullYear();
export const month = (val) => new Date(val).getMonth() + 1;
export const day = (val) => new Date(val).getDate();
export const weekday = (val) => new Date(val).getDay();

export const addDays = (val, days) => {
    const d = new Date(val);
    d.setDate(d.getDate() + Number(days));
    return d.getTime();
};

export const dateDiff = (d1, d2, unit = 'days') => {
    const diff = Math.abs(new Date(d1) - new Date(d2));
    if (unit === 'seconds') return diff / 1000;
    if (unit === 'minutes') return diff / (1000 * 60);
    if (unit === 'hours') return diff / (1000 * 60 * 60);
    return diff / (1000 * 60 * 60 * 24);
};

export const registerDateTimeHelpers = (register) => {
    register('now', now);
    register('today', today);
    register('date', date);
    register('formatDate', formatDate);
    register('year', year);
    register('month', month);
    register('day', day);
    register('weekday', weekday);
    register('addDays', addDays);
    register('dateDiff', dateDiff);
};
