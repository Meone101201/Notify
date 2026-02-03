// ==================== CALCULATION FUNCTIONS ====================

function calculateStoryPoint(difficulty, workload, risk, subtaskCount) {
    if (!difficulty || !workload || !risk || subtaskCount === 0) return 0;
    
    const baseScore = parseInt(difficulty) + parseInt(workload) + parseInt(risk);
    const rawPoint = baseScore * subtaskCount;
    
    let closestFib = CONFIG.FIBONACCI[0];
    let minDiff = Math.abs(rawPoint - closestFib);
    
    for (let fib of CONFIG.FIBONACCI) {
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
    const subtaskCount = STATE.tempSubtasks.length;
    
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
