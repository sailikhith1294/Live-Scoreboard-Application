import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const OrganizerDashboardPage = () => {
  const [dashboard, setDashboard] = useState({ tournaments: [], teams: [], matches: [], liveFeed: { live: [], scheduled: [], completed: [] } });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', format: 'T20', location: '', startDate: '', endDate: '' });
  const [teamForm, setTeamForm] = useState({ name: '', shortCode: '' });
  const [venueForm, setVenueForm] = useState({ tournamentId: '', name: '', city: '', address: '' });
  const [matchForm, setMatchForm] = useState({ tournamentId: '', homeTeamId: '', awayTeamId: '', scheduledAt: '' });
  const [notifyForm, setNotifyForm] = useState({ matchId: '', title: '', message: '' });

  const getId = (row) => row?._id || row?.id;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizer/dashboard');
      const data = res?.data || { tournaments: [], teams: [], matches: [], liveFeed: { live: [], scheduled: [], completed: [] } };
      setDashboard({
        tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
        teams: Array.isArray(data.teams) ? data.teams : [],
        matches: Array.isArray(data.matches) ? data.matches : [],
        liveFeed: {
          live: Array.isArray(data?.liveFeed?.live) ? data.liveFeed.live : [],
          scheduled: Array.isArray(data?.liveFeed?.scheduled) ? data.liveFeed.scheduled : [],
          completed: Array.isArray(data?.liveFeed?.completed) ? data.liveFeed.completed : [],
        },
      });
    } catch (error) {
      setDashboard({ tournaments: [], teams: [], matches: [], liveFeed: { live: [], scheduled: [], completed: [] } });
      toast.error(error.response?.data?.message || 'Failed to load organizer dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const firstTournamentId = getId(dashboard.tournaments[0]) || '';
    const firstMatchId = getId(dashboard.matches[0]) || '';
    setVenueForm((prev) => ({ ...prev, tournamentId: prev.tournamentId || firstTournamentId }));
    setMatchForm((prev) => ({ ...prev, tournamentId: prev.tournamentId || firstTournamentId }));
    setNotifyForm((prev) => ({ ...prev, matchId: prev.matchId || firstMatchId }));
  }, [dashboard.tournaments, dashboard.matches]);

  const tournamentTeams = useMemo(
    () => dashboard.teams,
    [dashboard.teams]
  );

  const createTournament = async (event) => {
    event.preventDefault();
    try {
      await api.post('/organizer/tournaments', {
        ...form,
        rules: { overs: form.format === 'ODI' ? 50 : 20, tieBreakers: 'super-over' }
      });
      toast.success('Tournament created');
      setForm({ name: '', format: 'T20', location: '', startDate: '', endDate: '' });
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create tournament');
    }
  };

  const createTeam = async (event) => {
    event.preventDefault();
    try {
      await api.post('/organizer/teams', teamForm);
      toast.success('Team created');
      setTeamForm({ name: '', shortCode: '' });
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create team');
    }
  };

  const createVenue = async (event) => {
    event.preventDefault();
    try {
      await api.post('/organizer/venues', venueForm);
      toast.success('Venue created');
      setVenueForm((prev) => ({ ...prev, name: '', city: '', address: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create venue');
    }
  };

  const createMatch = async (event) => {
    event.preventDefault();

    if (!matchForm.tournamentId || !matchForm.homeTeamId || !matchForm.awayTeamId || !matchForm.scheduledAt) {
      toast.error('Please fill tournament, teams and schedule time');
      return;
    }

    if (String(matchForm.homeTeamId) === String(matchForm.awayTeamId)) {
      toast.error('Home and away teams must be different');
      return;
    }

    const when = new Date(matchForm.scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60 * 1000) {
      toast.error('Match must be scheduled in the future');
      return;
    }

    try {
      await api.post('/organizer/matches', {
        tournamentId: matchForm.tournamentId,
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        scheduledAt: matchForm.scheduledAt,
      });
      toast.success('Match created');
      setMatchForm((prev) => ({ ...prev, homeTeamId: '', awayTeamId: '', scheduledAt: '' }));
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create match');
    }
  };

  const notifyPlayers = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/organizer/matches/${notifyForm.matchId}/notify`, {
        title: notifyForm.title,
        message: notifyForm.message,
      });
      toast.success('Players notified');
      setNotifyForm((prev) => ({ ...prev, title: '', message: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to notify players');
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Organizer Dashboard</h2>
        <p className="mt-2 text-slate-300">Create tournaments, teams, venues, matches, and push player notifications from one place.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/dashboard/organizer/teams" className="rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100">
            Team Players
          </Link>
          <Link to="/dashboard/organizer/matches" className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100">
            Match Control
          </Link>
          <Link to="/dashboard/organizer/feed" className="rounded-xl border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100">
            Live Feed
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Tournaments</p>
          <p className="text-2xl font-bold text-white mt-1">{dashboard.tournaments.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Teams</p>
          <p className="text-2xl font-bold text-cyan-100 mt-1">{dashboard.teams.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Matches</p>
          <p className="text-2xl font-bold text-emerald-100 mt-1">{dashboard.matches.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Live Scoring</p>
          <p className="text-2xl font-bold text-amber-100 mt-1">Available</p>
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Create Tournament</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={createTournament}>
          <input required className="rounded-xl border px-3 py-2" placeholder="Tournament name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <select required className="rounded-xl border px-3 py-2" value={form.format} onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))}>
            <option value="T20">T20</option>
            <option value="ODI">ODI</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input required className="rounded-xl border px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          <input required className="rounded-xl border px-3 py-2" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <input required className="rounded-xl border px-3 py-2" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          <button className="btn-cricket" type="submit">Create</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Create Team</h3>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createTeam}>
          <input required className="rounded-xl border px-3 py-2" placeholder="Team name" value={teamForm.name} onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" placeholder="Short code (optional)" value={teamForm.shortCode} onChange={(e) => setTeamForm((p) => ({ ...p, shortCode: e.target.value }))} />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold border-cyan-300/40 bg-cyan-500/15 text-cyan-100" type="submit">Create Team</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Create Venue</h3>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createVenue}>
          <select className="rounded-xl border px-3 py-2" value={venueForm.tournamentId} onChange={(e) => setVenueForm((p) => ({ ...p, tournamentId: e.target.value }))}>
            <option value="">Select tournament (optional)</option>
            {dashboard.tournaments.map((t) => (
              <option key={getId(t)} value={getId(t)}>{t.name}</option>
            ))}
          </select>
          <input required className="rounded-xl border px-3 py-2" placeholder="Venue name" value={venueForm.name} onChange={(e) => setVenueForm((p) => ({ ...p, name: e.target.value }))} />
          <input required className="rounded-xl border px-3 py-2" placeholder="City" value={venueForm.city} onChange={(e) => setVenueForm((p) => ({ ...p, city: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" placeholder="Address (optional)" value={venueForm.address} onChange={(e) => setVenueForm((p) => ({ ...p, address: e.target.value }))} />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold border-emerald-300/40 bg-emerald-500/15 text-emerald-100 md:col-span-1" type="submit">Create Venue</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Create Match</h3>
        <div className="mb-3 rounded-md border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-300">
          <p>Real-world rules enforced:</p>
          <p>1. Same team cannot play against itself.</p>
          <p>2. Match must be in the future.</p>
          <p>3. Duplicate fixture (same teams, same day) is blocked.</p>
          <p>4. Team overlap conflicts are blocked for nearby match windows.</p>
        </div>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createMatch}>
          <select required className="rounded-xl border px-3 py-2" value={matchForm.tournamentId} onChange={(e) => setMatchForm((p) => ({ ...p, tournamentId: e.target.value }))}>
            <option value="">Select tournament</option>
            {dashboard.tournaments.map((t) => (
              <option key={getId(t)} value={getId(t)}>{t.name}</option>
            ))}
          </select>
          <select required className="rounded-xl border px-3 py-2" value={matchForm.homeTeamId} onChange={(e) => setMatchForm((p) => ({ ...p, homeTeamId: e.target.value }))}>
            <option value="">Home team</option>
            {tournamentTeams.map((team) => (
              <option key={getId(team)} value={getId(team)}>{team.name}</option>
            ))}
          </select>
          <select required className="rounded-xl border px-3 py-2" value={matchForm.awayTeamId} onChange={(e) => setMatchForm((p) => ({ ...p, awayTeamId: e.target.value }))}>
            <option value="">Away team</option>
            {tournamentTeams.map((team) => (
              <option key={getId(team)} value={getId(team)}>{team.name}</option>
            ))}
          </select>
          <input required type="datetime-local" className="rounded-xl border px-3 py-2" value={matchForm.scheduledAt} onChange={(e) => setMatchForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold border-amber-300/40 bg-amber-500/15 text-amber-100 md:col-span-1" type="submit">Create Match</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Notify Players</h3>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={notifyPlayers}>
          <select required className="rounded-xl border px-3 py-2" value={notifyForm.matchId} onChange={(e) => setNotifyForm((p) => ({ ...p, matchId: e.target.value }))}>
            <option value="">Select match</option>
            {dashboard.matches.map((m) => (
              <option key={getId(m)} value={getId(m)}>{m.matchNo || `${m.homeTeamId} vs ${m.awayTeamId}`}</option>
            ))}
          </select>
          <input required className="rounded-xl border px-3 py-2" placeholder="Title" value={notifyForm.title} onChange={(e) => setNotifyForm((p) => ({ ...p, title: e.target.value }))} />
          <input required className="rounded-xl border px-3 py-2" placeholder="Message" value={notifyForm.message} onChange={(e) => setNotifyForm((p) => ({ ...p, message: e.target.value }))} />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold border-violet-300/40 bg-violet-500/15 text-violet-100" type="submit">Send</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">My Tournaments</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {dashboard.tournaments.map((t) => (
            <div key={getId(t)} className="rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <p className="font-semibold text-white">{t.name}</p>
              <p className="text-sm text-slate-300">{t.format} - {t.location}</p>
            </div>
          ))}
          {!loading && dashboard.tournaments.length === 0 ? <p className="text-sm text-slate-400">No tournaments yet.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Live API Feed (Organizer View)</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {['live', 'scheduled', 'completed'].map((bucket) => (
            <div key={bucket} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-sm font-semibold uppercase text-slate-300">{bucket}</p>
              <p className="text-xs text-slate-400 mt-1">{dashboard.liveFeed[bucket]?.length || 0} matches</p>
              <div className="mt-2 space-y-2">
                {(dashboard.liveFeed[bucket] || []).slice(0, 4).map((m) => (
                  <div key={m.id || m.externalId} className="rounded-md border border-slate-700/60 p-2">
                    <p className="text-sm font-semibold text-white">{m.matchNo || 'Match'}</p>
                    <p className="text-xs text-slate-400">{m.team1?.shortName || 'T1'} vs {m.team2?.shortName || 'T2'}</p>
                  </div>
                ))}
                {(dashboard.liveFeed[bucket] || []).length === 0 ? <p className="text-xs text-slate-500">No data.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OrganizerDashboardPage;
