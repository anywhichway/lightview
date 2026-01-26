# Lightview AI Guidance

This document is the **definitive guide** for Large Language Models (LLMs) on how to effectively use the Lightview library. It covers all development workflows, particularly emphasizing correct source file usage, hypermedia patterns, and dynamic generation.

## Table of Contents
1.  [Critical: Source Files vs Modules](#source-files)
2.  [The Four UI Syntaxes](#the-four-ui-syntaxes)
3.  [Hypermedia & Lightview X](#hypermedia-lightview-x)
4.  [JPRX & cDOM (AI-Safe Generation)](#jprx-cdom)
5.  [Component System](#component-system)
6.  [Routing & Navigation](#routing-navigation)
7.  [AI Development Strategies](#ai-development-strategies)
8.  [Deep Links & Resources](#deep-links)

---

<a name="source-files"></a>
## 1. Critical: Source Files vs Modules

**PAY CAREFUL ATTENTION TO FILE TYPES.**

*   **Standard Scripts (`.js`)**: These files exist in the root and are suitable for direct browser inclusion via script tags or simple bundling.
    *   `lightview.js`: The core reactive engine (Signals, State, $, Effect).
    *   `lightview-x.js`: The "Extension" module (Hypermedia, src fetching, simple validation, vDOM/oDOM conversion).
    *   `lightview-router.js`: The Router implementation.
    *   `lightview-cdom.js`: The parser for JPRX and cDOM.

*   **ES Modules (in subdirectories)**: Files in `jprx/`, `components/`, etc., are ES modules.
    *   **Do not** reference these directly in a generic HTML script tag without `type="module"`.
    *   **Do** import them in your application logic files (e.g., `import { ... } from './jprx/parser.js'`).

**Guidance**: When helping a user set up a new project, prefer importing from the root standard scripts for simplicity, or set up a proper `build.js` if deep module imports are needed.

**Note on Syntaxes**:
- **Tagged API**: Supported in `lightview.js`.
- **vDOM**: Supported in `lightview.js` (standard `{ tag: ... }` objects).
- **oDOM**: Requires `lightview-x.js` (converts `{ div: ... }` usage).

---

<a name="the-four-ui-syntaxes"></a>
## 2. The Four UI Syntaxes

Choose the syntax that matches your goal.

### A. Tagged API (Best for Logic)
Javascript functions representing HTML tags. Best for building applications with complex logic.
```javascript
const { div, h1, button } = Lightview.tags;
const count = signal(0);

const view = div({ class: "p-4" },
  h1("Counter"),
  button({ onclick: () => count.value++ }, () => `Count: ${count.value}`)
);
```

### B. vDOM (Best for Structured Data)
Explicit JSON structure. Use this when you need a standard, serializable format.
```javascript
const view = {
  tag: "div",
  attributes: { class: "p-4" },
  children: [
    { tag: "h1", children: ["Counter"] },
    { tag: "button", attributes: { onclick: () => count.value++ }, children: [() => `Count: ${count.value}`] }
  ]
};
```

### C. oDOM (Best for Compact Templates)
"Object DOM" uses keys as tags. It is significantly more concise. **Preferred for configuration-based UIs.**
```javascript
const view = {
  div: {
    class: "p-4",
    children: [
      { h1: "Counter" },
      { button: { onclick: "...", children: ["Increment"] } }
    ]
  }
};
```

### D. Custom Elements (Best for Hybrid Apps)
Standard HTML tags powered by Lightview. Use these when enhancing an existing HTML page.
```html
<lv-button onclick="alert('clicked')">Click Me</lv-button>
```

---

<a name="hypermedia-lightview-x"></a>
## 3. Hypermedia & Lightview X

Lightview X adds powerful **Hypermedia** capabilities to standard HTML elements.

### The `src` and `href` Attributes (Hypermedia)
*   **`src`**: Fetches content and replaces the element or its content.
    *   **Support**: `.html`, `.json`, `.vdom`, `.odom`, `.cdom`, `.cdomc`
    *   **Usage**: `<div src="/components/user-card.vdom"></div>`
*   **`href`**: Non-standard tags (like `div`) with `href` act as "Links".
    *   **Behavior**: Clicking them fetches the content at the URL and replaces the element's `src`.
    *   **Targeting**: Use `target="#dest:beforeend"` to direct the content elsewhere.
    *   **Usage**: `<div href="/api/next-page" target="#content:beforeend">Load More</div>`

### Advanced Fetches (`data-method` & `data-body`)
Customize HTTP requests for `src` and `href` actions.

*   **`data-method`**: Specify the HTTP verb (e.g., `POST`, `PUT`, `DELETE`). Defaults to `GET`.
*   **`data-body`**: The data to send with the request.
    *   **CSS Selector (Default)**: Grabs the data from the DOM.
        *   `form`: Serialized as `FormData`.
        *   `input`/`select`/`textarea`: Sends the current `value`.
        *   `checkbox`/`radio`: Sends `value` only if checked.
        *   Other elements: Sends `innerText`.
    *   **`javascript:expr`**: Evaluates a Javascript expression (has access to `state` and `signal`).
    *   **`json:{...}`**: Sends a literal JSON string (sets `Content-Type: application/json`).
    *   **`text:...`**: Sends raw text (sets `Content-Type: text/plain`).
*   **GET Requests**: If the method is `GET`, the data from `data-body` is automatically converted into **URL Query Parameters**.

**Usage**:
```html
<!-- Post a form -->
<button href="/api/user/save" data-method="POST" data-body="#user-form">Save</button>

<!-- Fetch with query params from an input -->
<button href="/api/search" data-body="#search-input" target="#results">Search</button>
```

*   **Template Literals**: Supported in HTML, vDOM, and oDOM strings (e.g., `class="${ val > 10 ? 'red' : 'blue' }"`) via `lightview-x.js`.
*   **Gating**: 
    1.  **`Lightview.hooks.validateUrl`**: Intercept/block URLs.
    2.  **`lv-before`**: Attribute that gates events (e.g., `lv-before="click: throttle(500)"` or custom functions).

### Logic in Attributes (`template literals`)
Lightview X allows embedded `${}` expressions in attributes for simple reactivity
```javascript
{
  div: {
    class: "${ count.value > 10 ? 'text-red-500' : 'text-green-500' }",
    children: ["Status"]
  }
}
```

---

<a name="jprx-cdom"></a>
## 4. JPRX & cDOM (Safe Dynamic UI Generation For Humans and AIs)

**cDOM (Computed DOM)** and **JPRX (JSON Reactive Expressions)** allow you to build fully reactive UIs using **only JSON**.

### JPRX Helper Reference
JPRX supports a wide range of helpers. AI agents should use these instead of trying to write JS when builing streaming UIs at runtime.

| Category | Helpers |
| :--- | :--- |
| **Math** | `add`, `subtract`, `multiply`, `divide`, `mod`, `pow`, `abs`, `round`, `ceil`, `floor`, `sqrt`, `negate`, `toPercent` |
| **Logic** | `and`, `or`, `not`, `if`, `eq`, `neq`, `gt`, `lt`, `gte`, `lte` |
| **String** | `join`, `concat`, `upper`, `lower`, `trim`, `len`, `split`, `replace`, `capitalize`, `contains` |
| **Array** | `map`, `filter`, `reduce`, `push`, `pop`, `sort`, `reverse`, `slice`, `find` |
| **Stats** | `sum`, `avg`, `min`, `max`, `median`, `stdev`, `variance` |
| **Data** | `lookup(val, searchArr, resultArr)` (VLOOKUP-style) |
| **State** | `state(val, opts)`, `set(path, val)`, `bind(path)`, `increment`, `decrement`, `toggle` |
| **DOM** | `xpath(expr)` (Backward-looking only), `move(target, loc)` |
| **Net** | `fetchHelper(url, opts)`, `mount(url, opts)` |

### The "Decentralized Layout" Pattern (AI Strategy)
1.  **Define**: Create a self-contained component with state.
2.  **Move**: Use `=move('#target')` in `onmount` to teleport it.
3.  **Stream**: Determine the update needed, generate the `.cdomc`, and let it patch itself.

```javascript
/* .cdomc format */
{
  div: {
    id: "widget-1",
    onmount: ["=state({val:0}, {name:'w1', scope:$this})", "=move('#sidebar')"],
    children: [ { p: "Val: =/w1/val" } ]
  }
}
```

---

<a name="component-system"></a>
## 5. Component System

Built on **DaisyUI** and **Tailwind CSS**.

*   **Import**: `import { Button } from './components/index.js';`
*   **Init**: `LightviewX.initComponents()` (Shadow DOM).
*   **Theming**: `Lightview.setTheme('dark')` or `localStorage.setItem('lightview-theme', 'dark')`.

---

<a name="routing-navigation"></a>
## 6. Routing & Navigation

The `LightviewRouter` uses a pipeline (chain) architecture.

### Advanced: Middleware Chains
You can chain multiple handlers for a single route. This is powerful for authentication or data pre-loading.
```javascript
const checkAuth = async (ctx) => {
    const user = await getUser();
    if (!user) {
        LightviewRouter.navigate('/login');
        return null; // Stop chain
    }
    return { ...ctx, user }; // Pass data to next handler
};

router.use(
  '/admin/*', 
  checkAuth,            // 1. Guard
  '/views/admin.html'   // 2. Render
);
```

### Route Patterns
*   **Static**: `router.use('/about', 'about.html')`
*   **Wildcard**: `router.use('/docs/*', handler)` -> matches `/docs/api/v1`
*   **Parameters**: `router.use('/users/:id', handler)` -> `ctx.params.id`
*   **Replacement**: `router.use('/blog/:slug', '/content/posts/:slug.html')` -> Maps URL params to file path automatically.

---

<a name="ai-development-strategies"></a>
## 7. AI Development Strategies

**Scenario A: "I need a full web application."**
*   **Strategy**: Use **Tagged API** + **lightview-router.js**.
*   **Output**: Generate `.js` files.

**Scenario B: "I need a dynamic dashboard widget of unknown nature at app development time."**
*   **Strategy**: Use **cDOM/JPRX**.
*   **Output**: Stream `.cdomc` chunks.

**Scenario C: "I need a config-driven UI."**
*   **Strategy**: Use **oDOM**.
*   **Output**: Generate `.json` config files.

---

<a name="deep-links"></a>
## 8. Deep Links & Resources

*   **Documentation Home**: [/docs/index.html](file:///c:/Users/Owner/AntigravityProjects/lightview/docs/index.html)
*   **Core Logic**: [/lightview.js](file:///c:/Users/Owner/AntigravityProjects/lightview/lightview.js)
*   **Extension (Hypermedia)**: [/lightview-x.js](file:///c:/Users/Owner/AntigravityProjects/lightview/lightview-x.js)
*   **Router**: [/lightview-router.js](file:///c:/Users/Owner/AntigravityProjects/lightview/lightview-router.js)
*   **CDOM/JPRX Parser**: [/lightview-cdom.js](file:///c:/Users/Owner/AntigravityProjects/lightview/lightview-cdom.js)
*   **Component Index**: [/components/index.js](file:///c:/Users/Owner/AntigravityProjects/lightview/components/index.js)
*   **JPRX Helpers**: [/jprx/helpers/](file:///c:/Users/Owner/AntigravityProjects/lightview/jprx/helpers/)

---
© 2026 AnyWhichWay LLC.
