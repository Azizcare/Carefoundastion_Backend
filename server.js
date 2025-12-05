const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const campaignRoutes = require('./routes/campaigns');
const donationRoutes = require('./routes/donations');
const couponRoutes = require('./routes/coupons');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const smsRoutes = require('./routes/sms');
const partnerRoutes = require('./routes/partners');
const contactRoutes = require('./routes/contact');
const eventRoutes = require('./routes/events');
const volunteerCardRoutes = require('./routes/volunteerCards');
const walletRoutes = require('./routes/wallets');
const beneficiaryRoutes = require('./routes/beneficiaries');
const formSubmissionRoutes = require('./routes/formSubmissions');
const blogRoutes = require('./routes/blogs');
const celebrityRoutes = require('./routes/celebrities');
const transparencyRoutes = require('./routes/transparency');
const reportRoutes = require('./routes/reports');
const productRoutes = require('./routes/products');
const referralRoutes = require('./routes/referrals');

const app = express();

// Security middleware - configure helmet to allow static files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:5000", "http://localhost:3000"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Rate limiting (relaxed for development) - skip for OPTIONS requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // 10000 for dev, 100 for prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip rate limiting for preflight requests
  skipSuccessfulRequests: true, // Don't count successful requests
});
app.use(limiter);

// CORS configuration - allow both frontend and static file access
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files as static - with proper headers
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

// Database connection with timeout
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Connection details:', {
    uri: process.env.MONGODB_URI ? 'MONGODB_URI is set' : 'Using default localhost',
    errorName: err.name,
    errorMessage: err.message
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/volunteer-cards', volunteerCardRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/form-submissions', formSubmissionRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/celebrities', celebrityRoutes);
app.use('/api/transparency', transparencyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/referrals', referralRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Care Foundation API is running!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
