const { Match, Scorecard, BallEvent, UmpireDecision, MatchComment, MatchLike, PlayerProfile, logActivity } = require('../models');
const { fetchMergedMatches, fetchMatchDetailsById } = require('../services/liveFeedService');

const hasObjectIdMatch = (left, right) => String(left || '') === String(right || '');

const ensureScoringPermission = async (match, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'umpire') {
    return hasObjectIdMatch(match.umpireId, user.id) || hasObjectIdMatch(match.legUmpireId, user.id);
  }
  if (user.role === 'organizer') {
    const { Tournament } = require('../models');
    const tournament = await Tournament.findById(match.tournamentId);
    return hasObjectIdMatch(tournament?.organizerId, user.id);
  }
  return false;
};

const addBallEvent = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (!await ensureScoringPermission(match, req.user)) {
      return res.status(403).json({ message: 'Authorization required to score this match' });
    }

    const {
      innings,
      overNumber,
      ballNumber,
      batsmanRuns = 0,
      extras = 0,
      extraType = 'none',
      isWicket = false,
      wicketType,
      strikerId,
      bowlerId,
      commentary,
      umpireDecision,
    } = req.body;

    let scorecard = await Scorecard.findOne({ matchId });
    if (!scorecard) {
      scorecard = await Scorecard.create({ matchId });
    }

    const lastOver = scorecard.overs || 0;
    const oversLimit = match.oversLimit || 20;

    if (lastOver >= oversLimit) {
      return res.status(400).json({ message: `Innings complete. Reached limit of ${oversLimit} overs.` });
    }

    const ball = await BallEvent.create({
      matchId,
      innings,
      overNumber,
      ballNumber,
      batsmanRuns,
      extras,
      extraType,
      isWicket,
      wicketType,
      strikerId,
      bowlerId,
      commentary,
    });

    if (umpireDecision?.decisionType) {
      await UmpireDecision.create({
        ballEventId: ball.id,
        matchId,
        umpireId: req.user.id,
        decisionType: umpireDecision.decisionType,
        remarks: umpireDecision.remarks || null,
      });
    }

    scorecard.runs += Number(batsmanRuns) + Number(extras);
    scorecard.wickets += isWicket ? 1 : 0;
    scorecard.extras += Number(extras);
    scorecard.overs = Number(`${overNumber}.${ballNumber}`);
    await scorecard.save();

    // REAL WORLD FEATURE: Update Player Stats
    if (strikerId) {
      const striker = await PlayerProfile.findById(strikerId);
      if (striker) {
        striker.careerRuns = (striker.careerRuns || 0) + Number(batsmanRuns);
        if (extraType !== 'wide') {
          striker.totalBallsFaced = (striker.totalBallsFaced || 0) + 1;
        }
        if (Number(batsmanRuns) === 4) striker.fours = (striker.fours || 0) + 1;
        if (Number(batsmanRuns) === 6) striker.sixes = (striker.sixes || 0) + 1;
        
        if (striker.totalBallsFaced > 0) {
          striker.careerStrikeRate = ((striker.careerRuns / striker.totalBallsFaced) * 100).toFixed(2);
        }
        await striker.save();
      }
    }

    if (bowlerId) {
      const bowler = await PlayerProfile.findById(bowlerId);
      if (bowler) {
        if (isWicket && !['run out', 'retired hurt'].includes(String(wicketType || '').toLowerCase())) {
          bowler.careerWickets = (bowler.careerWickets || 0) + 1;
        }
        
        bowler.runsConceded = (bowler.runsConceded || 0) + Number(batsmanRuns) + Number(extras);
        if (extraType !== 'wide' && extraType !== 'no-ball') {
          bowler.totalBallsBowled = (bowler.totalBallsBowled || 0) + 1;
        }

        if (bowler.totalBallsBowled > 0) {
          const totalOvers = bowler.totalBallsBowled / 6;
          bowler.careerEconomy = (bowler.runsConceded / totalOvers).toFixed(2);
        }
        await bowler.save();
      }
    }

    match.status = 'live';
    match.currentRuns = scorecard.runs;
    match.currentWickets = scorecard.wickets;
    match.currentOver = overNumber;
    match.currentBall = ballNumber;

    // BROADCAST FEATURE: Active Player Figures
    const activeEvents = await BallEvent.find({ matchId, innings: 1 });
    
    const getStats = (pId) => {
      const pEvents = activeEvents.filter(e => String(e.strikerId) === String(pId));
      const runs = pEvents.reduce((acc, curr) => acc + curr.batsmanRuns, 0);
      const balls = pEvents.filter(e => e.extraType !== 'wide').length;
      return { runs, balls };
    };

    const getBowlerStats = (bId) => {
      const bEvents = activeEvents.filter(e => String(e.bowlerId) === String(bId));
      const runs = bEvents.reduce((acc, curr) => acc + curr.batsmanRuns + curr.extras, 0);
      const balls = bEvents.filter(e => !['wide', 'no-ball'].includes(e.extraType)).length;
      const wickets = bEvents.filter(e => e.isWicket && !['run out'].includes(String(e.wicketType).toLowerCase())).length;
      const overs = Math.floor(balls / 6);
      const bal = balls % 6;
      return { overs: `${overs}.${bal}`, runs, wickets };
    };

    const sProfile = await PlayerProfile.findById(strikerId).populate('userId', 'fullName');
    const nsProfile = await PlayerProfile.findById(req.body.nonStrikerId || null).populate('userId', 'fullName');
    const bProfile = await PlayerProfile.findById(bowlerId).populate('userId', 'fullName');

    if (sProfile) {
      const { runs, balls } = getStats(strikerId);
      match.activeStrikerData = { 
        id: strikerId, 
        name: sProfile.userId?.fullName || sProfile.name || 'Striker', 
        runs, 
        balls 
      };
    }
    if (nsProfile) {
      const { runs, balls } = getStats(nsProfile._id);
      match.activeNonStrikerData = { 
        id: nsProfile._id, 
        name: nsProfile.userId?.fullName || nsProfile.name || 'Non-Striker', 
        runs, 
        balls 
      };
    }
    if (bProfile) {
      const { overs, runs, wickets } = getBowlerStats(bowlerId);
      match.activeBowlerData = { 
        id: bowlerId, 
        name: bProfile.userId?.fullName || bProfile.name || 'Bowler', 
        overs, 
        runs, 
        wickets 
      };
    }

    await match.save();

    await logActivity(req.user.id, 'MATCH_ADD_BALL_EVENT', { matchId, ballEventId: ball.id });

    const broadcastData = await fetchMatchDetailsById(matchId);
    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('score:update', { 
      match: broadcastData.match, 
      scorecard: broadcastData.scorecard, 
      ball 
    });
    io.emit('match:global_update', { 
      type: 'score', 
      matchId, 
      match: broadcastData.match, 
      scorecard: broadcastData.scorecard 
    });

    res.status(201).json({ match, scorecard, ball });
  } catch (error) {
    next(error);
  }
};

const logUmpireDecision = async (req, res, next) => {
  try {
    const { matchId, ballEventId } = req.params;
    const { decisionType, remarks } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (!await ensureScoringPermission(match, req.user)) {
      return res.status(403).json({ message: 'Authorization required to log decisions for this match' });
    }

    const decision = await UmpireDecision.create({
      matchId,
      ballEventId,
      decisionType,
      remarks: remarks || null,
      umpireId: req.user.id,
    });

    await logActivity(req.user.id, 'MATCH_UMPIRE_DECISION', { matchId, ballEventId, decisionType });
    res.status(201).json(decision);
  } catch (error) {
    next(error);
  }
};

const getScorecard = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const details = await fetchMatchDetailsById(matchId);
    if (!details) {
      return res.status(404).json({ message: 'Match details not found' });
    }
    return res.json(details);
  } catch (error) {
    return next(error);
  }
};

const listLiveMatches = async (req, res, next) => {
  try {
    const merged = await fetchMergedMatches();
    const live = merged.filter((match) => String(match.status).toLowerCase() === 'live');
    return res.json(live);
  } catch (error) {
    return next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const comment = await MatchComment.create({
      matchId: req.params.matchId,
      userId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

const listComments = async (req, res, next) => {
  try {
    const comments = await MatchComment.find({ matchId: req.params.matchId, status: 'visible' }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const existing = await MatchLike.findOne({ matchId, userId: req.user.id });
    if (existing) {
      await MatchLike.deleteOne({ _id: existing.id });
      return res.json({ liked: false });
    }

    await MatchLike.create({ matchId, userId: req.user.id });
    return res.json({ liked: true });
  } catch (error) {
    return next(error);
  }
};

const getPlayerProfile = async (req, res, next) => {
  try {
    const profile = await PlayerProfile.findOne({ playerId: req.params.playerId });
    if (!profile) {
      return res.status(404).json({ message: 'Player not found' });
    }
    return res.json(profile);
  } catch (error) {
    return next(error);
  }
};

const updateMatchStatus = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { status, note, winnerId } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (!await ensureScoringPermission(match, req.user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    match.status = status;
    if (winnerId) match.winnerId = winnerId;
    await match.save();

    // Log the event
    await logActivity(req.user.id, 'MATCH_STATUS_CHANGE', { matchId, status, note, winnerId });

    if (status === 'completed') {
      const { updateLeaderboardFromMatch } = require('../services/leaderboardService');
      const { updatePlayerStatsFromMatch } = require('../services/playerStatsService');
      try {
        await updateLeaderboardFromMatch(match.id);
        await updatePlayerStatsFromMatch(match.id);
      } catch (err) {
        console.error('Stats synchronization failed:', err);
      }
    }

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('match:status_update', { matchId, status, note, winnerId });
    io.emit('match:global_update', { type: 'status', matchId, match });

    res.json({ success: true, match });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBallEvent,
  logUmpireDecision,
  getScorecard,
  listLiveMatches,
  addComment,
  listComments,
  toggleLike,
  getPlayerProfile,
  updateMatchStatus,
};
