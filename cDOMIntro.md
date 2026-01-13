# The Future of AI-Generated UI: Why I Built cDOM and JPRX

**A declarative, secure, and reactive approach to let both humans and LLMs build rich user interfaces.**

---

## The Problem with AI-Generated Interfaces

We are at an inflection point in software development. Large Language Models (LLMs) are rapidly evolving from text-generation tools into full-fledged software agents capable of building applications, analyzing data, and interacting with users in real-time. But there's a critical bottleneck: **how do these agents communicate visually with humans?**

The traditional options are bleak:
1.  **Text-Only Responses**: The chatbot experience. Great for conversation, terrible for complex interactions. Ever tried to book a flight through a wall of text? It's exhausting.
2.  **Raw Code Generation (HTML/JS/React)**: The agent spits out code, and you hope it works. This is a **massive security risk**. Arbitrary code execution is the original sin of computing—do you really want to `eval()` whatever a cloud-based AI model sends you? The answer is no. And, the flexibility of raw language generation can result in either too much brittle code or too much variance from UI exprience to UI experience, something humans do not handle well.
The end states are far away:
1. **Direct generation of images and video** with which users can interact in real-time is too expensive and slow.
2. **Direct mind interfaces** are not yet possible except for the simplest of tasks.
Google recognized the traditional options gap and perhaps the distance to an ultimate end-state when it introduced **A2UI (Agent-to-User Interface)** in late 2025. It's a declarative JSON format where agents describe UI components like `text_field` or `button`, and client applications render them natively. It's a solid approach with a security-first architecture.

But I asked a additional questions:

*   **Why just *describe* the UI? Why not make it *reactive* by design?**
*   **Why limit this approach to LLMs?** Why not provide a reactive, cross-platform way for *human developers* to safely express UIs too?

This is why I built **cDOM (Computational DOM)** and its expression language, **JPRX (JSON Pointer Reactive eXpressions)**.

Let me show you how it works, step by step.

---

## Step 1: A Reactive UI with Zero Server Code or Custom JavaScript

Consider a simple counter. In cDOM, you write this:

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

That's it. No server. No round-trip. No JavaScript except the underlying cDOM library (which could be JavaScript, Dart or some other language).

*   The `state` helper initializes reactive state (`{ count: 0 }`) scoped to this element.
*   The `=local/count` expression is a **live binding**—the paragraph text updates automatically whenever `count` changes.
*   The `=local/count++` operator is a direct increment.

The entire UI is reactive, self-contained, and runs instantly in the browser.

**This is the spreadsheet paradigm applied to UI**: you define the relationships, and the system handles the updates. As you will see below, similar to a spreadhseet, JPRX has **over 100** helper functions, covering everything from math and string manipulation to complex array processing.

---

## Step 2: But What If You *Do* Want LLM Integration?

The counter example is great for client-only interactions. But what if you want to notify an LLM (or any server) when the user clicks a button?

Just swap the operator for a `=fetch` helper:

```json
{
  "button": {
    "onclick": "=fetch('/api/notify', { method: 'POST', body: $event })",
    "children": ["Notify LLM"]
  }
}
```

When the button is clicked:
1.  The `=fetch` helper sends a POST request to `/api/notify` with a JSON body.
2.  Object bodies are automatically stringified, and `Content-Type: application/json` is set for you.
3.  The LLM (or your backend) receives the event and can respond however it likes.

This is the **event registration model**: the LLM doesn't need to be notified of *every* interaction. It only hears about the events that matter—the ones where you've wired up a `fetch`. Developers can wire up `fetch` to any event they want, or when LLMs generate a cDOM component, they can wire up `fetch` to notify them of specific user actions.

This avoids the potential chatty nature of A2UI. Do you really want the LLM notified of every mouse move? Keyboard stroke? Scroll position? Is it time and cost effective to have an LLM deal with things like sorting and filtering, or should you let the client handle it?

**LLM-driven architecture. Native-like responsiveness.**

---

## Step 3: What If the LLM Wants to *Modify* the UI?

Here's where cDOM gets truly powerful. What if the server (or LLM) wants to push a new component into the page?

Enter `=mount`:

```json
{
  "button": {
    "onclick": "=mount('/api/get-widget')",
    "children": ["Load Widget"]
  }
}
```

When clicked, `mount` fetches JSON from `/api/get-widget`, hydrates it as a reactive cDOM element, and **appends it to the document body**.

But wait, what if the LLM wants to place that widget somewhere specific, like a sidebar? That's where `move` comes in.

The LLM simply includes a `=move` directive in the component it returns:

```json
{
  "div": {
    "id": "weather-widget",
    "onmount": "=move('#dashboard-sidebar', 'afterbegin')",
    "children": ["Sunny, 75°F"]
  }
}
```

Here's what happens:
1.  `mount` fetches the widget and appends it to the `body` (a "safe landing").
2.  The moment the widget mounts, `move` **rips it out** and **teleports** it to `#dashboard-sidebar`.
3.  If a widget with the same `id` already exists there, it's **replaced** - making the operation idempotent.

**The LLM doesn't need to regenerate the entire page.** It just pushes components that know how to place themselves.

---

## The Full Picture: Three Levels of Power

You've now seen the three core capabilities:

| Level | Use Case                          | Helper               | Server Involved? |
|-------|-----------------------------------|----------------------|------------------|
| 1     | Client-only reactivity            | `=state`, `=++`, etc | ❌ No             |
| 2     | Notify LLM of user actions        | `=fetch`             | ✅ Yes (one-way)  |
| 3     | LLM pushes new UI to the client   | `=mount`, `=move`    | ✅ Yes (returns UI)|

This layered approach means you can build:
*   Fully offline-capable apps (Level 1)
*   Hybrid apps where the LLM is notified selectively (Level 2)
*   Agent-driven apps where the LLM controls the UI in real-time (Level 3)

All with the same declarative JSON format.

---

## JPRX: The Expression Language Behind the Magic

You've been looking at JPRX expressions this whole time. Let me explain what's under the hood.

**JPRX (JSON Pointer Reactive eXpressions)** is an extension of RFC 6901 JSON Pointer. It adds:

*   **Expressions**: Any path or function name beginning with `=` is an expression. Only the first expression of a nested expression needs to start with `=`.
*   **Reactivity**: Any path starting with `=` (e.g., `=app/user/name`) creates a live subscription. When the data changes, so does the UI.
*   **Operators**: Prefix and postfix mutation (`=++/count`, `=count--`, `=!!/enabled`).
*   **Helper Functions**: Over 100 Excel-like functions (`sum`, `if`, `upper`, `filter`, `map`, `formatDate`) plus state-mutating helpers (`set`, `push`, `assign`), e.g. `=set(/app/user/name, 'John Doe')`.
*   **Relative Paths**: Use `../` to navigate up context hierarchies, just like a file system.

Why is this perfect for LLMs?
1.  **Context-Free Grammar**: No closures, no callbacks. An LLM generates JPRX as easily as it generates a sentence.
2.  **Safe by Design**: No access to `globalThis`, `eval`, or the DOM API outside registered helpers. The application developer controls the helper catalog.
3.  **Streamable**: The LLM can stream components one by one. Each piece is self-describing and self-mounting.

And why is it great for human developers? Because JPRX reads like a spreadsheet formula. If you can write `=SUM(A1:A10)`, you can write `=sum(/cart/items...price)`.

---

## Head-to-Head: cDOM vs. A2UI

| Feature                        | cDOM/JPRX (Lightview)                                      | A2UI (Google)                                              |
|--------------------------------|------------------------------------------------------------|-----------------------------------------------------------|
| **Core Paradigm**              | Declarative + Reactive Computation                         | Declarative Description                                   |
| **Client-Side Reactivity**     | ✅ Built-in via signals & computed expressions             | ❌ Requires server round-trip for state changes           |
| **Interaction Model**          | ✅ Handlers execute client-side (low latency)              | ⚠️ Every interaction signals back to agent (chatty)       |
| **Security Model**             | ✅ Sandboxed helper functions, no arbitrary code           | ✅ Sandboxed component catalog, no arbitrary code         |
| **Expression Language**        | ✅ Full formula language with 100+ helpers                 | ❌ Data binding only, no computation in the format        |
| **LLM Streaming**              | ✅ Components self-mount & teleport via `=move`            | ✅ Flat component list with IDs for incremental updates   |
| **Two-Way Binding**            | ✅ `=bind(/path)` for inputs, selects, checkboxes          | ⚠️ Component-specific, varies by renderer                 |
| **State Management**           | ✅ Scoped, schema-validated `state` objects                | ❌ External state managed by agent or backend             |
| **Framework**                  | Lightview (Vanilla JS, ~5KB core)                          | Client-agnostic (Flutter, React, Angular renderers)       |

A2UI is an excellent wire format for describing **static snapshots** of a UI. It fits neatly into enterprise ecosystems where Flutter or Angular applications render components.

cDOM is designed for **dynamic, client-reactive applications** where the UI is a living computation. When your LLM generates a dashboard, you want it to *react* to user input—filter, sort, calculate—without a server round-trip for every interaction.

And while the current reference implementation is in JavaScript, **nothing prevents cDOM and JPRX from being implemented in other languages like Dart or Swift**. The core concepts—reactive pointers, helper functions, and declarative structure—are universal. You could build a Flutter renderer for cDOM just as easily as Google built one for A2UI.

---

## Custom Components: Extending the Vocabulary

A powerful feature of A2UI is **capability negotiation**: the agent queries the client's component catalog before generating UI. This ensures compatibility across different renderers.

cDOM takes a different approach. There's no formal negotiation protocol, but the ecosystem makes **adding custom components trivial**.

Libraries like **Lightview** and **Juris.js** allow you to define custom HTML elements declaratively:

```javascript
Lightview.define('my-widget', {
  template: `<div><slot></slot> - Custom!</div>`,
  state: { clicks: 0 }
});
```

Once defined, these elements are immediately usable in cDOM:

```json
{ "my-widget": { "children": ["Hello"] } }
```

The philosophy: the **application developer controls the component catalog**, just as in A2UI. The difference is that cDOM skips the negotiation handshake—the LLM uses components it's been trained to expect for that application. If discovery is needed, a JSON manifest of available components can be provided to the LLM as context.

This trade-off prioritizes **simplicity and low overhead** for applications where the component set is known in advance—which, in my experience, is most applications.

---

## Why This Matters for the Future of Agentic UI

I believe the next wave of applications will be **agent-first**. Not chatbots with UI bolted on, but intelligent systems where conversation and application dissolve into one.

A user might ask:
> "Show me my sales performance for Q4, highlight anything below target, and let me drill down by region."

An LLM should respond not with a paragraph, but with a **live dashboard**: a chart that filters, a table that sorts, a summary that recalculates. When the user says "focus on EMEA," the agent streams a UI patch that updates the view in place.

cDOM and JPRX are the foundation for this vision:
*   **For Developers**: Write less JavaScript, define relationships, let reactivity handle the rest.
*   **For LLMs**: A safe, structured, computable expression language as easy to generate as natural text.
*   **For Users**: Rich, instantly reactive interfaces without server round-trip latency.

---

## Get Started with Lightview

cDOM and JPRX are part of **Lightview**, my lightweight (~5KB) reactive UI library. It's framework-agnostic, browser-native, and designed for both humans and machines.

*   **Documentation**: [lightview.dev](https://lightview.dev) - Full guides and API reference
*   **GitHub**: [github.com/anywhichway/lightview](https://github.com/anywhichway/lightview)
*   **npm packages**:
    *   Lightview (includes cDOM): [`npm install lightview`](https://www.npmjs.com/package/lightview)
    *   JPRX (standalone parser): [`npm install jprx`](https://www.npmjs.com/package/jprx)

cDOM is currently in **experimental preview**. I'm actively refining the expression language and helper library based on real-world use cases. I'd love your feedback.

---

## Conclusion: The Spreadsheet Moment for UI

Spreadsheets democratized computation. You didn't need to be a programmer to define that `C3 = A1 + B2` and have it update forever.

cDOM is designed to be that moment for user interfaces. A format where an LLM—or a human—can declare: *this text shows the count; this button increments it; this chart sums the sales*. And the system handles the rest.

In a world where AI agents are becoming the new developers, the language they speak to the browser matters. I think that language should be safe, reactive, and computational from the ground up.

**That's cDOM. Welcome to the Computational DOM.**

---

*Simon Y. Blackwell is the creator of Lightview, a lightweight reactive library for building web applications. He believes that the best code is the code you don't have to write, and that LLMs should be first-class citizens in the UI development process.*
