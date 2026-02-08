// ==================== DATA CONSISTENCY CLEANUP ====================
// Utilities for maintaining data consistency and cleaning up orphaned data

/**
 * Check if a user exists in Firestore
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if user exists
 */
async function userExists(userId) {
    try {
        const doc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        
        return doc.exists;
    } catch (error) {
        console.error('Error checking if user exists:', error);
        return false;
    }
}

/**
 * Clean up user data by removing invalid references
 * @param {string} userId - User ID to clean up
 * @returns {Promise<Object>} - Cleanup report
 */
async function cleanupUserData(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    console.log(`🧹 Starting data cleanup for user ${userId}...`);
    
    const report = {
        invalidFriendsRemoved: 0,
        invalidCollaboratorsRemoved: 0,
        orphanedRequestsRemoved: 0,
        tasksUpdated: 0
    };

    try {
        // Get user document
        const userRef = firebase.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();
        const friends = userData.friends || [];

        // 1. Remove invalid friends from friends array
        console.log('Checking friends list...');
        const validFriends = [];
        for (const friendId of friends) {
            const exists = await userExists(friendId);
            if (exists) {
                validFriends.push(friendId);
            } else {
                console.log(`  ❌ Removing invalid friend: ${friendId}`);
                report.invalidFriendsRemoved++;
            }
        }

        if (validFriends.length !== friends.length) {
            await userRef.update({
                friends: validFriends,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  ✅ Updated friends list (removed ${report.invalidFriendsRemoved} invalid friends)`);
        }

        // 2. Remove invalid collaborators from tasks
        console.log('Checking tasks for invalid collaborators...');
        const tasksSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('tasks')
            .where('visibility', '==', 'shared')
            .get();

        for (const taskDoc of tasksSnapshot.docs) {
            const task = taskDoc.data();
            const sharedWith = task.sharedWith || [];
            
            if (sharedWith.length === 0) continue;

            const validCollaborators = [];
            let hasInvalidCollaborators = false;

            for (const collaboratorId of sharedWith) {
                // Check if collaborator exists and is still a friend
                const exists = await userExists(collaboratorId);
                const isFriend = validFriends.includes(collaboratorId);

                if (exists && isFriend) {
                    validCollaborators.push(collaboratorId);
                } else {
                    console.log(`  ❌ Removing invalid collaborator ${collaboratorId} from task ${task.id}`);
                    hasInvalidCollaborators = true;
                    report.invalidCollaboratorsRemoved++;
                }
            }

            if (hasInvalidCollaborators) {
                // Determine new visibility
                const newVisibility = validCollaborators.length > 0 ? 'shared' : 'private';

                await taskDoc.ref.update({
                    sharedWith: validCollaborators,
                    visibility: newVisibility,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                report.tasksUpdated++;
                console.log(`  ✅ Updated task ${task.id} (visibility: ${newVisibility})`);
            }
        }

        // 3. Remove orphaned friend requests
        console.log('Checking for orphaned friend requests...');
        
        // Requests sent by this user
        const sentRequestsSnapshot = await firebase.firestore()
            .collection('friendRequests')
            .where('from', '==', userId)
            .where('status', '==', 'pending')
            .get();

        for (const requestDoc of sentRequestsSnapshot.docs) {
            const request = requestDoc.data();
            const recipientExists = await userExists(request.to);

            if (!recipientExists) {
                await requestDoc.ref.delete();
                report.orphanedRequestsRemoved++;
                console.log(`  ❌ Removed orphaned request to deleted user ${request.to}`);
            }
        }

        // Requests received by this user
        const receivedRequestsSnapshot = await firebase.firestore()
            .collection('friendRequests')
            .where('to', '==', userId)
            .where('status', '==', 'pending')
            .get();

        for (const requestDoc of receivedRequestsSnapshot.docs) {
            const request = requestDoc.data();
            const senderExists = await userExists(request.from);

            if (!senderExists) {
                await requestDoc.ref.delete();
                report.orphanedRequestsRemoved++;
                console.log(`  ❌ Removed orphaned request from deleted user ${request.from}`);
            }
        }

        console.log('✅ Data cleanup completed:', report);
        return report;

    } catch (error) {
        console.error('Error during data cleanup:', error);
        throw error;
    }
}

/**
 * Schedule periodic cleanup for a user
 * @param {string} userId - User ID
 * @param {number} intervalHours - Cleanup interval in hours (default: 24)
 * @returns {number} - Interval ID
 */
function schedulePeriodicCleanup(userId, intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`📅 Scheduled periodic cleanup for user ${userId} every ${intervalHours} hours`);
    
    const intervalId = setInterval(async () => {
        try {
            console.log(`⏰ Running scheduled cleanup for user ${userId}...`);
            await cleanupUserData(userId);
        } catch (error) {
            console.error('Error in scheduled cleanup:', error);
        }
    }, intervalMs);

    return intervalId;
}

/**
 * Run cleanup on user login
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cleanup report
 */
async function runCleanupOnLogin(userId) {
    console.log('🔐 Running cleanup on user login...');
    
    try {
        const report = await cleanupUserData(userId);
        
        // ✅ ลบ notifications เก่าที่มาจากคนที่ไม่ได้เป็นเพื่อนแล้ว
        try {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            const userData = userDoc.data();
            const friends = userData.friends || [];
            
            const notificationsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('notifications')
                .get();
            
            let notificationsDeleted = 0;
            const deletePromises = [];
            
            notificationsSnapshot.forEach(doc => {
                const data = doc.data();
                const fromUserId = data.data?.fromUserId;
                const notificationType = data.type;
                
                // ✅ ไม่ลบ notification ประเภท friendRequest (เพราะยังรอการตอบรับ)
                if (notificationType === 'friendRequest') {
                    return; // ข้าม
                }
                
                // ลบ notification ถ้ามาจากคนที่ไม่ได้เป็นเพื่อนแล้ว
                if (fromUserId && !friends.includes(fromUserId)) {
                    deletePromises.push(doc.ref.delete());
                    notificationsDeleted++;
                }
            });
            
            await Promise.all(deletePromises);
            
            if (notificationsDeleted > 0) {
                console.log(`🗑️ Deleted ${notificationsDeleted} old notifications`);
            }
        } catch (notifError) {
            console.warn('⚠️ Could not clean up notifications:', notifError.message);
        }
        
        if (report.invalidFriendsRemoved > 0 || 
            report.invalidCollaboratorsRemoved > 0 || 
            report.orphanedRequestsRemoved > 0) {
            
            // Show notification to user
            if (typeof showNotification !== 'undefined') {
                showNotification('ทำความสะอาดข้อมูลเสร็จสิ้น', 'success');
            }
        }
        
        return report;
    } catch (error) {
        console.error('Error running cleanup on login:', error);
        throw error;
    }
}

/**
 * Clean up all shared tasks for a user (remove unfriended collaborators)
 * @param {string} userId - User ID
 * @param {Array<string>} currentFriends - Current friends list
 * @returns {Promise<number>} - Number of tasks updated
 */
async function cleanupSharedTasks(userId, currentFriends) {
    if (!userId || !Array.isArray(currentFriends)) {
        throw new Error('Invalid userId or currentFriends');
    }

    let tasksUpdated = 0;

    try {
        const tasksSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('tasks')
            .where('visibility', '==', 'shared')
            .get();

        for (const taskDoc of tasksSnapshot.docs) {
            const task = taskDoc.data();
            const sharedWith = task.sharedWith || [];
            
            // Filter out collaborators who are no longer friends
            const validCollaborators = sharedWith.filter(collaboratorId => 
                currentFriends.includes(collaboratorId)
            );

            if (validCollaborators.length !== sharedWith.length) {
                const newVisibility = validCollaborators.length > 0 ? 'shared' : 'private';

                await taskDoc.ref.update({
                    sharedWith: validCollaborators,
                    visibility: newVisibility,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                tasksUpdated++;
                console.log(`✅ Cleaned up task ${task.id} (removed ${sharedWith.length - validCollaborators.length} collaborators)`);
            }
        }

        return tasksUpdated;
    } catch (error) {
        console.error('Error cleaning up shared tasks:', error);
        throw error;
    }
}

// ==================== EXPORTS ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        userExists,
        cleanupUserData,
        schedulePeriodicCleanup,
        runCleanupOnLogin,
        cleanupSharedTasks
    };
}
