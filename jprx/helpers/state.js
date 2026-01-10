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
    const hasValue = target && (typeof target === 'object' || typeof target === 'function') && 'value' in target;
    const current = hasValue ? target.value : 0;
    const next = Number(current) + Number(by);
    return set(target, next);
};

export const decrement = (target, by = 1) => {
    const hasValue = target && (typeof target === 'object' || typeof target === 'function') && 'value' in target;
    const current = hasValue ? target.value : 0;
    const next = Number(current) - Number(by);
    return set(target, next);
};

export const toggle = (target) => {
    const hasValue = target && (typeof target === 'object' || typeof target === 'function') && 'value' in target;
    const current = hasValue ? target.value : false;
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

export function $state(val, options) {
    if (globalThis.Lightview) {
        const finalOptions = typeof options === 'string' ? { name: options } : options;
        return globalThis.Lightview.state(val, finalOptions);
    }
    throw new Error('JPRX: $state requires a UI library implementation.');
}

export function $signal(val, options) {
    if (globalThis.Lightview) {
        const finalOptions = typeof options === 'string' ? { name: options } : options;
        return globalThis.Lightview.signal(val, finalOptions);
    }
    throw new Error('JPRX: $signal requires a UI library implementation.');
}

export const $bind = (path, options) => ({ __JPRX_BIND__: true, path, options });

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
    register('state', $state);
    register('signal', $signal);
    register('bind', $bind);
};
