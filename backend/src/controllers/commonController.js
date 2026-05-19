const { Tournament, Team, PlayerProfile, Match, Notification, Favorite, PromotionRequest, TeamPlayer, User } = require('../models');
const { getTournamentLeaderboard } = require('../services/leaderboardService');
const { fetchGlobalMatches, fetchOrganizedMatches } = require('../services/liveFeedService');

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

    const force = req.query.force === 'true';
    const [globalRaw, organized] = await Promise.all([
      fetchGlobalMatches(force),
      fetchOrganizedMatches(),
    ]);

    // Cross-deduplicate: if a match is in 'organized', remove its fuzzy equivalent from 'global'
    const organizedKeys = new Set(organized.map(m => {
      const timeKey = m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0;
      return `${String(m.team1.name).toLowerCase()}-${String(m.team2.name).toLowerCase()}-${timeKey}`;
    }));

    const global = globalRaw.filter(m => {
      const timeKey = m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0;
      const fuzzyKey = `${String(m.team1.name).toLowerCase()}-${String(m.team2.name).toLowerCase()}-${timeKey}`;
      return !organizedKeys.has(fuzzyKey);
    });

    return res.json({ global, organized });
  } catch (error) {
    return next(error);
  }
};

const getGlobalMatches = async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const matches = await fetchGlobalMatches(force);
    res.json(matches);
  } catch (error) {
    next(error);
  }
};

const getOrganizedMatches = async (req, res, next) => {
  try {
    const matches = await fetchOrganizedMatches();
    res.json(matches);
  } catch (error) {
    next(error);
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

    // Get teams the player is part of
    const teamLinks = await TeamPlayer.find({ playerProfileId: profile._id }).populate('teamId', 'name shortCode');
    const teams = teamLinks.map(tl => tl.teamId).filter(Boolean);

    // Get teams where player is captain
    const captainedTeams = await Team.find({ captainId: req.user.id }).select('name shortCode inviteCode');

    return res.json({
      ...profile.toObject(),
      teams,
      captainedTeams
    });
  } catch (error) {
    return next(error);
  }
};

const updateMyPlayerProfile = async (req, res, next) => {
  try {
    const { bio } = req.body;
    let profile = await PlayerProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    
    if (bio !== undefined) {
      profile.bio = String(bio).trim();
    }
    await profile.save();
    
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const getMyPromotionRequest = async (req, res, next) => {
  try {
    const request = await PromotionRequest.findOne({ userId: req.user.id }).sort({ requestedAt: -1 });
    return res.json({
      promotionRequest: request || null,
      role: req.user.role,
      approvalStatus: req.user.approvalStatus,
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

    const existing = await PromotionRequest.findOne({ userId: req.user.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending request' });
    }

    const request = await PromotionRequest.create({
      userId: req.user.id,
      requestedRole,
      message: String(message || '').trim() || null,
      status: 'pending',
      requestedAt: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin:global').emit('admin:update', { type: 'promotion_requested', data: { request, user: req.user } });
    }

    return res.status(201).json({
      message: 'Promotion request sent to admin',
      promotionRequest: request,
    });
  } catch (error) {
    return next(error);
  }
};

const getTeamByInviteCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.params;
    const team = await Team.findOne({ inviteCode }).populate('organizerId', 'fullName');
    if (!team) return res.status(404).json({ message: 'Invalid invite code' });
    res.json(team);
  } catch (error) {
    next(error);
  }
};

const joinTeamByInviteCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.params;
    const team = await Team.findOne({ inviteCode })
      .populate('organizerId', 'fullName')
      .populate('captainId', 'fullName');
    if (!team) return res.status(404).json({ message: 'Invalid invite code' });

    // Check team size
    const memberCount = await TeamPlayer.countDocuments({ teamId: team.id });
    if (memberCount >= 15) {
      return res.status(400).json({ message: 'Squad is full, contact team captain' });
    }

    // Check if player profile exists
    let profile = await PlayerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = await PlayerProfile.create({
        userId: req.user.id,
        playerRole: req.body.playerRole || 'all-rounder'
      });
    }

    // Strict one-team rule: Block if already in ANY team
    const inOtherTeam = await TeamPlayer.findOne({ playerProfileId: profile.id }).populate('teamId');
    if (inOtherTeam) {
      return res.status(400).json({ 
        message: `Athlete is already a member of ${inOtherTeam.teamId?.name || 'another team'}. They must be removed from their current team before joining a new one.` 
      });
    }

    const teamPlayer = await TeamPlayer.create({
      teamId: team.id,
      playerProfileId: profile.id,
      status: req.user.role === 'player' ? 'active' : 'bench'
    });

    // If user is not yet a player, create promotion request
    if (req.user.role !== 'player') {
      const request = await PromotionRequest.create({
        userId: req.user.id,
        requestedRole: 'player',
        message: `Requested entry to ${team.name}. Promotion advised by Captain ${team.captainId?.fullName || 'N/A'} and Organizer ${team.organizerId?.fullName}.`,
        advisedBy: team.organizerId?._id || team.organizerId,
        status: 'pending'
      });

      // Admin notification
      await Notification.create({
        userId: null,
        scope: 'admin',
        title: 'New Player Promotion Request',
        message: `${req.user.fullName} joined ${team.name} and requested player promotion.`,
        type: 'promotion_request'
      });

      const io = req.app.get('io');
      if (io) {
        io.to('admin:global').emit('admin:update', { 
          type: 'promotion_requested', 
          data: { request, user: req.user, teamName: team.name } 
        });
      }
    }
    
    // Notify Organizer
    const io = req.app.get('io');
    if (io) {
      io.to(`organizer:${team.organizerId}`).emit('organizer:update', { 
        type: 'team_player_added', 
        data: { teamId: team.id, teamName: team.name, player: req.user.fullName } 
      });
    }

    res.status(201).json({ success: true, teamPlayer });
  } catch (error) {
    next(error);
  }
};

const getTeamPlayers = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const players = await TeamPlayer.find({ teamId })
      .populate({
        path: 'playerProfileId',
        populate: { path: 'userId', select: 'fullName email phone' }
      });
    
    // Map to a cleaner format for the frontend
    const formatted = players.map(tp => ({
      id: tp.playerProfileId?._id,
      userId: {
        name: tp.playerProfileId?.userId?.fullName,
        email: tp.playerProfileId?.userId?.email
      },
      role: tp.playerProfileId?.playerRole || 'player',
      status: tp.status
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

const removePlayerFromTeam = async (req, res, next) => {
  try {
    const { teamId, profileId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Authorization: Must be Captain or Organizer or Admin
    const isCaptain = String(team.captainId) === String(req.user.id);
    const isOrganizer = String(team.organizerId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isCaptain && !isOrganizer && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to remove players from this squad' });
    }

    await TeamPlayer.deleteOne({ teamId, playerProfileId: profileId });
    
    // Log activity
    const { logActivity } = require('../models');
    await logActivity(req.user.id, 'TEAM_PLAYER_REMOVED', { teamId, profileId });

    // Notify Organizer if it was the captain who did it
    const io = req.app.get('io');
    if (io) {
      io.to(`organizer:${team.organizerId}`).emit('organizer:update', { 
        type: 'team_player_removed', 
        data: { teamId, profileId } 
      });
    }

    res.json({ success: true, message: 'Player removed from roster' });
  } catch (error) {
    next(error);
  }
};

const updatePlayerRole = async (req, res, next) => {
  try {
    const { teamId, profileId } = req.params;
    const { role } = req.body;
    
    if (!['batter', 'bowler', 'all-rounder', 'wicket-keeper'].includes(role)) {
      return res.status(400).json({ message: 'Invalid player role' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Authorization: Must be Captain or Organizer or Admin
    const isCaptain = String(team.captainId) === String(req.user.id);
    const isOrganizer = String(team.organizerId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isCaptain && !isOrganizer && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to edit player roles' });
    }

    // Ensure the player is actually in the team
    const teamPlayer = await TeamPlayer.findOne({ teamId, playerProfileId: profileId });
    if (!teamPlayer) {
      return res.status(404).json({ message: 'Player not found in this team' });
    }

    const updatedProfile = await PlayerProfile.findByIdAndUpdate(
      profileId,
      { playerRole: role },
      { new: true }
    );

    res.json({ success: true, message: 'Player role updated', playerRole: updatedProfile.playerRole });
  } catch (error) {
    next(error);
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
  updateMyPlayerProfile,
  getMyPromotionRequest,
  requestPromotion,
  getTeamByInviteCode,
  joinTeamByInviteCode,
  getGlobalMatches,
  getOrganizedMatches,
  getTeamPlayers,
  removePlayerFromTeam,
  updatePlayerRole,
};
