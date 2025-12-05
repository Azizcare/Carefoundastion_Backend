require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carefoundation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@carefoundation.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`
Admin Details:
  Email: ${existingAdmin.email}
  Password: admin123 (default)
  Name: ${existingAdmin.name}
  Role: ${existingAdmin.role}
      `);
      
      // Make sure role is admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✓ Updated existing user to admin role');
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@carefoundation.com',
        password: 'admin123',
        phone: '9999999999',
        role: 'admin',
        isVerified: true,
        isActive: true
      });

      await adminUser.save();
      console.log('✓ Admin user created successfully!');
      console.log(`
Admin Login Credentials:
  Email: admin@carefoundation.com
  Password: admin123
  
⚠️  IMPORTANT: Change the password after first login!
      `);
    }

    console.log(`
🎯 Next Steps:
1. Go to: http://localhost:3000/login
2. Login with: admin@carefoundation.com / admin123
3. You will be redirected to: http://localhost:3000/admin
4. Admin panel with sidebar will be visible!
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();







