# Metrics Report

## Executive Summary

| File | Functions | Maintainability (min/avg/max) | Cognitive (min/avg/max) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `lightview.js` | 58 | 7.2 / 65.5 / 92.9 | 0 / 3.4 / 25 | ⚖️ Good |
| `lightview-x.js` | 104 | 0.0 / 66.7 / 93.5 | 0 / 3.2 / 23 | ⚖️ Good |
| `lightview-router.js` | 27 | 24.8 / 68.6 / 93.5 | 0 / 2.1 / 19 | ⚖️ Good |
| `react.development.js` | 109 | 0.0 / 65.2 / 91.5 | 0 / 2.2 / 33 | ⚖️ Good |
| `bau.js` | 79 | 11.2 / 71.3 / 92.9 | 0 / 1.5 / 20 | ⚖️ Good |
| `htmx.js` | 335 | 0.0 / 65.3 / 92.9 | 0 / 3.4 / 116 | ⚖️ Good |
| `juris.js` | 360 | 21.2 / 70.1 / 96.5 | 0 / 2.6 / 51 | ⚖️ Good |


Generated on: 12/30/2025, 7:44:35 AM

## Detail: lightview.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 599 |
| **Function Count** | 58 |
| **Avg Maintainability** | **65.52/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `processChildren` | 25 | 19 | 35.1 | ⚠️ High |
| `makeReactiveAttributes` | 19 | 12 | 38.8 | ⚠️ High |
| `processComponentResult` | 17 | 15 | 42.0 | ⚠️ High |
| `enhance` | 13 | 10 | 44.6 | ✅ Clean |
| `value` | 11 | 11 | 44.2 | ✅ Clean |
| `processShadowDOM` | 10 | 10 | 43.5 | ✅ Clean |
| `signal` | 9 | 7 | 40.9 | ✅ Clean |
| `<anonymous>` | 9 | 9 | 59.0 | ✅ Clean |
| `<anonymous>` | 9 | 9 | 49.2 | ✅ Clean |
| `<anonymous>` | 9 | 6 | 7.2 | ✅ Clean |

---

## Detail: lightview-x.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 1012 |
| **Function Count** | 104 |
| **Avg Maintainability** | **66.70/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `<anonymous>` | 23 | 20 | 0.0 | ⚠️ High |
| `state` | 22 | 25 | 39.6 | ⚠️ High |
| `handleNonStandardHref` | 16 | 12 | 36.5 | ⚠️ High |
| `registerStyleSheet` | 14 | 8 | 46.5 | ✅ Clean |
| `removeInsertedContent` | 14 | 7 | 45.5 | ✅ Clean |
| `convertObjectDOM` | 13 | 12 | 54.0 | ✅ Clean |
| `<anonymous>` | 13 | 9 | 55.7 | ✅ Clean |
| `activateReactiveSyntax` | 13 | 10 | 36.9 | ✅ Clean |
| `<anonymous>` | 12 | 12 | 44.9 | ✅ Clean |
| `handleSrcAttribute` | 10 | 9 | 47.1 | ✅ Clean |

---

## Detail: lightview-router.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 141 |
| **Function Count** | 27 |
| **Avg Maintainability** | **68.59/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `route` | 19 | 10 | 51.6 | ⚠️ High |
| `normalizePath` | 7 | 8 | 63.1 | ✅ Clean |
| `<anonymous>` | 5 | 6 | 50.2 | ✅ Clean |
| `handleRequest` | 5 | 6 | 52.6 | ✅ Clean |
| `fetchHandler` | 4 | 4 | 64.3 | ✅ Clean |
| `<anonymous>` | 4 | 4 | 24.8 | ✅ Clean |
| `base` | 2 | 3 | 65.1 | ✅ Clean |
| `<anonymous>` | 2 | 4 | 84.4 | ✅ Clean |
| `use` | 2 | 3 | 63.6 | ✅ Clean |
| `<anonymous>` | 2 | 4 | 64.7 | ✅ Clean |

---

## Detail: react.development.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 1282 |
| **Function Count** | 109 |
| **Avg Maintainability** | **65.19/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `mapIntoArray` | 33 | 39 | 23.6 | 🛑 Critical |
| `getComponentNameFromType` | 20 | 31 | 34.7 | ⚠️ High |
| `flushActQueue` | 19 | 7 | 47.0 | ⚠️ High |
| `<anonymous>` | 19 | 26 | 35.6 | ⚠️ High |
| `<anonymous>` | 18 | 20 | 35.9 | ⚠️ High |
| `lazyInitializer` | 9 | 9 | 37.7 | ✅ Clean |
| `recursivelyFlushAsyncActWork` | 9 | 5 | 51.3 | ✅ Clean |
| `<anonymous>` | 8 | 9 | 48.2 | ✅ Clean |
| `<anonymous>` | 7 | 10 | 29.6 | ✅ Clean |
| `<anonymous>` | 7 | 10 | 0.0 | ✅ Clean |

---

## Detail: bau.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 458 |
| **Function Count** | 79 |
| **Avg Maintainability** | **71.26/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `<anonymous>` | 20 | 17 | 34.0 | ⚠️ High |
| `updateBinding` | 17 | 11 | 40.0 | ⚠️ High |
| `replaceChildren` | 14 | 8 | 48.2 | ✅ Clean |
| `add` | 9 | 7 | 53.3 | ✅ Clean |
| `toDom` | 6 | 5 | 56.8 | ✅ Clean |
| `get` | 5 | 6 | 49.4 | ✅ Clean |
| `processDom` | 4 | 4 | 51.1 | ✅ Clean |
| `val` | 4 | 5 | 58.1 | ✅ Clean |
| `val` | 4 | 4 | 55.4 | ✅ Clean |
| `<anonymous>` | 3 | 6 | 49.7 | ✅ Clean |

---

## Detail: htmx.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 4803 |
| **Function Count** | 335 |
| **Avg Maintainability** | **65.27/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `issueAjaxRequest` | 116 | 73 | 5.5 | 🛑 Critical |
| `parseAndCacheTrigger` | 68 | 34 | 28.0 | 🛑 Critical |
| `doSwap` | 41 | 24 | 26.8 | 🛑 Critical |
| `eventListener` | 39 | 22 | 33.2 | 🛑 Critical |
| `handleAjaxResponse` | 34 | 29 | 22.9 | 🛑 Critical |
| `querySelectorAllExt` | 33 | 26 | 31.9 | 🛑 Critical |
| `swapWithStyle` | 29 | 16 | 38.3 | 🛑 Critical |
| `updateScrollState` | 27 | 23 | 39.3 | 🛑 Critical |
| `maybeGenerateConditional` | 26 | 9 | 42.0 | 🛑 Critical |
| `getSwapSpecification` | 25 | 19 | 36.1 | ⚠️ High |

---

## Detail: juris.js

| Metric | Overall Value |
| :--- | :--- |
| **SLOC** | 2736 |
| **Function Count** | 360 |
| **Avg Maintainability** | **70.11/100** |

### Top 10 High Friction Functions
| Function | Cognitive | Cyclomatic | MI | Status |
| :--- | :--- | :--- | :--- | :--- |
| `<anonymous>` | 51 | 28 | 21.2 | 🛑 Critical |
| `<anonymous>` | 37 | 33 | 26.4 | 🛑 Critical |
| `<anonymous>` | 36 | 28 | 31.2 | 🛑 Critical |
| `<anonymous>` | 24 | 14 | 43.2 | ⚠️ High |
| `<anonymous>` | 24 | 26 | 28.7 | ⚠️ High |
| `<anonymous>` | 22 | 12 | 44.1 | ⚠️ High |
| `<anonymous>` | 20 | 8 | 49.5 | ⚠️ High |
| `updateChildren` | 19 | 11 | 37.4 | ⚠️ High |
| `<anonymous>` | 18 | 23 | 38.6 | ⚠️ High |
| `<anonymous>` | 17 | 9 | 46.3 | ⚠️ High |

---

