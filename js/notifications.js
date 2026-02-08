// ==================== NOTIFICATION SYSTEM ====================

function requestNotificationPermissionOnLoad() {
    updateNotificationStatus();
    setupNotificationButton();
    
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
            document.getElementById('notificationModal').classList.add('show');
        }, 2000);
    } else if (Notification.permission === 'granted') {
        STATE.notificationPermission = true;
    }
}

function setupNotificationButton() {
    const btnElement = document.getElementById('btnEnableNotification');
    if (btnElement) {
        btnElement.onclick = function() {
            console.log('🔔 Notification button clicked!');
            requestNotificationPermission();
        };
    }
}

function closeNotificationModal() {
    document.getElementById('notificationModal').classList.remove('show');
}

function toggleNotificationSettings() {
    updateNotificationStatus();
    setupNotificationButton();
    document.getElementById('notificationModal').classList.add('show');
}

function updateNotificationStatus() {
    const statusElement = document.getElementById('notificationStatus');
    const btnElement = document.getElementById('btnEnableNotification');
    
    if (!statusElement || !btnElement) return;
    
    if (!('Notification' in window)) {
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน';
        statusElement.className = 'notification-status denied';
        btnElement.disabled = true;
        btnElement.style.display = 'none';
        return;
    }
    
    const permission = Notification.permission;
    console.log('📊 Current notification permission:', permission);
    
    if (permission === 'granted') {
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> การแจ้งเตือนเปิดใช้งานแล้ว';
        statusElement.className = 'notification-status granted';
        btnElement.innerHTML = '<i class="fas fa-check"></i> เปิดใช้งานแล้ว';
        btnElement.disabled = true;
        btnElement.style.opacity = '0.5';
        btnElement.style.cursor = 'not-allowed';
    } else if (permission === 'denied') {
        statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> การแจ้งเตือนถูกปิดใช้งาน<br><small>กรุณาเปิดใช้งานในการตั้งค่าเบราว์เซอร์</small>';
        statusElement.className = 'notification-status denied';
        btnElement.style.display = 'none';
    } else {
        statusElement.innerHTML = '<i class="fas fa-bell"></i> คลิกปุ่มด้านล่างเพื่ออนุญาตการแจ้งเตือน';
        statusElement.className = 'notification-status default';
        btnElement.innerHTML = '<i class="fas fa-check"></i> อนุญาต';
        btnElement.disabled = false;
        btnElement.style.opacity = '1';
        btnElement.style.cursor = 'pointer';
        btnElement.style.display = 'flex';
    }
}

function updateNotificationIcon() {
    const iconElement = document.getElementById('notificationIcon');
    const btnElement = document.querySelector('.btn-notification-toggle');
    
    if (!iconElement || !btnElement) return;
    
    if (!('Notification' in window)) {
        btnElement.classList.add('disabled');
        btnElement.title = 'เบราว์เซอร์ไม่รองรับการแจ้งเตือน';
        return;
    }
    
    const permission = Notification.permission;
    
    if (permission === 'granted') {
        iconElement.className = 'fas fa-bell';
        btnElement.classList.remove('disabled');
        btnElement.title = 'การแจ้งเตือนเปิดใช้งานแล้ว';
        btnElement.style.background = 'rgba(16, 185, 129, 0.9)';
    } else if (permission === 'denied') {
        iconElement.className = 'fas fa-bell-slash';
        btnElement.classList.add('disabled');
        btnElement.title = 'การแจ้งเตือนถูกปิดใช้งาน';
        btnElement.style.background = 'rgba(239, 68, 68, 0.9)';
    } else {
        iconElement.className = 'fas fa-bell';
        btnElement.classList.remove('disabled');
        btnElement.title = 'คลิกเพื่อเปิดใช้งานการแจ้งเตือน';
        btnElement.style.background = 'rgba(251, 191, 36, 0.9)';
    }
}

async function requestNotificationPermission() {
    console.log('🚀 requestNotificationPermission called');
    
    if (!('Notification' in window)) {
        alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
        return;
    }
    
    try {
        console.log('📝 Requesting permission...');
        const permission = await Notification.requestPermission();
        console.log('✅ Permission result:', permission);
        
        if (permission === 'granted') {
            STATE.notificationPermission = true;
            updateNotificationStatus();
            updateNotificationIcon();
            showNotification('เปิดใช้งานการแจ้งเตือนสำเร็จ!', 'success');
            
            // ทดสอบการแจ้งเตือน
            setTimeout(() => {
                const testNotif = new Notification('🎉 ทดสอบการแจ้งเตือน', {
                    body: 'ระบบแจ้งเตือนทำงานปกติ!',
                    icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
                    requireInteraction: false
                });
                
                testNotif.onclick = function() {
                    window.focus();
                    testNotif.close();
                };
                
                console.log('🔔 Test notification sent');
            }, 500);
            
            // ปิด Modal หลังจาก 2 วินาที
            setTimeout(() => {
                closeNotificationModal();
            }, 2000);
            
        } else if (permission === 'denied') {
            updateNotificationStatus();
            updateNotificationIcon();
            showNotification('คุณปฏิเสธการแจ้งเตือน', 'error');
        } else {
            console.log('⚠️ Permission default (user closed dialog)');
            updateNotificationStatus();
            updateNotificationIcon();
        }
    } catch (error) {
        console.error('❌ Error requesting notification permission:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

function sendNotification(task, message) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🔔 แจ้งเตือนงาน', {
        body: `${task.name}\n${message}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `task-${task.id}`,
        requireInteraction: false
    });
    
    // เล่นเสียง 1 นาที
    playNotificationSound(task.notificationSound || 'default', 60);
    
    // แสดงปุ่มปิดเสียงบนหน้าเว็บ
    showSoundStopButton(task.name, message);
    
    // ปิด notification อัตโนมัติหลัง 1 นาที
    setTimeout(() => {
        notification.close();
        hideSoundStopButton();
    }, 60000);
    
    notification.onclick = function() {
        window.focus();
        notification.close();
        stopAllSounds();
        hideSoundStopButton();
    };
}

function showSoundStopButton(taskName, message) {
    // ลบปุ่มเก่าถ้ามี
    hideSoundStopButton();
    
    // สร้างปุ่มใหม่
    const buttonHtml = `
        <div id="soundStopOverlay" class="sound-stop-overlay">
            <div class="sound-stop-card">
                <div class="sound-stop-header">
                    <i class="fas fa-bell-ring"></i>
                    <h3>🔔 กำลังแจ้งเตือน</h3>
                </div>
                <div class="sound-stop-body">
                    <p class="sound-stop-task"><strong>${taskName}</strong></p>
                    <p class="sound-stop-message">${message}</p>
                </div>
                <button class="btn-sound-stop" onclick="stopAllSounds(); hideSoundStopButton();">
                    <i class="fas fa-volume-mute"></i> ฉันได้ยินแล้ว / ปิดเสียง
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', buttonHtml);
}

function hideSoundStopButton() {
    const overlay = document.getElementById('soundStopOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function stopAllSounds() {
    // ยกเลิก timer ทั้งหมด
    STATE.activeSoundTimers.forEach(timer => clearTimeout(timer));
    STATE.activeSoundTimers = [];
    
    console.log('🔇 All sounds stopped');
}

function playNotificationSound(soundType, durationSeconds = 1) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const freq = CONFIG.SOUND_TYPES[soundType] || CONFIG.SOUND_TYPES['default'];
        
        // เล่นเสียงซ้ำตามระยะเวลาที่กำหนด
        const repeatInterval = 2; // เล่นซ้ำทุก 2 วินาที
        const repeatCount = Math.floor(durationSeconds / repeatInterval);
        
        // ล้าง timer เก่า
        stopAllSounds();
        
        for (let i = 0; i < repeatCount; i++) {
            const timer = setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                let time = audioContext.currentTime;
                
                freq.forEach((f, index) => {
                    oscillator.frequency.setValueAtTime(f, time + (index * 0.2));
                });
                
                gainNode.gain.setValueAtTime(0.3, time);
                gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1);
                
                oscillator.start(time);
                oscillator.stop(time + 1);
            }, i * repeatInterval * 1000);
            
            STATE.activeSoundTimers.push(timer);
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

function startNotificationChecker() {
    checkNotifications();
    STATE.notificationCheckInterval = setInterval(checkNotifications, CONFIG.NOTIFICATION_CHECK_INTERVAL);
}

function checkNotifications() {
    const now = new Date().getTime();
    
    STATE.tasks.forEach(task => {
        if (!task.dueDate || !task.notifications) return;
        
        const dueTime = new Date(task.dueDate).getTime();
        const timeDiff = dueTime - now;
        
        task.notifications.forEach(notif => {
            const notifTime = notif.days * 24 * 60 * 60 * 1000;
            const shouldNotify = timeDiff <= notifTime && timeDiff > (notifTime - 60000);
            
            if (shouldNotify && !notif.sent) {
                let message = '';
                if (notif.days === 7) message = 'เหลือเวลาอีก 1 สัปดาห์';
                else if (notif.days === 3) message = 'เหลือเวลาอีก 3 วัน';
                else if (notif.days === 1) message = 'เหลือเวลาอีก 1 วัน';
                else if (notif.days === 0.042) message = 'เหลือเวลาอีก 1 ชั่วโมง';
                else if (notif.days === 0) message = 'ถึงกำหนดแล้ว!';
                
                sendNotification(task, message);
                notif.sent = true;
                saveTasksToFirebase();
            }
        });
    });
}

// ==================== COLLABORATION NOTIFICATIONS ====================

function sendFriendRequestNotification(fromUser) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🤝 คำขอเป็นเพื่อน', {
        body: `${fromUser.displayName || fromUser.email} ต้องการเป็นเพื่อนกับคุณ`,
        icon: fromUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `friend-request-${fromUser.uid}`,
        requireInteraction: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

function sendFriendAcceptedNotification(friendName) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('✅ เพื่อนใหม่', {
        body: `${friendName} ยอมรับคำขอเป็นเพื่อนของคุณแล้ว`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `friend-accepted-${Date.now()}`,
        requireInteraction: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

function sendTaskSharedNotification(taskName, ownerName) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('📋 งานที่แชร์ให้คุณ', {
        body: `${ownerName} แชร์งาน "${taskName}" ให้คุณ`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `task-shared-${Date.now()}`,
        requireInteraction: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

function sendTaskUpdatedNotification(taskName, updaterName) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🔄 งานถูกอัพเดท', {
        body: `${updaterName} อัพเดทงาน "${taskName}"`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `task-updated-${Date.now()}`,
        requireInteraction: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

/**
 * Send task finalized notification
 * @param {string} taskName - Task name
 * @param {string} ownerName - Owner name
 * @param {number} points - Points awarded
 */
function sendTaskFinalizedNotification(taskName, ownerName, points) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🎉 งานเสร็จสมบูรณ์', {
        body: `งาน "${taskName}" เสร็จสมบูรณ์แล้ว!\nคุณได้รับ ${points} คะแนน`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `task-finalized-${Date.now()}`,
        requireInteraction: true
    });
    
    // เล่นเสียงพิเศษสำหรับงานเสร็จสมบูรณ์
    playNotificationSound('chime', 3);
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

function sendAchievementNotification(achievement) {
    if (!STATE.notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🏆 ปลดล็อกอชีฟเมนต์!', {
        body: `${achievement.icon} ${achievement.name}\n${achievement.description}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `achievement-${achievement.id}`,
        requireInteraction: true
    });
    
    // เล่นเสียงพิเศษสำหรับอชีฟเมนต์
    playNotificationSound('chime', 3);
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}


// ==================== NOTIFICATION UI COMPONENTS ====================

// Toggle notifications dropdown
function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (!dropdown) return;
    
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'flex';
        loadNotifications();
    } else {
        dropdown.style.display = 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notificationsDropdown');
    const bellButton = document.querySelector('.btn-notification-bell');
    
    if (dropdown && bellButton) {
        if (!dropdown.contains(event.target) && !bellButton.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    }
});

// Load and display notifications
async function loadNotifications() {
    if (!STATE.currentUser) return;
    
    try {
        const notifications = await getUserNotifications(STATE.currentUser.uid);
        renderNotifications(notifications);
        updateNotificationBadge(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Render notifications in dropdown
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsDropdownBody');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="notifications-empty-state">
                <i class="fas fa-inbox"></i>
                <p>ไม่มีการแจ้งเตือน</p>
            </div>
        `;
        return;
    }
    
    // Sort by createdAt descending (newest first) and limit to 20
    const sortedNotifications = notifications
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
    
    container.innerHTML = sortedNotifications.map(notif => {
        const icon = getNotificationIcon(notif.type);
        const iconClass = getNotificationIconClass(notif.type);
        const timeAgo = getRelativeTime(notif.createdAt);
        const unreadClass = notif.read ? '' : 'notification-item-unread';
        const unreadDot = notif.read ? '' : '<div class="notification-unread-dot"></div>';
        
        return `
            <div class="notification-item ${unreadClass}" onclick="handleNotificationClick('${notif.id}', '${notif.type}', ${JSON.stringify(notif.data).replace(/"/g, '&quot;')})">
                <div class="notification-icon-wrapper ${iconClass}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${unreadDot}
            </div>
        `;
    }).join('');
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        'friendRequest': 'fas fa-user-plus',
        'friendAccepted': 'fas fa-user-check',
        'taskShared': 'fas fa-share-alt',
        'taskUpdated': 'fas fa-edit',
        'taskFinalized': 'fas fa-check-circle',
        'achievement': 'fas fa-trophy'
    };
    return icons[type] || 'fas fa-bell';
}

// Get notification icon class based on type
function getNotificationIconClass(type) {
    const classes = {
        'friendRequest': 'notification-icon-friend-request',
        'friendAccepted': 'notification-icon-friend-accepted',
        'taskShared': 'notification-icon-task-shared',
        'taskUpdated': 'notification-icon-task-updated',
        'taskFinalized': 'notification-icon-task-finalized',
        'achievement': 'notification-icon-achievement'
    };
    return classes[type] || '';
}

// Get relative time string
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Update notification badge counter
function updateNotificationBadge(notifications) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Handle notification click
async function handleNotificationClick(notificationId, type, data) {
    try {
        // Mark as read
        await markNotificationAsRead(notificationId);
        
        // Close dropdown
        document.getElementById('notificationsDropdown').style.display = 'none';
        
        // Navigate based on type
        switch (type) {
            case 'friendRequest':
                showFriendsPage();
                break;
            case 'friendAccepted':
                showFriendsPage();
                break;
            case 'taskShared':
                if (data.taskId) {
                    showTasksPage();
                    // ✅ Force reload tasks to ensure shared task appears
                    if (typeof loadTasksFromFirebase === 'function') {
                        await loadTasksFromFirebase();
                    } else {
                        // Fallback: just re-render current tasks
                        renderTasks();
                        updateStats();
                    }
                }
                break;
            case 'taskUpdated':
                if (data.taskId) {
                    showTasksPage();
                }
                break;
            case 'taskFinalized':
                if (data.taskId) {
                    showTasksPage();
                    // Reload tasks to see finalized status
                    if (typeof loadTasksFromFirebase === 'function') {
                        await loadTasksFromFirebase();
                    } else {
                        renderTasks();
                        updateStats();
                    }
                }
                break;
            case 'achievement':
                showAchievementsPage();
                break;
        }
        
        // Reload notifications to update UI
        loadNotifications();
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    if (!STATE.currentUser) return;
    
    try {
        const notifications = await getUserNotifications(STATE.currentUser.uid);
        const unreadNotifications = notifications.filter(n => !n.read);
        
        for (const notif of unreadNotifications) {
            await markNotificationAsRead(notif.id);
        }
        
        // Reload notifications
        loadNotifications();
        showNotification('ทำเครื่องหมายอ่านทั้งหมดแล้ว', 'success');
    } catch (error) {
        console.error('Error marking all as read:', error);
        showNotification('เกิดข้อผิดพลาด', 'error');
    }
}

// Show toast notification
function showToastNotification(title, message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-notification-${type}`;
    
    const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-notification-header">
            <i class="toast-notification-icon ${iconMap[type]}"></i>
            <div class="toast-notification-title">${title}</div>
            <button class="toast-notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-notification-body">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }
    }, duration);
    
    // Play notification sound if enabled
    if (STATE.notificationPermission) {
        playNotificationSound('default', 1);
    }
}

// Setup real-time notifications listener
function setupNotificationsListener() {
    if (!STATE.currentUser) return null;
    
    const notificationsRef = firebase.firestore()
        .collection('users')
        .doc(STATE.currentUser.uid)
        .collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(20);
    
    const unsubscribe = notificationsRef.onSnapshot((snapshot) => {
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toMillis() || Date.now()
            });
        });
        
        // Update badge
        updateNotificationBadge(notifications);
        
        // Check for new notifications
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const notif = {
                    id: change.doc.id,
                    ...change.doc.data(),
                    createdAt: change.doc.data().createdAt?.toMillis() || Date.now()
                };
                
                // Show toast for new notifications (skip initial load)
                // Only show toast if this is not the initial load AND the notification is recent (within last 5 minutes)
                const isRecentNotification = (Date.now() - notif.createdAt) < (5 * 60 * 1000); // 5 minutes
                
                if (STATE.initialNotificationsLoaded && isRecentNotification) {
                    // Show toast notification
                    showToastNotification(
                        notif.title,
                        notif.message,
                        getToastType(notif.type),
                        5000
                    );
                }
            }
        });
        
        // Mark initial load as complete after processing all changes
        if (!STATE.initialNotificationsLoaded) {
            STATE.initialNotificationsLoaded = true;
        }
    }, (error) => {
        console.error('Error listening to notifications:', error);
    });
    
    return unsubscribe;
}

// Get toast type from notification type
function getToastType(notificationType) {
    const typeMap = {
        'friendRequest': 'info',
        'friendAccepted': 'success',
        'taskShared': 'info',
        'taskUpdated': 'info',
        'taskFinalized': 'success',
        'achievement': 'success'
    };
    return typeMap[notificationType] || 'info';
}

// Helper function to get user notifications from Firebase
async function getUserNotifications(userId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toMillis() || Date.now()
            });
        });
        
        return notifications;
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
}

// Helper function to mark notification as read
async function markNotificationAsRead(notificationId) {
    if (!STATE.currentUser) return;
    
    try {
        await firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .update({
                read: true
            });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}
