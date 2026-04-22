const { Match, Scorecard, BallEvent, UmpireDecision, MatchComment, MatchLike, PlayerProfile, logActivity } = require('../models');
const { fetchMergedMatches, fetchMatchDetailsById } = require('../services/liveFeedService');

const hasObjectIdMatch = (left, right) => String(left || '') === String(right || '');

const ensureAssignedUmpire = (match, user) => {
  if (!user || user.role !== 'umpire') return true;
  return hasObjectIdMatch(match.umpireId, user.id);
};

const addBallEvent = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (!ensureAssignedUmpire(match, req.user)) {
      return res.status(403).json({ message: 'Only the assigned umpire can score this match' });
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

    let scorecard = await Scorecard.findOne({ matchId });
    if (!scorecard) {
      scorecard = await Scorecard.create({ matchId });
    }

    scorecard.runs += Number(batsmanRuns) + Number(extras);
    scorecard.wickets += isWicket ? 1 : 0;
    scorecard.extras += Number(extras);
    scorecard.overs = Number(`${overNumber}.${ballNumber}`);
    await scorecard.save();

    match.status = 'live';
    match.currentRuns = scorecard.runs;
    match.currentWickets = scorecard.wickets;
    match.currentOver = overNumber;
    match.currentBall = ballNumber;
    await match.save();

    await logActivity(req.user.id, 'MATCH_ADD_BALL_EVENT', { matchId, ballEventId: ball.id });

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('score:update', { match, scorecard, ball });

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

    if (!ensureAssignedUmpire(match, req.user)) {
      return res.status(403).json({ message: 'Only the assigned umpire can log decisions for this match' });
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
    const [match, scorecard, events, decisions] = await Promise.all([
      Match.findById(matchId),
      Scorecard.findOne({ matchId }),
      BallEvent.find({ matchId }).sort({ createdAt: 1 }),
      UmpireDecision.find({ matchId }).sort({ createdAt: 1 }),
    ]);

    if (!match) {
      const external = await fetchMatchDetailsById(matchId);
      if (external) {
        return res.json(external);
      }
      return res.status(404).json({ message: 'Match not found' });
    }

    return res.json({ match, scorecard, events, decisions });
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

module.exports = {
  addBallEvent,
  logUmpireDecision,
  getScorecard,
  listLiveMatches,
  addComment,
  listComments,
  toggleLike,
  getPlayerProfile,
};
