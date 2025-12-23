# Fix Applied: Router URL Timing Issue

## Problem Identified
When navigating between routes, HTML fragments containing relative URLs (like `<link href="./index.css">`) were being loaded from the wrong path, causing MIME type errors.

### Root Cause
The sequence of events was:
1. Router fetched content from source path (e.g., `/docs/components/button.html`)
2. Content inserted into DOM with `contentEl.innerHTML = html`
3. MutationObserver detected new elements with `src` attributes
4. `pushState` changed URL to destination (e.g., `/docs/getting-started/`)
5. Browser evaluated `<link href="./index.css">` relative to NEW location `/docs/getting-started/`
6. ❌ Tried to load `/docs/getting-started/index.css` (doesn't exist)

**Key insight**: When `<link>` tags are dynamically inserted, browsers resolve their `href` relative to `window.location.href`, NOT `document.baseURI`. Since `pushState` happened AFTER content insertion, the timing was wrong.

## Solution Applied

### Changed File: `lightview-router.js`
Modified the `navigate` function to:
1. **Call `pushState` BEFORE `handleRequest`** - Sets the URL before content is fetched/inserted
2. **Use `replaceState` for redirects** - If server redirects to a different URL, update without adding history entry

### Benefits
✅ Relative URLs in HTML fragments now resolve correctly on first load
✅ Works with server redirects (e.g., `/docs/getting-started` → `/docs/getting-started/`)
✅ No broken back/forward navigation
✅ No URL rewriting needed - clean architectural solution
✅ Works regardless of deployment subdirectory

## Testing Instructions
1. Clear browser cache to ensure fresh CSS loads
2. Navigate to Getting Started from home page
3. Click between menu options (Getting Started, API, Styles, Components)
4. Verify no MIME type errors in console
5. Verify CSS loads correctly on first navigation
6. Test back/forward navigation

## Files Modified
- `lightview-router.js` - Lines 288-310 (navigate function)
- `lightview-x.js` - Lines 942-944 (updated comment)
