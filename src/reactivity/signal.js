/**
 * LIGHTVIEW REACTIVITY CORE
 * Core logic for signals, effects, and computed values.
 */

// Global Handshake: Ensures all bundles share the same reactive engine
const _LV = (globalThis.__LIGHTVIEW_INTERNALS__ ||= {
    currentEffect: null,
    registry: new Map(), // Global name -> Signal/Proxy
    localRegistries: new WeakMap(), // Object/Element -> Map(name -> Signal/Proxy)
    futureSignals: new Map(), // name -> Set of (signal) => void
    schemas: new Map(), // name -> Schema (Draft 7+ or Shorthand)
    parents: new WeakMap(), // Proxy -> Parent (Proxy/Element)
    helpers: new Map(), // name -> function (used for transforms and expressions)
    hooks: {
        validate: (value, schema) => true // Hook for extensions (like JPRX) to provide full validation
    }
});

/**
 * Resolves a named signal/state using up-tree search starting from scope.
 */
export const lookup = (name, scope) => {
    let current = scope;
    while (current && typeof current === 'object') {
        const registry = _LV.localRegistries.get(current);
        if (registry && registry.has(name)) return registry.get(name);
        current = current.parentElement || _LV.parents.get(current);
    }
    return _LV.registry.get(name);
};

/**
 * Creates a reactive signal.
 */
export const signal = (initialValue, optionsOrName) => {
    const name = typeof optionsOrName === 'string' ? optionsOrName : optionsOrName?.name;
    const storage = optionsOrName?.storage;
    const scope = optionsOrName?.scope;

    if (name && storage) {
        try {
            const stored = storage.getItem(name);
            if (stored !== null) initialValue = JSON.parse(stored);
        } catch (e) { /* Ignore */ }
    }

    let value = initialValue;
    const subscribers = new Set();
    const f = (...args) => args.length === 0 ? f.value : (f.value = args[0]);

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
                    try { storage.setItem(name, JSON.stringify(value)); } catch (e) { /* Ignore */ }
                }
                [...subscribers].forEach(effect => effect());
            }
        }
    });

    if (name) {
        const registry = (scope && typeof scope === 'object') ? (_LV.localRegistries.get(scope) || _LV.localRegistries.set(scope, new Map()).get(scope)) : _LV.registry;
        if (registry && registry.has(name) && registry.get(name) !== f) {
            throw new Error(`Lightview: A signal or state with the name "${name}" is already registered.`);
        }
        if (registry) registry.set(name, f);

        // Resolve future signal waiters
        const futures = _LV.futureSignals.get(name);
        if (futures) {
            futures.forEach(resolve => resolve(f));
        }
    }

    return f;
};

/**
 * Gets a named signal, or a 'future' signal if not found.
 */
export const getSignal = (name, defaultValueOrOptions) => {
    const options = typeof defaultValueOrOptions === 'object' && defaultValueOrOptions !== null ? defaultValueOrOptions : { defaultValue: defaultValueOrOptions };
    const { scope, defaultValue } = options;

    const existing = lookup(name, scope);
    if (existing) return existing;

    if (defaultValue !== undefined) return signal(defaultValue, { name, scope });

    // Return a "Future Signal" that will track the real one once registered
    const future = signal(undefined);
    const handler = (realSignal) => {
        // When the real signal appears, sync the future one
        future.value = realSignal.value;
        effect(() => { future.value = realSignal.value; });
        // Also allow the future signal to proxy sets back to the real one?
        // For now, simple one-way sync might be enough for resolution.
    };

    if (!_LV.futureSignals.has(name)) _LV.futureSignals.set(name, new Set());
    _LV.futureSignals.get(name).add(handler);

    return future;
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

/**
 * Returns the global internals (private use).
 */
export const internals = _LV;
