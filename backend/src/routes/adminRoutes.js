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
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/promotion-request', decidePromotionRequest);
router.patch('/organizers/:organizerId/approval', approveOrganizer);
router.post('/tournaments', createTournamentAsAdmin);
router.get('/tournaments', getAllTournaments);
router.get('/activity', getSystemActivity);
router.post('/notifications/global', sendGlobalNotification);
router.patch('/moderation/comments/:commentId', moderateComment);

module.exports = router;
