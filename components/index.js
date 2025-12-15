/**
 * Lightview Components - DaisyUI Edition
 * Main export file for all components
 */

// DaisyUI utilities
export * from './daisyui.js';
export { default as DaisyUI } from './daisyui.js';

// Actions
export { default as Button } from './actions/button.js';
export { default as Dropdown } from './actions/dropdown.js';
export { default as Modal } from './actions/modal.js';
export { default as Swap } from './actions/swap.js';
export { default as ThemeController } from './actions/theme-controller.js';

// Data Display
export { default as Accordion } from './data-display/accordion.js';
export { default as Alert } from './data-display/alert.js';
export { default as Avatar } from './data-display/avatar.js';
export { default as Badge } from './data-display/badge.js';
export { default as Card } from './data-display/card.js';
export { default as Chart } from './data-display/chart.js';
export { default as Carousel } from './data-display/carousel.js';
export { default as Chat } from './data-display/chat.js';
export { default as Collapse } from './data-display/collapse.js';
export { default as Countdown } from './data-display/countdown.js';
export { default as Diff } from './data-display/diff.js';
export { default as Kbd } from './data-display/kbd.js';
export { default as Loading } from './data-display/loading.js';
export { default as Progress } from './data-display/progress.js';
export { default as RadialProgress } from './data-display/radial-progress.js';
export { default as Skeleton } from './data-display/skeleton.js';
export { default as Stats } from './data-display/stats.js';
export { default as Table } from './data-display/table.js';
export { default as Timeline } from './data-display/timeline.js';
export { default as Toast } from './data-display/toast.js';
export { default as Tooltip } from './data-display/tooltip.js';

// Data Input
export { default as Checkbox } from './data-input/checkbox.js';
export { default as FileInput } from './data-input/file-input.js';
export { default as Radio } from './data-input/radio.js';
export { default as Range } from './data-input/range.js';
export { default as Rating } from './data-input/rating.js';
export { default as Select } from './data-input/select.js';
export { default as Input } from './data-input/input.js';
export { default as Textarea } from './data-input/textarea.js';
export { default as Toggle } from './data-input/toggle.js';

// Layout
export { default as Divider } from './layout/divider.js';
export { default as Drawer } from './layout/drawer.js';
export { default as Footer } from './layout/footer.js';
export { default as Hero } from './layout/hero.js';
export { default as Indicator } from './layout/indicator.js';
export { default as Join } from './layout/join.js';
export { default as Navbar } from './layout/navbar.js';

// Navigation
export { default as Breadcrumbs } from './navigation/breadcrumbs.js';
export { default as Dock } from './navigation/dock.js';
export { default as Menu } from './navigation/menu.js';
export { default as Pagination } from './navigation/pagination.js';
export { default as Steps } from './navigation/steps.js';
export { default as Tabs } from './navigation/tabs.js';

/**
 * Component manifest for documentation/tooling
 */
export const componentManifest = {
    actions: [
        { name: 'Button', description: 'Versatile button with variants, colors, and loading states' },
        { name: 'Dropdown', description: 'Dropdown menu that opens on click or hover' },
        { name: 'Modal', description: 'Dialog overlay for important content' },
        { name: 'Swap', description: 'Toggle between two elements with animation' },
        { name: 'ThemeController', description: 'Theme switcher toggle or dropdown' }
    ],
    dataDisplay: [
        { name: 'Accordion', description: 'Collapsible content sections' },
        { name: 'Alert', description: 'Inline messages and notifications' },
        { name: 'Avatar', description: 'User avatar with image/initials fallback' },
        { name: 'Badge', description: 'Small label for status or counts' },
        { name: 'Card', description: 'Container for grouping content' },
        { name: 'Chart', description: 'Charts and graphs powered by charts.css' },
        { name: 'Carousel', description: 'Scrollable image/content gallery' },
        { name: 'Chat', description: 'Chat bubble messages' },
        { name: 'Collapse', description: 'Show/hide content sections' },
        { name: 'Countdown', description: 'Animated countdown number' },
        { name: 'Diff', description: 'Side-by-side comparison' },
        { name: 'Kbd', description: 'Keyboard shortcut indicator' },
        { name: 'Loading', description: 'Loading spinner animations' },
        { name: 'Progress', description: 'Linear progress bar' },
        { name: 'RadialProgress', description: 'Circular progress indicator' },
        { name: 'Skeleton', description: 'Loading placeholder' },
        { name: 'Stats', description: 'Statistics display blocks' },
        { name: 'Table', description: 'Data table with styling' },
        { name: 'Timeline', description: 'Chronological event list' },
        { name: 'Toast', description: 'Positioned notification container' },
        { name: 'Tooltip', description: 'Hover tooltip' }
    ],
    dataInput: [
        { name: 'Checkbox', description: 'Checkbox input' },
        { name: 'FileInput', description: 'File upload input' },
        { name: 'Radio', description: 'Radio button' },
        { name: 'Range', description: 'Slider input' },
        { name: 'Rating', description: 'Star rating input' },
        { name: 'Select', description: 'Dropdown select' },
        { name: 'Input', description: 'Text input field' },
        { name: 'Textarea', description: 'Multi-line text input' },
        { name: 'Toggle', description: 'Switch toggle' }
    ],
    layout: [
        { name: 'Divider', description: 'Content separator' },
        { name: 'Drawer', description: 'Slide-out sidebar' },
        { name: 'Footer', description: 'Page footer' },
        { name: 'Hero', description: 'Large banner section' },
        { name: 'Indicator', description: 'Position badges on corners' },
        { name: 'Join', description: 'Group items with shared borders' },
        { name: 'Navbar', description: 'Navigation bar' }
    ],
    navigation: [
        { name: 'Breadcrumbs', description: 'Navigation breadcrumb trail' },
        { name: 'Dock', description: 'Bottom navigation bar' },
        { name: 'Menu', description: 'Navigation menu list' },
        { name: 'Pagination', description: 'Page navigation' },
        { name: 'Steps', description: 'Step progress indicator' },
        { name: 'Tabs', description: 'Tabbed navigation' }
    ]
};

/**
 * Initialize all components
 */
export const initComponents = () => {
    console.log('Lightview Components (DaisyUI) initialized');
};
