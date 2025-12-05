const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation';
    console.log('🔗 Connecting to MongoDB...');
    console.log('📋 Database URL:', mongoUri.replace(/\/\/.*@/, '//***@')); // Hide password
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB successfully\n');

    // Get email from command line argument
    const email = process.argv[2] || 'admin@gmail.com';

    console.log(`🔍 Searching for user: ${email}\n`);

    // Find user by email (including password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log(`❌ User with email "${email}" not found in database!\n`);
      console.log('📋 Available users in database:');
      const allUsers = await User.find({}).select('name email role isActive');
      if (allUsers.length === 0) {
        console.log('   No users found in database');
      } else {
        allUsers.forEach((u, index) => {
          console.log(`   ${index + 1}. ${u.name} (${u.email}) - Role: ${u.role} - Active: ${u.isActive ? '✅' : '❌'}`);
        });
      }
      process.exit(1);
    }

    console.log('✅ User Found!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   isActive: ${user.isActive ? '✅ YES' : '❌ NO (This is why login is failing!)'}`);
    console.log(`   isVerified: ${user.isVerified ? '✅ YES' : '❌ NO'}`);
    console.log(`   Created At: ${user.createdAt}`);
    console.log(`   Password Hash: ${user.password ? '✅ Set' : '❌ Missing'}`);

    console.log('\n🔍 Login Status Analysis:');
    
    if (!user.isActive) {
      console.log('   ❌ LOGIN WILL FAIL - User is not active!');
      console.log('   💡 Solution: Run "node approveUser.js admin@gmail.com"');
    } else {
      console.log('   ✅ User is active - login should work');
    }

    if (user.role !== 'admin') {
      console.log('   ⚠️  User role is not "admin"');
      console.log('   💡 Solution: Run "node makeAdmin.js admin@gmail.com"');
    } else {
      console.log('   ✅ User has admin role');
    }

    if (!user.password) {
      console.log('   ❌ Password is missing!');
    } else {
      console.log('   ✅ Password is set');
    }

    console.log('\n📝 Summary:');
    const issues = [];
    if (!user.isActive) issues.push('User is not active (isActive: false)');
    if (user.role !== 'admin') issues.push('User role is not admin');
    if (!user.password) issues.push('Password is missing');

    if (issues.length === 0) {
      console.log('   ✅ All checks passed! Login should work.');
      console.log('\n💡 Try logging in with:');
      console.log(`   Email: ${user.email}`);
      console.log('   Password: (the password you set during registration)');
    } else {
      console.log('   ❌ Issues found:');
      issues.forEach((issue, index) => {
        console.log(`      ${index + 1}. ${issue}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Error Details:');
    if (error.name === 'MongooseError' || error.message.includes('connection')) {
      console.error('   Database connection issue!');
      console.error('   Check:');
      console.error('   1. MongoDB URL in .env file');
      console.error('   2. Database name is correct');
      console.error('   3. Network access in MongoDB Atlas');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

checkUser();

