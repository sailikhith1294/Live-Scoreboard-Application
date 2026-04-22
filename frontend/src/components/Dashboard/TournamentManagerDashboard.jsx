import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiClock,
  FiEdit,
  FiFlag,
  FiMapPin,
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiUsers
} from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';
import toast from 'react-hot-toast';
import { adminAPI, matchAPI, tournamentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const baseLeagueForm = {
  leagueName: '',
  description: '',
  leagueType: 'T20',
  season: String(new Date().getFullYear()),
  startDate: '',
  endDate: '',
  maxTeams: 8,
  isPublic: true
};

const baseTeamForm = {
  teamName: '',
  leagueId: '',
  homeGround: '',
  description: ''
};

const basePlayerForm = {
  teamId: '',
  playerName: '',
  role: 'BAT',
  email: '',
  phone: ''
};

const statusOptions = ['draft', 'active', 'completed', 'cancelled'];

const TournamentManagerDashboard = () => {
  const { canPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [leagueForm, setLeagueForm] = useState(baseLeagueForm);
  const [teamForm, setTeamForm] = useState(baseTeamForm);
  const [playerForm, setPlayerForm] = useState(basePlayerForm);

  const [myLeagues, setMyLeagues] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [leagueFixtures, setLeagueFixtures] = useState([]);
  const [leagueStandings, setLeagueStandings] = useState([]);
  const [leagueLeaderboards, setLeagueLeaderboards] = useState({ topBatters: [], topBowlers: [], mvp: [] });
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);

  const [editingLeagueId, setEditingLeagueId] = useState('');
  const [editingTeamId, setEditingTeamId] = useState('');
  const [matchesPerPair, setMatchesPerPair] = useState(1);

  const selectedLeague = useMemo(
    () => myLeagues.find((l) => String(l._id) === String(selectedLeagueId)) || null,
    [myLeagues, selectedLeagueId]
  );

  const organiserStats = useMemo(() => {
    const totalPlayers = myTeams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
    const venues = new Set(upcomingMatches.map((m) => m.venue).filter(Boolean));

    return {
      leagues: myLeagues.length,
      teams: myTeams.length,
      players: totalPlayers,
      fixtures: leagueFixtures.length,
      upcoming: upcomingMatches.length,
      venues: venues.size
    };
  }, [myLeagues, myTeams, leagueFixtures, upcomingMatches]);

  const canCreateLeague = canPermission('tournament.create_league');
  const canEditLeague = canPermission('tournament.edit_league');
  const canDeleteLeague = canPermission('tournament.delete_league');
  const canCreateTeam = canPermission('tournament.create_team');
  const canEditTeam = canPermission('tournament.edit_team');
  const canManagePlayers = canPermission('tournament.manage_players');
  const canScheduleMatches = canPermission('tournament.schedule_matches');

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [leaguesRes, teamsRes, matchRes, pendingRes] = await Promise.all([
        tournamentAPI.getMyLeagues(),
        tournamentAPI.getMyTeams(),
        matchAPI.getAllMatches({ status: 'Scheduled', limit: 120, includeLegacy: true, noCache: true }),
        canManagePlayers ? adminAPI.getPendingRequests() : Promise.resolve({ data: { data: [] } })
      ]);

      const leagues = leaguesRes.data?.data || [];
      const teams = teamsRes.data?.data || [];
      const scheduled = (matchRes.data?.data || [])
        .map((match) => {
          const value = match.startTime || match.date || match.startDate;
          const date = value ? new Date(value) : null;
          if (!date || Number.isNaN(date.getTime())) return null;
          return {
            id: match._id || match.id || match.matchId,
            teams: `${match.team1?.shortName || match.team1?.name || 'TBD'} vs ${match.team2?.shortName || match.team2?.name || 'TBD'}`,
            venue: match.venue || 'TBD',
            tournament: match.seriesName || match.title || 'Tournament',
            date
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.date - b.date)
        .slice(0, 10);

      setMyLeagues(leagues);
      setMyTeams(teams);
      setUpcomingMatches(scheduled);
      setPendingRequests(pendingRes.data?.data || []);

      const defaultLeagueId = selectedLeagueId || leagues[0]?._id || '';
      setSelectedLeagueId(String(defaultLeagueId || ''));
      setTeamForm((prev) => ({ ...prev, leagueId: prev.leagueId || String(defaultLeagueId || '') }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load organiser data');
      setMyLeagues([]);
      setMyTeams([]);
      setUpcomingMatches([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshLeagueData = async (leagueId) => {
    if (!leagueId) {
      setLeagueTeams([]);
      setLeagueFixtures([]);
      setLeagueStandings([]);
      setLeagueLeaderboards({ topBatters: [], topBowlers: [], mvp: [] });
      return;
    }

    try {
      setStandingsLoading(true);
      const [teamsRes, fixturesRes, standingsRes, leaderboardsRes] = await Promise.all([
        tournamentAPI.getLeagueTeams(leagueId),
        tournamentAPI.getLeagueFixtures(leagueId),
        tournamentAPI.getLeagueStandings(leagueId),
        tournamentAPI.getLeagueLeaderboards(leagueId)
      ]);
      setLeagueTeams(teamsRes.data?.data || []);
      setLeagueFixtures(fixturesRes.data?.data || []);
      setLeagueStandings(standingsRes.data?.data || []);
      setLeagueLeaderboards(leaderboardsRes.data?.data || { topBatters: [], topBowlers: [], mvp: [] });
    } catch (error) {
      setLeagueTeams([]);
      setLeagueFixtures([]);
      setLeagueStandings([]);
      setLeagueLeaderboards({ topBatters: [], topBowlers: [], mvp: [] });
      toast.error(error.response?.data?.message || 'Failed to load league details');
    } finally {
      setStandingsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    refreshLeagueData(selectedLeagueId);
  }, [selectedLeagueId]);

  const handleCreateLeague = async (e) => {
    if (!canCreateLeague) {
      toast.error('You do not have permission to create leagues.');
      return;
    }
    e.preventDefault();
    setBusy(true);
    try {
      await tournamentAPI.createLeague({ ...leagueForm, maxTeams: Number(leagueForm.maxTeams) || 8 });
      toast.success('League created');
      setLeagueForm(baseLeagueForm);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create league');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLeague = async (leagueId) => {
    if (!canEditLeague) {
      toast.error('You do not have permission to edit leagues.');
      return;
    }
    const league = myLeagues.find((l) => String(l._id) === String(leagueId));
    if (!league) return;

    setBusy(true);
    try {
      await tournamentAPI.updateLeague(leagueId, {
        description: league.description || '',
        maxTeams: Number(league.maxTeams) || 8,
        isPublic: league.isPublic
      });
      toast.success('League updated');
      setEditingLeagueId('');
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update league');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLeague = async (leagueId) => {
    if (!canDeleteLeague) {
      toast.error('You do not have permission to delete leagues.');
      return;
    }
    const yes = window.confirm('Delete this league? This cannot be undone.');
    if (!yes) return;

    setBusy(true);
    try {
      await tournamentAPI.deleteLeague(leagueId);
      toast.success('League deleted');
      if (String(selectedLeagueId) === String(leagueId)) {
        setSelectedLeagueId('');
      }
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete league');
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (leagueId, status) => {
    if (!canEditLeague) {
      toast.error('You do not have permission to change league status.');
      return;
    }
    setBusy(true);
    try {
      await tournamentAPI.updateLeagueStatus(leagueId, status);
      toast.success(`League moved to ${status}`);
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update status');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!canScheduleMatches) {
      toast.error('You do not have permission to generate fixtures.');
      return;
    }
    if (!selectedLeagueId) {
      toast.error('Select a league first');
      return;
    }

    setBusy(true);
    try {
      await tournamentAPI.generateLeagueFixtures(selectedLeagueId, Number(matchesPerPair) || 1);
      toast.success('Round-robin fixtures generated');
      await refreshAll();
      await refreshLeagueData(selectedLeagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to generate fixtures');
    } finally {
      setBusy(false);
    }
  };

  const handleRecomputeStandings = async () => {
    if (!canEditLeague) {
      toast.error('You do not have permission to recompute standings.');
      return;
    }
    if (!selectedLeagueId) {
      toast.error('Select a league first');
      return;
    }

    setBusy(true);
    try {
      await tournamentAPI.recomputeLeagueStandings(selectedLeagueId);
      toast.success('Standings recomputed');
      await refreshLeagueData(selectedLeagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to recompute standings');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTeam = async (e) => {
    if (!canCreateTeam) {
      toast.error('You do not have permission to create teams.');
      return;
    }
    e.preventDefault();
    setBusy(true);
    try {
      await tournamentAPI.createTeam({
        teamName: teamForm.teamName,
        leagueId: teamForm.leagueId,
        homeGround: teamForm.homeGround,
        description: teamForm.description
      });
      toast.success('Team created');
      setTeamForm((prev) => ({ ...baseTeamForm, leagueId: prev.leagueId }));
      await refreshAll();
      await refreshLeagueData(selectedLeagueId || teamForm.leagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create team');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTeam = async (teamId) => {
    if (!canEditTeam) {
      toast.error('You do not have permission to edit teams.');
      return;
    }
    const team = myTeams.find((t) => String(t._id) === String(teamId));
    if (!team) return;

    setBusy(true);
    try {
      await tournamentAPI.updateTeam(teamId, {
        teamName: team.teamName,
        homeGround: team.homeGround,
        description: team.description
      });
      toast.success('Team updated');
      setEditingTeamId('');
      await refreshAll();
      await refreshLeagueData(selectedLeagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update team');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPlayer = async (e) => {
    if (!canManagePlayers) {
      toast.error('You do not have permission to manage players.');
      return;
    }
    e.preventDefault();
    setBusy(true);
    try {
      await tournamentAPI.addPlayerToTeam(playerForm.teamId, {
        playerName: playerForm.playerName,
        role: playerForm.role,
        email: playerForm.email || undefined,
        phone: playerForm.phone || undefined
      });
      toast.success('Player added');
      setPlayerForm((prev) => ({ ...basePlayerForm, teamId: prev.teamId }));
      await refreshAll();
      await refreshLeagueData(selectedLeagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add player');
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePlayer = async (teamId, playerId) => {
    if (!canManagePlayers) {
      toast.error('You do not have permission to manage players.');
      return;
    }
    const yes = window.confirm('Remove this player from team?');
    if (!yes) return;

    setBusy(true);
    try {
      await tournamentAPI.removePlayerFromTeam(teamId, playerId);
      toast.success('Player removed');
      await refreshAll();
      await refreshLeagueData(selectedLeagueId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to remove player');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveRequest = async (userRoleId) => {
    if (!canManagePlayers) {
      toast.error('You do not have permission to approve requests.');
      return;
    }
    setBusy(true);
    try {
      await adminAPI.approveRequest(userRoleId);
      toast.success('Role request approved');
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to approve request');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectRequest = async (userRoleId) => {
    if (!canManagePlayers) {
      toast.error('You do not have permission to reject requests.');
      return;
    }
    setBusy(true);
    try {
      await adminAPI.rejectRequest(userRoleId, 'Rejected by manager');
      toast.success('Role request rejected');
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to reject request');
    } finally {
      setBusy(false);
    }
  };

  const setEditableLeagueField = (leagueId, field, value) => {
    setMyLeagues((prev) => prev.map((league) => (
      String(league._id) === String(leagueId)
        ? { ...league, [field]: value }
        : league
    )));
  };

  const setEditableTeamField = (teamId, field, value) => {
    setMyTeams((prev) => prev.map((team) => (
      String(team._id) === String(teamId)
        ? { ...team, [field]: value }
        : team
    )));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.2),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(245,158,11,0.16),transparent_32%),linear-gradient(145deg,#071324,#0b1b2f_42%,#112b3f)] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-emerald-300/20 bg-slate-950/55 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Cricket Organiser</h1>
              <p className="mt-2 text-slate-300">Full tournament operations: league lifecycle, teams, players, fixtures, and schedule control.</p>
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100"
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl border border-emerald-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">Leagues</p><p className="text-3xl font-bold text-emerald-100">{organiserStats.leagues}</p></div>
            <div className="rounded-xl border border-cyan-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">Teams</p><p className="text-3xl font-bold text-cyan-100">{organiserStats.teams}</p></div>
            <div className="rounded-xl border border-violet-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">Players</p><p className="text-3xl font-bold text-violet-100">{organiserStats.players}</p></div>
            <div className="rounded-xl border border-lime-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">League Fixtures</p><p className="text-3xl font-bold text-lime-100">{organiserStats.fixtures}</p></div>
            <div className="rounded-xl border border-orange-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">Upcoming</p><p className="text-3xl font-bold text-orange-100">{organiserStats.upcoming}</p></div>
            <div className="rounded-xl border border-pink-300/30 bg-slate-900/55 p-4"><p className="text-xs text-slate-400">Venues</p><p className="text-3xl font-bold text-pink-100">{organiserStats.venues}</p></div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-2xl font-bold"><GiTrophy className="text-amber-300" /> League Lifecycle</h2>
                <select value={selectedLeagueId} onChange={(e) => setSelectedLeagueId(e.target.value)} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm">
                  <option value="">Select league</option>
                  {myLeagues.map((league) => <option key={league._id} value={league._id}>{league.leagueName}</option>)}
                </select>
              </div>

              {loading ? <p className="text-slate-400">Loading leagues...</p> : (
                <div className="space-y-3">
                  {myLeagues.map((league) => (
                    <div key={league._id} className={`rounded-xl border p-4 ${String(selectedLeagueId) === String(league._id) ? 'border-emerald-300/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/45'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {editingLeagueId === String(league._id) ? (
                            <input value={league.description || ''} onChange={(e) => setEditableLeagueField(league._id, 'description', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="League description" />
                          ) : (
                            <>
                              <p className="text-lg font-bold text-white">{league.leagueName}</p>
                              <p className="text-sm text-slate-400">{league.description || 'No description'}</p>
                            </>
                          )}
                        </div>
                        <span className="rounded-full border border-cyan-300/40 bg-cyan-500/12 px-2 py-1 text-xs font-semibold text-cyan-100">{league.status}</span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="text-xs text-slate-400"><FiUsers className="inline" /> Teams: {league.teams?.length || 0}/{league.maxTeams}</p>
                        <p className="text-xs text-slate-400"><FiCalendar className="inline" /> {new Date(league.startDate).toLocaleDateString()} - {new Date(league.endDate).toLocaleDateString()}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {statusOptions.map((status) => (
                          <button key={status} type="button" disabled={busy || league.status === status} onClick={() => handleStatusChange(league._id, status)} className={`rounded-md border px-2 py-1 text-xs ${league.status === status ? 'border-emerald-300/40 bg-emerald-500/18 text-emerald-100' : 'border-slate-600 text-slate-300'}`}>{status}</button>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {canEditLeague && (editingLeagueId === String(league._id) ? (
                          <button type="button" onClick={() => handleUpdateLeague(league._id)} disabled={busy} className="rounded-md border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">Save League</button>
                        ) : (
                          <button type="button" onClick={() => setEditingLeagueId(String(league._id))} className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1.5 text-xs"><FiEdit /> Edit</button>
                        ))}
                        {canDeleteLeague && (
                          <button type="button" onClick={() => handleDeleteLeague(league._id)} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-red-300/40 bg-red-500/12 px-3 py-1.5 text-xs text-red-100"><FiTrash2 /> Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-xl font-bold"><GiCricketBat className="text-cyan-300" /> Fixture Generator</h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Matches per pair</label>
                  <input type="number" min={1} max={4} value={matchesPerPair} onChange={(e) => setMatchesPerPair(e.target.value)} className="w-16 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canScheduleMatches && (
                  <button type="button" onClick={handleGenerateFixtures} disabled={busy || !selectedLeagueId} className="inline-flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-500/16 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"><FiPlay /> Generate Round-Robin Fixtures</button>
                )}
                {canEditLeague && (
                  <button type="button" onClick={handleRecomputeStandings} disabled={busy || !selectedLeagueId} className="inline-flex items-center gap-2 rounded-md border border-emerald-300/40 bg-emerald-500/16 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"><FiRefreshCw /> Recompute Standings</button>
                )}
                <Link to="/schedule" className="rounded-md border border-cyan-300/40 bg-cyan-500/16 px-3 py-2 text-sm font-semibold text-cyan-100">Open Scheduler</Link>
              </div>

              <div className="mt-4 space-y-2">
                {leagueFixtures.length === 0 ? (
                  <p className="text-sm text-slate-400">No fixtures generated for selected league.</p>
                ) : leagueFixtures.slice(0, 8).map((fixture) => (
                  <div key={fixture._id} className="rounded-lg border border-slate-700 bg-slate-900/45 p-3">
                    <p className="font-semibold text-white">#{fixture.matchNumber} {fixture.team1?.teamName || 'Team 1'} vs {fixture.team2?.teamName || 'Team 2'}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span><FiClock className="inline" /> {new Date(fixture.scheduledDate).toLocaleString()}</span>
                      <span><FiMapPin className="inline" /> {fixture.venue}</span>
                      <span><FiFlag className="inline" /> {fixture.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-4 inline-flex items-center gap-2 text-xl font-bold"><FiUsers className="text-violet-300" /> Team and Player Operations</h3>
              {leagueTeams.length === 0 ? (
                <p className="text-sm text-slate-400">Select league to view teams and remove players.</p>
              ) : (
                <div className="space-y-3">
                  {leagueTeams.map((team) => (
                    <div key={team._id} className="rounded-lg border border-slate-700 bg-slate-900/45 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {editingTeamId === String(team._id) ? (
                            <div className="space-y-2">
                              <input value={myTeams.find((t) => String(t._id) === String(team._id))?.teamName || team.teamName} onChange={(e) => setEditableTeamField(team._id, 'teamName', e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                              <input value={myTeams.find((t) => String(t._id) === String(team._id))?.homeGround || team.homeGround || ''} onChange={(e) => setEditableTeamField(team._id, 'homeGround', e.target.value)} placeholder="Home ground" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-white">{team.teamName}</p>
                              <p className="text-xs text-slate-400">{team.homeGround || 'Home ground TBD'} • Players: {team.players?.length || 0}</p>
                            </>
                          )}
                        </div>

                        {canEditTeam && (editingTeamId === String(team._id) ? (
                          <button type="button" onClick={() => handleUpdateTeam(team._id)} className="rounded-md border border-emerald-300/40 bg-emerald-500/16 px-3 py-1.5 text-xs text-emerald-100">Save Team</button>
                        ) : (
                          <button type="button" onClick={() => setEditingTeamId(String(team._id))} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs"><FiEdit className="inline" /> Edit</button>
                        ))}
                      </div>

                      {team.players?.length > 0 && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {team.players.map((player) => (
                            <div key={player._id} className="rounded-md border border-slate-700 bg-slate-950/45 p-2">
                              <p className="text-sm font-semibold text-white">{player.playerName}</p>
                              <p className="text-xs text-slate-400">{player.role} {player.email ? `• ${player.email}` : ''}</p>
                              {canManagePlayers && (
                                <button type="button" onClick={() => handleRemovePlayer(team._id, player._id)} className="mt-2 rounded border border-red-300/40 bg-red-500/12 px-2 py-1 text-[11px] text-red-100">Remove Player</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {canCreateLeague && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">Create League</h3>
              <form onSubmit={handleCreateLeague} className="space-y-2">
                <input required value={leagueForm.leagueName} onChange={(e) => setLeagueForm((p) => ({ ...p, leagueName: e.target.value }))} placeholder="League name" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <textarea value={leagueForm.description} onChange={(e) => setLeagueForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={leagueForm.leagueType} onChange={(e) => setLeagueForm((p) => ({ ...p, leagueType: e.target.value }))} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"><option value="Test">Test</option><option value="ODI">ODI</option><option value="T20">T20</option><option value="T10">T10</option><option value="Custom">Custom</option></select>
                  <input value={leagueForm.season} onChange={(e) => setLeagueForm((p) => ({ ...p, season: e.target.value }))} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Season" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input required type="date" value={leagueForm.startDate} onChange={(e) => setLeagueForm((p) => ({ ...p, startDate: e.target.value }))} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                  <input required type="date" value={leagueForm.endDate} onChange={(e) => setLeagueForm((p) => ({ ...p, endDate: e.target.value }))} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                </div>
                <input type="number" min={2} max={64} value={leagueForm.maxTeams} onChange={(e) => setLeagueForm((p) => ({ ...p, maxTeams: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" placeholder="Max teams" />
                <button type="submit" disabled={busy} className="w-full rounded-md border border-emerald-300/40 bg-emerald-500/16 px-3 py-2 text-sm font-semibold text-emerald-100">Create League</button>
              </form>
            </div>
            )}

            {canCreateTeam && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">Create Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-2">
                <input required value={teamForm.teamName} onChange={(e) => setTeamForm((p) => ({ ...p, teamName: e.target.value }))} placeholder="Team name" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <select required value={teamForm.leagueId} onChange={(e) => setTeamForm((p) => ({ ...p, leagueId: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"><option value="">Select league</option>{myLeagues.map((league) => <option key={league._id} value={league._id}>{league.leagueName}</option>)}</select>
                <input value={teamForm.homeGround} onChange={(e) => setTeamForm((p) => ({ ...p, homeGround: e.target.value }))} placeholder="Home ground" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <textarea value={teamForm.description} onChange={(e) => setTeamForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <button type="submit" disabled={busy} className="w-full rounded-md border border-cyan-300/40 bg-cyan-500/16 px-3 py-2 text-sm font-semibold text-cyan-100">Create Team</button>
              </form>
            </div>
            )}

            {canManagePlayers && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">Add Player</h3>
              <form onSubmit={handleAddPlayer} className="space-y-2">
                <select required value={playerForm.teamId} onChange={(e) => setPlayerForm((p) => ({ ...p, teamId: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"><option value="">Select team</option>{myTeams.map((team) => <option key={team._id} value={team._id}>{team.teamName}</option>)}</select>
                <input required value={playerForm.playerName} onChange={(e) => setPlayerForm((p) => ({ ...p, playerName: e.target.value }))} placeholder="Player name" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <select value={playerForm.role} onChange={(e) => setPlayerForm((p) => ({ ...p, role: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"><option value="WK">WK</option><option value="BAT">BAT</option><option value="AR">AR</option><option value="BOWL">BOWL</option></select>
                <input type="email" value={playerForm.email} onChange={(e) => setPlayerForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <input value={playerForm.phone} onChange={(e) => setPlayerForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />
                <button type="submit" disabled={busy} className="w-full rounded-md border border-violet-300/40 bg-violet-500/16 px-3 py-2 text-sm font-semibold text-violet-100">Add Player</button>
              </form>
            </div>
            )}

            {canManagePlayers && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">Pending Player Access Requests</h3>
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No pending requests assigned.</p>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req._id} className="rounded-md border border-slate-700 bg-slate-900/50 p-3">
                      <p className="font-semibold text-white">{req.user?.username || 'User'} ({req.user?.email || 'N/A'})</p>
                      <p className="text-xs text-slate-400">Requested role: {req.approvalRequest?.requestedRole || 'player'}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => handleApproveRequest(req._id)} disabled={busy} className="rounded border border-emerald-300/40 bg-emerald-500/12 px-3 py-1 text-xs text-emerald-100 disabled:opacity-60">Approve</button>
                        <button type="button" onClick={() => handleRejectRequest(req._id)} disabled={busy} className="rounded border border-red-300/40 bg-red-500/12 px-3 py-1 text-xs text-red-100 disabled:opacity-60">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">Global Upcoming Matches</h3>
              {upcomingMatches.length === 0 ? <p className="text-sm text-slate-400">No scheduled matches.</p> : (
                <div className="space-y-2">
                  {upcomingMatches.map((match) => (
                    <Link key={match.id} to={`/match/${match.id}`} className="block rounded-lg border border-slate-700 bg-slate-900/45 p-3">
                      <p className="font-semibold text-white">{match.teams}</p>
                      <p className="text-xs text-slate-400"><FiClock className="inline" /> {match.date.toLocaleString()} • <FiMapPin className="inline" /> {match.venue}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">League Standings</h3>
              {standingsLoading ? (
                <p className="text-sm text-slate-400">Loading standings...</p>
              ) : leagueStandings.length === 0 ? (
                <p className="text-sm text-slate-400">No standings data for selected league.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="px-2 py-2 text-left">Pos</th>
                        <th className="px-2 py-2 text-left">Team</th>
                        <th className="px-2 py-2 text-center">P</th>
                        <th className="px-2 py-2 text-center">W</th>
                        <th className="px-2 py-2 text-center">L</th>
                        <th className="px-2 py-2 text-center">Pts</th>
                        <th className="px-2 py-2 text-center">NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueStandings.slice(0, 8).map((row) => (
                        <tr key={row.teamId} className="border-t border-slate-700/60">
                          <td className="px-2 py-2">{row.position}</td>
                          <td className="px-2 py-2 font-semibold text-white">{row.teamName}</td>
                          <td className="px-2 py-2 text-center">{row.played}</td>
                          <td className="px-2 py-2 text-center text-emerald-200">{row.won}</td>
                          <td className="px-2 py-2 text-center text-rose-200">{row.lost}</td>
                          <td className="px-2 py-2 text-center font-semibold text-cyan-200">{row.points}</td>
                          <td className="px-2 py-2 text-center">{Number(row.netRunRate || 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-5">
              <h3 className="mb-3 text-xl font-bold">League Leaderboards</h3>
              {standingsLoading ? (
                <p className="text-sm text-slate-400">Loading leaderboards...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-cyan-200">Top Batters</p>
                    {(leagueLeaderboards.topBatters || []).slice(0, 5).map((row) => (
                      <div key={`bat-${row.playerName}`} className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/45 px-3 py-2 text-xs">
                        <span className="text-white">{row.playerName}</span>
                        <span className="text-cyan-200">{row.runs} runs</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-amber-200">Top Bowlers</p>
                    {(leagueLeaderboards.topBowlers || []).slice(0, 5).map((row) => (
                      <div key={`bowl-${row.playerName}`} className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/45 px-3 py-2 text-xs">
                        <span className="text-white">{row.playerName}</span>
                        <span className="text-amber-200">{row.wickets} wickets</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TournamentManagerDashboard;
