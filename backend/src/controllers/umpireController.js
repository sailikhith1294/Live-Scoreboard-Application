const { Match, Scorecard, logActivity } = require('../models');

const getUmpireDashboard = async (req, res, next) => {
  try {
    const isUmpire = req.user.role === 'umpire';
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin ? {} : {
      $or: [
        { umpireId: req.user.id },
        { legUmpireId: req.user.id }
      ]
    };

    const matches = await Match.find(query)
      .populate('tournamentId', 'name format location startDate endDate')
      .populate('homeTeamId', 'name shortCode')
      .populate('awayTeamId', 'name shortCode')
      .populate('tossWinnerTeamId', 'name shortCode')
      .populate('venueId', 'name city')
      .sort({ scheduledAt: -1 })
      .lean();

    return res.json({ matches });
  } catch (error) {
    return next(error);
  }
};

const checkUmpireAccess = async (userId, matchId, role) => {
  if (role === 'admin') return true;
  const match = await Match.findById(matchId);
  if (!match) return false;
  return String(match.umpireId) === String(userId) || String(match.legUmpireId) === String(userId);
};

const updateToss = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { tossWinnerTeamId, tossDecision } = req.body;

    if (!await checkUmpireAccess(req.user.id, matchId, req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized: You are not assigned to this match' });
    }

    const match = await Match.findByIdAndUpdate(matchId, {
      tossWinnerTeamId,
      tossDecision
    }, { new: true });

    const broadcastData = await require('../services/liveFeedService').fetchMatchDetailsById(matchId);
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_updated', match: broadcastData.match });
    
    res.json(match);
  } catch (error) { next(error); }
};

const updateSquads = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { homeSquad, awaySquad } = req.body;

    if (!await checkUmpireAccess(req.user.id, matchId, req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized: You are not assigned to this match' });
    }

    const match = await Match.findByIdAndUpdate(matchId, {
      homeSquad,
      awaySquad
    }, { new: true });

    const broadcastData = await require('../services/liveFeedService').fetchMatchDetailsById(matchId);
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_updated', match: broadcastData.match });

    res.json(match);
  } catch (error) { next(error); }
};

const startMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    if (!await checkUmpireAccess(req.user.id, matchId, req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized: You are not assigned to this match' });
    }

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    match.status = 'live';
    await match.save();

    // Ensure scorecard exists
    const existing = await Scorecard.findOne({ matchId });
    if (!existing) await Scorecard.create({ matchId });

    const broadcastData = await require('../services/liveFeedService').fetchMatchDetailsById(matchId);
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_updated', match: broadcastData.match });

    res.json(match);
  } catch (error) { next(error); }
};

module.exports = { 
  getUmpireDashboard,
  updateToss,
  updateSquads,
  startMatch
};
