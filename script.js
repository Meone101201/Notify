// ==================== CONFIGURATION ====================
const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

let tasks = [];
let taskIdCounter = 1;
let tempSubtasks = [];
let currentUser = null;
let notificationPermission = false;
let notificationCheckInterval = null;

// ==================== FIREBASE INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    checkAuthState();
    requestNotificationPermissionOnLoad();
    renderTempSubtasks();
    startNotificationChecker();
});

function checkAuthState() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase not loaded, using localStorage');
        loadFromLocalStorage();
        return;
    }
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('✅ User signed in:', user.uid);
            loadTasksFromFirebase();
        } else {
            console.log('⚠️ No user signed in');
            showLoginModal();
        }
    });
}

// ==================== AUTHENTICATION ====================
function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

async function signInAnonymously() {
    try {
        await firebase.auth().signInAnonymously();
        closeLoginModal();
        showNotification('เข้าสู่ระบบสำเร็จ!', 'success');
    } catch (error) {
        console.error('Error signing in:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    }
}

async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        closeLoginModal();
        showNotification('เข้าสู่ระบบด้วย Google สำเร็จ!', 'success');
    } catch (error) {
        console.error('Error signing in with Google:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google', 'error');
    }
}

// ==================== NOTIFICATION SYSTEM ====================
function requestNotificationPermissionOnLoad() {
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
            document.getElementById('notificationModal').classList.add('show');
        }, 2000);
    } else if (Notification.permission === 'granted') {
        notificationPermission = true;
    }
}

function closeNotificationModal() {
    document.getElementById('notificationModal').classList.remove('show');
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
        return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        notificationPermission = true;
        closeNotificationModal();
        showNotification('เปิดใช้งานการแจ้งเตือนสำเร็จ!', 'success');
    } else {
        showNotification('ไม่สามารถเปิดใช้งานการแจ้งเตือนได้', 'error');
    }
}

function sendNotification(task, message) {
    if (!notificationPermission || Notification.permission !== 'granted') {
        return;
    }
    
    const notification = new Notification('🔔 แจ้งเตือนงาน', {
        body: `${task.name}\n${message}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png',
        tag: `task-${task.id}`,
        requireInteraction: true
    });
    
    playNotificationSound(task.notificationSound || 'default');
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

function playNotificationSound(soundType) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = {
        'default': [523.25, 659.25, 783.99],
        'bell': [440, 554.37, 659.25],
        'chime': [523.25, 659.25, 783.99, 1046.50],
        'alert': [880, 880, 880]
    };
    
    const freq = frequencies[soundType] || frequencies['default'];
    let time = audioContext.currentTime;
    
    freq.forEach((f, i) => {
        oscillator.frequency.setValueAtTime(f, time + (i * 0.2));
    });
    
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1);
    
    oscillator.start(time);
    oscillator.stop(time + 1);
}

function startNotificationChecker() {
    checkNotifications();
    notificationCheckInterval = setInterval(checkNotifications, 60000);
}

function checkNotifications() {
    const now = new Date().getTime();
    
    tasks.forEach(task => {
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

// ==================== FIREBASE DATABASE ====================
async function loadTasksFromFirebase() {
    if (!currentUser) {
        loadFromLocalStorage();
        return;
    }
    
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('tasks')
            .orderBy('createdAt', 'desc')
            .get();
        
        tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        if (tasks.length > 0) {
            taskIdCounter = Math.max(...tasks.map(t => parseInt(t.id))) + 1;
        }
        
        renderTasks();
        updateStats();
        console.log(`✅ Loaded ${tasks.length} tasks from Firebase`);
    } catch (error) {
        console.error('Error loading tasks:', error);
        loadFromLocalStorage();
    }
}

async function saveTasksToFirebase() {
    if (!currentUser) {
        saveToLocalStorage();
        return;
    }
    
    try {
        const batch = firebase.firestore().batch();
        const userTasksRef = firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('tasks');
        
        tasks.forEach(task => {
            const taskRef = userTasksRef.doc(task.id.toString());
            batch.set(taskRef, task);
        });
        
        await batch.commit();
        console.log('✅ Tasks saved to Firebase');
    } catch (error) {
        console.error('Error saving tasks:', error);
        saveToLocalStorage();
    }
}

function loadFromLocalStorage() {
    tasks = JSON.parse(localStorage.getItem('agileTasks')) || [];
    taskIdCounter = parseInt(localStorage.getItem('taskIdCounter')) || 1;
    renderTasks();
    updateStats();
}

function saveToLocalStorage() {
    localStorage.setItem('agileTasks', JSON.stringify(tasks));
    localStorage.setItem('taskIdCounter', taskIdCounter.toString());
}

// ==================== CALCULATION FUNCTIONS ====================
function calculateStoryPoint(difficulty, workload, risk, subtaskCount) {
    if (!difficulty || !workload || !risk || subtaskCount === 0) return 0;
    
    const baseScore = parseInt(difficulty) + parseInt(workload) + parseInt(risk);
    const rawPoint = baseScore * subtaskCount;
    
    let closestFib = FIBONACCI[0];
    let minDiff = Math.abs(rawPoint - closestFib);
    
    for (let fib of FIBONACCI) {
        const diff = Math.abs(rawPoint - fib);
        if (diff < minDiff) {
            minDiff = diff;
            closestFib = fib;
        }
    }
    
    return closestFib;
}

function getFormulaText(difficulty, workload, risk, subtaskCount) {
    if (!difficulty || !workload || !risk || subtaskCount === 0) return '';
    
    const baseScore = parseInt(difficulty) + parseInt(workload) + parseInt(risk);
    const rawPoint = baseScore * subtaskCount;
    
    return `สูตร: (${difficulty} + ${workload} + ${risk}) × ${subtaskCount} tasks = ${rawPoint} → ปัดเป็น Fibonacci`;
}

function explainStoryPoint(point) {
    if (point === 0 || point === 1) return "งานเล็กมาก ทำได้ทันที";
    if (point === 2) return "งานเล็ก ชัดเจน";
    if (point === 3) return "งานปานกลาง มี logic นิดหน่อย";
    if (point === 5) return "งานกลาง ซับซ้อนพอสมควร";
    if (point === 8) return "งานใหญ่ ซับซ้อน";
    if (point >= 13) return "งานใหญ่มาก ควรแตกย่อย";
    return "";
}

function updatePreview() {
    const difficulty = document.getElementById('difficulty').value;
    const workload = document.getElementById('workload').value;
    const risk = document.getElementById('risk').value;
    const subtaskCount = tempSubtasks.length;
    
    if (difficulty && workload && risk && subtaskCount > 0) {
        const point = calculateStoryPoint(difficulty, workload, risk, subtaskCount);
        document.getElementById('previewPoint').textContent = point;
        document.getElementById('previewFormula').textContent = getFormulaText(difficulty, workload, risk, subtaskCount);
        document.getElementById('previewRecommendation').textContent = explainStoryPoint(point);
    } else {
        document.getElementById('previewPoint').textContent = '-';
        document.getElementById('previewFormula').textContent = subtaskCount === 0 ? 'กรุณาเพิ่ม sub-tasks ก่อน' : '';
        document.getElementById('previewRecommendation').textContent = '';
    }
}

document.getElementById('difficulty').addEventListener('change', updatePreview);
document.getElementById('workload').addEventListener('change', updatePreview);
document.getElementById('risk').addEventListener('change', updatePreview);

// ==================== SUBTASK MANAGEMENT ====================
function addSubtask() {
    const input = document.getElementById('subtaskInput');
    const subtaskText = input.value.trim();
    
    if (!subtaskText) {
        alert('กรุณากรอกชื่อ sub-task');
        return;
    }
    
    tempSubtasks.push({ text: subtaskText, completed: false });
    renderTempSubtasks();
    updatePreview();
    input.value = '';
}

function renderTempSubtasks() {
    const container = document.getElementById('subtasksList');
    
    if (tempSubtasks.length === 0) {
        container.innerHTML = '<p style="color: #9ca3af; font-size: 0.9rem; text-align: center;">ยังไม่มี sub-task (กรุณาเพิ่มเพื่อคำนวณ Story Point)</p>';
        return;
    }
    
    container.innerHTML = tempSubtasks.map((subtask, index) => `
        <div class="subtask-item">
            <div class="subtask-text">
                <i class="fas fa-grip-vertical"></i>
                <span>${index + 1}. ${subtask.text}</span>
            </div>
            <button type="button" class="btn-remove-subtask" onclick="removeSubtask(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeSubtask(index) {
    tempSubtasks.splice(index, 1);
    renderTempSubtasks();
    updatePreview();
}

document.getElementById('subtaskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addSubtask();
    }
});

// ==================== TASK FORM SUBMISSION ====================
document.getElementById('taskForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('taskName').value;
    const assignee = document.getElementById('assignee').value;
    const description = document.getElementById('taskDescription').value;
    const dueDate = document.getElementById('dueDate').value;
    const difficulty = parseInt(document.getElementById('difficulty').value);
    const workload = parseInt(document.getElementById('workload').value);
    const risk = parseInt(document.getElementById('risk').value);
    const notificationSound = document.getElementById('notificationSound').value;
    
    if (tempSubtasks.length === 0) {
        alert('กรุณาเพิ่ม sub-task อย่างน้อย 1 รายการเพื่อคำนวณ Story Point');
        return;
    }
    
    if (!dueDate) {
        alert('กรุณาเลือกวันครบกำหนด');
        return;
    }
    
    const notifications = [];
    if (document.getElementById('notify1Week').checked) {
        notifications.push({ days: 7, sent: false });
    }
    if (document.getElementById('notify3Days').checked) {
        notifications.push({ days: 3, sent: false });
    }
    if (document.getElementById('notify1Day').checked) {
        notifications.push({ days: 1, sent: false });
    }
    if (document.getElementById('notify1Hour').checked) {
        notifications.push({ days: 0.042, sent: false });
    }
    if (document.getElementById('notifyOnTime').checked) {
        notifications.push({ days: 0, sent: false });
    }
    
    const storyPoint = calculateStoryPoint(difficulty, workload, risk, tempSubtasks.length);
    
    const task = {
        id: taskIdCounter++,
        name: taskName,
        description: description,
        assignee: assignee,
        dueDate: dueDate,
        difficulty: difficulty,
        workload: workload,
        risk: risk,
        storyPoint: storyPoint,
        subtasks: [...tempSubtasks],
        notifications: notifications,
        notificationSound: notificationSound,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    document.getElementById('taskForm').reset();
    tempSubtasks = [];
    renderTempSubtasks();
    updatePreview();
    
    showNotification('เพิ่มงานหลักสำเร็จ!', 'success');
});

// ==================== RENDER TASKS ====================
function renderTasks() {
    const container = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>ยังไม่มีงานในระบบ</p>
                <p class="empty-hint">เพิ่มงานแรกของคุณเพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => {
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const totalSubtasks = task.subtasks.length;
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks * 100).toFixed(0) : 0;
        const baseScore = task.difficulty + task.workload + task.risk;
        
        const dueDateBadge = getDueDateBadge(task.dueDate);
        
        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-main-info">
                        <div class="task-id">#${task.id}</div>
                        <div class="task-title">${task.name}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        ${dueDateBadge}
                    </div>
                    <div class="task-meta">
                        <div class="task-point">${task.storyPoint}</div>
                        <div class="task-assignee">
                            <i class="fas fa-user"></i>
                            ${task.assignee}
                        </div>
                    </div>
                </div>
                
                <div class="task-body">
                    <div class="task-stats">
                        <div class="task-stat">
                            <div class="task-stat-label">ความยาก</div>
                            <div class="task-stat-value">${task.difficulty}/5</div>
                        </div>
                        <div class="task-stat">
                            <div class="task-stat-label">ปริมาณงาน</div>
                            <div class="task-stat-value">${task.workload}/5</div>
                        </div>
                        <div class="task-stat">
                            <div class="task-stat-label">ความเสี่ยง</div>
                            <div class="task-stat-value">${task.risk}/5</div>
                        </div>
                    </div>
                    
                    <div class="task-calculation">
                        <div class="calc-label">📊 การคำนวณ Story Point:</div>
                        <div class="calc-formula">
                            (${task.difficulty} + ${task.workload} + ${task.risk}) × ${totalSubtasks} tasks 
                            = ${baseScore} × ${totalSubtasks} 
                            = ${baseScore * totalSubtasks} 
                            → <strong>${task.storyPoint} points</strong> (Fibonacci)
                        </div>
                    </div>
                    
                    <div class="subtasks-list">
                        <div class="subtasks-list-header">
                            <i class="fas fa-list-check"></i>
                            Sub-tasks (${completedSubtasks}/${totalSubtasks})
                        </div>
                        ${task.subtasks.map((subtask, index) => `
                            <div class="subtask-checkbox-item ${subtask.completed ? 'completed' : ''}">
                                <input 
                                    type="checkbox" 
                                    ${subtask.completed ? 'checked' : ''} 
                                    onchange="toggleSubtask(${task.id}, ${index})"
                                    id="subtask-${task.id}-${index}"
                                >
                                <label for="subtask-${task.id}-${index}">${index + 1}. ${subtask.text}</label>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="progress-bar-container">
                        <div class="progress-label">
                            <span>ความคืบหน้า</span>
                            <span><strong>${progress}%</strong></span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    
                    <div class="task-actions">
                        <button class="btn-task-action btn-delete-task" onclick="deleteTask(${task.id})">
                            <i class="fas fa-trash"></i> ลบงาน
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getDueDateBadge(dueDate) {
    if (!dueDate) return '';
    
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    let badgeClass = 'due-normal';
    let text = '';
    
    if (diff < 0) {
        badgeClass = 'due-overdue';
        text = `<i class="fas fa-exclamation-circle"></i> เลยกำหนด ${Math.abs(days)} วัน`;
    } else if (days === 0) {
        badgeClass = 'due-today';
        text = '<i class="fas fa-clock"></i> ครบกำหนดวันนี้';
    } else if (days === 1) {
        badgeClass = 'due-soon';
        text = '<i class="fas fa-bell"></i> ครบกำหนดพรุ่งนี้';
    } else if (days <= 3) {
        badgeClass = 'due-soon';
        text = `<i class="fas fa-bell"></i> เหลือ ${days} วัน`;
    } else {
        text = `<i class="fas fa-calendar"></i> เหลือ ${days} วัน`;
    }
    
    return `<div class="due-date-badge ${badgeClass}">${text}</div>`;
}

function toggleSubtask(taskId, subtaskIndex) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
    saveTasksToFirebase();
    renderTasks();
    updateStats();
}

function deleteTask(taskId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้? (รวมทั้ง sub-tasks ทั้งหมด)')) return;
    
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    showNotification('ลบงานสำเร็จ!', 'error');
}

// ==================== STATISTICS ====================
function updateStats() {
    const totalTasks = tasks.length;
    const totalPoints = tasks.reduce((sum, task) => sum + task.storyPoint, 0);
    
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    tasks.forEach(task => {
        totalSubtasks += task.subtasks.length;
        completedSubtasks += task.subtasks.filter(st => st.completed).length;
    });
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('totalPoints').textContent = totalPoints;
    document.getElementById('inProgress').textContent = totalSubtasks - completedSubtasks;
    document.getElementById('completed').textContent = completedSubtasks;
}

// ==================== EXPORT ====================
function exportToCSV() {
    if (tasks.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
    }
    
    let csvContent = '\uFEFF';
    csvContent += 'ID,งานหลัก,รายละเอียด,ผู้รับผิดชอบ,วันครบกำหนด,ความยาก,ปริมาณงาน,ความเสี่ยง,จำนวน Sub-tasks,Story Point,เสร็จแล้ว,ความคืบหน้า,สูตรคำนวณ\n';
    
    tasks.forEach(task => {
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const totalSubtasks = task.subtasks.length;
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks * 100).toFixed(0) : 0;
        const baseScore = task.difficulty + task.workload + task.risk;
        const formula = `(${task.difficulty}+${task.workload}+${task.risk}) × ${totalSubtasks} = ${baseScore * totalSubtasks} → ${task.storyPoint}`;
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleString('th-TH') : '-';
        
        csvContent += `"${task.id}","${task.name}","${task.description || '-'}","${task.assignee}","${dueDate}",`;
        csvContent += `"${task.difficulty}","${task.workload}","${task.risk}","${totalSubtasks}","${task.storyPoint}",`;
        csvContent += `"${completedSubtasks}","${progress}%","${formula}"\n`;
        
        task.subtasks.forEach((subtask, index) => {
            csvContent += `"","  ${index + 1}. ${subtask.text}","","","","","","","","","${subtask.completed ? 'เสร็จ' : 'ยังไม่เสร็จ'}","",""\n`;
        });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `agile-tasks-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export สำเร็จ!', 'success');
}

function clearAll() {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
    
    tasks = [];
    taskIdCounter = 1;
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    showNotification('ล้างข้อมูลทั้งหมดแล้ว!', 'error');
}

// ==================== NOTIFICATION UI ====================
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ==================== CSS ANIMATIONS ====================
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
