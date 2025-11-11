# 🎯 CHECKLIST DEPLOY LÊN RENDER.COM

## ✅ BƯỚC 1: Chuẩn Bị (5 phút)

### 1.1. MongoDB Atlas
- [ ] Đã có MongoDB Atlas account
- [ ] Đã tạo cluster
- [ ] Đã tạo database user
- [ ] **Whitelist IP: 0.0.0.0/0** ⚠️ QUAN TRỌNG
  - Network Access → Add IP Address → Allow Access from Anywhere

### 1.2. GitHub
- [ ] Code đã có trên GitHub repo: `NTC314/MMA_TroPay_BE`
- [ ] Branch `dev` đã push
- [ ] File `.gitignore` đúng (không commit .env)

### 1.3. Render Account
- [ ] Đã tạo account: https://render.com/
- [ ] Đã connect GitHub account
- [ ] Đã authorize Render truy cập repos

---

## ✅ BƯỚC 2: Push Code (1 phút)

### Option A: Dùng Script Tự Động
```bash
# Click chạy file:
deploy-to-render.bat
```

### Option B: Manual
```bash
cd c:\Users\DELL\Desktop\TroPay\TroPay-BE\MMA_TroPay_BE\TroPay

git add .
git commit -m "feat: setup Render deployment"
git push origin dev
```

---

## ✅ BƯỚC 3: Deploy trên Render (3 phút)

1. **Vào Render Dashboard**
   - https://dashboard.render.com/

2. **Tạo Web Service**
   - Click "New +" → "Web Service"
   - Connect repository: `NTC314/MMA_TroPay_BE`
   - Branch: `dev`
   - Render sẽ auto-detect `render.yaml` ✅

3. **Xác nhận config**
   - Name: `tropay-backend`
   - Runtime: Node
   - Build: `npm install`
   - Start: `npm start`
   - Plan: Free

4. **Add Environment Variables** ⚠️ QUAN TRỌNG
   
   Click "Environment" tab, thêm:

   ```
   MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/tropay
   JWT_SECRET = your_super_secret_key_min_256_bits
   JWT_REFRESH_SECRET = your_refresh_secret_key
   ```

   Các biến khác (optional):
   ```
   EMAIL_SERVICE = gmail
   EMAIL_USER = your_email@gmail.com
   EMAIL_PASSWORD = your_app_password
   
   CLOUDINARY_CLOUD_NAME = your_cloud_name
   CLOUDINARY_API_KEY = your_api_key
   CLOUDINARY_API_SECRET = your_api_secret
   ```

5. **Deploy!**
   - Click "Create Web Service"
   - Chờ 3-5 phút
   - Status: "Live" ✅

---

## ✅ BƯỚC 4: Test API (2 phút)

### 4.1. Lấy URL
```
https://tropay-backend.onrender.com
```

### 4.2. Test Health Check
```bash
curl https://tropay-backend.onrender.com/health
```

Kết quả mong đợi:
```json
{
  "status": "OK",
  "timestamp": "2025-11-11T...",
  "uptime": 123
}
```

### 4.3. Test API Docs
Truy cập:
```
https://tropay-backend.onrender.com/api-docs
```

### 4.4. Test Login API
```bash
curl -X POST https://tropay-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone_or_email":"0905234567","password":"admin123"}'
```

---

## ✅ BƯỚC 5: Update Frontend (5 phút)

### 5.1. Admin Web
File: `TroPay-Admin\MMA_TroPay_FE_WebAdmin\tropay-admin\.env`
```bash
REACT_APP_API_URL=https://tropay-backend.onrender.com/api
PORT=3001
```

Rebuild:
```bash
cd TroPay-Admin\MMA_TroPay_FE_WebAdmin\tropay-admin
npm install
npm run build
```

### 5.2. Mobile App
File: `TroPay-App\MMA_TroPay_FE_App\TroPay\.env`
```bash
EXPO_PUBLIC_API_URL=https://tropay-backend.onrender.com/api
```

Restart Expo:
```bash
cd TroPay-App\MMA_TroPay_FE_App\TroPay
npx expo start --clear
```

---

## ✅ BƯỚC 6: Test End-to-End (10 phút)

### Test Admin Web
- [ ] Login thành công
- [ ] Dashboard load data
- [ ] Users list hiển thị
- [ ] Rooms list hiển thị

### Test Mobile App
- [ ] Login owner/tenant thành công
- [ ] Dashboard load data
- [ ] API calls hoạt động
- [ ] MoMo payment test (nếu có)

---

## 🎉 HOÀN THÀNH!

### URL API Production
```
https://tropay-backend.onrender.com/api
```

### Các Endpoints Chính
- Health: `/health`
- Auth: `/api/auth/*`
- Users: `/api/users/*`
- Admin: `/api/admin/*`
- Owner: `/api/owner/*`
- Tenant: `/api/tenant/*`
- MoMo: `/api/momo/*`
- API Docs: `/api-docs`

---

## 📊 Monitoring

### Render Dashboard
- Logs: Real-time
- Metrics: CPU, Memory
- Deploys: History
- Settings: Environment vars

### Access Logs
```
Dashboard → tropay-backend → Logs
```

### Auto Deploy
Mỗi lần push code lên branch `dev`:
- Render tự động rebuild
- Tự động deploy
- ~3-5 phút

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Cold Start (Free Tier)
- Service sleep sau 15 phút không hoạt động
- First request: ~30 giây (cold start)
- **Giải pháp**: Ping endpoint mỗi 10 phút
  - Dùng: https://cron-job.org/ (free)
  - URL: `https://tropay-backend.onrender.com/health`
  - Interval: 10 phút

### Upgrade lên Paid ($7/month)
- No auto sleep
- Faster performance
- Custom domain support
- 24/7 availability

---

## 🆘 Troubleshooting

### "Application failed to respond"
✅ Check MongoDB connection string
✅ Check environment variables
✅ Check logs trong Render dashboard

### "Build failed"
✅ Check package.json
✅ Check Node version (>= 16)
✅ Check logs

### API trả về 502/503
✅ Service đang cold start (chờ 30s)
✅ Check MongoDB whitelist IPs
✅ Check logs

---

**🎊 Chúc mừng! Backend đã live!** 🚀

Docs: [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)
