const mongoose = require('mongoose');
const { connectMongo } = require('../config/db');

const schemaOptions = { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } };

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'organizer', 'player', 'viewer', 'umpire'], default: 'viewer' },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    isActive: { type: Boolean, default: true },
    needsPasswordChange: { type: Boolean, default: false },
  },
  schemaOptions
);
userSchema.index({ email: 1 }, { unique: true, sparse: true });

const playerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    playerId: {
      type: String,
      unique: true,
      default: () => `PLY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
    playerRole: {
      type: String,
      enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper', null],
      default: null,
    },
    availabilityStatus: { type: String, enum: ['available', 'unavailable'], default: 'available' },
    careerRuns: { type: Number, default: 0 },
    careerWickets: { type: Number, default: 0 },
    careerStrikeRate: { type: Number, default: 0 },
    careerEconomy: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalBallsFaced: { type: Number, default: 0 },
    totalBallsBowled: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
  },
  schemaOptions
);

const tournamentSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    format: { type: String, enum: ['T20', 'ODI', 'CUSTOM'], required: true },
    location: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    status: { type: String, enum: ['draft', 'upcoming', 'live', 'completed'], default: 'draft' },
    rules: { type: Object, default: {} },
    tournamentCode: { type: String, default: () => `TRN-${Math.floor(1000 + Math.random() * 9000)}` },
  },
  schemaOptions
);

const venueSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    name: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, default: null },
  },
  schemaOptions
);

const teamSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    shortCode: { type: String, default: null },
    logoUrl: { type: String, default: null },
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    inviteCode: { type: String, unique: true, default: () => Math.random().toString(36).substring(2, 10).toUpperCase() },
  },
  schemaOptions
);

const teamPlayerSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    playerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlayerProfile', required: true },
    isSubstitute: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'bench'], default: 'active' },
  },
  schemaOptions
);

const matchSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
    homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
    umpireId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    legUmpireId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    scorerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tossWinnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    matchNo: { type: String, default: () => `M-${Math.floor(Math.random() * 99999)}` },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'abandoned', 'delayed'], default: 'scheduled' },
    oversLimit: { type: Number, default: 20 },
    powerplayOvers: { type: Number, default: 6 },
    tossDecision: { type: String, enum: ['bat', 'bowl'], default: null },
    homeSquad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PlayerProfile' }],
    awaySquad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PlayerProfile' }],
    innings: { type: Number, default: 1 },
    currentRuns: { type: Number, default: 0 },
    currentWickets: { type: Number, default: 0 },
    currentOver: { type: Number, default: 0 },
    currentBall: { type: Number, default: 0 },
    commentaryEnabled: { type: Boolean, default: true },
    externalId: { type: String },
    source: { type: String, default: 'organized' },
    team1Data: { type: Object, default: null }, // For API matches
    team2Data: { type: Object, default: null }, // For API matches
    scorecardData: { type: Object, default: null }, // Cached scorecard info
    lastFetchedAt: { type: Date, default: Date.now },
    venue: { type: String, default: null },
    format: { type: String, default: null },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    resultType: { type: String, enum: ['normal', 'tie', 'no_result', 'abandoned'], default: 'normal' },
    activeStrikerData: { type: Object, default: null }, // { id, name, runs, balls }
    activeNonStrikerData: { type: Object, default: null }, // { id, name, runs, balls }
    activeBowlerData: { type: Object, default: null }, // { id, name, overs, runs, wickets }
  },
  schemaOptions
);
matchSchema.index({ externalId: 1 }, { unique: true, sparse: true });

const scorecardSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    summary: { type: Object, default: {} },
  },
  schemaOptions
);

const ballEventSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    innings: { type: Number, required: true },
    overNumber: { type: Number, required: true },
    ballNumber: { type: Number, required: true },
    batsmanRuns: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    extraType: { type: String, enum: ['none', 'wide', 'no-ball', 'bye', 'leg-bye', 'penalty'], default: 'none' },
    isWicket: { type: Boolean, default: false },
    wicketType: { type: String, default: null },
    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlayerProfile', default: null },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlayerProfile', default: null },
    commentary: { type: String, default: null },
    eventTs: { type: Date, default: Date.now },
  },
  schemaOptions
);

const umpireDecisionSchema = new mongoose.Schema(
  {
    ballEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'BallEvent', required: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    umpireId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decisionType: { type: String, enum: ['out', 'wide', 'no-ball', 'not-out', 'dead-ball'], required: true },
    remarks: { type: String, default: null },
    decisionTs: { type: Date, default: Date.now },
  },
  schemaOptions
);

const leaderboardSchema = new mongoose.Schema(
  {
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    runsFor: { type: Number, default: 0 },
    oversFaced: { type: Number, default: 0 },
    runsAgainst: { type: Number, default: 0 },
    oversBowled: { type: Number, default: 0 },
    netRunRate: { type: Number, default: 0 },
  },
  schemaOptions
);
leaderboardSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

const notificationSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'team', 'player'], default: 'global' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  },
  schemaOptions
);

const matchCommentSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isModerated: { type: Boolean, default: false },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  },
  schemaOptions
);

const matchLikeSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  schemaOptions
);
matchLikeSchema.index({ matchId: 1, userId: 1 }, { unique: true });

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['team', 'player'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  schemaOptions
);
favoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    metadata: { type: Object, default: {} },
  },
  schemaOptions
);

const otpCodeSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: ['signup', 'login'], required: true },
    channel: { type: String, enum: ['email', 'mobile'], required: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
  },
  schemaOptions
);
otpCodeSchema.index({ purpose: 1, channel: 1, email: 1, phone: 1, createdAt: -1 });
otpCodeSchema.index({ expiresAt: 1 });

const promotionRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedRole: { type: String, enum: ['player', 'organizer', 'umpire'], required: true },
    message: { type: String, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    advisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedAt: { type: Date, default: Date.now },
    handledAt: { type: Date, default: null },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  schemaOptions
);

const User = mongoose.model('User', userSchema);
const PlayerProfile = mongoose.model('PlayerProfile', playerProfileSchema);
const Tournament = mongoose.model('Tournament', tournamentSchema);
const Venue = mongoose.model('Venue', venueSchema);
const Team = mongoose.model('Team', teamSchema);
const TeamPlayer = mongoose.model('TeamPlayer', teamPlayerSchema);
const Match = mongoose.model('Match', matchSchema);
const Scorecard = mongoose.model('Scorecard', scorecardSchema);
const BallEvent = mongoose.model('BallEvent', ballEventSchema);
const UmpireDecision = mongoose.model('UmpireDecision', umpireDecisionSchema);
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const MatchComment = mongoose.model('MatchComment', matchCommentSchema);
const MatchLike = mongoose.model('MatchLike', matchLikeSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
const OtpCode = mongoose.model('OtpCode', otpCodeSchema);
const PromotionRequest = mongoose.model('PromotionRequest', promotionRequestSchema);

const logActivity = async (userId, action, metadata = {}) => {
  await ActivityLog.create({ userId, action, metadata });
};

const cleanupLegacyIndexes = async () => {
  try {
    const indexes = await User.collection.indexes();
    const legacyNames = ['username_1_accountType_1', 'username_1'];

    for (const name of legacyNames) {
      if (indexes.some((idx) => idx.name === name)) {
        await User.collection.dropIndex(name);
      }
    }
  } catch (_) {
    // Keep startup resilient even if index cleanup is not needed.
  }
};

const syncDatabase = async () => {
  await connectMongo();
  await cleanupLegacyIndexes();
  await User.syncIndexes();
};

module.exports = {
  User,
  PlayerProfile,
  Tournament,
  Venue,
  Team,
  TeamPlayer,
  Match,
  Scorecard,
  BallEvent,
  UmpireDecision,
  Leaderboard,
  Notification,
  MatchComment,
  MatchLike,
  Favorite,
  ActivityLog,
  OtpCode,
  PromotionRequest,
  logActivity,
  syncDatabase,
};
