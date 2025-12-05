const axios = require('axios');

async function testAPI() {
  console.log('\n🧪 Testing Care Foundation API...\n');

  const baseURL = 'http://localhost:5000/api';

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing Health Check...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('   ✅ Status:', health.status);
    console.log('   ✅ Response:', health.data.message);

    // Test 2: Get All Campaigns
    console.log('\n2️⃣  Testing GET /campaigns...');
    const campaigns = await axios.get(`${baseURL}/campaigns`);
    console.log('   ✅ Status:', campaigns.status);
    console.log('   ✅ Total campaigns:', campaigns.data.results);
    console.log('   ✅ Data length:', campaigns.data.data?.length);
    if (campaigns.data.data?.length > 0) {
      console.log('   ✅ First campaign:', campaigns.data.data[0].title);
      console.log('   ✅ Status:', campaigns.data.data[0].status);
      console.log('   ✅ Active:', campaigns.data.data[0].isActive);
    }

    // Test 3: Get Active Campaigns Only
    console.log('\n3️⃣  Testing GET /campaigns?status=active...');
    const activeCampaigns = await axios.get(`${baseURL}/campaigns`, {
      params: { status: 'active' }
    });
    console.log('   ✅ Status:', activeCampaigns.status);
    console.log('   ✅ Active campaigns:', activeCampaigns.data.results);
    console.log('   ✅ Data:', JSON.stringify(activeCampaigns.data, null, 2));

    // Test 4: Get Trending (as used by frontend)
    console.log('\n4️⃣  Testing Trending Campaigns (Frontend query)...');
    const trending = await axios.get(`${baseURL}/campaigns`, {
      params: { sortBy: 'popularity', limit: 9, status: 'active' }
    });
    console.log('   ✅ Status:', trending.status);
    console.log('   ✅ Results:', trending.data.results);
    console.log('   ✅ Data:', JSON.stringify(trending.data, null, 2));

    console.log('\n✅ ALL TESTS PASSED!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   ⚠️  No response from server. Is backend running?');
    }
    console.log('\n💡 Make sure backend is running: npm start\n');
  }
}

testAPI();












