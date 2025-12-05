const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
  getCompletedEvents,
  registerForEvent,
  cancelRegistration
} = require('../controllers/eventController');

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/completed', getCompletedEvents);
router.get('/:id', getEvent);

// Protected routes - Event registration
router.post('/:id/register', protect, registerForEvent);
router.delete('/:id/register', protect, cancelRegistration);

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), createEvent);
router.put('/:id', protect, authorize('admin'), updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);

module.exports = router;

