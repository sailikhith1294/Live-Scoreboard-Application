import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const OrganizerTeamsPage = () => {
  const [dashboard, setDashboard] = useState({ tournaments: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ teamId: '', playerProfileId: '', playerId: '', isSubstitute: false });
  const [manualPlayerForm, setManualPlayerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    playerRole: 'all-rounder',
    teamId: '',
    isSubstitute: false,
  });
  const [createdPlayer, setCreatedPlayer] = useState(null);
  const [playerRoster, setPlayerRoster] = useState([]);
  const [playerQuery, setPlayerQuery] = useState('');

  const getId = (row) => row?._id || row?.id;

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/organizer/dashboard');
      setDashboard({
        tournaments: Array.isArray(data?.tournaments) ? data.tournaments : [],
        teams: Array.isArray(data?.teams) ? data.teams : [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data } = await api.get('/organizer/players');
      setPlayerRoster(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load players');
    }
  };

  useEffect(() => {
    loadDashboard();
    loadPlayers();
  }, []);

  useEffect(() => {
    const firstTeamId = getId(dashboard.teams[0]) || '';
    setForm((prev) => ({ ...prev, teamId: prev.teamId || firstTeamId }));
    setManualPlayerForm((prev) => ({ ...prev, teamId: prev.teamId || firstTeamId }));
  }, [dashboard.teams]);

  const addPlayer = async (event) => {
    event.preventDefault();

    if (!form.teamId) {
      toast.error('Select a team');
      return;
    }

    if (!form.playerProfileId && !form.playerId) {
      toast.error('Enter a player profile id or player id');
      return;
    }

    try {
      await api.post(`/organizer/teams/${form.teamId}/players`, {
        playerProfileId: form.playerProfileId || undefined,
        playerId: form.playerId || undefined,
        isSubstitute: form.isSubstitute,
      });
      toast.success('Player added to team');
      setForm((prev) => ({ ...prev, playerProfileId: '', playerId: '', isSubstitute: false }));
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add player');
    }
  };

  const createPlayer = async (event) => {
    event.preventDefault();

    if (!manualPlayerForm.fullName || (!manualPlayerForm.email && !manualPlayerForm.phone)) {
      toast.error('Enter full name and at least one contact method');
      return;
    }

    try {
      const { data } = await api.post('/organizer/players', {
        fullName: manualPlayerForm.fullName,
        email: manualPlayerForm.email || undefined,
        phone: manualPlayerForm.phone || undefined,
        playerRole: manualPlayerForm.playerRole,
        teamId: manualPlayerForm.teamId || undefined,
        isSubstitute: manualPlayerForm.isSubstitute,
      });

      setCreatedPlayer(data);
      toast.success(`Player created with ID ${data?.profile?.playerId || 'generated'}`);
      setManualPlayerForm((prev) => ({
        ...prev,
        fullName: '',
        email: '',
        phone: '',
        playerRole: 'all-rounder',
        isSubstitute: false,
      }));
      await loadDashboard();
      await loadPlayers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create player');
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <p className="section-kicker">Organizer</p>
        <h2 className="section-title">Team Players</h2>
        <p className="mt-2 text-slate-300">
          Use this page to attach a verified player profile or player ID to a team squad.
        </p>
      </section>

      <section className="surface-panel">
        <h3 className="mb-3 text-lg font-semibold text-white">Create Player Manually</h3>
        <p className="mb-4 text-sm text-slate-300">
          This creates a real player account, generates the player ID automatically, and can attach the player to a team in the same step.
        </p>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={createPlayer}>
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Full name"
            value={manualPlayerForm.fullName}
            onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Email"
            value={manualPlayerForm.email}
            onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Phone"
            value={manualPlayerForm.phone}
            onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <select
            className="rounded-xl border px-3 py-2"
            value={manualPlayerForm.playerRole}
            onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, playerRole: e.target.value }))}
          >
            <option value="all-rounder">All-rounder</option>
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="wicket-keeper">Wicket-keeper</option>
          </select>
          <select
            className="rounded-xl border px-3 py-2"
            value={manualPlayerForm.teamId}
            onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, teamId: e.target.value }))}
          >
            <option value="">Attach to team now (optional)</option>
            {dashboard.teams.map((team) => (
              <option key={getId(team)} value={getId(team)}>
                {team.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={manualPlayerForm.isSubstitute}
              onChange={(e) => setManualPlayerForm((prev) => ({ ...prev, isSubstitute: e.target.checked }))}
            />
            Substitute player
          </label>
          <button className="btn-cricket xl:col-span-3" type="submit">
            Create Player
          </button>
        </form>

        {createdPlayer ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
            <p className="font-semibold">Last created player</p>
            <p>Player ID: {createdPlayer?.profile?.playerId || 'generated'}</p>
            <p>Temporary password: {createdPlayer?.temporaryPassword || 'n/a'}</p>
            <p className="mt-2 text-emerald-100/90">
              Use the email or phone you entered to sign in, then change the temporary password after first login.
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface-panel">
        <h3 className="mb-3 text-lg font-semibold text-white">Add Player To Team</h3>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={addPlayer}>
          <select
            className="rounded-xl border px-3 py-2"
            value={form.teamId}
            onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))}
          >
            <option value="">Select team</option>
            {dashboard.teams.map((team) => (
              <option key={getId(team)} value={getId(team)}>
                {team.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Player profile id"
            value={form.playerProfileId}
            onChange={(e) => setForm((prev) => ({ ...prev, playerProfileId: e.target.value }))}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="Player ID"
            value={form.playerId}
            onChange={(e) => setForm((prev) => ({ ...prev, playerId: e.target.value }))}
          />
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.isSubstitute}
              onChange={(e) => setForm((prev) => ({ ...prev, isSubstitute: e.target.checked }))}
            />
            Substitute player
          </label>
          <button className="btn-cricket md:col-span-2 xl:col-span-4" type="submit">
            Add Player
          </button>
        </form>
      </section>

      <section className="surface-panel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Managed Teams</h3>
          <Link to="/dashboard/organizer/matches" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            Go to Match Control
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dashboard.teams.map((team) => (
            <div key={getId(team)} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-lg font-semibold text-white">{team.name}</p>
              <p className="text-sm text-slate-400">{team.shortCode || 'No short code set'}</p>
            </div>
          ))}
          {!loading && dashboard.teams.length === 0 ? <p className="text-sm text-slate-400">No teams available yet.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Player Roster</h3>
            <p className="text-sm text-slate-400">Search by player ID or player name.</p>
          </div>
          <input
            className="rounded-xl border px-3 py-2 md:w-72"
            placeholder="Search players"
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {playerRoster
            .filter((player) => {
              const query = playerQuery.trim().toLowerCase();
              if (!query) return true;
              return [player.playerId, player.user?.fullName, player.user?.email, player.team?.name]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
            })
            .map((player) => (
              <div key={player.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-base font-semibold text-white">{player.user?.fullName || 'Unnamed player'}</p>
                <p className="text-sm text-cyan-200">{player.playerId}</p>
                <p className="text-sm text-slate-400">{player.user?.email || player.user?.phone || 'No contact set'}</p>
                <p className="mt-2 text-sm text-slate-300">Team: {player.team?.name || 'Unassigned'}</p>
                <p className="text-sm text-slate-300">Role: {player.playerRole}</p>
                <p className="text-sm text-slate-300">Status: {player.status}</p>
              </div>
            ))}
          {!loading && playerRoster.length === 0 ? <p className="text-sm text-slate-400">No players available yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default OrganizerTeamsPage;