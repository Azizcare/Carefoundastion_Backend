const mongoose = require('mongoose');
const Campaign = require('./models/Campaign');
const User = require('./models/User');
require('dotenv').config();

// Sample campaigns data
const sampleCampaigns = [
  {
    title: "Help Little Aarav Fight Leukemia",
    shortDescription: "8-year-old Aarav needs urgent medical treatment for blood cancer. Your support can save his life.",
    description: "Aarav is a bright 8-year-old boy who loves playing cricket and drawing. Last month, he was diagnosed with Acute Lymphoblastic Leukemia. His family has exhausted all their savings on initial treatments. They need ₹7,50,000 for chemotherapy and bone marrow transplant. Every contribution brings Aarav one step closer to recovery.",
    category: "medical",
    goalAmount: 750000,
    currentAmount: 320000,
    images: [
      { url: "/images/c1.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Aarav Sharma",
      relationship: "Son",
      age: 8,
      gender: "male"
    },
    location: {
      city: "Mumbai",
      state: "Maharashtra",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      duration: 60
    },
    status: "active",
    isActive: true,
    isFeatured: true,
    isUrgent: true,
    tags: ["medical", "cancer", "child", "urgent"],
    analytics: {
      views: 1250,
      shares: 85,
      donations: 45
    }
  },
  {
    title: "Help Premature Baby Boy Survive",
    shortDescription: "Anshuja's premature baby needs NICU care. Support this family in their fight for survival.",
    description: "Anshuja gave birth to a premature baby boy at 28 weeks. The baby weighs only 1.2 kg and needs intensive NICU care for at least 2 months. The family cannot afford the mounting hospital bills. Your donation can help this little warrior survive.",
    category: "medical",
    goalAmount: 750000,
    currentAmount: 450000,
    images: [
      { url: "/images/c2.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Baby of Anshuja",
      relationship: "Son",
      age: 0,
      gender: "male"
    },
    location: {
      city: "Mumbai",
      state: "Maharashtra",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 47 * 24 * 60 * 60 * 1000),
      duration: 47
    },
    status: "active",
    isActive: true,
    isFeatured: true,
    tags: ["medical", "nicu", "premature", "baby"],
    analytics: {
      views: 980,
      shares: 62,
      donations: 38
    }
  },
  {
    title: "Help 5-Year-Old Vihan Hear Again",
    shortDescription: "Vihan was born deaf. Cochlear implant surgery can give him the gift of hearing.",
    description: "Vihan is a cheerful 5-year-old who communicates through sign language. His parents work as daily wage laborers and cannot afford the ₹7,50,000 needed for cochlear implant surgery. With your help, Vihan can experience the joy of hearing his mother's voice for the first time.",
    category: "medical",
    goalAmount: 750000,
    currentAmount: 280000,
    images: [
      { url: "/images/c3.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Vihan Kumar",
      relationship: "Son",
      age: 5,
      gender: "male"
    },
    location: {
      city: "Mumbai",
      state: "Maharashtra",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000),
      duration: 63
    },
    status: "active",
    isActive: true,
    tags: ["medical", "hearing", "child", "surgery"],
    analytics: {
      views: 750,
      shares: 45,
      donations: 32
    }
  },
  {
    title: "Build Classrooms for Rural School",
    shortDescription: "300+ children study under trees. Help us build proper classrooms for them.",
    description: "In a remote village in Maharashtra, 300+ children attend school in the open, under trees. During monsoon, classes are cancelled. We want to build 4 classrooms with proper facilities. Your contribution will give these children a dignified learning environment.",
    category: "education",
    goalAmount: 500000,
    currentAmount: 175000,
    images: [
      { url: "/images/c1.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Village School Committee",
      relationship: "Organization"
    },
    location: {
      city: "Nashik",
      state: "Maharashtra",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      duration: 90
    },
    status: "active",
    isActive: true,
    tags: ["education", "school", "rural", "children"],
    analytics: {
      views: 620,
      shares: 38,
      donations: 25
    }
  },
  {
    title: "Emergency Flood Relief - Kerala",
    shortDescription: "Families have lost everything in Kerala floods. Provide emergency food, shelter and medical aid.",
    description: "Severe flooding in Kerala has displaced 500+ families. They urgently need food, clean water, medicines, and temporary shelter. Every rupee you donate will directly help these families rebuild their lives.",
    category: "disaster",
    goalAmount: 1000000,
    currentAmount: 650000,
    images: [
      { url: "/images/c2.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Kerala Flood Victims",
      relationship: "Community"
    },
    location: {
      city: "Kochi",
      state: "Kerala",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      duration: 30
    },
    status: "active",
    isActive: true,
    isUrgent: true,
    tags: ["disaster", "flood", "emergency", "kerala"],
    analytics: {
      views: 1850,
      shares: 125,
      donations: 78
    }
  },
  {
    title: "Support Street Dogs Shelter",
    shortDescription: "Help us care for 50+ rescued street dogs with food, medical care and shelter.",
    description: "Our NGO rescues and rehabilitates street dogs. We currently have 50+ dogs who need food, vaccination, and medical treatment. Your monthly contribution of even ₹500 can make a huge difference in their lives.",
    category: "animal",
    goalAmount: 300000,
    currentAmount: 125000,
    images: [
      { url: "/images/c3.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Paws & Hearts NGO",
      relationship: "Organization"
    },
    location: {
      city: "Pune",
      state: "Maharashtra",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      duration: 120
    },
    status: "active",
    isActive: true,
    tags: ["animal", "dogs", "shelter", "rescue"],
    analytics: {
      views: 480,
      shares: 32,
      donations: 18
    }
  },
  {
    title: "Plant 1000 Trees - Save Environment",
    shortDescription: "Join us in planting 1000 trees to combat climate change and create green spaces.",
    description: "We aim to plant 1000 native trees in urban and rural areas. Each tree costs ₹300 including sapling, planting, and 1-year maintenance. Help us create a greener future for the next generation.",
    category: "environment",
    goalAmount: 300000,
    currentAmount: 95000,
    images: [
      { url: "/images/c1.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Green Earth Foundation",
      relationship: "Organization"
    },
    location: {
      city: "Bangalore",
      state: "Karnataka",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      duration: 75
    },
    status: "active",
    isActive: true,
    tags: ["environment", "trees", "climate", "green"],
    analytics: {
      views: 550,
      shares: 42,
      donations: 22
    }
  },
  {
    title: "Support Young Athlete's Olympics Dream",
    shortDescription: "Priya qualified for state athletics but needs funds for training and equipment.",
    description: "16-year-old Priya has qualified for state-level athletics championship. She comes from a humble background and needs support for proper training, equipment, diet, and travel. Help her achieve her Olympic dreams.",
    category: "sports",
    goalAmount: 200000,
    currentAmount: 75000,
    images: [
      { url: "/images/c2.jpg", isPrimary: true }
    ],
    beneficiary: {
      name: "Priya Patel",
      relationship: "Self",
      age: 16,
      gender: "female"
    },
    location: {
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India"
    },
    timeline: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      duration: 45
    },
    status: "active",
    isActive: true,
    tags: ["sports", "athletics", "youth", "olympics"],
    analytics: {
      views: 380,
      shares: 28,
      donations: 15
    }
  }
];

async function seedCampaigns() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/care-foundation');
    console.log('📦 Connected to MongoDB');

    // Find an admin user or create one
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('⚠️  No admin found. Please create an admin user first using createAdmin.js');
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name}`);

    // Delete existing campaigns (optional - comment out if you want to keep existing)
    // await Campaign.deleteMany({});
    // console.log('🗑️  Cleared existing campaigns');

    // Add fundraiser to each campaign
    const campaignsToInsert = sampleCampaigns.map(campaign => ({
      ...campaign,
      fundraiser: admin._id
    }));

    // Insert campaigns
    const insertedCampaigns = await Campaign.insertMany(campaignsToInsert);
    
    console.log(`\n✅ Successfully added ${insertedCampaigns.length} campaigns!\n`);
    
    // Display summary
    console.log('📊 Campaign Summary:');
    insertedCampaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ${campaign.title}`);
      console.log(`   Category: ${campaign.category}`);
      console.log(`   Goal: ₹${campaign.goalAmount.toLocaleString()}`);
      console.log(`   Raised: ₹${campaign.currentAmount.toLocaleString()}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Days Left: ${campaign.timeline.duration}`);
      console.log('');
    });

    console.log('✨ All done! You can now browse campaigns on the website.');
    console.log('🔗 Visit: http://localhost:3000/campaigns\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding campaigns:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCampaigns();










