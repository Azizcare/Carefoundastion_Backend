require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const makeUserAdmin = async (email) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carefoundation', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User with email '${email}' not found!`);
      process.exit(1);
    }

    // Update user role to admin
    user.role = 'admin';
    await user.save();

    console.log(`✅ Successfully made '${user.name}' (${user.email}) an admin!`);
    console.log(`User details:
    - Name: ${user.name}
    - Email: ${user.email}
    - Role: ${user.role}
    - Created: ${user.createdAt}
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address!');
  console.log('Usage: node makeAdmin.js <email>');
  console.log('Example: node makeAdmin.js user@example.com');
  process.exit(1);
}

makeUserAdmin(email);







