import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, tournamentsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/tournaments'),
        ]);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setTournaments(Array.isArray(tournamentsRes.data) ? tournamentsRes.data : []);
      } catch (error) {
        setUsers([]);
        setTournaments([]);
        toast.error(error.response?.data?.message || 'Failed to load admin dashboard data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const getId = (row) => row?._id || row?.id;

  const reviewOrganizer = async (organizerId, status) => {
    try {
      await api.patch(`/admin/organizers/${organizerId}/approval`, { status });
      setUsers((prev) => prev.map((u) => (getId(u) === organizerId ? { ...u, approvalStatus: status } : u)));
      toast.success(`Organizer ${status}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update organizer status');
    }
  };

  const promoteUserRole = async (userId, role) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (getId(u) === userId ? data : u)));
      toast.success(`Role updated to ${role}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const sendGlobalNotification = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications/global', {
        title: notificationForm.title,
        message: notificationForm.message,
      });
      setNotificationForm({ title: '', message: '' });
      toast.success('Global notification sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    }
  };

  const organizerUsers = users.filter((u) => u.role === 'organizer');
  const nonAdminUsers = users.filter((u) => u.role !== 'admin');
  const pendingOrganizers = organizerUsers.filter((u) => u.approvalStatus !== 'approved');
  const pendingPromotionRequests = users.filter((u) => u?.promotionRequest?.status === 'pending');

  const decidePromotionRequest = async (userId, decision) => {
    try {
      await api.patch(`/admin/users/${userId}/promotion-request`, { decision });
      toast.success(`Promotion request ${decision}`);
      const usersRes = await api.get('/admin/users');
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to decide promotion request');
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Admin Control Center</h2>
        <p className="mt-2 text-slate-300">All key admin controls are shown below: user role control, organizer approvals, tournaments oversight, and global notifications.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Pending Organizers</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{pendingOrganizers.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Organizers</p>
          <p className="text-2xl font-bold text-cyan-200 mt-1">{organizerUsers.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Tournaments</p>
          <p className="text-2xl font-bold text-emerald-200 mt-1">{tournaments.length}</p>
        </div>
      </section>

      <section className="surface-panel p-4">
        <h3 className="font-semibold mb-3 text-white">Global Notification</h3>
        <form onSubmit={sendGlobalNotification} className="grid gap-2 md:grid-cols-4">
          <input
            type="text"
            required
            value={notificationForm.title}
            onChange={(e) => setNotificationForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Notification title"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white md:col-span-1"
          />
          <input
            type="text"
            required
            value={notificationForm.message}
            onChange={(e) => setNotificationForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Message for all users"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white md:col-span-2"
          />
          <button className="rounded-lg border px-3 py-2 text-sm font-semibold text-cyan-100 border-cyan-300/40 bg-cyan-500/15" type="submit">Send</button>
        </form>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">User Role Promotion</h3>
        {loading ? <p className="text-sm text-slate-400">Loading users...</p> : null}
        <div className="space-y-2">
          {nonAdminUsers.map((user) => (
            <div key={getId(user)} className="flex items-center justify-between rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <div>
                <p className="font-medium text-white">{user.fullName || user.username || 'Unnamed User'}</p>
                <p className="text-sm text-slate-300">{user.email || user.phone} - current role: {user.role}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-1 text-sm border-slate-600 text-slate-200" onClick={() => promoteUserRole(getId(user), 'viewer')}>Set User</button>
                <button className="rounded-lg border px-3 py-1 text-sm border-cyan-400/40 text-cyan-100" onClick={() => promoteUserRole(getId(user), 'organizer')}>Set Organizer</button>
                <button className="rounded-lg border px-3 py-1 text-sm border-indigo-400/40 text-indigo-100" onClick={() => promoteUserRole(getId(user), 'umpire')}>Set Umpire</button>
                <button className="rounded-lg border px-3 py-1 text-sm border-emerald-400/40 text-emerald-100" onClick={() => promoteUserRole(getId(user), 'player')}>Set Player</button>
              </div>
            </div>
          ))}
          {!loading && nonAdminUsers.length === 0 ? <p className="text-sm text-slate-400">No users available for role promotion.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Organizer Approvals</h3>
        <div className="space-y-2">
          {organizerUsers.map((user) => (
            <div key={getId(user)} className="flex items-center justify-between rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <div>
                <p className="font-medium text-white">{user.fullName || user.username || 'Unnamed Organizer'}</p>
                <p className="text-sm text-slate-300">{user.email || user.phone} - {user.approvalStatus || 'pending'}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-1 text-sm border-emerald-400/40 text-emerald-100" onClick={() => reviewOrganizer(getId(user), 'approved')}>Approve</button>
                <button className="rounded-lg border px-3 py-1 text-sm border-red-400/40 text-red-100" onClick={() => reviewOrganizer(getId(user), 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {!loading && organizerUsers.length === 0 ? <p className="text-sm text-slate-400">No organizer accounts found.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">User Promotion Requests</h3>
        <div className="space-y-2">
          {pendingPromotionRequests.map((user) => (
            <div key={getId(user)} className="flex items-center justify-between rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <div>
                <p className="font-medium text-white">{user.fullName || user.username || 'Unnamed User'}</p>
                <p className="text-sm text-slate-300">{user.email || user.phone}</p>
                <p className="text-xs text-slate-400 mt-1">Requested Role: {user.promotionRequest?.requestedRole} | Message: {user.promotionRequest?.message || 'No message'}</p>
                {user.promotionRequest?.requestedBy ? (
                  <p className="text-xs text-slate-500 mt-1">Suggested By: {user.promotionRequest.requestedBy.fullName || user.promotionRequest.requestedBy.email || 'Organizer'}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-1 text-sm border-emerald-400/40 text-emerald-100" onClick={() => decidePromotionRequest(getId(user), 'approved')}>Approve</button>
                <button className="rounded-lg border px-3 py-1 text-sm border-red-400/40 text-red-100" onClick={() => decidePromotionRequest(getId(user), 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {!loading && pendingPromotionRequests.length === 0 ? <p className="text-sm text-slate-400">No pending promotion requests.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Tournament Oversight</h3>
        <div className="space-y-2">
          {tournaments.map((item) => (
            <div key={getId(item)} className="rounded-xl border p-3 text-sm border-slate-700/60 bg-slate-900/50">
              <p className="text-white font-medium">{item.name || item.title || 'Untitled Tournament'}</p>
              <p className="text-slate-300 mt-1">Status: {item.status || 'upcoming'}</p>
              <p className="text-slate-400 mt-1">Start: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'TBD'}</p>
            </div>
          ))}
          {!loading && tournaments.length === 0 ? <p className="text-sm text-slate-400">No tournaments available.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
