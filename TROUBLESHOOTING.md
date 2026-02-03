# 🔧 คู่มือแก้ปัญหา - Google Sign-in

## ❌ ปัญหา: Login ด้วย Google ไม่ได้

### ✅ วิธีแก้ไข (ทำตามลำดับ):

---

## ขั้นตอนที่ 1: ตรวจสอบ Firebase Console

### 1.1 เปิดใช้งาน Google Sign-in
1. ไปที่ [Firebase Console](https://console.firebase.google.com/project/agile-task-board/authentication/providers)
2. คลิก **Authentication** → **Sign-in method**
3. หา **Google** ในรายการ
4. คลิกที่ **Google**
5. เปิด **Enable** (สวิตช์เป็นสีน้ำเงิน)
6. เลือก **Project support email** (อีเมลของคุณ)
7. คลิก **Save**

### 1.2 ตรวจสอบ Authorized Domains
1. ใน **Authentication** → **Settings** → **Authorized domains**
2. ตรวจสอบว่ามี:
   - ✅ `localhost`
   - ✅ `127.0.0.1`
   - ✅ Domain ของคุณ (ถ้ามี)

3. ถ้าไม่มี `localhost` ให้เพิ่ม:
   - คลิก **Add domain**
   - พิมพ์: `localhost`
   - คลิก **Add**

---

## ขั้นตอนที่ 2: ตรวจสอบ Console Errors

### 2.1 เปิด Developer Console
1. กด **F12** หรือคลิกขวา → **Inspect**
2. ไปที่แท็บ **Console**
3. ลอง Login ด้วย Google อีกครั้ง
4. ดู Error message

### 2.2 Error Messages ที่พบบ่อย:

#### Error: "auth/unauthorized-domain"
**สาเหตุ:** Domain ไม่ได้รับอนุญาต

**แก้ไข:**
```
1. ไปที่ Firebase Console → Authentication → Settings
2. เพิ่ม domain ของคุณใน Authorized domains
3. ถ้าใช้ localhost ให้เพิ่ม: localhost
```

#### Error: "auth/popup-blocked"
**สาเหตุ:** Browser บล็อก Popup

**แก้ไข:**
```
1. อนุญาต Popup สำหรับ localhost
2. ลองใช้ Incognito/Private mode
3. ปิด Ad Blocker
```

#### Error: "auth/operation-not-allowed"
**สาเหตุ:** ยังไม่ได้เปิดใช้งาน Google Sign-in

**แก้ไข:**
```
ทำตามขั้นตอนที่ 1.1 ข้างบน
```

---

## ขั้นตอนที่ 3: ตรวจสอบ URL

### 3.1 ต้องใช้ HTTPS หรือ localhost
Google Sign-in ทำงานได้เฉพาะ:
- ✅ `https://...` (HTTPS)
- ✅ `http://localhost:...`
- ✅ `http://127.0.0.1:...`
- ❌ `http://192.168.x.x:...` (IP ภายใน - ไม่ได้)
- ❌ `file:///...` (เปิดไฟล์โดยตรง - ไม่ได้)

### 3.2 ถ้าใช้ IP Address
ถ้าคุณเปิดด้วย `http://192.168.1.100:8000`:

**วิธีแก้:**
```bash
# แทนที่จะใช้ IP ให้ใช้ localhost
http://localhost:8000
```

---

## ขั้นตอนที่ 4: ลองวิธีอื่น

### 4.1 ใช้ Incognito/Private Mode
```
1. เปิด Incognito/Private window
2. ไปที่ http://localhost:8000
3. ลอง Login ด้วย Google
```

### 4.2 ล้าง Cache
```
1. กด Ctrl+Shift+Delete (Windows) หรือ Cmd+Shift+Delete (Mac)
2. เลือก "Cached images and files"
3. คลิก "Clear data"
4. Refresh หน้า (F5)
```

### 4.3 ลองเบราว์เซอร์อื่น
```
- Chrome (แนะนำ)
- Firefox
- Edge
```

---

## ขั้นตอนที่ 5: ตรวจสอบ Firebase Config

### 5.1 เปิดไฟล์ `firebase-config.js`
ตรวจสอบว่ามีค่าครบถ้วน:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBJzO5-G3bnCX4iIaKotuzGQ9bIc3hLfmw",
    authDomain: "agile-task-board.firebaseapp.com",
    projectId: "agile-task-board",
    storageBucket: "agile-task-board.firebasestorage.app",
    messagingSenderId: "484058962341",
    appId: "1:484058962341:web:bbb8e410febc555c8d304c",
    measurementId: "G-00Y98YCKMZ"
};
```

### 5.2 ตรวจสอบว่า Firebase โหลดสำเร็จ
เปิด Console (F12) แล้วพิมพ์:
```javascript
firebase
```

ถ้าเห็น Object → โหลดสำเร็จ ✅  
ถ้าเห็น "undefined" → ไม่โหลด ❌

---

## 🎯 วิธีทดสอบที่แน่นอน

### ทดสอบแบบง่าย:
```bash
# 1. ปิดเบราว์เซอร์ทั้งหมด
# 2. เปิด Terminal/CMD
# 3. รันคำสั่ง:

python -m http.server 8000

# 4. เปิดเบราว์เซอร์ใหม่
# 5. ไปที่: http://localhost:8000
# 6. ลอง Login ด้วย Google
```

---

## 📋 Checklist การตรวจสอบ

ก่อนลอง Login ด้วย Google ให้ตรวจสอบ:

- [ ] เปิดใช้งาน Google Sign-in ใน Firebase Console แล้ว
- [ ] เลือก Support email แล้ว
- [ ] มี `localhost` ใน Authorized domains
- [ ] ใช้ URL เป็น `http://localhost:...` (ไม่ใช่ IP)
- [ ] เปิดด้วย Live Server หรือ Python HTTP Server
- [ ] ไม่มี Ad Blocker บล็อก Popup
- [ ] ใช้เบราว์เซอร์ที่รองรับ (Chrome แนะนำ)
- [ ] Firebase SDK โหลดสำเร็จ (ตรวจสอบใน Console)

---

## 🔍 วิธีดู Error แบบละเอียด

### เพิ่มโค้ดนี้ใน `js/auth.js`:

```javascript
async function signInWithGoogle() {
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
        
        if (error.code === 'auth/popup-blocked') {
            errorMessage = 'เบราว์เซอร์บล็อก Popup กรุณาอนุญาต Popup';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Domain ไม่ได้รับอนุญาต กรุณาตรวจสอบ Firebase Console';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'ยังไม่ได้เปิดใช้งาน Google Sign-in ใน Firebase Console';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'คุณปิด Popup ก่อนเข้าสู่ระบบเสร็จ';
        }
        
        showNotification(errorMessage, 'error');
        alert(errorMessage + '\n\nError Code: ' + error.code);
    }
}
```

---

## 💡 Tips เพิ่มเติม

### 1. ใช้ Redirect แทน Popup (ถ้า Popup ไม่ทำงาน)

แก้ไขใน `js/auth.js`:
```javascript
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        // เปลี่ยนจาก signInWithPopup เป็น signInWithRedirect
        await firebase.auth().signInWithRedirect(provider);
    } catch (error) {
        console.error('Error:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}
```

### 2. ตรวจสอบ Network
```
1. เปิด Developer Tools (F12)
2. ไปที่แท็บ Network
3. ลอง Login ด้วย Google
4. ดู Request ที่ fail (สีแดง)
```

### 3. ลอง Anonymous Login ก่อน
```
ถ้า Anonymous Login ได้ แต่ Google ไม่ได้
→ แสดงว่า Firebase ทำงาน แต่ Google Sign-in ยังไม่ได้ตั้งค่า
```

---

## 📞 ยังแก้ไม่ได้?

### ส่งข้อมูลเหล่านี้มา:

1. **Error Message จาก Console** (ถ้ามี)
2. **URL ที่ใช้** (เช่น `http://localhost:8000`)
3. **เบราว์เซอร์และเวอร์ชัน** (เช่น Chrome 120)
4. **Screenshot ของ Firebase Console** → Authentication → Sign-in method
5. **Screenshot ของ Error** (ถ้ามี)

---

## ✅ หลังจากแก้ไขแล้ว

1. **Refresh หน้า** (F5)
2. **ลอง Login ด้วย Google อีกครั้ง**
3. **ตรวจสอบว่าโปรไฟล์แสดงถูกต้อง**

---

**เอกสารนี้จัดทำโดย:** Agile Task Board Team  
**อัพเดทล่าสุด:** 2026  
**สำหรับ:** Google Sign-in Troubleshooting
