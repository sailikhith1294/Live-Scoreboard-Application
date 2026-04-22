const express = require('express');
const {
  addBallEvent,
  logUmpireDecision,
  getScorecard,
  listLiveMatches,
  addComment,
  listComments,
  toggleLike,
  getPlayerProfile,
} = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/live', listLiveMatches);
router.get('/:matchId/scorecard', getScorecard);
router.get('/players/:playerId/profile', getPlayerProfile);
router.get('/:matchId/comments', listComments);

router.post('/:matchId/comments', authenticate, addComment);
router.post('/:matchId/likes', authenticate, toggleLike);
router.post('/:matchId/balls', authenticate, authorize('umpire'), addBallEvent);
router.post('/:matchId/balls/:ballEventId/decisions', authenticate, authorize('umpire'), logUmpireDecision);

module.exports = router;
