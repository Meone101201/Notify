// ==================== CONFIGURATION ====================
const CONFIG = {
    FIBONACCI: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
    NOTIFICATION_CHECK_INTERVAL: 60000, // 1 minute
    NOTIFICATION_TYPES: {
        ONE_WEEK: 7,
        THREE_DAYS: 3,
        ONE_DAY: 1,
        ONE_HOUR: 0.042,
        ON_TIME: 0
    },
    SOUND_TYPES: {
        default: [523.25, 659.25, 783.99],
        bell: [440, 554.37, 659.25],
        chime: [523.25, 659.25, 783.99, 1046.50],
        alert: [880, 880, 880]
    }
};

// Global State
const STATE = {
    tasks: [],
    taskIdCounter: 1,
    tempSubtasks: [],
    currentUser: null,
    notificationPermission: false,
    notificationCheckInterval: null,
    editingTaskId: null,
    activeSoundTimers: []
};

// Export
window.CONFIG = CONFIG;
window.STATE = STATE;
