# 🔥 คู่มือการติดตั้ง Firebase

## 📋 ขั้นตอนการติดตั้ง

### 1. สร้างโปรเจกต์ Firebase

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก **"Add project"** หรือ **"เพิ่มโปรเจกต์"**
3. ตั้งชื่อโปรเจกต์ เช่น `  `
4. เลือกว่าจะเปิด Google Analytics หรือไม่ (แนะนำให้เปิด)
5. คลิก **"Create project"**

---

### 2. เปิดใช้งาน Authentication

1. ในเมนูด้านซ้าย คลิก **"Authentication"**
2. คลิกแท็บ **"Sign-in method"**
3. เปิดใช้งาน:
   - ✅ **Anonymous** (สำหรับผู้ใช้ที่ไม่ต้องการสมัครสมาชิก)
   - ✅ **Google** (สำหรับเข้าสู่ระบบด้วย Google)

**สำหรับ Google Sign-in:**
- คลิก Google → Enable
- ใส่ Project support email
- คลิก Save

---

### 3. สร้าง Firestore Database

1. ในเมนูด้านซ้าย คลิก **"Firestore Database"**
2. คลิก **"Create database"**
3. เลือก **"Start in test mode"** (สำหรับการพัฒนา)
4. เลือก Location ที่ใกล้ที่สุด เช่น `asia-southeast1 (Singapore)`
5. คลิก **"Enable"**

**⚠️ Security Rules สำหรับ Production:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

### 4. ดึง Firebase Configuration

1. ไปที่ **Project Settings** (ไอคอนเฟือง)
2. เลื่อนลงมาที่ **"Your apps"**
3. คลิก **"Web"** (ไอคอน `</>`)
4. ตั้งชื่อแอป เช่น `Agile Task Board Web`
5. คลิก **"Register app"**
6. คัดลอก **Firebase configuration**

จะได้โค้ดประมาณนี้:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

### 5. ใส่ Configuration ในโปรเจกต์

1. เปิดไฟล์ `firebase-config.js`
2. แทนที่ค่าใน `firebaseConfig` ด้วยค่าที่คัดลอกมา:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

---

### 6. ทดสอบการเชื่อมต่อ

1. เปิดไฟล์ `index.html` ในเบราว์เซอร์
2. เปิด Developer Console (F12)
3. ควรเห็นข้อความ:
   ```
   ✅ Firebase initialized successfully
   ```

4. ลองเข้าสู่ระบบ:
   - คลิก **"เข้าใช้แบบไม่ระบุตัวตน"** หรือ
   - คลิก **"เข้าสู่ระบบด้วย Google"**

5. ถ้าสำเร็จ จะเห็น:
   ```
   ✅ User signed in: [user-id]
   ```

---

## 🔔 การตั้งค่าการแจ้งเตือน

### เปิดใช้งาน Browser Notifications

1. เมื่อเปิดแอปครั้งแรก จะมี popup ขออนุญาต
2. คลิก **"Allow"** หรือ **"อนุญาต"**
3. ถ้าปิดไปแล้ว สามารถเปิดได้ที่:
   - Chrome: Settings → Privacy and security → Site settings → Notifications
   - Firefox: Settings → Privacy & Security → Permissions → Notifications

---

## 📊 โครงสร้างข้อมูลใน Firestore

```
users/
  └── {userId}/
      └── tasks/
          └── {taskId}/
              ├── id: number
              ├── name: string
              ├── description: string
              ├── assignee: string
              ├── dueDate: string (ISO 8601)
              ├── difficulty: number (1-5)
              ├── workload: number (1-5)
              ├── risk: number (1-5)
              ├── storyPoint: number
              ├── subtasks: array
              │   └── {
              │       text: string,
              │       completed: boolean
              │   }
              ├── notifications: array
              │   └── {
              │       days: number,
              │       sent: boolean
              │   }
              ├── notificationSound: string
              └── createdAt: string (ISO 8601)
```

---

## 🚀 การ Deploy

### Deploy ด้วย Firebase Hosting

1. ติดตั้ง Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login เข้า Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init
```
- เลือก **Hosting**
- เลือกโปรเจกต์ที่สร้างไว้
- Public directory: `.` (current directory)
- Single-page app: **No**
- Overwrite index.html: **No**

4. Deploy:
```bash
firebase deploy
```

5. จะได้ URL เช่น: `https://your-project.web.app`

---

## 🔒 Security Best Practices

### 1. อย่าเปิดเผย API Key ใน Public Repository
- ใช้ Environment Variables
- หรือใช้ `.gitignore` กับไฟล์ `firebase-config.js`

### 2. ตั้งค่า Security Rules ที่เข้มงวด
```javascript
// Production Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ผู้ใช้เข้าถึงได้เฉพาะข้อมูลของตัวเอง
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### 3. จำกัด Domain ที่อนุญาต
- ไปที่ Authentication → Settings → Authorized domains
- เพิ่มเฉพาะ domain ที่ต้องการ

---

## 🐛 การแก้ปัญหา

### ปัญหา: Firebase not initialized
**แก้ไข:**
- ตรวจสอบว่าใส่ Configuration ถูกต้อง
- ตรวจสอบว่าโหลด Firebase SDK ก่อน `firebase-config.js`

### ปัญหา: Permission denied
**แก้ไข:**
- ตรวจสอบ Security Rules ใน Firestore
- ตรวจสอบว่า user login แล้ว

### ปัญหา: Notifications ไม่ทำงาน
**แก้ไข:**
- ตรวจสอบว่าอนุญาต Notifications ในเบราว์เซอร์
- ต้องใช้ HTTPS (ยกเว้น localhost)
- ตรวจสอบว่าเบราว์เซอร์รองรับ Notification API

### ปัญหา: Google Sign-in ไม่ทำงาน
**แก้ไข:**
- ตรวจสอบว่าเปิดใช้งาน Google Sign-in ใน Firebase Console
- ตรวจสอบ Authorized domains
- ลองใช้ Incognito/Private mode

---

## 📚 เอกสารเพิ่มเติม

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

## 💡 Tips

1. **ใช้ Test Mode ระหว่างพัฒนา** แต่อย่าลืมเปลี่ยนเป็น Production Rules ก่อน Deploy
2. **Backup ข้อมูล** ด้วย Firestore Export เป็นประจำ
3. **Monitor Usage** ที่ Firebase Console → Usage and billing
4. **ใช้ Firebase Emulator** สำหรับ Development ท้องถิ่น

---

**เอกสารนี้จัดทำโดย:** Agile Task Board System  
**อัพเดทล่าสุด:** 2026
