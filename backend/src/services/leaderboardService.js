const { Leaderboard } = require('../models');

const safeRate = (runs, overs) => (overs > 0 ? runs / overs : 0);

const calculateNRR = (entry) => {
  const forRate = safeRate(entry.runsFor, entry.oversFaced);
  const againstRate = safeRate(entry.runsAgainst, entry.oversBowled);
  return Number((forRate - againstRate).toFixed(3));
};

const updateLeaderboardRow = async ({ tournamentId, teamId, result, runsFor, oversFaced, runsAgainst, oversBowled }) => {
  let row = await Leaderboard.findOne({ tournamentId, teamId });

  if (!row) {
    row = await Leaderboard.create({
      tournamentId,
      teamId,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsFor: 0,
      oversFaced: 0,
      runsAgainst: 0,
      oversBowled: 0,
      netRunRate: 0,
    });
  }

  row.played += 1;
  row.runsFor += runsFor;
  row.oversFaced += oversFaced;
  row.runsAgainst += runsAgainst;
  row.oversBowled += oversBowled;

  if (result === 'won') {
    row.won += 1;
    row.points += 2;
  } else if (result === 'lost') {
    row.lost += 1;
  } else if (result === 'tied') {
    row.tied += 1;
    row.points += 1;
  } else {
    row.noResult += 1;
    row.points += 1;
  }

  row.netRunRate = calculateNRR(row);
  await row.save();

  return row;
};

const getTournamentLeaderboard = async (tournamentId) => {
  const rows = await Leaderboard.find({ tournamentId }).populate('teamId').sort({ points: -1, netRunRate: -1 });
  return rows;
};

module.exports = { updateLeaderboardRow, getTournamentLeaderboard, calculateNRR };
