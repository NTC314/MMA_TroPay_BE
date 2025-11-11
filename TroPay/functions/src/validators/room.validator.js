const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (field) => {
  return param(field)
    .isMongoId()
    .withMessage(`${field} phải là ObjectId hợp lệ`);
};

// Validate room query parameters
const validateRoomQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit phải là số từ 1 đến 100'),
  query('status')
    .optional()
    .isIn(['vacant', 'occupied', 'maintenance'])
    .withMessage('Status phải là vacant, occupied hoặc maintenance'),
  handleValidationErrors
];

// Validate room creation
const validateCreateRoom = [
  body('code')
    .notEmpty()
    .withMessage('Mã phòng không được để trống')
    .isLength({ min: 2, max: 20 })
    .withMessage('Mã phòng phải từ 2-20 ký tự')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Mã phòng chỉ chứa chữ hoa và số'),
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ min: 5, max: 100 })
    .withMessage('Tiêu đề phải từ 5-100 ký tự'),
  body('address')
    .notEmpty()
    .withMessage('Địa chỉ không được để trống')
    .isLength({ min: 10, max: 200 })
    .withMessage('Địa chỉ phải từ 10-200 ký tự'),
  body('capacity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Sức chứa phải là số từ 1-20'),
  body('monthly_rent')
    .isFloat({ min: 0 })
    .withMessage('Giá thuê hàng tháng phải là số dương'),
  body('deposit')
    .isFloat({ min: 0 })
    .withMessage('Tiền cọc phải là số dương'),
  body('meta')
    .optional()
    .isObject()
    .withMessage('Meta phải là object'),
  handleValidationErrors
];

// Validate room update
const validateUpdateRoom = [
  validateObjectId('id'),
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('Tiêu đề phải từ 5-100 ký tự'),
  body('address')
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage('Địa chỉ phải từ 10-200 ký tự'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Sức chứa phải là số từ 1-20'),
  body('monthly_rent')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá thuê hàng tháng phải là số dương'),
  body('deposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tiền cọc phải là số dương'),
  body('status')
    .optional()
    .isIn(['vacant', 'occupied', 'maintenance'])
    .withMessage('Trạng thái phải là vacant, occupied hoặc maintenance'),
  body('meta')
    .optional()
    .isObject()
    .withMessage('Meta phải là object'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateObjectId,
  validateRoomQuery,
  validateCreateRoom,
  validateUpdateRoom
};