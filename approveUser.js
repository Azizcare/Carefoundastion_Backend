const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function approveUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation');
    console.log('📦 Connected to MongoDB');

    // Get email from command line argument
    const email = process.argv[2];

    if (!email) {
      console.log('\n❌ Please provide user email');
      console.log('Usage: node approveUser.js <email>');
      console.log('Example: node approveUser.js user@example.com\n');
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`\n❌ User with email "${email}" not found\n`);
      process.exit(1);
    }

    console.log(`\n📋 Current User Details:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current Status: ${user.isActive ? '✅ Active' : '❌ Pending Approval'}`);

    if (user.isActive) {
      console.log(`\n✅ User is already active! No changes needed.\n`);
      process.exit(0);
    }

    // Approve user
    user.isActive = true;
    await user.save();

    console.log(`\n✅ Successfully approved user!`);
    console.log(`\n🎉 ${user.name} can now login!\n`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ✅ Active\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error approving user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

approveUser();

