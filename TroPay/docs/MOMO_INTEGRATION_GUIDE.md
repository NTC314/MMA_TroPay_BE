# 🔐 MoMo Payment Integration Guide - Complete Implementation

Hướng dẫn tích hợp thanh toán MoMo cho React Native + ExpressJS với hỗ trợ Sandbox, UAT và Production.

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Cấu Hình Backend](#cấu-hình-backend)
3. [Cấu Hình Frontend](#cấu-hình-frontend)
4. [API Endpoints](#api-endpoints)
5. [Flow Thanh Toán](#flow-thanh-toán)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Tổng Quan

### Backend (ExpressJS)
- ✅ API tạo thanh toán: `POST /api/momo/create-payment`
- ✅ Callback handler: `GET/POST /api/momo/callback`
- ✅ Query transaction: `POST /api/momo/query`
- ✅ Hỗ trợ Sandbox, UAT, Production
- ✅ Verify signature SHA256
- ✅ Logging đầy đủ request/response

### Frontend (React Native)
- ✅ Service để gọi API tạo thanh toán
- ✅ Deep linking để mở MoMo app
- ✅ Fallback sang browser nếu không có app
- ✅ Payment result screen xử lý callback
- ✅ Error handling đầy đủ

---

## ⚙️ Cấu Hình Backend

### 1. File `.env`

Tạo file `.env` trong thư mục backend với nội dung:

```env
# MoMo Credentials (Test/Sandbox Keys)
MOMO_PARTNER_CODE=MOMOXXXX2020
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz

# MoMo Environment: sandbox, uat, or production
MOMO_ENV=sandbox

# MoMo Endpoints
MOMO_ENDPOINT_SANDBOX=https://test-payment.momo.vn
MOMO_ENDPOINT_UAT=https://uat-payment.momo.vn
MOMO_ENDPOINT_PRODUCTION=https://payment.momo.vn

# Base URL for callbacks
BASE_URL=http://localhost:5000

# MoMo Callback URLs (auto-generated from BASE_URL if not set)
MOMO_RETURN_URL=http://localhost:5000/api/momo/callback
MOMO_NOTIFY_URL=http://localhost:5000/api/momo/callback
```

### 2. Chuyển Đổi Môi Trường

Để chuyển đổi giữa các môi trường, chỉ cần thay đổi `MOMO_ENV`:

```env
# Sandbox (Testing)
MOMO_ENV=sandbox

# UAT (User Acceptance Testing)
MOMO_ENV=uat

# Production
MOMO_ENV=production
```

### 3. Cấu Trúc Files

```
TroPay-BE/
├── src/
│   ├── services/
│   │   └── momoService.js      # MoMo service với environment switching
│   ├── controllers/
│   │   └── momo.controller.js  # Controller xử lý payment
│   └── routes/
│       └── momo.routes.js       # API routes
└── .env                         # Environment variables
```

---

## 📱 Cấu Hình Frontend

### 1. Deep Linking

App đã được cấu hình scheme `tropay://` trong `app.json`:

```json
{
  "expo": {
    "scheme": "tropay"
  }
}
```

### 2. Cấu Trúc Files

```
TroPay-App/
├── src/
│   ├── services/
│   │   └── api/
│   │       └── momoService.ts  # Frontend service
│   └── screens/
│       └── Tenant/
│           └── InvoiceDetailScreen.tsx
├── app/
│   └── payment-result.tsx      # Payment result handler
└── app.json                     # Deep linking config
```

---

## 🔌 API Endpoints

### 1. Create Payment

**Endpoint:** `POST /api/momo/create-payment`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "invoiceId": "invoice_123",
  "amount": 3500000
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Tạo yêu cầu thanh toán MoMo thành công",
  "data": {
    "paymentId": "payment_123",
    "payUrl": "https://test-payment.momo.vn/...",
    "deeplink": "momo://payment?...",
    "qrCodeUrl": "https://...",
    "orderId": "INV_xxx_123456789",
    "requestId": "REQ_123456789"
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Lỗi khi tạo thanh toán MoMo",
  "error": "Error message"
}
```

### 2. Callback Handler

**Endpoint:** `GET/POST /api/momo/callback`

**GET (Return URL):** MoMo redirect user về đây sau khi thanh toán
- Redirect user về app: `tropay://momo-return?resultCode=0&orderId=...`

**POST (IPN):** MoMo gửi server-to-server notification
- Response: `{ resultCode: 0, message: "Success" }`

### 3. Query Transaction

**Endpoint:** `POST /api/momo/query`

**Request:**
```json
{
  "orderId": "INV_xxx_123456789",
  "requestId": "REQ_123456789"
}
```

---

## 🔄 Flow Thanh Toán

### 1. User Flow

```
1. User chọn hóa đơn → Bấm "Thanh toán ngay"
2. Chọn phương thức: MoMo
3. Frontend gọi API: POST /api/momo/create-payment
4. Backend tạo payment request → Gọi MoMo API
5. Backend trả về payUrl và deeplink
6. Frontend mở MoMo app (hoặc browser)
7. User thanh toán trong MoMo
8. MoMo redirect về: /api/momo/callback
9. Backend verify signature → Update payment status
10. Backend redirect về app: tropay://momo-return?resultCode=0
11. App hiển thị kết quả thanh toán
```

### 2. Backend Flow

```
1. Create Payment:
   - Validate invoice
   - Generate orderId, requestId
   - Create signature
   - Call MoMo API
   - Save payment record (pending)
   - Return payUrl

2. Callback Handler:
   - Verify signature
   - Find payment record
   - Update payment status
   - Update invoice status
   - Send notifications
   - Redirect to app (GET) or return success (POST)
```

### 3. Signature Verification

MoMo sử dụng HMAC SHA256 để verify signature:

**Request Signature:**
```
accessKey + amount + extraData + ipnUrl + orderId + 
orderInfo + partnerCode + redirectUrl + requestId + requestType
```

**Callback Signature:**
```
accessKey + amount + extraData + message + orderId + 
orderInfo + orderType + partnerCode + payType + requestId + 
responseTime + resultCode + transId
```

---

## 🧪 Testing

### 1. Test với Sandbox

**Setup:**
```env
MOMO_ENV=sandbox
MOMO_PARTNER_CODE=MOMOXXXX2020
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
```

**Test Account:**
- Số điện thoại test: `0123456789`
- OTP: `000000` (6 số 0)

**Test Steps:**
1. Tạo payment request
2. Mở payUrl trong browser
3. Đăng nhập với test account
4. Thanh toán với số tiền test
5. Verify callback được nhận

### 2. Test với UAT

**Setup:**
```env
MOMO_ENV=uat
# Sử dụng UAT credentials từ MoMo
```

**Test Steps:**
1. Đổi `MOMO_ENV=uat` trong `.env`
2. Restart server
3. Test như với sandbox

### 3. Test Deep Linking

**Test trên iOS Simulator:**
```bash
xcrun simctl openurl booted "tropay://momo-return?resultCode=0&orderId=TEST123"
```

**Test trên Android Emulator:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "tropay://momo-return?resultCode=0&orderId=TEST123"
```

---

## 📊 Logging

### Backend Logs

**Request Log:**
```json
{
  "orderId": "INV_xxx_123456789",
  "amount": 3500000,
  "requestId": "REQ_123456789",
  "endpoint": "https://test-payment.momo.vn/v2/gateway/api/create"
}
```

**Response Log:**
```json
{
  "resultCode": 0,
  "message": "Success",
  "payUrl": "https://test-payment.momo.vn/...",
  "deeplink": "momo://payment?..."
}
```

**Callback Log:**
```json
{
  "orderId": "INV_xxx_123456789",
  "requestId": "REQ_123456789",
  "resultCode": 0,
  "transId": "1234567890"
}
```

### Frontend Logs

Check console logs trong React Native:
- `🔐 MoMo Payment Request:` - Request details
- `✅ MoMo Response:` - Response data
- `🔗 MoMo payment data:` - Payment URLs
- `✅ Opened MoMo payment` - Success opening

---

## 🐛 Troubleshooting

### 1. Signature Verification Failed

**Nguyên nhân:**
- Secret key sai
- Raw signature string không đúng thứ tự
- Missing parameters

**Giải pháp:**
1. Kiểm tra `MOMO_SECRET_KEY` trong `.env`
2. Verify raw signature string trong code
3. Check logs để xem expected vs received signature

### 2. Cannot Open MoMo App

**Nguyên nhân:**
- MoMo app chưa cài đặt
- Deeplink không đúng format

**Giải pháp:**
1. App sẽ tự động fallback sang browser
2. Verify deeplink format: `momo://payment?...`

### 3. Callback Không Nhận Được

**Nguyên nhân:**
- URL callback không đúng
- Server không accessible từ internet
- Firewall blocking

**Giải pháp:**
1. Dùng ngrok để expose local server:
   ```bash
   ngrok http 5000
   ```
2. Update `BASE_URL` trong `.env` với ngrok URL
3. Update callback URLs trong MoMo dashboard

### 4. Payment Status Không Update

**Nguyên nhân:**
- Callback handler error
- Database connection issue
- Payment record không tìm thấy

**Giải pháp:**
1. Check backend logs
2. Verify payment record được tạo
3. Check database connection

---

## 📝 Ví Dụ Request/Response

### Request Example

```json
{
  "partnerCode": "MOMOXXXX2020",
  "partnerName": "TroPay",
  "storeId": "TroPayStore",
  "requestId": "REQ_123456789",
  "amount": 3500000,
  "orderId": "INV_xxx_123456789",
  "orderInfo": "Thanh toán hóa đơn phòng A101",
  "redirectUrl": "http://localhost:5000/api/momo/callback",
  "ipnUrl": "http://localhost:5000/api/momo/callback",
  "lang": "vi",
  "requestType": "captureWallet",
  "autoCapture": true,
  "extraData": "eyJpbnZvaWNlSWQiOiIxMjMifQ==",
  "signature": "abc123..."
}
```

### Response Example

```json
{
  "partnerCode": "MOMOXXXX2020",
  "orderId": "INV_xxx_123456789",
  "requestId": "REQ_123456789",
  "amount": 3500000,
  "responseTime": 1609459200000,
  "message": "Success",
  "resultCode": 0,
  "payUrl": "https://test-payment.momo.vn/gateway/...",
  "deeplink": "momo://payment?orderId=INV_xxx_123456789&amount=3500000",
  "qrCodeUrl": "https://test-payment.momo.vn/qr/...",
  "signature": "def456..."
}
```

### Callback Example

```json
{
  "partnerCode": "MOMOXXXX2020",
  "orderId": "INV_xxx_123456789",
  "requestId": "REQ_123456789",
  "amount": 3500000,
  "orderInfo": "Thanh toán hóa đơn phòng A101",
  "orderType": "momo_wallet",
  "transId": "1234567890",
  "resultCode": 0,
  "message": "Success",
  "payType": "webApp",
  "responseTime": 1609459200000,
  "extraData": "eyJpbnZvaWNlSWQiOiIxMjMifQ==",
  "signature": "ghi789..."
}
```

---

## ✅ Checklist Deployment

### Backend
- [ ] Cập nhật `.env` với production credentials
- [ ] Set `MOMO_ENV=production`
- [ ] Verify callback URLs accessible từ internet
- [ ] Test signature verification
- [ ] Enable logging
- [ ] Setup error monitoring

### Frontend
- [ ] Verify deep linking scheme
- [ ] Test MoMo app opening
- [ ] Test fallback to browser
- [ ] Test payment result screen
- [ ] Test error handling

---

## 📚 Tài Liệu Tham Khảo

- [MoMo Developer Documentation](https://developers.momo.vn)
- [MoMo API Reference](https://developers.momo.vn/docs/guides/payment-gateway)
- [React Native Linking](https://reactnative.dev/docs/linking)
- [Expo Deep Linking](https://docs.expo.dev/guides/linking/)

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready


