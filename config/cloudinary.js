const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'care-foundation',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage (for direct upload)
const memoryStorage = multer.memoryStorage();

// Cloudinary storage for multer
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder based on file type
    let folder = 'care-foundation/misc';
    
    if (file.fieldname === 'campaignImage') {
      folder = 'care-foundation/campaigns';
    } else if (file.fieldname === 'profileImage') {
      folder = 'care-foundation/profiles';
    } else if (file.fieldname === 'kycDocument') {
      folder = 'care-foundation/kyc';
    } else if (file.fieldname === 'partnerImage') {
      folder = 'care-foundation/partners';
    } else if (file.fieldname === 'couponImage') {
      folder = 'care-foundation/coupons';
    }

    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }
      ]
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  // Allowed document types
  const allowedDocTypes = ['application/pdf'];

  const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.'), false);
  }
};

// Upload middleware configurations
const uploadConfig = {
  // Single file upload
  single: (fieldName) => {
    return multer({
      storage: cloudinaryStorage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      }
    }).single(fieldName);
  },

  // Multiple files upload
  multiple: (fieldName, maxCount = 5) => {
    return multer({
      storage: cloudinaryStorage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
      }
    }).array(fieldName, maxCount);
  },

  // Multiple fields upload
  fields: (fields) => {
    return multer({
      storage: cloudinaryStorage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
      }
    }).fields(fields);
  },

  // Memory storage (for base64 conversion or direct processing)
  memory: multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  })
};

// Helper function to upload buffer to Cloudinary
const uploadBuffer = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'care-foundation/misc',
        resource_type: options.resource_type || 'auto',
        transformation: options.transformation || []
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

// Helper function to delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Helper function to upload base64 image
const uploadBase64 = async (base64String, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: options.folder || 'care-foundation/misc',
      transformation: options.transformation || []
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Get optimized image URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    height: options.height || 600,
    crop: options.crop || 'fill',
    quality: options.quality || 'auto',
    fetch_format: 'auto'
  });
};

module.exports = {
  cloudinary,
  uploadConfig,
  uploadBuffer,
  deleteFile,
  uploadBase64,
  getOptimizedUrl
};











