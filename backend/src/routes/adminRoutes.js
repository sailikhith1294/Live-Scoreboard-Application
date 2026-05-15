const express = require('express');
const {
  listUsers,
  approveOrganizer,
  updateUserRole,
  decidePromotionRequest,
  createTournamentAsAdmin,
  getAllTournaments,
  getSystemActivity,
  sendGlobalNotification,
  moderateComment,
  getDashboardStats,
  toggleUserStatus,
  finalizeTournament,
  deleteUser,
  purgeActivityLogs,
  deleteTournament,
  getAllMatches,
  deleteMatch,
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.get('/stats', getDashboardStats);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', toggleUserStatus);
router.get('/promotion-requests', (req, res, next) => {
  const { PromotionRequest } = require('../models');
  PromotionRequest.find({ status: 'pending' })
    .populate('userId')
    .populate('advisedBy', 'fullName')
    .sort({ createdAt: -1 })
    .then(r => res.json(r)).catch(next);
});
router.patch('/promotion-requests/:requestId', decidePromotionRequest);
router.patch('/organizers/:organizerId/approval', approveOrganizer);
router.post('/tournaments', createTournamentAsAdmin);
router.get('/tournaments', getAllTournaments);
router.patch('/tournaments/:tournamentId/finalize', finalizeTournament);
router.get('/activity', getSystemActivity);
router.delete('/activity/purge', purgeActivityLogs);
router.delete('/tournaments/:tournamentId', deleteTournament);
router.get('/matches', getAllMatches);
router.delete('/matches/:matchId', deleteMatch);
router.post('/notifications/global', sendGlobalNotification);
router.patch('/moderation/comments/:commentId', moderateComment);

module.exports = router;
