/**
 * cdom LOOKUP HELPERS
 */

export const lookup = (val, searchArr, resultArr) => {
    if (!Array.isArray(searchArr)) return undefined;
    const idx = searchArr.indexOf(val);
    return idx !== -1 && Array.isArray(resultArr) ? resultArr[idx] : undefined;
};

export const vlookup = (val, table, colIdx) => {
    if (!Array.isArray(table)) return undefined;
    const row = table.find(r => Array.isArray(r) && r[0] === val);
    return row ? row[colIdx - 1] : undefined;
};

export const index = (arr, idx) => Array.isArray(arr) ? arr[idx] : undefined;
export const match = (val, arr) => Array.isArray(arr) ? arr.indexOf(val) : -1;

export const registerLookupHelpers = (register) => {
    register('lookup', lookup);
    register('vlookup', vlookup);
    register('index', index);
    register('match', match);
};
