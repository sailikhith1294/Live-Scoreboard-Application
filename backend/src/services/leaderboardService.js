const { Leaderboard, Match, Scorecard, BallEvent } = require('../models');

/**
 * Updates or creates a leaderboard row for a team in a tournament based on a completed match.
 */
const updateLeaderboardFromMatch = async (matchId) => {
  const match = await Match.findById(matchId).populate('homeTeamId awayTeamId');
  if (!match || match.status !== 'completed') return;

  const tournamentId = match.tournamentId;
  const winnerId = match.winnerId;

  // We need the scores to calculate NRR
  // In our current system, Scorecard only tracks the CURRENT innings runs.
  // We need to fetch ball events to get total runs for each team in the match.
  
  const events = await BallEvent.find({ matchId });
  
  const stats = {
    home: { runs: 0, balls: 0 },
    away: { runs: 0, balls: 0 }
  };

  const tossWinner = String(match.tossWinnerTeamId || '');
  const isHomeWinner = tossWinner === String(match.homeTeamId);
  const homeBattedFirst = (isHomeWinner && match.tossDecision === 'bat') || (!isHomeWinner && match.tossDecision === 'bowl');

  events.forEach(e => {
    let isHome = e.innings === 1 ? homeBattedFirst : !homeBattedFirst;
    // Fallback if no toss info
    if (!match.tossWinnerTeamId) isHome = e.innings === 1;

    if (isHome) {
      stats.home.runs += (e.batsmanRuns + e.extras);
      if (e.extraType !== 'wide' && e.extraType !== 'no-ball') stats.home.balls += 1;
    } else {
      stats.away.runs += (e.batsmanRuns + e.extras);
      if (e.extraType !== 'wide' && e.extraType !== 'no-ball') stats.away.balls += 1;
    }
  });

  const updateTeam = async (teamId, result, runsFor, ballsFaced, runsAgainst, ballsBowled) => {
    let row = await Leaderboard.findOne({ tournamentId, teamId });
    if (!row) row = new Leaderboard({ tournamentId, teamId });

    row.played += 1;
    if (result === 'win') {
      row.won += 1;
      row.points += 2;
    } else if (result === 'loss') {
      row.lost += 1;
    } else if (result === 'draw' || result === 'abandoned') {
      row.noResult += 1;
      row.points += 1;
    }

    row.runsFor += runsFor;
    row.oversFaced += (ballsFaced / 6);
    row.runsAgainst += runsAgainst;
    row.oversBowled += (ballsBowled / 6);

    // Calculate NRR
    const forRate = row.oversFaced > 0 ? row.runsFor / row.oversFaced : 0;
    const againstRate = row.oversBowled > 0 ? row.runsAgainst / row.oversBowled : 0;
    row.netRunRate = forRate - againstRate;

    await row.save();
  };

  if (winnerId) {
    const isHomeWinner = String(winnerId) === String(match.homeTeamId);
    await updateTeam(match.homeTeamId, isHomeWinner ? 'win' : 'loss', stats.home.runs, stats.home.balls, stats.away.runs, stats.away.balls);
    await updateTeam(match.awayTeamId, isHomeWinner ? 'loss' : 'win', stats.away.runs, stats.away.balls, stats.home.runs, stats.home.balls);
  } else if (match.resultType === 'draw') {
    await updateTeam(match.homeTeamId, 'draw', stats.home.runs, stats.home.balls, stats.away.runs, stats.away.balls);
    await updateTeam(match.awayTeamId, 'draw', stats.away.runs, stats.away.balls, stats.home.runs, stats.home.balls);
  } else {
    await updateTeam(match.homeTeamId, 'abandoned', 0, 0, 0, 0);
    await updateTeam(match.awayTeamId, 'abandoned', 0, 0, 0, 0);
  }
};

/**
 * Fetches the current leaderboard for a tournament, sorted by points and Net Run Rate.
 */
const getTournamentLeaderboard = async (tournamentId) => {
  const rows = await Leaderboard.find({ tournamentId })
    .populate('teamId', 'name shortCode')
    .sort({ points: -1, netRunRate: -1 });
  return rows;
};

module.exports = {
  updateLeaderboardFromMatch,
  getTournamentLeaderboard,
};
