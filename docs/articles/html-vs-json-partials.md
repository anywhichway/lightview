# The HTML Partial Trap: Why HTMX is Only Half the Story

## Introduction: The Hypermedia Renaissance

We are living in the middle of a hypermedia renaissance. Frameworks like HTMX have correctly identified that the "Single Page Application" (SPA) model often introduced unnecessary complexity, pushing developers to manage state in two places and build expensive APIs for what should be simple UI updates.

The core premise of HTMX is brilliant: **Hypermedia as the Engine of Application State (HATEOAS)**. By returning HTML fragments (partials) from the server instead of raw data, we keep the logic where it belongs—on the server—and keep the client thin and declarative.

But in its quest for hypermedia purity, HTMX has made a dogmatic choice that might be holding the movement back: **The insistence that the wire format *must* be HTML.**

It’s time to talk about why JSON partials aren't just an alternative—they are the future of the hypermedia-driven web.

## The Performance Myth: Is HTML Actually Faster?

One of the most common arguments for HTML partials is that the browser "knows how to parse HTML." The assumption is that taking an HTML string and throwing it into `innerHTML` is the fastest way to update the DOM.

But the data tells a different story.

In recent benchmarks comparing 100-row and 1000-row table renders, we looked at several ways to update the DOM. We compared standard HTML methods (`innerHTML`, `DOMParser`) against JSON-based methods using **vDOM** (Virtual DOM) and **oDOM** (Object DOM) formats. Both [vDOM](https://lightview.dev/docs/api/elements#vdom) and [oDOM](https://lightview.dev/docs/api/elements#object-dom) are lightweight JSON representations of the DOM that allow for structured UI definitions.

### 100 Rows (10 Cycles) - Chrome Latest
| Method | Raw Size | Gzip Size | Avg (ms) | Min (ms) | Max (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **innerHTML** | 27.24 KB | 1.08 KB | 1.38 | 0.70 | 2.30 |
| **DOMParser** | 27.24 KB | 1.08 KB | 1.42 | 1.00 | 2.30 |
| **Raw vDOM (JSON)** | 46.66 KB | 1.17 KB | 1.64 | 1.30 | 2.50 |
| **Raw oDOM (JSON)** | 30.67 KB | 1.08 KB | 1.53 | 0.90 | 2.30 |
| **Lightview vDOM** | 46.66 KB | 1.17 KB | 3.08 | 1.80 | 4.90 |

### 1000 Rows (10 Cycles) - Chrome Latest
| Method | Raw Size | Gzip Size | Avg (ms) | Min (ms) | Max (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **innerHTML** | 274.21 KB | 9.17 KB | 11.23 | 7.80 | 14.80 |
| **DOMParser** | 274.21 KB | 9.17 KB | 8.15 | 6.60 | 11.50 |
| **Raw vDOM (JSON)** | 467.66 KB | 9.05 KB | 11.55 | 9.20 | 15.70 |
| **Raw oDOM (JSON)** | 308.41 KB | 9.18 KB | 9.96 | 8.80 | 11.30 |
| **Lightview vDOM** | 467.66 KB | 9.05 KB | 17.37 | 14.00 | 29.10 |

*Data source: [Lightview DOM Benchmarks](https://lightview.dev/docs/dom-benchmark.html) (Chrome Latest)*

From a user experience perspective, even for Lightview, the difference will be imperceptible. Most monitors refresh at 60Hz, meaning a frame lasts **~16.6ms**. For typical partials (the 100-row case), every single method—including Lightview—completes in less than 3.5ms, which is roughly **1/5th of a single frame**. Even at 1000 rows, on average every method completes within or very near the one-frame threshold. The perceived behavior remains smooth and responsive, far outclassing the "jank" often associated with full page reloads.

While more complex implementations like **Lightview vDOM** add overhead (taking ~3.1ms for 100 rows and ~17.4ms for 1000 rows), this overhead buys you the immense power of **offline-mode**. Instead of just swapping a partial, the framework can reactively track exactly which nodes need to update when data changes without roundtrips to the server.

Parsing a structured JSON object and using `createElement` can be just as efficient as asking the browser to tokenize and parse a flat HTML string.

## Network Bandwidth: The Gzip Equalizer

There is a common claim that JSON is inherently smaller than HTML. Theoretically, it could be 20% to 25% smaller. However, when we look at standard UI components using common tags like `div`, `p`, `span`, `table`, `td`, `tr`, and headers, e.g. `h1`, `h2`, etc., the reality is more nuanced.

JSON requires quoting every property and string value (e.g., `{"td":"value"}` vs `<td>value</td>`). In many cases, this quoting overhead makes **raw JSON larger than raw HTML**. In our benchmark, the raw oDOM (Object DOM) was ~308 KB compared to HTML's ~274 KB.

However, **Gzip is the great equalizer**. Because JSON has a very regular, repetitive structure, it compresses exceptionally well. In our 1000-row test, the Gzip sizes were almost identical:
- **HTML Gzip**: 9.17 KB
- **JSON (oDOM) Gzip**: 9.18 KB
- **JSON (vDOM) Gzip**: 9.05 KB

Bandwidth would rarely be a primary determining factor between the two formats unless browsers were to natively support a more compact, unquoted JSON format. While it is possible to transmit unquoted JSON and `eval` it on the client, this introduces significant security vulnerabilities. Furthermore, a custom JavaScript parser for unquoted JSON is unlikely to ever match the performance of a browser's native, highly-optimized `JSON.parse`.

Ultimately, the choice between HTML and JSON shouldn't be based on a few bytes of bandwidth, but on factors like flexibility, security, and developer experience.

## The Flexibility Factor: Beyond the Browser

This is where the HTML-only approach truly shows its limits. HTML is a document format designed for browsers. If your server returns HTML partials, you are effectively tethering your backend to a specific rendering engine.

JSON, however, can serve as a **Universal DOM Representation**. When a server returns a UI partial as JSON (a vDOM or oDOM structure), it isn't just "data"—it's a platform-agnostic description of an interface that the client can choose to render how it wishes.

This flexibility allows for:
1.  **Cross-Platform Targeting**: A single JSON partial from the server can be rendered as HTML in a browser, but it can just as easily be mapped to native iOS (SwiftUI) or Android (Jetpack Compose) components. 
2.  **Native Performance**: By sending a description instead of a document, native apps can use their own optimized layout engines rather than forcing content into a resource-heavy WebView.

We are seeing this trend emerge with technologies like Google's **A2UI**, which uses JSON to bridge the gap between platforms. **Lightview** is also built on this principle, treating JSON partials as the "source of truth" for the UI, whether it eventually ends up in the standard DOM, the Shadow DOM, or a native mobile view.

By choosing JSON over HTML for your partials, you aren't sacrificing hypermedia; you're gaining **platform independence**.

## Security and the AI Frontier

The rise of AI-generated user interfaces (GenUI) adds another layer to this debate. Letting an LLM generate raw HTML or—worse—JavaScript is a security risk. 

JSON partials allow for a "sandboxed" UI. In Lightview, we use **[cDOM (Computational DOM)](https://lightview.dev/docs/cdom.html)** and **[JPRX (JSON Path Reactive eXpressions)](https://lightview.dev/docs/cdom#JPRX)**. This allows the server to send a JSON-like structure that defines both the layout and the reactive logic (like "if this happens, update that") without ever executing arbitrary `eval()` or `<script>` tags.

It is "Logic-in-JSON"- a safe, declarative way to build dynamic interfaces that even an AI can generate without opening a backdoor into your application.

## A Challenge to HTMX

HTMX has done wonders for the web development community. It has simplified our lives and reminded us of the power of the web's original architecture. 

But it shouldn't stop at HTML. 

Imagine an enhancement to HTMX that supports JSON partials. By allowing the client to receive structured UI definitions, HTMX could pave the way for safer, more dynamic, and cross-platform hypermedia applications. It would bridge the gap between the simplicity of HATEOAS and the power of dynamic safe AI generated interfaces even it it forwent the reactivity and offline mode.

## Not All-or-Nothing

To be clear: we aren't suggesting that you send your entire website as a giant JSON blob. Initial page loads should still be semantic HTML—that's what browsers and SEO crawlers want. 

But for **dynamic partials** - the updates, the modals, the infinite scrolls, and the live dashboards—the "wire" should be JSON. It’s as fast as HTML, more flexible, and safer.

Hypermedia is the right architecture. JSON is just the better engine.

---

*To see the raw performance data for yourself, check out the [DOM Benchmark tester](https://lightview.dev/docs/dom-benchmark.html).*
