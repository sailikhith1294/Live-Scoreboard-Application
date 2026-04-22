import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

const PlayerLivePage = () => {
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    api.get('/matches/live').then((res) => setLiveMatches(Array.isArray(res.data) ? res.data : [])).catch(() => setLiveMatches([]));
  }, []);

  const getId = (row) => row?._id || row?.id;

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Player Live Matches</h2>
        <p className="mt-2 text-slate-300">Open scorecards and monitor current match state.</p>
      </section>

      <section className="surface-panel p-4">
        <div className="space-y-2">
          {liveMatches.map((m) => (
            <div key={getId(m)} className="rounded-xl border p-3 border-slate-700/60 bg-slate-900/50 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{m.matchNo || 'Live Match'}</p>
                <p className="text-slate-300 text-sm">{m.currentRuns || 0}/{m.currentWickets || 0} in {m.currentOver || 0}.{m.currentBall || 0}</p>
              </div>
              <Link className="rounded-md border px-3 py-1 text-sm border-cyan-300/40 bg-cyan-500/15 text-cyan-100" to={`/scorecard/${getId(m)}`}>
                View Scorecard
              </Link>
            </div>
          ))}
          {liveMatches.length === 0 ? <p className="text-sm text-slate-400">No live matches right now.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default PlayerLivePage;
