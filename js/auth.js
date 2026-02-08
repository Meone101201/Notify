// ==================== AUTHENTICATION ====================

/**
 * Ensure user document exists in Firestore
 * Creates a new user document if it doesn't exist
 * @param {Object} user - Firebase user object
 */
async function ensureUserDocument(user) {
    try {
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // Create new user document
            const userData = {
                uid: user.uid,
                displayName: user.displayName || 'User',
                email: user.email || '',
                photoURL: user.photoURL || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                stats: {
                    tasksCompleted: 0,
                    totalPoints: 0,
                    lastActivityDate: null
                },
                achievements: [],
                achievementNotifications: {},  // Track notification status
                friends: [],
                friendRequests: []
            };
            
            await userRef.set(userData);
            console.log('✅ User document created for:', user.uid);
        } else {
            // Update last login time
            await userRef.update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ User document exists, updated last login');
        }
    } catch (error) {
        console.error('Error ensuring user document:', error);
        // Don't throw - allow app to continue even if user doc creation fails
    }
}

function checkAuthState() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase not loaded, using localStorage');
        loadFromLocalStorage();
        hideUserProfile();
        return;
    }
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            STATE.currentUser = user;
            console.log('✅ User signed in:', user.uid);
            
            // Reset notification state for new login
            STATE.initialNotificationsLoaded = false;
            
            // Ensure user document exists in Firestore
            await ensureUserDocument(user);
            
            updateUserProfile(user);
            
            // ✅ Cleanup old notifications (keep only 10 latest)
            if (typeof cleanupOldNotifications !== 'undefined') {
                cleanupOldNotifications(user.uid).catch(error => {
                    console.error('Error cleaning up notifications:', error);
                });
            }
            
            // Run data cleanup on login
            if (typeof runCleanupOnLogin !== 'undefined') {
                runCleanupOnLogin(user.uid).catch(error => {
                    console.error('Error running cleanup on login:', error);
                });
            }
            
            // Initialize FriendManager with current user
            if (typeof window.friendManager !== 'undefined') {
                window.friendManager.initialize(user);
                console.log('✅ FriendManager initialized with user');
            }
            
            // ✅ Setup all real-time listeners BEFORE loading tasks
            // This ensures shared tasks listener is ready to receive data
            
            // Setup friends real-time listeners
            if (typeof setupFriendsRealtimeListeners === 'function') {
                setupFriendsRealtimeListeners();
            }
            
            // Setup own tasks real-time listener (NEW!)
            if (typeof setupOwnTasksRealtimeListener === 'function') {
                setupOwnTasksRealtimeListener();
            }
            
            // Setup shared tasks real-time listeners
            if (typeof setupSharedTasksRealtimeListeners === 'function') {
                setupSharedTasksRealtimeListeners();
            }
            
            // Setup achievements real-time listeners
            if (typeof setupAchievementsRealtimeListeners === 'function') {
                setupAchievementsRealtimeListeners();
            }
            
            // Setup leaderboard real-time listeners
            if (typeof setupLeaderboardRealtimeListeners === 'function') {
                setupLeaderboardRealtimeListeners();
            }
            
            // Setup notifications real-time listeners
            if (typeof setupNotificationsListener === 'function') {
                if (typeof LISTENER_UNSUBSCRIBERS !== 'undefined') {
                    LISTENER_UNSUBSCRIBERS.notifications = setupNotificationsListener();
                } else {
                    setupNotificationsListener();
                }
                
                // Load initial notifications to update badge
                if (typeof loadNotifications === 'function') {
                    setTimeout(() => {
                        loadNotifications();
                    }, 1000); // Delay to ensure listener is set up
                }
            }
            
            // ✅ Load tasks AFTER all listeners are setup
            // This ensures shared tasks from listener are preserved
            // Add small delay to ensure listeners are fully initialized
            setTimeout(() => {
                loadTasksFromFirebase();
            }, 500);
        } else {
            console.log('⚠️ No user signed in');
            
            // Reset notification state on logout
            STATE.initialNotificationsLoaded = false;
            
            // Clean up listeners on sign-out
            if (typeof cleanupRealtimeListeners === 'function') {
                cleanupRealtimeListeners();
            }
            
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
        avatarElement.style.display = 'block';
        nameElement.textContent = 'ผู้ใช้ไม่ระบุตัวตน';
        emailElement.textContent = `ID: ${user.uid.substring(0, 8)}...`;
    } else {
        // Google or other provider
        const displayName = user.displayName || 'User';
        let photoURL = user.photoURL;
        
        // ✅ แก้ไข URL รูปจาก Google ให้ใช้ขนาดใหญ่ขึ้นและไม่มี parameter ที่อาจทำให้เกิดปัญหา
        if (photoURL && photoURL.includes('googleusercontent.com')) {
            // แปลง s=96-c เป็น s=200-c (ขนาดใหญ่ขึ้น)
            photoURL = photoURL.replace(/s\d+-c/, 's200-c');
            // หรือลบ parameter ทั้งหมดออก
            photoURL = photoURL.split('=s')[0];
            console.log('🔧 Modified Google photo URL:', photoURL);
        }
        
        // Set avatar with fallback
        if (photoURL && photoURL.trim() !== '') {
            avatarElement.src = photoURL;
            avatarElement.style.display = 'block';
            console.log('✅ User avatar loaded:', photoURL);
        } else {
            // Use UI Avatars as fallback
            const fallbackAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=667eea&color=fff&size=128';
            avatarElement.src = fallbackAvatar;
            avatarElement.style.display = 'block';
            console.log('ℹ️ Using fallback avatar for:', displayName);
        }
        
        // Handle avatar load error
        avatarElement.onerror = function() {
            console.warn('⚠️ Failed to load avatar from:', this.src);
            const fallbackAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=667eea&color=fff&size=128';
            console.log('🔄 Switching to fallback avatar');
            // ป้องกัน infinite loop
            if (!this.src.includes('ui-avatars.com')) {
                this.src = fallbackAvatar;
            }
        };
        
        nameElement.textContent = displayName;
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
    // ✅ ปิดใช้งาน Anonymous Sign-in
    showNotification('ระบบเข้าใช้แบบไม่ระบุตัวตนถูกปิดใช้งาน กรุณาเข้าสู่ระบบด้วย Google', 'error');
    return;
    
    /* // Disabled code
    try {
        await firebase.auth().signInAnonymously();
        closeLoginModal();
        showNotification('เข้าสู่ระบบสำเร็จ!', 'success');
    } catch (error) {
        console.error('Error signing in:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    }
    */
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
        
        // ✅ เพิ่ม scopes เพื่อขอข้อมูล profile และ email
        provider.addScope('profile');
        provider.addScope('email');
        
        // ✅ บังคับให้เลือก account ทุกครั้ง (optional)
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await firebase.auth().signInWithPopup(provider);
        
        console.log('✅ Google Sign-in Success:', result.user);
        console.log('📸 Photo URL:', result.user.photoURL);
        console.log('👤 Display Name:', result.user.displayName);
        console.log('📧 Email:', result.user.email);
        
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
        // Reset notification state before signing out
        STATE.initialNotificationsLoaded = false;
        
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
