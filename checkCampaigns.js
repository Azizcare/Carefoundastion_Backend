const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Campaign = require('./models/Campaign');

async function checkCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation');
    console.log('✅ Connected to MongoDB\n');

    const campaigns = await Campaign.find()
      .sort('-createdAt')
      .limit(10)
      .populate('fundraiser', 'name email role')
      .lean();

    console.log(`📊 Total Campaigns: ${campaigns.length}\n`);

    if (campaigns.length === 0) {
      console.log('❌ No campaigns found in database!');
    } else {
      campaigns.forEach((c, i) => {
        console.log(`${i + 1}. ${c.title}`);
        console.log(`   Status: ${c.status}`);
        console.log(`   Active: ${c.isActive}`);
        console.log(`   Created by: ${c.fundraiser?.name} (${c.fundraiser?.role})`);
        console.log(`   Goal: ₹${c.goalAmount}`);
        console.log(`   Images: ${c.images?.length || 0}`);
        console.log('');
      });

      // Check how many are active
      const activeCount = campaigns.filter(c => c.status === 'active' && c.isActive).length;
      console.log(`\n✅ Active campaigns (visible on home): ${activeCount}`);
      console.log(`⏳ Pending/Draft campaigns: ${campaigns.length - activeCount}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCampaigns();

