# Proposed Solution: Router-Based Source Path Tracking

## Problem
HTML fragments loaded via `src` attribute contain relative URLs (like `./index.css`) that resolve incorrectly when loaded into pages at different paths.

## Why `<base>` Tag Won't Work
1. `<base>` affects the ENTIRE document, breaking all relative URLs on the main page
2. DOMParser creates isolated documents that don't inherit the main document's `<base>` tag
3. Can't dynamically change `<base>` for each fragment without breaking existing content

## Proposed Solutions (Best to Least Preferred)

### **Option 1: Store Source URL as Data Attribute** ✅ RECOMMENDED

Modify `lightview-x.js` to store the source URL on the element, then use it to rewrite relative URLs.

**Change in `handleSrcAttribute` (lightview-x.js)**:
```javascript
// After fetching the URL successfully
if (res.ok) {
    // Store the source URL for relative path resolution
    el.domEl.setAttribute('data-src-base', url.href.substring(0, url.href.lastIndexOf('/') + 1));
    
    const ext = url.pathname.split('.').pop().toLowerCase();
    // ... rest of existing code
}

// Later when parsing HTML:
} else if (isHtml) {
    const shouldEscape = el.domEl.getAttribute('escape') === 'true';
    if (shouldEscape) {
        elements = [content];
    } else {
        const parser = new DOMParser();
        const contentWithoutHead = content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
        const doc = parser.parseFromString(contentWithoutHead, 'text/html');

        // Get the source base URL stored earlier
        const sourceBase = el.domEl.getAttribute('data-src-base') || new URL(src, document.baseURI).href.substring(0, new URL(src, document.baseURI).href.lastIndexOf('/') + 1);
        
        // Rewrite relative URLs to be absolute/source-relative
        rewriteRelativeUrls(doc, sourceBase);
        
        const allNodes = [...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)];
        elements = domToElements(allNodes, element);
    }
}

// Helper function to rewrite relative URLs
function rewriteRelativeUrls(doc, sourceBase) {
    const isRelative = (url) => url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#');
    
    // Rewrite link href (stylesheets)
    doc.querySelectorAll('link[href]').forEach(el => {
        const href = el.getAttribute('href');
        if (isRelative(href)) {
            el.setAttribute('href', new URL(href, sourceBase).href);
        }
    });
    
    // Rewrite script src
    doc.querySelectorAll('script[src]').forEach(el => {
        const src = el.getAttribute('src');
        if (isRelative(src)) {
            el.setAttribute('src', new URL(src, sourceBase).href);
        }
    });
    
    // Rewrite img src
    doc.querySelectorAll('img[src]').forEach(el => {
        const src = el.getAttribute('src');
        if (isRelative(src)) {
            el.setAttribute('src', new URL(src, sourceBase).href);
        }
    });
    
    // Rewrite custom href attributes
    doc.querySelectorAll('[href]:not(link):not(a):not(area):not(base)').forEach(el => {
        const href = el.getAttribute('href');
        if (isRelative(href)) {
            el.setAttribute('href', new URL(href, sourceBase).href);
        }
    });
}
```

**Benefits**:
- ✅ No `<base>` tag conflicts
- ✅ Works with deployment to subdirectories
- ✅ Self-contained in lightview-x.js
- ✅ No router changes needed
- ✅ URLs become absolute (full URLs work anywhere)

---

### **Option 2: Router Middleware to Set Context**

Create middleware that tracks loaded content and sets base context.

**New file: `middleware/base-context.js`**:
```javascript
export const baseContext = () => async (ctx) => {
    // Store the source path in context for lightview-x to access
    if (!ctx.sourcePath && ctx.path) {
        ctx.sourcePath = ctx.path;
    }
    return ctx;
};
```

**Use in index.html**:
```javascript
import { baseContext } from '/middleware/base-context.js';

appRouter
    .use(baseContext())
    .use('/docs/components/*');
```

**Problem**: lightview-x doesn't have access to router context when parsing HTML.

---

### **Option 3: Global Base Path Registry**

Store a global mapping of element → source path.

**Benefits**: Accessible anywhere
**Drawbacks**: Global state, memory management issues

---

## **RECOMMENDATION**

**Use Option 1** (the fix I showed earlier). It's:
- Self-contained in `lightview-x.js`
- Doesn't require router changes
- Works correctly with subdirectory deployments
- Converts relative URLs to absolute URLs that work anywhere

The `<base>` tag and router middleware approaches don't solve the core issue: DOMParser-created documents need their relative URLs rewritten before insertion into the main document.
