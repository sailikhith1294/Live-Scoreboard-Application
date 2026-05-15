const { PlayerProfile, BallEvent, Match } = require('../models');

/**
 * Updates player career statistics based on match performance.
 * Uses cumulative data for high-precision calculations of Strike Rate and Economy.
 */
const updatePlayerStatsFromMatch = async (matchId) => {
  try {
    const events = await BallEvent.find({ matchId });
    const match = await Match.findById(matchId);
    if (!match) return;

    // Collect stats from this match
    const playerMatchStats = {};

    events.forEach(e => {
      // Initialize if needed
      const ensureStats = (id) => {
        if (!playerMatchStats[id]) {
          playerMatchStats[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, runsConceded: 0, ballsBowled: 0, wickets: 0 };
        }
      };

      // Batsman logic
      if (e.strikerId) {
        const sid = String(e.strikerId);
        ensureStats(sid);
        playerMatchStats[sid].runs += e.batsmanRuns;
        // Wides don't count as balls faced
        if (e.extraType !== 'wide') {
          playerMatchStats[sid].balls += 1;
        }
        if (e.batsmanRuns === 4) playerMatchStats[sid].fours += 1;
        if (e.batsmanRuns === 6) playerMatchStats[sid].sixes += 1;
      }

      // Bowler logic
      if (e.bowlerId) {
        const bid = String(e.bowlerId);
        ensureStats(bid);
        // Bowler concedes batsman runs + extras
        playerMatchStats[bid].runsConceded += (e.batsmanRuns + e.extras);
        
        // Only fair deliveries count towards overs
        if (e.extraType !== 'wide' && e.extraType !== 'no-ball') {
          playerMatchStats[bid].ballsBowled += 1;
        }
        
        // Wicket credit (exclude run-outs)
        if (e.isWicket && !['run out', 'retired hurt', 'retired out'].includes(String(e.wicketType || '').toLowerCase())) {
          playerMatchStats[bid].wickets += 1;
        }
      }
    });

    // Update profiles with cumulative data
    for (const [profileId, stats] of Object.entries(playerMatchStats)) {
      const profile = await PlayerProfile.findById(profileId);
      if (!profile) continue;

      // Increment totals
      profile.matchesPlayed = (profile.matchesPlayed || 0) + 1;
      profile.careerRuns = (profile.careerRuns || 0) + stats.runs;
      profile.careerWickets = (profile.careerWickets || 0) + stats.wickets;
      profile.totalBallsFaced = (profile.totalBallsFaced || 0) + stats.balls;
      profile.totalBallsBowled = (profile.totalBallsBowled || 0) + stats.ballsBowled;
      profile.runsConceded = (profile.runsConceded || 0) + stats.runsConceded;
      profile.fours = (profile.fours || 0) + stats.fours;
      profile.sixes = (profile.sixes || 0) + stats.sixes;

      // Precise Batting Strike Rate: (Total Runs / Total Balls Faced) * 100
      if (profile.totalBallsFaced > 0) {
        profile.careerStrikeRate = (profile.careerRuns / profile.totalBallsFaced) * 100;
      }

      // Precise Bowling Economy: Total Runs Conceded / Total Overs Bowled
      if (profile.totalBallsBowled > 0) {
        const totalOvers = profile.totalBallsBowled / 6;
        profile.careerEconomy = profile.runsConceded / totalOvers;
      }

      await profile.save();
    }
    
    console.log(`[STATS_SERVICE] Statistics synchronization complete for Match ${matchId}`);
  } catch (error) {
    console.error(`[STATS_SERVICE] Error updating player stats for Match ${matchId}:`, error);
  }
};

module.exports = {
  updatePlayerStatsFromMatch,
};
