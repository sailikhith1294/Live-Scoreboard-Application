require('dotenv').config();
const { syncDatabase, User } = require('../src/models');

const cleanupLegacyUsers = async () => {
  await syncDatabase();

  const brokenUsers = await User.find({
    $or: [
      { passwordHash: { $exists: false } },
      { passwordHash: null },
      { passwordHash: '' },
    ],
  });

  if (!brokenUsers.length) {
    console.log('No legacy users without password hashes found.');
    process.exit(0);
  }

  const deletedIds = brokenUsers.map((user) => user.id);
  await User.deleteMany({ _id: { $in: deletedIds } });

  console.log(`Deleted ${brokenUsers.length} legacy user(s) missing password hashes.`);
  console.log('Removed user IDs:', deletedIds.join(', '));
  process.exit(0);
};

cleanupLegacyUsers().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
