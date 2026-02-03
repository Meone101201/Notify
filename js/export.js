// ==================== EXPORT FUNCTIONS ====================

function exportToCSV() {
    if (STATE.tasks.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
    }
    
    let csvContent = '\uFEFF';
    csvContent += 'ID,งานหลัก,รายละเอียด,ผู้รับผิดชอบ,วันครบกำหนด,ความยาก,ปริมาณงาน,ความเสี่ยง,จำนวน Sub-tasks,Story Point,เสร็จแล้ว,ความคืบหน้า,สูตรคำนวณ\n';
    
    STATE.tasks.forEach(task => {
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

function exportToJSON() {
    if (STATE.tasks.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
    }
    
    const data = {
        exportDate: new Date().toISOString(),
        totalTasks: STATE.tasks.length,
        totalPoints: STATE.tasks.reduce((sum, task) => sum + task.storyPoint, 0),
        tasks: STATE.tasks
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `agile-tasks-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Export JSON สำเร็จ!', 'success');
}
