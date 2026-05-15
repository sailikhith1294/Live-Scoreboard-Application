const express = require('express');
const {
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
  updateMatchSquads,
  generateFixturesAutomatic,
  updateToss,
  assignOfficials,
  notifyPlayers,
  getTournamentSummaryReport,
  getMatchReport,
  getOrganizerDashboard,
  removePlayerFromTeam,
  overrideMatchResult,
  assignTeamCaptain,
  deleteTournament,
  deleteTeam,
} = require('../controllers/organizerController');

const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('organizer', 'admin'));

router.get('/dashboard', getOrganizerDashboard);
router.post('/tournaments', createTournament);
router.patch('/tournaments/:tournamentId/rules', updateTournamentRules);
router.post('/venues', createVenue);
router.post('/teams', createTeam);
router.patch('/teams/:teamId/captain', assignTeamCaptain);
router.get('/players', listManagedPlayers);
router.post('/teams/:teamId/players', addPlayerToTeam);
router.post('/players', createPlayerManually);
router.patch('/players/:profileId/approve', approvePlayerAndGenerateId);
router.post('/umpires/suggest', suggestUmpire);
router.post('/matches', createMatchManual);
router.delete('/matches/:matchId', deleteMatchOrFixture);
router.patch('/matches/:matchId/status', updateMatchStatus);
router.patch('/matches/:matchId/squads', updateMatchSquads);
router.post('/matches/fixtures/auto', generateFixturesAutomatic);
router.patch('/matches/:matchId/toss', updateToss);
router.patch('/matches/:matchId/officials', assignOfficials);
router.post('/matches/:matchId/notify', notifyPlayers);
router.get('/reports/tournaments/:tournamentId', getTournamentSummaryReport);
router.get('/reports/matches/:matchId', getMatchReport);
router.delete('/teams/:teamId/players/:profileId', removePlayerFromTeam);
router.patch('/matches/:matchId/override', overrideMatchResult);
router.delete('/tournaments/:tournamentId', deleteTournament);
router.delete('/teams/:teamId', deleteTeam);

module.exports = router;
