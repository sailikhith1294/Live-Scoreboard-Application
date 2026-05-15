const express = require('express');
const { getUmpireDashboard, updateToss, updateSquads, startMatch } = require('../controllers/umpireController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('umpire'));

router.get('/dashboard', getUmpireDashboard);
router.patch('/matches/:matchId/toss', updateToss);
router.patch('/matches/:matchId/squads', updateSquads);
router.patch('/matches/:matchId/start', startMatch);

module.exports = router;
