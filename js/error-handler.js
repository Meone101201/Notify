// ==================== ERROR HANDLER ====================
// Centralized error handling for network, validation, permission, and concurrency errors

/**
 * Error types
 */
const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    CONCURRENCY: 'concurrency',
    UNKNOWN: 'unknown'
};

/**
 * User-friendly error messages in Thai
 */
const ERROR_MESSAGES = {
    // Network errors
    'unavailable': 'ไม่สามารถเชื่อมต่อได้ กำลังใช้ข้อมูลแบบออฟไลน์',
    'deadline-exceeded': 'การเชื่อมต่อช้า กรุณารอสักครู่',
    'network-error': 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
    
    // Permission errors
    'permission-denied': 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
    'not-owner': 'คุณไม่มีสิทธิ์ลบงานนี้ เฉพาะเจ้าของเท่านั้น',
    'not-collaborator': 'คุณไม่มีสิทธิ์แก้ไขงานนี้',
    
    // Validation errors
    'invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'user-not-found': 'ไม่พบผู้ใช้ที่มีอีเมลนี้',
    'already-friends': 'คุณเป็นเพื่อนกับผู้ใช้นี้อยู่แล้ว',
    'duplicate-request': 'คุณได้ส่งคำขอไปแล้ว',
    'empty-friend-list': 'กรุณาเลือกเพื่อนอย่างน้อย 1 คน',
    'self-friend-request': 'คุณไม่สามารถส่งคำขอเป็นเพื่อนกับตัวเองได้',
    
    // Concurrency errors
    'concurrent-modification': 'มีการแก้ไขพร้อมกัน กรุณาลองใหม่',
    'transaction-aborted': 'การดำเนินการถูกยกเลิก กรุณาลองใหม่',
    
    // Generic errors
    'unknown': 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง'
};

/**
 * Offline state management
 */
let isOffline = false;
let offlineQueue = [];

/**
 * Error logger
 */
class ErrorLogger {
    static log(error, context) {
        const errorData = {
            message: error.message,
            code: error.code,
            stack: error.stack,
            context: context,
            userId: STATE?.currentUser?.uid,
            timestamp: new Date().toISOString()
        };
        
        console.error('Error:', errorData);
        
        // In production, send to error tracking service
        // if (CONFIG.ENVIRONMENT === 'production') {
        //     // Send to Sentry, LogRocket, etc.
        // }
    }
}

/**
 * Retry with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<any>} - Result of the operation
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Don't retry on permission errors or validation errors
            if (error.code === 'permission-denied' || 
                error.code === 'invalid-argument') {
                throw error;
            }
            
            // Calculate exponential backoff delay
            const delay = baseDelay * Math.pow(2, attempt);
            
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // All retries failed
    throw lastError;
}

/**
 * Handle network errors
 * @param {Error} error - The error object
 * @param {Function} fallbackOperation - Optional fallback operation (e.g., use cached data)
 * @returns {any} - Result from fallback or null
 */
async function handleNetworkError(error, fallbackOperation = null) {
    ErrorLogger.log(error, { type: ERROR_TYPES.NETWORK });
    
    if (error.code === 'unavailable') {
        setOfflineMode(true);
        showNotification(ERROR_MESSAGES['unavailable'], 'warning');
        
        if (fallbackOperation) {
            return await fallbackOperation();
        }
    } else if (error.code === 'deadline-exceeded') {
        showNotification(ERROR_MESSAGES['deadline-exceeded'], 'warning');
    } else {
        showNotification(ERROR_MESSAGES['network-error'], 'error');
    }
    
    return null;
}

/**
 * Handle validation errors
 * @param {string} errorCode - Error code
 * @param {Object} context - Additional context
 */
function handleValidationError(errorCode, context = {}) {
    ErrorLogger.log(new Error(errorCode), { 
        type: ERROR_TYPES.VALIDATION,
        ...context 
    });
    
    const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['unknown'];
    showNotification(message, 'error');
}

/**
 * Handle permission errors
 * @param {string} errorCode - Error code
 * @param {Object} context - Additional context
 */
function handlePermissionError(errorCode, context = {}) {
    ErrorLogger.log(new Error(errorCode), { 
        type: ERROR_TYPES.PERMISSION,
        ...context 
    });
    
    const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['permission-denied'];
    showNotification(message, 'error');
}

/**
 * Handle concurrency errors
 * @param {Error} error - The error object
 * @param {Function} retryOperation - Operation to retry
 * @returns {Promise<any>} - Result of retry or null
 */
async function handleConcurrencyError(error, retryOperation = null) {
    ErrorLogger.log(error, { type: ERROR_TYPES.CONCURRENCY });
    
    if (error.code === 'aborted') {
        showNotification(ERROR_MESSAGES['transaction-aborted'], 'warning');
        
        if (retryOperation) {
            try {
                return await retryWithBackoff(retryOperation, 2, 500);
            } catch (retryError) {
                showNotification(ERROR_MESSAGES['concurrent-modification'], 'error');
                return null;
            }
        }
    } else {
        showNotification(ERROR_MESSAGES['concurrent-modification'], 'error');
    }
    
    return null;
}

/**
 * Set offline mode
 * @param {boolean} offline - Whether the app is offline
 */
function setOfflineMode(offline) {
    isOffline = offline;
    
    // Update UI to show offline indicator
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
        offlineIndicator.style.display = offline ? 'block' : 'none';
    }
    
    // If coming back online, process queued operations
    if (!offline && offlineQueue.length > 0) {
        processOfflineQueue();
    }
}

/**
 * Queue operation for offline sync
 * @param {Function} operation - Operation to queue
 * @param {Object} context - Context for the operation
 */
function queueOfflineOperation(operation, context) {
    offlineQueue.push({ operation, context, timestamp: Date.now() });
    console.log(`Queued operation: ${context.type}`, context);
}

/**
 * Process queued offline operations
 */
async function processOfflineQueue() {
    console.log(`Processing ${offlineQueue.length} queued operations...`);
    
    const queue = [...offlineQueue];
    offlineQueue = [];
    
    for (const item of queue) {
        try {
            await item.operation();
            console.log(`✅ Processed queued operation: ${item.context.type}`);
        } catch (error) {
            console.error(`❌ Failed to process queued operation: ${item.context.type}`, error);
            // Re-queue if still offline
            if (isOffline) {
                offlineQueue.push(item);
            }
        }
    }
    
    if (offlineQueue.length === 0) {
        showNotification('ซิงค์ข้อมูลเสร็จสิ้น', 'success');
    }
}

/**
 * Check if app is offline
 * @returns {boolean}
 */
function getOfflineStatus() {
    return isOffline;
}

/**
 * Initialize network monitoring
 */
function initializeNetworkMonitoring() {
    // Monitor online/offline events
    window.addEventListener('online', () => {
        console.log('Network: Online');
        setOfflineMode(false);
        showNotification('กลับมาออนไลน์แล้ว', 'success');
    });
    
    window.addEventListener('offline', () => {
        console.log('Network: Offline');
        setOfflineMode(true);
        showNotification('ออฟไลน์ - ข้อมูลจะถูกซิงค์เมื่อกลับมาออนไลน์', 'warning');
    });
    
    // Check initial network status
    if (!navigator.onLine) {
        setOfflineMode(true);
    }
}

/**
 * Enable Firebase offline persistence
 */
async function enableFirebaseOfflinePersistence() {
    try {
        await firebase.firestore().enablePersistence({
            synchronizeTabs: true
        });
        console.log('✅ Firebase offline persistence enabled');
    } catch (error) {
        if (error.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time');
        } else if (error.code === 'unimplemented') {
            console.warn('Browser does not support offline persistence');
        } else {
            console.error('Error enabling offline persistence:', error);
        }
    }
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
 */
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof sendNotification === 'function') {
        sendNotification(message);
    } else {
        // Fallback to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate friend request before sending
 * @param {string} email - Target email
 * @param {Object} currentUser - Current user object
 * @param {Array} friends - Current friends list
 * @param {Array} pendingRequests - Pending requests list
 * @returns {Object} - { valid: boolean, errorCode: string }
 */
function validateFriendRequest(email, currentUser, friends, pendingRequests) {
    // Check if email is valid
    if (!isValidEmail(email)) {
        return { valid: false, errorCode: 'invalid-email' };
    }
    
    // Check if trying to add self
    if (email === currentUser.email) {
        return { valid: false, errorCode: 'self-friend-request' };
    }
    
    // Check if already friends (will be checked after finding user)
    // Check if duplicate request exists (will be checked after finding user)
    
    return { valid: true };
}

/**
 * Validate task sharing data
 * @param {Array} friendIds - Array of friend IDs to share with
 * @returns {Object} - { valid: boolean, errorCode: string }
 */
function validateTaskSharing(friendIds) {
    if (!friendIds || friendIds.length === 0) {
        return { valid: false, errorCode: 'empty-friend-list' };
    }
    
    return { valid: true };
}

/**
 * Prevent form submission while validation is in progress
 * @param {HTMLFormElement} form - Form element
 * @param {boolean} isValidating - Whether validation is in progress
 */
function setFormValidationState(form, isValidating) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = isValidating;
        if (isValidating) {
            submitButton.classList.add('validating');
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
        } else {
            submitButton.classList.remove('validating');
            submitButton.innerHTML = submitButton.dataset.originalText || 'ส่ง';
        }
    }
}

/**
 * Check if user already exists in friends list
 * @param {string} userId - User ID to check
 * @param {Array} friends - Friends list
 * @returns {boolean}
 */
function isAlreadyFriend(userId, friends) {
    return friends.includes(userId);
}

/**
 * Check if duplicate friend request exists
 * @param {string} fromUid - Sender UID
 * @param {string} toUid - Recipient UID
 * @param {Array} pendingRequests - Pending requests list
 * @returns {boolean}
 */
function hasDuplicateRequest(fromUid, toUid, pendingRequests) {
    return pendingRequests.some(req => 
        req.from === fromUid && req.to === toUid && req.status === 'pending'
    );
}

// ==================== EXPORTS ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ERROR_TYPES,
        ERROR_MESSAGES,
        ErrorLogger,
        retryWithBackoff,
        handleNetworkError,
        handleValidationError,
        handlePermissionError,
        handleConcurrencyError,
        setOfflineMode,
        queueOfflineOperation,
        processOfflineQueue,
        getOfflineStatus,
        initializeNetworkMonitoring,
        enableFirebaseOfflinePersistence,
        isValidEmail,
        validateFriendRequest,
        validateTaskSharing,
        setFormValidationState,
        isAlreadyFriend,
        hasDuplicateRequest
    };
}
