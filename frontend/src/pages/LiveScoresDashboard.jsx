import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const LiveScoresDashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const getId = (row) => row?._id || row?.id;

  const loadLiveMatches = async () => {
    const { data } = await api.get('/matches/live');
    setMatches(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadLiveMatches().catch(() => setLoading(false));
    const interval = setInterval(() => {
      loadLiveMatches().catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="surface-panel">Loading live matches...</div>;
  }

  return (
    <section className="surface-panel">
      <h3 className="font-semibold mb-3">Live Match Score Dashboard</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {matches.length === 0 ? <p className="text-sm">No live matches right now.</p> : null}
        {matches.map((m) => (
          <div key={getId(m)} className="card-pro p-4">
            <p className="font-semibold">{m.matchNo || 'Live Match'}</p>
            <p className="text-sm">{m.currentRuns || 0}/{m.currentWickets || 0} in {m.currentOver || 0}.{m.currentBall || 0}</p>
            <div className="mt-3 flex gap-2">
              <Link className="rounded-lg border px-3 py-1" to={`/scorecard/${getId(m)}`}>View Scorecard</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiveScoresDashboard;
