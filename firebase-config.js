// Firebase Configuration
// ✅ Configuration สำหรับ Agile Task Board
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
