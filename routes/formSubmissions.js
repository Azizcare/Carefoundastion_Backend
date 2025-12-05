const express = require('express');
const router = express.Router();
const {
  submitForm,
  getFormSubmissions,
  getFormSubmission,
  approveForm,
  rejectForm,
  editForm
} = require('../controllers/formSubmissionController');
const { protect, authorize } = require('../middleware/auth');

// Public route
router.post('/', submitForm);

// Admin routes
router.use(protect, authorize('admin'));

router.route('/')
  .get(getFormSubmissions);

router.route('/:id')
  .get(getFormSubmission)
  .put(editForm);

router.put('/:id/approve', approveForm);
router.put('/:id/reject', rejectForm);

module.exports = router;

