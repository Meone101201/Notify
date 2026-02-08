// ==================== MAIN APPLICATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Agile Task Board - Initializing...');
    
    // Initialize Firebase
    initializeFirebase();
    
    // Initialize network monitoring and offline persistence
    if (typeof initializeNetworkMonitoring !== 'undefined') {
        initializeNetworkMonitoring();
        console.log('✅ Network monitoring initialized');
    }
    
    if (typeof enableFirebaseOfflinePersistence !== 'undefined') {
        enableFirebaseOfflinePersistence();
    }
    
    // Initialize performance monitoring
    if (typeof initializePerformanceMonitoring !== 'undefined') {
        initializePerformanceMonitoring();
    }
    
    // Initialize FriendManager
    if (typeof FriendManager !== 'undefined') {
        window.friendManager = new FriendManager();
        console.log('✅ FriendManager initialized');
    }
    
    // Check authentication state
    checkAuthState();
    
    // Request notification permission
    requestNotificationPermissionOnLoad();
    
    // Initialize UI
    renderTempSubtasks();
    addAnimationStyles();
    initializeEventListeners();
    initializeFriendsEventListeners();
    initializeShareTaskEventListeners();
    initializeCommentInputListener();
    
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
