---
description: Migrate all components to DaisyUI styling pattern with examplify docs
---

# DaisyUI Component Migration Plan

## Overview
Migrate all Lightview components to use DaisyUI styling (like the reference `input.js` pattern):
- Use DaisyUI classes directly (no BEM `.lv-*` classes)
- Remove parallel `.css` files where possible
- Use custom CSS only for advanced features not in DaisyUI
- All components support Shadow DOM (global setting with local override)
- Remove `getIcon()` usage - use inline SVGs or children
- Update all `.html` docs to use `examplify()` with basic + reactive examples
- Match DaisyUI directory structure (delete `components/core/`)

## Reference Pattern (from input.js)
```javascript
// Key patterns:
// 1. No CSS import - uses DaisyUI classes directly
// 2. Uses fieldset/legend pattern for form fields
// 3. Signal-based reactive state
// 4. Controlled/uncontrolled modes
// 5. Validation support
// 6. Shadow DOM support with useShadow prop
// 7. Auto-register with LightviewX
```

## Component Status Tracker

### Batch 1: Form Inputs ✅ COMPLETE
- [x] 1. Input (data-input/input.js) - DONE
- [x] 2. Textarea (data-input/textarea.js) - DONE
- [x] 3. Select (data-input/select.js) - DONE
- [x] 4. Checkbox (data-input/checkbox.js) - DONE
- [x] 5. Radio (data-input/radio.js) - DONE (also added RadioGroup)
- [x] 6. Toggle (data-input/toggle.js) - DONE
- [x] 7. Range (data-input/range.js) - DONE
- [x] 8. Rating (data-input/rating.js) - DONE
- [x] 9. File Input (data-input/file-input.js) - DONE

### Batch 2: Actions & Feedback ✅ COMPLETE
- [x] 10. Button (actions/button.js) - DONE (docs updated with examplify)
- [x] 11. Modal (actions/modal.js) - DONE (docs updated with examplify)
- [x] 12. Drawer (layout/drawer.js) - DONE (docs updated with examplify)
- [x] 13. Dropdown (actions/dropdown.js) - DONE (docs updated with examplify)
- [x] 14. Swap (actions/swap.js) - DONE (docs updated with examplify)
- [x] 15. Alert (data-display/alert.js) - DONE (docs updated with examplify)
- [x] 16. Toast (data-display/toast.js) - DONE (docs updated with examplify)
- [x] 17. Loading (data-display/loading.js) - DONE (docs updated with examplify)
- [x] 18. Progress (data-display/progress.js) - DONE (docs updated with examplify)
- [x] 19. Tooltip (data-display/tooltip.js) - DONE (docs updated with examplify)

### Batch 3: Data Display ✅ COMPLETE
- [x] 20. Badge (data-display/badge.js) - DONE (docs updated with examplify)
- [x] 21. Card (data-display/card.js) - DONE (docs updated with examplify)
- [x] 22. Avatar (data-display/avatar.js) - DONE (docs updated with examplify)
- [x] 23. Table (data-display/table.js) - DONE (docs updated with examplify)
- [x] 24. Accordion (data-display/accordion.js) - DONE (docs updated with examplify)
- [x] 25. Collapse (data-display/collapse.js) - DONE (docs updated with examplify)
- [x] 26. Carousel (data-display/carousel.js) - DONE (docs updated with examplify)
- [x] 27. Chat (data-display/chat.js) - DONE (docs updated with examplify)
- [x] 28. Countdown (data-display/countdown.js) - DONE (docs updated with examplify)
- [x] 29. Diff (data-display/diff.js) - DONE (docs updated with examplify)
- [x] 30. Kbd (data-display/kbd.js) - DONE (docs updated with examplify)
- [x] 31. Stats (data-display/stats.js) - DONE (docs updated with examplify)
- [x] 32. Timeline (data-display/timeline.js) - DONE (docs updated with examplify)
- [x] 33. Skeleton (data-display/skeleton.js) - DONE (docs updated with examplify)

### Batch 4: Navigation & Layout ✅ COMPLETE
- [x] 34. Tabs (navigation/tabs.js) - DONE (docs updated with examplify)
- [x] 35. Menu (navigation/menu.js) - DONE (docs updated with examplify)
- [x] 36. Breadcrumbs (navigation/breadcrumbs.js) - DONE (docs updated with examplify)
- [x] 37. Pagination (navigation/pagination.js) - DONE (docs updated with examplify)
- [x] 38. Steps (navigation/steps.js) - DONE (docs updated with examplify)
- [x] 39. Dock (navigation/dock.js) - DONE (docs updated with examplify)
- [x] 40. Navbar (layout/navbar.js) - DONE (docs updated with examplify)
- [x] 41. Footer (layout/footer.js) - DONE (docs updated with examplify)
- [x] 42. Hero (layout/hero.js) - DONE (docs updated with examplify)
- [x] 43. Divider (layout/divider.js) - DONE (docs updated with examplify)
- [x] 44. Indicator (layout/indicator.js) - DONE (docs updated with examplify)
- [x] 45. Join (layout/join.js) - DONE (docs updated with examplify)

### Batch 5: Specialized ✅ COMPLETE
- [x] 46. Theme Controller (actions/theme-controller.js) - DONE (docs updated with examplify)
- [x] 47. Chart (data-display/chart.js) - DONE (docs updated with examplify)
- [x] 48. Radial Progress (data-display/radial-progress.js) - DONE (docs updated with examplify)

### Batch 6: Shadow DOM Support
Add `useShadow` prop and Shadow DOM rendering to all components following the `input.js` pattern:
- Check `LightviewX.shouldUseShadow(useShadow)` to determine if shadow DOM should be used
- Get adopted stylesheets via `LightviewX.getAdoptedStyleSheets()`
- Get current theme from `document.documentElement.getAttribute('data-theme')`
- Wrap component in `shadowDOM({ mode: 'open', adoptedStyleSheets }, div({ 'data-theme': currentTheme }, componentEl))`

Components to update:
- [x] Button (actions/button.js) - DONE
- [x] Dropdown (actions/dropdown.js)
- [x] Modal (actions/modal.js)
- [x] Swap (actions/swap.js)
- [x] Alert (data-display/alert.js)
- [x] Toast (data-display/toast.js)
- [x] Loading (data-display/loading.js)
- [x] Progress (data-display/progress.js)
- [x] Drawer (layout/drawer.js)
- [x] Tooltip (data-display/tooltip.js)
- [x] Badge (data-display/badge.js)
- [x] Card (data-display/card.js)
- [x] Avatar (data-display/avatar.js)
- [x] Table (data-display/table.js)
- [x] Accordion (data-display/accordion.js)
- [x] Collapse (data-display/collapse.js)
- [x] Carousel (data-display/carousel.js)
- [x] Chat (data-display/chat.js)
- [x] Countdown (data-display/countdown.js)
- [x] Diff (data-display/diff.js)
- [x] Kbd (data-display/kbd.js)
- [x] Stats (data-display/stats.js)
- [x] Timeline (data-display/timeline.js)
- [x] Skeleton (data-display/skeleton.js)
- [x] Tabs (navigation/tabs.js)
- [x] Menu (navigation/menu.js)
- [x] Breadcrumbs (navigation/breadcrumbs.js)
- [x] Pagination (navigation/pagination.js)
- [x] Steps (navigation/steps.js)
- [x] Dock (navigation/dock.js)
- [x] Navbar (layout/navbar.js)
- [x] Footer (layout/footer.js)
- [x] Hero (layout/hero.js)
- [x] Divider (layout/divider.js)
- [x] Indicator (layout/indicator.js)
- [x] Join (layout/join.js)
- [x] Theme Controller (actions/theme-controller.js)
- [x] Chart (data-display/chart.js)
- [x] Radial Progress (data-display/radial-progress.js)


## Cleanup Tasks
- [x] Delete components/core/ directory
- [x] Delete components/display/ directory (after consolidation)
- [x] Delete components/feedback/ directory (after consolidation)
- [x] Delete unused .css files
- [x] Delete components/utils/icons.js
- [x] Update components/index.js exports

## Per-Component Checklist
For each component:
1. [ ] Refactor .js to use DaisyUI classes
2. [ ] Add Shadow DOM support (useShadow prop)
3. [ ] Add validation/error support where applicable
4. [ ] Add controlled/uncontrolled state support
5. [ ] Remove getIcon() usage
6. [ ] Update .html docs with examplify (basic + reactive examples)
7. [ ] Delete old .css file if no longer needed
8. [ ] Test in browser
