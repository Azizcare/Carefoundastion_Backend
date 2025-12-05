const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function approveAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation');
    console.log('📦 Connected to MongoDB');

    // Find all inactive users
    const inactiveUsers = await User.find({ isActive: false });

    if (inactiveUsers.length === 0) {
      console.log('\n✅ All users are already active!\n');
      process.exit(0);
    }

    console.log(`\n📋 Found ${inactiveUsers.length} user(s) pending approval:`);
    inactiveUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Approve all users
    await User.updateMany(
      { isActive: false },
      { $set: { isActive: true } }
    );

    console.log(`\n✅ Successfully approved ${inactiveUsers.length} user(s)!`);
    console.log(`\n🎉 All users can now login!\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error approving users:', error.message);
    console.error(error);
    process.exit(1);
  }
}

approveAllUsers();

