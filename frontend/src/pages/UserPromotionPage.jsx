import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const UserPromotionPage = () => {
  const [loading, setLoading] = useState(true);
  const [requestState, setRequestState] = useState({ promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
  const [form, setForm] = useState({ requestedRole: 'player', message: '' });

  const loadRequest = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/me/promotion-request');
      setRequestState(data || { promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load promotion status');
      setRequestState({ promotionRequest: null, role: 'viewer', approvalStatus: 'approved' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, []);

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/me/promotion-request', form);
      toast.success('Promotion request sent to admin');
      await loadRequest();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  const request = requestState.promotionRequest;

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Promotion Request</h2>
        <p className="mt-2 text-slate-300">Contact admin for role promotion to Organizer, Umpire, or Player.</p>
      </section>

      <section className="surface-panel p-4">
        <h3 className="text-white font-semibold mb-3">Current Status</h3>
        {loading ? <p className="text-sm text-slate-400">Loading status...</p> : null}
        {!loading && !request ? (
          <p className="text-sm text-slate-300">No promotion request submitted yet.</p>
        ) : null}
        {!loading && request ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 text-sm">
            <p className="text-white">Requested Role: {request.requestedRole}</p>
            <p className="text-slate-300 mt-1">Status: {request.status}</p>
            <p className="text-slate-400 mt-1">Requested At: {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : 'N/A'}</p>
            <p className="text-slate-400 mt-1">Message: {request.message || 'No message'}</p>
          </div>
        ) : null}
      </section>

      <section className="surface-panel p-4">
        <h3 className="text-white font-semibold mb-3">Send Request to Admin</h3>
        <form className="grid gap-3" onSubmit={submitRequest}>
          <select
            value={form.requestedRole}
            onChange={(e) => setForm((prev) => ({ ...prev, requestedRole: e.target.value }))}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="player">Player</option>
            <option value="organizer">Organizer</option>
            <option value="umpire">Umpire</option>
          </select>
          <textarea
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Tell admin why you need this role"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white min-h-28"
          />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold border-cyan-300/40 bg-cyan-500/15 text-cyan-100" type="submit">
            Send Promotion Request
          </button>
        </form>
      </section>
    </div>
  );
};

export default UserPromotionPage;
