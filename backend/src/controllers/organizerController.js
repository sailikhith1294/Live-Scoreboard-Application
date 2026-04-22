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

  if (when.getTime() < Date.now() + 60 * 1000) {
    return { ok: false, status: 400, message: 'Match must be scheduled in the future' };
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

  return { ok: true, tournament, homeTeam, awayTeam };
};

const createTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.create({ ...req.body, organizerId: req.user.id });
    await logActivity(req.user.id, 'ORG_CREATE_TOURNAMENT', { tournamentId: tournament.id });
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

    res.json(tournament);
  } catch (error) {
    next(error);
  }
};

const createVenue = async (req, res, next) => {
  try {
    const venue = await Venue.create(req.body);
    await logActivity(req.user.id, 'ORG_CREATE_VENUE', { venueId: venue.id });
    res.status(201).json(venue);
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const team = await Team.create({ ...req.body, organizerId: req.user.id });
    await logActivity(req.user.id, 'ORG_CREATE_TEAM', { teamId: team.id });
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

    const teamPlayer = await TeamPlayer.create({ teamId, playerProfileId: profile.id, isSubstitute, status: isSubstitute ? 'bench' : 'active' });
    await logActivity(req.user.id, 'ORG_ADD_PLAYER_TO_TEAM', { teamId, profileId: profile.id });

    res.status(201).json(teamPlayer);
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

    const match = await Match.create(payload);
    const existing = await Scorecard.findOne({ matchId: match.id });
    if (!existing) {
      await Scorecard.create({ matchId: match.id });
    }
    await logActivity(req.user.id, 'ORG_CREATE_MATCH', { matchId: match.id });
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

    return res.json({ deleted: true, matchId: match.id });
  } catch (error) {
    return next(error);
  }
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

    if (normalizedStatus === 'live') {
      const existing = await Scorecard.findOne({ matchId: match.id });
      if (!existing) {
        await Scorecard.create({ matchId: match.id });
      }
    }

    await match.save();
    await logActivity(req.user.id, 'ORG_UPDATE_MATCH_STATUS', { matchId: match.id, status: normalizedStatus });

    res.json(match);
  } catch (error) {
    next(error);
  }
};

const generateFixturesAutomatic = async (req, res, next) => {
  try {
    const { tournamentId, teamIds, startAt, intervalMinutes = 180 } = req.body;
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

    if (!isAdminUser(req.user) && !hasObjectIdMatch(tournament.organizerId, req.user.id)) {
      return res.status(403).json({ message: 'You can only generate fixtures for your tournament' });
    }

    const startDate = new Date(startAt || Date.now());
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ message: 'startAt must be a valid datetime' });
    }
    if (startDate.getTime() < Date.now() + 60 * 1000) {
      return res.status(400).json({ message: 'startAt must be in the future' });
    }

    if (Number(intervalMinutes) < MATCH_BUFFER_MINUTES) {
      return res.status(400).json({ message: `intervalMinutes must be at least ${MATCH_BUFFER_MINUTES}` });
    }

    const fixtures = [];
    let cursor = new Date(startDate);

    for (let i = 0; i < uniqueTeamIds.length; i += 1) {
      for (let j = i + 1; j < uniqueTeamIds.length; j += 1) {
        fixtures.push({
          tournamentId,
          homeTeamId: uniqueTeamIds[i],
          awayTeamId: uniqueTeamIds[j],
          scheduledAt: new Date(cursor),
        });
        cursor = new Date(cursor.getTime() + intervalMinutes * 60 * 1000);
      }
    }

    const created = await Match.insertMany(fixtures);
    await logActivity(req.user.id, 'ORG_GENERATE_FIXTURES', { tournamentId, count: created.length });

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

    const { umpireId } = req.body;
    if (umpireId) {
      const umpireUser = await User.findById(umpireId);
      if (!umpireUser || umpireUser.role !== 'umpire') {
        return res.status(400).json({ message: 'Assigned umpire must be a user with the umpire role' });
      }
      match.umpireId = umpireId;
    }
    await match.save();

    await logActivity(req.user.id, 'ORG_ASSIGN_OFFICIALS', { matchId: match.id, umpireId: match.umpireId });

    res.json(match);
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

    const leaderboard = await Leaderboard.find({ tournamentId: tournament.id }).populate('teamId');

    if ((req.query.format || '').toLowerCase() === 'excel') {
      const buffer = await buildTournamentExcel(tournament, matches, leaderboard);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=tournament-${tournament.id}.xlsx`);
      return res.send(buffer);
    }

    return res.json({ tournament, matches, leaderboard });
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
    const liveFeedPromise = fetchMergedMatches();

    const [tournaments, teams, liveFeed] = await Promise.all([
      tournamentsPromise,
      teamsPromise,
      liveFeedPromise,
    ]);

    const tournamentIds = tournaments.map((t) => t.id);
    const matches = await Match.find({ tournamentId: { $in: tournamentIds } })
      .sort({ scheduledAt: -1 })
      .limit(50);

    const liveFeedBuckets = {
      live: liveFeed.filter((m) => m.status === 'live').slice(0, 10),
      scheduled: liveFeed.filter((m) => m.status === 'scheduled').slice(0, 10),
      completed: liveFeed.filter((m) => m.status === 'completed').slice(0, 10),
    };

    res.json({ tournaments, teams, matches, liveFeed: liveFeedBuckets });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTournament,
  updateTournamentRules,
  createVenue,
  createTeam,
  listManagedPlayers,
  addPlayerToTeam,
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
};
