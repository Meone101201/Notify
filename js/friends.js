// ==================== FRIEND MANAGER ====================

/**
 * FriendManager class handles all friend-related operations
 * including sending/accepting/rejecting friend requests and managing friendships
 */
class FriendManager {
    constructor() {
        this.currentUser = null;
    }

    /**
     * Initialize the friend manager with current user
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
    }

    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean} - True if valid email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Find a user by email address
     * @param {string} email - Email address to search for
     * @returns {Promise<Object|null>} - User object or null if not found
     */
    async findUserByEmail(email) {
        // Validate email format first
        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }

        try {
            // Use the global findUserByEmail function from firebase-db.js
            const snapshot = await firebase.firestore()
                .collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                throw new Error('User not found');
            }
            
            const doc = snapshot.docs[0];
            return { uid: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Check if there's an existing friend request between two users
     * @param {string} fromUid - Sender user ID
     * @param {string} toUid - Recipient user ID
     * @returns {Promise<Object|null>} - Existing request or null
     */
    async checkExistingRequest(fromUid, toUid) {
        try {
            const snapshot = await firebase.firestore()
                .collection('friendRequests')
                .where('from', '==', fromUid)
                .where('to', '==', toUid)
                .where('status', '==', 'pending')
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }

            return null;
        } catch (error) {
            console.error('Error checking existing request:', error);
            throw error;
        }
    }

    /**
     * Check for mutual friend requests (both users sent requests to each other)
     * @param {string} fromUid - First user ID
     * @param {string} toUid - Second user ID
     * @returns {Promise<Object|null>} - Mutual request from toUid to fromUid, or null
     */
    async checkMutualRequests(fromUid, toUid) {
        try {
            // Check if toUid has already sent a request to fromUid
            const snapshot = await firebase.firestore()
                .collection('friendRequests')
                .where('from', '==', toUid)
                .where('to', '==', fromUid)
                .where('status', '==', 'pending')
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }

            return null;
        } catch (error) {
            console.error('Error checking mutual requests:', error);
            throw error;
        }
    }

    /**
     * Send a friend request to another user
     * @param {string} targetEmail - Email of the user to send request to
     * @returns {Promise<string>} - Request ID
     */
    async sendFriendRequest(targetEmail) {
        if (!this.currentUser) {
            handleValidationError('permission-denied', { operation: 'sendFriendRequest' });
            throw new Error('User not authenticated');
        }

        // Validate email format using error handler
        if (typeof isValidEmail !== 'undefined' && !isValidEmail(targetEmail)) {
            handleValidationError('invalid-email', { email: targetEmail });
            throw new Error('Invalid email format');
        } else if (!this.isValidEmail(targetEmail)) {
            handleValidationError('invalid-email', { email: targetEmail });
            throw new Error('Invalid email format');
        }

        try {
            // Find target user
            const targetUser = await this.findUserByEmail(targetEmail);

            if (!targetUser) {
                handleValidationError('user-not-found', { email: targetEmail });
                throw new Error('User not found');
            }

            // ✅ ใช้ฟังก์ชันร่วมกัน
            return await this._sendFriendRequestToUser(targetUser);
        } catch (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }
    }

    /**
     * ✅ ส่งคำขอเป็นเพื่อนด้วย UID (ใหม่!)
     * @param {string} targetUID - UID ของผู้ใช้ที่ต้องการเพิ่มเป็นเพื่อน
     * @returns {Promise<string>} - Request ID
     */
    async sendFriendRequestByUID(targetUID) {
        if (!this.currentUser) {
            handleValidationError('permission-denied', { operation: 'sendFriendRequestByUID' });
            throw new Error('User not authenticated');
        }

        // Validate UID format (Firebase UID มักจะยาว 28 ตัวอักษร)
        if (!targetUID || targetUID.length !== 28) {
            handleValidationError('invalid-uid', { uid: targetUID });
            throw new Error('Invalid UID format');
        }

        try {
            // Get target user by UID
            const targetUserDoc = await firebase.firestore()
                .collection('users')
                .doc(targetUID)
                .get();

            if (!targetUserDoc.exists) {
                handleValidationError('user-not-found', { uid: targetUID });
                throw new Error('User not found');
            }

            const targetUser = { uid: targetUserDoc.id, ...targetUserDoc.data() };

            // ✅ ใช้ฟังก์ชันร่วมกัน
            return await this._sendFriendRequestToUser(targetUser);
        } catch (error) {
            console.error('Error sending friend request by UID:', error);
            throw error;
        }
    }

    /**
     * ✅ ฟังก์ชันร่วมสำหรับส่งคำขอเป็นเพื่อน (ใช้ร่วมกันระหว่าง email และ UID)
     * @private
     */
    async _sendFriendRequestToUser(targetUser) {
        // Can't send request to yourself
        if (targetUser.uid === this.currentUser.uid) {
            handleValidationError('self-friend-request');
            throw new Error('Cannot send friend request to yourself');
        }

        // Check if already friends FIRST (before checking requests)
        const currentUserDoc = await firebase.firestore()
            .collection('users')
            .doc(this.currentUser.uid)
            .get();

        const friends = currentUserDoc.data()?.friends || [];
        if (friends.includes(targetUser.uid)) {
            handleValidationError('already-friends', { targetUserId: targetUser.uid });
            throw new Error('Already friends with this user');
        }

        // Check for mutual requests BEFORE checking for existing request
        // (target user already sent request to current user)
        const mutualRequest = await this.checkMutualRequests(
            this.currentUser.uid,
            targetUser.uid
        );

        if (mutualRequest) {
            // Auto-accept both requests
            console.log('Mutual request detected, auto-accepting both...');
            
            // Add both users as friends
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .update({
                    friends: firebase.firestore.FieldValue.arrayUnion(targetUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await firebase.firestore()
                .collection('users')
                .doc(targetUser.uid)
                .update({
                    friends: firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Delete the mutual request
            await firebase.firestore()
                .collection('friendRequests')
                .doc(mutualRequest.id)
                .delete();
            
            // Send notifications
            await firebase.firestore()
                .collection('users')
                .doc(targetUser.uid)
                .collection('notifications')
                .add({
                    type: 'friendAccepted',
                    title: 'Friend Request Accepted',
                    message: `${this.currentUser.displayName || this.currentUser.email} accepted your friend request`,
                    data: {
                        fromUserId: this.currentUser.uid
                    },
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('notifications')
                .add({
                    type: 'friendAccepted',
                    title: 'Friend Request Accepted',
                    message: `${targetUser.displayName || targetUser.email} is now your friend`,
                    data: {
                        fromUserId: targetUser.uid
                    },
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log('✅ Mutual friend requests auto-accepted');
            return 'mutual-accepted';
        }

        // Check for existing pending request AFTER mutual request check
        const existingRequest = await this.checkExistingRequest(
            this.currentUser.uid,
            targetUser.uid
        );

        if (existingRequest) {
            handleValidationError('duplicate-request', { targetUserId: targetUser.uid });
            throw new Error('Friend request already sent');
        }

        // Create new friend request
        const requestData = {
            from: this.currentUser.uid,
            to: targetUser.uid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await firebase.firestore()
            .collection('friendRequests')
            .add(requestData);

        // Send notification to target user
        await firebase.firestore()
            .collection('users')
            .doc(targetUser.uid)
            .collection('notifications')
            .add({
                type: 'friendRequest',
                title: 'New Friend Request',
                message: `${this.currentUser.displayName || this.currentUser.email} sent you a friend request`,
                data: {
                    fromUserId: this.currentUser.uid,
                    requestId: docRef.id
                },
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        console.log('✅ Friend request sent successfully');
        return docRef.id;
    }

    /**
     * Get pending friend requests for the current user
     * @returns {Promise<Array>} - Array of pending friend requests
     */
    async getPendingRequests() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const snapshot = await firebase.firestore()
                .collection('friendRequests')
                .where('to', '==', this.currentUser.uid)
                .where('status', '==', 'pending')
                .get();

            const requests = [];
            snapshot.forEach(doc => {
                requests.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Loaded ${requests.length} pending requests`);
            return requests;
        } catch (error) {
            console.error('Error getting pending requests:', error);
            throw error;
        }
    }

    /**
     * Accept a friend request
     * @param {string} requestId - Friend request ID
     * @returns {Promise<void>}
     */
    async acceptFriendRequest(requestId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Get the friend request
            const requestDoc = await firebase.firestore()
                .collection('friendRequests')
                .doc(requestId)
                .get();

            if (!requestDoc.exists) {
                throw new Error('Friend request not found');
            }

            const request = requestDoc.data();

            // Verify the current user is the recipient
            if (request.to !== this.currentUser.uid) {
                throw new Error('Not authorized to accept this request');
            }

            // Verify request is still pending
            if (request.status !== 'pending') {
                throw new Error('Request is no longer pending');
            }

            // Add both users to each other's friends list
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .update({
                    friends: firebase.firestore.FieldValue.arrayUnion(request.from),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await firebase.firestore()
                .collection('users')
                .doc(request.from)
                .update({
                    friends: firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Delete the friend request
            await firebase.firestore()
                .collection('friendRequests')
                .doc(requestId)
                .delete();

            // Send notification to the sender
            await firebase.firestore()
                .collection('users')
                .doc(request.from)
                .collection('notifications')
                .add({
                    type: 'friendAccepted',
                    title: 'Friend Request Accepted',
                    message: `${this.currentUser.displayName || this.currentUser.email} accepted your friend request`,
                    data: {
                        fromUserId: this.currentUser.uid
                    },
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log('✅ Friend request accepted');
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw error;
        }
    }

    /**
     * Reject a friend request
     * @param {string} requestId - Friend request ID
     * @returns {Promise<void>}
     */
    async rejectFriendRequest(requestId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Get the friend request
            const requestDoc = await firebase.firestore()
                .collection('friendRequests')
                .doc(requestId)
                .get();

            if (!requestDoc.exists) {
                throw new Error('Friend request not found');
            }

            const request = requestDoc.data();

            // Verify the current user is the recipient
            if (request.to !== this.currentUser.uid) {
                throw new Error('Not authorized to reject this request');
            }

            // Verify request is still pending
            if (request.status !== 'pending') {
                throw new Error('Request is no longer pending');
            }

            // Delete the friend request (no friendship created)
            await firebase.firestore()
                .collection('friendRequests')
                .doc(requestId)
                .delete();

            console.log('✅ Friend request rejected');
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            throw error;
        }
    }

    /**
     * Get the current user's friends list
     * @returns {Promise<Array>} - Array of friend user objects
     */
    async getFriends() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Get current user's document
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .get();

            if (!userDoc.exists) {
                return [];
            }

            const userData = userDoc.data();
            const friendIds = userData.friends || [];

            if (friendIds.length === 0) {
                return [];
            }

            // Fetch friend user data
            const friends = [];
            for (const friendId of friendIds) {
                const friendDoc = await firebase.firestore()
                    .collection('users')
                    .doc(friendId)
                    .get();

                if (friendDoc.exists) {
                    friends.push({ uid: friendDoc.id, ...friendDoc.data() });
                }
            }

            console.log(`✅ Loaded ${friends.length} friends`);
            return friends;
        } catch (error) {
            console.error('Error getting friends:', error);
            throw error;
        }
    }

    /**
     * Remove a friend from the current user's friends list
     * @param {string} friendId - Friend's user ID to remove
     * @returns {Promise<void>}
     */
    async removeFriend(friendId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Remove friendId from current user's friends array
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .update({
                    friends: firebase.firestore.FieldValue.arrayRemove(friendId),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Remove current user from friend's friends array (bidirectional)
            await firebase.firestore()
                .collection('users')
                .doc(friendId)
                .update({
                    friends: firebase.firestore.FieldValue.arrayRemove(this.currentUser.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // ✅ ลบ notifications ที่เกี่ยวข้องกับเพื่อนคนนี้ (ไม่ throw error ถ้าไม่สำเร็จ)
            try {
                // ลบ notifications ของ current user ที่มาจาก friendId
                const currentUserNotifications = await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .collection('notifications')
                    .where('data.fromUserId', '==', friendId)
                    .get();
                
                const deletePromises = [];
                currentUserNotifications.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });

                // ลบ notifications ของ friend ที่มาจาก current user
                const friendNotifications = await firebase.firestore()
                    .collection('users')
                    .doc(friendId)
                    .collection('notifications')
                    .where('data.fromUserId', '==', this.currentUser.uid)
                    .get();
                
                friendNotifications.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });

                await Promise.all(deletePromises);
                console.log('✅ Notifications cleaned up');
            } catch (notifError) {
                // ไม่ throw error ถ้าลบ notifications ไม่สำเร็จ
                console.warn('⚠️ Could not clean up notifications:', notifError.message);
            }

            console.log('✅ Friend removed successfully');
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    }

    /**
     * Setup real-time listener for friend requests
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} - Unsubscribe function
     */
    setupFriendRequestListener(callback) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const unsubscribe = firebase.firestore()
            .collection('friendRequests')
            .where('to', '==', this.currentUser.uid)
            .where('status', '==', 'pending')
            .onSnapshot(
                (snapshot) => {
                    const requests = [];
                    snapshot.forEach(doc => {
                        requests.push({ id: doc.id, ...doc.data() });
                    });
                    callback(requests);
                },
                (error) => {
                    console.error('Error in friend request listener:', error);
                }
            );

        console.log('✅ Friend request listener setup');
        return unsubscribe;
    }

    /**
     * Setup real-time listener for friends list
     * @param {Function} callback - Callback function to handle updates
     * @returns {Function} - Unsubscribe function
     */
    setupFriendsListener(callback) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const unsubscribe = firebase.firestore()
            .collection('users')
            .doc(this.currentUser.uid)
            .onSnapshot(
                async (doc) => {
                    if (!doc.exists) {
                        callback([]);
                        return;
                    }

                    const userData = doc.data();
                    const friendIds = userData.friends || [];

                    if (friendIds.length === 0) {
                        callback([]);
                        return;
                    }

                    // Fetch friend user data
                    const friends = [];
                    for (const friendId of friendIds) {
                        const friendDoc = await firebase.firestore()
                            .collection('users')
                            .doc(friendId)
                            .get();

                        if (friendDoc.exists) {
                            friends.push({ uid: friendDoc.id, ...friendDoc.data() });
                        }
                    }

                    callback(friends);
                },
                (error) => {
                    console.error('Error in friends listener:', error);
                }
            );

        console.log('✅ Friends listener setup');
        return unsubscribe;
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FriendManager };
}
