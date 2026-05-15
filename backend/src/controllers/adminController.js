const { User, PlayerProfile, Tournament, Notification, ActivityLog, MatchComment, Match, BallEvent, TeamPlayer, PromotionRequest, MatchLike, Favorite, OtpCode, logActivity } = require('../models');

const broadcastAdminUpdate = (req, type, data) => {
  const io = req.app.get('io');
  if (io) {
    io.to('admin:global').emit('admin:update', { type, data });
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const approveOrganizer = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const organizer = await User.findById(organizerId);
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    organizer.approvalStatus = status;
    await organizer.save();
    await logActivity(req.user.id, 'ADMIN_ORGANIZER_APPROVAL', { organizerId, status });
    broadcastAdminUpdate(req, 'organizer_approved', organizer);

    return res.json(organizer);
  } catch (error) {
    return next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['viewer', 'organizer', 'player', 'umpire'].includes(role)) {
      return res.status(400).json({ message: 'Role must be viewer, organizer, player, or umpire' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    user.approvalStatus = 'approved';
    await user.save();

    if (role === 'player') {
      const profile = await PlayerProfile.findOne({ userId: user.id });
      if (!profile) {
        await PlayerProfile.create({ userId: user.id, playerRole: 'all-rounder' });
      }
    }

    await logActivity(req.user.id, 'ADMIN_UPDATE_USER_ROLE', { userId: user.id, role });
    broadcastAdminUpdate(req, 'user_role_updated', user);

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const decidePromotionRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { decision } = req.body; // 'approved' or 'rejected'

    const { PromotionRequest } = require('../models');
    const request = await PromotionRequest.findById(requestId).populate('userId').populate('advisedBy', 'fullName');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    const user = request.userId;
    if (decision === 'approved') {
      user.role = request.requestedRole;
      if (user.role === 'player') {
        const profile = await PlayerProfile.findOne({ userId: user.id });
        if (!profile) await PlayerProfile.create({ userId: user.id, playerRole: 'all-rounder' });
      }
      if (user.role === 'organizer') user.approvalStatus = 'approved';
      await user.save();
    }

    request.status = decision;
    request.handledAt = new Date();
    request.handledBy = req.user.id;
    await request.save();

    await logActivity(req.user.id, 'ADMIN_DECIDE_PROMOTION', { requestId, decision, userId: user.id });
    broadcastAdminUpdate(req, 'promotion_handled', { requestId, decision });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

const createTournamentAsAdmin = async (req, res, next) => {
  try {
    const payload = { ...req.body, organizerId: req.body.organizerId || req.user.id };
    const tournament = await Tournament.create(payload);
    await logActivity(req.user.id, 'ADMIN_CREATE_TOURNAMENT', { tournamentId: tournament.id });
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
};

const getAllTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({})
      .populate('organizerId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
};

const getAllMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({ 
      source: { $nin: ['cricapi', 'api-sports'] } 
    })
      .populate({
        path: 'tournamentId',
        select: 'name',
        populate: { path: 'organizerId', select: 'fullName' }
      })
      .populate('homeTeamId', 'name shortCode')
      .populate('awayTeamId', 'name shortCode')
      .populate('umpireId', 'fullName')
      .sort({ scheduledAt: -1 });
    res.json(matches);
  } catch (error) {
    next(error);
  }
};

const deleteMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    // Purge associated data
    const { Scorecard, BallEvent, UmpireDecision } = require('../models');
    await Promise.all([
      Scorecard.deleteMany({ matchId }),
      BallEvent.deleteMany({ matchId }),
      UmpireDecision.deleteMany({ matchId }),
    ]);

    await Match.deleteOne({ _id: matchId });
    await logActivity(req.user.id, 'ADMIN_DELETE_MATCH', { matchId, matchNo: match.matchNo });
    broadcastAdminUpdate(req, 'match_deleted', { matchId });

    // Also broadcast to global feed to update everyone
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_deleted', matchId });

    res.json({ message: 'Match and associated data purged', deleted: true });
  } catch (error) {
    next(error);
  }
};

const deleteTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    // 1. Delete all matches associated with this tournament
    await Match.deleteMany({ tournamentId });
    // 2. Delete the tournament itself
    await Tournament.deleteOne({ _id: tournamentId });

    await logActivity(req.user.id, 'ADMIN_DELETE_TOURNAMENT', { tournamentId, name: tournament.name });
    broadcastAdminUpdate(req, 'tournament_deleted', { tournamentId });

    res.json({ message: 'Tournament and associated matches purged', deleted: true });
  } catch (error) {
    next(error);
  }
};

const getSystemActivity = async (req, res, next) => {
  try {
    const activities = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(250);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

const sendGlobalNotification = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    const notification = await Notification.create({
      scope: 'global',
      title,
      message,
      createdBy: req.user.id,
    });

    await logActivity(req.user.id, 'ADMIN_GLOBAL_NOTIFICATION', { notificationId: notification.id });

    const io = req.app.get('io');
    io.emit('notification:global', notification);

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

const moderateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;

    if (!['visible', 'hidden'].includes(status)) {
      return res.status(400).json({ message: 'status must be visible or hidden' });
    }

    const comment = await MatchComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.status = status;
    comment.isModerated = true;
    await comment.save();

    await logActivity(req.user.id, 'ADMIN_MODERATE_COMMENT', { commentId, status });

    res.json(comment);
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be suspended' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logActivity(req.user.id, 'ADMIN_TOGGLE_USER_STATUS', { userId: user.id, isActive: user.isActive });
    broadcastAdminUpdate(req, 'user_status_toggled', user);

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [userCount, tournamentCount, matchCount, ballCount, organizerCount] = await Promise.all([
      User.countDocuments({}),
      Tournament.countDocuments({}),
      Match.countDocuments({ source: { $nin: ['cricapi', 'api-sports'] } }),
      BallEvent.countDocuments({}),
      User.countDocuments({ role: 'organizer' }),
    ]);

    res.json({
      users: userCount,
      tournaments: tournamentCount,
      matches: matchCount,
      balls: ballCount,
      organizers: organizerCount,
      timestamp: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

const finalizeTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    tournament.status = 'completed';
    await tournament.save();
    
    await logActivity(req.user.id, 'ADMIN_FINALIZE_TOURNAMENT', { tournamentId });
    broadcastAdminUpdate(req, 'tournament_finalized', tournament);
    
    res.json(tournament);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

    // 1. Find PlayerProfile if it exists to clean up TeamPlayer associations
    const playerProfile = await PlayerProfile.findOne({ userId });
    
    // 2. Prepare comprehensive cleanup tasks
    const cleanupTasks = [
      // Core Identity & Auth
      User.deleteOne({ _id: userId }),
      PromotionRequest.deleteMany({ userId }),
      
      // Social & Engagement
      Notification.deleteMany({ userId }),
      MatchComment.deleteMany({ userId }),
      MatchLike.deleteMany({ userId }),
      Favorite.deleteMany({ userId }),
      
      // Infrastructure references (nullify references to keep match history intact)
      Match.updateMany({ umpireId: userId }, { $set: { umpireId: null } }),
      Match.updateMany({ scorerId: userId }, { $set: { scorerId: null } }),
    ];

    // Clean up OTP codes linked to this user's identifiers (email/phone)
    const otpFilter = [];
    if (user.email) otpFilter.push({ email: user.email });
    if (user.phone) otpFilter.push({ phone: user.phone });
    if (otpFilter.length > 0) {
      cleanupTasks.push(OtpCode.deleteMany({ $or: otpFilter }));
    }

    // Clean up Player specific data if applicable
    if (playerProfile) {
      cleanupTasks.push(PlayerProfile.deleteOne({ _id: playerProfile._id }));
      cleanupTasks.push(TeamPlayer.deleteMany({ playerProfileId: playerProfile._id }));
    }

    // Execute all purge operations in parallel
    const results = await Promise.all(cleanupTasks);
    console.log(`[ADMIN_DEBUG] Purge complete for user ${userId}. Deletion results:`, results);

    // Log the purge action
    await logActivity(req.user.id, 'ADMIN_DELETE_USER', { userId: user.id, email: user.email });
    broadcastAdminUpdate(req, 'user_deleted', { userId });
    
    res.json({ 
      message: 'User and all associated data have been permanently purged', 
      deleted: true 
    });
  } catch (error) {
    next(error);
  }
};

const purgeActivityLogs = async (req, res, next) => {
  try {
    await ActivityLog.deleteMany({});
    await logActivity(req.user.id, 'ADMIN_PURGE_LOGS', {});
    broadcastAdminUpdate(req, 'logs_purged', {});
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  approveOrganizer,
  updateUserRole,
  decidePromotionRequest,
  createTournamentAsAdmin,
  getAllTournaments,
  getSystemActivity,
  sendGlobalNotification,
  moderateComment,
  toggleUserStatus,
  getDashboardStats,
  finalizeTournament,
  deleteUser,
  purgeActivityLogs,
  deleteTournament,
  getAllMatches,
  deleteMatch,
};
