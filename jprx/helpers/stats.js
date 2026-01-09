/**
 * cdom STATISTICAL HELPERS
 */

export const sum = (...args) => args.reduce((a, b) => a + (Number(b) || 0), 0);
export const avg = (...args) => args.length === 0 ? 0 : sum(...args) / args.length;
export const min = (...args) => Math.min(...args);
export const max = (...args) => Math.max(...args);

export const median = (...args) => {
    if (args.length === 0) return 0;
    const sorted = [...args].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const stdev = (...args) => {
    if (args.length === 0) return 0;
    const mean = avg(...args);
    const squareDiffs = args.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(avg(...squareDiffs));
};

export const variance = (...args) => {
    if (args.length === 0) return 0;
    const mean = avg(...args);
    const squareDiffs = args.map(value => Math.pow(value - mean, 2));
    return avg(...squareDiffs);
};

export const registerStatsHelpers = (register) => {
    register('sum', sum);
    register('avg', avg);
    register('min', min);
    register('max', max);
    register('median', median);
    register('stdev', stdev);
    register('var', variance);
};
