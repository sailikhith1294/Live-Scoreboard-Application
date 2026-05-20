require('dotenv').config();
require('./src/config/db').connectMongo().then(async () => {
  const { Match, Scorecard } = require('./src/models');
  const matches = await Match.find({ source: { $nin: ['cricapi', 'api-sports'] } }).lean();
  const matchIds = matches.map(m => m._id);
  const scorecards = await Scorecard.find({ matchId: { $in: matchIds } }).lean();
  const map = scorecards.reduce((acc, sc) => {
    acc[String(sc.matchId)] = sc;
    return acc;
  }, {});
  console.log('Scorecards found:', scorecards.length);
  matches.forEach(m => {
    console.log(m._id, '->', map[String(m._id)] ? map[String(m._id)].runs : 'NOT FOUND');
  });
  process.exit(0);
});
