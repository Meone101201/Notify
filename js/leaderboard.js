/**
 * Leaderboard Manager Module
 * Handles leaderboard display and ranking calculations
 */

/**
 * LeaderboardManager class
 * Manages leaderboard data, rankings, and real-time updates
 */
class LeaderboardManager {
    constructor() {
        // Initialize with Firebase if available
        this.db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
    }

    /**
     * Get leaderboard data for a user and their friends
     * Fetches user and all friends' data, sorts by points, calculates ranks
     * @param {string} userId - User ID
     * @param {boolean} limitResults - Whether to limit results to top 50 (default: true)
     * @returns {Promise<Array>} Sorted leaderboard array with rank information
     */
    async getLeaderboard(userId, limitResults = true) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            // Get current user's data
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();
            const friendIds = userData.friends || [];

            // Collect all user data (current user + friends)
            const allUsers = [];
            
            // Add current user
            allUsers.push({
                userId: userId,
                displayName: userData.displayName || userData.email || 'Unknown',
                photoURL: userData.photoURL || '',
                points: userData.points || 0,
                level: userData.level || 0,
                achievementCount: (userData.achievements || []).length,
                isCurrentUser: true
            });

            // Fetch all friends' data
            for (const friendId of friendIds) {
                try {
                    const friendDoc = await this.db.collection('users').doc(friendId).get();
                    
                    if (friendDoc.exists) {
                        const friendData = friendDoc.data();
                        allUsers.push({
                            userId: friendId,
                            displayName: friendData.displayName || friendData.email || 'Unknown',
                            photoURL: friendData.photoURL || '',
                            points: friendData.points || 0,
                            level: friendData.level || 0,
                            achievementCount: (friendData.achievements || []).length,
                            isCurrentUser: false
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to fetch friend ${friendId}:`, error);
                    // Continue with other friends
                }
            }

            // Sort by points descending
            allUsers.sort((a, b) => b.points - a.points);

            // Calculate ranks
            let currentRank = 1;
            for (let i = 0; i < allUsers.length; i++) {
                // Handle ties: users with same points get same rank
                if (i > 0 && allUsers[i].points < allUsers[i - 1].points) {
                    currentRank = i + 1;
                }
                allUsers[i].rank = currentRank;
            }

            // Limit results if requested and list is large
            let finalResults = allUsers;
            if (limitResults && typeof limitLeaderboard !== 'undefined') {
                finalResults = limitLeaderboard(allUsers);
            } else if (limitResults && allUsers.length > 50) {
                // Fallback: ensure current user is included even if not in top 50
                const top50 = allUsers.slice(0, 50);
                const currentUserInTop50 = top50.some(u => u.isCurrentUser);
                
                if (!currentUserInTop50) {
                    const currentUser = allUsers.find(u => u.isCurrentUser);
                    if (currentUser) {
                        top50.push(currentUser);
                    }
                }
                
                finalResults = top50;
            }

            console.log(`✅ Generated leaderboard with ${finalResults.length} users (total: ${allUsers.length})`);
            return finalResults;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get the rank of a specific user
     * @param {string} userId - User ID
     * @returns {Promise<number>} User's rank on the leaderboard
     */
    async getUserRank(userId) {
        if (!userId) {
            throw new Error('Invalid userId');
        }

        try {
            // Get full leaderboard
            const leaderboard = await this.getLeaderboard(userId);
            
            // Find current user's entry
            const userEntry = leaderboard.find(entry => entry.userId === userId);
            
            if (!userEntry) {
                throw new Error('User not found in leaderboard');
            }

            return userEntry.rank;
        } catch (error) {
            console.error('Error getting user rank:', error);
            throw error;
        }
    }

    /**
     * Setup real-time listener for leaderboard updates
     * Listens for changes to user and friends' points/achievements
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function to handle leaderboard updates
     * @returns {Function} Unsubscribe function
     */
    setupLeaderboardListener(userId, callback) {
        if (!userId || typeof callback !== 'function') {
            throw new Error('Invalid userId or callback');
        }

        if (!this.db) {
            throw new Error('Firebase not initialized');
        }

        try {
            // First, get the user's friends list to know who to listen to
            const userRef = this.db.collection('users').doc(userId);
            
            // Setup listener on the user document to track friends list changes
            const unsubscribe = userRef.onSnapshot(
                async (snapshot) => {
                    if (!snapshot.exists) {
                        console.warn(`User ${userId} not found`);
                        callback({ error: 'User not found' });
                        return;
                    }

                    try {
                        // Get updated leaderboard data
                        const leaderboard = await this.getLeaderboard(userId);
                        
                        // Call the callback with updated leaderboard
                        callback(leaderboard);
                    } catch (error) {
                        console.error('Error updating leaderboard:', error);
                        callback({ error: error.message });
                    }
                },
                (error) => {
                    console.error('Error in leaderboard listener:', error);
                    callback({ error: error.message });
                }
            );

            console.log(`✅ Setup leaderboard listener for user ${userId}`);
            return unsubscribe;
        } catch (error) {
            console.error('Error setting up leaderboard listener:', error);
            throw error;
        }
    }
}

// Export for use in other modules and testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LeaderboardManager
    };
}
