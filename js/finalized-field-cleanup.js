// ==================== FINALIZED FIELD CLEANUP ====================
// This script cleans up the finalized field in all tasks
// Run this once to fix any tasks with incorrect finalized values

async function cleanupFinalizedField() {
    if (!STATE.currentUser) {
        console.error('❌ User not logged in');
        alert('กรุณาล็อกอินก่อนใช้งาน');
        return;
    }
    
    console.log('🧹 Starting finalized field cleanup...');
    alert('กำลังทำความสะอาดข้อมูล กรุณารอสักครู่...');
    
    try {
        const tasksRef = firebase.firestore()
            .collection('users')
            .doc(STATE.currentUser.uid)
            .collection('tasks');
        
        const snapshot = await tasksRef.get();
        
        console.log(`📊 Found ${snapshot.size} tasks to check`);
        
        const batch = firebase.firestore().batch();
        let updateCount = 0;
        let details = [];
        
        snapshot.forEach(doc => {
            const task = doc.data();
            
            // ✅ Fix tasks that have finalized = true but no finalizedAt timestamp
            // These are likely corrupted data
            if (task.finalized === true && !task.finalizedAt) {
                console.log(`🔧 Fixing corrupted task ${doc.id}: finalized = true but no finalizedAt`);
                batch.update(doc.ref, { 
                    finalized: false,
                    finalizedAt: firebase.firestore.FieldValue.delete(),
                    finalizedBy: firebase.firestore.FieldValue.delete()
                });
                updateCount++;
                details.push(`งาน "${task.name}" - แก้ไขข้อมูล finalized ที่ผิดพลาด`);
            }
            // Check if finalized field needs fixing (not boolean)
            else if (task.finalized !== true && task.finalized !== false && task.finalized !== undefined) {
                console.log(`🔧 Fixing task ${doc.id}: finalized = ${task.finalized} (${typeof task.finalized})`);
                batch.update(doc.ref, { finalized: false });
                updateCount++;
                details.push(`งาน "${task.name}" - แก้ไขค่า finalized เป็น false`);
            }
        });
        
        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ Updated ${updateCount} tasks with correct finalized field`);
            console.log('Details:', details);
            
            // Reload tasks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert(`✅ ทำความสะอาดข้อมูลเสร็จสิ้น!\n\nแก้ไข ${updateCount} งาน:\n${details.slice(0, 5).join('\n')}${updateCount > 5 ? '\n...' : ''}\n\nกรุณา Refresh หน้าเว็บ (Ctrl+F5)`);
            
            // Auto refresh after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            console.log('✅ All tasks have correct finalized field');
            alert('✅ ข้อมูลถูกต้องแล้ว ไม่ต้องแก้ไข');
        }
    } catch (error) {
        console.error('❌ Error cleaning up finalized field:', error);
        alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
}

// Export for console access
window.cleanupFinalizedField = cleanupFinalizedField;

console.log('💡 หากพบปัญหา subtasks ล็อค ให้รันคำสั่ง: cleanupFinalizedField()');
