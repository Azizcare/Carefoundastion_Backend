const express = require('express');
const router = express.Router();
const {
  getDonationTransparency,
  getPublicTransparencyPage,
  assignDonationToBeneficiary,
  sendUtilizationUpdate
} = require('../controllers/transparencyController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/donations', getDonationTransparency);
router.get('/public', getPublicTransparencyPage);

// Admin routes
router.use(protect, authorize('admin'));

router.post('/assign-donation', assignDonationToBeneficiary);
router.post('/send-update', sendUtilizationUpdate);

module.exports = router;

