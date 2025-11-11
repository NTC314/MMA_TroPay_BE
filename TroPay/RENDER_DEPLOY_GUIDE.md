# 🚀 Hướng Dẫn Deploy TroPay Backend lên Render.com (FREE)

## ✅ Ưu Điểm Render.com

- ✅ **FREE** cho hobby projects
- ✅ 750 hours/month (đủ dùng cho 1 project)
- ✅ Tự động deploy khi push code lên GitHub
- ✅ SSL certificate miễn phí
- ✅ Logs và monitoring built-in
- ⚠️ Auto sleep sau 15 phút không hoạt động (cold start ~30s)

---

## 📋 BƯỚC 1: Chuẩn Bị Repository

### 1.1. Đẩy code lên GitHub (nếu chưa có)

```bash
# Khởi tạo git (nếu chưa có)
cd c:\Users\DELL\Desktop\TroPay\TroPay-BE\MMA_TroPay_BE\TroPay
git init

# Add remote repository
git remote add origin https://github.com/NTC314/MMA_TroPay_BE.git

# Commit code
git add .
git commit -m "feat: prepare for Render deployment"

# Push lên GitHub
git push -u origin dev
```

### 1.2. Đảm bảo .gitignore đúng

File `.gitignore` phải có:
```
node_modules/
.env
.env.local
*.log
logs/
uploads/*
!uploads/.gitkeep
temp/
functions/
firebase.json
.firebaserc
```

✅ Đã được cấu hình sẵn!

---

## 📋 BƯỚC 2: Tạo Account Render

1. Truy cập: https://render.com/
2. Click **"Get Started"**
3. Sign up với GitHub account
4. Authorize Render truy cập GitHub repos

---

## 📋 BƯỚC 3: Deploy Web Service

### 3.1. Create New Web Service

1. Vào Dashboard Render: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `NTC314/MMA_TroPay_BE`
4. Click **"Connect"**

### 3.2. Cấu hình Web Service

**Name:** `tropay-backend`

**Region:** `Singapore` (gần Việt Nam nhất)

**Branch:** `dev`

**Root Directory:** (để trống hoặc `TroPay`)

**Runtime:** `Node`

**Build Command:** 
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Instance Type:** `Free`

### 3.3. Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Thêm các biến sau (copy từ file .env):

```bash
NODE_ENV=production
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://your-mongodb-uri

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_complex
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
JWT_REFRESH_EXPIRE=30d

# Frontend URLs (update sau khi có domain)
FRONTEND_URL=https://tropay-app.onrender.com
ADMIN_URL=https://tropay-admin.onrender.com

# MoMo Payment
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn
MOMO_RETURN_URL=https://tropay-backend.onrender.com/api/momo/return
MOMO_NOTIFY_URL=https://tropay-backend.onrender.com/api/momo/notify

# Email (nếu có)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary (nếu có)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3.4. Deploy!

Click **"Create Web Service"**

Render sẽ:
1. Pull code từ GitHub
2. Chạy `npm install`
3. Chạy `npm start`
4. Deploy xong trong ~5 phút

---

## 📋 BƯỚC 4: Lấy API URL

Sau khi deploy xong, bạn sẽ có URL:

```
https://tropay-backend.onrender.com
```

Test API:
```bash
curl https://tropay-backend.onrender.com/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-11T...",
  "uptime": 123
}
```

---

## 📋 BƯỚC 5: Cập Nhật MongoDB Atlas

### Whitelist Render IPs

1. Vào MongoDB Atlas Dashboard
2. **Network Access** → **Add IP Address**
3. Chọn **"Allow Access from Anywhere"** (`0.0.0.0/0`)
4. Click **"Confirm"**

⚠️ **Lưu ý:** Dùng strong password cho MongoDB!

---

## 📋 BƯỚC 6: Update Frontend URLs

### Admin Web

File: `TroPay-Admin/.env`
```bash
REACT_APP_API_URL=https://tropay-backend.onrender.com/api
```

### Mobile App

File: `TroPay-App/.env`
```bash
EXPO_PUBLIC_API_URL=https://tropay-backend.onrender.com/api
```

Rebuild và test!

---

## 📋 BƯỚC 7: Setup Auto Deploy (Optional)

Render tự động deploy khi bạn push code lên GitHub!

```bash
# Sau khi sửa code
git add .
git commit -m "fix: update feature"
git push origin dev

# Render sẽ tự động deploy sau 30 giây
```

---

## 🔧 Troubleshooting

### Lỗi: "Application failed to respond"

**Nguyên nhân:** Server không start được

**Fix:**
1. Check logs: Dashboard → Logs
2. Kiểm tra MongoDB connection string
3. Kiểm tra PORT environment variable

### Lỗi: "Build failed"

**Nguyên nhân:** npm install lỗi

**Fix:**
1. Check package.json engines
2. Check dependencies version
3. Xem logs chi tiết

### Cold Start Chậm (15-30s)

**Nguyên nhân:** Free tier auto sleep

**Giải pháp:**
1. Upgrade lên Starter plan ($7/month - no sleep)
2. Hoặc dùng cron job ping server mỗi 10 phút:
   ```bash
   # Dùng cron-job.org (free)
   GET https://tropay-backend.onrender.com/health
   Mỗi 10 phút
   ```

---

## 💰 Chi Phí

### Free Tier
- ✅ 750 hours/month
- ✅ 1 project free
- ✅ Auto sleep sau 15 phút idle
- ⚠️ Cold start: 30 giây

### Starter ($7/month)
- ✅ No auto sleep
- ✅ Faster cold start
- ✅ Custom domain
- ✅ Priority support

**Khuyến nghị:** Dùng Free tier cho development/testing

---

## 📊 Monitoring

### Xem Logs
1. Dashboard → Service → Logs
2. Real-time logs
3. Filter by date/time

### Metrics
- CPU usage
- Memory usage
- Response time
- Error rate

### Alerts
Setup email alerts khi service down

---

## 🔐 Security Best Practices

1. ✅ Environment variables không commit lên Git
2. ✅ MongoDB whitelist IPs
3. ✅ Strong passwords
4. ✅ HTTPS tự động (Render cung cấp)
5. ✅ Rate limiting đã setup
6. ✅ Helmet security headers đã enable

---

## 📚 Tài Liệu

- [Render Docs](https://render.com/docs)
- [Node.js Deployment](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

---

## ✅ Checklist Deploy

- [ ] Code đã push lên GitHub
- [ ] .gitignore đúng (không commit .env)
- [ ] MongoDB Atlas whitelist 0.0.0.0/0
- [ ] Render account đã tạo
- [ ] Web Service đã tạo và deploy
- [ ] Environment variables đã set đầy đủ
- [ ] Test API endpoint: `/health`
- [ ] Update Frontend URLs
- [ ] Test login/register
- [ ] Test payment flow

---

**🎉 Chúc bạn deploy thành công!**

Nếu cần giúp gì thêm, inbox tôi nhé! 🚀
