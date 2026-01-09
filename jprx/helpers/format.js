/**
 * cdom FORMATTING HELPERS
 */

export const number = (val, decimals = 2) => Number(val).toFixed(decimals);

export const currency = (val, symbol = '$', decimals = 2) => {
    return symbol + Number(val).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const percent = (val, decimals = 0) => (Number(val) * 100).toFixed(decimals) + '%';

export const thousands = (val) => String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const registerFormatHelpers = (register) => {
    register('number', number);
    register('currency', currency);
    register('percent', percent);
    register('thousands', thousands);
};
