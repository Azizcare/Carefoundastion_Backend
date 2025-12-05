const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload, uploadImage, uploadVideo, uploadSingle, uploadMultiple, deleteFile } = require('../controllers/uploadController');

const router = express.Router();

// @desc    Upload single image or video (public for volunteer registration)
// @route   POST /api/upload/single
// @access  Public (optional auth)
// Supports both image and video uploads - accepts both 'image' and 'video' field names
router.post('/single', optionalAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), uploadSingle);

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private
router.post('/multiple', protect, upload.array('images', 10), uploadMultiple);

// @desc    Delete file
// @route   DELETE /api/upload/:filename
// @access  Private
router.delete('/:filename', protect, deleteFile);

module.exports = router;
