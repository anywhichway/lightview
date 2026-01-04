/**
 * LIGHTVIEW REACTIVITY CORE
 * Core logic for signals, effects, and computed values.
 */

// Global Handshake: Ensures all bundles share the same reactive engine
const _LV = (globalThis.__LIGHTVIEW_INTERNALS__ ||= {
    currentEffect: null,
    registry: new Map(),
    dependencyMap: new WeakMap() // Tracking signals -> subscribers
});

/**
 * Creates a reactive signal.
 */
export const signal = (initialValue, optionsOrName) => {
    let name = typeof optionsOrName === 'string' ? optionsOrName : optionsOrName?.name;
    const storage = optionsOrName?.storage;

    if (name && storage) {
        try {
            const stored = storage.getItem(name);
            if (stored !== null) {
                initialValue = JSON.parse(stored);
            }
        } catch (e) { /* Ignore storage errors */ }
    }

    let value = initialValue;
    const subscribers = new Set();

    const f = (...args) => {
        if (args.length === 0) return f.value;
        f.value = args[0];
    };

    Object.defineProperty(f, 'value', {
        get() {
            if (_LV.currentEffect) {
                subscribers.add(_LV.currentEffect);
                _LV.currentEffect.dependencies.add(subscribers);
            }
            return value;
        },
        set(newValue) {
            if (value !== newValue) {
                value = newValue;
                if (name && storage) {
                    try {
                        storage.setItem(name, JSON.stringify(value));
                    } catch (e) { /* Ignore storage errors */ }
                }
                // Copy subscribers to avoid infinite loop when effect re-subscribes during iteration
                [...subscribers].forEach(effect => effect());
            }
        }
    });

    if (name) {
        if (_LV.registry.has(name)) {
            // Already registered - could be a name collision or re-registration
            if (_LV.registry.get(name) !== f) {
                throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
            }
        } else {
            _LV.registry.set(name, f);
        }
    }

    return f;
};

/**
 * Gets a named signal from the registry.
 */
export const getSignal = (name, defaultValue) => {
    if (!_LV.registry.has(name) && defaultValue !== undefined) {
        return signal(defaultValue, name);
    }
    return _LV.registry.get(name);
};

// Map .get to signal for backwards compatibility
signal.get = getSignal;

/**
 * Creates an effect that tracks dependencies.
 */
export const effect = (fn) => {
    const execute = () => {
        if (!execute.active || execute.running) return;

        // Cleanup old dependencies
        execute.dependencies.forEach(dep => dep.delete(execute));
        execute.dependencies.clear();

        execute.running = true;
        _LV.currentEffect = execute;
        try {
            fn();
        } finally {
            _LV.currentEffect = null;
            execute.running = false;
        }
    };

    execute.active = true;
    execute.running = false;
    execute.dependencies = new Set();
    execute.stop = () => {
        execute.dependencies.forEach(dep => dep.delete(execute));
        execute.dependencies.clear();
        execute.active = false;
    };
    execute();
    return execute;
};

/**
 * Creates a read-only signal derived from others.
 */
export const computed = (fn) => {
    const sig = signal(undefined);
    effect(() => {
        sig.value = fn();
    });
    return sig;
};

/**
 * Returns the global registry.
 */
export const getRegistry = () => _LV.registry;
