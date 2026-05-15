const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { User, Team, PlayerProfile, Match, Scorecard, BallEvent, UmpireDecision, TeamPlayer, syncDatabase } = require('../src/models');

async function cleanupTestData() {
  try {
    await syncDatabase();
    console.log('Connected to DB');

    // 1. Delete BallEvents and Scorecards for Test Matches
    const testMatches = await Match.find({ matchNo: /^TEST-/ });
    const matchIds = testMatches.map(m => m._id);
    
    if (matchIds.length > 0) {
      console.log(`Deleting data for ${matchIds.length} test matches...`);
      await BallEvent.deleteMany({ matchId: { $in: matchIds } });
      await Scorecard.deleteMany({ matchId: { $in: matchIds } });
      await UmpireDecision.deleteMany({ matchId: { $in: matchIds } });
      await Match.deleteMany({ _id: { $in: matchIds } });
    }

    // 2. Delete Test Users and Profiles
    const testUsers = await User.find({ email: /@test.com$/ });
    const userIds = testUsers.map(u => u._id);

    if (userIds.length > 0) {
      console.log(`Deleting ${userIds.length} test users and associated profiles...`);
      const profiles = await PlayerProfile.find({ userId: { $in: userIds } });
      const profileIds = profiles.map(p => p._id);
      
      await TeamPlayer.deleteMany({ playerProfileId: { $in: profileIds } });
      await PlayerProfile.deleteMany({ _id: { $in: profileIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }

    // 3. Delete Test Teams
    await Team.deleteMany({ name: { $in: ['Red Blasters', 'Blue Warriors'] } });

    console.log('Cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanupTestData();
