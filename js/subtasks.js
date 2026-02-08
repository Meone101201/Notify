// ==================== SUBTASK MANAGEMENT ====================

function addSubtask() {
    const input = document.getElementById('subtaskInput');
    const subtaskText = input.value.trim();
    
    if (!subtaskText) {
        alert('กรุณากรอกชื่อ sub-task');
        return;
    }
    
    STATE.tempSubtasks.push({ text: subtaskText, completed: false });
    renderTempSubtasks();
    updatePreview();
    input.value = '';
}

function renderTempSubtasks() {
    const container = document.getElementById('subtasksList');
    
    if (STATE.tempSubtasks.length === 0) {
        container.innerHTML = '<p style="color: #9ca3af; font-size: 0.9rem; text-align: center;">ยังไม่มี sub-task (กรุณาเพิ่มเพื่อคำนวณ Story Point)</p>';
        return;
    }
    
    container.innerHTML = STATE.tempSubtasks.map((subtask, index) => `
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
    STATE.tempSubtasks.splice(index, 1);
    renderTempSubtasks();
    updatePreview();
}

function toggleSubtask(taskId, subtaskIndex, ownerId = null) {
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
    
    // ✅ Debug: Log BEFORE check
    console.log(`🔍 [BEFORE CHECK] Task ${taskId}:`, {
        finalized: task.finalized,
        finalizedAt: task.finalizedAt,
        completed: task.completed,
        subtaskIndex: subtaskIndex,
        subtaskCompleted: task.subtasks[subtaskIndex]?.completed
    });
    
    // ✅ Additional safety check: If finalized=true but no finalizedAt, fix it immediately
    if (task.finalized === true && !task.finalizedAt) {
        console.warn(`⚠️ Task ${taskId} has finalized=true but no finalizedAt! Auto-fixing...`);
        task.finalized = false;
        
        // Fix in Firebase
        if (currentUserId) {
            firebase.firestore()
                .collection('users')
                .doc(currentUserId)
                .collection('tasks')
                .doc(taskId.toString())
                .update({ finalized: false })
                .then(() => console.log(`✅ Auto-fixed task ${taskId}`))
                .catch(err => console.error(`❌ Failed to auto-fix:`, err));
        }
    }
    
    // ✅ STRICT CHECK: Only block if finalized is explicitly true AND has finalizedAt
    if (task.finalized === true && task.finalizedAt) {
        console.log(`🔒 Task ${taskId} is finalized, cannot modify`);
        showNotification('งานนี้ถูกบันทึกเสร็จสมบูรณ์แล้ว ไม่สามารถแก้ไขได้', 'error');
        return;
    }
    
    console.log(`✅ [PASSED CHECK] Task ${taskId} can be modified`);
    
    // ✅ Check if task is marked as completed
    if (task.completed) {
        console.log(`🔒 Task ${taskId} is marked as completed, subtasks are locked`);
        showNotification('กรุณายกเลิกเครื่องหมายงานเสร็จก่อนแก้ไข sub-tasks', 'warning');
        return;
    }
    
    const newCompletedStatus = !task.subtasks[subtaskIndex].completed;
    
    // Toggle the subtask locally first for immediate feedback
    task.subtasks[subtaskIndex].completed = newCompletedStatus;
    
    renderTasks();
    updateStats();
    
    // Determine the task owner ID
    const taskOwnerId = task.owner || task.ownerId || currentUserId;
    
    // If this is a shared task (either we own it and shared, or it's shared with us)
    if (task.visibility === 'shared' || task.isSharedWithMe) {
        // Use collaboration manager to update shared subtask
        if (typeof window.collaborationManager !== 'undefined') {
            window.collaborationManager.updateSharedSubtask(
                taskId, 
                subtaskIndex, 
                newCompletedStatus, 
                taskOwnerId
            ).catch(error => {
                console.error('Error updating shared subtask:', error);
                // Revert the change on error
                task.subtasks[subtaskIndex].completed = !newCompletedStatus;
                renderTasks();
                updateStats();
                showNotification('เกิดข้อผิดพลาดในการอัพเดท subtask', 'error');
            });
        } else {
            // Fallback: save to Firebase directly
            saveTasksToFirebase();
        }
    } else {
        // This is our own private task, save normally
        saveTasksToFirebase();
    }
}
