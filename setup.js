const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Create default admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@carefoundation.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@carefoundation.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      phone: '9999999999',
      role: 'admin',
      isVerified: true,
      isActive: true
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Password:', process.env.ADMIN_PASSWORD || 'admin123');
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// Main setup function
const setup = async () => {
  console.log('🚀 Setting up Care Foundation Backend...\n');
  
  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Setup failed: Could not connect to database');
    process.exit(1);
  }
  
  // Create admin user
  await createAdminUser();
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Update your .env file with proper configuration');
  console.log('2. Start the server with: npm run dev');
  console.log('3. Test the API at: http://localhost:5000/api/health');
  console.log('4. Admin login: admin@carefoundation.com / admin123');
  
  process.exit(0);
};

// Run setup
setup();






