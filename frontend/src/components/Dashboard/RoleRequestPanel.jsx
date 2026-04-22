import React, { useEffect, useState } from 'react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const RoleRequestPanel = ({ defaultRole = 'player', title = 'Request Higher Role' }) => {
  const [loading, setLoading] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [form, setForm] = useState({
    requestedRole: defaultRole,
    reason: '',
    requestedToManagerEmail: ''
  });

  const loadCurrentRequest = async () => {
    try {
      const response = await authAPI.getMyRoleRequest();
      setCurrentRequest(response.data?.data || null);
    } catch (error) {
      setCurrentRequest(null);
    }
  };

  useEffect(() => {
    loadCurrentRequest();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.requestRole(form);
      toast.success('Role request sent to higher-level approver');
      await loadCurrentRequest();
      setForm((prev) => ({ ...prev, reason: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit role request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-panel p-5">
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>

      {currentRequest?.isPendingApproval && currentRequest?.approvalRequest?.requestedRole ? (
        <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Pending request: {currentRequest.approvalRequest.requestedRole}
          <div className="text-xs mt-1 text-amber-200">
            Submitted: {currentRequest.approvalRequest.requestedAt ? new Date(currentRequest.approvalRequest.requestedAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <select
            value={form.requestedRole}
            onChange={(e) => setForm((prev) => ({ ...prev, requestedRole: e.target.value }))}
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="player">Request Player Role</option>
            <option value="manager">Request Manager Role</option>
          </select>

          {form.requestedRole === 'player' && (
            <input
              value={form.requestedToManagerEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, requestedToManagerEmail: e.target.value }))}
              placeholder="Manager email (required for player role)"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              required
            />
          )}

          <textarea
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            rows={3}
            placeholder="Why do you need this role?"
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100"
          >
            {loading ? 'Submitting...' : 'Submit Role Request'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RoleRequestPanel;
