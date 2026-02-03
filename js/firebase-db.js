// ==================== FIREBASE DATABASE ====================

async function loadTasksFromFirebase() {
    if (!STATE.currentUser) {
        loadFromLocalStorage();
        return;
    }
    
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks')
            .orderBy('createdAt', 'desc')
            .get();
        
        STATE.tasks = [];
        snapshot.forEach(doc => {
            STATE.tasks.push({ id: doc.id, ...doc.data() });
        });
        
        if (STATE.tasks.length > 0) {
            STATE.taskIdCounter = Math.max(...STATE.tasks.map(t => parseInt(t.id))) + 1;
        }
        
        renderTasks();
        updateStats();
        console.log(`✅ Loaded ${STATE.tasks.length} tasks from Firebase`);
    } catch (error) {
        console.error('Error loading tasks:', error);
        loadFromLocalStorage();
    }
}

async function saveTasksToFirebase() {
    if (!STATE.currentUser) {
        saveToLocalStorage();
        return;
    }
    
    try {
        const batch = firebase.firestore().batch();
        const userTasksRef = firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks');
        
        STATE.tasks.forEach(task => {
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

async function deleteTaskFromFirebase(taskId) {
    if (!STATE.currentUser) {
        return;
    }
    
    try {
        await firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks')
            .doc(taskId.toString())
            .delete();
        
        console.log('✅ Task deleted from Firebase');
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

function loadFromLocalStorage() {
    STATE.tasks = JSON.parse(localStorage.getItem('agileTasks')) || [];
    STATE.taskIdCounter = parseInt(localStorage.getItem('taskIdCounter')) || 1;
    renderTasks();
    updateStats();
}

function saveToLocalStorage() {
    localStorage.setItem('agileTasks', JSON.stringify(STATE.tasks));
    localStorage.setItem('taskIdCounter', STATE.taskIdCounter.toString());
}
