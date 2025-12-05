const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function changeUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation');
    console.log('📦 Connected to MongoDB');

    // Get email from command line argument
    const email = process.argv[2];
    const newRole = process.argv[3] || 'fundraiser';

    if (!email) {
      console.log('❌ Please provide user email');
      console.log('Usage: node changeUserRole.js <email> [role]');
      console.log('Example: node changeUserRole.js user@example.com fundraiser');
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`\n📋 Current User Details:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);

    // Update role
    user.role = newRole;
    await user.save();

    console.log(`\n✅ Successfully updated role to: ${newRole}`);
    console.log(`\n🎉 ${user.name} can now create campaigns!\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error changing user role:', error.message);
    process.exit(1);
  }
}

changeUserRole();










