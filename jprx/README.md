# JPRX (JSON Reactive Path eXpressions)

**JPRX** is a declarative, reactive expression syntax designed for JSON-based data structures. It extends [JSON Pointer (RFC 6901)](https://www.rfc-editor.org/rfc/rfc6901) with reactivity, relative paths, operator syntax, and a rich library of helper functions.

## Overview

JPRX is a **syntax** and an **expression engine**. While this repository provides the parser and core helper functions, JPRX is intended to be integrated into UI libraries or state management systems that can "hydrate" these expressions into active reactive bindings.

### Why JPRX?

- **Declarative Power**: Define relationships between data points as easily as writing an Excel formula.
- **Security**: JPRX strictly avoids `eval()`. Expressions are handled by a custom high-performance Pratt parser and a registry of pre-defined helpers, making it safe for dynamic content.
- **Portability**: Because JPRX expressions are strings within JSON structures, they are easily serialized, stored, and sent over the wire.
- **Platform Agnostic**: While Lightview is the first implementation, JPRX can be used in any environment that manages reactive state.

## Syntax & Features

JPRX extends the base JSON Pointer syntax with:

| Feature | Syntax | Description |
|---------|--------|-------------|
| **Global Path** | `$/user/name` | Access global state via an absolute path. |
| **Relative Path** | `./count` | Access properties relative to the current context. |
| **Parent Path** | `../id` | Traverse up the state hierarchy. |
| **Functions** | `$sum(/items...price)` | Call registered core helpers. |
| **Explosion** | `/items...name` | Extract a property from every object in an array (spread). |
| **Operators** | `$++/count`, `$/a + $/b` | Familiar JS-style prefix, postfix, and infix operators. |
| **Placeholders** | `_` (item), `$event` | Context-aware placeholders for iteration and interaction. |

## Human & AI Utility

JPRX is uniquely positioned to bridge the gap between human developers and AI coding assistants:

### For Humans: "The Excel Paradigm"
Humans are often familiar with the "recalculation" model of spreadsheets. JPRX brings this to UI development. Instead of writing complex "glue code" (event listeners, state updates, DOM manipulation), developers specify the *formula* for a UI element once, and it stays updated forever.

### For AI: Structured & Concise
Large Language Models (LLMs) are exceptionally good at generating structured data (JSON) and formulaic expressions. They are often prone to errors when generating large blocks of imperative JavaScript logic. JPRX provides a high-level, declarative "target" for AI to aim at, resulting in:
- **Higher Accuracy**: Less boilerplate means fewer places for the AI to hallucinate.
- **Safety**: AI can generate UI logic that remains sandboxed and secure.
- **Compactness**: Entire interactive components can be described in a few lines of JSON.

## Operators

JPRX supports a wide range of operators that provide a more concise and familiar syntax than function calls.

### Arithmetic & Logic (Infix)
Infix operators require surrounding whitespace in JPRX to avoid ambiguity with path separators.

- **Arithmetic**: `+`, `-`, `*`, `/`, `mod`, `pow`
- **Comparison**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Logic**: `&&`, `||`

*Example:* `$/a + $/b * 10 > $/threshold`

### Mutation & Unary (Prefix/Postfix)
These operators are typically used in event handlers or for immediate state transformation.

- **Increment**: `$++/count` (prefix) or `$/count++` (postfix)
- **Decrement**: `$--/count` (prefix) or `$/count--` (postfix)
- **Toggle**: `$!!/enabled` (logical NOT/toggle)

## Helper Functions

JPRX includes a comprehensive library of built-in helpers. For security, only registered helpers are available—there is no access to the global JavaScript environment.

### Math
`add`, `sub`, `mul`, `div`, `mod`, `pow`, `sqrt`, `abs`, `round`, `ceil`, `floor`, `min`, `max`

### Stats
`sum`, `avg`, `min`, `max`, `median`, `stdev`, `var`

### String
`upper`, `lower`, `trim`, `capitalize`, `titleCase`, `contains`, `startsWith`, `endsWith`, `replace`, `split`, `join`, `concat`, `len`, `default`

### Array
`count`, `map`, `filter`, `find`, `unique`, `sort`, `reverse`, `first`, `last`, `slice`, `flatten`, `join`, `len`

### Logic & Comparison
`if`, `and`, `or`, `not`, `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `between`, `in`

### Formatting
`number`, `currency`, `percent`, `thousands`

### DateTime
`now`, `today`, `date`, `formatDate`, `year`, `month`, `day`, `weekday`, `addDays`, `dateDiff`

### Lookup
`lookup`, `vlookup`, `index`, `match`

### State Mutation
`set`, `increment`, `decrement`, `toggle`, `push`, `pop`, `assign`, `clear`

### Network
`fetch(url, options?)` - *Auto-serializes JSON bodies and handles content-types.*

## Example

A simple reactive counter described in JPRX syntax:

```json
{
  "div": {
    "cdom-state": { "count": 0 },
    "children": [
      { "h2": "Counter" },
      { "p": ["Current Count: ", "$/count"] },
      { "button": { "onclick": "$increment(/count)", "children": ["+"] } },
      { "button": { "onclick": "$decrement(/count)", "children": ["-"] } }
    ]
  }
}
```

## Reference Implementation: Lightview

JPRX was originally developed for [Lightview](https://github.com/anywhichway/lightview) to power its **Computational DOM (cDOM)**. Lightview serves as the primary example of how a UI library can hydrate JPRX expressions into a live, reactive interface.

If you are building a UI library and want to support reactive JSON structures, this parser provides the foundation.

## Getting Started

The JPRX package contains:
1. `parser.js`: The core Pratt parser and path resolution logic.
2. `helpers/`: A comprehensive library of math, logic, string, array, formatting, and state helpers.

To use JPRX, you typically register your state-management primitives (like Signals or Proxies) with the parser's registry, and then call `hydrate()` or `resolveExpression()` to activate the logic.

---
© 2026 Simon Y. Blackwell, AnyWhichWay LLC. Licensed under MIT.
