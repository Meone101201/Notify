// ==================== TASK MANAGEMENT ====================

function handleTaskFormSubmit(e) {
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
        const taskIndex = STATE.tasks.findIndex(t => t.id === STATE.editingTaskId);
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
            createdAt: new Date().toISOString()
        };
        
        STATE.tasks.push(task);
        showNotification('เพิ่มงานหลักสำเร็จ!', 'success');
    }
    
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    document.getElementById('taskForm').reset();
    STATE.tempSubtasks = [];
    renderTempSubtasks();
    updatePreview();
}

function deleteTask(taskId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้? (รวมทั้ง sub-tasks ทั้งหมด)')) return;
    
    STATE.tasks = STATE.tasks.filter(t => t.id !== taskId);
    deleteTaskFromFirebase(taskId);
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    showNotification('ลบงานสำเร็จ!', 'error');
}

function editTask(taskId) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // เก็บ ID ของงานที่กำลังแก้ไข
    STATE.editingTaskId = taskId;
    
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
    
    btnSubmit.classList.add('btn-update');
    btnIcon.className = 'fas fa-sync-alt';
    btnText.textContent = 'อัปเดตงานหลัก';
    
    // อัปเดต preview
    updatePreview();
    
    // เลื่อนไปที่ฟอร์ม
    document.getElementById('taskForm').scrollIntoView({ behavior: 'smooth' });
    
    showNotification('กรุณาแก้ไขข้อมูลและกดอัปเดต', 'info');
}

function cancelEdit() {
    STATE.editingTaskId = null;
    
    // เปลี่ยนปุ่มกลับเป็นโหมดเพิ่ม
    const btnSubmit = document.getElementById('btnSubmitTask');
    const btnIcon = document.getElementById('btnSubmitIcon');
    const btnText = document.getElementById('btnSubmitText');
    
    btnSubmit.classList.remove('btn-update');
    btnIcon.className = 'fas fa-plus';
    btnText.textContent = 'เพิ่มงานหลัก';
}

function toggleTaskComplete(taskId) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Toggle สถานะ
    task.completed = !task.completed;
    
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    if (task.completed) {
        showNotification('ทำเครื่องหมายงานเสร็จแล้ว!', 'success');
    } else {
        showNotification('ยกเลิกเครื่องหมายงานเสร็จ', 'info');
    }
}

function clearAll() {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
    
    STATE.tasks = [];
    STATE.taskIdCounter = 1;
    saveTasksToFirebase();
    renderTasks();
    updateStats();
    
    showNotification('ล้างข้อมูลทั้งหมดแล้ว!', 'error');
}
