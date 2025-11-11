# 🚀 Hướng Dẫn Deploy TroPay Backend lên Firebase Functions

## 📋 Chuẩn Bị

### 1. Kiểm tra cấu trúc project
```
TroPay-BE/
├── functions/
│   ├── src/           ✅ (đã copy)
│   ├── public/        ✅ (đã copy)
│   ├── index.js       ✅ (Firebase Function wrapper)
│   ├── package.json   ✅ (đã cập nhật dependencies)
│   └── .env           ✅ (đã copy)
├── firebase.json      ✅
├── .firebaserc        ✅
└── server.js          (giữ lại cho local dev)
```

### 2. Cài đặt Firebase CLI (nếu chưa có)
```bash
npm install -g firebase-tools
```

### 3. Đăng nhập Firebase
```bash
firebase login
```

## 🔧 Cấu Hình Environment Variables

### Cách 1: Sử dụng Firebase Config (Khuyến nghị cho production)
```bash
# Set từng biến môi trường
firebase functions:config:set mongodb.uri="mongodb+srv://your-mongodb-uri"
firebase functions:config:set jwt.secret="your-jwt-secret"
firebase functions:config:set momo.partner_code="MOMO"
firebase functions:config:set momo.access_key="F8BBA842ECF85"
firebase functions:config:set momo.secret_key="K951B6PE1waDMi640xX08PD3vg6EkVlz"

# Xem config hiện tại
firebase functions:config:get
```

### Cách 2: Sử dụng .env file (Cho development)
File `.env` đã được copy vào `functions/` folder.

**Lưu ý**: `.env` chỉ hoạt động với emulator, không work trên production.

## 📦 Deploy

### 1. Test trên Emulator trước (Local)
```bash
# Từ thư mục gốc project
cd c:\Users\DELL\Desktop\TroPay\TroPay-BE\MMA_TroPay_BE\TroPay

# Chạy emulator
firebase emulators:start --only functions

# API sẽ chạy tại: http://localhost:5001/YOUR_PROJECT_ID/us-central1/api
```

### 2. Deploy lên Firebase
```bash
# Deploy tất cả
firebase deploy

# Hoặc chỉ deploy functions
firebase deploy --only functions

# Deploy function cụ thể
firebase deploy --only functions:api
```

### 3. Xem logs
```bash
# Xem logs realtime
firebase functions:log --only api

# Hoặc xem trên Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions
```

## 🌐 API Endpoints sau khi deploy

### Production URL
```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

Ví dụ:
- Health check: `https://us-central1-tropay-xxx.cloudfunctions.net/api/health`
- Auth: `https://us-central1-tropay-xxx.cloudfunctions.net/api/auth/login`
- API docs: `https://us-central1-tropay-xxx.cloudfunctions.net/api/api-docs`

### Custom Domain (Tùy chọn)
Nếu muốn dùng domain riêng:
1. Vào Firebase Console > Hosting
2. Add custom domain
3. Follow hướng dẫn setup DNS

## ⚙️ Cấu Hình MongoDB Atlas

### Whitelist Firebase IPs
Firebase Functions sử dụng dynamic IPs, nên cần whitelist:

1. Vào MongoDB Atlas Dashboard
2. Network Access > Add IP Address
3. Chọn **"Allow Access from Anywhere"** (0.0.0.0/0)

**Lưu ý bảo mật**: Dùng strong password và authentication.

## 🔐 Cập nhật Frontend URLs

### Admin Web (.env)
```bash
REACT_APP_API_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

### Mobile App (.env)
```bash
EXPO_PUBLIC_API_URL=https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api
```

## 📊 Monitoring & Performance

### 1. Firebase Console
- Functions > Dashboard: Xem invocations, errors, execution time
- Functions > Logs: Chi tiết logs
- Functions > Health: Memory, CPU usage

### 2. Set Memory & Timeout (nếu cần)
Sửa file `functions/index.js`:
```javascript
exports.api = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https.onRequest(async (req, res) => {
    await ensureDbConnection();
    return app(req, res);
  });
```

## 💰 Chi Phí

### Free Tier (Blaze Plan)
- 2 million invocations/month
- 400,000 GB-seconds/month
- 200,000 CPU-seconds/month
- 5GB outbound networking/month

### Ước tính chi phí TroPay
Với ~1000 users, ~10,000 requests/day:
- **~$5-15/month** (depends on traffic)

## 🐛 Troubleshooting

### Lỗi: "Function failed on loading user code"
```bash
# Kiểm tra syntax errors
cd functions
npm run lint

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: "Cannot connect to MongoDB"
- Check MongoDB Atlas whitelist IPs
- Check connection string trong Firebase Config
- Check MongoDB cluster status

### Lỗi: "Function execution took too long"
```javascript
// Tăng timeout trong functions/index.js
exports.api = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(...)
```

### Lỗi: "Memory limit exceeded"
```javascript
// Tăng memory
exports.api = functions
  .runWith({ memory: '1GB' })
  .https.onRequest(...)
```

## ✅ Checklist Trước Deploy

- [ ] MongoDB Atlas đã whitelist Firebase IPs
- [ ] Firebase Config đã set đầy đủ (jwt.secret, mongodb.uri, momo keys)
- [ ] Test trên emulator thành công
- [ ] Update Frontend URLs về production URL
- [ ] CORS config đúng trong functions/index.js
- [ ] .env không được commit lên Git
- [ ] Đã chạy `npm run lint` trong functions/

## 🚀 Deploy Script Nhanh

Tạo file `deploy.bat` trong thư mục gốc:
```batch
@echo off
echo === TroPay Backend Deploy Script ===
echo.
echo [1/3] Linting code...
cd functions
call npm run lint
if errorlevel 1 (
    echo Lint failed! Fix errors first.
    exit /b 1
)

echo.
echo [2/3] Deploying to Firebase...
cd ..
call firebase deploy --only functions

echo.
echo [3/3] Done! Check logs:
call firebase functions:log --only api

pause
```

Chạy: `deploy.bat`

---

## 📚 Tài Liệu Tham Khảo

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Express on Firebase](https://firebase.google.com/docs/functions/http-events#using_existing_express_apps)
- [Environment Config](https://firebase.google.com/docs/functions/config-env)

---

**Chúc bạn deploy thành công! 🎉**
