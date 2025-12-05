require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const createOrUpdateAdmin = async (email, password) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carefoundation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB');

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      console.log(`\n⚠️  User already exists: ${email}`);
      console.log(`Current details:`);
      console.log(`  - Name: ${existingUser.name}`);
      console.log(`  - Role: ${existingUser.role}`);
      console.log(`  - isActive: ${existingUser.isActive}`);
      console.log(`  - isVerified: ${existingUser.isVerified}`);

      // Update to admin
      existingUser.role = 'admin';
      existingUser.isActive = true;
      existingUser.isVerified = true;
      
      // Update password if provided
      if (password) {
        existingUser.password = password;
        console.log(`\n✓ Password will be updated`);
      }
      
      await existingUser.save();
      
      console.log(`\n✅ User updated to admin successfully!`);
      console.log(`\n📋 Updated Details:`);
      console.log(`  - Email: ${existingUser.email}`);
      console.log(`  - Role: ${existingUser.role}`);
      console.log(`  - isActive: ${existingUser.isActive}`);
      console.log(`  - isVerified: ${existingUser.isVerified}`);
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: email.toLowerCase(),
        password: password || 'admin123',
        phone: '9999999999',
        role: 'admin',
        isVerified: true,
        isActive: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log(`\n📋 Admin Login Credentials:`);
      console.log(`  - Email: ${adminUser.email}`);
      console.log(`  - Password: ${password || 'admin123'}`);
    }

    console.log(`\n🎯 Next Steps:`);
    console.log(`1. Go to: http://localhost:3000/login`);
    console.log(`2. Login with: ${email} / ${password || 'admin123'}`);
    console.log(`3. You will be redirected to admin panel!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   Email already exists in database');
    }
    process.exit(1);
  }
};

// Get email and password from command line arguments
const email = process.argv[2] || 'admin@gmail.com';
const password = process.argv[3] || 'Bhushan@123';

console.log(`\n🚀 Creating/Updating Admin User...\n`);
console.log(`Email: ${email}`);
console.log(`Password: ${password ? '***' : 'admin123 (default)'}\n`);

createOrUpdateAdmin(email, password);

