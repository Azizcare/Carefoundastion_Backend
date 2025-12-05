const express = require('express');
const router = express.Router();
const {
  createBeneficiary,
  getBeneficiaries,
  getBeneficiary,
  updateBeneficiary,
  assignDonationToBeneficiary,
  getBeneficiaryDonations,
  verifyBeneficiary
} = require('../controllers/beneficiaryController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin access
router.use(protect, authorize('admin'));

router.route('/')
  .get(getBeneficiaries)
  .post(createBeneficiary);

router.route('/:id')
  .get(getBeneficiary)
  .put(updateBeneficiary);

router.put('/:id/verify', verifyBeneficiary);
router.post('/:id/assign-donation', assignDonationToBeneficiary);
router.get('/:id/donations', getBeneficiaryDonations);

module.exports = router;

