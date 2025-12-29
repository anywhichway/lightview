/* eslint-env browser */
/* global Lightview */
/**
 * Sidebar Setup Utility
 * Initializes the slide-out drawer functionality for component documentation pages
 */

/**
 * Initialize the sidebar drawer functionality
 * This should be called after the DOM is loaded and Lightview is available
 * 
 * @example
 * <script type="module">
 *   import { initSidebar } from './sidebar-setup.js';
 *   initSidebar();
 * </script>
 */
export function initSidebar() {
    const { signal } = Lightview;

    // Sidebar state
    const sidebarOpen = signal(false);

    // Get DOM elements
    const sidebar = document.getElementById('gallery-sidebar');
    const main = document.getElementById('gallery-main');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleIcon = toggleBtn?.querySelector('svg');

    // Validate required elements exist
    if (!sidebar || !main || !overlay || !toggleBtn || !toggleIcon) {
        console.error('Sidebar elements not found. Required elements:', {
            sidebar: !!sidebar,
            main: !!main,
            overlay: !!overlay,
            toggleBtn: !!toggleBtn,
            toggleIcon: !!toggleIcon
        });
        return;
    }

    /**
     * Update the UI based on sidebar state
     */
    function updateSidebarUI() {
        sidebar.className = `gallery-sidebar ${sidebarOpen.value ? 'open' : 'closed'}`;
        main.className = `gallery-main ${sidebarOpen.value ? 'sidebar-open' : ''}`;
        overlay.className = `sidebar-overlay ${sidebarOpen.value ? 'active' : ''}`;
        toggleIcon.setAttribute('class', `toggle-icon ${sidebarOpen.value ? '' : 'rotated'}`);
    }

    /**
     * Toggle sidebar open/closed
     */
    function toggleSidebar() {
        sidebar.style.visibility = ''; // Remove initial hidden state
        sidebarOpen.value = !sidebarOpen.value;
        updateSidebarUI();
    }

    /**
     * Close sidebar
     */
    function closeSidebar() {
        sidebarOpen.value = false;
        updateSidebarUI();
    }

    // Attach event listeners
    toggleBtn.onclick = toggleSidebar;
    overlay.onclick = closeSidebar;

    // Initial UI update
    updateSidebarUI();

    // Mark layout as ready - enables sidebar visibility after initial state is set
    const galleryLayout = document.querySelector('.gallery-layout');
    if (galleryLayout) {
        galleryLayout.classList.add('js-ready');
    }

    // Return API for programmatic control if needed
    return {
        open: () => {
            sidebarOpen.value = true;
            updateSidebarUI();
        },
        close: closeSidebar,
        toggle: toggleSidebar,
        isOpen: () => sidebarOpen.value
    };
}
