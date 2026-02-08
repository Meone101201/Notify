/**
 * Dark Mode Manager
 * Handles theme switching between light and dark modes
 */

class DarkModeManager {
    constructor() {
        this.STORAGE_KEY = 'agile-task-board-theme';
        this.currentTheme = this.loadTheme();
        this.init();
    }

    /**
     * Initialize dark mode
     */
    init() {
        // Apply saved theme or detect system preference
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    // Only auto-switch if user hasn't set a preference
                    const newTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme(newTheme);
                }
            });
        }
    }

    /**
     * Load theme from localStorage or detect system preference
     * @returns {string} 'light' or 'dark'
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        if (savedTheme) {
            return savedTheme;
        }
        
        // Detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update toggle button icon
        this.updateToggleButton();
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.saveTheme(newTheme);
        
        // Show a subtle notification
        this.showThemeChangeNotification(newTheme);
    }

    /**
     * Save theme preference to localStorage
     * @param {string} theme - 'light' or 'dark'
     */
    saveTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);
    }

    /**
     * Update the toggle button icon based on current theme
     */
    updateToggleButton() {
        const toggleBtn = document.getElementById('darkModeToggle');
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        if (!icon) return;
        
        if (this.currentTheme === 'dark') {
            icon.className = 'fas fa-sun';
            toggleBtn.setAttribute('title', 'Switch to Light Mode');
        } else {
            icon.className = 'fas fa-moon';
            toggleBtn.setAttribute('title', 'Switch to Dark Mode');
        }
    }

    /**
     * Show a subtle notification when theme changes
     * @param {string} theme - The new theme
     */
    showThemeChangeNotification(theme) {
        const message = theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled';
        const icon = theme === 'dark' ? '🌙' : '☀️';
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'theme-change-notification';
        notification.innerHTML = `
            <span class="theme-icon">${icon}</span>
            <span class="theme-message">${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }

    /**
     * Get current theme
     * @returns {string} 'light' or 'dark'
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Check if dark mode is enabled
     * @returns {boolean}
     */
    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

// Initialize dark mode manager
const darkModeManager = new DarkModeManager();

// Setup toggle button click handler
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            darkModeManager.toggle();
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DarkModeManager, darkModeManager };
}
