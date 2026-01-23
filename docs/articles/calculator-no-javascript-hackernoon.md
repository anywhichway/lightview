# Building a Fully Functional Calculator with Zero Custom JavaScript

*How a JSON or JSON-like language enables the next generation of safe human and AI-generated UIs*

---

In [The Future of AI-Generated UI](https://hackernoon.com/the-future-of-ai-generated-ui-why-i-built-cdom-and-jprx), I made the case that raw JavaScript is a security nightmare for AI-generated code. I argued that we need declarative, sandboxed formats like **cDOM** (structure) and **JPRX** (behavior) if we ever want to trust an LLM to build our interfaces.

But let's be real: reactive counters and to-do lists are easy. Any framework looks elegant when the logic fits on a napkin. To prove a JSON-based approach actually holds up in production, you need a problem with messy state, edge cases, and distinct modes of operation.

You need a calculator.

Calculators are inherently tricky:
- **Input Modes**: Are we typing a fresh number or appending to an existing one?
- **Chaining**: What happens when you hit `+` then `-` then `*` without hitting equals?
- **DRY Logic**: How do we avoid writing 10 separate handlers for buttons 0-9?

So I built (well actually Claude Opus built) a fully functional, iOS-style calculator using **zero custom JavaScript functions** - just declarative cDOM and JPRX expressions.

## The Result

A fully functional, iOS-style interface is handled purely by the expression language. No hidden `script` tags, no helper functions.

![Calculator Screenshot](calculator-screenshot.png)

## The State Machine

A calculator feels stateless, but it's actually a strict state machine. You're never just "typing a number"; you're either entering the first operand, waiting for an operator, or typing the second operand.

We model this brain directly in the component's mount event:

```javascript
onmount: =state({
    display: "0",      // What you see on screen
    expr: "",          // History string (e.g., "8 + 5 =")
    prev: "",          // The value stored before an operation
    op: "",            // The active operator (+, -, *, /)
    waiting: false     // True when expecting new number input vs an operator
}, { name: "c", schema: "polymorphic", scope: $this })
```

This creates a reactive state object named `c`. We can read it anywhere with paths like `/c/display`.

## Solving the "10 Buttons" Problem

The classic DRY (Don't Repeat Yourself) challenge: I have 10 number buttons. Do I write 10 handlers? Do I write a loop? In React or Vue, you'd probably map over an array.

With JPRX, the DOM *is* the data key.

By giving each button an `id` (e.g., `id: "7"`), we write a **single logic expression** that adapts to whichever element triggered it. We just reference `$this.id`:

```javascript
{ button: { 
    id: "7", 
    class: "btn btn-number", 
    onclick: =set(/c, { 
        display: if(/c/waiting, 
            $this.id, 
            if(eq(/c/display, "0"), 
                $this.id, 
                concat(/c/display, $this.id)
            )
        ), 
        waiting: false 
    }), 
    children: ["7"] 
} }
```

Here's what is happening:
1.  **Waiting for input?** (e.g., just hit `+`) → Replace the display with the button's ID.
2.  **Displaying "0"?** → Replace it (avoids "07").
3.  **Otherwise:** → Append the button's ID.

This works identically for every number button. No loops, no external helper functions.

## Operators and "Indirect" Values

This is where it gets tricky. When you click `+`, you can't just link `prev` to `display`. If you did, `prev` would update every time you selected a new digit for the *second* number, breaking the math.

We need a snapshot of the value *at that exact moment*.

Excel solves this with `INDIRECT`, effectively dereferencing a cell. JPRX borrows the same concept:

```javascript
{ button: { 
    class: "btn btn-operator", 
    onclick: =set(/c, { 
        prev: indirect(/c/display),    // Capture the value right NOW
        expr: concat(/c/display, " +"), 
        op: "+", 
        waiting: true 
    }), 
    children: ["+"] 
} }
```

`indirect(/c/display)` reads the path and returns its **value** at that exact moment. It essentially dereferences the pointer.

## The `calc()` Helper

Finally, the math. We need to say: *"Take the snapshot we stored, apply the current operator, and combine it with what's on screen now."*

This is the job of `calc()`. To keep the syntax clean, we use `$('path')` as a shorthand for capturing values right before evaluation.

> **Note:** `$('/path')` is just syntactic sugar for `indirect('/path')`.

```javascript
{ button: { 
    class: "btn btn-equals", 
    onclick: =set(/c, { 
        display: if(eq(/c/op, ""), 
            /c/display, // No op? Do nothing.
            calc(concat("$('/c/prev') ", /c/op, " $('/c/display')"))
        ), 
        expr: concat(/c/expr, " ", /c/display, " ="), 
        prev: "", 
        op: "", 
        waiting: true 
    }), 
    children: ["="] 
} }
```

If `prev` is 8, `op` is `*`, and `display` is 5, `calc` receives the string `"8 * 5"` and evaluates it safely.

## The Complete cDOMC Source

Here is the full source code for the calculator in `.cdomc` format:

> **Note:** cDOMC (compressed cDOM) supports comments and does not require quoting property names, making it more readable and maintainable than strict JSON. Lightview also supports parsing cDOM from regular JSON with quotes, so you can use it with any JSON parser.

```javascript
// Pure cDOM/JPRX Calculator - No custom JavaScript helpers needed!
// Uses only core JPRX helpers:
// - state, set: state management
// - if, eq: conditionals
// - concat, contains: string operations
// - negate, toPercent: math operations
// - calc with $(): expression evaluation
{
    div: {
        class: "calculator",
        onmount: =state({
            display: "0",
            expr: "",
            prev: "",
            op: "",
            waiting: false
        }, { name: "c", schema: "polymorphic", scope: $this }),
        children: [
            // Display area
            {
                div: {
                    class: "display",
                    children: [
                        { div: { class: "expression", children: [=/c/expr] } },
                        { div: { class: "result", children: [=/c/display] } }
                    ]
                }
            },
            // Button grid
            {
                div: {
                    class: "buttons",
                    children: [
                        // Row 1: AC, ±, %, ÷
                        { button: { class: "btn btn-clear", onclick: =set(/c, { display: "0", expr: "", prev: "", op: "", waiting: false }), children: ["AC"] } },
                        { button: { class: "btn btn-function", onclick: =set(/c, { display: negate(/c/display), waiting: true, expr: "" }), children: ["±"] } },
                        { button: { class: "btn btn-function", onclick: =set(/c, { display: toPercent(/c/display), waiting: true, expr: "" }), children: ["%"] } },
                        { button: { class: "btn btn-operator", onclick: =set(/c, { prev: indirect(/c/display), expr: concat(/c/display, " ÷"), op: "/", waiting: true }), children: ["÷"] } },
                        
                        // Row 2: 7, 8, 9, ×
                        { button: { id: "7", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["7"] } },
                        { button: { id: "8", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["8"] } },
                        { button: { id: "9", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["9"] } },
                        { button: { class: "btn btn-operator", onclick: =set(/c, { prev: indirect(/c/display), expr: concat(/c/display, " ×"), op: "*", waiting: true }), children: ["×"] } },
                        
                        // Row 3: 4, 5, 6, −
                        { button: { id: "4", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["4"] } },
                        { button: { id: "5", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["5"] } },
                        { button: { id: "6", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["6"] } },
                        { button: { class: "btn btn-operator", onclick: =set(/c, { prev: indirect(/c/display), expr: concat(/c/display, " −"), op: "-", waiting: true }), children: ["−"] } },
                        
                        // Row 4: 1, 2, 3, +
                        { button: { id: "1", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["1"] } },
                        { button: { id: "2", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["2"] } },
                        { button: { id: "3", class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, $this.id, if(eq(/c/display, "0"), $this.id, concat(/c/display, $this.id))), waiting: false }), children: ["3"] } },
                        { button: { class: "btn btn-operator", onclick: =set(/c, { prev: indirect(/c/display), expr: concat(/c/display, " +"), op: "+", waiting: true }), children: ["+"] } },
                        
                        // Row 5: 0, ., =
                        { button: { class: "btn btn-number btn-wide", onclick: =set(/c, { display: if(/c/waiting, "0", if(eq(/c/display, "0"), "0", concat(/c/display, "0"))), waiting: false }), children: ["0"] } },
                        { button: { class: "btn btn-number", onclick: =set(/c, { display: if(/c/waiting, "0.", if(contains(/c/display, "."), /c/display, concat(/c/display, "."))), waiting: false }), children: ["."] } },
                        { button: { class: "btn btn-equals", onclick: =set(/c, { display: if(eq(/c/op, ""), /c/display, calc(concat("$('/c/prev') ", /c/op, " $('/c/display')"))), expr: concat(/c/expr, " ", /c/display, " ="), prev: "", op: "", waiting: true }), children: ["="] } }
                    ]
                }
            },
            // Branding
            {
                div: {
                    class: "branding",
                    children: [
                        { span: { children: ["Built with ", { a: { href: "https://github.com/anywhichway/lightview", target: "_blank", children: ["Lightview"] } }, " cDOM • No custom JS!"] } }
                    ]
                }
            }
        ]
    }
}
```

## Loading cDOM via Hypermedia

Lightview supports loading cDOM content from external files using its hypermedia capability. Simply add a `src` attribute to any element, and Lightview will fetch and hydrate the cDOM content:

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description"
        content="A beautiful calculator built with Lightview cDOM and JPRX reactive expressions - no custom JavaScript!">
    <title>Calculator | Lightview cDOM</title>
    <link rel="stylesheet" href="calculator.css">
    <!-- Load Lightview scripts -->
    <script src="/lightview.js"></script> <!-- DOM as JSON and reactivity support -->
    <script src="/lightview-x.js"></script> <!-- hypermedia support -->
    <script src="/lightview-cdom.js"></script> <-- cDOM/JPRX support -->
</head>

<body>
    <!-- The calculator cDOM is loaded via Lightview's hypermedia src attribute -->
    <div id="app" src="./calculator.cdomc"></div>
</body>

</html>
```

The `src` attribute works like an HTML `<img>` or `<script>` tag—Lightview automatically fetches the `.cdomc` file, parses it, and renders the reactive content into the target element. This approach:

1.  **Separates concerns:** Your HTML remains minimal while cDOM handles the component logic.
2.  **Enables caching:** The browser can cache `.cdomc` files like any other static asset.
3.  **Supports composition:** You can load different cDOM components into different parts of your page.

## Why Build This Way?

You might look at `concat("$('/c/prev') ...")` and ask: *Why in the world wouldn't you just write `parseFloat(prev) + parseFloat(curr)`?*

If you are a human writing code for yourself? You probably should. Lightview supports standard JS handlers for exactly that reason.

But if you are building infrastructure for **AI Agents**, the calculus changes. Sticking to a declarative, JSON-based path offers things raw code can't:

1.  **Sandboxing:** It executes in a controlled environment. The logic can't access `window`, make global fetch requests, or execute arbitrary secondary code. This makes it safe to "hot swap" UI logic generated by an LLM in real-time.
2.  **Portability:** This entire UI—logic and all—is just data. It can be sent from a server, stored in a database, or streamed from an AI model.
3.  **Mental Model:** It forces a clear separation between state transformations and view structure, which is exactly how LLMs reason best.

This calculator proves that "declarative" doesn't have to mean "dumb." With the right primitives—state, conditionals, and path-based referencing—you can build rich, complex interactions without ever leaving the data structure.

> **A Note on Authorship:** This calculator wasn't hand-crafted. It was generated by **Claude Opus** after reading the [cDOM documentation](https://lightview.dev/docs/cdom). The fact that an AI could produce a robust, edge-case-handling calculator purely from documentation proves the point: cDOM and JPRX aren't just new syntax. They are a protocol for human-machine collaboration.

## The Bigger Picture

This series isn't just about a new library. It's about finding the right abstraction layer for the AI age.

**In [Part 1](https://hackernoon.com/the-future-of-ai-generated-ui-why-i-built-cdom-and-jprx)**, we looked at the security risks of letting LLMs write raw scripts and introduced the "Data as UI" philosophy.

**In this article**, we proved that "Data as UI" doesn't mean "dumb UI." We handled state, context, data snapshots, and math without executing a single line of imperative code.

cDOM defines structure. JPRX defines behavior. It’s reactivity without the compilation and UI without the security risks.

### Try It Yourself

The complete calculator is available at:

**[Live Demo](https://lightview.dev/docs/calculator.html)**

**[Source Code](https://github.com/anywhichway/lightview/blob/main/docs/calculator.html)**

---

*Lightview is an open-source reactive UI library. Learn more at [github.com/anywhichway/lightview](https://github.com/anywhichway/lightview).*
