import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PublicLanding = () => {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', format: '', date: '' });
  const [result, setResult] = useState({ tournaments: [], teams: [], players: [] });
  const [matchBuckets, setMatchBuckets] = useState({ live: [], scheduled: [], completed: [] });
  const [favorites, setFavorites] = useState([]);

  const formatSchedule = (value) => {
    if (!value) return 'TBD';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return 'TBD';
    return dt.toLocaleString();
  };

  const normalizeStatus = (value) => {
    const raw = String(value || '').toLowerCase();
    if (raw === 'live') return 'live';
    if (raw === 'completed') return 'completed';
    return 'scheduled';
  };

  const loadMatches = async () => {
    const { data } = await api.get('/schedules');
    const grouped = { live: [], scheduled: [], completed: [] };

    (data || []).forEach((match) => {
      const status = normalizeStatus(match.status);
      grouped[status].push(match);
    });

    setMatchBuckets(grouped);
  };

  const runSearch = async () => {
    const { data } = await api.get('/search', { params: { query, ...filters } });
    setResult(data);
  };

  const loadFavorites = async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return;
    }

    const { data } = await api.get('/favorites');
    setFavorites(Array.isArray(data) ? data : []);
  };

  const isFavorited = (targetType, targetId) => favorites.some((fav) => fav.targetType === targetType && String(fav.targetId) === String(targetId));

  const toggleFavorite = async (targetType, targetId) => {
    if (!isAuthenticated) return;
    await api.post('/favorites', { targetType, targetId });
    await loadFavorites();
  };

  useEffect(() => {
    runSearch().catch(() => {});
    loadFavorites().catch(() => {});

    loadMatches().catch(() => {});
    const refresh = setInterval(() => {
      loadMatches().catch(() => {});
    }, 15000);

    return () => clearInterval(refresh);
  }, []);

  const counts = useMemo(
    () => ({
      tournaments: result.tournaments.length,
      teams: result.teams.length,
      players: result.players.length,
    }),
    [result]
  );

  return (
    <div className="public-shell page-shell app-canvas space-y-6">
      <section className="hero-panel">
        <p className="section-kicker">Cricket Tournament Organizer</p>
        <h1>Plan tournaments, score live, and engage every cricket fan in real time.</h1>
        <p className="reading-width">Public landing keeps live match display always visible. After login, each user gets two dashboards: live scores and tournament fixtures.</p>
        <div className="mt-5 flex gap-3">
          <Link className="btn-cricket" to="/dashboard">Open Dashboards</Link>
          <Link className="rounded-2xl border px-5 py-3 font-semibold" to="/login">Login</Link>
        </div>
      </section>

      <section className="surface-panel">
        <h2>Smart Search</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border px-3 py-2" placeholder="Search tournaments/teams/players" value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Location" value={filters.location} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))} />
          <select className="rounded-xl border px-3 py-2" value={filters.format} onChange={(e) => setFilters((p) => ({ ...p, format: e.target.value }))}>
            <option value="">Any Format</option>
            <option value="T20">T20</option>
            <option value="ODI">ODI</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input className="rounded-xl border px-3 py-2" type="date" value={filters.date} onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <button className="btn-cricket mt-4" onClick={runSearch}>Search</button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-tile">
          <p className="text-sm uppercase">Tournaments</p>
          <h2>{counts.tournaments}</h2>
        </div>
        <div className="stat-tile">
          <p className="text-sm uppercase">Teams</p>
          <h2>{counts.teams}</h2>
        </div>
        <div className="stat-tile">
          <p className="text-sm uppercase">Players</p>
          <h2>{counts.players}</h2>
        </div>
      </section>

      <section className="surface-panel">
        <h2>Search Results</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Tournaments</h3>
            <div className="space-y-2">
              {(result.tournaments || []).slice(0, 8).map((tournament) => {
                const id = tournament?._id || tournament?.id;
                return (
                  <div key={id} className="card-pro p-3">
                    <p className="font-semibold">{tournament.name}</p>
                    <p className="text-sm">{tournament.location} - {tournament.format}</p>
                    <Link className="mt-2 inline-block rounded-lg border px-3 py-1 text-sm" to={`/leaderboard/${id}`}>
                      View Leaderboard
                    </Link>
                  </div>
                );
              })}
              {(result.tournaments || []).length === 0 ? <p className="text-sm">No tournaments found.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Teams</h3>
            <div className="space-y-2">
              {(result.teams || []).slice(0, 8).map((team) => {
                const id = team?._id || team?.id;
                return (
                  <div key={id} className="card-pro p-3">
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm">Code: {team.shortCode || 'N/A'}</p>
                    <button
                      disabled={!isAuthenticated}
                      className="mt-2 rounded-lg border px-3 py-1 text-sm disabled:opacity-60"
                      onClick={() => toggleFavorite('team', id)}
                    >
                      {isFavorited('team', id) ? 'Unfavorite' : 'Favorite'}
                    </button>
                  </div>
                );
              })}
              {(result.teams || []).length === 0 ? <p className="text-sm">No teams found.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="mb-3 text-lg font-semibold">Players</h3>
            <div className="space-y-2">
              {(result.players || []).slice(0, 8).map((player) => {
                const id = player?._id || player?.id;
                return (
                  <div key={id} className="card-pro p-3">
                    <p className="font-semibold">{player?.userId?.fullName || 'Player'}</p>
                    <p className="text-sm">Player ID: {player.playerId}</p>
                    <p className="text-sm">Role: {player.playerRole}</p>
                    <button
                      disabled={!isAuthenticated}
                      className="mt-2 rounded-lg border px-3 py-1 text-sm disabled:opacity-60"
                      onClick={() => toggleFavorite('player', id)}
                    >
                      {isFavorited('player', id) ? 'Unfavorite' : 'Favorite'}
                    </button>
                  </div>
                );
              })}
              {(result.players || []).length === 0 ? <p className="text-sm">No players found.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel">
        <h2>Match Feed (Live, Scheduled, Completed)</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {['live', 'scheduled', 'completed'].map((bucket) => (
            <div key={bucket} className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide">{bucket}</p>
                <span className="rounded-full border px-2 py-1 text-xs">{matchBuckets[bucket].length}</span>
              </div>

              <div className="space-y-2">
                {matchBuckets[bucket].length === 0 ? <p className="text-xs">No matches available.</p> : null}
                {matchBuckets[bucket].map((m) => {
                  const matchId = m.id || m._id;
                  const detailsLink = isAuthenticated ? `/scorecard/${matchId}` : '/login';

                  return (
                    <div key={matchId} className="card-pro p-3">
                      <p className="font-semibold">{m.matchNo || 'Match'}</p>
                      <p className="text-sm">Status: {m.status || 'scheduled'}</p>
                      <p className="text-sm">Scheduled: {formatSchedule(m.scheduledAt)}</p>
                      <div className="mt-2 flex gap-2">
                        <Link className="rounded-lg border px-3 py-1" to={detailsLink}>
                          {isAuthenticated ? 'View Full Details' : 'Login for Full Details'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PublicLanding;
