import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const initialMatchForm = {
  tournamentId: '',
  homeTeamId: '',
  awayTeamId: '',
  venueId: '',
  scheduledAt: '',
};

const OrganizerMatchesPage = () => {
  const [dashboard, setDashboard] = useState({ tournaments: [], teams: [], matches: [] });
  const [loading, setLoading] = useState(true);
  const [matchForm, setMatchForm] = useState(initialMatchForm);
  const [fixtureForm, setFixtureForm] = useState({ tournamentId: '', teamIds: [], startAt: '', intervalMinutes: 180 });
  const [statusByMatch, setStatusByMatch] = useState({});
  const [tossForm, setTossForm] = useState({ matchId: '', tossWinnerTeamId: '', tossDecision: 'bat' });
  const [officialsForm, setOfficialsForm] = useState({ matchId: '', umpireId: '' });
  const [suggestForm, setSuggestForm] = useState({ userId: '', message: '' });

  const getId = (row) => row?._id || row?.id;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/organizer/dashboard');
      const tournaments = Array.isArray(data?.tournaments) ? data.tournaments : [];
      const teams = Array.isArray(data?.teams) ? data.teams : [];
      const matches = Array.isArray(data?.matches) ? data.matches : [];

      setDashboard({ tournaments, teams, matches });
      setMatchForm((prev) => ({ ...prev, tournamentId: prev.tournamentId || getId(tournaments[0]) || '' }));
      setFixtureForm((prev) => ({ ...prev, tournamentId: prev.tournamentId || getId(tournaments[0]) || '', teamIds: prev.teamIds.length ? prev.teamIds : teams.slice(0, 2).map(getId).filter(Boolean) }));
      setTossForm((prev) => ({ ...prev, matchId: prev.matchId || getId(matches[0]) || '' }));
      setOfficialsForm((prev) => ({ ...prev, matchId: prev.matchId || getId(matches[0]) || '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const createMatch = async (event) => {
    event.preventDefault();

    if (!matchForm.tournamentId || !matchForm.homeTeamId || !matchForm.awayTeamId || !matchForm.scheduledAt) {
      toast.error('Fill in tournament, teams, and schedule');
      return;
    }

    try {
      await api.post('/organizer/matches', matchForm);
      toast.success('Match created');
      setMatchForm(initialMatchForm);
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create match');
    }
  };

  const generateFixtures = async (event) => {
    event.preventDefault();

    if (!fixtureForm.tournamentId || !fixtureForm.startAt || (fixtureForm.teamIds || []).length < 2) {
      toast.error('Choose a tournament, two teams, and a start time');
      return;
    }

    try {
      await api.post('/organizer/matches/fixtures/auto', fixtureForm);
      toast.success('Fixtures generated');
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate fixtures');
    }
  };

  const updateMatchStatus = async (matchId, status) => {
    setStatusByMatch((prev) => ({ ...prev, [matchId]: status }));
    try {
      await api.patch(`/organizer/matches/${matchId}/status`, { status });
      toast.success(`Match marked ${status}`);
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update match status');
    } finally {
      setStatusByMatch((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    }
  };

  const deleteMatch = async (match) => {
    const matchId = getId(match);
    const label = match?.status === 'scheduled' ? 'fixture' : 'match';
    const confirmDelete = window.confirm(`Delete this ${label}? This will remove scorecard, ball events, and umpire decisions.`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/organizer/matches/${matchId}`);
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted`);
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete match');
    }
  };

  const submitToss = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/organizer/matches/${tossForm.matchId}/toss`, {
        tossWinnerTeamId: tossForm.tossWinnerTeamId,
        tossDecision: tossForm.tossDecision,
      });
      toast.success('Toss updated');
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update toss');
    }
  };

  const submitOfficials = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/organizer/matches/${officialsForm.matchId}/officials`, {
        umpireId: officialsForm.umpireId,
      });
      toast.success('Officials assigned');
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign officials');
    }
  };

  const submitUmpireSuggestion = async (event) => {
    event.preventDefault();
    if (!suggestForm.userId) {
      toast.error('Umpire user ID is required');
      return;
    }

    try {
      await api.post('/organizer/umpires/suggest', {
        userId: suggestForm.userId,
        message: suggestForm.message,
      });
      toast.success('Umpire suggestion sent to admin');
      setSuggestForm({ userId: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send umpire suggestion');
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <p className="section-kicker">Organizer</p>
        <h2 className="section-title">Match Control</h2>
        <p className="mt-2 text-slate-300">
          Create fixtures, move matches through their lifecycle, assign officials, and open the live scoring screen.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-sm text-slate-400">Tournaments</p>
          <p className="mt-1 text-2xl font-bold text-white">{dashboard.tournaments.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-sm text-slate-400">Teams</p>
          <p className="mt-1 text-2xl font-bold text-white">{dashboard.teams.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-sm text-slate-400">Matches</p>
          <p className="mt-1 text-2xl font-bold text-white">{dashboard.matches.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-sm text-slate-400">Scoring</p>
          <p className="mt-1 text-2xl font-bold text-white">Ready</p>
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="mb-3 text-lg font-semibold text-white">Create Match</h3>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={createMatch}>
          <select className="rounded-xl border px-3 py-2" value={matchForm.tournamentId} onChange={(e) => setMatchForm((prev) => ({ ...prev, tournamentId: e.target.value }))}>
            <option value="">Select tournament</option>
            {dashboard.tournaments.map((tournament) => (
              <option key={getId(tournament)} value={getId(tournament)}>{tournament.name}</option>
            ))}
          </select>
          <select className="rounded-xl border px-3 py-2" value={matchForm.homeTeamId} onChange={(e) => setMatchForm((prev) => ({ ...prev, homeTeamId: e.target.value }))}>
            <option value="">Home team</option>
            {dashboard.teams.map((team) => (
              <option key={getId(team)} value={getId(team)}>{team.name}</option>
            ))}
          </select>
          <select className="rounded-xl border px-3 py-2" value={matchForm.awayTeamId} onChange={(e) => setMatchForm((prev) => ({ ...prev, awayTeamId: e.target.value }))}>
            <option value="">Away team</option>
            {dashboard.teams.map((team) => (
              <option key={getId(team)} value={getId(team)}>{team.name}</option>
            ))}
          </select>
          <input className="rounded-xl border px-3 py-2" placeholder="Venue ID (optional)" value={matchForm.venueId} onChange={(e) => setMatchForm((prev) => ({ ...prev, venueId: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" type="datetime-local" value={matchForm.scheduledAt} onChange={(e) => setMatchForm((prev) => ({ ...prev, scheduledAt: e.target.value }))} />
          <button className="btn-cricket xl:col-span-5" type="submit">Create Match</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="mb-3 text-lg font-semibold text-white">Auto Generate Fixtures</h3>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={generateFixtures}>
          <select className="rounded-xl border px-3 py-2" value={fixtureForm.tournamentId} onChange={(e) => setFixtureForm((prev) => ({ ...prev, tournamentId: e.target.value }))}>
            <option value="">Select tournament</option>
            {dashboard.tournaments.map((tournament) => (
              <option key={getId(tournament)} value={getId(tournament)}>{tournament.name}</option>
            ))}
          </select>
          <input className="rounded-xl border px-3 py-2" placeholder="Team IDs comma-separated" value={fixtureForm.teamIds.join(',')} onChange={(e) => setFixtureForm((prev) => ({ ...prev, teamIds: e.target.value.split(',').map((id) => id.trim()).filter(Boolean) }))} />
          <input className="rounded-xl border px-3 py-2" type="datetime-local" value={fixtureForm.startAt} onChange={(e) => setFixtureForm((prev) => ({ ...prev, startAt: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" type="number" min="180" value={fixtureForm.intervalMinutes} onChange={(e) => setFixtureForm((prev) => ({ ...prev, intervalMinutes: Number(e.target.value) }))} />
          <button className="rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 font-semibold text-cyan-100 xl:col-span-4" type="submit">
            Generate Fixtures
          </button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="mb-3 text-lg font-semibold text-white">Match Status and Scoring</h3>
        <div className="space-y-3">
          {dashboard.matches.map((match) => {
            const matchId = getId(match);
            return (
              <div key={matchId} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{match.homeTeamId?.name || 'Home'} vs {match.awayTeamId?.name || 'Away'}</p>
                    <p className="text-sm text-slate-400">{match.status || 'scheduled'} | {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : 'No schedule set'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => updateMatchStatus(matchId, 'scheduled')} type="button">Scheduled</button>
                    <button className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100" onClick={() => updateMatchStatus(matchId, 'live')} type="button">Live</button>
                    <button className="rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100" onClick={() => updateMatchStatus(matchId, 'completed')} type="button">Completed</button>
                    <button className="rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100" onClick={() => updateMatchStatus(matchId, 'abandoned')} type="button">Abandoned</button>
                    <button className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100" onClick={() => deleteMatch(match)} type="button">
                      Delete
                    </button>
                    <Link className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-200" to={`/scorecard/${matchId}`}>
                      View Scorecard
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && dashboard.matches.length === 0 ? <p className="text-sm text-slate-400">No matches created yet.</p> : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="surface-panel">
          <h3 className="mb-3 text-lg font-semibold text-white">Toss</h3>
          <form className="grid gap-3" onSubmit={submitToss}>
            <select className="rounded-xl border px-3 py-2" value={tossForm.matchId} onChange={(e) => setTossForm((prev) => ({ ...prev, matchId: e.target.value }))}>
              <option value="">Select match</option>
              {dashboard.matches.map((match) => (
                <option key={getId(match)} value={getId(match)}>{match.homeTeamId?.name || 'Home'} vs {match.awayTeamId?.name || 'Away'}</option>
              ))}
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="Winning team ID" value={tossForm.tossWinnerTeamId} onChange={(e) => setTossForm((prev) => ({ ...prev, tossWinnerTeamId: e.target.value }))} />
            <select className="rounded-xl border px-3 py-2" value={tossForm.tossDecision} onChange={(e) => setTossForm((prev) => ({ ...prev, tossDecision: e.target.value }))}>
              <option value="bat">Bat</option>
              <option value="bowl">Bowl</option>
            </select>
            <button className="btn-cricket" type="submit">Save Toss</button>
          </form>
        </section>

        <section className="surface-panel">
          <h3 className="mb-3 text-lg font-semibold text-white">Officials</h3>
          <form className="grid gap-3" onSubmit={submitOfficials}>
            <select className="rounded-xl border px-3 py-2" value={officialsForm.matchId} onChange={(e) => setOfficialsForm((prev) => ({ ...prev, matchId: e.target.value }))}>
              <option value="">Select match</option>
              {dashboard.matches.map((match) => (
                <option key={getId(match)} value={getId(match)}>{match.homeTeamId?.name || 'Home'} vs {match.awayTeamId?.name || 'Away'}</option>
              ))}
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="Umpire ID" value={officialsForm.umpireId} onChange={(e) => setOfficialsForm((prev) => ({ ...prev, umpireId: e.target.value }))} />
            <button className="btn-cricket" type="submit">Assign Officials</button>
          </form>
        </section>

        <section className="surface-panel">
          <h3 className="mb-3 text-lg font-semibold text-white">Suggest Umpire</h3>
          <form className="grid gap-3" onSubmit={submitUmpireSuggestion}>
            <input className="rounded-xl border px-3 py-2" placeholder="Umpire User ID" value={suggestForm.userId} onChange={(e) => setSuggestForm((prev) => ({ ...prev, userId: e.target.value }))} />
            <textarea className="rounded-xl border px-3 py-2 min-h-24" placeholder="Why this umpire?" value={suggestForm.message} onChange={(e) => setSuggestForm((prev) => ({ ...prev, message: e.target.value }))} />
            <button className="btn-cricket" type="submit">Send Suggestion</button>
          </form>
        </section>
      </section>
    </div>
  );
};

export default OrganizerMatchesPage;