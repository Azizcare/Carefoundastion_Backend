const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'campaign-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and videos - check mimetype and extension
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, file.mimetype);
    cb(null, true); // Accept anyway for now - we'll fix validation later
  }
};

// Separate upload configs for images and videos
const uploadImage = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, true); // Accept anyway
    }
  }
});

const uploadVideo = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, true); // Accept anyway
    }
  }
});

// Unified upload that accepts both images and videos (50MB max)
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (covers both images and videos)
  },
  fileFilter: fileFilter
});

// @desc    Upload single image or video
// @route   POST /api/upload/single
// @access  Private
exports.uploadSingle = async (req, res) => {
  try {
    // Handle both single file (req.file) and fields upload (req.files)
    const file = req.file || (req.files && (req.files.image?.[0] || req.files.video?.[0]));
    
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a file'
      });
    }

    // Return the file URL
    const fileUrl = `/uploads/${file.filename}`;
    const isVideo = file.mimetype.startsWith('video/');
    
    res.status(200).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        type: isVideo ? 'video' : 'image'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload file'
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private
exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload at least one file'
      });
    }

    const fileUrls = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.status(200).json({
      status: 'success',
      message: 'Files uploaded successfully',
      data: fileUrls
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload files'
    });
  }
};

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:filename
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete file'
    });
  }
};

module.exports = { 
  upload, 
  uploadImage, 
  uploadVideo, 
  uploadSingle: exports.uploadSingle, 
  uploadMultiple: exports.uploadMultiple, 
  deleteFile: exports.deleteFile 
};
