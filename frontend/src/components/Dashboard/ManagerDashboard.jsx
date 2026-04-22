import React, { useEffect, useState } from 'react';
import TournamentManagerDashboard from './TournamentManagerDashboard';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ManagerDashboard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignForm, setAssignForm] = useState({ email: '', role: 'player' });

  const loadRequests = async () => {
    try {
      const response = await adminAPI.getPendingRequests();
      setPendingRequests(response.data?.data || []);
    } catch (error) {
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (userRoleId) => {
    try {
      await adminAPI.approveRequest(userRoleId);
      toast.success('Player request approved');
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (userRoleId) => {
    try {
      await adminAPI.rejectRequest(userRoleId, 'Rejected by manager');
      toast.success('Request rejected');
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleAssignPlayer = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.assignRoleByEmail(assignForm.email, 'player');
      toast.success('Player role assigned');
      setAssignForm({ email: '', role: 'player' });
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign player role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Manager Role Actions</h2>
        <form onSubmit={handleAssignPlayer} className="grid gap-2 md:grid-cols-2">
          <input
            type="email"
            required
            value={assignForm.email}
            onChange={(e) => setAssignForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="User email (must have pending player request)"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <button className="rounded-md border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100" type="submit">
            Assign Player Role
          </button>
        </form>
      </div>

      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Pending Player Requests (for you)</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-slate-400 text-sm">No pending requests assigned to you.</p>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req._id} className="rounded-md border border-slate-700 bg-slate-900/50 p-3">
                <p className="font-semibold text-white">{req.user?.username} ({req.user?.email})</p>
                <p className="text-sm text-slate-400">Requested: {req.approvalRequest?.requestedRole}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleApprove(req._id)} className="rounded border border-emerald-300/40 bg-emerald-500/12 px-3 py-1 text-xs text-emerald-100">Approve</button>
                  <button onClick={() => handleReject(req._id)} className="rounded border border-red-300/40 bg-red-500/12 px-3 py-1 text-xs text-red-100">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TournamentManagerDashboard />
    </div>
  );
};

export default ManagerDashboard;
