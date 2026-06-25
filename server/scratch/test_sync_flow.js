const axios = require('axios');
const mongoose = require('mongoose');

// We will query the DB directly to clean up afterwards
require('dotenv').config({ path: './.env' });
const User = require('../models/User');

const API_BASE = 'http://localhost:5000';
const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

async function runTest() {
  console.log('--- INTEGRATION TEST: EXTENSION SYNC ONBOARDING FLOW ---');
  
  // 1. Clean up test user l1f23bscs9999 if they exist in DB
  console.log('Connecting to DB for cleanup...');
  await mongoose.connect(dbUri);
  await User.deleteOne({ email: 'l1f23bscs9999@ucp.edu.pk' });
  console.log('Cleaned up l1f23bscs9999@ucp.edu.pk');
  await mongoose.disconnect();

  const tempSyncId = 'sync_test_token_' + Date.now();
  console.log(`Generated tempSyncId: ${tempSyncId}`);

  // 2. Check sync status initially (should be false)
  console.log('\nChecking sync status initially...');
  let res = await axios.get(`${API_BASE}/api/web/check-sync-status?tempSyncId=${tempSyncId}`);
  console.log('Status Response:', res.data);
  if (res.data.synced !== false) {
    throw new Error('Initial sync status should be false');
  }

  // 3. Mock Chrome Extension auth sync via POST /api/auth/microsoft-login
  console.log('\nMocking Chrome Extension sync payload...');
  res = await axios.post(`${API_BASE}/api/auth/microsoft-login`, {
    rollNumber: 'L1F23BSCS9999',
    name: 'Sync Test User',
    profilePic: 'https://lh3.googleusercontent.com/a/avatar',
    ucpCookie: 'test_session_cookie_abc123',
    tempSyncId: tempSyncId
  });
  console.log('Sync auth response:', res.data.message || res.data);

  // 4. Check sync status again (should be true and return tempToken)
  console.log('\nChecking sync status again...');
  res = await axios.get(`${API_BASE}/api/web/check-sync-status?tempSyncId=${tempSyncId}`);
  console.log('Status Response:', res.data);
  if (res.data.synced !== true || !res.data.tempToken) {
    throw new Error('Sync status should be true and return a tempToken');
  }
  const tempToken = res.data.tempToken;

  // 5. Submit new password via set-password-via-sync using the tempToken
  console.log('\nSubmitting password via sync token...');
  res = await axios.post(`${API_BASE}/api/web/set-password-via-sync`, {
    newPassword: 'SecurePassword123!'
  }, {
    headers: { 'x-sync-token': tempToken }
  });
  console.log('Set password response:', res.data);
  if (!res.data.token || !res.data.user) {
    throw new Error('Set password via sync failed to return session token');
  }
  const loginToken = res.data.token;

  // 6. Confirm we can login with the newly set password
  console.log('\nTesting login with new password...');
  res = await axios.post(`${API_BASE}/api/web/login`, {
    email: 'l1f23bscs9999@ucp.edu.pk',
    password: 'SecurePassword123!'
  });
  console.log('Login Response:', res.data);
  if (!res.data.token || res.data.user.name !== 'Sync Test User') {
    throw new Error('Login with set password failed');
  }

  // 7. Verify the user has showProfilePicToCommunity set to null initially
  console.log('\nVerifying user profile settings are in onboarding state...');
  await mongoose.connect(dbUri);
  const dbUser = await User.findOne({ email: 'l1f23bscs9999@ucp.edu.pk' });
  console.log(`User showProfilePicToCommunity = ${dbUser.showProfilePicToCommunity}`);
  if (dbUser.showProfilePicToCommunity !== null) {
    throw new Error('Onboarding status showProfilePicToCommunity should be null');
  }
  
  // Clean up test user
  await User.deleteOne({ email: 'l1f23bscs9999@ucp.edu.pk' });
  console.log('Cleaned up test user after test completion.');
  await mongoose.disconnect();

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Chrome Extension sync onboarding flow is fully functional and secure.');
}

runTest().catch(async (err) => {
  console.error('\n❌ TEST FAILED:', err.response ? err.response.data : err.message);
  try {
    await mongoose.disconnect();
  } catch(e){}
  process.exit(1);
});
