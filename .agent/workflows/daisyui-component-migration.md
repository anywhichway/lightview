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

### Batch 1: Form Inputs
- [x] 1. Input (data-input/input.js) - DONE
- [x] 2. Textarea (data-input/textarea.js) - DONE
- [x] 3. Select (data-input/select.js) - DONE
- [x] 4. Checkbox (data-input/checkbox.js) - DONE
- [x] 5. Radio (data-input/radio.js) - DONE (also added RadioGroup)
- [x] 6. Toggle (data-input/toggle.js) - DONE
- [ ] 7. Range (data-input/range.js)
- [ ] 8. Rating (data-input/rating.js)
- [ ] 9. File Input (data-input/file-input.js)

### Batch 2: Actions & Feedback
- [ ] 10. Button (actions/button.js)
- [ ] 11. Modal (actions/modal.js + feedback/modal.js consolidation)
- [ ] 12. Drawer (layout/drawer.js + feedback/drawer.js consolidation)
- [ ] 13. Dropdown (actions/dropdown.js)
- [ ] 14. Swap (actions/swap.js)
- [ ] 15. Alert (data-display/alert.js + feedback/alert.js consolidation)
- [ ] 16. Toast (data-display/toast.js)
- [ ] 17. Loading (data-display/loading.js)
- [ ] 18. Progress (data-display/progress.js + feedback/progress.js consolidation)
- [ ] 19. Tooltip (feedback/tooltip.js)

### Batch 3: Data Display
- [ ] 20. Badge (data-display/badge.js + display/badge.js consolidation)
- [ ] 21. Card (data-display/card.js + display/card.js consolidation)
- [ ] 22. Avatar (data-display/avatar.js + display/avatar.js consolidation)
- [ ] 23. Table (data-display/table.js)
- [ ] 24. Accordion (data-display/accordion.js)
- [ ] 25. Collapse (data-display/collapse.js)
- [ ] 26. Carousel (data-display/carousel.js)
- [ ] 27. Chat (data-display/chat.js)
- [ ] 28. Countdown (data-display/countdown.js)
- [ ] 29. Diff (data-display/diff.js)
- [ ] 30. Kbd (data-display/kbd.js)
- [ ] 31. Stats (data-display/stats.js)
- [ ] 32. Timeline (data-display/timeline.js)
- [ ] 33. Skeleton (data-display/skeleton.js)

### Batch 4: Navigation & Layout
- [ ] 34. Tabs (navigation/tabs.js)
- [ ] 35. Menu (navigation/menu.js)
- [ ] 36. Breadcrumbs (navigation/breadcrumbs.js)
- [ ] 37. Pagination (navigation/pagination.js)
- [ ] 38. Steps (navigation/steps.js)
- [ ] 39. Dock (navigation/dock.js)
- [ ] 40. Navbar (layout/navbar.js)
- [ ] 41. Footer (layout/footer.js)
- [ ] 42. Hero (layout/hero.js)
- [ ] 43. Divider (layout/divider.js)
- [ ] 44. Indicator (layout/indicator.js)
- [ ] 45. Join (layout/join.js)

### Batch 5: Specialized
- [ ] 46. Theme Controller (actions/theme-controller.js)
- [ ] 47. Chart (data-display/chart.js) - uses Charts.css
- [ ] 48. Radial Progress (data-display/radial-progress.js)

## Cleanup Tasks
- [ ] Delete components/core/ directory
- [ ] Delete components/display/ directory (after consolidation)
- [ ] Delete components/feedback/ directory (after consolidation)
- [ ] Delete unused .css files
- [ ] Delete components/utils/icons.js
- [ ] Update components/index.js exports

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
