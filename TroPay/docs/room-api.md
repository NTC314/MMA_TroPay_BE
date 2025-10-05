# 📋 Room API Documentation

## Overview
API endpoints để quản lý thông tin phòng trong hệ thống cho thuê nhà trọ.

## Base URL
```
http://localhost:5000/api/rooms
```

## Authentication
Tất cả các endpoint yêu cầu authentication token trong header:
```
Authorization: Bearer <jwt_token>
```

---

## 🏠 Endpoints

### 1. Get Tenant's Room Information
**Lấy thông tin phòng của tenant hiện tại**

```http
GET /api/rooms/my-room
```

**Authorization**: Tenant only

**Response Success (200):**
```json
{
  "success": true,
  "message": "Thông tin phòng được lấy thành công",
  "data": {
    "room": {
      "id": "673f5f3d2e1a4b8c9d2f3e4f",
      "code": "P001",
      "title": "Phòng 001 - Quận 1",
      "address": "123 Đường Nguyễn Văn Cừ, Quận 1, HCM",
      "capacity": 2,
      "monthly_rent": 3000000,
      "deposit": 6000000,
      "meta": {
        "utilities": ["wifi", "parking"],
        "area": "25m2",
        "furniture": true
      }
    },
    "contract": {
      "id": "673f5f3d2e1a4b8c9d2f3e50",
      "start_date": "2024-01-01T00:00:00.000Z",
      "end_date": "2024-12-31T23:59:59.000Z",
      "rent_amount": 3000000,
      "deposit_amount": 6000000,
      "status": "active"
    },
    "owner": {
      "name": "Nguyễn Văn A",
      "phone": "0901234567",
      "email": "owner@example.com"
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Không tìm thấy phòng đang thuê"
}
```

---

### 2. Get Owner's Rooms List
**Lấy danh sách phòng của chủ trọ với phân trang và filter**

```http
GET /api/rooms/my-rooms?page=1&limit=10&status=vacant
```

**Authorization**: Owner only

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số items per page (default: 10, max: 100)
- `status` (optional): Filter theo trạng thái (`vacant`, `occupied`, `maintenance`)

**Response Success (200):**
```json
{
  "success": true,
  "message": "Danh sách phòng được lấy thành công",
  "data": {
    "rooms": [
      {
        "_id": "673f5f3d2e1a4b8c9d2f3e4f",
        "code": "P001",
        "title": "Phòng 001",
        "address": "123 Đường ABC",
        "capacity": 2,
        "status": "occupied",
        "monthly_rent": 3000000,
        "deposit": 6000000,
        "meta": {},
        "created_at": "2024-01-01T00:00:00.000Z",
        "currentTenant": {
          "name": "Trần Thị B",
          "phone": "0912345678",
          "contract_id": "673f5f3d2e1a4b8c9d2f3e50"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalDocs": 25,
      "limit": 10
    }
  }
}
```

---

### 3. Get Room Details by ID
**Lấy thông tin chi tiết phòng theo ID**

```http
GET /api/rooms/:id
```

**Authorization**: Owner/Admin only

**URL Parameters:**
- `id`: MongoDB ObjectId của phòng

**Response Success (200):**
```json
{
  "success": true,
  "message": "Thông tin chi tiết phòng được lấy thành công",
  "data": {
    "room": {
      "_id": "673f5f3d2e1a4b8c9d2f3e4f",
      "owner_id": {
        "_id": "673f5f3d2e1a4b8c9d2f3e4e",
        "full_name": "Nguyễn Văn A",
        "phone": "0901234567",
        "email": "owner@example.com"
      },
      "code": "P001",
      "title": "Phòng 001",
      "address": "123 Đường ABC",
      "capacity": 2,
      "status": "occupied",
      "monthly_rent": 3000000,
      "deposit": 6000000,
      "meta": {},
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "currentContract": {
      "_id": "673f5f3d2e1a4b8c9d2f3e50",
      "tenant_id": "673f5f3d2e1a4b8c9d2f3e51",
      "start_date": "2024-01-01T00:00:00.000Z",
      "end_date": "2024-12-31T23:59:59.000Z",
      "status": "active"
    },
    "currentTenant": {
      "_id": "673f5f3d2e1a4b8c9d2f3e51",
      "full_name": "Trần Thị B",
      "phone": "0912345678",
      "email": "tenant@example.com"
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Không tìm thấy phòng"
}
```

**Response Error (403):**
```json
{
  "success": false,
  "message": "Không có quyền truy cập phòng này"
}
```

---

## 🔒 Error Responses

### Authentication Error (401)
```json
{
  "success": false,
  "message": "No token, authorization denied"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "message": "Access denied. Tenant only."
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "msg": "id phải là ObjectId hợp lệ",
      "param": "id",
      "location": "params"
    }
  ]
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Lỗi khi lấy thông tin phòng"
}
```

---

## 📝 Usage Examples

### JavaScript/Axios
```javascript
// Lấy thông tin phòng của tenant
const getTenantRoom = async () => {
  try {
    const response = await axios.get('/api/rooms/my-room', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

### cURL
```bash
# Lấy thông tin phòng của tenant
curl -X GET \
  http://localhost:5000/api/rooms/my-room \
  -H 'Authorization: Bearer your_jwt_token'
```