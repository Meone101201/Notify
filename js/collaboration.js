// ==================== COLLABORATION MANAGER ====================
// Updated: 2026-02-05 - Removed global variable declarations to fix duplicate identifier error

/**
 * CollaborationManager handles task sharing and collaborative features
 */
class CollaborationManager {
    constructor() {
        this.currentUser = null;
    }

    /**
     * Initialize the collaboration manager with current user
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
    }

    /**
     * Validate that all friend IDs are in the user's friend list
     * @param {Array<string>} friendIds - Array of friend user IDs
     * @param {Array<string>} userFriends - User's friend list
     * @returns {boolean} - True if all friends are valid
     */
    validateCollaborators(friendIds, userFriends) {
        if (!Array.isArray(friendIds) || friendIds.length === 0) {
            throw new Error('Friend IDs must be a non-empty array');
        }

        if (!Array.isArray(userFriends)) {
            throw new Error('User friends must be an array');
        }

        // Check that all friendIds are in userFriends
        for (const friendId of friendIds) {
            if (!userFriends.includes(friendId)) {
                throw new Error(`User ${friendId} is not in your friend list`);
            }
        }

        return true;
    }

    /**
     * Update task visibility
     * @param {string} taskId - Task ID
     * @param {string} visibility - 'private' or 'shared'
     * @returns {Promise<void>}
     */
    async updateTaskVisibility(taskId, visibility) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (visibility !== 'private' && visibility !== 'shared') {
            throw new Error('Visibility must be either "private" or "shared"');
        }

        try {
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString())
                .update({
                    visibility: visibility,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log(`✅ Task ${taskId} visibility updated to ${visibility}`);
        } catch (error) {
            console.error('Error updating task visibility:', error);
            throw error;
        }
    }

    /**
     * Share a task with friends
     * @param {string} taskId - Task ID
     * @param {Array<string>} friendIds - Array of friend user IDs
     * @returns {Promise<void>}
     */
    async shareTask(taskId, friendIds) {
        if (!this.currentUser) {
            handleValidationError('permission-denied', { operation: 'shareTask' });
            throw new Error('User not authenticated');
        }

        // Validate that friendIds is not empty
        if (typeof validateTaskSharing !== 'undefined') {
            const validation = validateTaskSharing(friendIds);
            if (!validation.valid) {
                handleValidationError(validation.errorCode, { taskId, friendIds });
                throw new Error('Invalid task sharing data');
            }
        } else if (!friendIds || friendIds.length === 0) {
            handleValidationError('empty-friend-list', { taskId });
            throw new Error('Friend IDs must be a non-empty array');
        }

        // Get current task to check existing sharedWith list
        const taskDoc = await firebase.firestore()
            .collection('users')
            .doc(this.currentUser.uid)
            .collection('tasks')
            .doc(taskId.toString())
            .get();

        if (!taskDoc.exists) {
            throw new Error('Task not found');
        }

        const currentTask = taskDoc.data();
        const currentSharedWith = currentTask.sharedWith || [];

        // Get user's friends list
        const userFriends = await (typeof getUserFriends !== 'undefined' ? getUserFriends(this.currentUser.uid) : window.getUserFriends(this.currentUser.uid));

        // Filter out friends who are already in the sharedWith list
        const newFriendsToShare = friendIds.filter(friendId => !currentSharedWith.includes(friendId));
        
        if (newFriendsToShare.length === 0) {
            throw new Error('All selected friends are already shared with this task');
        }

        // Validate only the new collaborators
        this.validateCollaborators(newFriendsToShare, userFriends);

        // Combine existing and new shared friends
        const updatedSharedWith = [...currentSharedWith, ...newFriendsToShare];

        try {
            // ✅ Ensure task has owner field
            const taskUpdate = {
                visibility: 'shared',
                sharedWith: updatedSharedWith,
                owner: this.currentUser.uid, // ✅ Ensure owner is set
                lastModifiedBy: this.currentUser.uid,
                lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log(`📤 Sharing task ${taskId}:`, {
                owner: taskUpdate.owner,
                sharedWith: taskUpdate.sharedWith,
                newFriends: newFriendsToShare
            });
            
            // Update task with shared visibility and collaborators
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString())
                .update(taskUpdate);

            console.log(`✅ Task ${taskId} shared with ${newFriendsToShare.length} new friends (total: ${updatedSharedWith.length})`);

            // Send notifications only to new collaborators
            for (const friendId of newFriendsToShare) {
                await this.sendTaskSharedNotification(friendId, taskId);
            }
        } catch (error) {
            console.error('Error sharing task:', error);
            throw error;
        }
    }

    /**
     * Send task shared notification
     * @param {string} userId - User ID to notify
     * @param {string} taskId - Task ID
     * @returns {Promise<void>}
     */
    async sendTaskSharedNotification(userId, taskId) {
        try {
            const notificationData = {
                type: 'taskShared',
                title: 'Task Shared',
                message: `${this.currentUser.displayName || 'A user'} shared a task with you`,
                data: {
                    taskId: taskId,
                    ownerName: this.currentUser.displayName || 'Unknown'
                }
            };

            const createNotificationFn = typeof createNotification !== 'undefined' ? createNotification : window.createNotification;
            await createNotificationFn(userId, notificationData);
        } catch (error) {
            console.error('Error sending task shared notification:', error);
            // Don't throw - notification failure shouldn't break sharing
        }
    }

    /**
     * Send notification when task is unshared
     * @param {string} userId - User ID to notify
     * @param {Object} data - Notification data
     * @returns {Promise<void>}
     */
    async sendTaskUnsharedNotification(userId, data) {
        try {
            const notificationData = {
                type: 'taskUnshared',
                title: 'งานถูกยกเลิกการแชร์',
                message: `งาน "${data.taskName}" ถูกยกเลิกการแชร์แล้ว`,
                data: data
            };

            const createNotificationFn = typeof createNotification !== 'undefined' ? createNotification : window.createNotification;
            await createNotificationFn(userId, notificationData);
        } catch (error) {
            console.error('Error sending task unshared notification:', error);
            // Don't throw - notification failure shouldn't break unsharing
        }
    }

    /**
     * Unshare a task with a specific friend
     * @param {string} taskId - Task ID
     * @param {string} friendId - Friend user ID to remove
     * @returns {Promise<void>}
     */
    async unshareTask(taskId, friendId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Get the current task
            const taskDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString())
                .get();

            if (!taskDoc.exists) {
                throw new Error('Task not found');
            }

            const task = taskDoc.data();

            // Check if user is the owner
            if (task.owner !== this.currentUser.uid) {
                throw new Error('Only the task owner can unshare tasks');
            }

            // Remove friend from sharedWith array
            const updatedSharedWith = (task.sharedWith || []).filter(id => id !== friendId);

            // Determine new visibility
            const newVisibility = updatedSharedWith.length === 0 ? 'private' : 'shared';

            // Update task
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString())
                .update({
                    sharedWith: updatedSharedWith,
                    visibility: newVisibility,
                    lastModifiedBy: this.currentUser.uid,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Send notification to the friend about unsharing
            await this.sendTaskUnsharedNotification(friendId, {
                taskId: taskId.toString(),
                taskName: task.name,
                ownerName: this.currentUser.displayName || this.currentUser.email
            });

            console.log(`✅ Task ${taskId} unshared with ${friendId}. New visibility: ${newVisibility}`);
            
            // Update local STATE to remove shared task from friend's view
            this.removeSharedTaskFromLocalState(taskId, friendId);
            
        } catch (error) {
            console.error('Error unsharing task:', error);
            throw error;
        }
    }

    /**
     * Remove shared task from local state when unshared
     */
    removeSharedTaskFromLocalState(taskId, friendId) {
        // If current user is the friend who lost access, remove the task
        if (STATE.currentUser && STATE.currentUser.uid === friendId) {
            STATE.tasks = STATE.tasks.filter(task => task.id !== parseInt(taskId));
            renderTasks();
            updateStats();
            showNotification('งานถูกยกเลิกการแชร์แล้ว', 'info');
        } else {
            // If current user is the owner, just re-render to update collaborator list
            renderTasks();
        }
    }

    /**
     * Add a comment to a task
     * @param {string} taskId - Task ID
     * @param {string} commentText - Comment text
     * @param {string} ownerId - Task owner's user ID (optional, defaults to current user)
     * @returns {Promise<void>}
     */
    async addComment(taskId, commentText, ownerId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (!commentText || commentText.trim().length === 0) {
            throw new Error('Comment text cannot be empty');
        }

        const taskOwnerId = ownerId || this.currentUser.uid;

        try {
            const comment = {
                uid: this.currentUser.uid,
                text: commentText.trim(),
                createdAt: new Date().toISOString() // ✅ Use ISO string instead of serverTimestamp
            };

            await firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString())
                .update({
                    comments: firebase.firestore.FieldValue.arrayUnion(comment),
                    lastModifiedBy: this.currentUser.uid,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log(`✅ Comment added to task ${taskId}`);
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    /**
     * Get comments for a task
     * @param {string} taskId - Task ID
     * @param {string} ownerId - Task owner's user ID (optional, defaults to current user)
     * @returns {Promise<Array>} - Array of comments sorted by createdAt
     */
    async getComments(taskId, ownerId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const taskOwnerId = ownerId || this.currentUser.uid;

        try {
            const taskDoc = await firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString())
                .get();

            if (!taskDoc.exists) {
                throw new Error('Task not found');
            }

            const task = taskDoc.data();
            const comments = task.comments || [];

            // Sort comments by createdAt in ascending order (chronological)
            return comments.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateA - dateB;
            });
        } catch (error) {
            console.error('Error getting comments:', error);
            throw error;
        }
    }

    /**
     * Edit a comment in a task
     * @param {string} taskId - Task ID
     * @param {number} commentIndex - Index of the comment to edit
     * @param {string} newText - New comment text
     * @param {string} ownerId - Task owner's user ID (optional, defaults to current user)
     * @returns {Promise<void>}
     */
    async editComment(taskId, commentIndex, newText, ownerId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (!newText || newText.trim().length === 0) {
            throw new Error('Comment text cannot be empty');
        }

        const taskOwnerId = ownerId || this.currentUser.uid;

        try {
            const taskRef = firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString());

            // Use transaction to ensure atomic update
            await firebase.firestore().runTransaction(async (transaction) => {
                const taskDoc = await transaction.get(taskRef);

                if (!taskDoc.exists) {
                    throw new Error('Task not found');
                }

                const task = taskDoc.data();
                const comments = task.comments || [];

                if (commentIndex < 0 || commentIndex >= comments.length) {
                    throw new Error('Invalid comment index');
                }

                // Check if user is the comment author
                if (comments[commentIndex].uid !== this.currentUser.uid) {
                    throw new Error('You can only edit your own comments');
                }

                // Update the comment
                comments[commentIndex].text = newText.trim();
                comments[commentIndex].editedAt = new Date().toISOString(); // ✅ Use ISO string

                transaction.update(taskRef, {
                    comments: comments,
                    lastModifiedBy: this.currentUser.uid,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            console.log(`✅ Comment ${commentIndex} edited in task ${taskId}`);
        } catch (error) {
            console.error('Error editing comment:', error);
            throw error;
        }
    }

    /**
     * Delete a comment from a task
     * @param {string} taskId - Task ID
     * @param {number} commentIndex - Index of the comment to delete
     * @param {string} ownerId - Task owner's user ID (optional, defaults to current user)
     * @returns {Promise<void>}
     */
    async deleteComment(taskId, commentIndex, ownerId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const taskOwnerId = ownerId || this.currentUser.uid;

        try {
            const taskRef = firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString());

            // Use transaction to ensure atomic update
            await firebase.firestore().runTransaction(async (transaction) => {
                const taskDoc = await transaction.get(taskRef);

                if (!taskDoc.exists) {
                    throw new Error('Task not found');
                }

                const task = taskDoc.data();
                const comments = task.comments || [];

                if (commentIndex < 0 || commentIndex >= comments.length) {
                    throw new Error('Invalid comment index');
                }

                // Check if user is the comment author or task owner
                const isAuthor = comments[commentIndex].uid === this.currentUser.uid;
                const isOwner = task.owner === this.currentUser.uid;

                if (!isAuthor && !isOwner) {
                    throw new Error('You can only delete your own comments or comments on your tasks');
                }

                // Remove the comment
                comments.splice(commentIndex, 1);

                transaction.update(taskRef, {
                    comments: comments,
                    lastModifiedBy: this.currentUser.uid,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            console.log(`✅ Comment ${commentIndex} deleted from task ${taskId}`);
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    /**
     * Update a subtask in a shared task
     * @param {string} taskId - Task ID
     * @param {number} subtaskIndex - Index of the subtask to update
     * @param {boolean} completed - New completed status
     * @param {string} ownerId - Task owner's user ID (optional, defaults to current user)
     * @returns {Promise<void>}
     */
    async updateSharedSubtask(taskId, subtaskIndex, completed, ownerId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const taskOwnerId = ownerId || this.currentUser.uid;

        try {
            const taskRef = firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString());

            // Use transaction to handle concurrent modifications
            await firebase.firestore().runTransaction(async (transaction) => {
                const taskDoc = await transaction.get(taskRef);

                if (!taskDoc.exists) {
                    throw new Error('Task not found');
                }

                const task = taskDoc.data();

                // Validate subtask index
                if (!task.subtasks || subtaskIndex < 0 || subtaskIndex >= task.subtasks.length) {
                    throw new Error('Invalid subtask index');
                }

                // Update the subtask
                task.subtasks[subtaskIndex].completed = completed;

                // Update the task with modification tracking
                transaction.update(taskRef, {
                    subtasks: task.subtasks,
                    lastModifiedBy: this.currentUser.uid,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            console.log(`✅ Subtask ${subtaskIndex} updated in task ${taskId}`);
        } catch (error) {
            if (error.code === 'aborted' && typeof handleConcurrencyError !== 'undefined') {
                await handleConcurrencyError(error, () => this.updateSharedSubtask(taskId, subtaskIndex, completed, ownerId));
            } else {
                console.error('Error updating shared subtask:', error);
                throw error;
            }
        }
    }

    /**
     * Check if a user can edit a task
     * @param {Object} task - Task object
     * @param {string} userId - User ID to check
     * @param {boolean} throwError - Whether to throw error on permission denial
     * @returns {boolean} - True if user can edit
     */
    canUserEditTask(task, userId, throwError = false) {
        if (!task || !userId) {
            if (throwError) {
                handlePermissionError('permission-denied', { 
                    operation: 'editTask',
                    taskId: task?.id 
                });
            }
            return false;
        }

        // Owner can always edit
        if (task.owner === userId) {
            return true;
        }

        // Collaborators can edit if they're in the sharedWith array
        if (task.sharedWith && Array.isArray(task.sharedWith)) {
            const canEdit = task.sharedWith.includes(userId);
            if (!canEdit && throwError) {
                handlePermissionError('not-collaborator', { 
                    operation: 'editTask',
                    taskId: task.id,
                    userId 
                });
            }
            return canEdit;
        }

        if (throwError) {
            handlePermissionError('not-collaborator', { 
                operation: 'editTask',
                taskId: task.id,
                userId 
            });
        }
        return false;
    }

    /**
     * Check if a user is the task owner
     * @param {Object} task - Task object
     * @param {string} userId - User ID to check
     * @returns {boolean} - True if user is the owner
     */
    isTaskOwner(task, userId) {
        if (!task || !userId) {
            return false;
        }

        return task.owner === userId;
    }

    /**
     * Check if a user can delete a task
     * @param {Object} task - Task object
     * @param {string} userId - User ID to check
     * @param {boolean} throwError - Whether to throw error on permission denial
     * @returns {boolean} - True if user can delete (only owner can delete)
     */
    canDeleteTask(task, userId, throwError = false) {
        // Only the owner can delete tasks
        const isOwner = this.isTaskOwner(task, userId);
        
        if (!isOwner && throwError) {
            handlePermissionError('not-owner', { 
                operation: 'deleteTask',
                taskId: task?.id,
                userId 
            });
        }
        
        return isOwner;
    }

    /**
     * Get tasks shared with the current user
     * @returns {Promise<Array>} - Array of tasks shared with the user
     */
    async getSharedWithMeTasks() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Use the getSharedTasks function from firebase-db
            const getSharedTasksFn = typeof getSharedTasks !== 'undefined' ? getSharedTasks : window.getSharedTasks;
            if (getSharedTasksFn) {
                return await getSharedTasksFn(this.currentUser.uid);
            }

            // Fallback implementation using collectionGroup
            const snapshot = await firebase.firestore()
                .collectionGroup('tasks')
                .where('sharedWith', 'array-contains', this.currentUser.uid)
                .get();

            const tasks = [];
            snapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Loaded ${tasks.length} tasks shared with user`);
            return tasks;
        } catch (error) {
            console.error('Error getting shared tasks:', error);
            throw error;
        }
    }

    /**
     * Get tasks that the current user has shared with others
     * @returns {Promise<Array>} - Array of tasks owned by user and shared with others
     */
    async getMySharedTasks() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .where('visibility', '==', 'shared')
                .get();

            const tasks = [];
            snapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Loaded ${tasks.length} tasks shared by user`);
            return tasks;
        } catch (error) {
            console.error('Error getting my shared tasks:', error);
            throw error;
        }
    }

    /**
     * Finalize task completion - awards points and locks the task
     * Only the task owner can finalize
     * @param {string} taskId - Task ID
     * @returns {Promise<void>}
     */
    async finalizeTaskCompletion(taskId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const taskRef = firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString());

            const taskDoc = await taskRef.get();

            if (!taskDoc.exists) {
                throw new Error('Task not found');
            }

            const task = taskDoc.data();

            // Check if user is the owner
            if (task.owner !== this.currentUser.uid) {
                throw new Error('Only the task owner can finalize task completion');
            }

            // Check if task is already finalized
            if (task.finalized) {
                throw new Error('Task is already finalized');
            }

            // Check if task is marked as completed
            if (!task.completed) {
                throw new Error('Task must be marked as completed before finalizing');
            }

            const finalizedDate = new Date();

            // Calculate points for owner
            const ownerPoints = this.calculateFinalPoints(task, finalizedDate, true);

            // Calculate points for collaborators
            const collaboratorPoints = {};
            if (task.sharedWith && task.sharedWith.length > 0) {
                for (const collaboratorId of task.sharedWith) {
                    collaboratorPoints[collaboratorId] = this.calculateFinalPoints(task, finalizedDate, false);
                }
            }

            // Update task as finalized
            await taskRef.update({
                finalized: true,
                finalizedAt: firebase.firestore.FieldValue.serverTimestamp(),
                finalizedBy: this.currentUser.uid,
                pointsAwarded: {
                    owner: ownerPoints,
                    collaborators: collaboratorPoints
                }
            });

            // Award points to owner
            if (typeof AchievementManager !== 'undefined') {
                const achievementManager = new AchievementManager();
                
                // Add points
                await achievementManager.addPoints(
                    this.currentUser.uid,
                    ownerPoints,
                    `Finalized task: ${task.name}`
                );
                
                // ✅ Update stats (increment = true)
                await achievementManager.updateStats(this.currentUser.uid, 'tasksCompleted', 1, true);
                
                // Check if completed before deadline
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    if (finalizedDate < dueDate) {
                        await achievementManager.updateStats(this.currentUser.uid, 'tasksBeforeDeadline', 1, true);
                    }
                }
                
                // Check and unlock achievements
                await achievementManager.checkAndUnlockAchievements(this.currentUser.uid);
            }

            // Award points to collaborators and send notifications
            for (const collaboratorId of Object.keys(collaboratorPoints)) {
                const points = collaboratorPoints[collaboratorId];
                
                // Award points
                if (typeof AchievementManager !== 'undefined') {
                    const achievementManager = new AchievementManager();
                    
                    // Add points
                    await achievementManager.addPoints(
                        collaboratorId,
                        points,
                        `Helped complete task: ${task.name}`
                    );
                    
                    // ✅ Update stats for collaborator (increment = true)
                    await achievementManager.updateStats(collaboratorId, 'tasksCompleted', 1, true);
                    await achievementManager.updateStats(collaboratorId, 'helpedFriends', 1, true);
                    
                    // ✅ Check if completed before deadline (same as owner)
                    if (task.dueDate) {
                        const dueDate = new Date(task.dueDate);
                        if (finalizedDate < dueDate) {
                            await achievementManager.updateStats(collaboratorId, 'tasksBeforeDeadline', 1, true);
                        }
                    }
                    
                    // Check and unlock achievements for collaborator
                    await achievementManager.checkAndUnlockAchievements(collaboratorId);
                }

                // Send notification
                await this.sendTaskFinalizedNotification(collaboratorId, task, points);
            }

            console.log(`✅ Task ${taskId} finalized. Owner: ${ownerPoints} pts, Collaborators: ${JSON.stringify(collaboratorPoints)}`);
        } catch (error) {
            console.error('Error finalizing task:', error);
            throw error;
        }
    }

    /**
     * Calculate final points for task completion
     * @param {Object} task - Task object
     * @param {Date} finalizedDate - Date when task was finalized
     * @param {boolean} isOwner - Whether calculating for owner or collaborator
     * @returns {number} Points to award
     */
    calculateFinalPoints(task, finalizedDate, isOwner) {
        let points = 0;

        if (isOwner) {
            // Owner gets full story points
            points = task.storyPoint || 0;

            // Early completion bonus (10%)
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                if (finalizedDate < dueDate) {
                    points += Math.floor(task.storyPoint * 0.1);
                }
            }
        } else {
            // Collaborators get 20% of story points (rounded up, minimum 1)
            const basePoints = (task.storyPoint || 0) * 0.2;
            points = Math.max(Math.ceil(basePoints), 1);
        }

        return points;
    }

    /**
     * Send task finalized notification
     * @param {string} userId - User ID to notify
     * @param {Object} task - Task object
     * @param {number} points - Points awarded
     * @returns {Promise<void>}
     */
    async sendTaskFinalizedNotification(userId, task, points) {
        try {
            const notificationData = {
                type: 'taskFinalized',
                title: '🎉 งานเสร็จสมบูรณ์',
                message: `งาน "${task.name}" เสร็จสมบูรณ์แล้ว! คุณได้รับ ${points} คะแนน`,
                data: {
                    taskId: task.id || task.taskId,
                    taskName: task.name,
                    points: points,
                    ownerName: this.currentUser.displayName || this.currentUser.email
                }
            };

            const createNotificationFn = typeof createNotification !== 'undefined' ? createNotification : window.createNotification;
            await createNotificationFn(userId, notificationData);
        } catch (error) {
            console.error('Error sending task finalized notification:', error);
            // Don't throw - notification failure shouldn't break finalization
        }
    }

    /**
     * Setup real-time listener for shared tasks
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} - Unsubscribe function
     */
    setupSharedTasksListener(callback) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        try {
            // Get current user's friends first, then setup listeners for their tasks
            const userRef = firebase.firestore().collection('users').doc(this.currentUser.uid);
            
            let taskListeners = new Map(); // Map of friendId -> unsubscriber
            let tasksByFriend = new Map(); // Map of friendId -> tasks array
            
            const mergeAndCallback = () => {
                // Merge all tasks from all friends
                const allTasks = [];
                tasksByFriend.forEach((tasks, friendId) => {
                    allTasks.push(...tasks);
                });
                console.log(`📦 Merged tasks from ${tasksByFriend.size} friends: ${allTasks.length} total`);
                callback(allTasks);
            };
            
            const unsubscribe = userRef.onSnapshot(
                async (userDoc) => {
                    if (!userDoc.exists) {
                        // Clean up all listeners
                        taskListeners.forEach(unsubscriber => unsubscriber());
                        taskListeners.clear();
                        tasksByFriend.clear();
                        callback([]);
                        return;
                    }
                    
                    const userData = userDoc.data();
                    const friends = userData.friends || [];
                    
                    if (friends.length === 0) {
                        // Clean up all listeners
                        taskListeners.forEach(unsubscriber => unsubscriber());
                        taskListeners.clear();
                        tasksByFriend.clear();
                        callback([]);
                        return;
                    }
                    
                    // Remove listeners for friends who are no longer friends
                    const currentFriendIds = new Set(friends);
                    taskListeners.forEach((unsubscriber, friendId) => {
                        if (!currentFriendIds.has(friendId)) {
                            console.log(`🗑️ Removing listener for ex-friend: ${friendId}`);
                            unsubscriber();
                            taskListeners.delete(friendId);
                            tasksByFriend.delete(friendId);
                        }
                    });
                    
                    // Setup listeners for new friends
                    friends.forEach(friendId => {
                        // ✅ Skip if friendId is the current user (prevent duplicate own tasks)
                        if (friendId === this.currentUser.uid) {
                            console.log(`⏭️ Skipping listener for self: ${friendId}`);
                            return;
                        }
                        
                        if (taskListeners.has(friendId)) {
                            return; // Already listening to this friend
                        }
                        
                        console.log(`👂 Setting up listener for friend: ${friendId}`);
                        
                        const friendTasksRef = firebase.firestore()
                            .collection('users')
                            .doc(friendId)
                            .collection('tasks')
                            .where('sharedWith', 'array-contains', this.currentUser.uid);
                        
                        const taskUnsubscriber = friendTasksRef.onSnapshot(
                            (snapshot) => {
                                console.log(`📨 Received ${snapshot.size} tasks from friend ${friendId}`);
                                
                                // ✅ Debug: Log each task
                                snapshot.forEach(doc => {
                                    const taskData = doc.data();
                                    console.log(`  📄 Task ${doc.id}:`, {
                                        name: taskData.name,
                                        owner: taskData.owner,
                                        sharedWith: taskData.sharedWith,
                                        visibility: taskData.visibility
                                    });
                                });
                                
                                // Update tasks for this friend
                                const friendTasks = [];
                                snapshot.forEach(doc => {
                                    const task = { id: doc.id, ...doc.data() };
                                    // ✅ Double-check: only add tasks that are NOT owned by current user
                                    if (task.owner !== this.currentUser.uid) {
                                        friendTasks.push(task);
                                        console.log(`  ✅ Added task ${task.id} from friend ${friendId}`);
                                    } else {
                                        console.log(`  ⏭️ Skipped own task ${task.id}`);
                                    }
                                });
                                
                                tasksByFriend.set(friendId, friendTasks);
                                
                                // Merge and callback
                                mergeAndCallback();
                            },
                            (error) => {
                                console.error(`❌ Error listening to tasks from friend ${friendId}:`, error);
                                // Remove this friend's tasks on error
                                tasksByFriend.delete(friendId);
                                mergeAndCallback();
                            }
                        );
                        
                        taskListeners.set(friendId, taskUnsubscriber);
                    });
                    
                    // If no changes to friends, just merge current data
                    if (taskListeners.size > 0) {
                        mergeAndCallback();
                    }
                },
                (error) => {
                    console.error('Error in shared tasks listener:', error);
                    callback([]);
                }
            );

            console.log('✅ Shared tasks listener setup with real-time task updates');
            
            // Return combined unsubscriber
            return () => {
                unsubscribe();
                taskListeners.forEach(unsubscriber => unsubscriber());
                taskListeners.clear();
                tasksByFriend.clear();
            };
        } catch (error) {
            console.error('Error setting up shared tasks listener:', error);
            throw error;
        }
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    // Import required functions for Node.js environment
    const db = require('./firebase-db.js');
    const getUserFriends = db.getUserFriends;
    const createNotification = db.createNotification;
    const getSharedTasks = db.getSharedTasks;
    
    module.exports = { 
        CollaborationManager,
        getUserFriends,
        createNotification,
        getSharedTasks
    };
}
