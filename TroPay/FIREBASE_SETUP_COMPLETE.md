# ✅ HOÀN THÀNH: Setup Firebase Functions

## 📁 Cấu Trúc Mới

```
TroPay-BE/
├── functions/                    ✅ Đã setup
│   ├── src/                      ✅ Đã copy từ root
│   ├── public/                   ✅ Đã copy từ root
│   ├── index.js                  ✅ Firebase Function wrapper
│   ├── package.json              ✅ Updated với dependencies
│   ├── .env                      ✅ Đã copy
│   └── .gitignore                ✅ Đã tạo
├── firebase.json                 ✅ Đã cấu hình
├── .firebaserc                   ✅ Đã có
├── deploy-firebase.bat           ✅ Script deploy nhanh
├── start-emulator.bat            ✅ Script test local
├── FIREBASE_DEPLOY_GUIDE.md      ✅ Hướng dẫn chi tiết
└── server.js                     (giữ lại cho local dev)
```

## 🚀 CÁCH SỬ DỤNG

### 1️⃣ Test Local (Emulator)
```bash
# Click chạy file:
start-emulator.bat

# Hoặc command:
firebase emulators:start --only functions
```

### 2️⃣ Deploy Lên Firebase
```bash
# Click chạy file:
deploy-firebase.bat

# Hoặc command:
firebase deploy --only functions
```

### 3️⃣ Xem Logs
```bash
firebase functions:log --only api
```

## ⚙️ CẤU HÌNH QUAN TRỌNG

### MongoDB Atlas
✅ **PHẢI whitelist Firebase IPs:**
1. Vào MongoDB Atlas
2. Network Access
3. Add IP: **0.0.0.0/0** (Allow from anywhere)

### Firebase Config (Production)
```bash
# Set environment variables trên Firebase
firebase functions:config:set mongodb.uri="YOUR_MONGODB_URI"
firebase functions:config:set jwt.secret="YOUR_JWT_SECRET"
firebase functions:config:set momo.partner_code="MOMO"
firebase functions:config:set momo.access_key="F8BBA842ECF85"
firebase functions:config:set momo.secret_key="K951B6PE1waDMi640xX08PD3vg6EkVlz"
```

## 🌐 API URL Sau Deploy

```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

**Ví dụ endpoints:**
- Health: `/health`
- Login: `/api/auth/login`
- API Docs: `/api/api-docs`

## 📝 CẬP NHẬT FRONTEND

### Admin Web
File: `TroPay-Admin/.env`
```bash
REACT_APP_API_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

### Mobile App
File: `TroPay-App/.env`
```bash
EXPO_PUBLIC_API_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

## 💡 LƯU Ý

### Chi Phí
- **Free Tier**: 2M invocations/month
- **Ước tính**: ~$5-15/month cho 1000 users

### Performance
Nếu cần tăng hiệu suất, sửa `functions/index.js`:
```javascript
exports.api = functions
  .runWith({
    timeoutSeconds: 540,  // Max: 540s
    memory: '1GB'          // Max: 8GB
  })
  .https.onRequest(...)
```

### Security
- ✅ File `.env` đã được gitignore
- ✅ CORS đã được cấu hình
- ✅ Rate limiting đã có
- ✅ Helmet security headers đã enable

## 📚 Đọc Thêm

Chi tiết đầy đủ: [FIREBASE_DEPLOY_GUIDE.md](./FIREBASE_DEPLOY_GUIDE.md)

---

**Status: ✅ SẴN SÀNG DEPLOY!**
