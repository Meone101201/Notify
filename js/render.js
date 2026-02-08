// ==================== RENDER FUNCTIONS ====================

function renderTasks() {
    const ownTasksContainer = document.getElementById('tasksList');
    const sharedTasksContainer = document.getElementById('sharedTasksList');
    const sharedTasksSection = document.getElementById('sharedTasksContainer');
    const sharedTasksCount = document.getElementById('sharedTasksCount');
    
    // Separate own tasks and shared tasks
    const ownTasks = STATE.tasks.filter(task => task.isOwnTask || task.owner === STATE.currentUser?.uid);
    const sharedTasks = STATE.tasks.filter(task => task.isSharedWithMe && !task.isOwnTask);
    
    // Render own tasks
    if (ownTasks.length === 0) {
        ownTasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>ยังไม่มีงานในระบบ</p>
                <p class="empty-hint">เพิ่มงานแรกของคุณเพื่อเริ่มต้น</p>
            </div>
        `;
    } else {
        ownTasksContainer.innerHTML = ownTasks.map((task, index) => renderSingleTask(task, index)).join('');
    }
    
    // Render shared tasks
    if (sharedTasks.length === 0) {
        sharedTasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-share-alt"></i>
                <p>ยังไม่มีงานที่แชร์ให้คุณ</p>
                <p class="empty-hint">เมื่อเพื่อนแชร์งานให้ จะแสดงที่นี่</p>
            </div>
        `;
        sharedTasksSection.style.display = 'none';
    } else {
        sharedTasksContainer.innerHTML = sharedTasks.map((task, index) => renderSingleTask(task, index, true)).join('');
        sharedTasksSection.style.display = 'block';
        sharedTasksCount.textContent = `${sharedTasks.length} งาน`;
    }
    
    // ✅ คืนสถานะการขยายหลัง re-render
    restoreExpandedState();
}

function renderSingleTask(task, index, isShared = false) {
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const totalSubtasks = task.subtasks.length;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks * 100).toFixed(0) : 0;
    const baseScore = task.difficulty + task.workload + task.risk;
    
    // ✅ สร้าง unique ID ที่ปลอดภัย (ไม่ซ้ำระหว่างงานของตัวเองกับงานที่แชร์มา)
    const uniqueTaskId = `task-${task.id}-${task.owner || 'own'}`;
    
    const dueDateBadge = getDueDateBadge(task.dueDate);
    const notificationList = getNotificationList(task.notifications);
    const completedClass = task.completed ? 'task-completed' : '';
    const completedBadge = task.completed ? '<div class="completed-badge"><i class="fas fa-check-circle"></i> งานเสร็จแล้ว</div>' : '';
    
    // Collaboration features
    const taskBadge = renderTaskBadge(task);
    const collaborators = renderCollaborators(task);
    
    // Add shared task indicator
    const sharedIndicator = isShared ? '<div class="shared-task-badge"><i class="fas fa-share-alt"></i> งานที่แชร์ให้</div>' : '';
    
    // ✅ สร้างข้อมูลสรุปสำหรับแสดงตอนหุบ
    const notificationSummary = getNotificationSummary(task.notifications);
    const collaboratorsSummary = getCollaboratorsSummary(task);
    
    return `
        <div class="task-card ${completedClass} ${isShared ? 'shared-task' : ''}" id="${uniqueTaskId}">
            <!-- ✅ ส่วนหัวที่แสดงตลอด (คลิกเพื่อขยาย/หุบ) -->
            <div class="task-header-compact" onclick="toggleTaskExpand('${uniqueTaskId}')">
                <div class="task-compact-left">
                    <div class="task-id">#${index + 1}</div>
                    <div class="task-title-compact">
                        <div class="task-title">${task.name}</div>
                        <div class="task-meta-compact">
                            <span class="task-point-compact"><i class="fas fa-star"></i> ${task.storyPoint} pts</span>
                            <span class="task-progress-compact"><i class="fas fa-tasks"></i> ${completedSubtasks}/${totalSubtasks}</span>
                            ${notificationSummary}
                            ${collaboratorsSummary}
                        </div>
                    </div>
                </div>
                <div class="task-compact-right">
                    ${completedBadge}
                    <button class="btn-expand-toggle" onclick="event.stopPropagation(); toggleTaskExpand('${uniqueTaskId}')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            </div>
            
            <!-- ✅ ส่วนรายละเอียดที่ซ่อนไว้ (ค่าเริ่มต้นหุบ) -->
            <div class="task-body-expandable" style="display: none;">
                <div class="task-header">
                    <div class="task-main-info">
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        ${sharedIndicator}
                        ${taskBadge}
                        ${dueDateBadge}
                    </div>
                    <div class="task-meta">
                        <div class="task-assignee">
                            <i class="fas fa-user"></i>
                            ${task.assignee}
                        </div>
                        ${task.visibility === 'shared' ? `
                        <button class="btn-task-details" onclick="showTaskDetailModal(${task.id})" title="ดูรายละเอียดงาน">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ` : ''}
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
                    
                    ${collaborators}
                    
                    <div class="subtasks-list">
                        <div class="subtasks-list-header">
                            <i class="fas fa-list-check"></i>
                            Sub-tasks (${completedSubtasks}/${totalSubtasks})
                        </div>
                        ${task.subtasks.map((subtask, idx) => `
                            <div class="subtask-checkbox-item ${subtask.completed ? 'completed' : ''} ${task.finalized === true && task.finalizedAt ? 'finalized' : ''} ${task.completed ? 'locked' : ''}" data-task-id="${task.id}" data-finalized="${task.finalized}">
                                <input 
                                    type="checkbox" 
                                    ${subtask.completed ? 'checked' : ''} 
                                    ${task.finalized === true && task.finalizedAt ? 'disabled' : ''}
                                    ${task.completed ? 'disabled' : ''}
                                    onchange="toggleSubtask(${task.id}, ${idx}, '${task.owner || ''}')"
                                    id="subtask-${task.id}-${task.owner || 'own'}-${idx}"
                                >
                                <label for="subtask-${task.id}-${task.owner || 'own'}-${idx}">${idx + 1}. ${subtask.text}</label>
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
                        ${renderTaskActions(task, isShared)}
                    </div>
                </div>
            </div>
        </div>
    `;
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
                ${notifTexts.map(text => `<span class="notification-info-badge">${text}</span>`).join('')}
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

// ==================== COLLABORATION UI HELPERS ====================

function renderShareButton(task) {
    if (!task) return '';
    
    // Only show share button for task owners
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    if (!currentUserId || task.owner !== currentUserId) {
        return '';
    }
    
    return `
        <button class="btn-task-action btn-share" onclick="showShareTaskModal(${task.id})">
            <i class="fas fa-share-alt"></i> แชร์
        </button>
    `;
}

function renderTaskActions(task, isShared = false) {
    if (!task) return '';
    
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    const isOwner = task.owner === currentUserId;
    const isSharedWithMe = task.isSharedWithMe && !isOwner;
    
    // ✅ STRICT CHECK: Consider finalized if finalized=true (regardless of finalizedAt)
    // This prevents the button from showing even during optimistic updates
    const isFinalized = task.finalized === true;
    
    let actions = [];
    
    // For shared tasks, show limited actions
    if (isShared) {
        // Complete/Uncomplete button - available for shared tasks (disabled if finalized)
        if (isFinalized) {
            actions.push(`
                <button class="btn-task-action btn-finalized" disabled>
                    <i class="fas fa-lock"></i> งานบันทึกแล้ว
                </button>
            `);
        } else {
            // Check if all subtasks are completed
            const allSubtasksCompleted = task.subtasks.every(st => st.completed);
            const isDisabled = !task.completed && !allSubtasksCompleted;
            
            actions.push(`
                <button class="btn-task-action ${task.completed ? 'btn-unmark' : 'btn-mark'}" 
                        onclick="toggleTaskComplete(${task.id}, '${task.owner || ''}')"
                        ${isDisabled ? 'disabled' : ''}>
                    <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i> 
                    ${task.completed ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ'}
                </button>
            `);
        }
        
        // Detail button for shared tasks
        actions.push(`
            <button class="btn-task-action btn-comment" onclick="showTaskDetailModal(${task.id})">
                <i class="fas fa-info-circle"></i> รายละเอียด
            </button>
        `);
        
        return actions.join('');
    }
    
    // For own tasks, show full actions
    // If finalized, show locked status and points
    if (isFinalized) {
        actions.push(`
            <button class="btn-task-action btn-finalized" disabled>
                <i class="fas fa-lock"></i> งานบันทึกแล้ว
            </button>
        `);
        
        // Show points awarded info
        if (task.pointsAwarded) {
            const ownerPoints = task.pointsAwarded.owner || 0;
            actions.push(`
                <div class="points-awarded-info">
                    <i class="fas fa-trophy"></i> คุณได้รับ ${ownerPoints} คะแนน
                </div>
            `);
        }
        
        // ✅ Show share button for owners even if finalized
        if (isOwner) {
            actions.push(renderShareButton(task));
        }
        
        // ✅ Show delete button for owners even if finalized
        if (isOwner) {
            actions.push(`
                <button class="btn-task-action btn-delete-task" onclick="deleteTask(${task.id}, '${task.owner}')">
                    <i class="fas fa-trash"></i> ลบงาน
                </button>
            `);
        }
        
        // ✅ Show detail button for shared tasks even if finalized
        if (isSharedWithMe || (isOwner && task.visibility === 'shared')) {
            actions.push(`
                <button class="btn-task-action btn-comment" onclick="showTaskDetailModal(${task.id})">
                    <i class="fas fa-info-circle"></i> รายละเอียด
                </button>
            `);
        }
    } else {
        // Not finalized - show action buttons
        // Check if all subtasks are completed
        const allSubtasksCompleted = task.subtasks.every(st => st.completed);
        const isDisabled = !task.completed && !allSubtasksCompleted;
        
        // Complete/Uncomplete button - available for all tasks
        actions.push(`
            <button class="btn-task-action ${task.completed ? 'btn-unmark' : 'btn-mark'}" 
                    onclick="toggleTaskComplete(${task.id}, '${task.owner || ''}')"
                    ${isDisabled ? 'disabled' : ''}>
                <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i> 
                ${task.completed ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ'}
            </button>
        `);
        
        // Finalize button - only for owners when task is completed AND not finalized
        if (isOwner && task.completed && !isFinalized) {
            actions.push(`
                <button class="btn-task-action btn-finalize" 
                        onclick="finalizeTask(${task.id}, '${task.owner || ''}')"
                        id="finalize-btn-${task.id}">
                    <i class="fas fa-save"></i> บันทึกงาน
                </button>
            `);
        }
        
        // Share button - only for owners
        if (isOwner) {
            actions.push(renderShareButton(task));
        }
        
        // Edit button - for owners and collaborators
        if (isOwner || isSharedWithMe) {
            actions.push(`
                <button class="btn-task-action btn-edit" onclick="editTask(${task.id}, '${task.owner}')">
                    <i class="fas fa-edit"></i> แก้ไข
                </button>
            `);
        }
        
        // Delete button - only for owners
        if (isOwner) {
            actions.push(`
                <button class="btn-task-action btn-delete-task" onclick="deleteTask(${task.id}, '${task.owner}')">
                    <i class="fas fa-trash"></i> ลบงาน
                </button>
            `);
        }
        
        // Detail button - for shared tasks
        if (isSharedWithMe || (isOwner && task.visibility === 'shared')) {
            actions.push(`
                <button class="btn-task-action btn-comment" onclick="showTaskDetailModal(${task.id})">
                    <i class="fas fa-info-circle"></i> รายละเอียด
                </button>
            `);
        }
    }
    
    return actions.join('');
}

function renderTaskBadge(task) {
    if (!task) return '';
    
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // Check if this is a shared task that belongs to someone else
    if (task.isSharedWithMe && task.owner !== currentUserId) {
        // Find owner info
        const owner = STATE.friends ? STATE.friends.find(f => f.uid === task.owner) : null;
        const ownerName = owner ? (owner.displayName || owner.email) : 'ผู้ใช้';
        
        return `
            <div class="task-badge task-badge-shared-with-me">
                <i class="fas fa-share-alt"></i> แชร์จาก ${ownerName}
            </div>
        `;
    } else if (task.visibility === 'shared') {
        const collaboratorCount = task.sharedWith ? task.sharedWith.length : 0;
        return `
            <div class="task-badge task-badge-shared">
                <i class="fas fa-users"></i> แชร์ (${collaboratorCount} คน)
            </div>
        `;
    } else {
        return `
            <div class="task-badge task-badge-private">
                <i class="fas fa-lock"></i> ส่วนตัว
            </div>
        `;
    }
}

function renderCollaborators(task) {
    if (!task || !task.sharedWith || task.sharedWith.length === 0) {
        return '';
    }
    
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // Separate owner and collaborators
    const owner = task.owner;
    const collaborators = task.sharedWith || [];
    
    // Get owner info
    let ownerInfo = '';
    if (owner) {
        const ownerData = owner === currentUserId 
            ? { displayName: 'คุณ', photoURL: STATE.currentUser?.photoURL }
            : (STATE.friends ? STATE.friends.find(f => f.uid === owner) : null);
        
        const ownerName = ownerData ? (ownerData.displayName || ownerData.email || 'ผู้ใช้') : 'ผู้ใช้';
        const ownerPhoto = ownerData ? ownerData.photoURL : null;
        
        if (ownerPhoto) {
            ownerInfo = `
                <div class="collaborator-avatar" title="${ownerName}">
                    <img src="${ownerPhoto}" alt="${ownerName}" />
                </div>
            `;
        } else {
            const initials = ownerName.substring(0, 2).toUpperCase();
            ownerInfo = `
                <div class="collaborator-avatar collaborator-avatar-initials" title="${ownerName}">
                    ${initials}
                </div>
            `;
        }
    }
    
    // Get collaborator info from STATE.friends if available
    const collaboratorAvatars = collaborators.slice(0, 3).map((uid, index) => {
        if (uid === owner) return ''; // Skip owner in collaborators list
        
        // Try to find friend info
        const friend = uid === currentUserId 
            ? { displayName: 'คุณ', photoURL: STATE.currentUser?.photoURL }
            : (STATE.friends ? STATE.friends.find(f => f.uid === uid) : null);
        
        const displayName = friend ? (friend.displayName || friend.email || 'ผู้ใช้') : 'ผู้ใช้';
        const photoURL = friend ? friend.photoURL : null;
        
        if (photoURL) {
            return `
                <div class="collaborator-avatar" title="${displayName}">
                    <img src="${photoURL}" alt="${displayName}" />
                </div>
            `;
        } else {
            // Use initials as fallback
            const initials = displayName.substring(0, 2).toUpperCase();
            return `
                <div class="collaborator-avatar collaborator-avatar-initials" title="${displayName}">
                    ${initials}
                </div>
            `;
        }
    }).filter(avatar => avatar !== '').join('');
    
    const actualCollaboratorCount = collaborators.filter(uid => uid !== owner).length;
    const moreCount = actualCollaboratorCount > 3 ? actualCollaboratorCount - 3 : 0;
    const moreIndicator = moreCount > 0 ? `
        <div class="collaborator-avatar collaborator-avatar-more">
            +${moreCount}
        </div>
    ` : '';
    
    // Get last modified by info
    let lastModifiedInfo = '';
    if (task.lastModifiedBy && task.lastModifiedAt) {
        const modifier = task.lastModifiedBy === currentUserId 
            ? 'คุณ' 
            : (STATE.friends?.find(f => f.uid === task.lastModifiedBy)?.displayName || 'ผู้ใช้');
        
        const modifiedTime = formatRelativeTime(task.lastModifiedAt);
        
        lastModifiedInfo = `
            <div class="last-modified-info">
                <i class="fas fa-clock"></i>
                แก้ไขล่าสุดโดย <strong>${modifier}</strong> ${modifiedTime}
            </div>
        `;
    }
    
    return `
        <div class="collaborators-section">
            <div class="collaborators-list">
                <div class="collaborators-group">
                    <div class="collaborators-label">
                        <i class="fas fa-user-crown"></i> ผู้รับผิดชอบ:
                    </div>
                    <div class="collaborators-avatars">
                        ${ownerInfo}
                    </div>
                </div>
                ${actualCollaboratorCount > 0 ? `
                <div class="collaborators-group">
                    <div class="collaborators-label">
                        <i class="fas fa-user-friends"></i> ผู้ร่วมงาน:
                    </div>
                    <div class="collaborators-avatars">
                        ${collaboratorAvatars}
                        ${moreIndicator}
                    </div>
                </div>
                ` : ''}
            </div>
            ${lastModifiedInfo}
        </div>
    `;
}

// ==================== FRIENDS UI RENDERING ====================

function renderFriendsList() {
    const container = document.getElementById('friendsList');
    
    if (!STATE.friends || STATE.friends.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <p>ยังไม่มีเพื่อนในรายชื่อ</p>
                <p class="empty-hint">เพิ่มเพื่อนคนแรกของคุณเพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = STATE.friends.map(friend => {
        const displayName = friend.displayName || friend.email || 'Unknown User';
        const photoURL = friend.photoURL || null;
        const email = friend.email || '';
        
        const avatarHTML = photoURL 
            ? `<img src="${photoURL}" alt="${displayName}" class="friend-avatar" />`
            : `<div class="friend-avatar friend-avatar-placeholder">
                <i class="fas fa-user"></i>
               </div>`;
        
        return `
            <div class="friend-card">
                <div class="friend-info">
                    ${avatarHTML}
                    <div class="friend-details">
                        <div class="friend-name">${displayName}</div>
                        <div class="friend-email">${email}</div>
                    </div>
                </div>
                <button class="btn-remove-friend" onclick="handleRemoveFriend('${friend.uid}')" title="ลบเพื่อน">
                    <i class="fas fa-user-minus"></i> ลบ
                </button>
            </div>
        `;
    }).join('');
}

function renderPendingRequests() {
    const container = document.getElementById('pendingRequestsList');
    
    if (!STATE.pendingRequests || STATE.pendingRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>ไม่มีคำขอเป็นเพื่อนที่รอดำเนินการ</p>
            </div>
        `;
        return;
    }
    
    // Fetch sender data for each request
    const requestsWithSenderData = STATE.pendingRequests.map(async (request) => {
        try {
            const senderDoc = await firebase.firestore()
                .collection('users')
                .doc(request.from)
                .get();
            
            if (senderDoc.exists) {
                return {
                    ...request,
                    fromUserData: { uid: senderDoc.id, ...senderDoc.data() }
                };
            }
            return request;
        } catch (error) {
            console.error('Error fetching sender data:', error);
            return request;
        }
    });
    
    Promise.all(requestsWithSenderData).then(requests => {
        container.innerHTML = requests.map(request => {
            const senderName = request.fromUserData?.displayName || request.fromUserData?.email || 'Unknown User';
            const senderEmail = request.fromUserData?.email || '';
            const senderPhoto = request.fromUserData?.photoURL || null;
            
            const avatarHTML = senderPhoto 
                ? `<img src="${senderPhoto}" alt="${senderName}" class="request-avatar" />`
                : `<div class="request-avatar request-avatar-placeholder">
                    <i class="fas fa-user"></i>
                   </div>`;
            
            return `
                <div class="request-card">
                    <div class="request-info">
                        ${avatarHTML}
                        <div class="request-details">
                            <div class="request-name">${senderName}</div>
                            <div class="request-email">${senderEmail}</div>
                            <div class="request-message">ต้องการเป็นเพื่อนกับคุณ</div>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn-accept-request" onclick="handleAcceptRequest('${request.id}')" title="ยอมรับ">
                            <i class="fas fa-check"></i> ยอมรับ
                        </button>
                        <button class="btn-reject-request" onclick="handleRejectRequest('${request.id}')" title="ปฏิเสธ">
                            <i class="fas fa-times"></i> ปฏิเสธ
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// ==================== UTILITY FUNCTIONS ====================

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

// ==================== EXPAND/COLLAPSE HELPERS ====================

/**
 * สร้างข้อความสรุปการแจ้งเตือน (แสดงตอนหุบ)
 */
function getNotificationSummary(notifications) {
    if (!notifications || notifications.length === 0) {
        return '<span class="notification-summary"><i class="fas fa-bell-slash"></i> ไม่มีการเตือน</span>';
    }
    
    const notifCount = notifications.length;
    const notifTexts = notifications.map(n => {
        if (n.days === 7) return '1 สัปดาห์';
        if (n.days === 3) return '3 วัน';
        if (n.days === 1) return '1 วัน';
        if (n.days === 0.042) return '1 ชม.';
        if (n.days === 0) return 'ตรงเวลา';
        return `${n.days} วัน`;
    }).join(', ');
    
    return `<span class="notification-summary" title="เตือนก่อน: ${notifTexts}"><i class="fas fa-bell"></i> ${notifCount} ครั้ง</span>`;
}

/**
 * สร้างข้อความสรุปผู้ร่วมงาน (แสดงตอนหุบ)
 */
function getCollaboratorsSummary(task) {
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // ถ้าเป็นงานที่แชร์ให้เรา แสดงชื่อเจ้าของ
    if (task.isSharedWithMe && task.owner !== currentUserId) {
        const owner = STATE.friends ? STATE.friends.find(f => f.uid === task.owner) : null;
        const ownerName = owner ? (owner.displayName || owner.email || 'ผู้ใช้') : 'ผู้ใช้';
        return `<span class="collaborators-summary" title="เจ้าของงาน"><i class="fas fa-share-alt"></i> จาก ${ownerName}</span>`;
    }
    
    // ถ้าเป็นงานของเราที่แชร์ให้คนอื่น
    if (task.visibility === 'shared' && task.sharedWith && task.sharedWith.length > 0) {
        const count = task.sharedWith.length;
        return `<span class="collaborators-summary" title="แชร์ให้ ${count} คน"><i class="fas fa-users"></i> ${count} คน</span>`;
    }
    
    // งานส่วนตัว
    return '<span class="collaborators-summary"><i class="fas fa-lock"></i> ส่วนตัว</span>';
}

/**
 * ฟังก์ชันสำหรับขยาย/หุบงาน
 */
function toggleTaskExpand(uniqueTaskId) {
    const taskCard = document.getElementById(uniqueTaskId);
    if (!taskCard) return;
    
    const expandableBody = taskCard.querySelector('.task-body-expandable');
    const toggleBtn = taskCard.querySelector('.btn-expand-toggle i');
    
    if (!expandableBody || !toggleBtn) return;
    
    const isExpanded = expandableBody.style.display !== 'none';
    
    if (isExpanded) {
        // หุบ
        expandableBody.style.display = 'none';
        toggleBtn.className = 'fas fa-chevron-down';
        taskCard.classList.remove('task-expanded');
        // ✅ ลบออกจาก Set
        STATE.expandedTasks.delete(uniqueTaskId);
    } else {
        // ขยาย
        expandableBody.style.display = 'block';
        toggleBtn.className = 'fas fa-chevron-up';
        taskCard.classList.add('task-expanded');
        // ✅ เพิ่มเข้า Set
        STATE.expandedTasks.add(uniqueTaskId);
    }
}

/**
 * ✅ คืนสถานะการขยายหลัง re-render
 */
function restoreExpandedState() {
    // รอให้ DOM อัพเดตเสร็จก่อน
    setTimeout(() => {
        STATE.expandedTasks.forEach(uniqueTaskId => {
            const taskCard = document.getElementById(uniqueTaskId);
            if (!taskCard) {
                // ถ้างานไม่มีแล้ว (ถูกลบ) ให้ลบออกจาก Set
                STATE.expandedTasks.delete(uniqueTaskId);
                return;
            }
            
            const expandableBody = taskCard.querySelector('.task-body-expandable');
            const toggleBtn = taskCard.querySelector('.btn-expand-toggle i');
            
            if (expandableBody && toggleBtn) {
                expandableBody.style.display = 'block';
                toggleBtn.className = 'fas fa-chevron-up';
                taskCard.classList.add('task-expanded');
            }
        });
    }, 0);
}
