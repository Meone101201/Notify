// ==================== FIREBASE DATABASE ====================

async function loadTasksFromFirebase() {
    if (!STATE.currentUser) {
        loadFromLocalStorage();
        return;
    }
    
    try {
        // ✅ Don't load tasks here - let the real-time listeners handle it
        // This prevents duplicate tasks and ensures real-time updates work correctly
        
        // Just wait a bit for listeners to populate the tasks
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`✅ Tasks loaded via real-time listeners (${STATE.tasks.filter(t => t.isOwnTask).length} own, ${STATE.tasks.filter(t => t.isSharedWithMe).length} shared)`);
        
        renderTasks();
        updateStats();
    } catch (error) {
        await handleNetworkError(error, loadFromLocalStorage);
    }
}

async function saveTasksToFirebase() {
    if (!STATE.currentUser) {
        saveToLocalStorage();
        return;
    }
    
    // If offline, queue the operation
    if (getOfflineStatus && getOfflineStatus()) {
        queueOfflineOperation(saveTasksToFirebase, { type: 'saveTasksToFirebase' });
        saveToLocalStorage();
        return;
    }
    
    try {
        await retryWithBackoff(async () => {
            const batch = firebase.firestore().batch();
            const userTasksRef = firebase.firestore()
                .collection('users')
                .doc(STATE.currentUser.uid)
                .collection('tasks');
            
            // Only save tasks that we own (not shared tasks from others)
            const ownTasks = STATE.tasks.filter(task => 
                task.isOwnTask || task.owner === STATE.currentUser.uid
            );
            
            ownTasks.forEach(task => {
                const taskRef = userTasksRef.doc(task.id.toString());
                
                // ✅ Create a clean copy of the task
                const taskToSave = { ...task };
                
                // ✅ CRITICAL: Don't save finalized=true without finalizedAt
                if (taskToSave.finalized === true && !taskToSave.finalizedAt) {
                    console.warn(`⚠️ Preventing save of corrupted finalized field for task ${task.id}`);
                    taskToSave.finalized = false;
                    delete taskToSave.finalizedAt;
                    delete taskToSave.finalizedBy;
                }
                
                // ✅ Ensure finalized is boolean
                if (taskToSave.finalized !== true && taskToSave.finalized !== false) {
                    taskToSave.finalized = false;
                }
                
                console.log(`💾 Saving task ${task.id}:`, {
                    name: taskToSave.name,
                    finalized: taskToSave.finalized,
                    finalizedAt: taskToSave.finalizedAt,
                    completed: taskToSave.completed
                });
                
                batch.set(taskRef, taskToSave);
            });
            
            // ✅ Removed auto-update of all shared tasks to prevent unintended updates
            // Each function (toggleSubtask, toggleTaskComplete, etc.) handles shared task updates directly
            
            await batch.commit();
        });
        
        console.log('✅ Tasks saved to Firebase');
    } catch (error) {
        await handleNetworkError(error, saveToLocalStorage);
    }
}

async function deleteTaskFromFirebase(taskId) {
    if (!STATE.currentUser) {
        return;
    }
    
    // If offline, queue the operation
    if (getOfflineStatus && getOfflineStatus()) {
        queueOfflineOperation(() => deleteTaskFromFirebase(taskId), { 
            type: 'deleteTaskFromFirebase',
            taskId 
        });
        return;
    }
    
    try {
        await retryWithBackoff(async () => {
            await firebase.firestore()
                .collection('users')
                .doc(STATE.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString())
                .delete();
        });
        
        console.log('✅ Task deleted from Firebase');
    } catch (error) {
        await handleNetworkError(error);
    }
}

function loadFromLocalStorage() {
    STATE.tasks = JSON.parse(localStorage.getItem('agileTasks')) || [];
    STATE.taskIdCounter = parseInt(localStorage.getItem('taskIdCounter')) || 1;
    renderTasks();
    updateStats();
}

function saveToLocalStorage() {
    localStorage.setItem('agileTasks', JSON.stringify(STATE.tasks));
    localStorage.setItem('taskIdCounter', STATE.taskIdCounter.toString());
}

// ==================== FRIEND REQUESTS ====================

/**
 * Create a friend request
 * @param {string} fromUid - Sender user ID
 * @param {string} toUid - Recipient user ID
 * @returns {Promise<string>} - Request ID
 */
async function createFriendRequest(fromUid, toUid) {
    try {
        const requestData = {
            from: fromUid,
            to: toUid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await firebase.firestore()
            .collection('friendRequests')
            .add(requestData);
        
        console.log('✅ Friend request created:', docRef.id);
        return docRef.id;
    } catch (error) {
        if (error.code === 'permission-denied') {
            if (typeof handlePermissionError !== 'undefined') {
                handlePermissionError('permission-denied', { 
                    operation: 'createFriendRequest',
                    fromUid,
                    toUid 
                });
            }
        }
        console.error('Error creating friend request:', error);
        throw error;
    }
}

/**
 * Get a friend request by ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object|null>} - Request data or null if not found
 */
async function getFriendRequest(requestId) {
    try {
        const doc = await firebase.firestore()
            .collection('friendRequests')
            .doc(requestId)
            .get();
        
        if (!doc.exists) {
            return null;
        }
        
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error getting friend request:', error);
        throw error;
    }
}

/**
 * Update a friend request
 * @param {string} requestId - Request ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateFriendRequest(requestId, updates) {
    try {
        await firebase.firestore()
            .collection('friendRequests')
            .doc(requestId)
            .update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('✅ Friend request updated:', requestId);
    } catch (error) {
        console.error('Error updating friend request:', error);
        throw error;
    }
}

/**
 * Delete a friend request
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
async function deleteFriendRequest(requestId) {
    try {
        await firebase.firestore()
            .collection('friendRequests')
            .doc(requestId)
            .delete();
        
        console.log('✅ Friend request deleted:', requestId);
    } catch (error) {
        console.error('Error deleting friend request:', error);
        throw error;
    }
}

/**
 * Get pending friend requests for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of pending requests
 */
async function getPendingRequestsForUser(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('friendRequests')
            .where('to', '==', userId)
            .where('status', '==', 'pending')
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Loaded ${requests.length} pending requests for user ${userId}`);
        return requests;
    } catch (error) {
        console.error('Error getting pending requests:', error);
        throw error;
    }
}

// ==================== EXPORTS FOR TESTING ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadTasksFromFirebase,
        saveTasksToFirebase,
        deleteTaskFromFirebase,
        loadFromLocalStorage,
        saveToLocalStorage,
        createFriendRequest,
        getFriendRequest,
        updateFriendRequest,
        deleteFriendRequest,
        getPendingRequestsForUser,
        addFriendToUser,
        removeFriendFromUser,
        getUserFriends,
        findUserByEmail,
        getAchievements,
        getUserAchievements,
        updateUserAchievements,
        createNotification,
        getUserNotifications,
        markNotificationAsRead,
        cleanupOldNotifications,
        getSharedTasks,
        updateTaskCollaborators,
        addTaskComment
    };
}

// ==================== USER FRIENDS MANAGEMENT ====================

/**
 * Add a friend to a user's friends list
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise<void>}
 */
async function addFriendToUser(userId, friendId) {
    try {
        await firebase.firestore()
            .collection('users')
            .doc(userId)
            .update({
                friends: firebase.firestore.FieldValue.arrayUnion(friendId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Added friend ${friendId} to user ${userId}`);
    } catch (error) {
        console.error('Error adding friend to user:', error);
        throw error;
    }
}

/**
 * Remove a friend from a user's friends list
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise<void>}
 */
async function removeFriendFromUser(userId, friendId) {
    try {
        await firebase.firestore()
            .collection('users')
            .doc(userId)
            .update({
                friends: firebase.firestore.FieldValue.arrayRemove(friendId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Removed friend ${friendId} from user ${userId}`);
    } catch (error) {
        console.error('Error removing friend from user:', error);
        throw error;
    }
}

/**
 * Get a user's friends list
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of friend user IDs
 */
async function getUserFriends(userId) {
    try {
        const doc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        
        if (!doc.exists) {
            return [];
        }
        
        const userData = doc.data();
        return userData.friends || [];
    } catch (error) {
        console.error('Error getting user friends:', error);
        throw error;
    }
}

/**
 * Find a user by email address
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} - User data or null if not found
 */
async function findUserByEmail(email) {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            return null;
        }
        
        const doc = snapshot.docs[0];
        return { uid: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    }
}

// ==================== ACHIEVEMENTS ====================

/**
 * Get all achievements
 * @returns {Promise<Array>} - Array of achievement objects
 */
async function getAchievements() {
    try {
        const snapshot = await firebase.firestore()
            .collection('achievements')
            .get();
        
        const achievements = [];
        snapshot.forEach(doc => {
            achievements.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Loaded ${achievements.length} achievements`);
        return achievements;
    } catch (error) {
        console.error('Error getting achievements:', error);
        throw error;
    }
}

/**
 * Get user's unlocked achievements
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of achievement IDs
 */
async function getUserAchievements(userId) {
    try {
        const doc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        
        if (!doc.exists) {
            return [];
        }
        
        const userData = doc.data();
        return userData.achievements || [];
    } catch (error) {
        console.error('Error getting user achievements:', error);
        throw error;
    }
}

/**
 * Update user achievements (unlock an achievement)
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID to unlock
 * @returns {Promise<void>}
 */
async function updateUserAchievements(userId, achievementId) {
    try {
        await firebase.firestore()
            .collection('users')
            .doc(userId)
            .update({
                achievements: firebase.firestore.FieldValue.arrayUnion(achievementId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Unlocked achievement ${achievementId} for user ${userId}`);
    } catch (error) {
        console.error('Error updating user achievements:', error);
        throw error;
    }
}

// ==================== NOTIFICATIONS ====================

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {Object} notificationData - Notification data
 * @returns {Promise<string>} - Notification ID
 */
async function createNotification(userId, notificationData) {
    try {
        const notification = {
            ...notificationData,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const notificationsRef = firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications');
        
        // ✅ Add new notification
        const docRef = await notificationsRef.add(notification);
        console.log('✅ Notification created:', docRef.id);
        
        // ✅ Keep only latest 10 notifications (delete oldest if > 10)
        const snapshot = await notificationsRef
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.size > 10) {
            console.log(`📊 Found ${snapshot.size} notifications, keeping only 10 latest`);
            
            // Get notifications to delete (oldest ones)
            const toDelete = [];
            snapshot.docs.slice(10).forEach(doc => {
                toDelete.push(doc.ref.delete());
            });
            
            await Promise.all(toDelete);
            console.log(`🗑️ Deleted ${toDelete.length} old notifications`);
        }
        
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Get user's notifications
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of notification objects
 */
async function getUserNotifications(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .orderBy('createdAt', 'desc')
            .get();
        
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Loaded ${notifications.length} notifications for user ${userId}`);
        return notifications;
    } catch (error) {
        console.error('Error getting user notifications:', error);
        throw error;
    }
}

/**
 * Mark a notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
async function markNotificationAsRead(userId, notificationId) {
    try {
        await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .doc(notificationId)
            .update({
                read: true
            });
        
        console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Cleanup old notifications (keep only latest 10)
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of deleted notifications
 */
async function cleanupOldNotifications(userId) {
    try {
        const notificationsRef = firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications');
        
        const snapshot = await notificationsRef
            .orderBy('createdAt', 'desc')
            .get();
        
        // ✅ Filter out notifications without createdAt (pending serverTimestamp)
        const validNotifications = snapshot.docs.filter(doc => doc.data().createdAt);
        
        if (validNotifications.length <= 10) {
            console.log(`✅ Notifications count: ${validNotifications.length} (no cleanup needed)`);
            return 0;
        }
        
        console.log(`🧹 Cleaning up notifications: ${validNotifications.length} total, keeping 10 latest`);
        
        // Delete oldest notifications (keep only first 10)
        const toDelete = [];
        validNotifications.slice(10).forEach(doc => {
            toDelete.push(doc.ref.delete());
        });
        
        await Promise.all(toDelete);
        console.log(`✅ Deleted ${toDelete.length} old notifications`);
        
        return toDelete.length;
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        throw error;
    }
}

// ==================== COLLABORATIVE TASKS ====================

/**
 * Get tasks shared with a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of shared task objects
 */
async function getSharedTasks(userId) {
    try {
        // Get user's friends list first
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        
        if (!userDoc.exists) {
            return [];
        }
        
        const userData = userDoc.data();
        const friends = userData.friends || [];
        
        if (friends.length === 0) {
            return [];
        }
        
        // Query tasks from each friend's collection
        const allSharedTasks = [];
        const promises = friends.map(async (friendId) => {
            try {
                const tasksSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(friendId)
                    .collection('tasks')
                    .where('sharedWith', 'array-contains', userId)
                    .get();
                
                tasksSnapshot.forEach(doc => {
                    const task = { id: doc.id, ...doc.data() };
                    // Add owner information
                    task.ownerId = friendId;
                    allSharedTasks.push(task);
                });
            } catch (error) {
                console.warn(`Failed to fetch tasks from friend ${friendId}:`, error);
            }
        });
        
        await Promise.all(promises);
        
        console.log(`✅ Loaded ${allSharedTasks.length} shared tasks for user ${userId}`);
        return allSharedTasks;
    } catch (error) {
        console.error('Error getting shared tasks:', error);
        throw error;
    }
}

/**
 * Update task collaborators
 * @param {string} ownerId - Task owner's user ID
 * @param {string} taskId - Task ID
 * @param {Array} collaborators - Array of collaborator objects
 * @returns {Promise<void>}
 */
async function updateTaskCollaborators(ownerId, taskId, collaborators) {
    try {
        await firebase.firestore()
            .collection('users')
            .doc(ownerId)
            .collection('tasks')
            .doc(taskId.toString())
            .update({
                collaborators: collaborators,
                lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('✅ Task collaborators updated:', taskId);
    } catch (error) {
        console.error('Error updating task collaborators:', error);
        throw error;
    }
}

/**
 * Add a comment to a task
 * @param {string} ownerId - Task owner's user ID
 * @param {string} taskId - Task ID
 * @param {Object} comment - Comment object with uid, text, and createdAt
 * @returns {Promise<void>}
 */
async function addTaskComment(ownerId, taskId, comment) {
    try {
        const commentWithTimestamp = {
            ...comment,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore()
            .collection('users')
            .doc(ownerId)
            .collection('tasks')
            .doc(taskId.toString())
            .update({
                comments: firebase.firestore.FieldValue.arrayUnion(commentWithTimestamp),
                lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('✅ Comment added to task:', taskId);
    } catch (error) {
        console.error('Error adding task comment:', error);
        throw error;
    }
}
