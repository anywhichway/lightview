# Lightview

A lightweight reactive UI library with signal-based reactivity and a clean API. Build dynamic UIs with automatic DOM synchronization.

Access the full documentation and interactive examples at [lightview.dev](https://lightview.dev).

LLMs should read [AI-GUIDANCE.md](AI-GUIDANCE.md) for instructions on how to use Lightview.

## Modular Architecture

**Core Library**: ~7.75KB | **Extended (Hypermedia + Components)**: ~20KB | **Router**: ~3KB

Lightview is split into three files:

- **`lightview.js`** - Core reactivity (signals, state, effects, elements)
- **`lightview-x.js`** - Hypermedia extension (src fetching, href navigation, template literals, named registries, UI component library support)
- **`lightview-router.js`** - Pipeline-based History API router with middleware support

## One System, Four Syntaxes

Lightview supports multiple ways to build UIs, allowing you to pick the style that fits your workflow:

1. **Tagged API**: Concise, JavaScript-first syntax (e.g., `tags.div(...)`).
2. **vDOM Syntax**: Explicit JSON-based structures (e.g., `{ tag: 'div', ... }`).
3. **Object DOM**: Compact JSON syntax with automatic tag detection (e.g., `{ div: { ... } }`).
4. **Custom Elements**: Standard HTML tags (e.g., `<lv-button>`) for progressive enhancement.

All syntaxes share the same underlying reactive engine based on **Signals** and **State**.

## cDOM & JPRX: AI-Assisted Declarative UIs

Lightview includes **cDOM** (Computed DOM) powered by **JPRX** (JSON Pointer Reactive eXpressions)—a fully declarative UI layer that requires **zero custom JavaScript**. Much like **XPath** provides a powerful query language for XML, JPRX provides a reactive, formula-based language for JSON state.

### Why This Matters for AI Collaboration

Traditional UI development requires AI agents to generate imperative JavaScript code, which introduces security risks (XSS, code injection) and unpredictable behavior. cDOM flips this model:

- **Pure Data, No Code**: UIs are defined as JSON structures with reactive expressions—no `eval()`, no `new Function()`, no executable strings.
- **Safe by Design**: AI agents can generate, modify, and compose UIs without producing potentially harmful code.
- **Auditable Output**: Every generated UI is a transparent data structure that can be validated, diffed, and sandboxed.

### Example: A Reactive Counter (No JavaScript)

```json
{
  "state": { "count": 0 },
  "div": {
    "children": [
      { "p": "{$count}" },
      { "button": { "onclick": "{set('count', add(count, 1))}", "children": ["Increment"] } }
    ]
  }
}
```

This JSON is **the entire application**. The `{...}` expressions are JPRX—a sandboxed, spreadsheet-like formula language (inspired by **XPath** and **JSON Pointers**) that resolves paths, calls registered helpers, and triggers reactivity automatically.

### Learn More

- [cDOM Documentation](https://lightview.dev/docs/cdom)
- [JPRX Expression Reference](https://lightview.dev/docs/cdom#jprx)

## Quick Start

### 1. Tagged API (Concise & Expressive)

```javascript
const { tags, signal, $ } = Lightview;
const { div, button, p } = tags;

const count = signal(0);

const app = div(
    p(() => `Count: ${count.value}`),
    button({ onclick: () => count.value++ }, 'Increment')
);

$('body').content(app);
```

### 2. vDOM Syntax (Standard JSON)

```javascript
const { signal, $ } = Lightview;
const count = signal(0);

const app = {
    tag: 'div',
    children: [
        { tag: 'p', children: [() => `Count: ${count.value}`] },
        { tag: 'button', attributes: { onclick: () => count.value++ }, children: ['Increment'] }
    ]
};

$('body').content(app);
```

### 3. Object DOM (Compact JSON)

```javascript
const { signal, $ } = Lightview;
const count = signal(0);

const app = {
    div: {
        children: [
            { p: { children: [() => `Count: ${count.value}`] } },
            { button: { onclick: () => count.value++, children: ['Increment'] } }
        ]
    }
};

$('body').content(app);
```

## Why Lightview?

- **Zero Build Step**: No compiler or bundler required.
- **Deep Reactivity**: Automatic tracking of nested object and array mutations.
- **Hypermedia Built-in**: Fetch HTML/JSON components via `src` attributes.
- **Isolated Components**: Shadow DOM support with automatic DaisyUI theme integration.
- **Fully Automatic Cleanup**: Memory-safe reactivity via MutationObserver.

## Documentation

For detailed API references, component gallery, and tutorials, visit [lightview.dev](https://lightview.dev).

- [Getting Started](https://lightview.dev/docs/getting-started)
- [Syntax Comparison](https://lightview.dev/docs/syntax)
- [API Reference](https://lightview.dev/docs/api)
- [Component Library](https://lightview.dev/docs/components)

## License

MIT