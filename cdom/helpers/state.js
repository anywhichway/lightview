/**
 * cdom STATE/MUTATION HELPERS
 */

export const set = (target, val) => {
    if (target && typeof target === 'object' && 'value' in target) {
        target.value = val;
    } else if (target && typeof target === 'function' && 'value' in target) {
        target.value = val;
    } else if (target && typeof target === 'object' && val && typeof val === 'object') {
        Object.assign(target, val);
    }
    return val;
};

export const increment = (target, by = 1) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : 0;
    const next = Number(current) + Number(by);
    return set(target, next);
};

export const decrement = (target, by = 1) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : 0;
    const next = Number(current) - Number(by);
    return set(target, next);
};

export const toggle = (target) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : false;
    return set(target, !current);
};

export const push = (target, item) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : [];
    if (Array.isArray(current)) {
        const next = [...current, item];
        return set(target, next);
    }
    return current;
};

export const pop = (target) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : [];
    if (Array.isArray(current) && current.length > 0) {
        const next = current.slice(0, -1);
        set(target, next);
    }
    return current;
};

export const assign = (target, obj) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : {};
    const next = { ...current, ...obj };
    return set(target, next);
};

export const clear = (target) => {
    const current = (target && typeof target === 'object' && 'value' in target) ? target.value : null;
    if (Array.isArray(current)) return set(target, []);
    if (typeof current === 'object' && current !== null) return set(target, {});
    return set(target, null);
};

export const registerStateHelpers = (register) => {
    const opts = { pathAware: true };
    register('set', set, opts);
    register('increment', increment, opts);
    register('++', increment, opts);
    register('decrement', decrement, opts);
    register('--', decrement, opts);
    register('toggle', toggle, opts);
    register('!!', toggle, opts);
    register('push', push, opts);
    register('pop', pop, opts);
    register('assign', assign, opts);
    register('clear', clear, opts);
};
