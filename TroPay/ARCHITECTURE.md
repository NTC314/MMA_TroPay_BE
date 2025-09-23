# 🏗️ Cấu trúc Backend TroPay - Tổng quan

```
📦 TroPay Backend
├── 📁 src/                              # Source code chính
│   ├── 📁 config/                       # Cấu hình hệ thống
│   │   ├── 📄 database.js              # Cấu hình Sequelize/MySQL
│   │   ├── 📄 redis.js                 # Cấu hình Redis cache
│   │   └── 📄 swagger.js               # Cấu hình API documentation
│   │
│   ├── 📁 controllers/                  # Logic xử lý request
│   │   ├── 📄 auth.controller.js       # Xử lý đăng ký/đăng nhập
│   │   ├── 📄 user.controller.js       # Quản lý người dùng
│   │   ├── 📄 admin.controller.js      # Chức năng admin
│   │   ├── 📄 transaction.controller.js # Xử lý giao dịch
│   │   ├── 📄 wallet.controller.js     # Quản lý ví
│   │   ├── 📄 payment.controller.js    # Thanh toán gateway
│   │   └── 📄 notification.controller.js # Thông báo
│   │
│   ├── 📁 middleware/                   # Middleware functions
│   │   ├── 📄 auth.js                  # Xác thực JWT + phân quyền
│   │   ├── 📄 errorHandler.js          # Xử lý lỗi global
│   │   └── 📄 upload.js                # Upload file (Multer)
│   │
│   ├── 📁 models/                       # Database models
│   │   ├── 📄 index.js                 # Export tất cả models
│   │   ├── 📄 User.js                  # Model người dùng
│   │   ├── 📄 Wallet.js                # Model ví điện tử
│   │   ├── 📄 Transaction.js           # Model giao dịch
│   │   ├── 📄 Notification.js          # Model thông báo
│   │   └── 📄 Admin.js                 # Model admin
│   │
│   ├── 📁 routes/                       # API routes
│   │   ├── 📄 auth.routes.js           # /api/auth/*
│   │   ├── 📄 user.routes.js           # /api/users/*
│   │   ├── 📄 admin.routes.js          # /api/admin/*
│   │   ├── 📄 transaction.routes.js    # /api/transactions/*
│   │   ├── 📄 wallet.routes.js         # /api/wallets/*
│   │   ├── 📄 payment.routes.js        # /api/payments/*
│   │   └── 📄 notification.routes.js   # /api/notifications/*
│   │
│   ├── 📁 services/                     # Business logic
│   │   ├── 📄 authService.js           # Logic đăng nhập/đăng ký
│   │   ├── 📄 userService.js           # Logic người dùng
│   │   ├── 📄 walletService.js         # Logic ví điện tử
│   │   ├── 📄 transactionService.js    # Logic giao dịch
│   │   ├── 📄 paymentService.js        # Tích hợp payment gateway
│   │   ├── 📄 notificationService.js   # Gửi thông báo
│   │   ├── 📄 smsService.js           # Gửi SMS OTP
│   │   └── 📄 emailService.js         # Gửi email
│   │
│   ├── 📁 utils/                        # Utility functions
│   │   ├── 📄 logger.js                # Winston logger
│   │   ├── 📄 helpers.js               # Helper functions
│   │   ├── 📄 constants.js             # Hằng số ứng dụng
│   │   └── 📄 validators.js            # Custom validators
│   │
│   └── 📁 validators/                   # Request validation
│       ├── 📄 auth.validator.js        # Validation đăng nhập/ký
│       ├── 📄 user.validator.js        # Validation user data
│       ├── 📄 transaction.validator.js  # Validation giao dịch
│       └── 📄 payment.validator.js     # Validation thanh toán
│
├── 📁 migrations/                       # Database migrations
│   ├── 📄 001-create-users.js
│   ├── 📄 002-create-wallets.js
│   ├── 📄 003-create-transactions.js
│   └── 📄 004-create-notifications.js
│
├── 📁 seeders/                          # Database seeders
│   ├── 📄 001-admin-user.js
│   └── 📄 002-demo-users.js
│
├── 📁 tests/                            # Test files
│   ├── 📁 unit/                        # Unit tests
│   ├── 📁 integration/                 # Integration tests
│   └── 📄 setup.js                     # Test setup
│
├── 📁 logs/                             # Log files
│   ├── 📄 .gitkeep
│   ├── 📄 error.log                    # Error logs
│   └── 📄 combined.log                 # All logs
│
├── 📁 uploads/                          # Temporary uploads
│   └── 📄 .gitkeep
│
├── 📁 config/                           # Sequelize config
│   └── 📄 config.js                    # DB config cho migrations
│
├── 📄 server.js                         # Main server file
├── 📄 package.json                      # Dependencies & scripts
├── 📄 .env.example                      # Environment template
├── 📄 .gitignore                        # Git ignore rules
├── 📄 README.md                         # Documentation
└── 📄 jsconfig.json                     # JavaScript config
```

## 🔄 Luồng hoạt động chính:

### 1. 📱 Mobile App Flow:
```
User Request → Routes → Middleware (Auth) → Controller → Service → Model → Database
                 ↓
            Response ← JSON Format ← Business Logic ← Data Processing
```

### 2. 🖥️ Admin Web Flow:
```
Admin Request → Routes → Auth + Role Check → Admin Controller → Service → Model → Database
                  ↓
             Dashboard ← Aggregated Data ← Admin Logic ← Admin Queries
```

### 3. 💳 Payment Flow:
```
Payment Request → Validation → Payment Service → Gateway API
                      ↓              ↓
                 Transaction ← Callback ← Gateway Response
                      ↓
                 Wallet Update
```

## 🛡️ Security Layers:

1. **Rate Limiting** - Giới hạn request
2. **CORS** - Kiểm soát cross-origin  
3. **Helmet** - HTTP security headers
4. **JWT** - Token-based authentication
5. **Bcrypt** - Password hashing
6. **Joi** - Input validation
7. **Sequelize** - SQL injection protection

## 📊 Monitoring & Logging:

- **Winston** - Structured logging
- **Morgan** - HTTP request logging  
- **Socket.IO** - Real-time notifications
- **Swagger** - API documentation
- **Jest** - Testing framework

Cấu trúc này được thiết kế để:
- ✅ **Scalable**: Dễ mở rộng
- ✅ **Maintainable**: Dễ bảo trì
- ✅ **Secure**: Bảo mật cao
- ✅ **Modular**: Tách biệt rõ ràng
- ✅ **Testable**: Dễ test