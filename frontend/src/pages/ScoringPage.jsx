import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

const ScoringPage = () => {
  const { matchId } = useParams();
  const [scorecard, setScorecard] = useState(null);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ overNumber: 1, ballNumber: 1, batsmanRuns: 0, extras: 0, isWicket: false, decisionType: 'not-out', remarks: '' });

  const load = async () => {
    const { data } = await api.get(`/matches/${matchId}/scorecard`);
    setScorecard(data.scorecard);
    setEvents(data.events || []);
  };

  useEffect(() => {
    load().catch(() => {});
    socket.connect();
    socket.emit('match:join', matchId);

    const onScoreUpdate = ({ scorecard: updated, ball }) => {
      setScorecard(updated);
      setEvents((prev) => [...prev, ball]);
    };

    socket.on('score:update', onScoreUpdate);
    return () => {
      socket.emit('match:leave', matchId);
      socket.off('score:update', onScoreUpdate);
    };
  }, [matchId]);

  const submitBall = async (event) => {
    event.preventDefault();
    const payload = {
      innings: 1,
      overNumber: Number(form.overNumber),
      ballNumber: Number(form.ballNumber),
      batsmanRuns: Number(form.batsmanRuns),
      extras: Number(form.extras),
      isWicket: form.isWicket,
      umpireDecision: {
        decisionType: form.decisionType,
        remarks: form.remarks,
      },
      commentary: `${form.batsmanRuns} run(s)`,
    };

    await api.post(`/matches/${matchId}/balls`, payload);
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2>Live Scoring Console</h2>
        <p>Ball-by-ball scoring with umpire decision logging and instant socket updates.</p>
      </section>

      <section className="surface-panel">
        <p className="text-lg font-semibold">Current Score: {scorecard?.runs || 0}/{scorecard?.wickets || 0} ({scorecard?.overs || 0})</p>
      </section>

      <section className="surface-panel">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submitBall}>
          <input className="rounded-xl border px-3 py-2" type="number" min="1" value={form.overNumber} onChange={(e) => setForm((p) => ({ ...p, overNumber: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" type="number" min="1" value={form.ballNumber} onChange={(e) => setForm((p) => ({ ...p, ballNumber: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" type="number" min="0" value={form.batsmanRuns} onChange={(e) => setForm((p) => ({ ...p, batsmanRuns: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2" type="number" min="0" value={form.extras} onChange={(e) => setForm((p) => ({ ...p, extras: e.target.value }))} />
          <select className="rounded-xl border px-3 py-2" value={form.decisionType} onChange={(e) => setForm((p) => ({ ...p, decisionType: e.target.value }))}>
            <option value="not-out">Not out</option>
            <option value="out">Out</option>
            <option value="wide">Wide</option>
            <option value="no-ball">No ball</option>
            <option value="dead-ball">Dead ball</option>
          </select>
          <input className="rounded-xl border px-3 py-2" placeholder="Decision remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isWicket} onChange={(e) => setForm((p) => ({ ...p, isWicket: e.target.checked }))} />
            Wicket
          </label>
          <button className="btn-cricket" type="submit">Submit Ball Event</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3">Ball History</h3>
        <div className="max-h-72 overflow-auto space-y-2">
          {events.slice(-30).reverse().map((e) => (
            <div key={e.id} className="rounded-xl border p-3 text-sm">
              Over {e.overNumber}.{e.ballNumber} - {e.batsmanRuns + e.extras} run(s) {e.isWicket ? '- Wicket' : ''}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ScoringPage;
