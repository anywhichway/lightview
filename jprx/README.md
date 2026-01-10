# JPRX (JSON Reactive Path eXpressions)

**JPRX** is a declarative, reactive expression syntax designed for JSON-based data structures. It extends [JSON Pointer (RFC 6901)](https://www.rfc-editor.org/rfc/rfc6901) with reactivity, relative paths, operator syntax, and a rich library of helper functions.

## Overview

JPRX is a **syntax** and an **expression engine**. While this repository provides the parser and core helper functions, JPRX is intended to be integrated into UI libraries or state management systems that can "hydrate" these expressions into active reactive bindings.

### Why JPRX?

- **Declarative Power**: Define relationships between data points as easily as writing an Excel formula.
- **Security**: JPRX strictly avoids `eval()`. Expressions are handled by a custom high-performance Pratt parser and a registry of pre-defined helpers, making it safe for dynamic content.
- **Portability**: JPRX expressions are strings within JSON, making them easily serialized and platform-agnostic.
- **Schema-First**: Integrated support for JSON Schema and shorthand descriptors provides industrial-strength validation and "future-proof" reactivity.

## UI Library Requirements

To fully support JPRX, an underlying UI library **MUST** provide:
- **Mount Lifecycle**: A hook (e.g., `onmount`) where state initialization can occur. JPRX relies on the library to trigger these initializers.
- **Event Handling**: Support for standard event handlers (like `oninput`, `onclick`) **SHOULD** be provided, though exact implementations may vary by platform.
- **Reactivity**: A way to resolve paths to reactive primitives (e.g., Signals or Proxies).

## Syntax & Features

JPRX extends the base JSON Pointer syntax with:

| Feature | Syntax | Description |
|---------|--------|-------------|
| **Global Path** | `$/user/name` | Access global state via an absolute path. |
| **Relative Path** | `./count` | Access properties relative to the current context. |
| **Parent Path** | `../id` | Traverse up the state hierarchy (UP-tree search). |
| **Functions** | `$sum(/items...price)` | Call registered core helpers. |
| **Explosion** | `/items...name` | Extract a property from every object in an array (spread). |
| **Operators** | `$++/count`, `$/a + $/b` | Familiar JS-style prefix, postfix, and infix operators. |
| **Placeholders** | `_` (item), `$this`, `$event` | Context-aware placeholders for iteration and interaction. |
| **Two-Way Binding**| `$bind(/user/name)`| Create a managed, two-way reactive link for inputs. |

Once inside a JPRX expression, the `$` prefix is only needed at the start of the expression for paths or function names.

## State Management

JPRX utilizes explicit state initializers within lifecycle hooks:

### Scoped State
States can be attached to specific scopes (such as a DOM node or Component instance) using the `scope` property in the options argument.
- **Up-tree Resolution**: When resolving a path, JPRX walks up the provided scope chain looking for the nearest owner of that name.
- **Future Signals**: JPRX allows subscription to a named signal *before* it is initialized. The system will automatically "hook up" once the state is created via `$state` or `$signal`.

### The `$state` and `$signal` Helpers
- `$state(value, { name: 'user', schema: 'UserProfile', scope: event.target })`
- `$signal(0, { name: 'count', schema: 'auto' })`

## Schema Registry & Validation

JPRX integrates with a global Schema Registry via `jprx.registerSchema(name, definition)`.

### Registering and Using Schemas
```javascript
// 1. Register a schema centrally
jprx.registerSchema('UserProfile', {
  name: "string",
  age: "number",
  email: { type: "string", format: "email" }
});

// 2. Reference the registered schema by name (Scoped)
const user = $state({}, { name: 'user', schema: 'UserProfile', scope: $this });

// 3. Use the 'polymorphic' shorthand for auto-coercion
const settings = $state({ volume: 50 }, { name: 'settings', schema: 'polymorphic' });
// Result: settings.volume = "60" will automatically coerce to the number 60.
```

- **Polymorphic Schemas**:
  - **`"auto"`**: Infers the fixed schema from the initial value. Strict type checking (e.g., setting a number to a string throws). New properties are not allowed.
  - **`"dynamic"`**: Like `auto`, but allows new properties to be added to the state object.
  - **`"polymorphic"`**: Includes **`dynamic`** behavior and automatically coerces values to match the inferred type (e.g., "50" -> 50) rather than throwing.
  - **Shorthand**: A simple object like `{ name: "string" }` is internally normalized to a JSON Schema.

### Transformation Schemas
Schemas can define transformations that occur during state updates, ensuring data remains in a consistent format regardless of how it was input.

```json
{
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "transform": "lower"
    }
  }
}
```
*Note: The `$bind` helper uses these transformations to automatically clean data as the user types.*

## Two-Way Binding with `$bind`

The `$bind(path)` helper creates a managed, two-way link between the UI and a state path.

### Strictness
To ensure unambiguous data flow, `$bind` only accepts direct paths. It cannot be used directly with computed expressions like `$bind(upper(/name))`.

### Handling Transformations
If you need to transform data during a two-way binding, there are two primary approaches:
1. **Event-Based**: Use a manual `oninput` handler to apply the transformation, e.g., `$set(/name, upper($event/target/value))`.
2. **Schema-Based**: Define a `transform` or `pattern` in the schema for the path. The `$bind` helper will respect the schema rules during the write-back phase.

---

## Example

A modern, lifecycle-based reactive counter:

```json
{
  "div": {
    "onmount": $state({ count: 0 }, { name: 'counter', schema: 'auto', scope: $this }),
    "children": [
      { "h2": "Modern JPRX Counter" },
      { "p": ["Current Count: ", $/counter/count] },
      { "button": { "onclick": $++/counter/count, "children": ["+"] } },
      { "button": { "onclick": $--/counter/count, "children": ["-"] } }
    ]
  }
}
```

---
© 2026 Simon Y. Blackwell, AnyWhichWay LLC. Licensed under MIT.
