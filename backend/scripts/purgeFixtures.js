require('dotenv').config();
const {
  syncDatabase,
  Match,
  Scorecard,
  BallEvent,
  UmpireDecision,
  Leaderboard,
  MatchComment,
  MatchLike,
} = require('../src/models');

const purgeFixtures = async () => {
  await syncDatabase();

  const matchCount = await Match.countDocuments();
  const scorecardCount = await Scorecard.countDocuments();
  const ballEventCount = await BallEvent.countDocuments();
  const umpireDecisionCount = await UmpireDecision.countDocuments();
  const leaderboardCount = await Leaderboard.countDocuments();
  const commentCount = await MatchComment.countDocuments();
  const likeCount = await MatchLike.countDocuments();

  await Promise.all([
    Match.deleteMany({}),
    Scorecard.deleteMany({}),
    BallEvent.deleteMany({}),
    UmpireDecision.deleteMany({}),
    Leaderboard.deleteMany({}),
    MatchComment.deleteMany({}),
    MatchLike.deleteMany({}),
  ]);

  console.log('Purged fixture/match data from MongoDB:');
  console.log(`- Matches: ${matchCount}`);
  console.log(`- Scorecards: ${scorecardCount}`);
  console.log(`- Ball events: ${ballEventCount}`);
  console.log(`- Umpire decisions: ${umpireDecisionCount}`);
  console.log(`- Leaderboards: ${leaderboardCount}`);
  console.log(`- Match comments: ${commentCount}`);
  console.log(`- Match likes: ${likeCount}`);
  process.exit(0);
};

purgeFixtures().catch((error) => {
  console.error('Fixture purge failed:', error);
  process.exit(1);
});
