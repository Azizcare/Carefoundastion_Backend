const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validatePagination, validateObjectId } = require('../middleware/validation');
const {
  getDashboardStats,
  getAdminCampaigns,
  approveCampaign,
  rejectCampaign,
  completeCampaign,
  getUsers,
  getUserById,
  updateUserStatus,
  assignRole,
  assignPermissions,
  getUserPermissions,
  getBeneficiaries,
  getFormSubmissions,
  getPartners,
  approvePartner,
  rejectPartner,
  updatePartner,
  getDonations,
  getCoupons,
  getFinancialReports,
  getAnalytics
} = require('../controllers/adminController');

const { createCoupon } = require('../controllers/couponController');
const { validateCouponCreation } = require('../middleware/validation');

const router = express.Router();

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', getDashboardStats);

// Campaign management
// @desc    Get all campaigns for admin review
// @route   GET /api/admin/campaigns
// @access  Private/Admin
router.get('/campaigns', validatePagination, getAdminCampaigns);

// @desc    Approve campaign
// @route   PUT /api/admin/campaigns/:id/approve
// @access  Private/Admin
router.put('/campaigns/:id/approve', validateObjectId(), approveCampaign);

// @desc    Reject campaign
// @route   PUT /api/admin/campaigns/:id/reject
// @access  Private/Admin
router.put('/campaigns/:id/reject', validateObjectId(), rejectCampaign);

// @desc    Mark campaign as completed
// @route   PUT /api/admin/campaigns/:id/complete
// @access  Private/Admin
router.put('/campaigns/:id/complete', validateObjectId(), completeCampaign);

// User management
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', validatePagination, getUsers);

// Specific routes must come before generic :id route
// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
router.put('/users/:id/status', validateObjectId(), updateUserStatus);

// @desc    Assign role to user
// @route   PUT /api/admin/users/:id/assign-role
// @access  Private/Admin
router.put('/users/:id/assign-role', validateObjectId(), assignRole);

// @desc    Assign permissions to user
// @route   PUT /api/admin/users/:id/assign-permissions
// @access  Private/Admin
router.put('/users/:id/assign-permissions', validateObjectId(), assignPermissions);

// @desc    Get user permissions
// @route   GET /api/admin/users/:id/permissions
// @access  Private/Admin
router.get('/users/:id/permissions', validateObjectId(), getUserPermissions);

// @desc    Get single user by ID (must be last)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', validateObjectId(), getUserById);

// Partner management
// @desc    Get all partners
// @route   GET /api/admin/partners
// @access  Private/Admin
router.get('/partners', validatePagination, getPartners);

// @desc    Approve partner
// @route   PUT /api/admin/partners/:id/approve
// @access  Private/Admin
router.put('/partners/:id/approve', validateObjectId(), approvePartner);

// @desc    Reject partner
// @route   PUT /api/admin/partners/:id/reject
// @access  Private/Admin
router.put('/partners/:id/reject', validateObjectId(), rejectPartner);

// @desc    Update partner (generic)
// @route   PUT /api/admin/partners/:id
// @access  Private/Admin
router.put('/partners/:id', validateObjectId(), updatePartner);

// Donation management
// @desc    Get all donations
// @route   GET /api/admin/donations
// @access  Private/Admin
router.get('/donations', validatePagination, getDonations);

// Coupon management
// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
router.get('/coupons', validatePagination, getCoupons);

// @desc    Get all beneficiaries
// @route   GET /api/admin/beneficiaries
// @access  Private/Admin
router.get('/beneficiaries', getBeneficiaries);

// @desc    Get all form submissions
// @route   GET /api/admin/form-submissions
// @access  Private/Admin
router.get('/form-submissions', getFormSubmissions);

// @desc    Create new coupon (Admin)
// @route   POST /api/admin/coupons
// @access  Private/Admin
router.post('/coupons', validateCouponCreation, createCoupon);

// Reports and analytics
// @desc    Get financial reports
// @route   GET /api/admin/reports/financial
// @access  Private/Admin
router.get('/reports/financial', getFinancialReports);

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
router.get('/analytics', getAnalytics);

module.exports = router;



