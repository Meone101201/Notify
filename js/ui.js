// ==================== UI FUNCTIONS ====================

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function initializeEventListeners() {
    // Form submission
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    
    // Preview updates
    document.getElementById('difficulty').addEventListener('change', updatePreview);
    document.getElementById('workload').addEventListener('change', updatePreview);
    document.getElementById('risk').addEventListener('change', updatePreview);
    
    // Subtask input
    document.getElementById('subtaskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask();
        }
    });
}

function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== FRIENDS PAGE NAVIGATION ====================

function showFriendsPage() {
    // Hide tasks page
    document.getElementById('tasksPage').style.display = 'none';
    // Show friends page
    document.getElementById('friendsPage').style.display = 'block';
    // Hide achievements page
    const achievementsPage = document.getElementById('achievementsPage');
    if (achievementsPage) {
        achievementsPage.style.display = 'none';
    }
    // Hide leaderboard page
    const leaderboardPage = document.getElementById('leaderboardPage');
    if (leaderboardPage) {
        leaderboardPage.style.display = 'none';
    }
    
    // Update navigation buttons
    document.getElementById('navTasks').classList.remove('nav-btn-active');
    document.getElementById('navFriends').classList.add('nav-btn-active');
    
    const navAchievements = document.getElementById('navAchievements');
    if (navAchievements) {
        navAchievements.classList.remove('nav-btn-active');
    }
    
    const navLeaderboard = document.getElementById('navLeaderboard');
    if (navLeaderboard) {
        navLeaderboard.classList.remove('nav-btn-active');
    }
    
    // Render friends data
    renderFriendsList();
    renderPendingRequests();
}

function showTasksPage() {
    // Show tasks page
    document.getElementById('tasksPage').style.display = 'block';
    // Hide friends page
    document.getElementById('friendsPage').style.display = 'none';
    // Hide achievements page
    const achievementsPage = document.getElementById('achievementsPage');
    if (achievementsPage) {
        achievementsPage.style.display = 'none';
    }
    // Hide leaderboard page
    const leaderboardPage = document.getElementById('leaderboardPage');
    if (leaderboardPage) {
        leaderboardPage.style.display = 'none';
    }
    
    // Update navigation buttons
    document.getElementById('navTasks').classList.add('nav-btn-active');
    document.getElementById('navFriends').classList.remove('nav-btn-active');
    
    const navAchievements = document.getElementById('navAchievements');
    if (navAchievements) {
        navAchievements.classList.remove('nav-btn-active');
    }
    
    const navLeaderboard = document.getElementById('navLeaderboard');
    if (navLeaderboard) {
        navLeaderboard.classList.remove('nav-btn-active');
    }
}

// ==================== FRIEND REQUEST FORM ====================

async function handleFriendRequestSubmit(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('friendEmail');
    const input = emailInput.value.trim();
    
    if (!input) {
        showNotification('กรุณากรอกอีเมลหรือ UID', 'error');
        return;
    }
    
    // Check if user is logged in
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    // ✅ ตรวจสอบว่าเป็น UID หรือ Email
    const isUID = input.length === 28 && !input.includes('@');
    
    // Check if trying to add self
    if (input === STATE.currentUser.email || input === STATE.currentUser.uid) {
        showNotification('คุณไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้', 'error');
        return;
    }
    
    try {
        // Use FriendManager to send request
        if (typeof window.friendManager !== 'undefined') {
            if (isUID) {
                // ✅ ส่งด้วย UID
                await window.friendManager.sendFriendRequestByUID(input);
            } else {
                // ส่งด้วย Email (แบบเดิม)
                await window.friendManager.sendFriendRequest(input);
            }
            showNotification('ส่งคำขอเป็นเพื่อนสำเร็จ', 'success');
            emailInput.value = '';
        } else {
            showNotification('ระบบเพื่อนยังไม่พร้อมใช้งาน', 'error');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        
        // Show user-friendly error messages
        if (error.message.includes('not found')) {
            showNotification(isUID ? 'ไม่พบผู้ใช้ที่มี UID นี้' : 'ไม่พบผู้ใช้ที่มีอีเมลนี้', 'error');
        } else if (error.message.includes('already friends')) {
            showNotification('คุณเป็นเพื่อนกับผู้ใช้นี้อยู่แล้ว', 'info');
        } else if (error.message.includes('already sent')) {
            showNotification('คุณได้ส่งคำขอไปแล้ว', 'info');
        } else if (error.message.includes('invalid email')) {
            showNotification('รูปแบบอีเมลไม่ถูกต้อง', 'error');
        } else {
            showNotification('เกิดข้อผิดพลาดในการส่งคำขอ', 'error');
        }
    }
}

// ✅ ฟังก์ชันคัดลอก UID
function copyMyUID() {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const uid = STATE.currentUser.uid;
    const uidElement = document.getElementById('myUID');
    
    // Copy to clipboard
    navigator.clipboard.writeText(uid).then(() => {
        showNotification('คัดลอก UID สำเร็จ!', 'success');
        
        // Visual feedback
        uidElement.style.background = '#d4edda';
        setTimeout(() => {
            uidElement.style.background = 'white';
        }, 500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('ไม่สามารถคัดลอกได้', 'error');
    });
}

// ✅ อัพเดท UID เมื่อล็อกอิน
function updateMyUID() {
    const uidElement = document.getElementById('myUID');
    if (uidElement && STATE.currentUser) {
        uidElement.textContent = STATE.currentUser.uid;
    }
}

function initializeFriendsEventListeners() {
    // Friend request form submission
    const friendRequestForm = document.getElementById('friendRequestForm');
    if (friendRequestForm) {
        friendRequestForm.addEventListener('submit', handleFriendRequestSubmit);
    }
    
    // ✅ อัพเดท UID เมื่อเปิดหน้า Friends
    updateMyUID();
}

// ==================== FRIEND ACTION HANDLERS ====================

async function handleAcceptRequest(requestId) {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    try {
        if (typeof window.friendManager !== 'undefined') {
            await window.friendManager.acceptFriendRequest(requestId);
            showNotification('ยอมรับคำขอเป็นเพื่อนสำเร็จ', 'success');
            // Re-render to update UI
            renderPendingRequests();
            renderFriendsList();
        } else {
            showNotification('ระบบเพื่อนยังไม่พร้อมใช้งาน', 'error');
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showNotification('เกิดข้อผิดพลาดในการยอมรับคำขอ', 'error');
    }
}

async function handleRejectRequest(requestId) {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    try {
        if (typeof window.friendManager !== 'undefined') {
            await window.friendManager.rejectFriendRequest(requestId);
            showNotification('ปฏิเสธคำขอเป็นเพื่อนสำเร็จ', 'success');
            // Re-render to update UI
            renderPendingRequests();
        } else {
            showNotification('ระบบเพื่อนยังไม่พร้อมใช้งาน', 'error');
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showNotification('เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
    }
}

async function handleRemoveFriend(friendId) {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    // Confirm before removing
    const friend = STATE.friends?.find(f => f.uid === friendId);
    const friendName = friend?.displayName || friend?.email || 'เพื่อนคนนี้';
    
    if (!confirm(`คุณต้องการลบ ${friendName} ออกจากรายชื่อเพื่อนหรือไม่?`)) {
        return;
    }
    
    try {
        if (typeof window.friendManager !== 'undefined') {
            await window.friendManager.removeFriend(friendId);
            showNotification('ลบเพื่อนสำเร็จ', 'success');
            // Re-render to update UI
            renderFriendsList();
        } else {
            showNotification('ระบบเพื่อนยังไม่พร้อมใช้งาน', 'error');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification('เกิดข้อผิดพลาดในการลบเพื่อน', 'error');
    }
}

// ==================== REAL-TIME LISTENERS SETUP ====================

// Store unsubscribe functions for cleanup
const LISTENER_UNSUBSCRIBERS = {
    friendRequests: null,
    friends: null,
    ownTasks: null,
    sharedTasks: null,
    achievements: null,
    leaderboard: null,
    notifications: null
};

/**
 * Clean up all real-time listeners
 */
function cleanupRealtimeListeners() {
    console.log('🧹 Cleaning up real-time listeners...');
    
    Object.keys(LISTENER_UNSUBSCRIBERS).forEach(key => {
        if (typeof LISTENER_UNSUBSCRIBERS[key] === 'function') {
            try {
                LISTENER_UNSUBSCRIBERS[key]();
                LISTENER_UNSUBSCRIBERS[key] = null;
                console.log(`✅ Cleaned up ${key} listener`);
            } catch (error) {
                console.error(`Error cleaning up ${key} listener:`, error);
            }
        }
    });
    
    console.log('✅ All listeners cleaned up');
}

function setupFriendsRealtimeListeners() {
    if (!STATE.currentUser) {
        console.log('User not logged in, skipping friends listeners setup');
        return;
    }
    
    if (typeof window.friendManager === 'undefined') {
        console.log('FriendManager not available, skipping friends listeners setup');
        return;
    }
    
    console.log('Setting up friends real-time listeners...');
    
    // Setup friend requests listener
    LISTENER_UNSUBSCRIBERS.friendRequests = window.friendManager.setupFriendRequestListener((requests) => {
        console.log('Friend requests updated:', requests);
        STATE.pendingRequests = requests;
        
        // Re-render if on friends page
        const friendsPage = document.getElementById('friendsPage');
        if (friendsPage && friendsPage.style.display !== 'none') {
            renderPendingRequests();
        }
    });
    
    // Setup friends list listener
    LISTENER_UNSUBSCRIBERS.friends = window.friendManager.setupFriendsListener((friends) => {
        console.log('Friends list updated:', friends);
        STATE.friends = friends;
        
        // Re-render if on friends page
        const friendsPage = document.getElementById('friendsPage');
        if (friendsPage && friendsPage.style.display !== 'none') {
            renderFriendsList();
        }
        
        // Also update task rendering if friends data is used there
        renderTasks();
    });
    
    console.log('Friends real-time listeners setup complete');
}

// ==================== TASK SHARING MODAL ====================

let currentSharingTaskId = null;

function showShareTaskModal(taskId) {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) {
        showNotification('ไม่พบงานที่ต้องการแชร์', 'error');
        return;
    }
    
    // Check if user is the owner
    if (task.owner !== STATE.currentUser.uid) {
        showNotification('คุณไม่มีสิทธิ์แชร์งานนี้', 'error');
        return;
    }
    
    currentSharingTaskId = taskId;
    
    // Populate friends list with checkboxes
    const friendsList = document.getElementById('shareTaskFriendsList');
    
    if (!STATE.friends || STATE.friends.length === 0) {
        friendsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <p>คุณยังไม่มีเพื่อน</p>
                <p class="empty-hint">เพิ่มเพื่อนก่อนเพื่อแชร์งาน</p>
            </div>
        `;
    } else {
        const currentSharedWith = task.sharedWith || [];
        
        friendsList.innerHTML = STATE.friends.map(friend => {
            const displayName = friend.displayName || friend.email || 'Unknown User';
            const photoURL = friend.photoURL || null;
            const isChecked = currentSharedWith.includes(friend.uid);
            
            const avatarHTML = photoURL 
                ? `<img src="${photoURL}" alt="${displayName}" class="share-friend-avatar" />`
                : `<div class="share-friend-avatar share-friend-avatar-placeholder">
                    <i class="fas fa-user"></i>
                   </div>`;
            
            return `
                <label class="share-friend-item">
                    <input type="checkbox" 
                           value="${friend.uid}" 
                           ${isChecked ? 'checked' : ''}
                           class="share-friend-checkbox" />
                    ${avatarHTML}
                    <span class="share-friend-name">${displayName}</span>
                </label>
            `;
        }).join('');
    }
    
    // Show modal
    document.getElementById('shareTaskModal').style.display = 'flex';
}

function closeShareTaskModal() {
    document.getElementById('shareTaskModal').style.display = 'none';
    currentSharingTaskId = null;
}

async function handleShareTask() {
    if (!currentSharingTaskId) {
        showNotification('ไม่พบงานที่ต้องการแชร์', 'error');
        return;
    }
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    // Get selected friends
    const checkboxes = document.querySelectorAll('.share-friend-checkbox:checked');
    const selectedFriendIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedFriendIds.length === 0) {
        showNotification('กรุณาเลือกเพื่อนอย่างน้อย 1 คน', 'error');
        return;
    }
    
    try {
        // Initialize CollaborationManager if not already done
        if (typeof window.collaborationManager === 'undefined') {
            window.collaborationManager = new CollaborationManager();
            window.collaborationManager.initialize(STATE.currentUser);
        }
        
        // Share the task
        await window.collaborationManager.shareTask(currentSharingTaskId.toString(), selectedFriendIds);
        
        // Update local state
        const task = STATE.tasks.find(t => t.id === currentSharingTaskId);
        if (task) {
            task.visibility = 'shared';
            task.sharedWith = selectedFriendIds;
            task.lastModifiedBy = STATE.currentUser.uid;
            task.lastModifiedAt = new Date().toISOString();
        }
        
        // Save to Firebase
        await saveTasksToFirebase();
        
        // Re-render tasks
        renderTasks();
        
        showNotification('แชร์งานสำเร็จ', 'success');
        closeShareTaskModal();
    } catch (error) {
        console.error('Error sharing task:', error);
        
        if (error.message.includes('not in your friend list')) {
            showNotification('ไม่สามารถแชร์งานได้ เนื่องจากผู้ใช้บางคนไม่อยู่ในรายชื่อเพื่อนของคุณ กรุณาตรวจสอบรายชื่อเพื่อนอีกครั้ง', 'error');
        } else if (error.message.includes('already shared with this task')) {
            showNotification('เพื่อนที่เลือกได้รับการแชร์งานนี้ไปแล้ว', 'warning');
        } else {
            showNotification('เกิดข้อผิดพลาดในการแชร์งาน', 'error');
        }
    }
}

function initializeShareTaskEventListeners() {
    const btnShareTask = document.getElementById('btnShareTask');
    if (btnShareTask) {
        btnShareTask.addEventListener('click', handleShareTask);
    }
}


// ==================== TASK DETAIL MODAL ====================

let currentDetailTaskId = null;

function showTaskDetailModal(taskId) {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) {
        showNotification('ไม่พบงานที่ต้องการดู', 'error');
        return;
    }
    
    currentDetailTaskId = taskId;
    
    // Populate task details
    renderTaskDetailInfo(task);
    renderTaskDetailCollaborators(task);
    renderTaskDetailComments(task);
    
    // Show modal
    document.getElementById('taskDetailModal').style.display = 'flex';
}

function closeTaskDetailModal() {
    document.getElementById('taskDetailModal').style.display = 'none';
    currentDetailTaskId = null;
    
    // Clear comment input
    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.value = '';
    }
}

function renderTaskDetailInfo(task) {
    const container = document.getElementById('taskDetailInfo');
    
    const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'ไม่ระบุ';
    
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const totalSubtasks = task.subtasks.length;
    
    container.innerHTML = `
        <div class="task-detail-info-grid">
            <div class="task-detail-info-item">
                <span class="task-detail-label">ชื่องาน:</span>
                <span class="task-detail-value">${task.name}</span>
            </div>
            <div class="task-detail-info-item">
                <span class="task-detail-label">รายละเอียด:</span>
                <span class="task-detail-value">${task.description || '-'}</span>
            </div>
            <div class="task-detail-info-item">
                <span class="task-detail-label">ผู้รับผิดชอบ:</span>
                <span class="task-detail-value">${task.assignee}</span>
            </div>
            <div class="task-detail-info-item">
                <span class="task-detail-label">วันครบกำหนด:</span>
                <span class="task-detail-value">${dueDateStr}</span>
            </div>
            <div class="task-detail-info-item">
                <span class="task-detail-label">Story Points:</span>
                <span class="task-detail-value">${task.storyPoint}</span>
            </div>
            <div class="task-detail-info-item">
                <span class="task-detail-label">ความคืบหน้า:</span>
                <span class="task-detail-value">${completedSubtasks}/${totalSubtasks} งานย่อย</span>
            </div>
        </div>
    `;
}

function renderTaskDetailCollaborators(task) {
    const container = document.getElementById('taskDetailCollaborators');
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    const isOwner = task.owner === currentUserId;
    
    // 🔍 DEBUG: Log full task object
    console.log('🔍 renderTaskDetailCollaborators:', {
        taskId: task.id,
        taskName: task.name,
        taskOwner: task.owner,
        currentUserId: currentUserId,
        isOwner: isOwner,
        isSharedWithMe: task.isSharedWithMe,
        isOwnTask: task.isOwnTask,
        sharedWith: task.sharedWith,
        visibility: task.visibility
    });
    
    // Build list of all team members (owner + collaborators)
    const teamMembers = [];
    
    // 1. Add owner first
    const isCurrentUserOwner = task.owner === currentUserId;
    let ownerName, ownerPhoto, ownerEmail;
    
    if (isCurrentUserOwner) {
        // Use current user data for self
        ownerName = STATE.currentUser.displayName || STATE.currentUser.email || 'Unknown User';
        ownerPhoto = STATE.currentUser.photoURL || null;
        ownerEmail = STATE.currentUser.email || '';
    } else {
        // Use friends list or task data for others
        const owner = STATE.friends ? STATE.friends.find(f => f.uid === task.owner) : null;
        ownerName = owner ? (owner.displayName || owner.email) : (task.ownerName || 'Unknown User');
        ownerPhoto = owner ? owner.photoURL : (task.ownerPhoto || null);
        ownerEmail = owner ? owner.email : (task.ownerEmail || '');
    }
    
    const ownerAvatarHTML = ownerPhoto 
        ? `<img src="${ownerPhoto}" alt="${ownerName}" class="collaborator-detail-avatar" />`
        : `<div class="collaborator-detail-avatar collaborator-detail-avatar-placeholder">
            <i class="fas fa-user"></i>
           </div>`;
    
    teamMembers.push(`
        <div class="collaborator-detail-item ${isCurrentUserOwner ? 'current-user' : ''}">
            ${ownerAvatarHTML}
            <div class="collaborator-detail-info">
                <div class="collaborator-detail-name">
                    ${ownerName}${isCurrentUserOwner ? ' (คุณ)' : ''}
                </div>
                <div class="collaborator-detail-email">${ownerEmail}</div>
                <div class="collaborator-detail-role">
                    <i class="fas fa-crown"></i> เจ้าของงาน
                </div>
            </div>
        </div>
    `);
    
    // 2. Add collaborators
    if (task.sharedWith && task.sharedWith.length > 0) {
        task.sharedWith.forEach(uid => {
            const isCurrentUserCollaborator = uid === currentUserId;
            let displayName, photoURL, email;
            
            if (isCurrentUserCollaborator) {
                // Use current user data for self
                displayName = STATE.currentUser.displayName || STATE.currentUser.email || 'Unknown User';
                photoURL = STATE.currentUser.photoURL || null;
                email = STATE.currentUser.email || '';
            } else {
                // Use friends list for others
                const friend = STATE.friends ? STATE.friends.find(f => f.uid === uid) : null;
                displayName = friend ? (friend.displayName || friend.email) : 'Unknown User';
                photoURL = friend ? friend.photoURL : null;
                email = friend ? friend.email : '';
            }
            
            const avatarHTML = photoURL 
                ? `<img src="${photoURL}" alt="${displayName}" class="collaborator-detail-avatar" />`
                : `<div class="collaborator-detail-avatar collaborator-detail-avatar-placeholder">
                    <i class="fas fa-user"></i>
                   </div>`;
            
            // Show unshare button only for task owner (and not for themselves)
            const unshareButton = isOwner && uid !== currentUserId ? `
                <button class="btn-unshare" onclick="handleUnshareTask('${uid}')" title="ยกเลิกการแชร์">
                    <i class="fas fa-user-minus"></i>
                </button>
            ` : '';
            
            teamMembers.push(`
                <div class="collaborator-detail-item ${isCurrentUserCollaborator ? 'current-user' : ''}">
                    ${avatarHTML}
                    <div class="collaborator-detail-info">
                        <div class="collaborator-detail-name">
                            ${displayName}${isCurrentUserCollaborator ? ' (คุณ)' : ''}
                        </div>
                        <div class="collaborator-detail-email">${email}</div>
                    </div>
                    ${unshareButton}
                </div>
            `);
        });
    }
    
    container.innerHTML = `
        <div class="collaborators-detail-list">
            ${teamMembers.join('')}
        </div>
    `;
}

function renderTaskDetailComments(task) {
    const container = document.getElementById('taskDetailComments');
    
    console.log('🔍 renderTaskDetailComments called for task:', task.id);
    console.log('🔍 Task comments:', task.comments);
    
    if (!task.comments || task.comments.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-comments"></i>
                <p>ยังไม่มีความคิดเห็น</p>
            </div>
        `;
        return;
    }
    
    // Render comments
    const commentsList = task.comments.map((comment, index) => {
        // Get commenter info
        const commenter = STATE.friends ? STATE.friends.find(f => f.uid === comment.uid) : null;
        const isCurrentUser = comment.uid === STATE.currentUser.uid;
        const isTaskOwner = task.owner === STATE.currentUser.uid;
        const displayName = isCurrentUser 
            ? 'คุณ' 
            : (commenter ? (commenter.displayName || commenter.email) : 'Unknown User');
        const photoURL = isCurrentUser 
            ? STATE.currentUser.photoURL 
            : (commenter ? commenter.photoURL : null);
        
        const avatarHTML = photoURL 
            ? `<img src="${photoURL}" alt="${displayName}" class="comment-avatar" />`
            : `<div class="comment-avatar comment-avatar-placeholder">
                <i class="fas fa-user"></i>
               </div>`;
        
        // Format timestamp
        const timestamp = comment.createdAt ? formatRelativeTime(comment.createdAt) : 'เมื่อสักครู่';
        const editedText = comment.editedAt ? ' (แก้ไขแล้ว)' : '';
        
        // Show edit/delete buttons for comment author or task owner
        const canEdit = isCurrentUser;
        const canDelete = isCurrentUser || isTaskOwner;
        
        const actionsHTML = (canEdit || canDelete) ? `
            <div class="comment-actions">
                ${canEdit ? `<button class="comment-action-btn" onclick="handleEditComment(${index})" title="แก้ไข">
                    <i class="fas fa-edit"></i>
                </button>` : ''}
                ${canDelete ? `<button class="comment-action-btn" onclick="handleDeleteComment(${index})" title="ลบ">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        ` : '';
        
        return `
            <div class="comment-item" data-comment-index="${index}">
                ${avatarHTML}
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${displayName}</span>
                        <span class="comment-time">${timestamp}${editedText}</span>
                    </div>
                    <div class="comment-text" id="comment-text-${index}">${comment.text}</div>
                    <div class="comment-edit-form" id="comment-edit-${index}" style="display: none;">
                        <textarea class="comment-edit-input" id="comment-edit-input-${index}">${comment.text}</textarea>
                        <div class="comment-edit-actions">
                            <button class="btn-primary btn-sm" onclick="handleSaveEditComment(${index})">บันทึก</button>
                            <button class="btn-secondary btn-sm" onclick="handleCancelEditComment(${index})">ยกเลิก</button>
                        </div>
                    </div>
                    ${actionsHTML}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = commentsList;
}

function formatRelativeTime(timestamp) {
    // Handle Firestore timestamp
    let date;
    if (timestamp && timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp) {
        date = new Date(timestamp);
    } else {
        return 'เมื่อสักครู่';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
        return 'เมื่อสักครู่';
    } else if (diffMins < 60) {
        return `${diffMins} นาทีที่แล้ว`;
    } else if (diffHours < 24) {
        return `${diffHours} ชั่วโมงที่แล้ว`;
    } else if (diffDays < 7) {
        return `${diffDays} วันที่แล้ว`;
    } else {
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
}


// ==================== COMMENTS FUNCTIONALITY ====================

async function handleAddComment() {
    console.log('🔍 handleAddComment called, currentDetailTaskId:', currentDetailTaskId);
    
    if (!currentDetailTaskId) {
        showNotification('ไม่พบงานที่ต้องการเพิ่มความคิดเห็น', 'error');
        return;
    }
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();
    
    console.log('🔍 Comment text:', commentText);
    
    if (!commentText) {
        showNotification('กรุณากรอกความคิดเห็น', 'error');
        return;
    }
    
    try {
        // Initialize CollaborationManager if not already done
        if (typeof window.collaborationManager === 'undefined') {
            window.collaborationManager = new CollaborationManager();
            window.collaborationManager.initialize(STATE.currentUser);
        }
        
        // Get the task to find the owner
        const task = STATE.tasks.find(t => t.id === currentDetailTaskId);
        if (!task) {
            showNotification('ไม่พบงาน', 'error');
            return;
        }
        
        console.log('🔍 Adding comment to task:', task.id, 'owner:', task.owner);
        
        // Add comment
        await window.collaborationManager.addComment(
            currentDetailTaskId.toString(), 
            commentText,
            task.owner
        );
        
        console.log('✅ Comment added successfully');
        
        // Reload task from Firebase to get updated comments
        await loadTasksFromFirebase();
        
        // Get updated task
        const updatedTask = STATE.tasks.find(t => t.id === currentDetailTaskId);
        
        console.log('🔍 Updated task after reload:', updatedTask);
        console.log('🔍 Comments in updated task:', updatedTask?.comments);
        
        // Clear input
        commentInput.value = '';
        
        // Re-render comments
        if (updatedTask) {
            renderTaskDetailComments(updatedTask);
        } else {
            console.error('❌ Could not find updated task');
        }
        
        showNotification('เพิ่มความคิดเห็นสำเร็จ', 'success');
    } catch (error) {
        console.error('❌ Error adding comment:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

// Allow Enter key to submit comment
function initializeCommentInputListener() {
    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddComment();
            }
        });
    }
}

// Handle edit comment
async function handleEditComment(commentIndex) {
    if (!currentDetailTaskId) {
        showNotification('ไม่พบงานที่ต้องการแก้ไขความคิดเห็น', 'error');
        return;
    }
    
    // Hide comment text and show edit form
    const commentText = document.getElementById(`comment-text-${commentIndex}`);
    const editForm = document.getElementById(`comment-edit-${commentIndex}`);
    
    if (commentText && editForm) {
        commentText.style.display = 'none';
        editForm.style.display = 'block';
        
        // Focus on textarea
        const textarea = document.getElementById(`comment-edit-input-${commentIndex}`);
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }
}

// Handle save edit comment
async function handleSaveEditComment(commentIndex) {
    if (!currentDetailTaskId) {
        showNotification('ไม่พบงานที่ต้องการแก้ไขความคิดเห็น', 'error');
        return;
    }
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const textarea = document.getElementById(`comment-edit-input-${commentIndex}`);
    const newText = textarea ? textarea.value.trim() : '';
    
    if (!newText) {
        showNotification('กรุณากรอกความคิดเห็น', 'error');
        return;
    }
    
    try {
        // Initialize CollaborationManager if not already done
        if (typeof window.collaborationManager === 'undefined') {
            window.collaborationManager = new CollaborationManager();
            window.collaborationManager.initialize(STATE.currentUser);
        }
        
        // Get the task to find the owner
        const task = STATE.tasks.find(t => t.id === currentDetailTaskId);
        if (!task) {
            showNotification('ไม่พบงาน', 'error');
            return;
        }
        
        // Edit comment
        await window.collaborationManager.editComment(
            currentDetailTaskId.toString(),
            commentIndex,
            newText,
            task.owner
        );
        
        // Update local state
        if (task.comments && task.comments[commentIndex]) {
            task.comments[commentIndex].text = newText;
            task.comments[commentIndex].editedAt = new Date().toISOString();
        }
        task.lastModifiedBy = STATE.currentUser.uid;
        task.lastModifiedAt = new Date().toISOString();
        
        // Save to Firebase
        await saveTasksToFirebase();
        
        // Re-render comments
        renderTaskDetailComments(task);
        
        showNotification('แก้ไขความคิดเห็นสำเร็จ', 'success');
    } catch (error) {
        console.error('Error editing comment:', error);
        showNotification('เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น: ' + error.message, 'error');
    }
}

// Handle cancel edit comment
function handleCancelEditComment(commentIndex) {
    // Hide edit form and show comment text
    const commentText = document.getElementById(`comment-text-${commentIndex}`);
    const editForm = document.getElementById(`comment-edit-${commentIndex}`);
    
    if (commentText && editForm) {
        commentText.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// Handle delete comment
async function handleDeleteComment(commentIndex) {
    if (!currentDetailTaskId) {
        showNotification('ไม่พบงานที่ต้องการลบความคิดเห็น', 'error');
        return;
    }
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    if (!confirm('คุณต้องการลบความคิดเห็นนี้หรือไม่?')) {
        return;
    }
    
    try {
        // Initialize CollaborationManager if not already done
        if (typeof window.collaborationManager === 'undefined') {
            window.collaborationManager = new CollaborationManager();
            window.collaborationManager.initialize(STATE.currentUser);
        }
        
        // Get the task to find the owner
        const task = STATE.tasks.find(t => t.id === currentDetailTaskId);
        if (!task) {
            showNotification('ไม่พบงาน', 'error');
            return;
        }
        
        // Delete comment
        await window.collaborationManager.deleteComment(
            currentDetailTaskId.toString(),
            commentIndex,
            task.owner
        );
        
        // Update local state
        if (task.comments) {
            task.comments.splice(commentIndex, 1);
        }
        task.lastModifiedBy = STATE.currentUser.uid;
        task.lastModifiedAt = new Date().toISOString();
        
        // Save to Firebase
        await saveTasksToFirebase();
        
        // Re-render comments
        renderTaskDetailComments(task);
        
        showNotification('ลบความคิดเห็นสำเร็จ', 'success');
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification('เกิดข้อผิดพลาดในการลบความคิดเห็น: ' + error.message, 'error');
    }
}


// ==================== UNSHARE FUNCTIONALITY ====================

async function handleUnshareTask(friendId) {
    if (!currentDetailTaskId) {
        showNotification('ไม่พบงานที่ต้องการยกเลิกการแชร์', 'error');
        return;
    }
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    const task = STATE.tasks.find(t => t.id === currentDetailTaskId);
    if (!task) {
        showNotification('ไม่พบงาน', 'error');
        return;
    }
    
    // Check if user is the owner
    if (task.owner !== STATE.currentUser.uid) {
        showNotification('คุณไม่มีสิทธิ์ยกเลิกการแชร์งานนี้', 'error');
        return;
    }
    
    // Get friend name for confirmation
    const friend = STATE.friends ? STATE.friends.find(f => f.uid === friendId) : null;
    const friendName = friend ? (friend.displayName || friend.email) : 'ผู้ใช้คนนี้';
    
    if (!confirm(`คุณต้องการยกเลิกการแชร์งานนี้กับ ${friendName} หรือไม่?`)) {
        return;
    }
    
    try {
        // Initialize CollaborationManager if not already done
        if (typeof window.collaborationManager === 'undefined') {
            window.collaborationManager = new CollaborationManager();
            window.collaborationManager.initialize(STATE.currentUser);
        }
        
        // Unshare the task
        await window.collaborationManager.unshareTask(currentDetailTaskId.toString(), friendId);
        
        // Update local state immediately
        const taskIndex = STATE.tasks.findIndex(t => t.id === currentDetailTaskId);
        if (taskIndex !== -1) {
            STATE.tasks[taskIndex].sharedWith = STATE.tasks[taskIndex].sharedWith.filter(id => id !== friendId);
            
            // Update visibility if no collaborators remain
            if (STATE.tasks[taskIndex].sharedWith.length === 0) {
                STATE.tasks[taskIndex].visibility = 'private';
            }
            
            STATE.tasks[taskIndex].lastModifiedBy = STATE.currentUser.uid;
            STATE.tasks[taskIndex].lastModifiedAt = new Date().toISOString();
        }
        
        // Save to Firebase
        await saveTasksToFirebase();
        
        // Re-render UI
        renderTaskDetailCollaborators(STATE.tasks[taskIndex]);
        renderTasks();
        
        showNotification('ยกเลิกการแชร์สำเร็จ', 'success');
        
        // Close modal if no collaborators remain
        if (STATE.tasks[taskIndex] && STATE.tasks[taskIndex].sharedWith.length === 0) {
            closeTaskDetailModal();
        }
    } catch (error) {
        console.error('Error unsharing task:', error);
        
        // Even if notification fails, the unshare might have succeeded
        // So we still update the UI optimistically
        const taskIndex = STATE.tasks.findIndex(t => t.id === currentDetailTaskId);
        if (taskIndex !== -1) {
            STATE.tasks[taskIndex].sharedWith = STATE.tasks[taskIndex].sharedWith.filter(id => id !== friendId);
            if (STATE.tasks[taskIndex].sharedWith.length === 0) {
                STATE.tasks[taskIndex].visibility = 'private';
            }
            renderTaskDetailCollaborators(STATE.tasks[taskIndex]);
            renderTasks();
        }
        
        showNotification('ยกเลิกการแชร์สำเร็จ (การแจ้งเตือนอาจไม่สำเร็จ)', 'warning');
    }
}


// ==================== REAL-TIME SHARED TASKS LISTENERS ====================

function setupOwnTasksRealtimeListener() {
    if (!STATE.currentUser) {
        console.log('User not logged in, skipping own tasks listener setup');
        return;
    }
    
    console.log('Setting up own tasks real-time listener...');
    
    try {
        // Listen to changes in our own tasks collection
        const ownTasksRef = firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks')
            .orderBy('createdAt', 'desc');
        
        LISTENER_UNSUBSCRIBERS.ownTasks = ownTasksRef.onSnapshot(
            (snapshot) => {
                console.log(`📨 Own tasks updated: ${snapshot.size} tasks`);
                
                // Remove old own tasks
                STATE.tasks = STATE.tasks.filter(t => !t.isOwnTask && t.owner !== STATE.currentUser.uid);
                
                // Add/update own tasks
                snapshot.forEach(doc => {
                    const task = { id: doc.id, ...doc.data() };
                    task.isOwnTask = true;
                    
                    // ✅ Keep ID as string to match Firebase document ID
                    // Don't convert to number to avoid ID conflicts
                    
                    // ✅ Debug: Log task data from Firebase
                    console.log(`📦 Loading task "${task.id}" (type: ${typeof task.id}):`, {
                        name: task.name,
                        finalized: task.finalized,
                        finalizedAt: task.finalizedAt,
                        completed: task.completed
                    });
                    
                    // ✅ Ensure finalized field is properly set (default to false if not exists)
                    if (task.finalized !== true) {
                        task.finalized = false;
                    }
                    
                    STATE.tasks.push(task);
                });
                
                // Update task ID counter
                const ownTasks = STATE.tasks.filter(t => t.isOwnTask);
                if (ownTasks.length > 0) {
                    // Convert IDs to numbers for comparison, but keep original IDs as strings
                    const numericIds = ownTasks.map(t => {
                        const id = typeof t.id === 'string' ? parseInt(t.id) : t.id;
                        return isNaN(id) ? 0 : id;
                    });
                    STATE.taskIdCounter = Math.max(...numericIds) + 1;
                }
                
                // Re-render
                renderTasks();
                updateStats();
                
                console.log(`✅ Own tasks listener updated: ${ownTasks.length} own tasks, ${STATE.tasks.filter(t => t.isSharedWithMe).length} shared tasks`);
            },
            (error) => {
                console.error('❌ Error in own tasks listener:', error);
            }
        );
        
        console.log('✅ Own tasks real-time listener setup complete');
    } catch (error) {
        console.error('Error setting up own tasks listener:', error);
    }
}

function setupSharedTasksRealtimeListeners() {
    if (!STATE.currentUser) {
        console.log('User not logged in, skipping shared tasks listeners setup');
        return;
    }
    
    if (typeof CollaborationManager === 'undefined') {
        console.log('CollaborationManager not available, skipping shared tasks listeners setup');
        return;
    }
    
    console.log('Setting up shared tasks real-time listeners...');
    
    // Initialize CollaborationManager if not already done
    if (typeof window.collaborationManager === 'undefined') {
        window.collaborationManager = new CollaborationManager();
        window.collaborationManager.initialize(STATE.currentUser);
    }
    
    // Setup shared tasks listener
    try {
        LISTENER_UNSUBSCRIBERS.sharedTasks = window.collaborationManager.setupSharedTasksListener((sharedTasks) => {
            console.log('🔄 Shared tasks updated:', sharedTasks.length, 'tasks');
            console.log('📋 Task details:', sharedTasks.map(t => `${t.name} (ID: ${t.id}, Owner: ${t.owner})`));
            
            // Count tasks before filtering
            const beforeCount = STATE.tasks.filter(t => t.isSharedWithMe).length;
            console.log(`📊 Before update: ${beforeCount} shared tasks in STATE`);
            
            // Remove old shared tasks that are no longer shared with us
            const removedTasks = STATE.tasks.filter(task => {
                if (task.isOwnTask || task.owner === STATE.currentUser.uid) {
                    return false; // Keep our own tasks
                }
                // This task will be removed if it's not in the new shared tasks list
                const stillShared = sharedTasks.some(st => 
                    st.id.toString() === task.id.toString() && 
                    st.owner === task.owner
                );
                return !stillShared;
            });
            
            // Log removed tasks for debugging
            if (removedTasks.length > 0) {
                console.log('🗑️ Removing unshared tasks:', removedTasks.map(t => `${t.name} (ID: ${t.id})`));
                removedTasks.forEach(task => {
                    showNotification(`งาน "${task.name}" ถูกยกเลิกการแชร์แล้ว`, 'info');
                });
            }
            
            STATE.tasks = STATE.tasks.filter(task => {
                // Keep tasks we own
                if (task.isOwnTask || task.owner === STATE.currentUser.uid) {
                    return true;
                }
                // Keep tasks that are still shared with us (check by both id and owner)
                return sharedTasks.some(st => 
                    st.id.toString() === task.id.toString() && 
                    st.owner === task.owner
                );
            });
            
            // Update or add shared tasks
            let addedCount = 0;
            let updatedCount = 0;
            
            sharedTasks.forEach(sharedTask => {
                // Mark as shared task
                sharedTask.isOwnTask = false;
                sharedTask.isSharedWithMe = true;
                
                // ✅ Ensure finalized field is properly set (default to false if not exists)
                if (sharedTask.finalized !== true) {
                    sharedTask.finalized = false;
                }
                
                // Find existing task by both id and owner to prevent duplicates
                const existingIndex = STATE.tasks.findIndex(t => 
                    t.id.toString() === sharedTask.id.toString() && 
                    t.owner === sharedTask.owner
                );
                
                if (existingIndex >= 0) {
                    // Update existing task
                    STATE.tasks[existingIndex] = { 
                        ...STATE.tasks[existingIndex],
                        ...sharedTask,
                        // Ensure these flags are set correctly
                        isOwnTask: false,
                        isSharedWithMe: true
                    };
                    updatedCount++;
                    console.log(`🔄 Updated task: ${sharedTask.name} (ID: ${sharedTask.id})`);
                } else {
                    // Add new shared task
                    STATE.tasks.push(sharedTask);
                    addedCount++;
                    console.log(`➕ Added new shared task: ${sharedTask.name} (ID: ${sharedTask.id})`);
                }
            });
            
            // Count tasks after update
            const afterCount = STATE.tasks.filter(t => t.isSharedWithMe).length;
            console.log(`📊 After update: ${afterCount} shared tasks in STATE (Added: ${addedCount}, Updated: ${updatedCount}, Removed: ${removedTasks.length})`);
            
            // ✅ Show notification for newly added shared tasks
            if (addedCount > 0) {
                const taskNames = sharedTasks
                    .filter(st => {
                        // Find tasks that were just added
                        const wasJustAdded = STATE.tasks.some(t => 
                            t.id.toString() === st.id.toString() && 
                            t.owner === st.owner && 
                            t.isSharedWithMe
                        );
                        return wasJustAdded;
                    })
                    .map(t => t.name)
                    .slice(0, 3); // Show max 3 task names
                
                const message = addedCount === 1 
                    ? `งาน "${taskNames[0]}" ถูกแชร์มาให้คุณ` 
                    : `มี ${addedCount} งานใหม่ถูกแชร์มาให้คุณ`;
                
                showNotification(message, 'success');
            }
            
            // Re-render tasks
            renderTasks();
            updateStats();
            
            // Update task detail modal if currently open
            if (currentDetailTaskId) {
                const task = STATE.tasks.find(t => t.id === currentDetailTaskId);
                if (task) {
                    renderTaskDetailInfo(task);
                    renderTaskDetailCollaborators(task);
                    renderTaskDetailComments(task);
                    
                    // Show visual indicator if task is being edited by others
                    if (task.lastModifiedBy && task.lastModifiedBy !== STATE.currentUser.uid) {
                        showEditingIndicator(task);
                    }
                }
            }
        });
        
        console.log('Shared tasks real-time listeners setup complete');
    } catch (error) {
        console.error('Error setting up shared tasks listener:', error);
    }
}

function showEditingIndicator(task) {
    // Get modifier info
    const modifier = STATE.friends?.find(f => f.uid === task.lastModifiedBy);
    const modifierName = modifier ? (modifier.displayName || modifier.email) : 'ผู้ใช้';
    
    // Show a temporary notification
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        background: rgba(79, 70, 229, 0.95);
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    indicator.innerHTML = `
        <i class="fas fa-edit"></i>
        <span>${modifierName} กำลังแก้ไขงานนี้</span>
    `;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(indicator)) {
                document.body.removeChild(indicator);
            }
        }, 300);
    }, 3000);
}



// ==================== ACHIEVEMENTS PAGE NAVIGATION ====================

function showAchievementsPage() {
    // Hide other pages
    document.getElementById('tasksPage').style.display = 'none';
    document.getElementById('friendsPage').style.display = 'none';
    // Hide leaderboard page
    const leaderboardPage = document.getElementById('leaderboardPage');
    if (leaderboardPage) {
        leaderboardPage.style.display = 'none';
    }
    
    // Show achievements page
    document.getElementById('achievementsPage').style.display = 'block';
    
    // Update navigation buttons
    document.getElementById('navTasks').classList.remove('nav-btn-active');
    document.getElementById('navFriends').classList.remove('nav-btn-active');
    document.getElementById('navAchievements').classList.add('nav-btn-active');
    
    const navLeaderboard = document.getElementById('navLeaderboard');
    if (navLeaderboard) {
        navLeaderboard.classList.remove('nav-btn-active');
    }
    
    // Render achievements data
    renderAchievementsPage();
}

function showLeaderboardPage() {
    // Hide other pages
    document.getElementById('tasksPage').style.display = 'none';
    document.getElementById('friendsPage').style.display = 'none';
    document.getElementById('achievementsPage').style.display = 'none';
    
    // Show leaderboard page
    const leaderboardPage = document.getElementById('leaderboardPage');
    if (leaderboardPage) {
        leaderboardPage.style.display = 'block';
    }
    
    // Update navigation buttons
    document.getElementById('navTasks').classList.remove('nav-btn-active');
    document.getElementById('navFriends').classList.remove('nav-btn-active');
    document.getElementById('navAchievements').classList.remove('nav-btn-active');
    
    const navLeaderboard = document.getElementById('navLeaderboard');
    if (navLeaderboard) {
        navLeaderboard.classList.add('nav-btn-active');
    }
    
    // Render leaderboard data
    renderLeaderboard();
}

// ==================== ACHIEVEMENTS PAGE RENDERING ====================

async function renderAchievementsPage() {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        showTasksPage();
        return;
    }
    
    try {
        // Initialize AchievementManager if not already done
        if (typeof window.achievementManager === 'undefined') {
            window.achievementManager = new AchievementManager();
        }
        
        // Get user stats
        const stats = await window.achievementManager.getUserStats(STATE.currentUser.uid);
        
        // Render user profile
        renderAchievementsUserProfile(stats);
        
        // Render user stats
        renderUserStats(stats);
        
        // Render achievements
        await renderAchievements(STATE.currentUser.uid);
        
    } catch (error) {
        console.error('Error rendering achievements page:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

function renderAchievementsUserProfile(stats) {
    // Update avatar
    const avatarImg = document.getElementById('achievementsUserAvatar');
    if (STATE.currentUser.photoURL) {
        avatarImg.src = STATE.currentUser.photoURL;
        avatarImg.style.display = 'block';
    } else {
        avatarImg.style.display = 'none';
    }
    
    // Update name and email
    document.getElementById('achievementsUserName').textContent = 
        STATE.currentUser.displayName || 'User';
    document.getElementById('achievementsUserEmail').textContent = 
        STATE.currentUser.email || '';
    
    // Update points with animation
    animateCounter('userPoints', stats.points || 0);
    
    // Update level
    animateCounter('userLevel', stats.level || 0);
    
    // Calculate progress to next level
    const currentPoints = stats.points || 0;
    const currentLevel = stats.level || 0;
    const nextLevelPoints = (currentLevel + 1) * (currentLevel + 1) * 100;
    const currentLevelPoints = currentLevel * currentLevel * 100;
    const pointsInCurrentLevel = currentPoints - currentLevelPoints;
    const pointsNeededForNextLevel = nextLevelPoints - currentLevelPoints;
    const progressPercentage = Math.min(100, Math.floor((pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
    
    // Update progress bar
    document.getElementById('levelProgressBar').style.width = progressPercentage + '%';
    document.getElementById('progressPercentage').textContent = progressPercentage + '%';
    document.getElementById('currentLevelPoints').textContent = currentPoints;
    document.getElementById('nextLevelPoints').textContent = nextLevelPoints;
}

function renderUserStats(stats) {
    const statsGrid = document.getElementById('userStatsGrid');
    
    const statsData = [
        {
            icon: 'fa-check-circle',
            label: 'งานที่ทำเสร็จ',
            value: stats.tasksCompleted || 0,
            color: '#10b981'
        },
        {
            icon: 'fa-clock',
            label: 'งานก่อนกำหนด',
            value: stats.tasksBeforeDeadline || 0,
            color: '#3b82f6'
        },
        {
            icon: 'fa-hands-helping',
            label: 'ช่วยเพื่อน',
            value: stats.helpedFriends || 0,
            color: '#f59e0b'
        }
    ];
    
    statsGrid.innerHTML = statsData.map(stat => `
        <div class="stat-card-achievement">
            <div class="stat-icon" style="background: ${stat.color}20; color: ${stat.color};">
                <i class="fas ${stat.icon}"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value-achievement">${stat.value}</div>
                <div class="stat-label-achievement">${stat.label}</div>
            </div>
        </div>
    `).join('');
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function update() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetValue;
        }
    }
    
    requestAnimationFrame(update);
}


// ==================== ACHIEVEMENTS GRID RENDERING ====================

async function renderAchievements(userId) {
    const achievementsGrid = document.getElementById('achievementsGrid');
    
    if (!achievementsGrid) {
        console.error('Achievements grid element not found');
        return;
    }
    
    try {
        // Initialize AchievementManager if not already done
        if (typeof window.achievementManager === 'undefined') {
            window.achievementManager = new AchievementManager();
        }
        
        // Get all achievements with unlock status
        const achievements = await window.achievementManager.getAllAchievements(userId);
        
        // Get user stats for progress calculation
        const stats = await window.achievementManager.getUserStats(userId);
        
        if (!achievements || achievements.length === 0) {
            achievementsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>ไม่มีอชีฟเมนต์</p>
                </div>
            `;
            return;
        }
        
        // Render achievement cards
        achievementsGrid.innerHTML = achievements.map(achievement => {
            const isUnlocked = achievement.unlocked;
            const cardClass = isUnlocked ? 'achievement-card achievement-unlocked' : 'achievement-card achievement-locked';
            
            // Calculate progress for locked achievements
            let progressHTML = '';
            if (!isUnlocked) {
                const progress = calculateAchievementProgress(achievement, stats);
                const progressPercentage = Math.min(100, Math.floor((progress.current / progress.required) * 100));
                
                progressHTML = `
                    <div class="achievement-progress">
                        <div class="achievement-progress-bar-container">
                            <div class="achievement-progress-bar" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="achievement-progress-text">
                            ${progress.current} / ${progress.required}
                        </div>
                    </div>
                `;
            }
            
            // Unlock status badge
            const statusBadge = isUnlocked 
                ? '<div class="achievement-status-badge achievement-unlocked-badge"><i class="fas fa-check"></i> ปลดล็อกแล้ว</div>'
                : '<div class="achievement-status-badge achievement-locked-badge"><i class="fas fa-lock"></i> ล็อก</div>';
            
            return `
                <div class="${cardClass}" title="${achievement.description}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-content">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        ${progressHTML}
                        ${statusBadge}
                        <div class="achievement-points">
                            <i class="fas fa-star"></i> ${achievement.points} คะแนน
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error rendering achievements:', error);
        achievementsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>เกิดข้อผิดพลาดในการโหลดอชีฟเมนต์</p>
            </div>
        `;
    }
}

function calculateAchievementProgress(achievement, stats) {
    const requirement = achievement.requirement;
    let current = 0;
    let required = requirement.value;
    
    switch (requirement.type) {
        case 'tasksCompleted':
            current = stats.tasksCompleted || 0;
            break;
        case 'helpedFriends':
            current = stats.helpedFriends || 0;
            break;
        case 'tasksBeforeDeadline':
            current = stats.tasksBeforeDeadline || 0;
            break;
        case 'points':
            current = stats.points || 0;
            break;
        default:
            current = 0;
    }
    
    return {
        current: Math.min(current, required),
        required: required
    };
}


// ==================== ACHIEVEMENTS REAL-TIME LISTENERS ====================

async function setupAchievementsRealtimeListeners() {
    if (!STATE.currentUser) {
        console.log('User not logged in, skipping achievements listeners setup');
        return;
    }
    
    if (typeof AchievementManager === 'undefined') {
        console.log('AchievementManager not available, skipping achievements listeners setup');
        return;
    }
    
    console.log('Setting up achievements real-time listeners...');
    
    // Initialize AchievementManager if not already done
    if (typeof window.achievementManager === 'undefined') {
        window.achievementManager = new AchievementManager();
    }
    
    try {
        // Check for unnotified achievements from database
        // This will show achievements that were unlocked while user was offline
        console.log('Checking for unnotified achievements from database...');
        await checkAndShowUnnotifiedAchievements();
        
        // Setup achievements listener
        LISTENER_UNSUBSCRIBERS.achievements = window.achievementManager.setupAchievementsListener(STATE.currentUser.uid, (achievementData) => {
            console.log('Achievements data updated:', achievementData);
            
            if (achievementData.error) {
                console.error('Error in achievements listener:', achievementData.error);
                return;
            }
            
            // Store previous achievements to detect new unlocks
            const previousAchievements = STATE.userAchievements || [];
            
            // Update STATE
            STATE.userPoints = achievementData.points || 0;
            STATE.userLevel = achievementData.level || 0;
            STATE.userAchievements = achievementData.achievements || [];
            STATE.userStats = achievementData.stats || {};
            
            // Check for newly unlocked achievements
            const newlyUnlocked = STATE.userAchievements.filter(
                id => !previousAchievements.includes(id)
            );
            
            // Show celebration for newly unlocked achievements (real-time unlock)
            // BUT only if they haven't been notified yet (check from achievementData)
            if (newlyUnlocked.length > 0) {
                const achievementNotifications = achievementData.achievementNotifications || {};
                
                newlyUnlocked.forEach(achievementId => {
                    // Check if this achievement has already been notified
                    const notification = achievementNotifications[achievementId];
                    const alreadyNotified = notification && notification.notified === true;
                    
                    if (!alreadyNotified) {
                        console.log(`🆕 New achievement unlocked: ${achievementId}, showing popup...`);
                        // Call async function without blocking the listener
                        showAchievementUnlockCelebration(achievementId).catch(error => {
                            console.error(`Error showing achievement ${achievementId}:`, error);
                        });
                    } else {
                        console.log(`⏭️ Achievement ${achievementId} already notified, skipping popup`);
                    }
                });
            }
            
            // Update UI if on achievements page
            const achievementsPage = document.getElementById('achievementsPage');
            if (achievementsPage && achievementsPage.style.display !== 'none') {
                renderAchievementsPage();
            }
        });
        
        console.log('Achievements real-time listeners setup complete');
    } catch (error) {
        console.error('Error setting up achievements listener:', error);
    }
}

// ==================== ACHIEVEMENT UNLOCK CELEBRATION ====================

/**
 * Check and show unnotified achievements (for offline unlocks)
 * Called when user logs in
 */
async function checkAndShowUnnotifiedAchievements() {
    if (!window.achievementManager || !STATE.currentUser) {
        return;
    }
    
    try {
        console.log('Checking for unnotified achievements...');
        
        // Get achievements that were unlocked but not notified
        const unnotified = await window.achievementManager.getUnnotifiedAchievements(
            STATE.currentUser.uid
        );
        
        if (unnotified.length > 0) {
            console.log(`Found ${unnotified.length} unnotified achievements:`, unnotified);
            
            // Show notifications one by one with delay
            for (let i = 0; i < unnotified.length; i++) {
                setTimeout(async () => {
                    try {
                        await showAchievementUnlockCelebration(unnotified[i], true);
                    } catch (error) {
                        console.error(`Error showing achievement ${unnotified[i]}:`, error);
                    }
                }, i * 5000); // 5 seconds delay between each notification
            }
        } else {
            console.log('No unnotified achievements found');
        }
    } catch (error) {
        console.error('Error checking unnotified achievements:', error);
    }
}

async function showAchievementUnlockCelebration(achievementId, markAsNotified = true) {
    // Find achievement details
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
        console.error('Achievement not found:', achievementId);
        return;
    }
    
    console.log(`🎉 Showing achievement popup: ${achievementId}`);
    
    // Mark as notified in database FIRST (before showing popup)
    if (markAsNotified && window.achievementManager && STATE.currentUser) {
        try {
            console.log(`📝 Marking achievement ${achievementId} as notified in database...`);
            await window.achievementManager.markAchievementAsNotified(
                STATE.currentUser.uid,
                achievementId
            );
            console.log(`✅ Achievement ${achievementId} marked as notified in database`);
        } catch (error) {
            console.error('❌ Error marking achievement as notified:', error);
            // Continue to show popup even if database update fails
        }
    }
    
    // Play notification sound
    if (typeof playNotificationSound === 'function') {
        playNotificationSound();
    }
    
    // Show confetti animation
    showConfetti();
    
    // Show achievement unlock notification
    showAchievementNotification(achievement);
}

function showConfetti() {
    // Create confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
    `;
    
    document.body.appendChild(confettiContainer);
    
    // Create confetti pieces
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff1493'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            top: -10px;
            left: ${Math.random() * 100}%;
            opacity: 1;
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
        `;
        confettiContainer.appendChild(confetti);
    }
    
    // Add confetti animation styles if not already added
    if (!document.getElementById('confettiStyles')) {
        const style = document.createElement('style');
        style.id = 'confettiStyles';
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    top: -10px;
                    opacity: 1;
                }
                100% {
                    top: 100%;
                    opacity: 0;
                    transform: translateX(${Math.random() * 200 - 100}px) rotate(${Math.random() * 720}deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove confetti after animation
    setTimeout(() => {
        if (document.body.contains(confettiContainer)) {
            document.body.removeChild(confettiContainer);
        }
    }, 4000);
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-unlock-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        padding: 30px 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        text-align: center;
        animation: achievementPopIn 0.5s ease forwards;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 15px;">${achievement.icon}</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">อชีฟเมนต์ปลดล็อก!</div>
        <div style="font-size: 20px; margin-bottom: 8px;">${achievement.name}</div>
        <div style="font-size: 16px; opacity: 0.9; margin-bottom: 15px;">${achievement.description}</div>
        <div style="font-size: 18px; font-weight: bold;">
            <i class="fas fa-star"></i> +${achievement.points} คะแนน
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already added
    if (!document.getElementById('achievementAnimationStyles')) {
        const style = document.createElement('style');
        style.id = 'achievementAnimationStyles';
        style.textContent = `
            @keyframes achievementPopIn {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
            @keyframes achievementPopOut {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove notification after delay
    setTimeout(() => {
        notification.style.animation = 'achievementPopOut 0.3s ease forwards';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}


// ==================== LEADERBOARD PAGE RENDERING ====================

async function renderLeaderboard() {
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        showTasksPage();
        return;
    }
    
    try {
        // Initialize LeaderboardManager if not already done
        if (typeof window.leaderboardManager === 'undefined') {
            window.leaderboardManager = new LeaderboardManager();
        }
        
        // Get leaderboard data
        const leaderboardData = await window.leaderboardManager.getLeaderboard(STATE.currentUser.uid);
        
        const tableBody = document.getElementById('leaderboardTableBody');
        const emptyState = document.getElementById('leaderboardEmptyState');
        const tableWrapper = document.querySelector('.leaderboard-table-wrapper');
        
        // Check if user has no friends (only current user in leaderboard)
        if (!leaderboardData || leaderboardData.length === 0 || 
            (leaderboardData.length === 1 && leaderboardData[0].isCurrentUser)) {
            // Show empty state
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        // Hide empty state and show table
        if (tableWrapper) tableWrapper.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        // Render leaderboard rows
        tableBody.innerHTML = leaderboardData.map(entry => {
            const isCurrentUser = entry.isCurrentUser;
            const rowClass = isCurrentUser ? 'leaderboard-row leaderboard-row-current' : 'leaderboard-row';
            
            // Get rank badge
            const rankBadge = getRankBadge(entry.rank);
            
            // Get avatar HTML
            const avatarHTML = entry.photoURL 
                ? `<img src="${entry.photoURL}" alt="${entry.displayName}" class="leaderboard-avatar" />`
                : `<div class="leaderboard-avatar leaderboard-avatar-placeholder">
                    <i class="fas fa-user"></i>
                   </div>`;
            
            // Format points with commas
            const formattedPoints = formatNumberWithCommas(entry.points);
            
            // Display name with "คุณ" prefix for current user
            const displayName = isCurrentUser 
                ? `<strong>คุณ</strong> (${entry.displayName})`
                : entry.displayName;
            
            return `
                <tr class="${rowClass}">
                    <td class="col-rank">${rankBadge}</td>
                    <td class="col-avatar">${avatarHTML}</td>
                    <td class="col-name">${displayName}</td>
                    <td class="col-points">${formattedPoints}</td>
                    <td class="col-level">
                        <span class="level-badge level-badge-${entry.level}">
                            <i class="fas fa-crown"></i> ${entry.level}
                        </span>
                    </td>
                    <td class="col-achievements">
                        <span class="achievement-count">
                            <i class="fas fa-trophy"></i> ${entry.achievementCount}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error rendering leaderboard:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดตารางอันดับ', 'error');
    }
}

function getRankBadge(rank) {
    if (rank === 1) {
        return '<span class="rank-badge rank-1"><i class="fas fa-trophy"></i> 1</span>';
    } else if (rank === 2) {
        return '<span class="rank-badge rank-2"><i class="fas fa-medal"></i> 2</span>';
    } else if (rank === 3) {
        return '<span class="rank-badge rank-3"><i class="fas fa-award"></i> 3</span>';
    } else {
        return `<span class="rank-badge rank-other">${rank}</span>`;
    }
}

function formatNumberWithCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ==================== LEADERBOARD REAL-TIME LISTENERS ====================

function setupLeaderboardRealtimeListeners() {
    if (!STATE.currentUser) {
        console.log('User not logged in, skipping leaderboard listeners setup');
        return;
    }
    
    if (typeof LeaderboardManager === 'undefined') {
        console.log('LeaderboardManager not available, skipping leaderboard listeners setup');
        return;
    }
    
    console.log('Setting up leaderboard real-time listeners...');
    
    // Initialize LeaderboardManager if not already done
    if (typeof window.leaderboardManager === 'undefined') {
        window.leaderboardManager = new LeaderboardManager();
    }
    
    // Setup leaderboard listener
    try {
        LISTENER_UNSUBSCRIBERS.leaderboard = window.leaderboardManager.setupLeaderboardListener(STATE.currentUser.uid, (leaderboardData) => {
            console.log('Leaderboard updated:', leaderboardData);
            
            // Re-render if on leaderboard page
            const leaderboardPage = document.getElementById('leaderboardPage');
            if (leaderboardPage && leaderboardPage.style.display !== 'none') {
                renderLeaderboard();
            }
        });
        
        console.log('Leaderboard real-time listeners setup complete');
    } catch (error) {
        console.error('Error setting up leaderboard listeners:', error);
    }
}
