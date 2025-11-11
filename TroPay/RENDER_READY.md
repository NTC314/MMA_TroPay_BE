# ✅ SẴN SÀNG DEPLOY LÊN RENDER.COM

## 📁 Files Đã Tạo

- ✅ `RENDER_DEPLOY_GUIDE.md` - Hướng dẫn chi tiết
- ✅ `render.yaml` - Config tự động cho Render
- ✅ `render-build.sh` - Build script

## 🚀 CÁCH DEPLOY NHANH (3 BƯỚC)

### Bước 1: Push Code Lên GitHub
```bash
cd c:\Users\DELL\Desktop\TroPay\TroPay-BE\MMA_TroPay_BE\TroPay

git add .
git commit -m "feat: setup Render deployment"
git push origin dev
```

### Bước 2: Tạo Web Service trên Render
1. Vào: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect repo: `NTC314/MMA_TroPay_BE`
4. Render sẽ tự động detect `render.yaml` và config!

### Bước 3: Set Environment Variables
Trong Render Dashboard, thêm:
- `MONGODB_URI` - Connection string từ MongoDB Atlas
- `JWT_SECRET` - Secret key của bạn
- Các biến khác (xem file .env)

**Deploy xong trong 5 phút!** 🎉

---

## 🌐 API URL Sau Deploy

```
https://tropay-backend.onrender.com
```

Endpoints:
- Health: `/health`
- Login: `/api/auth/login`
- API Docs: `/api/api-docs`

---

## 📝 Update Frontend URLs

### Admin (.env)
```bash
REACT_APP_API_URL=https://tropay-backend.onrender.com/api
```

### Mobile (.env)
```bash
EXPO_PUBLIC_API_URL=https://tropay-backend.onrender.com/api
```

---

## ⚠️ LƯU Ý

### MongoDB Atlas
- Whitelist IP: `0.0.0.0/0` (Allow from anywhere)
- Vào: Network Access → Add IP Address

### Cold Start (Free Tier)
- Service sleep sau 15 phút idle
- First request sau sleep: ~30 giây
- **Giải pháp:** Ping endpoint mỗi 10 phút (dùng cron-job.org)

### Upgrade lên Paid ($7/month)
- No auto sleep
- Faster performance
- Custom domain
- Link: Render Dashboard → Upgrade Plan

---

## 🆘 CẦN GIÚP?

Đọc chi tiết: [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)

**Status: ✅ SẴN SÀNG!**

Giờ bạn chỉ cần:
1. Push code lên GitHub
2. Connect Render với repo
3. Deploy! 🚀
