const { User, PlayerProfile, Tournament, Notification, ActivityLog, MatchComment, logActivity } = require('../models');

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .populate('promotionRequest.decidedBy', 'fullName email')
      .populate('promotionRequest.requestedBy', 'fullName email role')
      .sort({ createdAt: -1 });
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
    user.approvalStatus = role === 'organizer' ? 'approved' : 'approved';
    user.promotionRequest = {
      requestedRole: null,
      message: null,
      status: null,
      requestedAt: null,
      decidedAt: new Date(),
      decidedBy: req.user.id,
    };
    await user.save();

    if (role === 'player') {
      const profile = await PlayerProfile.findOne({ userId: user.id });
      if (!profile) {
        await PlayerProfile.create({ userId: user.id, playerRole: 'all-rounder' });
      }
    }

    await logActivity(req.user.id, 'ADMIN_UPDATE_USER_ROLE', { userId: user.id, role });

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const decidePromotionRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { decision, role } = req.body;

    if (!['approved', 'rejected'].includes(String(decision || '').toLowerCase())) {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.promotionRequest || user.promotionRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending promotion request for this user' });
    }

    const requestedRole = user.promotionRequest.requestedRole;

    if (decision === 'approved') {
      const targetRole = role || requestedRole;
      if (!['organizer', 'player', 'umpire'].includes(targetRole)) {
        return res.status(400).json({ message: 'Approved role must be organizer, player, or umpire' });
      }

      user.role = targetRole;
      if (targetRole === 'organizer') {
        user.approvalStatus = 'approved';
      }
      if (targetRole === 'player') {
        const profile = await PlayerProfile.findOne({ userId: user.id });
        if (!profile) {
          await PlayerProfile.create({ userId: user.id, playerRole: 'all-rounder' });
        }
      }
    }

    user.promotionRequest.status = decision;
    user.promotionRequest.decidedAt = new Date();
    user.promotionRequest.decidedBy = req.user.id;
    await user.save();

    await logActivity(req.user.id, 'ADMIN_DECIDE_PROMOTION_REQUEST', {
      userId: user.id,
      decision,
      requestedRole,
      appliedRole: user.role,
    });

    return res.json(user);
  } catch (error) {
    return next(error);
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
    const tournaments = await Tournament.find({}).sort({ createdAt: -1 });
    res.json(tournaments);
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
};
