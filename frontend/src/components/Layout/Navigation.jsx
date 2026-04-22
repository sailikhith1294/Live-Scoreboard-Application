import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiMenu, FiX, FiLogOut,
  FiCompass
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { PRESENTATION_MODE } from '../../config/presentationMode';
import toast from 'react-hot-toast';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, primaryRole, canPermission } = useAuth();

  const navByRole = {
    admin: [
      { path: '/dashboard/admin', label: 'Admin Home', shortLabel: 'Admin', icon: FiHome },
      { path: '/dashboard/organizer', label: 'Organizer Ops', shortLabel: 'Ops', icon: FiCompass },
      { path: '/dashboard/organizer/teams', label: 'Team Players', shortLabel: 'Teams', icon: FiCompass },
      { path: '/dashboard/organizer/matches', label: 'Match Control', shortLabel: 'Matches', icon: FiCompass },
      { path: '/dashboard/player/live', label: 'Player Live', shortLabel: 'Player', icon: FiCompass },
      { path: '/dashboard/user/fixtures', label: 'Schedule', shortLabel: 'Schedule', icon: FiCompass, permission: 'tournament.view_tournaments' }
    ],
    organizer: [
      { path: '/dashboard/organizer', label: 'Organizer Home', shortLabel: 'Organizer', icon: FiHome },
      { path: '/dashboard/organizer/teams', label: 'Team Players', shortLabel: 'Teams', icon: FiCompass },
      { path: '/dashboard/organizer/matches', label: 'Match Control', shortLabel: 'Matches', icon: FiCompass },
      { path: '/dashboard/organizer/feed', label: 'Live Feed', shortLabel: 'Feed', icon: FiCompass },
      { path: '/dashboard/user/live', label: 'Live Centre', shortLabel: 'Live', icon: FiCompass },
      { path: '/dashboard/user/fixtures', label: 'Schedule', shortLabel: 'Schedule', icon: FiCompass, permission: 'tournament.view_tournaments' }
    ],
    player: [
      { path: '/dashboard/player', label: 'Player Home', shortLabel: 'Player', icon: FiHome },
      { path: '/dashboard/player/live', label: 'Live Matches', shortLabel: 'Live', icon: FiCompass },
      { path: '/dashboard/user/fixtures', label: 'Schedule', shortLabel: 'Schedule', icon: FiCompass, permission: 'tournament.view_tournaments' }
    ],
    umpire: [
      { path: '/dashboard/umpire', label: 'Umpire Home', shortLabel: 'Umpire', icon: FiHome },
      { path: '/dashboard/user/live', label: 'Live Centre', shortLabel: 'Live', icon: FiCompass },
      { path: '/dashboard/user/fixtures', label: 'Schedule', shortLabel: 'Schedule', icon: FiCompass, permission: 'tournament.view_tournaments' }
    ],
    user: [
      { path: '/dashboard/user', label: 'Home', shortLabel: 'Home', icon: FiHome },
      { path: '/dashboard/user/live', label: 'Live', shortLabel: 'Live', icon: FiCompass },
      { path: '/dashboard/user/fixtures', label: 'Schedule', shortLabel: 'Schedule', icon: FiCompass, permission: 'tournament.view_tournaments' },
      { path: '/dashboard/user/promotion', label: 'Promotion Request', shortLabel: 'Promote', icon: FiCompass }
    ]
  };

  const baseNavItems = PRESENTATION_MODE
    ? [{ path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: FiHome }]
    : (navByRole[primaryRole] || navByRole.user);

  const navItems = baseNavItems.filter((item) => !item.permission || canPermission(item.permission));

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === path;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const dockItems = navItems.slice(0, 5);

  return (
    <>
      {/* Desktop Side Rail */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 z-50 w-64 flex-col rounded-[2rem] border border-cyan-300/20 bg-slate-950/90 p-4 backdrop-blur-2xl shadow-[0_24px_60px_rgba(2,6,23,0.58)]">
        <Link to="/dashboard" className="mb-4 rounded-2xl border border-cyan-300/20 bg-slate-900/85 p-3 transition-colors hover:border-cyan-300/45">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CREASE" className="h-12 w-12 rounded-lg object-contain" />
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-slate-100">CREASE</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">{(primaryRole || 'user')} dashboard</p>
            </div>
          </div>
        </Link>

        <div className="mb-2 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</p>
        </div>

        <div className="rail-scroll flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                isActive(item.path)
                  ? 'border-cyan-300/55 bg-cyan-500/16 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]'
                  : 'border-transparent bg-slate-900/50 text-slate-300 hover:border-slate-600/70 hover:bg-slate-900/80 hover:text-white'
              }`}
            >
              <item.icon className="text-lg" />
              <span className="text-sm font-semibold tracking-wide">{item.label}</span>
              {isActive(item.path) && <span className="ml-auto h-2 w-2 rounded-full bg-cyan-200" />}
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/75 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{(primaryRole || 'user')} login</p>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/80 text-sm font-bold text-white">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'User'}</p>
              <p className="truncate text-xs text-slate-400">Profile active</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-slate-600/80 bg-slate-800/75 px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700/80"
          >
            <span className="inline-flex items-center gap-2">
              <FiLogOut />
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed left-0 right-0 top-0 z-50 border-b border-slate-700/60 bg-slate-950/92 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CREASE" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-slate-200">CREASE</p>
              <p className="text-[10px] text-slate-400">Match Console</p>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl border border-slate-700/70 bg-slate-900/85 p-2 text-white"
          >
            {isOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="lg:hidden fixed inset-x-3 top-16 z-50 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-3 backdrop-blur-2xl shadow-[0_24px_64px_rgba(2,6,23,0.52)]"
          >
            <div className="mb-3 rounded-xl border border-slate-700/70 bg-slate-900/75 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{(primaryRole || 'user')} Login</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-blue-500/80 text-white font-bold flex items-center justify-center">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-slate-400">Signed in with {primaryRole || 'user'} role</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-xl border px-3 py-3 ${
                    isActive(item.path)
                      ? 'border-blue-300/45 bg-blue-500/20 text-white'
                      : 'border-slate-700/70 bg-slate-900/75 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="text-base" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="mt-3 w-full rounded-xl border border-slate-700/70 bg-slate-800/80 px-3 py-2.5 text-sm font-semibold text-slate-200"
            >
              <span className="inline-flex items-center gap-2">
                <FiLogOut />
                Logout
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Dock */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] rounded-2xl border border-slate-700/70 bg-slate-950/92 p-1.5 backdrop-blur-2xl shadow-[0_20px_56px_rgba(2,6,23,0.52)]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dockItems.length || 1}, minmax(0, 1fr))` }}>
          {dockItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-xl py-2.5 text-center ${
                isActive(item.path)
                  ? 'bg-blue-500/22 text-blue-200'
                  : 'text-slate-400'
              }`}
            >
              <item.icon className="mx-auto text-lg" />
            </Link>
          ))}
        </div>
      </nav>

      <div className="h-16 lg:h-0" />
      <div className="lg:hidden h-20" />
    </>
  );
};

export default Navigation;
