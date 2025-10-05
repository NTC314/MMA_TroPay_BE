# TroPay Backend API

TroPay là một ứng dụng ví điện tử hiện đại được xây dựng bằng Node.js, Express.js và MongoDB, hỗ trợ cả ứng dụng mobile và web quản trị.

## 🚀 Tính năng chính

### Cho người dùng (Mobile App):
- ✅ Đăng ký/Đăng nhập bằng số điện thoại
- ✅ Xác thực OTP qua SMS
- ✅ Quản lý profile và KYC
- ✅ Ví điện tử với nhiều tính năng
- ✅ Chuyển tiền nội bộ
- ✅ Nạp tiền qua VNPay, MoMo
- ✅ Lịch sử giao dịch chi tiết
- ✅ Thông báo real-time
- ✅ Bảo mật với PIN

### Cho quản trị viên (Admin Web):
- ✅ Dashboard tổng quan
- ✅ Quản lý người dùng
- ✅ Duyệt KYC
- ✅ Quản lý giao dịch
- ✅ Báo cáo thống kê
- ✅ Cấu hình hệ thống

## 🛠 Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MongoDB với Mongoose ODM
- **Cache**: Redis
- **Authentication**: JWT
- **File Upload**: Cloudinary
- **Payment**: VNPay, MoMo
- **Real-time**: Socket.IO
- **Documentation**: Swagger
- **Logging**: Winston
- **Testing**: Jest
- **Security**: Helmet, Rate Limiting

## 📁 Cấu trúc dự án

```
TroPay/ (✨ Đã tối ưu cấu trúc)
├── 📄 server.js              # Entry point chính
├── 📄 package.json          # Dependencies và scripts  
├── 📄 .env                  # Cấu hình môi trường
├── 📄 .env.example         # Template môi trường
├── 📄 .gitignore           # Git ignore rules
├── 📄 jsconfig.json        # JavaScript config
├── 📄 README.md            # Documentation này
├── 📄 ARCHITECTURE.md      # Kiến trúc chi tiết
├── 📁 src/                 # 🎯 Source code chính
│   ├── 📁 config/          # Database, swagger, app config
│   ├── 📁 controllers/     # Business logic handlers
│   ├── 📁 middleware/      # Auth, upload, error handling
│   ├── 📁 models/          # MongoDB Mongoose schemas
│   ├── 📁 routes/          # API route definitions
│   ├── 📁 services/        # External services integration
│   ├── 📁 utils/           # Helper functions & utilities
│   └── 📁 validators/      # Input validation với Joi
├── 📁 tests/               # Test files và utilities
├── 📁 logs/                # Winston application logs
├── 📁 uploads/             # File storage directory
└── 📁 node_modules/        # NPM dependencies

❌ Đã xóa các thư mục không cần thiết:
    • public/ (static files - không dùng cho API)
    • views/ (template rendering - không dùng)
    • routes/ (cũ - đã chuyển vào src/)
    • bin/ (www script - không cần)
    • config/ (cũ - đã chuyển vào src/)
    • migrations/, seeders/ (SQL migrations - MongoDB không cần)
    • scripts/ (empty folder)
```

## 🚦 Cài đặt và chạy

### Yêu cầu hệ thống:
- Node.js >= 16.0.0
- MongoDB >= 4.4
- Redis >= 6.0

### Bước 1: Clone và cài đặt dependencies
```bash
git clone <repository-url>
cd TroPay
npm install
```

### Bước 2: Cấu hình môi trường
```bash
cp .env.example .env
# Chỉnh sửa file .env với thông tin của bạn
```

### Bước 3: Khởi động MongoDB và tạo dữ liệu mẫu
```bash
# Khởi động MongoDB (Windows)
net start MongoDB

# Hoặc nếu dùng Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Tạo dữ liệu mẫu (optional)
node scripts/seed.js
```

### Bước 4: Khởi chạy server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: http://localhost:5000
API Documentation: http://localhost:5000/api-docs

## 🔧 Scripts có sẵn

```bash
npm start          # Chạy production server
npm run dev        # Chạy development server với nodemon
npm test           # Chạy test suite
npm run test:watch # Chạy tests trong watch mode
npm run test:coverage # Chạy tests với coverage report
npm run lint       # Kiểm tra code style
npm run lint:fix   # Tự động fix code style
node scripts/seed.js # Tạo dữ liệu mẫu
```

## 📝 API Documentation

Sau khi khởi chạy server, bạn có thể truy cập API documentation tại:
- **Swagger UI**: http://localhost:5000/api-docs

### Main API Endpoints:

#### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/verify-phone` - Xác thực OTP
- `PUT /api/auth/change-password` - Đổi mật khẩu

#### User Management
- `GET /api/users/profile` - Xem profile
- `PUT /api/users/profile` - Cập nhật profile
- `POST /api/users/avatar` - Upload avatar
- `PUT /api/users/kyc` - Cập nhật thông tin KYC

#### Wallet & Transactions
- `GET /api/wallets/balance` - Xem số dư
- `GET /api/transactions` - Lịch sử giao dịch
- `POST /api/transactions/transfer` - Chuyển tiền

#### Payments
- `POST /api/payments/deposit` - Nạp tiền
- `GET /api/payments/vnpay/callback` - VNPay callback
- `POST /api/payments/momo/callback` - MoMo callback

#### Admin (Chỉ admin)
- `GET /api/admin/dashboard` - Dashboard dữ liệu
- `GET /api/admin/users` - Danh sách người dùng
- `PUT /api/admin/users/:id/status` - Cập nhật trạng thái user

## 🔒 Bảo mật

- **JWT Authentication**: Xác thực bằng token
- **Rate Limiting**: Giới hạn số request
- **Helmet**: Bảo vệ HTTP headers
- **CORS**: Kiểm soát cross-origin requests
- **Input Validation**: Kiểm tra dữ liệu đầu vào với Joi
- **Password Hashing**: Mã hóa mật khẩu với bcrypt

## 🧪 Testing

```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests trong watch mode
npm run test:watch
```

## 📊 Logging

Hệ thống sử dụng Winston để logging:
- **Development**: Console output với màu sắc
- **Production**: File-based logging
- **Log Levels**: error, warn, info, debug
- **Log Files**: `logs/error.log`, `logs/combined.log`

## 🚀 Deployment

### Docker (Recommended)
```bash
# Build image
docker build -t tropay-backend .

# Run container
docker run -p 5000:5000 --env-file .env tropay-backend
```

### PM2 (Node.js Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📋 Roadmap

- [ ] Tích hợp SMS Gateway thực tế
- [ ] Implement Redis caching
- [ ] Thêm payment gateway khác
- [ ] Notification push cho mobile
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Blockchain integration

## 📞 Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi:
- 📧 Email: support@tropay.com
- 📱 Hotline: 1900-xxx-xxx

## 📄 License

Dự án này được cấp phép theo [MIT License](LICENSE)

---

**TroPay Team** - Xây dựng tương lai thanh toán số 🚀