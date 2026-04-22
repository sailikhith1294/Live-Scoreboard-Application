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
  getMyPromotionRequest,
  requestPromotion,
} = require('../controllers/commonController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/search', searchAll);
router.get('/tournaments', getPublicTournaments);
router.get('/schedules', getMatchSchedule);
router.get('/tournaments/:tournamentId/leaderboard', getLeaderboard);
router.get('/notifications', authenticate, getMyNotifications);
router.get('/favorites', authenticate, getMyFavorites);
router.post('/favorites', authenticate, setFavorite);
router.get('/me/player-profile', authenticate, getMyPlayerProfile);
router.get('/me/promotion-request', authenticate, getMyPromotionRequest);
router.post('/me/promotion-request', authenticate, requestPromotion);

module.exports = router;
