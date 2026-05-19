const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  Tournament,
  Venue,
  Team,
  TeamPlayer,
  PlayerProfile,
  Match,
  User,
  Notification,
  Scorecard,
  BallEvent,
  UmpireDecision,
  Leaderboard,
  logActivity,
} = require('../models');
const { buildTournamentExcel, buildMatchPdf } = require('../services/reportService');
const { fetchMergedMatches } = require('../services/liveFeedService');

const MATCH_BUFFER_MINUTES = 150;

const isAdminUser = (user) => String(user?.role || '').toLowerCase() === 'admin';

const hasObjectIdMatch = (left, right) => String(left || '') === String(right || '');

const broadcastOrganizerUpdate = (req, type, data) => {
  const io = req.app.get('io');
  if (io) {
    if (req.user && req.user.id) {
      io.to(`organizer:${req.user.id}`).emit('organizer:update', { type, data });
    }
    io.to('organizer:global').emit('organizer:update', { type, data, global: true });
  }
};

const getWindowBounds = (scheduledAt) => {
  const center = new Date(scheduledAt).getTime();
  const bufferMs = MATCH_BUFFER_MINUTES * 60 * 1000;
  return {
    from: new Date(center - bufferMs),
    to: new Date(center + bufferMs),
  };
};

const validateMatchCreationRules = async ({ req, tournamentId, homeTeamId, awayTeamId, scheduledAt, venueId = null }) => {
  if (!tournamentId || !homeTeamId || !awayTeamId || !scheduledAt) {
    return { ok: false, status: 400, message: 'tournamentId, homeTeamId, awayTeamId and scheduledAt are required' };
  }

  if (hasObjectIdMatch(homeTeamId, awayTeamId)) {
    return { ok: false, status: 400, message: 'Home and away teams must be different' };
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    return { ok: false, status: 400, message: 'scheduledAt must be a valid datetime' };
  }

  if (when.getTime() < Date.now() - 365 * 24 * 60 * 60 * 1000) {
    return { ok: false, status: 400, message: 'Match cannot be scheduled more than a year in the past' };
  }

  const [tournament, homeTeam, awayTeam] = await Promise.all([
    Tournament.findById(tournamentId),
    Team.findById(homeTeamId),
    Team.findById(awayTeamId),
  ]);

  if (!tournament) return { ok: false, status: 404, message: 'Tournament not found' };
  if (!homeTeam || !awayTeam) return { ok: false, status: 404, message: 'One or both teams not found' };

  if (!isAdminUser(req.user)) {
    if (!hasObjectIdMatch(tournament.organizerId, req.user.id)) {
      return { ok: false, status: 403, message: 'You can only create matches for your tournaments' };
    }
    if (!hasObjectIdMatch(homeTeam.organizerId, req.user.id) || !hasObjectIdMatch(awayTeam.organizerId, req.user.id)) {
      return { ok: false, status: 403, message: 'You can only schedule your own teams' };
    }
  }

  const dayStart = new Date(when);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(when);
  dayEnd.setHours(23, 59, 59, 999);

  const duplicateFixture = await Match.findOne({
    tournamentId,
    status: { $ne: 'abandoned' },
    scheduledAt: { $gte: dayStart, $lte: dayEnd },
    $or: [
      { homeTeamId, awayTeamId },
      { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
    ],
  });

  if (duplicateFixture) {
    return { ok: false, status: 409, message: 'This fixture is already scheduled for the selected day' };
  }

  const { from, to } = getWindowBounds(when);

  const teamConflict = await Match.findOne({
    status: { $in: ['scheduled', 'live'] },
    scheduledAt: { $gte: from, $lte: to },
    $or: [
      { homeTeamId },
      { awayTeamId },
      { homeTeamId: awayTeamId },
      { awayTeamId: awayTeamId },
    ],
  });

  if (teamConflict) {
    return { ok: false, status: 409, message: 'A selected team has another nearby match and cannot play simultaneously' };
  }

  if (venueId) {
    const venueConflict = await Match.findOne({
      venueId,
      status: { $in: ['scheduled', 'live'] },
      scheduledAt: { $gte: from, $lte: to },
    });

    if (venueConflict) {
      return { ok: false, status: 409, message: 'Venue already has a nearby scheduled/live match' };
    }
  }

  if (req.body.umpireId) {
    const umpireConflict = await Match.findOne({
      umpireId: req.body.umpireId,
      status: { $in: ['scheduled', 'live'] },
      scheduledAt: { $gte: from, $lte: to },
    });
    if (umpireConflict) {
      return { ok: false, status: 409, message: 'Assigned umpire already has a nearby match' };
    }
  }

  return { ok: true, tournament, homeTeam, awayTeam };
};

const createTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.create({ ...req.body, organizerId: req.user.id });
    await logActivity(req.user.id, 'ORG_CREATE_TOURNAMENT', { tournamentId: tournament.id });
    broadcastOrganizerUpdate(req, 'tournament_created', tournament);
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
};

const updateTournamentRules = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOne({ _id: req.params.tournamentId, organizerId: req.user.id });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    tournament.rules = req.body.rules || tournament.rules;
    await tournament.save();
    await logActivity(req.user.id, 'ORG_UPDATE_TOURNAMENT_RULES', { tournamentId: tournament.id });
    broadcastOrganizerUpdate(req, 'tournament_updated', tournament);

    res.json(tournament);
  } catch (error) {
    next(error);
  }
};

const createVenue = async (req, res, next) => {
  try {
    const venue = await Venue.create(req.body);
    await logActivity(req.user.id, 'ORG_CREATE_VENUE', { venueId: venue.id });
    broadcastOrganizerUpdate(req, 'venue_created', venue);
    res.status(201).json(venue);
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const team = await Team.create({ ...req.body, organizerId: req.user.id });
    await logActivity(req.user.id, 'ORG_CREATE_TEAM', { teamId: team.id });
    broadcastOrganizerUpdate(req, 'team_created', team);
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
};

const listManagedPlayers = async (req, res, next) => {
  try {
    const teams = await Team.find({ organizerId: req.user.id }).select('_id');
    const teamIds = teams.map((team) => team.id);

    const teamPlayers = await TeamPlayer.find({ teamId: { $in: teamIds } })
      .populate('teamId', 'name shortCode')
      .populate({
        path: 'playerProfileId',
        populate: { path: 'userId', select: 'fullName email phone role approvalStatus' },
      })
      .sort({ createdAt: -1 });

    const players = teamPlayers.map((entry) => ({
      id: entry.playerProfileId?._id || entry.playerProfileId?.id,
      playerId: entry.playerProfileId?.playerId,
      playerRole: entry.playerProfileId?.playerRole,
      availabilityStatus: entry.playerProfileId?.availabilityStatus,
      user: entry.playerProfileId?.userId || null,
      team: entry.teamId || null,
      isSubstitute: entry.isSubstitute,
      status: entry.status,
      careerRuns: entry.playerProfileId?.careerRuns || 0,
      careerWickets: entry.playerProfileId?.careerWickets || 0,
      careerStrikeRate: entry.playerProfileId?.careerStrikeRate || 0,
      careerEconomy: entry.playerProfileId?.careerEconomy || 0,
    }));

    return res.json(players);
  } catch (error) {
    return next(error);
  }
};

const addPlayerToTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { playerProfileId, playerId, isSubstitute = false } = req.body;

    let profile = null;
    if (playerProfileId) {
      profile = await PlayerProfile.findById(playerProfileId);
    }
    if (!profile && playerId) {
      profile = await PlayerProfile.findOne({ playerId });
    }

    if (!profile) {
      return res.status(404).json({ message: 'Player profile not found' });
    }

    // Strict one-team rule: Block if player is already in ANY team
    const existingMembership = await TeamPlayer.findOne({ playerProfileId: profile.id }).populate('teamId');
    if (existingMembership) {
      return res.status(400).json({ 
        message: `Athlete is already a member of ${existingMembership.teamId?.name || 'another team'}. They must be removed from their current team before joining a new one.` 
      });
    }

    const teamPlayer = await TeamPlayer.create({ teamId, playerProfileId: profile.id, status: 'active' });
    await logActivity(req.user.id, 'ORG_ADD_PLAYER_TO_TEAM', { teamId, profileId: profile.id });
    broadcastOrganizerUpdate(req, 'team_player_added', { teamId, profileId: profile.id });

    res.status(201).json(teamPlayer);
  } catch (error) {
    next(error);
  }
};

const assignTeamCaptain = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { identifier } = req.body; // Can be userId or playerId

    const team = await Team.findOne({ _id: teamId, organizerId: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found or unauthorized' });

    let targetUser = null;

    // Check if it's a Player ID
    if (String(identifier).startsWith('PLY-')) {
      const profile = await PlayerProfile.findOne({ playerId: identifier }).populate('userId');
      if (!profile) return res.status(404).json({ message: 'Player ID not found' });
      targetUser = profile.userId;
    } else {
      // Assume User ID
      targetUser = await User.findById(identifier);
    }

    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    team.captainId = targetUser._id;
    await team.save();

    let promotionMessage = '';
    // If not a player, suggest promotion
    if (targetUser.role !== 'player') {
      const existingRequest = await PromotionRequest.findOne({ userId: targetUser._id, status: 'pending' });
      if (!existingRequest) {
        await PromotionRequest.create({
          userId: targetUser._id,
          requestedRole: 'player',
          message: `Proposed as Captain for ${team.name} by ${req.user.fullName}`,
          status: 'pending'
        });

        // Admin notification
        await Notification.create({
          userId: null,
          scope: 'admin',
          title: 'Captain Promotion Proposed',
          message: `${req.user.fullName} proposed ${targetUser.fullName} for player promotion (Captain role).`,
          type: 'promotion_request'
        });

        const io = req.app.get('io');
        if (io) {
          io.to('admin:global').emit('admin:update', { 
            type: 'promotion_requested', 
            data: { user: targetUser, teamName: team.name } 
          });
        }
        promotionMessage = 'User suggested for player promotion.';
      }
    }

    await logActivity(req.user.id, 'ORG_ASSIGN_CAPTAIN', { teamId, captainId: targetUser._id });
    // Auto-sync captain to roster
    const profileForRoster = await PlayerProfile.findOne({ userId: targetUser._id });
    if (profileForRoster) {
      // Strict one-team rule: Check if they are in another team
      const currentMembership = await TeamPlayer.findOne({ playerProfileId: profileForRoster._id }).populate('teamId');
      
      if (currentMembership && String(currentMembership.teamId?._id || currentMembership.teamId) !== String(teamId)) {
        return res.status(400).json({ 
          message: `This athlete is already signed to ${currentMembership.teamId?.name || 'another squad'}. Remove them from their current team first.` 
        });
      }

      if (!currentMembership) {
        await TeamPlayer.create({ teamId, playerProfileId: profileForRoster._id, status: 'active' });
        broadcastOrganizerUpdate(req, 'team_player_added', { teamId, profileId: profileForRoster._id });
      }
    }

    broadcastOrganizerUpdate(req, 'team_updated', team);

    res.json({
      team,
      message: `Captain assigned. ${promotionMessage}`
    });
  } catch (error) {
    next(error);
  }
};

const createPlayerManually = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      playerRole = 'all-rounder',
      teamId = null,
      isSubstitute = false,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'fullName is required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: 'email or phone is required to create a player account' });
    }

    const normalizedEmail = String(email || '').trim().toLowerCase() || null;
    const normalizedPhone = String(phone || '').trim() || null;

    const existingUser = await User.findOne({
      $or: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({ message: 'A user already exists with this email or phone' });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: 'player',
      approvalStatus: 'approved',
      needsPasswordChange: true,
    });

    const profile = await PlayerProfile.create({
      userId: user.id,
      playerRole,
      availabilityStatus: 'available',
    });

    let teamPlayer = null;
    if (teamId) {
      teamPlayer = await TeamPlayer.create({
        teamId,
        playerProfileId: profile.id,
        isSubstitute,
        status: isSubstitute ? 'bench' : 'active',
      });
    }

    await logActivity(req.user.id, 'ORG_CREATE_PLAYER_MANUAL', {
      userId: user.id,
      profileId: profile.id,
      teamId,
    });
    broadcastOrganizerUpdate(req, 'player_created', profile);

    return res.status(201).json({
      user,
      profile,
      teamPlayer,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    next(error);
  }
};

const approvePlayerAndGenerateId = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const profile = await PlayerProfile.findById(profileId);

    if (!profile) {
      return res.status(404).json({ message: 'Player profile not found' });
    }

    profile.playerId = `PLY-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999)}`;
    await profile.save();

    await logActivity(req.user.id, 'ORG_APPROVE_PLAYER', { profileId });
    broadcastOrganizerUpdate(req, 'player_approved', profile);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const suggestUmpire = async (req, res, next) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required to suggest an umpire' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found for umpire suggestion' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ message: 'Admin users cannot be promoted as umpires' });
    }

    if (targetUser.role === 'umpire') {
      return res.status(409).json({ message: 'User is already an umpire' });
    }

    if (targetUser.promotionRequest?.status === 'pending') {
      return res.status(409).json({ message: 'User already has a pending promotion request' });
    }

    targetUser.promotionRequest = {
      requestedRole: 'umpire',
      message: String(message || '').trim() || null,
      status: 'pending',
      requestedAt: new Date(),
      decidedAt: null,
      decidedBy: null,
      requestedBy: req.user.id,
    };

    await targetUser.save();

    // Create Notification for Admins
    await Notification.create({
      userId: null,
      scope: 'admin',
      title: 'Umpire Promotion Proposed',
      message: `${req.user.fullName} proposed ${targetUser.fullName} for umpire promotion.`,
      type: 'promotion_request'
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin:global').emit('admin:update', { 
        type: 'promotion_requested', 
        data: { user: targetUser, proposer: req.user } 
      });
    }

    await logActivity(req.user.id, 'ORG_SUGGEST_UMPIRE', { userId: targetUser.id });

    return res.status(201).json({
      message: 'Umpire suggestion sent to admin',
      promotionRequest: targetUser.promotionRequest,
    });
  } catch (error) {
    return next(error);
  }
};

const createMatchManual = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    const validation = await validateMatchCreationRules({
      req,
      tournamentId: payload.tournamentId,
      homeTeamId: payload.homeTeamId,
      awayTeamId: payload.awayTeamId,
      scheduledAt: payload.scheduledAt,
      venueId: payload.venueId || null,
    });

    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const match = await Match.create({ ...payload, source: 'organized' });
    const existing = await Scorecard.findOne({ matchId: match.id });
    if (!existing) {
      await Scorecard.create({ matchId: match.id });
    }
    await logActivity(req.user.id, 'ORG_CREATE_MATCH', { matchId: match.id });
    broadcastOrganizerUpdate(req, 'match_created', match);
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_created', match });
    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
};

const deleteMatchOrFixture = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (!isAdminUser(req.user)) {
      const tournament = await Tournament.findById(match.tournamentId).select('organizerId');
      if (!tournament || !hasObjectIdMatch(tournament.organizerId, req.user.id)) {
        return res.status(403).json({ message: 'You can only delete matches from your tournaments' });
      }
    }

    await Promise.all([
      Scorecard.deleteOne({ matchId: match.id }),
      BallEvent.deleteMany({ matchId: match.id }),
      UmpireDecision.deleteMany({ matchId: match.id }),
    ]);

    await match.deleteOne();
    await logActivity(req.user.id, 'ORG_DELETE_MATCH', { matchId: match.id });
    broadcastOrganizerUpdate(req, 'match_deleted', { matchId: match.id });
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_deleted', matchId: match.id });

    return res.json({ deleted: true, matchId: match.id });
  } catch (error) {
    return next(error);
  }
};

const updateMatchSquads = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const { homeSquad, awaySquad } = req.body;
    if (homeSquad) match.homeSquad = homeSquad;
    if (awaySquad) match.awaySquad = awaySquad;

    await match.save();
    broadcastOrganizerUpdate(req, 'match_updated', match);
    res.json(match);
  } catch (err) { next(err); }
};

const updateMatchStatus = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const requestedStatus = String(req.body.status || '').toLowerCase();
    const normalizedStatus = requestedStatus === 'running' ? 'live' : requestedStatus;
    const allowedStatuses = ['scheduled', 'live', 'completed', 'abandoned'];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'status must be scheduled, live, completed, abandoned, or running' });
    }

    match.status = normalizedStatus;
    if (req.body.winnerId) match.winnerId = req.body.winnerId;
    if (req.body.resultType) match.resultType = req.body.resultType;

    if (normalizedStatus === 'live') {
      const existing = await Scorecard.findOne({ matchId: match.id });
      if (!existing) {
        await Scorecard.create({ matchId: match.id });
      }
    }

    await match.save();
    await logActivity(req.user.id, 'ORG_UPDATE_MATCH_STATUS', { matchId: match.id, status: normalizedStatus });
    
    // REAL RULE: Update leaderboard and player stats when match is completed
    if (normalizedStatus === 'completed') {
      const { updateLeaderboardFromMatch } = require('../services/leaderboardService');
      const { updatePlayerStatsFromMatch } = require('../services/playerStatsService');
      
      try {
        await updateLeaderboardFromMatch(match.id);
        await updatePlayerStatsFromMatch(match.id);
      } catch (err) {
        console.error('Stats synchronization failed:', err);
      }
    }

    broadcastOrganizerUpdate(req, 'match_updated', match);
    const io = req.app.get('io');
    if (io) io.emit('match:global_update', { type: 'match_status', match });

    res.json(match);
  } catch (error) {
    next(error);
  }
};

const generateFixturesAutomatic = async (req, res, next) => {
  try {
    let { tournamentId, teamIds, startAt, intervalMinutes = 180, format = 'round-robin', venueId = null } = req.body;
    
    // Sanitize venueId: Convert empty string to null to prevent BSON casting errors
    if (venueId === '') venueId = null;
    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      return res.status(400).json({ message: 'At least two teams are required' });
    }

    const uniqueTeamIds = [...new Set(teamIds.map((id) => String(id)))];
    if (uniqueTeamIds.length < 2) {
      return res.status(400).json({ message: 'At least two unique teams are required' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Security check
    const { isAdminUser, hasObjectIdMatch } = require('../utils/helpers');
    if (!isAdminUser(req.user) && !hasObjectIdMatch(tournament.organizerId, req.user.id)) {
      return res.status(403).json({ message: 'You can only generate fixtures for your tournament' });
    }

    const startDate = new Date(startAt || Date.now());
    let cursor = new Date(startDate);
    const fixtures = [];

    if (format === 'knockout') {
      // Simple single-elimination round 1
      for (let i = 0; i < uniqueTeamIds.length - 1; i += 2) {
        fixtures.push({
          tournamentId,
          homeTeamId: uniqueTeamIds[i],
          awayTeamId: uniqueTeamIds[i + 1],
          venueId,
          scheduledAt: new Date(cursor),
          source: 'organized',
        });
        cursor = new Date(cursor.getTime() + intervalMinutes * 60 * 1000);
      }
    } else {
      // Circle Method for Balanced Round Robin Scheduling
      let teams = [...uniqueTeamIds];
      const isOdd = teams.length % 2 !== 0;
      if (isOdd) teams.push('BYE'); // Dummy team for rotation

      const n = teams.length;
      const rounds = n - 1;
      const matchesPerRound = n / 2;

      for (let round = 0; round < rounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
          const home = teams[match];
          const away = teams[n - 1 - match];

          if (home !== 'BYE' && away !== 'BYE') {
            fixtures.push({
              tournamentId,
              homeTeamId: home,
              awayTeamId: away,
              venueId,
              scheduledAt: new Date(cursor),
              source: 'organized',
            });
            cursor = new Date(cursor.getTime() + intervalMinutes * 60 * 1000);
          }
        }
        
        // Rotate teams (Circle Method): fix first team, move last to second, shift others
        const last = teams.pop();
        teams.splice(1, 0, last);
      }
    }

    const created = await Match.insertMany(fixtures);
    await logActivity(req.user.id, 'ORG_GENERATE_FIXTURES', { tournamentId, count: created.length });
    broadcastOrganizerUpdate(req, 'fixtures_generated', created);

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

const updateToss = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const { tossWinnerTeamId, tossDecision } = req.body;
    match.tossWinnerTeamId = tossWinnerTeamId;
    match.tossDecision = tossDecision;
    await match.save();

    await logActivity(req.user.id, 'ORG_UPDATE_TOSS', { matchId: match.id, tossWinnerTeamId, tossDecision });
    broadcastOrganizerUpdate(req, 'match_updated', match);

    // GLOBAL SYNC: Immediate update for Live Arena
    const io = req.app.get('io');
    if (io) {
      io.emit('match:global_update', { 
        type: 'match_status', 
        matchId: match.id,
        match 
      });
    }

    res.json(match);
  } catch (error) {
    next(error);
  }
};

const assignOfficials = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const { umpireId, legUmpireId } = req.body;
    const { PromotionRequest } = require('../models');
    let advisoryNote = '';

    const processUmpire = async (uId, label) => {
      if (!uId) return null;
      if (!mongoose.Types.ObjectId.isValid(uId)) return { error: `Invalid ${label} ID format` };
      
      const u = await User.findById(uId);
      if (!u) return { error: `${label} user not found` };

      if (u.role === 'umpire' || u.role === 'admin') {
        return { authorized: true };
      } else {
        // Suggest for promotion
        const existing = await PromotionRequest.findOne({ userId: u._id, requestedRole: 'umpire', status: 'pending' });
        if (!existing) {
          await PromotionRequest.create({
            userId: u._id,
            requestedRole: 'umpire',
            message: `Assigned as ${label} for Match ${match.matchNo} by ${req.user.fullName}.`,
            advisedBy: req.user.id
          });
          
          // Notify Admin
          const io = req.app.get('io');
          if (io) {
            io.to('admin:global').emit('admin:update', { 
              type: 'promotion_requested', 
              data: { user: u, advisedBy: req.user.fullName } 
            });
          }
          advisoryNote += `Promotion request initiated for ${u.fullName} (${label}). `;
        }
        return { pending: true };
      }
    };

    if (umpireId) {
      const res = await processUmpire(umpireId, 'Main Umpire');
      if (res?.error) return res.status(400).json({ message: res.error });
      if (res?.authorized) match.umpireId = umpireId;
    }
    
    if (legUmpireId) {
      const res = await processUmpire(legUmpireId, 'Leg Umpire');
      if (res?.error) return res.status(400).json({ message: res.error });
      if (res?.authorized) match.legUmpireId = legUmpireId;
    }

    await match.save();
    await logActivity(req.user.id, 'ORG_ASSIGN_OFFICIALS', { matchId: match.id, umpireId, legUmpireId });
    broadcastOrganizerUpdate(req, 'match_updated', match);

    res.json({ match, message: advisoryNote || 'Officials assigned successfully' });
  } catch (error) {
    next(error);
  }
};

const notifyPlayers = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { title, message } = req.body;

    const players = await User.find({ role: 'player' });
    const notifications = await Promise.all(
      players.map((player) =>
        Notification.create({
          scope: 'player',
          title,
          message,
          userId: player.id,
          createdBy: req.user.id,
        })
      )
    );

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('notification:players', { title, message, matchId });

    await logActivity(req.user.id, 'ORG_NOTIFY_PLAYERS', { matchId, count: notifications.length });

    res.status(201).json({ sent: notifications.length });
  } catch (error) {
    next(error);
  }
};

const getTournamentSummaryReport = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const matches = await Match.find({ tournamentId: tournament.id })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ scheduledAt: 1 });

    const matchIds = matches.map(m => m._id);
    const leaderboard = await Leaderboard.find({ tournamentId: tournament.id }).populate('teamId');

    // Aggregate Insights
    const [topScorers, topWicketTakers, strikeRates] = await Promise.all([
      // Top Runs
      BallEvent.aggregate([
        { $match: { matchId: { $in: matchIds } } },
        { $group: { _id: '$strikerId', totalRuns: { $sum: '$batsmanRuns' }, balls: { $sum: { $cond: [{ $ne: ['$extraType', 'wide'] }, 1, 0] } } } },
        { $sort: { totalRuns: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'playerprofiles', localField: '_id', foreignField: '_id', as: 'profile' } },
        { $unwind: '$profile' },
        { $lookup: { from: 'users', localField: 'profile.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' }
      ]),
      // Top Wickets
      BallEvent.aggregate([
        { $match: { matchId: { $in: matchIds }, isWicket: true, wicketType: { $nin: ['run out', 'retired hurt', 'retired out'] } } },
        { $group: { _id: '$bowlerId', totalWickets: { $sum: 1 } } },
        { $sort: { totalWickets: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'playerprofiles', localField: '_id', foreignField: '_id', as: 'profile' } },
        { $unwind: '$profile' },
        { $lookup: { from: 'users', localField: 'profile.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' }
      ]),
      // Best Strike Rate (Min 10 balls faced to be meaningful)
      BallEvent.aggregate([
        { $match: { matchId: { $in: matchIds } } },
        { $group: { 
            _id: '$strikerId', 
            totalRuns: { $sum: '$batsmanRuns' }, 
            balls: { $sum: { $cond: [{ $ne: ['$extraType', 'wide'] }, 1, 0] } } 
        } },
        { $match: { balls: { $gte: 10 } } },
        { $project: { strikeRate: { $multiply: [{ $divide: ['$totalRuns', '$balls'] }, 100] }, totalRuns: 1, balls: 1 } },
        { $sort: { strikeRate: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'playerprofiles', localField: '_id', foreignField: '_id', as: 'profile' } },
        { $unwind: '$profile' },
        { $lookup: { from: 'users', localField: 'profile.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' }
      ])
    ]);

    const insights = {
      topScorer: topScorers[0] ? { 
        name: topScorers[0].user.fullName, 
        stats: `${topScorers[0].totalRuns} Runs • ${(topScorers[0].totalRuns / (topScorers[0].balls || 1) * 100).toFixed(1)} SR`
      } : null,
      topWicketTaker: topWicketTakers[0] ? {
        name: topWicketTakers[0].user.fullName,
        stats: `${topWicketTakers[0].totalWickets} Wickets`
      } : null,
      highestStrikeRate: strikeRates[0] ? {
        name: strikeRates[0].user.fullName,
        stats: `${strikeRates[0].strikeRate.toFixed(1)} SR • ${strikeRates[0].totalRuns} Runs`
      } : null
    };

    if ((req.query.format || '').toLowerCase() === 'excel') {
      const buffer = await buildTournamentExcel(tournament, matches, leaderboard);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=tournament-${tournament.id}.xlsx`);
      return res.send(buffer);
    }

    return res.json({ tournament, matches, leaderboard, insights });
  } catch (error) {
    return next(error);
  }
};

const getMatchReport = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const scorecard = await Scorecard.findOne({ matchId: match.id });
    const events = await BallEvent.find({ matchId: match.id }).sort({ createdAt: 1 });

    if ((req.query.format || '').toLowerCase() === 'pdf') {
      const buffer = await buildMatchPdf(match, scorecard, events);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=match-${match.id}.pdf`);
      return res.send(buffer);
    }

    return res.json({ match, scorecard, events });
  } catch (error) {
    return next(error);
  }
};

const getOrganizerDashboard = async (req, res, next) => {
  try {
    const tournamentsPromise = Tournament.find({ organizerId: req.user.id }).sort({ createdAt: -1 });
    const teamsPromise = Team.find({ organizerId: req.user.id });
    const force = req.query.force === 'true';
    const liveFeedPromise = fetchMergedMatches(force);

    const [tournaments, teams, liveFeed] = await Promise.all([
      tournamentsPromise,
      teamsPromise,
      liveFeedPromise,
    ]);

    const tournamentIds = tournaments.map((t) => t.id);
    const venuesPromise = Venue.find({ tournamentId: { $in: tournamentIds } });
    const matchesPromise = Match.find({ tournamentId: { $in: tournamentIds } })
      .populate('homeTeamId', 'name shortCode')
      .populate('awayTeamId', 'name shortCode')
      .populate('tournamentId', 'name tournamentCode')
      .populate('umpireId', 'name')
      .populate('legUmpireId', 'name')
      .sort({ scheduledAt: -1 })
      .limit(50)
      .lean();

    const [venues, matches] = await Promise.all([venuesPromise, matchesPromise]);

    const liveFeedBuckets = {
      live: liveFeed.filter((m) => m.status === 'live').slice(0, 10),
      scheduled: liveFeed.filter((m) => m.status === 'scheduled').slice(0, 10),
      completed: liveFeed.filter((m) => m.status === 'completed').slice(0, 10),
    };

    res.json({ tournaments, teams, venues, matches, liveFeed: liveFeedBuckets });
  } catch (error) {
    next(error);
  }
};

const removePlayerFromTeam = async (req, res, next) => {
  try {
    const { teamId, profileId } = req.params;
    const team = await Team.findById(teamId);
    if (!team || (!isAdminUser(req.user) && !hasObjectIdMatch(team.organizerId, req.user.id))) {
      return res.status(403).json({ message: 'Unauthorized team access' });
    }

    await TeamPlayer.deleteOne({ teamId, playerProfileId: profileId });
    await logActivity(req.user.id, 'ORG_REMOVE_PLAYER_FROM_TEAM', { teamId, profileId });
    broadcastOrganizerUpdate(req, 'team_player_removed', { teamId, profileId });
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const overrideMatchResult = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { winnerId, status, resetScorecard = false } = req.body;
    
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (status) match.status = status;
    if (winnerId) match.winnerId = winnerId;
    
    if (resetScorecard) {
      await Scorecard.findOneAndUpdate({ matchId }, { runs: 0, wickets: 0, overs: 0, extras: 0, summary: {} });
      await BallEvent.deleteMany({ matchId });
    }

    await match.save();
    await logActivity(req.user.id, 'ORG_OVERRIDE_MATCH', { matchId, winnerId, status });
    broadcastOrganizerUpdate(req, 'match_updated', match);
    
    res.json(match);
  } catch (error) {
    next(error);
  }
};

const deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOne({ _id: req.params.tournamentId, organizerId: req.user.id });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found or unauthorized' });

    const matches = await Match.find({ tournamentId: tournament.id });
    const matchIds = matches.map(m => m.id);

    await Promise.all([
      Scorecard.deleteMany({ matchId: { $in: matchIds } }),
      BallEvent.deleteMany({ matchId: { $in: matchIds } }),
      UmpireDecision.deleteMany({ matchId: { $in: matchIds } }),
      Match.deleteMany({ tournamentId: tournament.id }),
      Leaderboard.deleteMany({ tournamentId: tournament.id }),
      Venue.deleteMany({ tournamentId: tournament.id }),
      Notification.deleteMany({ tournamentId: tournament.id })
    ]);

    await tournament.deleteOne();
    await logActivity(req.user.id, 'ORG_DELETE_TOURNAMENT', { tournamentId: tournament.id });
    broadcastOrganizerUpdate(req, 'tournament_deleted', { tournamentId: tournament.id });

    res.json({ success: true, message: 'Tournament and all associated data purged.' });
  } catch (error) { next(error); }
};

const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findOne({ _id: req.params.teamId, organizerId: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found or unauthorized' });

    const activeMatches = await Match.countDocuments({ 
      $or: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      status: { $in: ['live', 'scheduled'] }
    });

    if (activeMatches > 0) {
      return res.status(400).json({ message: 'Cannot delete team with active or scheduled matches' });
    }

    await Promise.all([
      TeamPlayer.deleteMany({ teamId: team.id }),
      Leaderboard.deleteMany({ teamId: team.id })
    ]);

    await team.deleteOne();
    await logActivity(req.user.id, 'ORG_DELETE_TEAM', { teamId: team.id });
    broadcastOrganizerUpdate(req, 'team_deleted', { teamId: team.id });

    res.json({ success: true, message: 'Team purged from registry.' });
  } catch (error) { next(error); }
};

module.exports = {
  createTournament,
  updateTournamentRules,
  createVenue,
  createTeam,
  listManagedPlayers,
  addPlayerToTeam,
  removePlayerFromTeam,
  createPlayerManually,
  approvePlayerAndGenerateId,
  suggestUmpire,
  createMatchManual,
  deleteMatchOrFixture,
  updateMatchStatus,
  generateFixturesAutomatic,
  updateToss,
  assignOfficials,
  notifyPlayers,
  getTournamentSummaryReport,
  getMatchReport,
  getOrganizerDashboard,
  overrideMatchResult,
  assignTeamCaptain,
  updateMatchSquads,
  deleteTournament,
  deleteTeam,
};
