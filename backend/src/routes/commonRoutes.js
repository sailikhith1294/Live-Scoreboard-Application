const express = require('express');
const {
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
} = require('../controllers/commonController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/search', searchAll);
router.get('/tournaments', getPublicTournaments);
router.get('/schedules', getMatchSchedule);
router.get('/matches/global', getGlobalMatches);
router.get('/matches/organized', getOrganizedMatches);
router.get('/tournaments/:tournamentId/leaderboard', getLeaderboard);
router.get('/notifications', getMyNotifications); // Make notifications public (handled in controller)
router.get('/favorites', authenticate, getMyFavorites);
router.post('/favorites', authenticate, setFavorite);
router.get('/me/player-profile', authenticate, getMyPlayerProfile);
router.put('/me/player-profile', authenticate, updateMyPlayerProfile);
router.get('/me/promotion-request', authenticate, getMyPromotionRequest);
router.post('/me/promotion-request', authenticate, requestPromotion);
router.get('/teams/invite/:inviteCode', getTeamByInviteCode);
router.post('/teams/join/:inviteCode', authenticate, joinTeamByInviteCode);
router.get('/teams/:teamId/players', getTeamPlayers);
router.delete('/teams/:teamId/players/:profileId', authenticate, removePlayerFromTeam);
router.put('/teams/:teamId/players/:profileId/role', authenticate, updatePlayerRole);

module.exports = router;
