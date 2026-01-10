/**
 * LIGHTVIEW STATE MGR
 * Provides deeply reactive state by wrapping objects/arrays in Proxies.
 */

import { signal as signalFactory, effect, getRegistry, internals, lookup } from './signal.js';

// Internal caches
const stateCache = new WeakMap();
const stateSignals = new WeakMap();
const stateSchemas = new WeakMap();
const { parents, schemas, hooks } = internals;

/**
 * Core Validation & Coercion
 */
const validate = (target, prop, value, schema) => {
    const current = target[prop];
    const type = typeof current;
    const isNew = !(prop in target);

    // 1. Resolve schema behavior
    let behavior = schema;
    if (typeof schema === 'object' && schema !== null) behavior = schema.type;

    if (behavior === 'auto' && isNew) throw new Error(`Lightview: Cannot add new property "${prop}" to fixed 'auto' state.`);

    // 2. Perform Validation/Coercion
    if (behavior === 'polymorphic' || (typeof behavior === 'object' && behavior?.coerce)) {
        if (type === 'number') return Number(value);
        if (type === 'boolean') return Boolean(value);
        if (type === 'string') return String(value);
    } else if (behavior === 'auto' || behavior === 'dynamic') {
        if (!isNew && typeof value !== type) {
            throw new Error(`Lightview: Type mismatch for "${prop}". Expected ${type}, got ${typeof value}.`);
        }
    }

    // 3. Perform Transformations (Lightview Extension)
    if (typeof schema === 'object' && schema !== null && schema.transform) {
        const trans = schema.transform;
        const transformFn = typeof trans === 'function' ? trans : (internals.helpers.get(trans) || globalThis.Lightview?.helpers?.[trans]);
        if (transformFn) value = transformFn(value);
    }

    // 4. Delegation to hooks (for full JSON Schema support in JPRX/Lightview-X)
    if (hooks.validate(value, schema) === false) {
        throw new Error(`Lightview: Validation failed for "${prop}".`);
    }

    return value;
};

// Build method lists dynamically from prototypes
const protoMethods = (proto, test) => Object.getOwnPropertyNames(proto).filter(k => typeof proto[k] === 'function' && test(k));
const DATE_TRACKING = protoMethods(Date.prototype, k => /^(to|get|valueOf)/.test(k));
const DATE_MUTATING = protoMethods(Date.prototype, k => /^set/.test(k));
const ARRAY_TRACKING = ['map', 'forEach', 'filter', 'find', 'findIndex', 'some', 'every', 'reduce',
    'reduceRight', 'includes', 'indexOf', 'lastIndexOf', 'join', 'slice', 'concat', 'flat', 'flatMap',
    'at', 'entries', 'keys', 'values'];
const ARRAY_MUTATING = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
const ARRAY_ITERATION = ['map', 'forEach', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap'];

// Export needed helper
export const getOrSet = (map, key, factory) => {
    let v = map.get(key);
    if (!v) {
        v = factory();
        map.set(key, v);
    }
    return v;
};

const proxyGet = (target, prop, receiver, signals) => {
    if (prop === '__parent__') return parents.get(receiver);

    if (!signals.has(prop)) {
        signals.set(prop, signalFactory(Reflect.get(target, prop, receiver)));
    }
    const signal = signals.get(prop);
    const val = signal.value;

    if (typeof val === 'object' && val !== null) {
        const childProxy = state(val);
        parents.set(childProxy, receiver);
        return childProxy;
    }
    return val;
};

const proxySet = (target, prop, value, receiver, signals) => {
    const schema = stateSchemas.get(receiver);
    const validatedValue = schema ? validate(target, prop, value, schema) : value;

    if (!signals.has(prop)) {
        signals.set(prop, signalFactory(Reflect.get(target, prop, receiver)));
    }
    const success = Reflect.set(target, prop, validatedValue, receiver);
    const signal = signals.get(prop);
    if (success && signal) signal.value = validatedValue;
    return success;
};

const createSpecialProxy = (obj, monitor, trackingProps = []) => {
    const signals = getOrSet(stateSignals, obj, () => new Map());

    if (!signals.has(monitor)) {
        const initialValue = typeof obj[monitor] === 'function'
            ? obj[monitor].call(obj)
            : obj[monitor];
        signals.set(monitor, signalFactory(initialValue));
    }

    const isDate = obj instanceof Date;
    const isArray = Array.isArray(obj);
    const trackingMethods = isDate ? DATE_TRACKING : isArray ? ARRAY_TRACKING : trackingProps;
    const mutatingMethods = isDate ? DATE_MUTATING : isArray ? ARRAY_MUTATING : [];

    return new Proxy(obj, {
        get(target, prop, receiver) {
            if (prop === '__parent__') return parents.get(receiver);

            const value = target[prop];
            if (typeof value === 'function') {
                const isTracking = trackingMethods.includes(prop);
                const isMutating = mutatingMethods.includes(prop);

                return function (...args) {
                    if (isTracking) {
                        const sig = signals.get(monitor);
                        if (sig) void sig.value;
                    }

                    const startValue = typeof target[monitor] === 'function'
                        ? target[monitor].call(target)
                        : target[monitor];

                    if (isArray && ARRAY_ITERATION.includes(prop) && typeof args[0] === 'function') {
                        const originalCallback = args[0];
                        args[0] = function (element, index, array) {
                            const wrappedElement = typeof element === 'object' && element !== null
                                ? state(element)
                                : element;
                            if (wrappedElement && typeof wrappedElement === 'object') {
                                parents.set(wrappedElement, receiver);
                            }
                            return originalCallback.call(this, wrappedElement, index, array);
                        };
                    }

                    const result = value.apply(target, args);
                    const endValue = typeof target[monitor] === 'function'
                        ? target[monitor].call(target)
                        : target[monitor];

                    if (startValue !== endValue || isMutating) {
                        const sig = signals.get(monitor);
                        if (sig && sig.value !== endValue) {
                            sig.value = endValue;
                        }
                    }

                    return result;
                };
            }

            if (prop === monitor) {
                const sig = signals.get(monitor);
                return sig ? sig.value : Reflect.get(target, prop, receiver);
            }

            if (isArray && !isNaN(parseInt(prop))) {
                const monitorSig = signals.get(monitor);
                if (monitorSig) void monitorSig.value;
            }

            return proxyGet(target, prop, receiver, signals);
        },
        set(target, prop, value, receiver) {
            if (prop === monitor) {
                const success = Reflect.set(target, prop, value, receiver);
                if (success) {
                    const sig = signals.get(monitor);
                    if (sig) sig.value = value;
                }
                return success;
            }
            return proxySet(target, prop, value, receiver, signals);
        }
    });
};

/**
 * Creates deeply reactive state.
 */
export const state = (obj, optionsOrName) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const name = typeof optionsOrName === 'string' ? optionsOrName : optionsOrName?.name;
    const storage = optionsOrName?.storage;
    const scope = optionsOrName?.scope;
    const schema = optionsOrName?.schema;

    if (name && storage) {
        try {
            const item = storage.getItem(name);
            if (item) {
                const loaded = JSON.parse(item);
                Array.isArray(obj) && Array.isArray(loaded) ? (obj.length = 0, obj.push(...loaded)) : Object.assign(obj, loaded);
            }
        } catch (e) { /* Ignore */ }
    }

    let proxy = stateCache.get(obj);
    if (!proxy) {
        const isArray = Array.isArray(obj), isDate = obj instanceof Date;
        const isSpecial = isArray || isDate;
        const monitor = isArray ? "length" : isDate ? "getTime" : null;

        if (isSpecial || !(obj instanceof RegExp || obj instanceof Map || obj instanceof Set || obj instanceof WeakMap || obj instanceof WeakSet)) {
            proxy = isSpecial ? createSpecialProxy(obj, monitor) : new Proxy(obj, {
                get(t, p, r) {
                    if (p === '__parent__') return parents.get(r);
                    return proxyGet(t, p, r, getOrSet(stateSignals, t, () => new Map()));
                },
                set(t, p, v, r) { return proxySet(t, p, v, r, getOrSet(stateSignals, t, () => new Map())); }
            });
            stateCache.set(obj, proxy);
        } else return obj;
    }

    if (schema) stateSchemas.set(proxy, schema);

    if (name && storage) {
        effect(() => {
            try { storage.setItem(name, JSON.stringify(proxy)); } catch (e) { /* Ignore */ }
        });
    }

    if (name) {
        const registry = (scope && typeof scope === 'object') ? (internals.localRegistries.get(scope) || internals.localRegistries.set(scope, new Map()).get(scope)) : getRegistry();
        if (registry && registry.has(name) && registry.get(name) !== proxy) {
            throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
        }
        if (registry) registry.set(name, proxy);

        // Resolve future signal waiters
        const futures = internals.futureSignals.get(name);
        if (futures) {
            futures.forEach(resolve => resolve(proxy));
        }
    }

    return proxy;
};

/**
 * Gets a named state using up-tree search starting from scope.
 */
export const getState = (name, defaultValueOrOptions) => {
    const options = typeof defaultValueOrOptions === 'object' && defaultValueOrOptions !== null ? defaultValueOrOptions : { defaultValue: defaultValueOrOptions };
    const { scope, defaultValue } = options;

    const existing = lookup(name, scope);
    if (existing) return existing;

    if (defaultValue !== undefined) return state(defaultValue, { name, scope });

    // Future State Resolution (similar to getSignal)
    const future = signalFactory(undefined);
    const handler = (realState) => {
        future.value = realState;
    };
    if (!internals.futureSignals.has(name)) internals.futureSignals.set(name, new Set());
    internals.futureSignals.get(name).add(handler);

    return future;
};

state.get = getState;
