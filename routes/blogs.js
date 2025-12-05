const express = require('express');
const router = express.Router();
const {
  createBlog,
  getBlogs,
  getBlog,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  incrementViews
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.get('/:id', getBlog);
router.put('/:id/views', incrementViews);

// Admin routes
router.use(protect, authorize('admin'));

router.route('/')
  .post(createBlog);

router.route('/:id')
  .put(updateBlog)
  .delete(deleteBlog);

module.exports = router;

