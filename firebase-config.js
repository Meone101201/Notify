// Firebase Configuration
// ✅ Configuration สำหรับ Agile Task Board
// 
// ⚠️ สำคัญ: ไฟล์นี้เชื่อมกับ PRODUCTION DATABASE (ข้อมูลจริง!)
// - Project ID: agile-task-board
// - URL: agile-task-board.firebaseapp.com
// - ใช้สำหรับ: แอปพลิเคชันจริง, การ deploy
// 
// สำหรับการทดสอบ:
// - Integration Tests → ใช้ Firebase Emulator (localhost:8080)
// - Unit Tests → ใช้ Mocks (ไม่เชื่อมจริง)
// 
// ดูเพิ่มเติม: FIREBASE_CONNECTIONS.md
const firebaseConfig = {
    apiKey: "AIzaSyBJzO5-G3bnCX4iIaKotuzGQ9bIc3hLfmw",
    authDomain: "agile-task-board.firebaseapp.com",
    projectId: "agile-task-board",
    storageBucket: "agile-task-board.firebasestorage.app",
    messagingSenderId: "484058962341",
    appId: "1:484058962341:web:bbb8e410febc555c8d304c",
    measurementId: "G-00Y98YCKMZ"
};

// Initialize Firebase
let app, db, auth;

function initializeFirebase() {
    try {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        // 🔧 เชื่อมต่อกับ Emulator (สำหรับทดสอบ)
        // ⚠️ ปิดการใช้งาน Emulator เพื่อใช้ Production Database
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     console.log('🔧 Connecting to Firebase Emulator...');
        //     db.useEmulator('localhost', 8080);
        //     auth.useEmulator('http://localhost:9099');
        // }
        
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return false;
    }
}

// Export สำหรับใช้งานในไฟล์อื่น
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAuth = auth;
