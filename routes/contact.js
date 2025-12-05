const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createContactQuery,
  getAllQueries,
  getQuery,
  updateQueryStatus,
  respondToQuery,
  addNote,
  deleteQuery
} = require('../controllers/contactController');

const router = express.Router();

// @desc    Create new contact query (Public)
// @route   POST /api/contact
// @access  Public
router.post('/', createContactQuery);

// @desc    Get all contact queries (Admin)
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', protect, authorize('admin'), getAllQueries);

// @desc    Get single contact query (Admin)
// @route   GET /api/contact/:id
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), getQuery);

// @desc    Update query status (Admin)
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, authorize('admin'), updateQueryStatus);

// @desc    Respond to query (Admin)
// @route   POST /api/contact/:id/respond
// @access  Private/Admin
router.post('/:id/respond', protect, authorize('admin'), respondToQuery);

// @desc    Add note to query (Admin)
// @route   POST /api/contact/:id/notes
// @access  Private/Admin
router.post('/:id/notes', protect, authorize('admin'), addNote);

// @desc    Delete query (Admin)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), deleteQuery);

module.exports = router;











