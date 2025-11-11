# MoMo Payment Integration Guide

## Overview
Hệ thống TroPay đã tích hợp MoMo Payment Gateway để xử lý thanh toán hóa đơn trực tuyến.

## Backend Implementation

### 1. MoMo Service (`src/services/momoService.js`)
Service xử lý tất cả tương tác với MoMo API:

**Main Functions:**
- `createPayment(options)` - Tạo yêu cầu thanh toán MoMo
- `verifySignature(callbackData)` - Xác thực chữ ký từ MoMo callback
- `queryTransaction(options)` - Tra cứu trạng thái giao dịch
- `refund(options)` - Hoàn tiền giao dịch
- `getResultCodeDescription(resultCode)` - Mô tả lỗi bằng tiếng Việt

**Signature Generation:**
```javascript
const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
```

### 2. MoMo Controller (`src/controllers/momo.controller.js`)
Controller xử lý HTTP requests:

**Routes:**
- `POST /api/momo/create-payment` - Tạo thanh toán (Auth required)
- `GET /api/momo/return` - Xử lý user redirect sau thanh toán (Public)
- `POST /api/momo/notify` - Xử lý IPN notification từ MoMo (Public)
- `POST /api/momo/query` - Tra cứu trạng thái (Auth required)

**Payment Flow:**
1. User request payment → Controller validates invoice
2. Create payment record with `status: 'pending'`
3. Call `momoService.createPayment()` → Get `payUrl`
4. User pays on MoMo app/web
5. MoMo redirects to `/api/momo/return` (user sees result)
6. MoMo sends POST to `/api/momo/notify` (IPN - server-to-server)
7. Controller verifies signature → Update payment status
8. Update invoice status → Send notifications

### 3. Payment Model Updates (`src/models/Payment.js`)
**New Fields:**
```javascript
{
  payment_method: 'momo',  // Enum: cash, bank_transfer, momo, vnpay, etc.
  status: 'pending',       // Enum: pending, completed, failed, cancelled, refunded
  transaction_id: 'REQ_123456789',  // MoMo request ID
  meta: {
    momo_order_id: 'INV_xxx_timestamp',
    momo_request_id: 'REQ_timestamp',
    momo_trans_id: 'MoMo transaction ID',
    momo_pay_url: 'https://payment.momo.vn/...',
    momo_result_code: 0,
    momo_message: 'Success'
  }
}
```

### 4. Routes Registration (`server.js`)
```javascript
const momoRoutes = require('./src/routes/momo.routes');
app.use('/api/momo', momoRoutes);
```

## Frontend Implementation

### 1. MoMo Service (`src/services/api/momoService.ts`)
TypeScript service for frontend:

**Functions:**
- `createPayment(invoiceId, amount)` - Call backend to create payment
- `queryTransaction(orderId, requestId)` - Check payment status
- `getResultCodeDescription(resultCode)` - Get Vietnamese error message

**Usage Example:**
```typescript
import { momoService } from '@/services/api/momoService';

const handleMoMoPayment = async () => {
  const response = await momoService.createPayment(invoiceId, amount);
  
  if (response.success && response.data) {
    // Open payUrl in WebView or Browser
    Linking.openURL(response.data.payUrl);
  } else {
    Alert.alert('Lỗi', response.message);
  }
};
```

### 2. UI Integration (TODO)
Need to update invoice detail screen:
- Add payment method selection (MoMo/VNPay/Cash)
- Show MoMo payment button
- Open WebView for payment URL
- Handle payment result callback

## Environment Configuration

### Required Environment Variables (`.env`):
```bash
# MoMo Payment Gateway Configuration
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn
MOMO_RETURN_URL=http://localhost:5000/api/momo/return
MOMO_NOTIFY_URL=http://localhost:5000/api/momo/notify

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

### Get MoMo Credentials:
1. Register merchant account at: https://business.momo.vn
2. Complete KYC verification
3. Get test credentials from MoMo dashboard
4. For production, switch to: `https://payment.momo.vn`

## MoMo API Endpoints

### Sandbox (Testing):
- Endpoint: `https://test-payment.momo.vn/v2/gateway/api/create`
- Docs: https://developers.momo.vn

### Production:
- Endpoint: `https://payment.momo.vn/v2/gateway/api/create`

## Result Codes

| Code | Description (Vietnamese) |
|------|--------------------------|
| 0 | Giao dịch thành công |
| 9000 | Giao dịch đã được xác nhận thành công |
| 1000 | Giao dịch đã được khởi tạo, chờ người dùng xác nhận |
| 1001 | Giao dịch thất bại do sai thông tin |
| 1002 | Giao dịch thất bại do người dùng từ chối |
| 1003 | Giao dịch thất bại do quá thời gian |
| 1004 | Giao dịch thất bại do số dư không đủ |
| 1005 | Giao dịch thất bại do lỗi hệ thống |
| 1006 | Giao dịch thất bại do vượt quá hạn mức |
| 1007 | Giao dịch bị từ chối do tài khoản bị tạm khóa |
| 2001 | Giao dịch thất bại do sai thông tin hoặc chữ ký không hợp lệ |
| 4001 | Giao dịch thất bại do số tiền không hợp lệ |
| 4100 | Giao dịch thất bại do quá thời gian chờ |

## Testing Flow

### 1. Start Backend:
```bash
cd TroPay-BE/MMA_TroPay_BE/TroPay
npm start
```

### 2. Test Create Payment:
```bash
curl -X POST http://localhost:5000/api/momo/create-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice_id_here",
    "amount": 100000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tạo yêu cầu thanh toán MoMo thành công",
  "data": {
    "paymentId": "payment_id",
    "payUrl": "https://test-payment.momo.vn/...",
    "deeplink": "momo://...",
    "qrCodeUrl": "https://...",
    "orderId": "INV_xxx_123456789",
    "requestId": "REQ_123456789"
  }
}
```

### 3. Test Payment (Sandbox):
- Open `payUrl` in browser
- Use MoMo test credentials
- Complete payment
- Check return URL: `http://localhost:5000/api/momo/return?...`

### 4. Verify Payment Status:
```bash
curl -X POST http://localhost:5000/api/momo/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "INV_xxx_123456789",
    "requestId": "REQ_123456789"
  }'
```

## Notification Integration

When payment is successful, the system automatically sends notifications:
1. **Tenant**: Payment confirmed notification
2. **Owner**: Payment received notification

Handled by `notificationService.js`:
- `notifyPaymentConfirmed(payment, invoice, userId)`
- `notifyPaymentReceived(payment, invoice, ownerId)`

## Security Features

1. **HMAC SHA256 Signature**: All requests and callbacks are signed
2. **Signature Verification**: IPN callbacks are verified before processing
3. **JWT Authentication**: Create payment requires user authentication
4. **Invoice Ownership Check**: Users can only pay their own invoices
5. **Duplicate Payment Check**: Prevents paying already paid invoices

## Error Handling

All errors are logged using Winston logger:
```javascript
logger.error('MoMo create payment failed', {
  resultCode: momoResponse.resultCode,
  message: momoResponse.message
});
```

Error responses follow standard format:
```json
{
  "success": false,
  "message": "Mô tả lỗi bằng tiếng Việt",
  "error": "Technical error message"
}
```

## Next Steps

1. ✅ Backend MoMo service created
2. ✅ Backend controller and routes created
3. ✅ Payment model updated
4. ✅ Frontend MoMo service created
5. ⏳ Update invoice detail UI with MoMo payment button
6. ⏳ Configure MoMo credentials in `.env`
7. ⏳ Test payment flow in sandbox
8. ⏳ Deploy and test in production

## Support

For issues or questions:
- MoMo Developer Docs: https://developers.momo.vn
- MoMo Support: support@momo.vn
- TroPay Backend Logs: `logs/app.log`

---

**Last Updated**: 2024
**Status**: Backend Complete, Frontend Integration Pending
