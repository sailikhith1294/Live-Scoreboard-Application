import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const LeaderboardPage = () => {
  const { tournamentId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/tournaments/${tournamentId}/leaderboard`)
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setRows([]);
        setError(err.response?.data?.message || 'Failed to load leaderboard');
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  return (
    <div className="surface-panel">
      <h2 className="mb-4">Leaderboard</h2>
      {loading ? <p className="mb-3 text-sm text-slate-400">Loading leaderboard...</p> : null}
      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Rank</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>Pts</th>
              <th>NRR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr key={r.id} className="border-t">
                <td>{index + 1}</td>
                <td>{r.teamId?.name || 'Team'}</td>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.lost}</td>
                <td>{r.points}</td>
                <td>{r.netRunRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <p className="mt-3 text-sm text-slate-400">No leaderboard data yet.</p> : null}
      </div>
    </div>
  );
};

export default LeaderboardPage;
