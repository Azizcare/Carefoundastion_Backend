const express = require('express');
const router = express.Router();
const {
  createCelebrity,
  getCelebrities,
  getCelebrity,
  updateCelebrity,
  addCelebrityVideo,
  deleteCelebrity
} = require('../controllers/celebrityController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getCelebrities);
router.get('/:id', getCelebrity);

// Admin routes
router.use(protect, authorize('admin'));

router.route('/')
  .post(createCelebrity);

router.route('/:id')
  .put(updateCelebrity)
  .delete(deleteCelebrity);

router.post('/:id/videos', addCelebrityVideo);

module.exports = router;

