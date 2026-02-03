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
