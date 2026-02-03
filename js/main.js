// ==================== MAIN APPLICATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Agile Task Board - Initializing...');
    
    // Initialize Firebase
    initializeFirebase();
    
    // Check authentication state
    checkAuthState();
    
    // Request notification permission
    requestNotificationPermissionOnLoad();
    
    // Initialize UI
    renderTempSubtasks();
    addAnimationStyles();
    initializeEventListeners();
    
    // Start notification checker
    startNotificationChecker();
    
    console.log('✅ Application initialized successfully');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (STATE.notificationCheckInterval) {
        clearInterval(STATE.notificationCheckInterval);
    }
});
