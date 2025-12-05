const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createPartner,
  getPartners,
  getPartner,
  updatePartner,
  deletePartner,
  addReview
} = require('../controllers/partnerController');

const router = express.Router();

// Add logging middleware for partners route
const logPartnersRequest = (req, res, next) => {
  if (req.method === 'GET') {
    console.log('=== GET PARTNERS ROUTE HIT ===');
    console.log('Query params:', req.query);
  }
  next();
};

// @desc    Create new partner (public registration)
// @route   POST /api/partners
// @access  Public
router.post('/', createPartner);

// @desc    Get all partners (with filters)
// @route   GET /api/partners
// @access  Public
router.get('/', logPartnersRequest, getPartners);

// @desc    Get single partner
// @route   GET /api/partners/:id
// @access  Public
router.get('/:id', getPartner);

// @desc    Update partner
// @route   PUT /api/partners/:id
// @access  Private/Admin (handled in admin routes)
router.put('/:id', protect, updatePartner);

// @desc    Delete partner
// @route   DELETE /api/partners/:id
// @access  Private/Admin (handled in admin routes)
router.delete('/:id', protect, deletePartner);

// @desc    Add review to partner
// @route   POST /api/partners/:id/review
// @access  Private
router.post('/:id/review', protect, addReview);

module.exports = router;











