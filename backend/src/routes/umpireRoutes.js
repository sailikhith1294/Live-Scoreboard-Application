const express = require('express');
const { getUmpireDashboard } = require('../controllers/umpireController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('umpire'));

router.get('/dashboard', getUmpireDashboard);

module.exports = router;
