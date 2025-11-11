# TroPay Database Sample Data

Thư mục này chứa dữ liệu mẫu cho database MongoDB của dự án TroPay.

## 📁 Cấu trúc dữ liệu

### 1. **users.json** (5 records)
Dữ liệu người dùng bao gồm:
- 1 Owner (Chủ trọ): `phone: 0901234567`, `password: owner123`
- 3 Tenants (Người thuê): 
  - Tenant 1: `phone: 0902234567`, `password: tenant123`
  - Tenant 2: `phone: 0903234567`, `password: tenant123`
  - Tenant 3: `phone: 0904234567`, `password: tenant123`
- 1 Admin: `phone: 0905234567`, `password: admin123`

**Lưu ý:** Passwords trong file là hashed, bạn cần hash lại với bcrypt khi import.

### 2. **service-types.json** (5 records)
Các loại dịch vụ:
- Tiền điện (electricity)
- Tiền nước (water)
- Tiền Internet (internet)
- Tiền gửi xe (parking)
- Phí vệ sinh (cleaning)

### 3. **rooms.json** (5 records)
5 phòng trọ của chủ trọ:
- P101: Phòng cao cấp có gác lửng (đang cho thuê)
- P102: Phòng có ban công (đang cho thuê)
- P201: Studio hiện đại (trống)
- P202: Phòng tiết kiệm (đang cho thuê)
- P301: Phòng gia đình (đang bảo trì)

### 4. **contracts.json** (3 records)
3 hợp đồng thuê phòng đang hoạt động:
- P101 - Tenant 1 (Trần Thị Thu)
- P102 - Tenant 2 (Lê Văn Nam)
- P202 - Tenant 3 (Phạm Thị Mai)

### 5. **invoices.json** (4 records)
Hóa đơn tháng 10/2025:
- Invoice 1: P101 - 4,250,000đ (chưa thanh toán)
- Invoice 2: P101 tháng 9 - 4,180,000đ (đã thanh toán)
- Invoice 3: P102 - 3,720,000đ (đã thanh toán)
- Invoice 4: P202 - 3,015,000đ (quá hạn)

### 6. **maintenance-requests.json** (5 records)
Các yêu cầu bảo trì:
- Điều hòa không làm lạnh (đang xử lý)
- Vòi nước nhỏ giọt (mới)
- Bóng đèn hỏng (đã xử lý)
- Khóa cửa bị kẹt (mới)
- Tường thấm nước (đã đóng)

### 7. **reviews.json** (4 records)
Đánh giá của người thuê về phòng trọ và chủ trọ.

### 8. **service-rates.json** (5 records)
Bảng giá dịch vụ của chủ trọ:
- Điện: 3,500đ/kWh
- Nước: 25,000đ/m³
- Internet: 100,000đ/tháng
- Gửi xe: 50,000đ/xe
- Vệ sinh: 15,000đ/tháng

### 9. **notifications.json** (5 records)
Thông báo cho người dùng về hóa đơn, thanh toán, bảo trì.

## 🚀 Cách Import Data

### Method 1: Sử dụng MongoDB Compass
1. Mở MongoDB Compass
2. Kết nối tới database
3. Chọn collection tương ứng
4. Click "ADD DATA" → "Import JSON or CSV file"
5. Chọn file JSON và import

### Method 2: Sử dụng mongoimport (Command Line)
```bash
# Import từng collection
mongoimport --db tropay --collection users --file users.json --jsonArray
mongoimport --db tropay --collection servicetypes --file service-types.json --jsonArray
mongoimport --db tropay --collection rooms --file rooms.json --jsonArray
mongoimport --db tropay --collection contracts --file contracts.json --jsonArray
mongoimport --db tropay --collection invoices --file invoices.json --jsonArray
mongoimport --db tropay --collection maintenancerequests --file maintenance-requests.json --jsonArray
mongoimport --db tropay --collection reviews --file reviews.json --jsonArray
mongoimport --db tropay --collection servicerates --file service-rates.json --jsonArray
mongoimport --db tropay --collection notifications --file notifications.json --jsonArray
```

### Method 3: Sử dụng Node.js Script
Tạo file `import-data.js`:

```javascript
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const User = require('./src/models/User');
const Room = require('./src/models/Room');
const Contract = require('./src/models/Contract');
const Invoice = require('./src/models/Invoice');
const ServiceType = require('./src/models/ServiceType');
const ServiceRate = require('./src/models/ServiceRate');
const MaintenanceRequest = require('./src/models/MaintenanceRequest');
const Review = require('./src/models/Review');
const Notification = require('./src/models/Notification');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tropay', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function importData() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await ServiceType.deleteMany({});
    await Room.deleteMany({});
    await Contract.deleteMany({});
    await Invoice.deleteMany({});
    await ServiceRate.deleteMany({});
    await MaintenanceRequest.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});
    
    console.log('✅ Đã xóa dữ liệu cũ');

    // Import new data
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/users.json'), 'utf-8'));
    await User.insertMany(users);
    console.log('✅ Imported users');

    const serviceTypes = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/service-types.json'), 'utf-8'));
    await ServiceType.insertMany(serviceTypes);
    console.log('✅ Imported service types');

    const rooms = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/rooms.json'), 'utf-8'));
    await Room.insertMany(rooms);
    console.log('✅ Imported rooms');

    const contracts = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/contracts.json'), 'utf-8'));
    await Contract.insertMany(contracts);
    console.log('✅ Imported contracts');

    const invoices = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/invoices.json'), 'utf-8'));
    await Invoice.insertMany(invoices);
    console.log('✅ Imported invoices');

    const serviceRates = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/service-rates.json'), 'utf-8'));
    await ServiceRate.insertMany(serviceRates);
    console.log('✅ Imported service rates');

    const maintenanceRequests = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/maintenance-requests.json'), 'utf-8'));
    await MaintenanceRequest.insertMany(maintenanceRequests);
    console.log('✅ Imported maintenance requests');

    const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/reviews.json'), 'utf-8'));
    await Review.insertMany(reviews);
    console.log('✅ Imported reviews');

    const notifications = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/notifications.json'), 'utf-8'));
    await Notification.insertMany(notifications);
    console.log('✅ Imported notifications');

    console.log('🎉 Import hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi import:', error);
    process.exit(1);
  }
}

importData();
```

Chạy script:
```bash
node import-data.js
```

## 🔐 Test Accounts

### Owner (Chủ trọ)
- Phone: `0901234567`
- Email: `owner1@tropay.com`
- Password: `owner123` (cần hash trước khi import)

### Tenant 1 (Người thuê)
- Phone: `0902234567`
- Email: `tenant1@tropay.com`
- Password: `tenant123`

### Tenant 2 (Người thuê)
- Phone: `0903234567`
- Email: `tenant2@tropay.com`
- Password: `tenant123`

### Admin
- Phone: `0905234567`
- Email: `admin@tropay.com`
- Password: `admin123`

## 📊 Dữ liệu thống kê

- **Tổng users:** 5
- **Tổng phòng:** 5 (2 trống, 3 đang thuê, 1 bảo trì)
- **Hợp đồng hoạt động:** 3
- **Hóa đơn tháng hiện tại:** 1 chưa thanh toán, 2 đã thanh toán, 1 quá hạn
- **Yêu cầu bảo trì:** 2 mở, 1 đang xử lý, 2 đã đóng

## ⚠️ Lưu ý

1. **Password Hashing:** Passwords trong file đang ở dạng placeholder. Trước khi import, cần hash với bcrypt:
```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('owner123', 10);
```

2. **ObjectId:** Các `_id` và reference IDs cần giữ nguyên để đảm bảo quan hệ giữa các collection.

3. **Dates:** Tất cả dates đã được format theo MongoDB date format `{ "$date": "ISO_STRING" }`.

4. **Collection Names:** Đảm bảo tên collections trong MongoDB trùng với tên models (thường là lowercase + plural).

## 🧪 Testing

Sau khi import, test các API endpoints:

### Owner APIs
- GET `/api/owner/dashboard` - Xem dashboard chủ trọ
- GET `/api/owner/rooms` - Danh sách phòng
- GET `/api/invoices` - Danh sách hóa đơn
- GET `/api/maintenance` - Yêu cầu bảo trì
- GET `/api/feedback/overview` - Tổng quan feedback

### Tenant APIs
- GET `/api/rooms/my-room` - Thông tin phòng thuê
- GET `/api/invoices/current` - Hóa đơn hiện tại
- POST `/api/payments/vnpay/create` - Tạo thanh toán
- POST `/api/maintenance` - Tạo yêu cầu bảo trì

## 📝 License

Dữ liệu mẫu này chỉ dùng cho mục đích testing và development.
