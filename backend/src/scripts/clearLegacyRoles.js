const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/live-cricket');
    console.log('Connected to MongoDB');

    // Update all player profiles that have the legacy default role
    const result = await mongoose.connection.db.collection('playerprofiles').updateMany(
      { playerRole: 'all-rounder' },
      { $set: { playerRole: null } }
    );

    console.log(`Updated ${result.modifiedCount} profiles to null role.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
