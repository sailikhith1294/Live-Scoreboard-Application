import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ email: '', role: 'player' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, requestsRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getPendingRequests()
      ]);
      setUsers(usersRes.data?.data || []);
      setPendingRequests(requestsRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin data');
      setUsers([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignRole = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.assignRoleByEmail(assignForm.email, assignForm.role);
      toast.success(`Assigned ${assignForm.role} role`);
      setAssignForm({ email: '', role: 'player' });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign role');
    }
  };

  const handleApprove = async (userRoleId) => {
    try {
      await adminAPI.approveRequest(userRoleId);
      toast.success('Request approved');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (userRoleId) => {
    try {
      await adminAPI.rejectRequest(userRoleId, 'Rejected by admin');
      toast.success('Request rejected');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel p-6">
        <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
        <p className="mt-2 text-slate-300">Admin can view users and promote to manager/player after role request.</p>
      </div>

      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Assign Role (Admin)</h2>
        <form onSubmit={handleAssignRole} className="grid gap-2 md:grid-cols-3">
          <input
            type="email"
            required
            value={assignForm.email}
            onChange={(e) => setAssignForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="User email"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <select
            value={assignForm.role}
            onChange={(e) => setAssignForm((prev) => ({ ...prev, role: e.target.value }))}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="player">player</option>
            <option value="manager">manager</option>
          </select>
          <button className="rounded-md border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100" type="submit">
            Assign Role
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2">Role assignment requires user to have a pending role request.</p>
      </div>

      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Pending Role Requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-slate-400 text-sm">No pending requests.</p>
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

      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Users</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-slate-400 text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2">Username</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Account Type</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-slate-700/60">
                    <td className="py-2 text-white">{user.username}</td>
                    <td className="py-2 text-slate-300">{user.email}</td>
                    <td className="py-2 text-slate-300">{user.accountType || 'match-centre'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
