# Building Reactive UIs with JSON — No JavaScript Required

*A declarative approach that lets both humans and LLMs create rich, interactive user interfaces using nothing but JSON.*

---

## The Power of JSON-Based UIs

What if you could build fully reactive, interactive user interfaces without writing a single line of JavaScript? What if the same format that's trivial for developers to write is equally easy for AI agents to generate?

This is the promise of cDOM (Computational DOM) and its expression language, JPRX (JSON Pointer Reactive eXpressions).

## Your First Reactive UI: A Counter in Pure JSON

Here's a complete, working interactive counter — no JavaScript code required:

```json
{
  "div": {
    "onmount": "=state({ count: 0 }, { name: 'local', scope: $this })",
    "children": [
      { "p": ["Count: ", "=local/count"] },
      { "button": { "onclick": "=local/count++", "children": ["+"] } }
    ]
  }
}
```

That's the entire application. Let's break down what's happening:

- `state({ count: 0 })` initializes reactive state scoped to this element
- `=local/count` is a live binding—the text updates automatically when count changes
- `=local/count++` increments the counter directly when clicked
- The UI reacts instantly in the browser, no server needed

This is the spreadsheet paradigm applied to user interfaces. Just like writing `=SUM(A1:A10)` in Excel, you define the relationships and the system handles the updates.

## Why This Matters for Humans

As a developer, you're freed from the boilerplate of event handlers, state management, and manual DOM updates. Instead of imperative code that says "when this happens, do these five things," you write declarative expressions that say "this value always equals that calculation."

Compare traditional JavaScript:

```javascript
let count = 0;
const countDisplay = document.getElementById('count');
const button = document.getElementById('increment');
button.addEventListener('click', () => {
  count++;
  countDisplay.textContent = `Count: ${count}`;
});
```

cDOM/JPRX:

```json
{
  "button": {
    "onclick": "=/local/count++",
    "children": ["Clicks:", "=/local/count"]
  }
}
```

## Why This Matters for LLMs

For AI agents, cDOM provides a safe, structured format for generating UIs:

- **Context-Free Grammar:** No closures, no callbacks, no complex JavaScript patterns. An LLM generates JPRX as easily as it generates natural language.
- **Safe by Design:** No access to eval, arbitrary code execution, or unrestricted DOM access. The application developer controls what's possible through a catalog of helper functions.
- **Declarative:** Less chance to get lost with slop generation in the freedom of the JavaScript language.
- **Streamable:** Components are self-describing and self-contained. An LLM can stream UI updates one piece at a time without regenerating entire pages.

## Connecting to Servers and LLMs

When you need server interaction, it's just another expression. Want to notify an LLM when a button is clicked?

```json
{
  "button": {
    "onclick": "=fetch('/api/notify', { method: 'POST', body: $event })",
    "children": ["Notify LLM"]
  }
}
```

The `=fetch` helper automatically:
- Sends a POST request to your endpoint
- Stringifies JSON bodies and sets the correct Content-Type
- Lets your backend (or LLM) process the event and respond

This is event registration, not constant chatter. The LLM only hears about the interactions you choose to wire up — no need to notify it of every mouse move or keystroke.

## LLMs That Push UI Updates

Here's where things get powerful. What if the LLM wants to add a new component to the page?

```json
{
  "button": {
    "onclick": "=mount('/api/get-widget')",
    "children": ["Load Widget"]
  }
}
```

When clicked, `mount` fetches JSON from your endpoint and injects it as a live, reactive component. The LLM can respond with:

```json
{
  "div": {
    "id": "weather-widget",
    "onmount": "=move('#dashboard-sidebar', 'afterbegin')",
    "children": ["Sunny, 75°F"]
  }
}
```

The widget automatically:
- Mounts safely to the document
- Moves itself to the specified location (`#dashboard-sidebar`)
- Replaces any existing widget with the same ID (idempotent updates)

The LLM doesn't need to understand your entire page structure — it just pushes components that know where they belong.

## Three Levels of Capability

| Level | Use Case | Example Helper | Server Involved? |
|-------|----------|----------------|------------------|
| 1 | Client-only reactivity | `=state`, `=++`, `=sum()` | No |
| 2 | Notify server of actions | `=fetch` | Yes |
| 3 | Server pushes new UI | `=mount`, `=move` | Yes |

This layered approach means you can build:
- Fully offline apps that handle all interactions locally (Level 1)
- Hybrid apps where servers are notified selectively (Level 2)
- Agent-driven apps where LLMs control the UI in real-time (Level 3)

All using the same JSON format.

## JPRX: Excel Formulas for UI

JPRX expressions are designed to feel familiar if you've ever used spreadsheets:

- **Reactive paths:** `=app/user/name` automatically updates when the data changes
- **Operators:** `=++count`, `=count--`, `=!!enabled`
- **Helper functions:** Over 100 functions covering math, strings, arrays, dates, and more
  - `=sum(/cart/items...price)` - Sum all item prices
  - `=filter(/users, age > 18)` - Filter array by condition
  - `=formatDate(/order/date, 'MM/DD/YYYY')` - Format dates
  - `=if(total > 100, 'Bulk', 'Regular')` - Conditional logic
- **State mutations:** `=set(/app/user/name, 'John')`, `=push(/cart/items, $newItem)`
- **Relative paths:** Use `../` to navigate up context hierarchies

If you can write `=SUM(A1:A10)` in Excel, you can write reactive UIs with JPRX.

## A Real-World Example: Live Dashboard

Imagine a user asks an LLM:

> "Show me my sales performance for each region in Q4, highlight anything below target, and let me sort the results."

The LLM responds not with paragraphs of text, but with a live, interactive dashboard:

```json
{
  "div": {
    "id": "sales-dashboard",
    "onmount": "=fetch('/api/sales/q4').then(data => state({ data, sort: 'name' }, 'sales'))",
    "children": [
      { "h2": ["Q4 Sales Performance"] },
      {
        "table": {
          "children": [
            { "thead": [
              { "tr": [
                { "th": { "children": ["Region"], "onclick": "=set('sales/sort', 'name')" } },
                { "th": { "children": ["Revenue"], "onclick": "=set('sales/sort', 'revenue')" } },
                { "th": { "children": ["Target"], "onclick": "=set('sales/sort', 'target')" } },
                { "th": { "children": ["Status"], "onclick": "=set('sales/sort', 'status')" } }
              ]}
            ]},
            { "tbody": {
              "children": "=map(sort(sales.data, (a, b) => a[sales.sort] > b[sales.sort] ? 1 : -1), region => ({ tr: { class: region.revenue < region.target ? 'below-target' : '', children: [ { td: [region.name] }, { td: ['$', formatNumber(region.revenue)] }, { td: ['$', formatNumber(region.target)] }, { td: [region.revenue >= region.target ? '✓' : '⚠'] } ] } }))"
            }}
          ]
        }
      }
    ]
  }
}
```

This entire dashboard is:
- **Reactive:** All calculations update automatically
- **Self-contained:** No separate JavaScript files
- **Safe:** Uses only approved helper functions
- **Readable:** Both humans and LLMs can understand it

When the user sorts, no round trip to the server is required.

## The Vision: Agent-First Applications

The next wave of applications won't be chatbots with UI bolted on. They'll be intelligent systems where conversation and application merge seamlessly.

A user shouldn't have to parse walls of text to understand complex data. An agent should be able to respond with:
- A live chart that filters
- A table that sorts
- A summary that recalculates
- All instantly reactive, no page reloads

cDOM makes this possible by giving both humans and LLMs a shared language for describing not just what the UI looks like, but how it behaves.

## Getting Started

cDOM and JPRX are part of Lightview, a reactive UI library designed for both human developers and AI agents.

- **Documentation:** [lightview.dev](https://lightview.dev)
- **GitHub:** [github.com/anywhichway/lightview](https://github.com/anywhichway/lightview)
- **npm:**
  - Full library: `lightview`
  - Standalone parser: `jprx`

---

*The Spreadsheet Moment for UI*

Spreadsheets democratized computation. You didn't need to be a programmer to define that `C3 = A1 + B2` and watch it update automatically.

cDOM aims to be that moment for user interfaces. A format where anyone — human or AI — can declare:
- This text shows the count
- This button increments it
- This chart sums the sales
- This table filters by region

And the system handles the rest. No JavaScript required.
