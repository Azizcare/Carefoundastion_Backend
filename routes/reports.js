const express = require('express');
const router = express.Router();
const {
  downloadDonationsReport,
  downloadCouponsReport,
  downloadBeneficiariesReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin access
router.use(protect, authorize('admin'));

router.get('/donations', downloadDonationsReport);
router.get('/coupons', downloadCouponsReport);
router.get('/beneficiaries', downloadBeneficiariesReport);

module.exports = router;

