// ==================== TASK MANAGEMENT ====================

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('taskName').value;
    const assignee = document.getElementById('assignee').value;
    const description = document.getElementById('taskDescription').value;
    const dueDate = document.getElementById('dueDate').value;
    const difficulty = parseInt(document.getElementById('difficulty').value);
    const workload = parseInt(document.getElementById('workload').value);
    const risk = parseInt(document.getElementById('risk').value);
    const notificationSound = document.getElementById('notificationSound').value;
    
    if (STATE.tempSubtasks.length === 0) {
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
    
    const storyPoint = calculateStoryPoint(difficulty, workload, risk, STATE.tempSubtasks.length);
    
    // ตรวจสอบว่าเป็นโหมดแก้ไขหรือเพิ่มใหม่
    if (STATE.editingTaskId) {
        // โหมดแก้ไข - อัปเดตงานเดิม
        const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
        const editingOwner = STATE.editingTaskOwner || currentUserId;
        
        // Find the correct task by matching both id and owner
        let taskIndex;
        if (editingOwner !== currentUserId) {
            // Editing a shared task from a friend
            taskIndex = STATE.tasks.findIndex(t => t.id === STATE.editingTaskId && t.owner === editingOwner && t.isSharedWithMe);
        } else {
            // Editing our own task
            taskIndex = STATE.tasks.findIndex(t => t.id === STATE.editingTaskId && (t.isOwnTask || t.owner === currentUserId));
        }
        
        if (taskIndex !== -1) {
            const oldTask = STATE.tasks[taskIndex];
            STATE.tasks[taskIndex] = {
                ...oldTask,
                name: taskName,
                description: description,
                assignee: assignee,
                dueDate: dueDate,
                difficulty: difficulty,
                workload: workload,
                risk: risk,
                storyPoint: storyPoint,
                subtasks: [...STATE.tempSubtasks],
                notifications: notifications,
                notificationSound: notificationSound
            };
            showNotification('อัปเดตงานสำเร็จ!', 'success');
        }
        
        // ยกเลิกโหมดแก้ไข
        cancelEdit();
    } else {
        // โหมดเพิ่มใหม่
        const task = {
            id: STATE.taskIdCounter++,
            name: taskName,
            description: description,
            assignee: assignee,
            dueDate: dueDate,
            difficulty: difficulty,
            workload: workload,
            risk: risk,
            storyPoint: storyPoint,
            subtasks: [...STATE.tempSubtasks],
            notifications: notifications,
            notificationSound: notificationSound,
            completed: false,
            createdAt: new Date().toISOString(),
            // Collaboration fields
            visibility: 'private',
            owner: STATE.currentUser ? STATE.currentUser.uid : null,
            sharedWith: [],
            collaborators: [],
            comments: [],
            lastModifiedBy: STATE.currentUser ? STATE.currentUser.uid : null,
            lastModifiedAt: new Date().toISOString()
        };
        
        STATE.tasks.push(task);
        showNotification('เพิ่มงานหลักสำเร็จ!', 'success');
    }
    
    // ✅ รอให้ save เสร็จก่อนที่จะ render
    await saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    document.getElementById('taskForm').reset();
    STATE.tempSubtasks = [];
    renderTempSubtasks();
    updatePreview();
}

function deleteTask(taskId, ownerId = null) {
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // Find the correct task by matching both taskId and owner
    let task;
    if (ownerId && ownerId !== currentUserId) {
        // This is a shared task from a friend (shouldn't be able to delete)
        task = STATE.tasks.find(t => t.id === taskId && t.owner === ownerId && t.isSharedWithMe);
    } else {
        // This is our own task
        task = STATE.tasks.find(t => t.id === taskId && (t.isOwnTask || t.owner === currentUserId));
    }
    
    if (!task) {
        console.error(`Task not found: taskId=${taskId}, ownerId=${ownerId}`);
        return;
    }
    
    console.log(`🔍 Deleting task: ${task.name} (owner: ${task.owner}, isSharedWithMe: ${task.isSharedWithMe})`);
    
    // Check ownership for shared tasks
    if (task.visibility === 'shared') {
        if (!canDeleteTask(taskId, currentUserId)) {
            if (typeof handlePermissionError !== 'undefined') {
                handlePermissionError('not-owner', { 
                    operation: 'deleteTask',
                    taskId 
                });
            } else {
                showNotification('คุณไม่มีสิทธิ์ลบงานนี้ เฉพาะเจ้าของเท่านั้น', 'error');
            }
            return;
        }
    }
    
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้? (รวมทั้ง sub-tasks ทั้งหมด)')) return;
    
    // Remove the correct task by matching both id and owner
    STATE.tasks = STATE.tasks.filter(t => !(t.id === taskId && t.owner === task.owner));
    deleteTaskFromFirebase(taskId);
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    showNotification('ลบงานสำเร็จ!', 'error');
}

function editTask(taskId, ownerId = null) {
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // Find the correct task by matching both taskId and owner
    let task;
    if (ownerId && ownerId !== currentUserId) {
        // This is a shared task from a friend
        task = STATE.tasks.find(t => t.id === taskId && t.owner === ownerId && t.isSharedWithMe);
    } else {
        // This is our own task
        task = STATE.tasks.find(t => t.id === taskId && (t.isOwnTask || t.owner === currentUserId));
    }
    
    if (!task) {
        console.error(`Task not found: taskId=${taskId}, ownerId=${ownerId}`);
        return;
    }
    
    console.log(`🔍 Editing task: ${task.name} (owner: ${task.owner}, isSharedWithMe: ${task.isSharedWithMe})`);
    
    // เก็บ ID ของงานที่กำลังแก้ไข และ owner
    STATE.editingTaskId = taskId;
    STATE.editingTaskOwner = task.owner;
    
    // เติมข้อมูลในฟอร์ม
    document.getElementById('taskName').value = task.name;
    document.getElementById('assignee').value = task.assignee;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('dueDate').value = task.dueDate;
    document.getElementById('difficulty').value = task.difficulty;
    document.getElementById('workload').value = task.workload;
    document.getElementById('risk').value = task.risk;
    document.getElementById('notificationSound').value = task.notificationSound || 'default';
    
    // เติม sub-tasks
    STATE.tempSubtasks = [...task.subtasks];
    renderTempSubtasks();
    
    // เติมการแจ้งเตือน
    document.getElementById('notify1Week').checked = task.notifications.some(n => n.days === 7);
    document.getElementById('notify3Days').checked = task.notifications.some(n => n.days === 3);
    document.getElementById('notify1Day').checked = task.notifications.some(n => n.days === 1);
    document.getElementById('notify1Hour').checked = task.notifications.some(n => n.days === 0.042);
    document.getElementById('notifyOnTime').checked = task.notifications.some(n => n.days === 0);
    
    // เปลี่ยนปุ่ม submit เป็นโหมดแก้ไข
    const btnSubmit = document.getElementById('btnSubmitTask');
    const btnIcon = document.getElementById('btnSubmitIcon');
    const btnText = document.getElementById('btnSubmitText');
    const btnCancel = document.getElementById('btnCancelEdit');
    
    btnSubmit.classList.add('btn-update');
    btnIcon.className = 'fas fa-sync-alt';
    btnText.textContent = 'อัปเดตงานหลัก';
    
    // ✅ แสดงปุ่มยกเลิก
    if (btnCancel) {
        btnCancel.style.display = 'inline-flex';
    }
    
    // อัปเดต preview
    updatePreview();
    
    // เลื่อนไปที่ฟอร์ม
    document.getElementById('taskForm').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('กรุณาแก้ไขข้อมูลและกดอัปเดต', 'info');
}

function cancelEdit() {
    STATE.editingTaskId = null;
    STATE.editingTaskOwner = null;
    
    // เปลี่ยนปุ่มกลับเป็นโหมดเพิ่ม
    const btnSubmit = document.getElementById('btnSubmitTask');
    const btnIcon = document.getElementById('btnSubmitIcon');
    const btnText = document.getElementById('btnSubmitText');
    const btnCancel = document.getElementById('btnCancelEdit');
    
    btnSubmit.classList.remove('btn-update');
    btnIcon.className = 'fas fa-plus';
    btnText.textContent = 'เพิ่มงานหลัก';
    
    // ✅ ซ่อนปุ่มยกเลิก
    if (btnCancel) {
        btnCancel.style.display = 'none';
    }
    
    // ✅ ล้างฟอร์ม
    document.getElementById('taskForm').reset();
    STATE.tempSubtasks = [];
    renderTempSubtasks();
    updatePreview();
    
    showNotification('ยกเลิกการแก้ไขแล้ว', 'info');
}

function toggleTaskComplete(taskId, ownerId = null) {
    const currentUserId = STATE.currentUser ? STATE.currentUser.uid : null;
    
    // Find the correct task by matching both taskId and owner
    let task;
    if (ownerId && ownerId !== currentUserId) {
        // This is a shared task from a friend
        task = STATE.tasks.find(t => t.id === taskId && t.owner === ownerId && t.isSharedWithMe);
    } else {
        // This is our own task
        task = STATE.tasks.find(t => t.id === taskId && (t.isOwnTask || t.owner === currentUserId));
    }
    
    if (!task) {
        console.error(`Task not found: taskId=${taskId}, ownerId=${ownerId}`);
        return;
    }
    
    console.log(`🔍 Found task: ${task.name} (owner: ${task.owner}, isSharedWithMe: ${task.isSharedWithMe})`);
    
    // ✅ STRICT CHECK: Only block if finalized is explicitly true AND has finalizedAt timestamp
    if (task.finalized === true && task.finalizedAt) {
        console.log(`🔒 Task ${taskId} is finalized, cannot modify`);
        showNotification('งานนี้ถูกบันทึกเสร็จสมบูรณ์แล้ว ไม่สามารถแก้ไขได้', 'error');
        return;
    }
    
    // ✅ Debug: Log the finalized value
    console.log(`🔍 Task ${taskId} finalized:`, task.finalized, `finalizedAt:`, task.finalizedAt);
    
    // ✅ Check if all subtasks are completed before allowing to mark as complete
    if (!task.completed) {
        const allSubtasksCompleted = task.subtasks.every(st => st.completed);
        if (!allSubtasksCompleted) {
            const completedCount = task.subtasks.filter(st => st.completed).length;
            const totalCount = task.subtasks.length;
            showNotification(
                `กรุณาทำ sub-tasks ให้ครบทุกอันก่อน (${completedCount}/${totalCount})`,
                'warning'
            );
            return;
        }
    }
    
    const newCompletedStatus = !task.completed;
    
    // Toggle สถานะ locally first for immediate feedback
    task.completed = newCompletedStatus;
    renderTasks();
    updateStats();
    
    // Determine the owner ID
    const taskOwnerId = task.owner || task.ownerId || currentUserId;
    
    // If this is a shared task (either we own it and shared, or it's shared with us)
    if (task.visibility === 'shared' || task.isSharedWithMe) {
        // Update in Firebase under the owner's collection
        if (taskOwnerId && taskOwnerId !== currentUserId) {
            // Shared task owned by someone else
            firebase.firestore()
                .collection('users')
                .doc(taskOwnerId)
                .collection('tasks')
                .doc(taskId.toString())
                .update({
                    completed: newCompletedStatus,
                    lastModifiedBy: currentUserId,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    console.log(`✅ Updated shared task ${taskId} completion status`);
                })
                .catch(error => {
                    console.error('Error updating shared task:', error);
                    // Revert on error
                    task.completed = !newCompletedStatus;
                    renderTasks();
                    updateStats();
                    showNotification('เกิดข้อผิดพลาดในการอัพเดท', 'error');
                });
        } else {
            // Our own shared task - update directly to avoid updating other tasks
            firebase.firestore()
                .collection('users')
                .doc(currentUserId)
                .collection('tasks')
                .doc(taskId.toString())
                .update({
                    completed: newCompletedStatus,
                    lastModifiedBy: currentUserId,
                    lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    console.log(`✅ Updated own shared task ${taskId} completion status`);
                })
                .catch(error => {
                    console.error('Error updating task:', error);
                    // Revert on error
                    task.completed = !newCompletedStatus;
                    renderTasks();
                    updateStats();
                    showNotification('เกิดข้อผิดพลาดในการอัพเดท', 'error');
                });
        }
    } else {
        // Private task - update directly to avoid updating other tasks
        firebase.firestore()
            .collection('users')
            .doc(currentUserId)
            .collection('tasks')
            .doc(taskId.toString())
            .update({
                completed: newCompletedStatus,
                lastModifiedBy: currentUserId,
                lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log(`✅ Updated private task ${taskId} completion status`);
            })
            .catch(error => {
                console.error('Error updating task:', error);
                // Revert on error
                task.completed = !newCompletedStatus;
                renderTasks();
                updateStats();
                showNotification('เกิดข้อผิดพลาดในการอัพเดท', 'error');
            });
    }
    
    if (newCompletedStatus) {
        showNotification('ทำเครื่องหมายงานเสร็จแล้ว (ยังไม่ได้คะแนน)', 'info');
    } else {
        showNotification('ยกเลิกเครื่องหมายงานเสร็จ', 'info');
    }
}

// ✅ Flag to prevent double-click on finalize button
let isFinalizingTask = false;

async function finalizeTask(taskId, ownerId = null) {
    // ✅ STEP 1: Prevent double-click
    if (isFinalizingTask) {
        showNotification('กำลังดำเนินการอยู่ กรุณารอสักครู่...', 'warning');
        return;
    }
    
    const currentUserId = STATE.currentUser?.uid;
    
    // Find the correct task by matching both taskId and owner
    let task;
    if (ownerId && ownerId !== currentUserId) {
        // This is a shared task from a friend (shouldn't happen for finalize)
        task = STATE.tasks.find(t => t.id === taskId && t.owner === ownerId && t.isSharedWithMe);
    } else {
        // This is our own task
        task = STATE.tasks.find(t => t.id === taskId && (t.isOwnTask || t.owner === currentUserId));
    }
    
    if (!task) {
        console.error(`Task ${taskId} not found (ownerId: ${ownerId})`);
        return;
    }
    
    console.log(`🔍 Finalizing task ${taskId}:`, {
        taskName: task.name,
        taskOwner: task.owner,
        currentUser: currentUserId,
        isOwner: task.owner === currentUserId,
        visibility: task.visibility,
        sharedWith: task.sharedWith
    });
    
    // Check if user is the owner
    const isOwner = task.owner === currentUserId;
    if (!isOwner) {
        console.error(`❌ Permission denied: task.owner=${task.owner}, currentUser=${currentUserId}`);
        showNotification('เฉพาะเจ้าของงานเท่านั้นที่สามารถบันทึกงานเสร็จสมบูรณ์ได้', 'error');
        return;
    }
    
    // Check if task is already finalized
    if (task.finalized) {
        showNotification('งานนี้ถูกบันทึกเสร็จสมบูรณ์แล้ว', 'error');
        return;
    }
    
    // Check if task is marked as completed
    if (!task.completed) {
        showNotification('กรุณาทำเครื่องหมายงานเสร็จก่อนบันทึก', 'error');
        return;
    }
    
    // Confirm finalization
    const confirmMessage = task.sharedWith && task.sharedWith.length > 0
        ? `คุณแน่ใจหรือไม่ที่จะบันทึกงานนี้เสร็จสมบูรณ์?\n\n✅ คะแนนจะถูกแจกจ่ายให้ทุกคน\n🔒 ไม่สามารถยกเลิกได้หลังจากบันทึก\n👥 ผู้ร่วมงาน ${task.sharedWith.length} คนจะได้รับการแจ้งเตือน`
        : `คุณแน่ใจหรือไม่ที่จะบันทึกงานนี้เสร็จสมบูรณ์?\n\n✅ คุณจะได้รับคะแนน\n🔒 ไม่สามารถยกเลิกได้หลังจากบันทึก`;
    
    if (!confirm(confirmMessage)) return;
    
    // ✅ STEP 2: Lock the flag
    isFinalizingTask = true;
    
    // ✅ STEP 3: Optimistic UI Update - Update local state immediately
    const originalFinalized = task.finalized;
    const originalFinalizedBy = task.finalizedBy;
    
    // Set finalized=true immediately (don't set finalizedAt to avoid race condition)
    task.finalized = true;
    task.finalizedBy = currentUserId;
    
    // ✅ STEP 4: Re-render immediately to hide the button
    renderTasks();
    
    try {
        // Show loading
        showNotification('กำลังบันทึกงานเสร็จสมบูรณ์...', 'info');
        
        // Check if this is a shared task
        const isSharedTask = task.visibility === 'shared' && task.sharedWith && task.sharedWith.length > 0;
        
        if (isSharedTask) {
            // Shared task: Use collaboration manager to finalize and award points to collaborators
            if (typeof CollaborationManager !== 'undefined') {
                const collaborationManager = new CollaborationManager();
                collaborationManager.initialize(STATE.currentUser);
                
                await collaborationManager.finalizeTaskCompletion(taskId);
                
                showNotification('🎉 บันทึกงานเสร็จสมบูรณ์! คะแนนถูกแจกจ่ายให้ทุกคนแล้ว', 'success');
            } else {
                throw new Error('CollaborationManager not available');
            }
        } else {
            // Private task: Award points only to owner
            const finalizedDate = new Date();
            const taskRef = firebase.firestore()
                .collection('users')
                .doc(STATE.currentUser.uid)
                .collection('tasks')
                .doc(taskId.toString());
            
            // Calculate points for owner
            let ownerPoints = task.storyPoint;
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                if (finalizedDate < dueDate) {
                    ownerPoints += Math.floor(task.storyPoint * 0.1); // 10% bonus
                }
            }
            
            // Update task as finalized
            await taskRef.update({
                finalized: true,
                finalizedAt: firebase.firestore.FieldValue.serverTimestamp(),
                finalizedBy: STATE.currentUser.uid,
                pointsAwarded: {
                    owner: ownerPoints,
                    collaborators: {}
                }
            });
            
            // Award points to owner only
            if (typeof AchievementManager !== 'undefined') {
                const achievementManager = new AchievementManager();
                
                // Add points
                await achievementManager.addPoints(
                    STATE.currentUser.uid,
                    ownerPoints,
                    `Finalized task: ${task.name}`
                );
                
                // Update stats
                await achievementManager.updateStats(STATE.currentUser.uid, 'tasksCompleted', 1, true);
                
                // Check if completed before deadline
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    if (finalizedDate < dueDate) {
                        await achievementManager.updateStats(STATE.currentUser.uid, 'tasksBeforeDeadline', 1, true);
                    }
                }
                
                // Check and unlock achievements
                await achievementManager.checkAndUnlockAchievements(STATE.currentUser.uid);
            }
            
            showNotification('🎉 บันทึกงานเสร็จสมบูรณ์! คุณได้รับ ' + ownerPoints + ' คะแนน', 'success');
        }
        
        // Reload tasks to get updated data from Firebase
        await loadTasksFromFirebase();
        
        // ✅ Success - keep the optimistic update
        console.log('✅ Task finalized successfully');
        
    } catch (error) {
        console.error('❌ Error finalizing task:', error);
        
        // ✅ STEP 5: Revert optimistic update on error
        task.finalized = originalFinalized;
        task.finalizedBy = originalFinalizedBy;
        
        // Re-render to show the button again
        renderTasks();
        
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    } finally {
        // ✅ STEP 6: Always unlock the flag
        isFinalizingTask = false;
    }
}

async function clearAll() {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
    
    if (!STATE.currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อนลบข้อมูล', 'error');
        return;
    }
    
    try {
        // Get only tasks that user owns
        const ownTasks = STATE.tasks.filter(task => 
            task.isOwnTask || task.owner === STATE.currentUser.uid
        );
        
        if (ownTasks.length === 0) {
            showNotification('ไม่มีงานที่จะลบ', 'info');
            return;
        }
        
        // Delete all own tasks from Firebase using batch
        const batch = firebase.firestore().batch();
        const userTasksRef = firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks');
        
        ownTasks.forEach(task => {
            const taskRef = userTasksRef.doc(task.id.toString());
            batch.delete(taskRef);
        });
        
        await batch.commit();
        
        // Clear local state
        STATE.tasks = STATE.tasks.filter(task => 
            !task.isOwnTask && task.owner !== STATE.currentUser.uid
        );
        STATE.taskIdCounter = 1;
        
        // Update UI
        renderTasks();
        updateStats();
        
        showNotification(`ลบงานทั้งหมด ${ownTasks.length} งานเรียบร้อยแล้ว!`, 'success');
        console.log(`✅ Deleted ${ownTasks.length} tasks from Firebase`);
    } catch (error) {
        console.error('❌ Error deleting all tasks:', error);
        showNotification('เกิดข้อผิดพลาดในการลบงาน กรุณาลองใหม่อีกครั้ง', 'error');
    }
}

// ==================== COLLABORATION HELPERS ====================

function isSharedTask(task) {
    return task && task.visibility === 'shared';
}

function getTaskCollaborators(taskId) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return [];
    return task.sharedWith || [];
}

function canEditTask(taskId, userId) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task || !userId) return false;
    
    const isOwner = task.owner === userId;
    const isCollaborator = task.sharedWith && task.sharedWith.includes(userId);
    
    return isOwner || isCollaborator;
}

function canDeleteTask(taskId, userId) {
    if (!userId) return false;
    
    // Find the correct task - prioritize own tasks
    const task = STATE.tasks.find(t => t.id === taskId && (t.isOwnTask || t.owner === userId));
    if (!task) return false;
    
    // Only owner can delete
    return task.owner === userId;
}
