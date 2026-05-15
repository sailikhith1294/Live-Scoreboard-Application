const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { User, Team, PlayerProfile, TeamPlayer, Tournament, Match, syncDatabase } = require('../src/models');

async function setup() {
  console.log('--- Initializing Presentation Data ---');
  await syncDatabase();

  const passwordHash = await bcrypt.hash('Umpire@123', 10);
  const organizerHash = await bcrypt.hash('Organizer@123', 10);

  // 1. Create Umpire
  let umpire = await User.findOne({ email: 'umpire@cricket.local' });
  if (!umpire) {
    umpire = await User.create({
      fullName: 'Official Umpire',
      email: 'umpire@cricket.local',
      passwordHash,
      role: 'umpire',
      approvalStatus: 'approved'
    });
    console.log('Umpire created: umpire@cricket.local');
  }

  // 2. Create Organizer
  let organizer = await User.findOne({ email: 'organizer@cricket.local' });
  if (!organizer) {
    organizer = await User.create({
      fullName: 'Tournament Organizer',
      email: 'organizer@cricket.local',
      passwordHash: organizerHash,
      role: 'organizer',
      approvalStatus: 'approved'
    });
    console.log('Organizer created: organizer@cricket.local');
  }

  // 3. Create Tournament
  let tournament = await Tournament.findOne({ name: 'Exhibition Series' });
  if (!tournament) {
    tournament = await Tournament.create({
      name: 'Exhibition Series',
      organizerId: organizer._id,
      tournamentCode: 'EXH26',
      format: 'T20',
      location: 'Main Arena',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'upcoming'
    });
    console.log('Tournament created');
  }

  // 4. Create Teams & Players
  const teamNames = [
    { name: 'Stellar Strikers', code: 'STS' },
    { name: 'Galactic Giants', code: 'GAG' }
  ];

  const teams = [];
  for (const tInfo of teamNames) {
    let team = await Team.findOne({ name: tInfo.name });
    if (!team) {
      team = await Team.create({
        name: tInfo.name,
        shortCode: tInfo.code,
        organizerId: organizer._id,
        inviteCode: `${tInfo.code}-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
    
    // Ensure 15 players for each team
    for (let i = 1; i <= 15; i++) {
      const pEmail = `${tInfo.code.toLowerCase()}${i}@player.local`;
      let pUser = await User.findOne({ email: pEmail });
      if (!pUser) {
        pUser = await User.create({
          fullName: `${tInfo.name} Player ${i}`,
          email: pEmail,
          passwordHash: await bcrypt.hash('Umpire@123', 10),
          role: 'player',
          approvalStatus: 'approved'
        });
      }

      let pProfile = await PlayerProfile.findOne({ userId: pUser._id });
      if (!pProfile) {
        pProfile = await PlayerProfile.create({
          userId: pUser._id,
          playerId: `PLY-${tInfo.code}-${i}`,
          playerRole: i <= 5 ? 'batsman' : i >= 9 ? 'bowler' : 'all-rounder'
        });
      }

      await TeamPlayer.findOneAndUpdate(
        { teamId: team._id, playerProfileId: pProfile._id },
        { status: 'active' },
        { upsert: true }
      );
    }
    
    teams.push(team);
  }

  // 5. Create Match
  let match = await Match.findOne({ 
    tournamentId: tournament._id,
    homeTeamId: teams[0]._id,
    awayTeamId: teams[1]._id,
    status: 'scheduled'
  });

  if (!match) {
    match = await Match.create({
      tournamentId: tournament._id,
      homeTeamId: teams[0]._id,
      awayTeamId: teams[1]._id,
      umpireId: umpire._id,
      matchNo: 1,
      format: 'T20',
      venue: 'Main Arena',
      scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
      status: 'scheduled',
      source: 'organized'
    });
    console.log('Match created and assigned to Umpire!');
  }

  console.log('\n--- SETUP COMPLETE ---');
  console.log(`Umpire Login: umpire@cricket.local / Umpire@123`);
  console.log(`Match: ${teams[0].name} vs ${teams[1].name}`);
  process.exit(0);
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
