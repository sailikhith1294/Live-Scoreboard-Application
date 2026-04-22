const { Tournament, Team, PlayerProfile, Match, Notification, Favorite } = require('../models');
const { getTournamentLeaderboard } = require('../services/leaderboardService');
const { fetchMergedMatches } = require('../services/liveFeedService');

const searchAll = async (req, res, next) => {
  try {
    const { query = '', location, format, date } = req.query;

    const qRegex = query ? new RegExp(query, 'i') : null;
    const locationRegex = location ? new RegExp(location, 'i') : null;

    const tournamentWhere = {
      ...(qRegex ? { name: qRegex } : {}),
      ...(locationRegex ? { location: locationRegex } : {}),
      ...(format ? { format } : {}),
      ...(date ? { startDate: { $lte: date }, endDate: { $gte: date } } : {}),
    };

    const [tournaments, teams, profiles] = await Promise.all([
      Tournament.find(tournamentWhere).limit(50),
      Team.find(qRegex ? { name: qRegex } : {}).limit(50),
      PlayerProfile.find(qRegex ? { playerId: qRegex } : {}).populate('userId', 'fullName email phone').limit(100),
    ]);

    const players = (profiles || []).filter((profile) => {
      if (!qRegex) return true;
      const fullName = String(profile?.userId?.fullName || '');
      const email = String(profile?.userId?.email || '');
      const phone = String(profile?.userId?.phone || '');
      const playerId = String(profile?.playerId || '');
      return qRegex.test(fullName) || qRegex.test(email) || qRegex.test(phone) || qRegex.test(playerId);
    }).slice(0, 50);

    res.json({ tournaments, teams, players });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const rows = await getTournamentLeaderboard(req.params.tournamentId);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getPublicTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({}).sort({ startDate: 1 });
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
};

const getMatchSchedule = async (req, res, next) => {
  try {
    const tournamentId = req.query.tournamentId;

    if (tournamentId) {
      const matches = await Match.find({ tournamentId }).sort({ scheduledAt: 1 });
      return res.json(matches);
    }

    const matches = await fetchMergedMatches();
    return res.json(matches);
  } catch (error) {
    return next(error);
  }
};

const getMyNotifications = async (req, res, next) => {
  try {
    const where = req.user ? { $or: [{ scope: 'global' }, { userId: req.user.id }] } : { scope: 'global' };
    const notifications = await Notification.find(where).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

const setFavorite = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.body;

    if (!['team', 'player'].includes(String(targetType || '').toLowerCase())) {
      return res.status(400).json({ message: 'targetType must be team or player' });
    }

    if (!targetId) {
      return res.status(400).json({ message: 'targetId is required' });
    }

    const existing = await Favorite.findOne({ userId: req.user.id, targetType, targetId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ removed: true, favorite: null });
    }

    const favorite = await Favorite.create({ userId: req.user.id, targetType, targetId });
    return res.status(201).json({ removed: false, favorite });
  } catch (error) {
    next(error);
  }
};

const getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(favorites);
  } catch (error) {
    next(error);
  }
};

const getMyPlayerProfile = async (req, res, next) => {
  try {
    const profile = await PlayerProfile.findOne({ userId: req.user.id }).populate('userId', 'fullName email phone');
    if (!profile) {
      return res.status(404).json({ message: 'Player profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
};

const getMyPromotionRequest = async (req, res, next) => {
  try {
    const user = await req.user.populate('promotionRequest.decidedBy', 'fullName email');
    return res.json({
      promotionRequest: user?.promotionRequest || null,
      role: user?.role,
      approvalStatus: user?.approvalStatus,
    });
  } catch (error) {
    return next(error);
  }
};

const requestPromotion = async (req, res, next) => {
  try {
    const { requestedRole, message } = req.body;

    if (!['organizer', 'player', 'umpire'].includes(String(requestedRole || '').toLowerCase())) {
      return res.status(400).json({ message: 'requestedRole must be organizer, player, or umpire' });
    }

    if (req.user.role === 'admin') {
      return res.status(400).json({ message: 'Admin does not need promotion request' });
    }

    if (req.user.role === requestedRole) {
      return res.status(400).json({ message: `You are already a ${requestedRole}` });
    }

    req.user.promotionRequest = {
      requestedRole,
      message: String(message || '').trim() || null,
      status: 'pending',
      requestedAt: new Date(),
      decidedAt: null,
      decidedBy: null,
      requestedBy: req.user.id,
    };
    await req.user.save();

    return res.status(201).json({
      message: 'Promotion request sent to admin',
      promotionRequest: req.user.promotionRequest,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  searchAll,
  getLeaderboard,
  getPublicTournaments,
  getMatchSchedule,
  getMyNotifications,
  setFavorite,
  getMyFavorites,
  getMyPlayerProfile,
  getMyPromotionRequest,
  requestPromotion,
};
