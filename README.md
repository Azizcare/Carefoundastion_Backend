# Care Foundation Backend API

A comprehensive crowdfunding platform backend built with Node.js, Express.js, and MongoDB, replicating approximately 60-70% of Ketto's features with advanced coupon system.

## 🚀 Features

### Core Features
- **User Management**: Registration, authentication, profile management
- **Campaign Management**: Create, edit, manage fundraising campaigns
- **Donation System**: Secure payment processing with multiple gateways
- **Admin Panel**: Campaign approval, user management, analytics
- **Advanced Coupon System**: Food, Medical, and other category coupons

### Payment Integration
- Razorpay
- Stripe
- UPI
- Net Banking
- Cards & Wallets

### Security Features
- JWT Authentication
- Password encryption with bcrypt
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Care-Foundation-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/care-foundation
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Payment Gateways
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Cloudinary (for image uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   
   # Admin Configuration
   ADMIN_EMAIL=admin@carefoundation.com
   ADMIN_PASSWORD=admin123
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user
- `PUT /auth/updatedetails` - Update user details
- `PUT /auth/updatepassword` - Update password
- `POST /auth/forgotpassword` - Forgot password
- `PUT /auth/resetpassword/:token` - Reset password
- `GET /auth/verifyemail/:token` - Verify email

### Campaign Endpoints
- `GET /campaigns` - Get all campaigns (Public)
- `GET /campaigns/:id` - Get single campaign (Public)
- `POST /campaigns` - Create campaign (Private)
- `PUT /campaigns/:id` - Update campaign (Private)
- `DELETE /campaigns/:id` - Delete campaign (Private)
- `GET /campaigns/:id/donations` - Get campaign donations
- `POST /campaigns/:id/updates` - Add campaign update
- `GET /campaigns/:id/analytics` - Get campaign analytics

### Donation Endpoints
- `GET /donations` - Get all donations (Public)
- `GET /donations/:id` - Get single donation (Private)
- `POST /donations` - Create donation (Private)
- `GET /donations/:id/receipt` - Get donation receipt
- `POST /donations/:id/refund` - Request refund
- `GET /donations/stats/overview` - Get donation statistics

### Coupon Endpoints
- `GET /coupons` - Get all coupons (Public)
- `GET /coupons/:id` - Get single coupon (Public)
- `POST /coupons` - Create coupon (Private)
- `PUT /coupons/:id` - Update coupon (Private)
- `DELETE /coupons/:id` - Delete coupon (Private)
- `POST /coupons/:id/redeem` - Redeem coupon (Private)
- `GET /coupons/code/:code` - Get coupon by code
- `GET /coupons/my-coupons` - Get user's coupons
- `GET /coupons/:id/analytics` - Get coupon analytics

### Payment Endpoints
- `POST /payments/razorpay/create-order` - Create Razorpay order
- `POST /payments/razorpay/verify` - Verify Razorpay payment
- `POST /payments/stripe/create-intent` - Create Stripe payment intent
- `POST /payments/stripe/confirm` - Confirm Stripe payment
- `POST /payments/upi/process` - Process UPI payment
- `GET /payments/methods` - Get payment methods
- `GET /payments/status/:transactionId` - Get payment status

### Admin Endpoints
- `GET /admin/dashboard` - Admin dashboard stats
- `GET /admin/campaigns` - Get all campaigns for review
- `PUT /admin/campaigns/:id/approve` - Approve campaign
- `PUT /admin/campaigns/:id/reject` - Reject campaign
- `GET /admin/users` - Get all users
- `GET /admin/partners` - Get all partners
- `PUT /admin/partners/:id/approve` - Approve partner
- `GET /admin/donations` - Get all donations
- `GET /admin/coupons` - Get all coupons
- `GET /admin/reports/financial` - Get financial reports
- `GET /admin/analytics` - Get analytics

## 🗄️ Database Models

### User Model
- Personal information (name, email, phone)
- Role-based access (donor, fundraiser, admin, partner)
- KYC verification
- Preferences and settings

### Campaign Model
- Campaign details (title, description, goal)
- Beneficiary information
- Timeline and milestones
- Analytics and social sharing
- Verification status

### Donation Model
- Donor and campaign references
- Payment details and status
- Receipt generation
- Tax benefit eligibility
- Refund management

### Coupon Model
- Coupon details and categories
- Validity and usage limits
- Redemption tracking
- Fraud prevention
- Analytics

### Partner Model
- Business information
- Service offerings
- Verification status
- Rating and reviews
- Commission structure

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Security headers with Helmet
- Email verification
- Password reset functionality

## 📊 Analytics & Reporting

- Campaign performance metrics
- Donation statistics
- User engagement analytics
- Financial reports
- Coupon redemption tracking
- Partner performance metrics

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection strings
- JWT secrets
- Payment gateway credentials
- Email service configuration
- Cloudinary credentials

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact:
- Email: support@carefoundation.com
- Documentation: [API Docs](link-to-docs)

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- Basic authentication and user management
- Campaign creation and management
- Donation processing
- Admin panel
- Coupon system foundation

---

**Note**: This is a development version. Some features are marked as "To be implemented" and will be completed in subsequent releases.






