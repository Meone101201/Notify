// ==================== RENDER FUNCTIONS ====================

function renderTasks() {
    const container = document.getElementById('tasksList');
    
    if (STATE.tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>ยังไม่มีงานในระบบ</p>
                <p class="empty-hint">เพิ่มงานแรกของคุณเพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = STATE.tasks.map((task, index) => {
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const totalSubtasks = task.subtasks.length;
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks * 100).toFixed(0) : 0;
        const baseScore = task.difficulty + task.workload + task.risk;
        
        const dueDateBadge = getDueDateBadge(task.dueDate);
        const notificationList = getNotificationList(task.notifications);
        const completedClass = task.completed ? 'task-completed' : '';
        const completedBadge = task.completed ? '<div class="completed-badge"><i class="fas fa-check-circle"></i> งานเสร็จแล้ว</div>' : '';
        
        return `
            <div class="task-card ${completedClass}">
                <div class="task-header">
                    <div class="task-main-info">
                        <div class="task-id">#${index + 1}</div>
                        <div class="task-title">${task.name}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        ${completedBadge}
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
                    
                    ${notificationList}
                    
                    <div class="task-actions">
                        <button class="btn-task-action ${task.completed ? 'btn-unmark' : 'btn-mark'}" onclick="toggleTaskComplete(${task.id})">
                            <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i> 
                            ${task.completed ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ'}
                        </button>
                        <button class="btn-task-action btn-edit" onclick="editTask(${task.id})">
                            <i class="fas fa-edit"></i> แก้ไข
                        </button>
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
    
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    // เปรียบเทียบวันที่ (ไม่สนใจเวลา)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueOnlyDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const daysDiff = Math.ceil((dueOnlyDate - nowDate) / (1000 * 60 * 60 * 24));
    
    // ฟอร์แมตวันที่และเวลา
    const dateStr = due.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    const timeStr = due.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const fullDateTime = `${dateStr} เวลา ${timeStr}`;
    
    let badgeClass = 'due-normal';
    let text = '';
    
    if (diff < 0) {
        // เลยกำหนดแล้ว
        const overdueDays = Math.abs(daysDiff);
        badgeClass = 'due-overdue';
        text = `<i class="fas fa-exclamation-circle"></i> เลยกำหนด ${overdueDays} วัน (${fullDateTime})`;
    } else if (daysDiff === 0) {
        // วันเดียวกัน = วันนี้
        badgeClass = 'due-today';
        text = `<i class="fas fa-clock"></i> ครบกำหนดวันนี้ (${fullDateTime})`;
    } else if (daysDiff === 1) {
        // พรุ่งนี้
        badgeClass = 'due-soon';
        text = `<i class="fas fa-bell"></i> ครบกำหนดพรุ่งนี้ (${fullDateTime})`;
    } else if (daysDiff <= 3) {
        // 2-3 วัน
        badgeClass = 'due-soon';
        text = `<i class="fas fa-bell"></i> เหลือ ${daysDiff} วัน (${fullDateTime})`;
    } else {
        // มากกว่า 3 วัน
        text = `<i class="fas fa-calendar"></i> เหลือ ${daysDiff} วัน (${fullDateTime})`;
    }
    
    return `<div class="due-date-badge ${badgeClass}">${text}</div>`;
}

function getNotificationList(notifications) {
    if (!notifications || notifications.length === 0) {
        return `
            <div class="notification-info">
                <div class="notification-info-header">
                    <i class="fas fa-bell-slash"></i> ไม่มีการแจ้งเตือน
                </div>
            </div>
        `;
    }
    
    const notifTexts = notifications.map(notif => {
        if (notif.days === 7) return 'ก่อน 1 สัปดาห์';
        if (notif.days === 3) return 'ก่อน 3 วัน';
        if (notif.days === 1) return 'ก่อน 1 วัน';
        if (notif.days === 0.042) return 'ก่อน 1 ชั่วโมง';
        if (notif.days === 0) return 'เมื่อถึงเวลา';
        return `ก่อน ${notif.days} วัน`;
    });
    
    return `
        <div class="notification-info">
            <div class="notification-info-header">
                <i class="fas fa-bell"></i> จะแจ้งเตือน:
            </div>
            <div class="notification-info-list">
                ${notifTexts.map(text => `<span class="notification-badge">${text}</span>`).join('')}
            </div>
        </div>
    `;
}

function updateStats() {
    const totalTasks = STATE.tasks.length;
    const totalPoints = STATE.tasks.reduce((sum, task) => sum + task.storyPoint, 0);
    
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    STATE.tasks.forEach(task => {
        totalSubtasks += task.subtasks.length;
        completedSubtasks += task.subtasks.filter(st => st.completed).length;
    });
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('totalPoints').textContent = totalPoints;
    document.getElementById('inProgress').textContent = totalSubtasks - completedSubtasks;
    document.getElementById('completed').textContent = completedSubtasks;
}
