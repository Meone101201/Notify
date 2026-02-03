// ==================== AUTHENTICATION ====================

function checkAuthState() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase not loaded, using localStorage');
        loadFromLocalStorage();
        hideUserProfile();
        return;
    }
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            STATE.currentUser = user;
            console.log('✅ User signed in:', user.uid);
            updateUserProfile(user);
            loadTasksFromFirebase();
        } else {
            console.log('⚠️ No user signed in');
            hideUserProfile();
            showLoginModal();
        }
    });
}

function updateUserProfile(user) {
    const profileElement = document.getElementById('userProfile');
    const loginPrompt = document.getElementById('loginPrompt');
    const avatarElement = document.getElementById('userAvatar');
    const nameElement = document.getElementById('userName');
    const emailElement = document.getElementById('userEmail');
    
    if (user.isAnonymous) {
        // Anonymous user
        avatarElement.src = 'https://ui-avatars.com/api/?name=Guest&background=667eea&color=fff&size=128';
        nameElement.textContent = 'ผู้ใช้ไม่ระบุตัวตน';
        emailElement.textContent = `ID: ${user.uid.substring(0, 8)}...`;
    } else {
        // Google or other provider
        avatarElement.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=667eea&color=fff&size=128';
        nameElement.textContent = user.displayName || 'ผู้ใช้';
        emailElement.textContent = user.email || 'ไม่มีอีเมล';
    }
    
    profileElement.style.display = 'flex';
    loginPrompt.style.display = 'none';
    updateNotificationIcon();
}

function hideUserProfile() {
    const profileElement = document.getElementById('userProfile');
    const loginPrompt = document.getElementById('loginPrompt');
    profileElement.style.display = 'none';
    loginPrompt.style.display = 'flex';
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

async function signInAnonymously() {
    try {
        await firebase.auth().signInAnonymously();
        closeLoginModal();
        showNotification('เข้าสู่ระบบสำเร็จ!', 'success');
    } catch (error) {
        console.error('Error signing in:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    }
}

let isSigningIn = false;

async function signInWithGoogle() {
    // ป้องกันการกดซ้ำ
    if (isSigningIn) {
        console.log('⚠️ Sign-in already in progress...');
        return;
    }
    
    isSigningIn = true;
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        
        console.log('✅ Google Sign-in Success:', result.user);
        closeLoginModal();
        showNotification('เข้าสู่ระบบด้วย Google สำเร็จ!', 'success');
    } catch (error) {
        console.error('❌ Google Sign-in Error:', error);
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        // แสดง error ที่เข้าใจง่าย
        let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
        let solution = '';
        
        if (error.code === 'auth/popup-blocked') {
            errorMessage = '🚫 เบราว์เซอร์บล็อก Popup';
            solution = 'กรุณาอนุญาต Popup สำหรับเว็บไซต์นี้';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = '🚫 Domain ไม่ได้รับอนุญาต';
            solution = 'กรุณาเพิ่ม localhost ใน Firebase Console → Authentication → Settings → Authorized domains';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = '🚫 ยังไม่ได้เปิดใช้งาน Google Sign-in';
            solution = 'กรุณาเปิดใช้งาน Google Sign-in ใน Firebase Console → Authentication → Sign-in method';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = '❌ คุณปิด Popup ก่อนเข้าสู่ระบบเสร็จ';
            solution = 'กรุณาลองใหม่อีกครั้ง';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = '❌ มีการขอ Popup อื่นอยู่แล้ว';
            solution = 'กรุณารอสักครู่แล้วลองใหม่';
        }
        
        showNotification(errorMessage, 'error');
        
        // แสดง Alert พร้อมวิธีแก้
        if (solution) {
            alert(`${errorMessage}\n\n💡 วิธีแก้:\n${solution}\n\n🔍 Error Code: ${error.code}\n\n📖 อ่านเพิ่มเติมใน TROUBLESHOOTING.md`);
        } else {
            alert(`${errorMessage}\n\n🔍 Error Code: ${error.code}\n📝 Error: ${error.message}\n\n📖 อ่านเพิ่มเติมใน TROUBLESHOOTING.md`);
        }
    } finally {
        // ปลดล็อกให้กดได้อีกครั้ง
        isSigningIn = false;
    }
}

async function signOut() {
    if (!confirm('คุณต้องการออกจากระบบหรือไม่?')) return;
    
    try {
        await firebase.auth().signOut();
        STATE.currentUser = null;
        STATE.tasks = [];
        hideUserProfile();
        renderTasks();
        updateStats();
        showNotification('ออกจากระบบสำเร็จ!', 'success');
        showLoginModal();
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
    }
}
