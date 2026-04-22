import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import socket from '../services/socket';

const PlayerDashboardPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getId = (row) => row?._id || row?.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [notificationsRes, liveRes, schedulesRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/matches/live'),
          api.get('/schedules'),
          api.get('/me/player-profile').catch(() => ({ data: null })),
        ]);
        setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
        setLiveMatches(Array.isArray(liveRes.data) ? liveRes.data : []);
        const allSchedules = Array.isArray(schedulesRes.data) ? schedulesRes.data : [];
        setSchedule(allSchedules.slice(0, 8));
        setPlayerProfile(arguments[0]);
      } catch (error) {
        setNotifications([]);
        setLiveMatches([]);
        setSchedule([]);
        setPlayerProfile(null);
        toast.error(error.response?.data?.message || 'Failed to load player dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();

    socket.connect();
    const onGlobalNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
    };
    const onPlayerNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
    };

    socket.on('notification:global', onGlobalNotification);
    socket.on('notification:players', onPlayerNotification);

    return () => {
      socket.off('notification:global', onGlobalNotification);
      socket.off('notification:players', onPlayerNotification);
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="surface-panel">
        <h2 className="text-2xl font-black text-white">Player Dashboard</h2>
        <p className="mt-2 text-slate-300">Track live games, view scorecards, check schedules, and receive notifications.</p>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">My Player Identity</h3>
        {playerProfile ? (
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-xs text-slate-400 uppercase">Player ID</p>
              <p className="text-lg font-bold text-cyan-100">{playerProfile.playerId || 'Pending'}</p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-xs text-slate-400 uppercase">Role</p>
              <p className="text-lg font-bold text-white">{playerProfile.playerRole || 'all-rounder'}</p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="text-xs text-slate-400 uppercase">Availability</p>
              <p className="text-lg font-bold text-emerald-100">{playerProfile.availabilityStatus || 'available'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Player profile not found yet. Contact organizer/admin to create your profile.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Live Matches</p>
          <p className="text-2xl font-bold text-red-300 mt-1">{liveMatches.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Upcoming Fixtures</p>
          <p className="text-2xl font-bold text-cyan-100 mt-1">{schedule.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Notifications</p>
          <p className="text-2xl font-bold text-emerald-100 mt-1">{notifications.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Role</p>
          <p className="text-2xl font-bold text-amber-100 mt-1">Player</p>
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Quick Access</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/user?view=live" className="rounded-lg border px-3 py-2 text-sm border-cyan-300/40 bg-cyan-500/15 text-cyan-100">Live Dashboard</Link>
          <Link to="/dashboard/user?view=fixtures" className="rounded-lg border px-3 py-2 text-sm border-emerald-300/40 bg-emerald-500/15 text-emerald-100">Fixtures Dashboard</Link>
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Live Matches</h3>
        {loading ? <p className="text-sm text-slate-400">Loading live matches...</p> : null}
        <div className="space-y-2">
          {liveMatches.map((m) => (
            <div key={getId(m)} className="rounded-xl border p-3 border-slate-700/60 bg-slate-900/50 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{m.matchNo || 'Live Match'}</p>
                <p className="text-sm text-slate-300">{m.currentRuns || 0}/{m.currentWickets || 0} in {m.currentOver || 0}.{m.currentBall || 0}</p>
              </div>
              <Link to={`/scorecard/${getId(m)}`} className="rounded-md border px-3 py-1 text-sm border-cyan-300/40 bg-cyan-500/15 text-cyan-100">Scorecard</Link>
            </div>
          ))}
          {!loading && liveMatches.length === 0 ? <p className="text-sm text-slate-400">No live matches right now.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Upcoming Schedule</h3>
        <div className="space-y-2">
          {schedule.map((m) => (
            <div key={getId(m)} className="rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <p className="font-semibold text-white">{m.matchNo || `${m.homeTeamId || 'Team A'} vs ${m.awayTeamId || 'Team B'}`}</p>
              <p className="text-sm text-slate-300">Status: {m.status || 'scheduled'}</p>
              <p className="text-xs text-slate-400 mt-1">Scheduled: {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}</p>
            </div>
          ))}
          {!loading && schedule.length === 0 ? <p className="text-sm text-slate-400">No scheduled matches available.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Notifications</h3>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={getId(n)} className="rounded-xl border p-3 border-slate-700/60 bg-slate-900/50">
              <p className="font-semibold text-white">{n.title}</p>
              <p className="text-sm text-slate-300">{n.message}</p>
            </div>
          ))}
          {!loading && notifications.length === 0 ? <p className="text-sm text-slate-400">No notifications yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default PlayerDashboardPage;
