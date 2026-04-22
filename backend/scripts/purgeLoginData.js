require('dotenv').config();
const {
  syncDatabase,
  User,
  PlayerProfile,
  ActivityLog,
  Notification,
  Favorite,
  MatchComment,
  MatchLike,
  TeamPlayer,
} = require('../src/models');

const purgeLoginData = async () => {
  await syncDatabase();

  const userCount = await User.countDocuments();
  const profileCount = await PlayerProfile.countDocuments();
  const activityCount = await ActivityLog.countDocuments();
  const notificationCount = await Notification.countDocuments();
  const favoriteCount = await Favorite.countDocuments();
  const commentCount = await MatchComment.countDocuments();
  const likeCount = await MatchLike.countDocuments();
  const teamPlayerCount = await TeamPlayer.countDocuments();

  await Promise.all([
    User.deleteMany({}),
    PlayerProfile.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
    Favorite.deleteMany({}),
    MatchComment.deleteMany({}),
    MatchLike.deleteMany({}),
    TeamPlayer.deleteMany({}),
  ]);

  console.log('Purged login-related data from MongoDB:');
  console.log(`- Users: ${userCount}`);
  console.log(`- Player profiles: ${profileCount}`);
  console.log(`- Activity logs: ${activityCount}`);
  console.log(`- Notifications: ${notificationCount}`);
  console.log(`- Favorites: ${favoriteCount}`);
  console.log(`- Match comments: ${commentCount}`);
  console.log(`- Match likes: ${likeCount}`);
  console.log(`- Team-player links: ${teamPlayerCount}`);
  process.exit(0);
};

purgeLoginData().catch((error) => {
  console.error('Purge failed:', error);
  process.exit(1);
});
