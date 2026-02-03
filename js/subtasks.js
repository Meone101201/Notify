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

function toggleSubtask(taskId, subtaskIndex) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
    saveTasksToFirebase();
    renderTasks();
    updateStats();
}
