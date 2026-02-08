# 📋 Agile Task Board - ระบบจัดการงานแบบ Agile

ระบบจัดการงานแบบ Agile พร้อมฟีเจอร์ Collaboration, Achievements และ Leaderboard

## ✨ ฟีเจอร์หลัก

### 📝 การจัดการงาน
- ✅ สร้าง แก้ไข และลบงาน
- ✅ กำหนด Story Points และ Priority
- ✅ จัดการ Subtasks
- ✅ ติดตามความคืบหน้า
- ✅ Finalize งานเมื่อเสร็จสมบูรณ์

### 👥 Collaboration
- ✅ แชร์งานให้เพื่อนร่วมทำ
- ✅ เพิ่มความคิดเห็นในงาน
- ✅ แก้ไขและลบความคิดเห็น
- ✅ ระบบเพื่อน (Friend System)
- ✅ การแจ้งเตือนแบบ Real-time

### 🏆 Gamification
- ✅ ระบบคะแนน (Points)
- ✅ ความสำเร็จ (Achievements)
- ✅ ตารางอันดับ (Leaderboard)
- ✅ เปรียบเทียบคะแนนกับเพื่อน

### 🎨 UI/UX
- ✅ Dark Mode
- ✅ Responsive Design
- ✅ การแจ้งเตือนแบบ Toast
- ✅ Offline Support

## 🚀 การติดตั้ง

### 1. Clone โปรเจกต์
```bash
git clone <repository-url>
cd Notify
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Firebase
1. สร้างโปรเจกต์ใน [Firebase Console](https://console.firebase.google.com/)
2. เปิดใช้งาน Authentication (Google Sign-in)
3. เปิดใช้งาน Firestore Database
4. คัดลอก Firebase Config ไปใส่ใน `firebase-config.js`

```javascript
// firebase-config.js
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 4. ตั้งค่า Firestore Security Rules
คัดลอกเนื้อหาจากไฟล์ `firestore.rules` ไปยัง Firebase Console

### 5. Deploy
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

## 📁 โครงสร้างโปรเจกต์

```
Notify/
├── index.html              # หน้าหลัก
├── style.css              # Styles
├── firebase-config.js     # Firebase Configuration
├── firestore.rules        # Firestore Security Rules
├── firestore.indexes.json # Firestore Indexes
├── firebase.json          # Firebase Hosting Config
├── js/                    # JavaScript Files
│   ├── main.js           # Entry Point
│   ├── auth.js           # Authentication
│   ├── firebase-db.js    # Firebase Operations
│   ├── tasks.js          # Task Management
│   ├── subtasks.js       # Subtask Management
│   ├── collaboration.js  # Collaboration Features
│   ├── friends.js        # Friend System
│   ├── achievements.js   # Achievements System
│   ├── leaderboard.js    # Leaderboard
│   ├── points.js         # Points Calculation
│   ├── notifications.js  # Notifications
│   ├── render.js         # UI Rendering
│   ├── ui.js             # UI Interactions
│   ├── dark-mode.js      # Dark Mode
│   ├── error-handler.js  # Error Handling
│   ├── performance-monitor.js # Performance Monitoring
│   └── data-cleanup.js   # Data Cleanup
├── backup/               # Backup Files (ห้ามแก้ไข)
└── _archive/            # Archived Files
    ├── old-docs/        # เอกสารเก่า
    ├── old-tests/       # ไฟล์ทดสอบ
    └── old-configs/     # Config เก่า
```

## 🎯 การใช้งาน

### เข้าสู่ระบบ
1. เปิดเว็บไซต์
2. คลิก "เข้าสู่ระบบด้วย Google"
3. เลือกบัญชี Google

### สร้างงาน
1. กรอกชื่องาน
2. เลือก Priority (Low, Medium, High)
3. กำหนด Story Points (1-100)
4. เพิ่ม Subtasks (ถ้ามี)
5. คลิก "เพิ่มงาน"

### แชร์งาน
1. เปิดรายละเอียดงาน
2. คลิก "แชร์งาน"
3. เลือกเพื่อนที่ต้องการแชร์
4. คลิก "แชร์"

### เพิ่มเพื่อน
1. ไปที่หน้า "เพื่อน"
2. กรอกอีเมลของเพื่อน
3. คลิก "ส่งคำขอเป็นเพื่อน"
4. รอเพื่อนยืนยัน

## 🔧 การตั้งค่า

### Dark Mode
- คลิกปุ่ม 🌙/☀️ ที่มุมขวาบน
- ระบบจะจำการตั้งค่าไว้

### การแจ้งเตือน
- คลิกปุ่ม 🔔 เพื่อเปิด/ปิดการแจ้งเตือน
- เลือกเสียงแจ้งเตือนที่ต้องการ

## 📊 ระบบคะแนน

### การได้คะแนน
- ✅ เสร็จงาน = Story Points ของงาน
- ✅ เสร็จ Subtask = 1 คะแนน
- ✅ Finalize งาน = โบนัส 10%

### Achievements
- 🎯 First Task - สร้างงานแรก
- 🏃 Task Master - สร้าง 10 งาน
- ⚡ Speed Demon - เสร็จ 5 งานในวันเดียว
- 🎯 Perfect Score - เสร็จงานที่มี 100 points
- และอื่นๆ อีกมากมาย

## 🛠️ การพัฒนา

### รัน Local Server
```bash
# ใช้ Python
python -m http.server 8000

# หรือใช้ Node.js
npx http-server
```

### Deploy ไปยัง Firebase Hosting
```bash
firebase deploy
```

## 📝 License

MIT License - ใช้งานได้อย่างอิสระ

## 👨‍💻 ผู้พัฒนา

พัฒนาโดย Thanatchai Fuetsoongneon

## 🤝 การสนับสนุน

หากพบปัญหาหรือต้องการเสนอแนะ กรุณาติดต่อผ้านพัฒนา
