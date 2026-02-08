// ==================== PERFORMANCE MONITORING ====================
// Utilities for tracking query performance and adding loading indicators

/**
 * Performance thresholds in milliseconds
 */
const PERFORMANCE_THRESHOLDS = {
    SLOW_OPERATION: 2000,  // 2 seconds
    WARNING_OPERATION: 1000  // 1 second
};

/**
 * Pagination limits
 */
const PAGINATION_LIMITS = {
    FRIENDS_LIST: 50,
    COMMENTS: 100,
    LEADERBOARD: 50,
    NOTIFICATIONS: 20
};

/**
 * Track query performance
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - Async operation to track
 * @returns {Promise<any>} - Result of the operation
 */
async function trackPerformance(operationName, operation) {
    const startTime = performance.now();
    let result;
    let error = null;

    try {
        result = await operation();
    } catch (err) {
        error = err;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log performance
    logPerformance(operationName, duration, error);

    if (error) {
        throw error;
    }

    return result;
}

/**
 * Log performance metrics
 * @param {string} operationName - Name of the operation
 * @param {number} duration - Duration in milliseconds
 * @param {Error} error - Error if operation failed
 */
function logPerformance(operationName, duration, error = null) {
    const status = error ? '❌' : '✅';
    const level = duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION ? '🐌' :
                  duration > PERFORMANCE_THRESHOLDS.WARNING_OPERATION ? '⚠️' : '⚡';

    console.log(`${status} ${level} ${operationName}: ${duration.toFixed(2)}ms`);

    // Store performance data for analytics
    if (typeof STATE !== 'undefined' && STATE.performanceMetrics) {
        STATE.performanceMetrics.push({
            operation: operationName,
            duration: duration,
            timestamp: Date.now(),
            success: !error
        });

        // Keep only last 100 metrics
        if (STATE.performanceMetrics.length > 100) {
            STATE.performanceMetrics.shift();
        }
    }
}

/**
 * Show loading indicator for slow operations
 * @param {string} containerId - ID of the container element
 * @param {string} message - Loading message
 * @returns {Function} - Function to hide the loading indicator
 */
function showLoadingIndicator(containerId, message = 'กำลังโหลด...') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container ${containerId} not found`);
        return () => {};
    }

    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;

    container.style.position = 'relative';
    container.appendChild(loadingOverlay);

    // Return function to hide loading indicator
    return () => {
        if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
    };
}

/**
 * Execute operation with loading indicator for slow operations
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - Async operation to execute
 * @param {string} containerId - ID of the container element
 * @param {string} loadingMessage - Loading message
 * @returns {Promise<any>} - Result of the operation
 */
async function executeWithLoadingIndicator(operationName, operation, containerId, loadingMessage = 'กำลังโหลด...') {
    let hideLoading = null;
    let loadingTimeout = null;

    try {
        // Show loading indicator after threshold
        loadingTimeout = setTimeout(() => {
            hideLoading = showLoadingIndicator(containerId, loadingMessage);
        }, PERFORMANCE_THRESHOLDS.WARNING_OPERATION);

        // Execute operation with performance tracking
        const result = await trackPerformance(operationName, operation);

        // Clear timeout and hide loading
        clearTimeout(loadingTimeout);
        if (hideLoading) {
            hideLoading();
        }

        return result;
    } catch (error) {
        // Clear timeout and hide loading on error
        clearTimeout(loadingTimeout);
        if (hideLoading) {
            hideLoading();
        }
        throw error;
    }
}

/**
 * Paginate an array
 * @param {Array} items - Items to paginate
 * @param {number} limit - Maximum items per page
 * @param {number} page - Page number (0-indexed)
 * @returns {Array} - Paginated items
 */
function paginateArray(items, limit, page = 0) {
    if (!Array.isArray(items)) {
        return [];
    }

    const start = page * limit;
    const end = start + limit;
    return items.slice(start, end);
}

/**
 * Paginate friends list
 * @param {Array} friends - Friends array
 * @param {number} page - Page number (0-indexed)
 * @returns {Object} - Paginated result with items and metadata
 */
function paginateFriends(friends, page = 0) {
    const limit = PAGINATION_LIMITS.FRIENDS_LIST;
    const items = paginateArray(friends, limit, page);
    
    return {
        items: items,
        page: page,
        limit: limit,
        total: friends.length,
        hasMore: (page + 1) * limit < friends.length,
        totalPages: Math.ceil(friends.length / limit)
    };
}

/**
 * Paginate comments
 * @param {Array} comments - Comments array
 * @param {number} page - Page number (0-indexed)
 * @returns {Object} - Paginated result with items and metadata
 */
function paginateComments(comments, page = 0) {
    const limit = PAGINATION_LIMITS.COMMENTS;
    
    // Show most recent comments first
    const sortedComments = [...comments].reverse();
    const items = paginateArray(sortedComments, limit, page);
    
    return {
        items: items,
        page: page,
        limit: limit,
        total: comments.length,
        hasMore: (page + 1) * limit < comments.length,
        totalPages: Math.ceil(comments.length / limit)
    };
}

/**
 * Paginate leaderboard
 * @param {Array} leaderboard - Leaderboard array
 * @param {number} page - Page number (0-indexed)
 * @returns {Object} - Paginated result with items and metadata
 */
function paginateLeaderboard(leaderboard, page = 0) {
    const limit = PAGINATION_LIMITS.LEADERBOARD;
    const items = paginateArray(leaderboard, limit, page);
    
    return {
        items: items,
        page: page,
        limit: limit,
        total: leaderboard.length,
        hasMore: (page + 1) * limit < leaderboard.length,
        totalPages: Math.ceil(leaderboard.length / limit)
    };
}

/**
 * Limit comments to most recent N
 * @param {Array} comments - Comments array
 * @param {number} limit - Maximum number of comments
 * @returns {Array} - Limited comments
 */
function limitComments(comments, limit = PAGINATION_LIMITS.COMMENTS) {
    if (!Array.isArray(comments)) {
        return [];
    }

    // Return most recent comments
    return comments.slice(-limit);
}

/**
 * Limit leaderboard to top N users
 * @param {Array} leaderboard - Leaderboard array (should be sorted by points)
 * @param {number} limit - Maximum number of users
 * @returns {Array} - Limited leaderboard
 */
function limitLeaderboard(leaderboard, limit = PAGINATION_LIMITS.LEADERBOARD) {
    if (!Array.isArray(leaderboard)) {
        return [];
    }

    return leaderboard.slice(0, limit);
}

/**
 * Get performance summary
 * @returns {Object} - Performance summary
 */
function getPerformanceSummary() {
    if (typeof STATE === 'undefined' || !STATE.performanceMetrics) {
        return {
            totalOperations: 0,
            averageDuration: 0,
            slowOperations: 0,
            failedOperations: 0
        };
    }

    const metrics = STATE.performanceMetrics;
    const totalOperations = metrics.length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
    const slowOperations = metrics.filter(m => m.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION).length;
    const failedOperations = metrics.filter(m => !m.success).length;

    return {
        totalOperations,
        averageDuration: averageDuration.toFixed(2),
        slowOperations,
        failedOperations,
        successRate: totalOperations > 0 ? ((totalOperations - failedOperations) / totalOperations * 100).toFixed(2) : 100
    };
}

/**
 * Initialize performance monitoring
 */
function initializePerformanceMonitoring() {
    // Initialize performance metrics array in STATE
    if (typeof STATE !== 'undefined') {
        STATE.performanceMetrics = STATE.performanceMetrics || [];
    }

    console.log('✅ Performance monitoring initialized');
}

// ==================== EXPORTS ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PERFORMANCE_THRESHOLDS,
        PAGINATION_LIMITS,
        trackPerformance,
        logPerformance,
        showLoadingIndicator,
        executeWithLoadingIndicator,
        paginateArray,
        paginateFriends,
        paginateComments,
        paginateLeaderboard,
        limitComments,
        limitLeaderboard,
        getPerformanceSummary,
        initializePerformanceMonitoring
    };
}
