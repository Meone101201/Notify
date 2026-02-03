# 📁 โครงสร้างโปรเจกต์

## ภาพรวม

โปรเจกต์นี้แบ่งโค้ดออกเป็นไฟล์ย่อยๆ เพื่อง่ายต่อการจัดการและบำรุงรักษา

```
agile-task-board/
├── index.html                  # หน้าเว็บหลัก
├── style.css                   # CSS ทั้งหมด
├── firebase-config.js          # Firebase Configuration
│
├── js/                         # JavaScript Modules
│   ├── config.js              # Configuration & Global State
│   ├── auth.js                # Authentication (Login/Logout)
│   ├── firebase-db.js         # Firebase Database Operations
│   ├── notifications.js       # Notification System
│   ├── calculations.js        # Story Point Calculations
│   ├── subtasks.js            # Subtask Management
│   ├── tasks.js               # Task CRUD Operations
│   ├── render.js              # UI Rendering Functions
│   ├── export.js              # Export (CSV/JSON)
│   ├── ui.js                  # UI Utilities
│   └── main.js                # Main Application Entry
│
└── docs/                       # Documentation
    ├── README.md              # ระบบการคำนวณ
    ├── FIREBASE_SETUP.md      # คู่มือติดตั้ง Firebase
    ├── PRODUCT_README.md      # คู่มือใช้งาน Product
    └── PROJECT_STRUCTURE.md   # เอกสารนี้
```

---

## 📄 รายละเอียดไฟล์

### 🎨 Frontend Files

#### `index.html`
- หน้าเว็บหลัก
- โครงสร้าง HTML
- Modal สำหรับ Login และ Notification
- โหลด Firebase SDK และ JavaScript modules

#### `style.css`
- CSS ทั้งหมด
- Responsive design
- Animations
- Color schemes

---

### 🔧 JavaScript Modules

#### `js/config.js`
**หน้าที่:** Configuration และ Global State
```javascript
- CONFIG: ค่าคงที่ทั้งหมด (Fibonacci, Notification types, Sound types)
- STATE: สถานะแอปพลิเคชัน (tasks, user, permissions)
```

**ใช้เมื่อ:** ต้องการเพิ่ม/แก้ไข configuration

---

#### `js/auth.js`
**หน้าที่:** Authentication
```javascript
- checkAuthState()          // ตรวจสอบสถานะการ login
- signInAnonymously()       // Login แบบไม่ระบุตัวตน
- signInWithGoogle()        // Login ด้วย Google
- signOut()                 // Logout
- showLoginModal()          // แสดง Modal login
- closeLoginModal()         // ปิด Modal login
```

**ใช้เมื่อ:** ต้องการแก้ไขระบบ Authentication

---

#### `js/firebase-db.js`
**หน้าที่:** Firebase Database Operations
```javascript
- loadTasksFromFirebase()      // โหลดงานจาก Firebase
- saveTasksToFirebase()        // บันทึกงานไป Firebase
- deleteTaskFromFirebase()     // ลบงานจาก Firebase
- loadFromLocalStorage()       // โหลดจาก LocalStorage (Fallback)
- saveToLocalStorage()         // บันทึกไป LocalStorage (Fallback)
```

**ใช้เมื่อ:** ต้องการแก้ไขการจัดการข้อมูล

---

#### `js/notifications.js`
**หน้าที่:** Notification System
```javascript
- requestNotificationPermission()     // ขออนุญาตแจ้งเตือน
- sendNotification()                  // ส่งการแจ้งเตือน
- playNotificationSound()             // เล่นเสียงแจ้งเตือน
- startNotificationChecker()          // เริ่มตรวจสอบการแจ้งเตือน
- checkNotifications()                // ตรวจสอบงานที่ต้องแจ้งเตือน
```

**ใช้เมื่อ:** ต้องการแก้ไขระบบแจ้งเตือน

---

#### `js/calculations.js`
**หน้าที่:** Story Point Calculations
```javascript
- calculateStoryPoint()     // คำนวณ Story Point
- getFormulaText()         // สร้างข้อความสูตร
- explainStoryPoint()      // อธิบาย Story Point
- updatePreview()          // อัพเดท Preview แบบ Real-time
```

**ใช้เมื่อ:** ต้องการแก้ไขสูตรการคำนวณ

---

#### `js/subtasks.js`
**หน้าที่:** Subtask Management
```javascript
- addSubtask()              // เพิ่ม sub-task
- renderTempSubtasks()      // แสดง sub-tasks ชั่วคราว
- removeSubtask()           // ลบ sub-task
- toggleSubtask()           // เปลี่ยนสถานะ sub-task (เสร็จ/ยังไม่เสร็จ)
```

**ใช้เมื่อ:** ต้องการแก้ไขการจัดการ sub-tasks

---

#### `js/tasks.js`
**หน้าที่:** Task CRUD Operations
```javascript
- handleTaskFormSubmit()    // จัดการ Form submission
- deleteTask()              // ลบงาน
- clearAll()                // ลบงานทั้งหมด
```

**ใช้เมื่อ:** ต้องการแก้ไขการจัดการงาน

---

#### `js/render.js`
**หน้าที่:** UI Rendering
```javascript
- renderTasks()             // แสดงงานทั้งหมด
- getDueDateBadge()         // สร้าง Badge วันครบกำหนด
- updateStats()             // อัพเดทสถิติ
```

**ใช้เมื่อ:** ต้องการแก้ไข UI การแสดงผล

---

#### `js/export.js`
**หน้าที่:** Export Functions
```javascript
- exportToCSV()             // Export เป็น CSV
- exportToJSON()            // Export เป็น JSON
```

**ใช้เมื่อ:** ต้องการเพิ่มรูปแบบ Export

---

#### `js/ui.js`
**หน้าที่:** UI Utilities
```javascript
- showNotification()        // แสดง Toast notification
- initializeEventListeners() // ตั้งค่า Event listeners
- addAnimationStyles()      // เพิ่ม CSS animations
```

**ใช้เมื่อ:** ต้องการแก้ไข UI utilities

---

#### `js/main.js`
**หน้าที่:** Main Application Entry Point
```javascript
- DOMContentLoaded event    // เริ่มต้นแอปพลิเคชัน
- beforeunload event        // Cleanup ก่อนปิดหน้า
```

**ใช้เมื่อ:** ต้องการแก้ไขการเริ่มต้นแอป

---

## 🔄 Data Flow

```
1. User Action (UI)
   ↓
2. Event Handler (tasks.js, subtasks.js)
   ↓
3. State Update (config.js - STATE)
   ↓
4. Database Save (firebase-db.js)
   ↓
5. UI Re-render (render.js)
   ↓
6. Notification Check (notifications.js)
```

---

## 🎯 การเพิ่มฟีเจอร์ใหม่

### ตัวอย่าง: เพิ่มฟีเจอร์ "แท็กงาน"

1. **อัพเดท State** (`js/config.js`)
```javascript
const STATE = {
    // ... existing
    availableTags: ['Frontend', 'Backend', 'Design']
};
```

2. **เพิ่ม UI** (`index.html`)
```html
<select id="taskTags">
    <option>Frontend</option>
    <option>Backend</option>
</select>
```

3. **อัพเดท Task Creation** (`js/tasks.js`)
```javascript
const task = {
    // ... existing
    tags: document.getElementById('taskTags').value
};
```

4. **อัพเดท Rendering** (`js/render.js`)
```javascript
// แสดง tags ในการ์ดงาน
```

5. **อัพเดท Export** (`js/export.js`)
```javascript
// เพิ่ม column tags ใน CSV
```

---

## 🐛 Debugging

### เปิด Console Logs
แต่ละไฟล์มี `console.log()` สำหรับ debugging:
- ✅ = Success
- ⚠️ = Warning
- ❌ = Error

### ตรวจสอบ State
```javascript
// ใน Console
console.log(STATE);
console.log(STATE.tasks);
console.log(STATE.currentUser);
```

### ตรวจสอบ Firebase
```javascript
// ใน Console
firebase.auth().currentUser
firebase.firestore().collection('users').get()
```

---

## 📦 การ Build/Deploy

### Development
```bash
# เปิด Live Server
python -m http.server 8000
# หรือ
npx serve
```

### Production
```bash
# Deploy ด้วย Firebase Hosting
firebase deploy

# หรือ Deploy ด้วย Netlify/Vercel
# Push to GitHub และเชื่อมต่อ
```

---

## 🔒 Security Checklist

- [ ] ใส่ Firebase Config ที่ถูกต้อง
- [ ] ตั้งค่า Firestore Security Rules
- [ ] จำกัด Authorized Domains
- [ ] ใช้ HTTPS สำหรับ Production
- [ ] ไม่เปิดเผย API Keys ใน Public Repo

---

## 📚 Best Practices

### 1. การตั้งชื่อฟังก์ชัน
- ใช้ camelCase
- ชื่อต้องบอกหน้าที่ชัดเจน
- เช่น: `calculateStoryPoint()`, `renderTasks()`

### 2. การจัดการ State
- อัพเดท STATE ผ่าน functions เท่านั้น
- ไม่แก้ STATE โดยตรง

### 3. Error Handling
- ใช้ try-catch สำหรับ async operations
- แสดง error message ที่เข้าใจง่าย

### 4. Comments
- เขียน comments สำหรับ logic ที่ซับซ้อน
- ใช้ JSDoc สำหรับฟังก์ชันสำคัญ

---

## 🚀 Performance Tips

1. **Lazy Loading**: โหลด Firebase เมื่อจำเป็น
2. **Debouncing**: ใช้กับ real-time preview
3. **Batch Operations**: รวม Firebase writes
4. **LocalStorage Fallback**: ลด Firebase calls

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ Console errors
2. อ่าน FIREBASE_SETUP.md
3. ตรวจสอบ Browser compatibility
4. ลอง Incognito mode

---

**เอกสารนี้จัดทำโดย:** Agile Task Board Team  
**อัพเดทล่าสุด:** 2026  
**Version:** 1.0.0
