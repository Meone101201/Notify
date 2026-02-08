/**
 * Achievement Manager Module
 * Handles achievement system, points, levels, and user statistics
 */

// Achievement definitions
const ACHIEVEMENTS = [
    {
        id: 'first-task',
        name: 'First Task',
        description: 'ทำงานแรกเสร็จ',
        icon: '🎯',
        requirement: { type: 'tasksCompleted', value: 1 },
        points: 10
    },
    {
        id: 'team-player',
        name: 'Team Player',
        description: 'ช่วยเพื่อน 10 งาน',
        icon: '🤝',
        requirement: { type: 'helpedFriends', value: 10 },
        points: 50
    },
    {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'ทำงาน 5 งานก่อนกำหนด',
        icon: '⚡',
        requirement: { type: 'tasksBeforeDeadline', value: 5 },
        points: 30
    },
    {
        id: 'story-master',
        name: 'Story Master',
        description: 'สะสม 100 Story Points',
        icon: '📊',
        requirement: { type: 'points', value: 100 },
        points: 100
    },

];

/**
 * Achievement Manager Class
 * Manages user achievements, points, levels, and statistics
 */
class AchievementManager {
    constructor() {
        // Initialize with Firebase if available
        this.db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
    }

    /**
     * Add points to a user and update their level
     * @param {string} userId - User ID
     * @param {number} points - Points to add
     * @param {string} reason - Reason for adding points
     * @returns {Promise<Object>} Updated user data with new points and level
     */
    async addPoints(userId, points, reason) {
        if (!userId || typeof points !== 'number' || points < 0) {
            throw new Error('Invalid userId or points');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            
            // Use transaction to ensure atomic update
            const result = await this.db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }

                const userData = userDoc.data();
                const currentPoints = userData.points || 0;
                const newPoints = currentPoints + points;
                
                // Calculate new level using points calculator
                const newLevel = this.calculateLevel(newPoints);

                // Update user document
                transaction.update(userRef, {
                    points: newPoints,
                    level: newLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                return {
                    points: newPoints,
                    level: newLevel,
                    pointsAdded: points,
                    reason: reason
                };
            });

            console.log(`✅ Added ${points} points to user ${userId}. Reason: ${reason}`);
            return result;
        } catch (error) {
            console.error('Error adding points:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User statistics object
     */
    async getUserStats(userId) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            
            // Return stats with defaults if not present
            return {
                tasksCompleted: userData.stats?.tasksCompleted || 0,
                tasksBeforeDeadline: userData.stats?.tasksBeforeDeadline || 0,
                helpedFriends: userData.stats?.helpedFriends || 0,
                points: userData.points || 0,
                level: userData.level || 0
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Update a specific stat for a user
     * @param {string} userId - User ID
     * @param {string} statName - Name of the stat to update
     * @param {number} value - New value or increment amount
     * @param {boolean} increment - Whether to increment (true) or set (false)
     * @returns {Promise<void>}
     */
    async updateStats(userId, statName, value, increment = false) {
        if (!userId || !statName) {
            throw new Error('Invalid userId or statName');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            
            if (increment) {
                // Use transaction for atomic increment
                await this.db.runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    
                    if (!userDoc.exists) {
                        throw new Error('User not found');
                    }

                    const userData = userDoc.data();
                    const stats = userData.stats || {};
                    const currentValue = stats[statName] || 0;
                    const newValue = currentValue + value;

                    const updateData = {
                        [`stats.${statName}`]: newValue,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    transaction.update(userRef, updateData);
                });
            } else {
                // Direct update for setting values
                const updateData = {
                    [`stats.${statName}`]: value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await userRef.update(updateData);
            }
            
            console.log(`✅ Updated stat ${statName} for user ${userId}`);
        } catch (error) {
            if (error.code === 'aborted' && typeof handleConcurrencyError !== 'undefined') {
                await handleConcurrencyError(error, () => this.updateStats(userId, statName, value, increment));
            } else {
                console.error('Error updating stats:', error);
                throw error;
            }
        }
    }

    /**
     * Calculate user level from total points
     * Uses formula: Level = floor(sqrt(points / 100))
     * @param {number} points - Total points
     * @returns {number} User level
     */
    calculateLevel(points) {
        if (typeof points !== 'number' || points < 0) {
            return 0;
        }
        
        return Math.floor(Math.sqrt(points / 100));
    }

    /**
     * Calculate points needed to reach the next level
     * @param {number} currentLevel - Current user level
     * @returns {number} Points needed for next level
     */
    calculatePointsForNextLevel(currentLevel) {
        if (typeof currentLevel !== 'number' || currentLevel < 0) {
            return 100;
        }
        
        const nextLevel = currentLevel + 1;
        return nextLevel * nextLevel * 100;
    }

    /**
     * Check if an achievement requirement is met
     * @param {Object} achievement - Achievement object with requirement
     * @param {Object} stats - User statistics object
     * @returns {boolean} True if requirement is met
     */
    checkAchievementRequirement(achievement, stats) {
        if (!achievement || !achievement.requirement || !stats) {
            return false;
        }

        const { type, value } = achievement.requirement;
        
        switch (type) {
            case 'tasksCompleted':
                return stats.tasksCompleted >= value;
            case 'helpedFriends':
                return stats.helpedFriends >= value;
            case 'tasksBeforeDeadline':
                return stats.tasksBeforeDeadline >= value;
            case 'points':
                return stats.points >= value;

            default:
                return false;
        }
    }

    /**
     * Unlock an achievement for a user
     * @param {string} userId - User ID
     * @param {string} achievementId - Achievement ID to unlock
     * @returns {Promise<void>}
     */
    async unlockAchievement(userId, achievementId) {
        if (!userId || !achievementId) {
            throw new Error('Invalid userId or achievementId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            
            // Check if achievement is already unlocked
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const achievements = userData.achievements || [];
            
            if (achievements.includes(achievementId)) {
                console.log(`Achievement ${achievementId} already unlocked for user ${userId}`);
                return;
            }

            // Add achievement to user's achievements array and track notification status
            await userRef.update({
                achievements: firebase.firestore.FieldValue.arrayUnion(achievementId),
                [`achievementNotifications.${achievementId}`]: {
                    unlocked: true,
                    unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    notified: false,
                    notifiedAt: null
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Unlocked achievement ${achievementId} for user ${userId}`);
        } catch (error) {
            console.error('Error unlocking achievement:', error);
            throw error;
        }
    }

    /**
     * Mark achievement as notified
     * @param {string} userId - User ID
     * @param {string} achievementId - Achievement ID
     * @returns {Promise<void>}
     */
    async markAchievementAsNotified(userId, achievementId) {
        if (!userId || !achievementId) {
            throw new Error('Invalid userId or achievementId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            
            await userRef.update({
                [`achievementNotifications.${achievementId}.notified`]: true,
                [`achievementNotifications.${achievementId}.notifiedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Marked achievement ${achievementId} as notified for user ${userId}`);
        } catch (error) {
            console.error('Error marking achievement as notified:', error);
            throw error;
        }
    }

    /**
     * Get unnotified achievements for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of achievement IDs that haven't been notified
     */
    async getUnnotifiedAchievements(userId) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const achievementNotifications = userData.achievementNotifications || {};
            
            // Find achievements that are unlocked but not notified
            const unnotified = [];
            for (const [achievementId, notification] of Object.entries(achievementNotifications)) {
                if (notification.unlocked && !notification.notified) {
                    unnotified.push(achievementId);
                }
            }

            return unnotified;
        } catch (error) {
            console.error('Error getting unnotified achievements:', error);
            throw error;
        }
    }

    /**
     * Check and unlock achievements based on user stats
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of newly unlocked achievement IDs
     */
    async checkAndUnlockAchievements(userId) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            // Get user stats
            const stats = await this.getUserStats(userId);
            
            // Get user's current achievements
            const userDoc = await this.db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const unlockedAchievements = userData.achievements || [];
            
            const newlyUnlocked = [];

            // Check each achievement
            for (const achievement of ACHIEVEMENTS) {
                // Skip if already unlocked
                if (unlockedAchievements.includes(achievement.id)) {
                    continue;
                }

                // Check if requirement is met
                if (this.checkAchievementRequirement(achievement, stats)) {
                    await this.unlockAchievement(userId, achievement.id);
                    newlyUnlocked.push(achievement.id);
                }
            }

            if (newlyUnlocked.length > 0) {
                console.log(`✅ Unlocked ${newlyUnlocked.length} new achievements for user ${userId}`);
            }

            return newlyUnlocked;
        } catch (error) {
            console.error('Error checking and unlocking achievements:', error);
            throw error;
        }
    }

    /**
     * Get all achievements with their unlock status for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of achievements with unlocked status
     */
    async getAllAchievements(userId) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            // Get user's unlocked achievements
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const unlockedAchievements = userData.achievements || [];

            // Map all achievements with unlock status
            return ACHIEVEMENTS.map(achievement => ({
                ...achievement,
                unlocked: unlockedAchievements.includes(achievement.id)
            }));
        } catch (error) {
            console.error('Error getting all achievements:', error);
            throw error;
        }
    }



    /**
     * Setup real-time listener for user achievements
     * Listens for changes to user's achievements and stats
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} Unsubscribe function
     */
    setupAchievementsListener(userId, callback) {
        if (!userId || typeof callback !== 'function') {
            throw new Error('Invalid userId or callback');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            
            // Setup real-time listener
            const unsubscribe = userRef.onSnapshot(
                (snapshot) => {
                    if (!snapshot.exists) {
                        console.warn(`User ${userId} not found`);
                        callback({ error: 'User not found' });
                        return;
                    }

                    const userData = snapshot.data();
                    
                    // Prepare achievement data for callback
                    const achievementData = {
                        points: userData.points || 0,
                        level: userData.level || 0,
                        achievements: userData.achievements || [],
                        achievementNotifications: userData.achievementNotifications || {},  // ⬅️ เพิ่มนี้
                        stats: userData.stats || {
                            tasksCompleted: 0,
                            tasksBeforeDeadline: 0,
                            helpedFriends: 0
                        },
                        updatedAt: userData.updatedAt
                    };

                    // Call the callback with updated data
                    callback(achievementData);
                },
                (error) => {
                    console.error('Error in achievements listener:', error);
                    callback({ error: error.message });
                }
            );

            console.log(`✅ Setup achievements listener for user ${userId}`);
            return unsubscribe;
        } catch (error) {
            console.error('Error setting up achievements listener:', error);
            throw error;
        }
    }
}

// Export for use in other modules and testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ACHIEVEMENTS,
        AchievementManager
    };
}
