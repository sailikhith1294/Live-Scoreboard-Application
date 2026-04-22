import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const UmpireDashboardPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const getId = (row) => row?._id || row?.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/umpire/dashboard');
        setMatches(Array.isArray(data?.matches) ? data.matches : []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load assigned matches');
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Umpire Control Desk</h2>
        <p className="mt-2 text-slate-300">Review assigned matches and open the live scoring console.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Assigned Matches</p>
          <p className="text-2xl font-bold text-white mt-1">{matches.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Live Now</p>
          <p className="text-2xl font-bold text-red-300 mt-1">{matches.filter((m) => m.status === 'live').length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Scheduled</p>
          <p className="text-2xl font-bold text-cyan-100 mt-1">{matches.filter((m) => m.status === 'scheduled').length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-emerald-100 mt-1">{matches.filter((m) => m.status === 'completed').length}</p>
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Assigned Matches</h3>
        {loading ? <p className="text-sm text-slate-400">Loading matches...</p> : null}
        <div className="space-y-3">
          {matches.map((match) => {
            const matchId = getId(match);
            return (
              <div key={matchId} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{match.homeTeamId?.name || 'Home'} vs {match.awayTeamId?.name || 'Away'}</p>
                    <p className="text-sm text-slate-400">{match.status || 'scheduled'} | {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : 'No schedule set'}</p>
                    <p className="text-xs text-slate-500 mt-1">{match.tournamentId?.name || 'Tournament'} • {match.venueId?.name || 'Venue TBD'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100" to={`/dashboard/umpire/scoring/${matchId}`}>
                      Open Scoring
                    </Link>
                    <Link className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-200" to={`/scorecard/${matchId}`}>
                      View Scorecard
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && matches.length === 0 ? <p className="text-sm text-slate-400">No matches assigned yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default UmpireDashboardPage;
