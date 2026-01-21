# Building a Fully Functional Calculator with Zero JavaScript Logic

*How cDOM and JPRX let you build complex UIs using pure declarative JSON*

---

Last time, I showed how [cDOM lets you build simple reactive UIs with JSON](https://medium.com/@anywhichway/building-reactive-uis-with-json-no-javascript-required-b7b1c4a45321). But let's be honest: counters and shopping carts are easy. Almost any framework looks good when the logic is trivial.

To see if a declarative, JSON-based approach actually holds up in the real world, you need a problem with messy state, edge cases, and history.

You need a calculator.

Calculators are tricky because they're full of hidden complexity:
- Managing input modes (are we typing a new number or replacing the result?)
- Chaining operations (what happens when you hit `+` then `-`?)
- DOM interaction (how do we avoid writing 10 separate handlers for buttons 0-9?)

This is how I built a fully functional, iOS-style calculator using **zero custom JavaScript functions**—just declarative cDOM and JPRX expressions.

## The Result

Here is what we are building. A clean, glassmorphic interface where every interaction—from typing decimals to chaining operations—is handled by the expression language itself.

![Calculator Screenshot](calculator-screenshot.png)

## The State Machine

First, we need to model the calculator's brain. It's not just a "current number"; it's a small state machine.

We define this state right in the JSON when the component mounts:

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

In a typical framework, you'd loop over an array of numbers to generate buttons, or write a generic `handleNumberClick` function to avoid repetitive code.

In JPRX, we can just use the DOM itself.

By assigning an `id` to each button, we can write **one single logic expression** that works for every number key. All we have to do is reference `$this.id`:

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

Here's the breakdown of that expression:
1.  **Are we waiting for new input?** (e.g., after hitting `+`) → Replace the display with the button's ID.
2.  **Is the current display "0"?** → Replace it (to avoid "07").
3.  **Otherwise:** → Append the button's ID to the current display string.

This works identically for every number button. No loops, no external helper functions.

## Operators and "Indirect" Values

When you click `+` or `×`, the calculator needs to "freeze" the current number so you can type the next one. This brings up an interesting challenge in reactivity.

If we just saved a reference to `/c/display`, our stored value would keep changing as the user types. We need a snapshot.

Excel solves this with the `INDIRECT` function. JPRX does the same:

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

Evaluating the math is the final piece. We need a way to say: *"Take the previous value, apply the operator to the current display value, and give me the result."*

We use the `calc()` helper for this. To make it readable, `calc` supports a convenient shorthand: `$('path')`.

> **Note:** `$('/path')` is just syntactic sugar for `indirect('/path')` inside calculation strings. It tells the parser to fetch the value before doing the math.

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

> **Note:** cDOMC (compressed cDOM) supports comments and does not require quoting property names, making it more readable and maintainable than strict JSON.

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

You might look at `concat("$('/c/prev') ...")` and ask: *Why not just write a JavaScript function?*

And for many cases, you should! Lightview allows standard JS handlers whenever you want them. But sticking to the declarative path has distinct advantages:

1.  **Portability:** This entire UI—logic and all—is just JSON (well, JPRXC). It can be sent from a server, stored in a DB, or generated by an LLM.
2.  **Sandboxing:** It executes in a controlled environment. The logic can't access `window`, make global fetch requests (unless allowed), or mess with the DOM outside its scope.
3.  **Mental Model:** It forces you to think about the UI as a series of **state transformations** rather than imperative steps.

This calculator proves that "declarative" doesn't have to mean "dumb." With the right primitives—state, conditionals, and referencing—you can build rich, complex interactions without ever leaving the data structure.

> **A note on authorship:** This calculator wasn't hand-crafted by a human developer. It was generated by **Claude Opus** (Anthropic's LLM) after reading the [cDOM documentation](https://lightview.dev/docs/cdom) and the [JPRX npm package docs](https://www.npmjs.com/package/jprx). The fact that an AI could produce a fully functional, edge-case-handling calculator purely from documentation is exactly the point: cDOM and JPRX are formats that both humans and machines can reason about.

## The Bigger Picture

This article is the second in a series exploring how far we can push declarative, JSON-based UI development by both humans and LLMs.

**In [Part 1](https://medium.com/@anywhichway/building-reactive-uis-with-json-no-javascript-required-b7b1c4a45321)**, we introduced **cDOM**, a structural replacement for HTML and JSX. We focused on:
*   Defining the UI hierarchy using standard JSON objects.
*   Connecting to servers and LLMs with `fetch()` and `mount()`.
*   Building a live dashboard that sorts and filters without server round-trips.
*   *Key Concepts:* Reactive paths, operators (`++`, `--`), explosion operator (`...`), `$this`/`$event`, scoped state
*   *Helpers:* `state()`, `set()`, `fetch()`, `mount()`, `move()`, `sum()`, `filter()`, `map()`, `sort()`, `push()`, `bind()`, `if()`, `formatDate()`, `formatNumber()`

**In Part 2 (this article)**, we tackled the missing piece: complex application logic. With **JPRX**, we proved that you don't need imperative JavaScript functions to handle:
*   **State Machines:** `if()`, `eq()`, `set()`, `state()`
*   **Context Awareness:** `$this`, `$event`
*   **Data Capture:** `indirect()`, `$()`
*   **Logic & Math:** `calc()`, `concat()`, `contains()`, `negate()`, `toPercent()`

Together, cDOM and JPRX offer a cohesive system: cDOM defines the *structure*, while JPRX defines the *behavior*. You get the reactivity of modern signals and the component model of a Virtual DOM, but in a portable format that requires no compilation, no build steps, and no context switching between languages. It's just data, all the way down.

### Try It Yourself

The complete calculator is available at:

**[Live Demo](https://lightview.dev/docs/calculator.html)**

**[Source Code](https://github.com/anywhichway/lightview/blob/main/docs/calculator.html)**

---

*Lightview is an open-source reactive UI library. Learn more at [github.com/anywhichway/lightview](https://github.com/anywhichway/lightview).*
