const { Match } = require('../models');

const getUmpireDashboard = async (req, res, next) => {
  try {
    const matches = await Match.find({ umpireId: req.user.id })
      .populate('tournamentId', 'name format location startDate endDate')
      .populate('homeTeamId', 'name shortCode')
      .populate('awayTeamId', 'name shortCode')
      .populate('venueId', 'name city')
      .sort({ scheduledAt: -1 });

    return res.json({ matches });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getUmpireDashboard };
