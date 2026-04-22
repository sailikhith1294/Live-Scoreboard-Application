import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ScorecardPage = () => {
  const { matchId } = useParams();
  const [data, setData] = useState({ match: null, scorecard: null, events: [], decisions: [] });

  useEffect(() => {
    api.get(`/matches/${matchId}/scorecard`).then((res) => setData(res.data)).catch(() => {});
  }, [matchId]);

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2>Match Scorecard</h2>
        <p>Runs: {data.scorecard?.runs || 0} / Wickets: {data.scorecard?.wickets || 0} / Overs: {data.scorecard?.overs || 0}</p>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3">Umpire Decision Audit Log</h3>
        <div className="space-y-2">
          {data.decisions.map((d) => (
            <div key={d.id} className="rounded-xl border p-3 text-sm">
              {d.decisionType} by umpire {d.umpireId} at {new Date(d.decisionTs).toLocaleString()} - {d.remarks || 'No remarks'}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ScorecardPage;
