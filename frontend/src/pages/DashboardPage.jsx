import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import LiveScoresDashboard from './LiveScoresDashboard';
import FixturesDashboard from './FixturesDashboard';
import socket from '../services/socket';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const rawView = searchParams.get('view');
  const activeTab = rawView === 'fixtures' ? 'fixtures' : 'live';

  useEffect(() => {
    const loadExtras = async () => {
      try {
        const [notificationsRes, tournamentsRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/tournaments')
        ]);
        setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data.slice(0, 5) : []);
        setTournaments(Array.isArray(tournamentsRes.data) ? tournamentsRes.data.slice(0, 6) : []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dashboard extras');
      }
    };

    loadExtras();

    socket.connect();
    const onGlobalNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
    };
    const onPlayerNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
    };

    socket.on('notification:global', onGlobalNotification);
    socket.on('notification:players', onPlayerNotification);

    return () => {
      socket.off('notification:global', onGlobalNotification);
      socket.off('notification:players', onPlayerNotification);
    };
  }, []);

  const getId = (row) => row?._id || row?.id;

  const switchTab = (view) => {
    setSearchParams({ view });
  };

  return (
    <div className="page-shell app-canvas space-y-6">
      <header className="surface-panel flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">{user?.fullName}</h2>
          <p className="text-slate-300">User Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-xl border px-3 py-2" to="/">Public</Link>
          <button className="rounded-xl border px-3 py-2" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Role</p>
          <p className="text-2xl font-bold text-white mt-1">User</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Live View</p>
          <p className="text-2xl font-bold text-red-300 mt-1">Enabled</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Notifications</p>
          <p className="text-2xl font-bold text-cyan-100 mt-1">{notifications.length}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="text-slate-400 text-sm">Tournaments</p>
          <p className="text-2xl font-bold text-emerald-100 mt-1">{tournaments.length}</p>
        </div>
      </section>

      <section className="surface-panel">
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-4 py-2 ${activeTab === 'live' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => switchTab('live')}
          >
            Live Score Dashboard
          </button>
          <button
            className={`rounded-xl border px-4 py-2 ${activeTab === 'fixtures' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => switchTab('fixtures')}
          >
            Fixtures Dashboard
          </button>
        </div>
      </section>

      {activeTab === 'live' ? <LiveScoresDashboard /> : null}
      {activeTab === 'fixtures' ? <FixturesDashboard /> : null}

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Recent Notifications</h3>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={getId(n)} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <p className="font-semibold text-white">{n.title}</p>
              <p className="text-sm text-slate-300">{n.message}</p>
            </div>
          ))}
          {notifications.length === 0 ? <p className="text-sm text-slate-400">No notifications yet.</p> : null}
        </div>
      </section>

      <section className="surface-panel">
        <h3 className="font-semibold mb-3 text-white">Public Tournaments</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {tournaments.map((t) => (
            <Link key={getId(t)} to={`/leaderboard/${getId(t)}`} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 hover:border-cyan-300/45 transition-colors">
              <p className="font-semibold text-white">{t.name || 'Tournament'}</p>
              <p className="text-sm text-slate-300">{t.location || 'TBD'} - {t.format || 'T20'}</p>
            </Link>
          ))}
          {tournaments.length === 0 ? <p className="text-sm text-slate-400">No tournaments available.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
