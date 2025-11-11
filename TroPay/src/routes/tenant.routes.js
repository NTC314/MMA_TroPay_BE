const express = require('express');
const router = express.Router();

// Import controllers
const {
  getTenantInvoices,
  getTenantInvoiceById,
  getTenantServiceUsage,
  getTenantServiceHistory,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  getTenantDashboard,
  exportInvoicePDF
} = require('../controllers/tenant.controller');

// Import middleware
const { auth, tenantOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @desc    Routes for Tenant Management
 * @prefix  /api/tenant
 */

// Dashboard
router.get('/dashboard', auth, tenantOnly, getTenantDashboard);

// Invoice Management
router.get('/invoices', auth, tenantOnly, getTenantInvoices);
router.get('/invoices/:id', auth, tenantOnly, getTenantInvoiceById);
router.get('/invoices/:id/pdf', auth, tenantOnly, exportInvoicePDF);

// Service Tracking
router.get('/services/usage', auth, tenantOnly, getTenantServiceUsage);
router.get('/services/history', auth, tenantOnly, getTenantServiceHistory);

// Maintenance Requests
router.get('/maintenance-requests', auth, tenantOnly, getTenantMaintenanceRequests);
router.post('/maintenance-requests', auth, tenantOnly, upload.array('images', 5), createMaintenanceRequest);
router.get('/maintenance-requests/:id', auth, tenantOnly, getMaintenanceRequestById);
router.put('/maintenance-requests/:id', auth, tenantOnly, updateMaintenanceRequest);

module.exports = router;


