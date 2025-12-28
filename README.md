
# Lightview: README.md

A lightweight reactive UI library with signal-based reactivity and a clean API. Build dynamic UIs with automatic DOM synchronization.

Access the full documentaion at [lightview.dev](https://lightview.dev).

This NPM package is both the library and the website supporting the library. The website is built using Lightview. The core library files are in the root directory. The Website entry point is index.html and the restr of the site is under ./docs. The site is served by a Cloudflare pages deployment.

**Core**: ~7.5KB | **Additional Hypermedia Extensions and Component Library Support**: ~18KB | **Router**: ~3.5KB

Fast: This [gallery of components](https://lightview.dev/docs/components/) loads in about 1 second: 

## Modular Architecture

Lightview is split into three files:

- **`lightview.js`** - Core reactivity (signals, state, effects, elements)
- **`lightview-x.js`** - Hypermedia extension (src fetching, href navigation, template literals, named registries, Object DOM syntax, UI component library support)
- **`lightview-router.js`** - Router (src fetching, href navigation, template literals, named registries, Object DOM syntax, UI component library support)

### API Behavior

| Usage | Core Only | With `-x` |
|-------|-----------|-----------|
| `signal(5)` | ✅ Works | ✅ Works |
| `signal(5, "count")` | ⚠️ Ignores name | ✅ Registers |
| `signal.get("count")` | ❌ Undefined | ✅ Works |
| `signal.get("count", 0)` | ❌ Undefined | ✅ Creates if missing |
| `state({...})` | ✅ Works | ✅ Works |
| `state({...}, "app")` | ⚠️ Ignores name | ✅ Registers |
| `state.get("app")` | ❌ Undefined | ✅ Works |
| `state.get("app", {...})` | ❌ Undefined | ✅ Creates if missing |
| `"${signal.get('count').value}"` | ❌ No processing | ✅ Reactive template |
| `<div src="page.html">` | ❌ No fetching | ✅ Loads content |
| `<span href="other.html">` | ❌ No navigation | ✅ Reactive navigation |
| `{ div: { class: "x" } }` | ❌ Not recognized | ✅ Object DOM syntax |
| `enhance('#btn', {...})` | ❌ Undefined | ✅ Enhances existing DOM |

### Installation

```html
<!-- Core only (reactivity) -->
<script src="lightview.js"></script>

<!-- Full features (hypermedia + templates) -->
<script src="lightview.js"></script>
<script src="lightview-x.js"></script>

<!-- Full features (hypermedia + templates + router) -->
<script src="lightview.js"></script>
<script src="lightview-x.js"></script>
<script src="lightview-router.js"></script>
```

## Core Concepts

**Lightview** provides four ways to build UIs:

1. **Tagged API** - Concise, Bau.js-style syntax: `tags.div(...)`
2. **vDOM Syntax** - JSON data structures: `{ tag: "div", attributes: {}, children: [] }`
3. **Object DOM Syntax** *(lightview-x)* - Compact: `{ div: { class: "foo", children: [] } }`
4. **HTML** *(lightview-x)* - Custom HTML elements.

All four approaches use the same underlying reactive system based on **signals** and **state**.

## Installation

```html
<script src="lightview.js"></script>
```

## Quick Start

### Style 1: Tagged API

```javascript
const lv = new Lightview();
const { signal, computed, tags } = lv;
const { div, h1, p, button } = tags;

const count = signal(0);
const doubled = computed(() => count.value * 2);

const app = div({ class: 'container' },
  h1('Counter App'),
  p(() => `Count: ${count.value}`),
  p(() => `Doubled: ${doubled.value}`),
  button({ onclick: () => count.value++ }, 'Increment'),
  button({ onclick: () => count.value-- }, 'Decrement')
);

document.body.appendChild(app.domEl);
```

### Style 2: vDOM Syntax (Plain JSON)

```javascript
const { signal, element } = new Lightview();

const count = signal(0);

const app = element('div', { class: 'container' }, [
  {
    tag: 'h1',
    attributes: {},
    children: ['Counter App']
  },
  {
    tag: 'p',
    attributes: {},
    children: [() => `Count: ${count()}`] // or count.value
  },
  {
    tag: 'button',
    attributes: { onclick: () => count.value++ }, // or count(count() + 1)
    children: ['Increment']
  }
]);


document.body.appendChild(app.domEl);
```

### Style 3: Object DOM Syntax (lightview-x)

Object DOM syntax provides a more compact way to define elements. Instead of `{ tag, attributes, children }`, you use `{ tag: { ...attributes, children } }`.

**Requires lightview-x.js** and must be enabled:

```javascript
// Enable Object DOM syntax (call once at startup)
LightviewX.useObjectDOMSyntax();        // Non-strict mode (default)
LightviewX.useObjectDOMSyntax(true);    // Strict mode - validates HTML tag names
```

```javascript
const { signal, element, tags } = Lightview;
const { div, button } = tags;

// Enable Object DOM syntax
LightviewX.useObjectDOMSyntax();

const count = signal(0);

// Object DOM syntax in children arrays
const app = div({ class: 'container' }, 
  { h1: { children: ['Counter App'] } },
  { p: { children: [() => `Count: ${count.value}`] } },
  { button: { onclick: () => count.value++, children: ['Increment'] } }
);

document.body.appendChild(app.domEl);
```

**Comparison:**

| vDOM Syntax | Object DOM Syntax |
|-------------|-------------------|
| `{ tag: 'div', attributes: { class: 'box' }, children: ['Hello'] }` | `{ div: { class: 'box', children: ['Hello'] } }` |

**Pros & Cons:**

| Aspect | vDOM Syntax | Object DOM Syntax |
|--------|-------------|-------------------|
| **Verbosity** | More verbose | More compact |
| **Explicit** | ✅ Clear structure, easy to validate | ⚠️ Tag name is a dynamic key |
| **Serialization** | ✅ Easy to serialize/deserialize | ⚠️ Requires detection logic |
| **Reserved words** | ✅ None - `children` is just a property | ⚠️ `children` is reserved |
| **TypeScript** | ✅ Easy to type | ⚠️ Harder to provide autocomplete |
| **Dynamic tags** | ✅ `{ tag: myVar, ... }` | ⚠️ Requires `{ [myVar]: {...} }` |
| **Multiple elements** | ✅ Can have array of objects | ⚠️ One element per object |
| **Readability** | Familiar to React/vDOM users | Cleaner for static templates |

**Why vDOM is the default:**

1. **Unambiguous parsing** - The presence of `tag` clearly identifies an element. Object DOM requires heuristics to detect (single key that's a valid tag name).

2. **No reserved attribute names** - In vDOM, you can have an attribute literally named `children`. In Object DOM, `children` is reserved for child elements.

3. **Better for data interchange** - vDOM objects can be safely serialized to JSON and parsed back without any special handling. They're self-describing.

4. **Predictable validation** - Easy to check `if (obj.tag)` vs. finding the unknown key and checking if it's a valid tag.

5. **Works without extensions** - vDOM is supported by core `lightview.js`. Object DOM requires `lightview-x.js`.

Object DOM is ideal for **hand-written templates** where brevity matters, or **configuration files** where you want a cleaner syntax. Use vDOM when you need **programmatic generation**, **serialization**, or **maximum compatibility**.

**Nested Example:**

```javascript
// Object DOM - compact and readable
{ div: { 
    class: 'card',
    children: [
      { h2: { children: ['Title'] } },
      { p: { style: 'color: gray', children: ['Description'] } },
      { button: { onclick: handleClick, children: ['Action'] } }
    ]
}}

// Equivalent vDOM
{ tag: 'div', attributes: { class: 'card' }, children: [
    { tag: 'h2', attributes: {}, children: ['Title'] },
    { tag: 'p', attributes: { style: 'color: gray' }, children: ['Description'] },
    { tag: 'button', attributes: { onclick: handleClick }, children: ['Action'] }
]}
```

**Strict Mode:**

When `useObjectDOMSyntax(true)` is called, tag names are validated using the browser's own HTML parser. Unknown tags like `foo` or `notreal` will be rejected, while standard HTML tags and valid custom elements (with hyphens) are accepted.

```javascript
LightviewX.useObjectDOMSyntax(true);  // Enable strict validation

// Valid - browser recognizes these
{ div: { children: ['OK'] } }           // Standard HTML tag
{ 'my-widget': { children: ['OK'] } }   // Custom element (valid in browser)

// Invalid in strict mode (HTMLUnknownElement - won't be detected as Object DOM)
{ notarealtag: { children: ['Nope'] } } // Browser returns HTMLUnknownElement

// You can also check directly:
LightviewX.isKnownHTMLTag('div');        // true
LightviewX.isKnownHTMLTag('my-widget');  // true (custom elements are valid)
LightviewX.isKnownHTMLTag('faketag');    // false (HTMLUnknownElement)
```

### Style 5: Component Functions

The `tag` property (or Object DOM key) can be a **function** instead of a string. This enables reusable components that return HTML, DOM nodes, vDOM, or Object DOM.

```javascript
const { element, signal, tags } = Lightview;
const { div, button } = tags;

// Define a component function
const Card = (props) => ({
    div: {
        class: 'card',
        style: `border: 1px solid ${props.borderColor || '#ccc'}; padding: 16px;`,
        children: [
            { h3: { children: [props.title] } },
            { p: { children: [props.description] } },
            ...(props.children || [])
        ]
    }
});

// Use component with element() - tag is a function
const app = element('div', {}, [
    { tag: Card, attributes: { title: 'Hello', description: 'A card component' } },
    { tag: Card, attributes: { title: 'World', borderColor: 'blue', children: [
        button({ onclick: () => alert('Clicked!') }, 'Click Me')
    ]}}
]);
```

**Component Return Types:**

Components can return any of these formats:

```javascript
// 1. Object DOM (recommended for simplicity)
const Badge = (props) => ({
    span: { class: 'badge', children: [props.text] }
});

// 2. vDOM
const Badge = (props) => ({
    tag: 'span',
    attributes: { class: 'badge' },
    children: [props.text]
});

// 3. HTML string
const Badge = (props) => `<span class="badge">${props.text}</span>`;

// 4. DOM node
const Badge = (props) => {
    const el = document.createElement('span');
    el.className = 'badge';
    el.textContent = props.text;
    return el;
};
```

**Registering Components:**

If you add a component to Ligtvhiew.tags, then you can treate it ligke any other tag. It will even work with Object DOM syntax.

```javascript
// Register individual components
Lightview.tags['Badge'] = Badge;
```

```javascript
const { div, Badge } = tags;
const app = div(
    Badge({ text: 'New' })
);
```

```javascript
// Now use by name in Object DOM syntax
LightviewX.useObjectDOMSyntax();

const app2 = div(
    { Badge: { text: 'New' } }
);
```

**With Global Scope:**

```javascript
// Define component globally
window.Alert = (props) => ({
    div: {
        class: `alert alert-${props.type || 'info'}`,
        children: [props.message]
    }
});

// Enable global lookup
LightviewX.useObjectDOMSyntax();

// Use directly
const app = div(
    { Alert: { type: 'success', message: 'Operation completed!' } }
);
```

## API Reference

### Lightview Class

```javascript
const lv = new Lightview();
```

Creates a Lightview instance with:
- `signal(value)` - Create reactive state
- `computed(fn)` - Create derived state
- `effect(fn)` - Run side effects
- `state(obj)` - Create deep reactive store
- `element(tag, attrs, children)` - Create elements
- `tags` - Proxy for creating elements: `tags.div()`, `tags.button()`, etc.

### Signals

Signals in Lightview are versatile. They can be used as **function calls** or by accessing the `.value` property. This dual API allows for flexible coding styles.

```javascript
const name = signal('John');

// 1. Property Access Style
// Read
console.log(name.value); // 'John'
// Write
name.value = 'Jane';

// 2. Function Call Style
// Read
console.log(name()); // 'Jane'
// Write
name('Bob');
```

You can choose whichever style you prefer or mix them as needed. Both methods are fully reactive and interoperable.

### Working with Objects

Lightview signals are **shallow** by design. This keeps the library extremely small and fast (performant). When working with nested objects, use immutable patterns to update state:

```javascript
const user = signal({ name: "Joe", address: { city: "NYC" } });

// ❌ Don't mutate directly (won't trigger updates)
// user.value.address.city = "LA";

// ✅ Do use immutable patterns
user.value = { 
    ...user.value, 
    address: { ...user.value.address, city: "LA" } 
};
```


### Computed Signals

```javascript
const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // 'John Doe'
firstName.value = 'Jane';
console.log(fullName.value); // 'Jane Doe'
```

### State (Store)

For deeply nested objects or grouped state, use `state()`. It creates a reactive proxy where every property is automatically backed by a signal.

```javascript
/* 
  Creates a deep reactive store.
  Accessing properties (e.g. s.user.name) automatically tracks dependencies.
  Setting properties automatically triggers updates.
*/
const appState = state({
    user: {
        name: 'Alice',
        settings: { theme: 'dark' }
    },
    count: 0
});

// Reading tracks dependencies
effect(() => {
    console.log(`${appState.user.name} likes ${appState.user.settings.theme} mode`);
});

// Writing triggers updates
appState.user.name = 'Bob'; 
appState.user.settings.theme = 'light';
```

Note: `state` objects read/write like normal JavaScript objects (no `.value` needed).

### Reactive Arrays and Dates

**Lightview has a unique feature**: it can make Arrays and Date objects fully reactive, even when using their native methods. This is something most reactive libraries don't support!

#### Reactive Arrays

When you wrap an array in `state()`, Lightview automatically tracks changes to the array's `length` property. This means array mutation methods like `push()`, `pop()`, `splice()`, `shift()`, `unshift()`, etc. will trigger reactive updates:

```javascript
// Style 1: Tagged API
const { state, effect, tags } = new Lightview();
const { div, ul, li, button } = tags;

const items = state(['Apple', 'Banana']);

// This effect automatically re-runs when the array length changes
effect(() => {
    console.log(`Array has ${items.length} items`);
});

// All these methods trigger reactivity!
items.push('Cherry');     // Logs: "Array has 3 items"
items.pop();              // Logs: "Array has 2 items"
items.splice(1, 0, 'Date'); // Logs: "Array has 3 items"

// Use in UI
const app = div(
    () => ul(
        ...items.map(item => li(item))
    ),
    button({ onclick: () => items.push('New Item') }, 'Add Item')
);
```

**Array elements now have full deep reactivity!** Both the array's `length` and individual element properties are tracked:

```javascript
// Style 3: Plain JSON - state works with any API style
const { state, element } = new Lightview();

const items = state([
    { name: 'Item 1', done: false },
    { name: 'Item 2', done: true }
]);

// Using Plain JSON structure with reactive list:
const list = element('div', {}, [
  // Wrap in a function to re-render when items.length changes
  () => ({
    tag: 'ul',
    attributes: {},
    children: items.map(item => ({
      tag: 'li',
      attributes: { class: () => item.done ? 'completed' : '' },
      children: [() => item.name]
    }))
  }),
  {
    tag: 'button',
    attributes: { onclick: () => items.push({ name: `Item ${items.length + 1}`, done: false }) },
    children: ['Add Item']
  },
  {
    tag: 'button',
    attributes: { onclick: () => items[0].done = !items[0].done },
    children: ['Toggle First']
  }
]);

// All of these trigger UI updates:
// items.push({ name: 'Item 3', done: false }); // ✅ Reactive (length changed)
// items[0].done = true;                         // ✅ Reactive (element property changed)
// items[1].name = 'Updated Item';               // ✅ Reactive (nested property changed)
```

#### Reactive Dates

Date objects are notoriously difficult to make reactive in most frameworks because their mutation methods (`setDate()`, `setHours()`, etc.) change internal state without changing the object reference. Lightview solves this by monitoring the `getTime()` value:

```javascript
// Style 2: Element Function
const { state, effect, element } = new Lightview();

const currentDate = state(new Date());

// This effect re-runs whenever the date's timestamp changes
effect(() => {
    console.log(`Current time: ${currentDate.getTime()}`);
});

// All date mutation methods trigger reactivity!
currentDate.setHours(12);           // Triggers update
currentDate.setDate(15);            // Triggers update
currentDate.setFullYear(2025);      // Triggers update

// Use in UI
const clock = element('div', {}, [
    element('p', {}, [() => `Time: ${currentDate.toLocaleTimeString()}`]),
    element('button', { 
        onclick: () => currentDate.setTime(Date.now()) 
    }, ['Update to Now'])
]);
```

**Why this matters**: In most reactive libraries (Vue, Solid, Svelte), you'd need to create a new Date object to trigger updates:

```javascript
// What you'd have to do in Vue/Solid: Although, it will still work in Lightview
myDate.value = new Date(myDate.value.setHours(12)); // ❌ Awkward!

// What you can do in Lightview:
myDate.setHours(12); // ✅ Just works!
```

### Effects


```javascript
const count = signal(0);

effect(() => {
  console.log(`Count is now: ${count.value}`);
});

count.value = 1; // Logs: "Count is now: 1"
```

### Element Structure

Every element has:
- `tag` - HTML tag name or component function
- `attributes` - Object of attributes
- `children` - Array of child elements/text/functions
- `domEl` - The actual DOM node (read-only getter)



## Reactive Features

### Reactive Text

```javascript
// Style 2: Element Function
const { element, signal } = new Lightview();

const name = signal('World');

const app = element('div', {}, [
  element('h1', {}, [() => `Hello, ${name.value}!`]),
  element('button', { onclick: () => name.value = 'Lightview' }, ['Change Name'])
]);
// Click the button to see the greeting update
```

### Reactive Attributes

```javascript
// Style 1: Tagged API
const { tags, signal } = new Lightview();
const { div, button } = tags;

const isActive = signal(false);

const app = div(
  button({
    class: () => isActive.value ? 'active' : 'inactive',
    disabled: () => !isActive.value
  }, 'I am toggled'),
  button({ onclick: () => isActive.value = !isActive.value }, 'Toggle Active')
);
// Click 'Toggle Active' to enable/disable the first button
```

### Reactive Styles

```javascript
// Style 3: Plain JSON
const { element, signal } = new Lightview();

const color = signal('blue');

const box = element('div', {}, [
  {
    tag: 'div',
    attributes: {
      style: () => ({
        backgroundColor: color.value,
        padding: '20px',
        transition: 'background-color 0.3s'
      })
    },
    children: [() => `Color: ${color.value}`]
  },
  {
    tag: 'button',
    attributes: { onclick: () => color.value = 'red' },
    children: ['Red']
  },
  {
    tag: 'button',
    attributes: { onclick: () => color.value = 'green' },
    children: ['Green']
  },
  {
    tag: 'button',
    attributes: { onclick: () => color.value = 'blue' },
    children: ['Blue']
  }
]);
// Click the color buttons to change the box color
```

### Reactive Lists

```javascript
// Style 2: Element Function
const { element, signal } = new Lightview();

const items = signal(['Apple', 'Banana', 'Cherry']);

const list = element('div', {}, [
  () => element('ul', {}, 
    items.value.map(item => 
      element('li', {}, [item])
    )
  ),
  element('button', { 
    onclick: () => items.value = [...items.value, 'New Fruit'] 
  }, ['Add Fruit']),
  element('button', { 
    onclick: () => items.value = items.value.slice(0, -1) 
  }, ['Remove Last'])
]);
// Click buttons to add or remove items from the list
```

## Lifecycle & Cleanup

### Lifecycle Hooks

Lightview provides built-in lifecycle hooks for elements, allowing you to run code when an element enters or leaves the DOM.

```javascript
// Style 2: Element Function
const { element } = new Lightview();

/*
  onmount: Called when the element is added to the DOM.
  onunmount: Called when the element is removed from the DOM.
*/
const timer = element('div', {
    onmount: (el) => {
        console.log('Timer mounted!');
        el._interval = setInterval(() => console.log('Tick'), 1000);
    },
    onunmount: (el) => {
        console.log('Timer removed!');
        clearInterval(el._interval);
    }
}, ['I am a timer']);
```

These hooks are robust and triggered whether you remove elements via Lightview logic or standard DOM methods (like `element.remove()` or `innerHTML = ''`).

### Automatic Cleanup

One of Lightview's most powerful features is its **fully automatic memory management**.

*   **Self-Cleaning Effects**: When an element is removed from the DOM, Lightview automatically stops all reactive effects (signals, computed values) attached to it.
*   **Leak Prevention**: You don't need to manually unsubscribe from signals. The built-in `MutationObserver` watches the document and cleans up dependencies instantly when nodes are detached.

## Complete Examples

### Todo App

```javascript
const lv = new Lightview();
const { signal, tags } = lv;
const { div, h1, input, button, span } = tags;

const state = {
  todos: signal([]),
  input: signal(''),
  filter: signal('all')
};

const addTodo = () => {
  if (state.input.value.trim()) {
    state.todos.value = [...state.todos.value, {
      id: Date.now(),
      text: signal(state.input.value),
      done: signal(false)
    }];
    state.input.value = '';
  }
};

const filteredTodos = lv.computed(() => {
  const todos = state.todos.value;
  const filter = state.filter.value;
  
  if (filter === 'active') return todos.filter(t => !t.done.value);
  if (filter === 'completed') return todos.filter(t => t.done.value);
  return todos;
});

const app = div({ class: 'todo-app' },
  h1('Lightview Todos'),
  
  div({ class: 'input-row' },
    input({
      placeholder: 'What needs to be done?',
      value: () => state.input.value,
      oninput: (e) => state.input.value = e.target.value,
      onkeypress: (e) => { if (e.key === 'Enter') addTodo(); }
    }),
    button({ onclick: addTodo }, 'Add')
  ),
  
  div({ class: 'filters' },
    button({
      class: () => state.filter.value === 'all' ? 'active' : '',
      onclick: () => state.filter.value = 'all'
    }, 'All'),
    button({
      class: () => state.filter.value === 'active' ? 'active' : '',
      onclick: () => state.filter.value = 'active'
    }, 'Active'),
    button({
      class: () => state.filter.value === 'completed' ? 'active' : '',
      onclick: () => state.filter.value = 'completed'
    }, 'Completed')
  ),
  
  () => div({ class: 'todo-list' },
    ...filteredTodos.value.map(todo =>
      div({ class: 'todo-item' },
        input({
          type: 'checkbox',
          checked: () => todo.done.value,
          onchange: () => todo.done.value = !todo.done.value
        }),
        span({
          class: () => todo.done.value ? 'completed' : '',
          ondblclick: () => {
            const newText = prompt('Edit:', todo.text.value);
            if (newText !== null) todo.text.value = newText;
          }
        }, () => todo.text.value),
        button({
          class: 'delete',
          onclick: () => {
            state.todos.value = state.todos.value.filter(t => t.id !== todo.id);
          }
        }, '×')
      )
    )
  )
);

document.body.appendChild(app.domEl);
```

### Form with Validation

```javascript
const lv = new Lightview();
const { signal, computed, tags } = lv;
const { form, div, label, input, span, button } = tags;

const email = signal('');
const password = signal('');

const isValidEmail = computed(() => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
);

const isValidPassword = computed(() => 
  password.value.length >= 8
);

const canSubmit = computed(() => 
  isValidEmail.value && isValidPassword.value
);

const formEl = form({ 
  onsubmit: (e) => {
    e.preventDefault();
    if (canSubmit.value) { // or canSubmit()
      alert('Form submitted!');
    }
  }
},
  div(
    label('Email:'),
    input({
      type: 'email',
      value: () => email.value,
      oninput: (e) => email.value = e.target.value,
      class: () => email.value && !isValidEmail.value ? 'invalid' : ''
    }),
    () => email.value && !isValidEmail.value 
      ? span({ class: 'error' }, 'Invalid email')
      : span()
  ),
  
  div(
    label('Password:'),
    input({
      type: 'password',
      value: () => password.value,
      oninput: (e) => password.value = e.target.value,
      class: () => password.value && !isValidPassword.value ? 'invalid' : ''
    }),
    () => password.value && !isValidPassword.value
      ? span({ class: 'error' }, 'Must be 8+ characters')
      : span()
  ),
  
  button({
    type: 'submit',
    disabled: () => !canSubmit.value
  }, 'Submit')
);

document.body.appendChild(formEl.domEl);
```

### Dynamic Chart

```javascript
const lv = new Lightview();
const { signal, tags } = lv;
const { div, button } = tags;

const data = signal([10, 20, 15, 30, 25]);

const addDataPoint = () => {
  data.value = [...data.value, Math.floor(Math.random() * 50)];
};

const chart = div({ class: 'chart' },
  button({ onclick: addDataPoint }, 'Add Data Point'),
  
  () => div({ class: 'bars' },
    ...data.value.map((value, i) =>
      div({
        class: 'bar',
        style: () => ({
          height: `${value * 3}px`,
          width: '40px',
          backgroundColor: `hsl(${i * 40}, 70%, 50%)`,
          display: 'inline-block',
          margin: '0 2px',
          transition: 'height 0.3s'
        })
      }, value.toString())
    )
  )
);

document.body.appendChild(chart.domEl);
```

## Hypermedia

Lightview enhances the use of 'href' and 'src' across any element.

## Smart `src` Attribute

Lightview enhances the `src` attribute with smart loading capabilities. You can use it to inject content from external files or other parts of the DOM.

### 1. Fetching Content (HTML/JSON)
If `src` is a file path, Lightview fetches it:

```javascript
// Style 2: Element Function
const { element } = new Lightview();

// Fetches header.html and parses it into reactive elements
element('div', { src: '/components/header.html' }, [])

// Fetches data.json and converts it to elements
element('div', { src: '/api/data.json' }, [])
```

### 2. DOM Cloning
If `src` is a CSS selector, Lightview clones the targeted DOM elements:

```javascript
// Style 3: Plain JSON
const { element } = new Lightview();

// Clones the element with id="template-sidebar"
element('div', {}, [
  {
    tag: 'div',
    attributes: { src: '#template-sidebar' },
    children: []
  }
])
```

This is useful for using hidden templates or duplicating content.

### 3. Interactive `href` Attribute
On elements (like `div`, `button`, etc.), a non-standard `href` attribute acts as a click trigger for the `src` behavior. When the element is clicked, its `src` attribute is set to the value of its `href`, triggering the content loading or cloning.

```javascript
// Style 1: Tagged API
const { tags } = new Lightview();
const { div, button } = tags;

// On click, this div will load 'content.html' into itself
div({ href: 'content.html' }, 'Click to load content')

// On click, this button will clone #modal-template into itself
div({ href: '#modal-template' }, 'Open Modal')
```

## HTML Template Literals

Lightview-X supports reactive template literals in external HTML and JSON files. This allows you to create reusable templates that automatically bind to your global signals and state objects using standard JavaScript template literal syntax.

**Note:** This feature requires `lightview-x.js` and uses named signals/state registered globally.

### Template Literals in HTML Files

Create HTML templates with `${...}` expressions that reference named signals:

**template.html:**
```html
<div class="card">
    <h3>Welcome, User!</h3>
    <p>Your status: <strong>${signal.get('userStatus').value}</strong></p>
    <p>Messages: <span>${signal.get('messageCount').value}</span></p>
    <p>Last updated: ${new Date().toLocaleTimeString()}</p>
</div>
```

**main.js:**
```javascript
const { signal, tags } = Lightview;
const { section, button } = tags;

// Register named signals that the template will reference
const userStatus = signal('Online', 'userStatus');
const messageCount = signal(5, 'messageCount');

// Load and render the template
const app = section({ src: './template.html' });

// Update signals - reload template to see changes
userStatus.value = 'Away';
messageCount.value++;
```

### Template Literals in JSON Files

JSON templates use the same `${...}` syntax within string values to access registered state, provide defaults, or do calculations and conditional logic. You can load these with the 'src' attribute on any element.

#### Supported JSON Formats

JSON files loaded via `src` support both **vDOM** and **Object DOM** formats:

| Format | Structure | Requirement |
|--------|-----------|-------------|
| **vDOM** | `{ "tag": "div", "attributes": {...}, "children": [...] }` | Works by default |
| **Object DOM** | `{ "div": { "class": "foo", "children": [...] } }` | Requires `LightviewX.useObjectDOMSyntax()` |

#### vDOM Format (Default)

**template.json:**
```json
[
    {
        "tag": "div",
        "attributes": { "class": "card" },
        "children": [
            {
                "tag": "h3",
                "children": ["Product: ${state.get('product',{name:'Widget One',price:0,inStock:3}).name}"]
            },
            {
                "tag": "p",
                "children": ["Price: $${state.get('product').price}"]
            },
            {
                "tag": "p",
                "children": ["In Stock: ${state.get('product').inStock ? 'Yes ✅' : 'No ❌'}"]
            }
        ]
    }
]
```

#### Object DOM Format

To use the more compact Object DOM format in JSON files, enable it before loading:

**template-objectdom.json:**
```json
[
    {
        "div": {
            "class": "card",
            "children": [
                { "h3": { "children": ["Product: ${state.get('product').name}"] } },
                { "p": { "children": ["Price: $${state.get('product').price}"] } },
                { "p": { "children": ["In Stock: ${state.get('product').inStock ? 'Yes ✅' : 'No ❌'}"] } }
            ]
        }
    }
]
```

**main.js:**
```javascript
// Enable Object DOM syntax BEFORE loading JSON templates
LightviewX.useObjectDOMSyntax();

const { state, tags } = Lightview;
const { section } = tags;

const product = state({ name: 'Widget', price: 29.99, inStock: true }, 'product');

// Now JSON files can use Object DOM format
const app = section({ src: './template-objectdom.json' });
```

**main.js:**
```javascript
const { state, tags } = Lightview;
const { section, button } = tags;

// Register named state that the template will reference
const product = state({ 
    name: 'Lightview Widget', 
    price: 29.99, 
    inStock: true 
}, 'product');

// Load and render the JSON template
const app = section({ src: './template.json' });

// Update state values
product.name = 'Super Widget';
product.price = 39.99;
```

### Reloading Templates

To see updated values after changing signals/state, reload the template by re-setting the `src` attribute:

```javascript
const { signal, state, tags } = Lightview;
const { section, button, div } = tags;

// Named signal and state
const counter = signal(0, 'counter');
const user = state({ name: 'Alice' }, 'user');

const app = div(
    section({ src: './dashboard.html', id: 'dashboard' }),
    
    button({ onclick: () => counter.value++ }, 'Increment'),
    button({ onclick: () => user.name = 'Bob' }, 'Change User'),
    
    button({ onclick: () => {
        // Reload template to reflect updated values
        const container = document.getElementById('dashboard');
        const el = Lightview.internals.domToElement.get(container);
        if (el) {
            el.attributes = { ...el.attributes, src: './dashboard.html?' + Date.now() };
        }
    }}, 'Reload Template')
);
```

### Why Use Template Literals?

- **Separation of Concerns**: Keep HTML structure in `.html` files, logic in `.js` files
- **Reusable Templates**: Share templates across different parts of your application
- **Server-Side Templates**: Generate templates on the server with dynamic `${...}` expressions
- **CMS Integration**: Non-developers can edit HTML templates without touching JavaScript

## Enhancing Existing DOM Elements

Lightview-X provides the `enhance()` function to add reactivity to existing DOM elements. This is useful for progressive enhancement - adding interactivity to server-rendered HTML or gradually migrating a codebase without rebuilding the entire page.

**Note:** This feature requires `lightview-x.js`.

### Basic Usage

```html
<!-- Existing HTML (server-rendered, static HTML, etc.) -->
<button id="counter-btn" class="btn">Clicked 0 times</button>
<div id="status-display">Status: Unknown</div>
```

```javascript
const { signal, state } = Lightview;

// Get or create a named signal with default value
const counter = signal.get('counter', 0);

// Enhance the button with reactivity
LightviewX.enhance('#counter-btn', {
    innerText: () => `Clicked ${counter.value} times`,
    onclick: () => counter.value++
});

// Enhance with innerHTML for richer content
LightviewX.enhance('#status-display', {
    innerHTML: () => `Status: <strong>${counter.value > 5 ? 'Active' : 'Idle'}</strong>`
});
```

### API

```javascript
LightviewX.enhance(selectorOrNode, options)
```

**Parameters:**
- `selectorOrNode` - CSS selector string or DOM element
- `options` - Object containing:
  - `innerText` - Static string or reactive function for text content
  - `innerHTML` - Static string or reactive function for HTML content
  - `on*` - Event handlers (`onclick`, `oninput`, etc.)
  - Any other attribute (reactive functions supported)

**Returns:** Lightview reactive element wrapper, or `null` if element not found.

### signal.get() and state.get() with Defaults

When using `enhance()`, you often need to access or create global state. The `.get()` method now supports a default value that creates and registers the signal/state if it doesn't exist:

```javascript
// If 'counter' doesn't exist, creates signal(0) and registers it as 'counter'
const counter = signal.get('counter', 0);

// If 'user' doesn't exist, creates state({name: 'Guest'}) and registers it as 'user'
const user = state.get('user', { name: 'Guest' });

// Without default - returns undefined if not registered
const maybeCounter = signal.get('counter');
```

This pattern is similar to `getOrCreate` - the default value is only used if the signal/state hasn't been registered yet.

### Complete Example

```html
<!DOCTYPE html>
<html>
<body>
    <!-- Server-rendered content -->
    <div class="card">
        <h2 id="greeting">Hello, Guest!</h2>
        <p id="click-count">Clicks: 0</p>
        <button id="increment">Click Me</button>
        <button id="change-name">Change Name</button>
    </div>

    <script src="lightview.js"></script>
    <script src="lightview-x.js"></script>
    <script>
        const { signal, state } = Lightview;
        
        // Create or get global state with defaults
        const clicks = signal.get('clicks', 0);
        const user = state.get('user', { name: 'Guest' });
        
        // Enhance existing elements
        LightviewX.enhance('#greeting', {
            innerText: () => `Hello, ${user.name}!`
        });
        
        LightviewX.enhance('#click-count', {
            innerText: () => `Clicks: ${clicks.value}`
        });
        
        LightviewX.enhance('#increment', {
            onclick: () => clicks.value++
        });
        
        LightviewX.enhance('#change-name', {
            onclick: () => {
                user.name = user.name === 'Guest' ? 'Alice' : 'Guest';
            }
        });
    </script>
</body>
</html>
```

### When to Use enhance()

- **Progressive Enhancement**: Add interactivity to static HTML
- **Server-Side Rendering**: Hydrate server-rendered content
- **Legacy Integration**: Add reactivity to existing applications
- **CMS Content**: Enhance content from a CMS without rebuilding
- **Third-Party Widgets**: Add reactive behavior to elements you don't control

### enhance() vs element()

| Use Case | Use `enhance()` | Use `element()` |
|----------|-----------------|------------------|
| Existing HTML | ✅ | ❌ |
| Build from scratch | ❌ | ✅ |
| Server-rendered | ✅ | ❌ |
| Full control over structure | ❌ | ✅ |
| Progressive enhancement | ✅ | ❌ |


## Framework Comparison

Lightview offers a unique combination of features that sets it apart from other reactive libraries. Here's how it compares:

###  Features

| Feature | Lightview | Vue 3 | SolidJS | Svelte | Bau.js | Juris.js |
|---------|-----------|-------|---------|--------|--------|----------|
| **Bundle Size** | ~6.5KB | ~33KB | ~7KB | ~2KB* | ~2KB | ~50KB |
| **Reactivity Model** | Signals/Proxy | Proxy | Signals | Compiler | Proxy | Intentional |
| **No Build Required** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **No JSX/Templates** | ✅ | ❌ (SFC) | ❌ (JSX) | ❌ (Templates) | ✅ | ✅ |
| **Tagged API** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Plain Objects** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Hypermedia** *| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HTML Template Literals** *| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Svelte size is after compilation. However, substantive Svelete apps are often larger than those created with other libraries due to the lack of rutime abstractions after compilation/transpilation.

*Lighview Hypermedia and HTML Template Literals require lightview-x, an additional 5K.

### Reactive Capabilities

| Feature | Lightview | Vue 3 | SolidJS | Svelte | Bau.js | Juris.js |
|---------|-----------|-------|---------|--------|--------|----------|
| **Array Mutations** | ✅ Auto | ✅ Auto | ❌ Manual** | ✅ Auto | ✅ Auto | ❌ Manual |
| **Array Element Mutations** | ✅ **Auto** | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Date Mutations** | ✅ **Auto** | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Deep Reactivity** | ✅ | ✅ | ✅*** | ✅ | ✅ | ✅ |
| **Computed Values** | ✅ | ✅ | ✅ | ✅ | ✅ (derive) | ✅ |
| **Ehancing Existing HTML** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Fine-grained Updates** | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Auto Cleanup** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**SolidJS supports array mutations with `createStore`, but not with `createSignal`  
***SolidJS requires `createStore` for deep reactivity

### Developer Experience

| Feature | Lightview | Vue 3 | SolidJS | Svelte | Bau.js | Juris.js |
|---------|-----------|-------|---------|--------|--------|----------|
| **Learning Curve** | Low | Medium | Medium | Low | Low | Medium |
| **TypeScript** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **DevTools** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Lifecycle Hooks** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Progressive Enhancement** | ✅ (src/href) | ❌ | ❌ | ❌ | ❌ | ✅ (enhance) |
| **Multiple Instances** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

### Unique Features

**Lightview's Standout Features:**
- 🎯 **Reactive Date Objects** - Only library with automatic Date mutation tracking
- 📊 **Reactive Array Elements** - Full deep reactivity for array elements (rare feature!)
- 🏷️ **Tagged API** - Bau.js-inspired concise syntax (`tags.div()`)
- 🔗 **Smart src/href** - Load HTML/JSON or clone DOM elements declaratively
- 📝 **HTML Template Literals** - Use `${signal.get('name').value}` in external HTML/JSON files
- 🔧 **Progressive Enhancement** - Enhance existing DOM with `enhance()` for server-rendered content
- 🧩 **Component Functions** - Use functions as tags, with registry and global scope support
- 🧹 **Automatic Cleanup** - MutationObserver-based memory management
- 📦 **Zero Dependencies** - Pure JavaScript, no build tools needed
- 🎨 **Five API Styles** - Tagged, Element function, vDOM JSON, Object DOM JSON, Component functions

**When to Choose Lightview:**
- ✅ You want minimal bundle size with maximum features
- ✅ You need reactive Date objects (calendars, timers, scheduling apps)
- ✅ You prefer no build step and pure JavaScript
- ✅ You like the simplicity of Bau.js but want more power
- ✅ You're building hypermedia-driven applications

**When to Choose Alternatives:**
- Vue 3: Large ecosystem, TypeScript, mature tooling
- SolidJS: Maximum performance, fine-grained reactivity
- Svelte: Best DX, compiler optimizations
- Bau.js: Even simpler API, minimal features
- Juris.js: Object-first architecture, intentional reactivity

## Browser Support


Modern browsers with Proxy support (ES6+):
- Chrome 49+
- Firefox 18+
- Safari 10+
- Edge 12+

## License

MIT