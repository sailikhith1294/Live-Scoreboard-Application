import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiMenu, FiX, FiLogOut,
  FiGrid, FiUsers, FiSettings, FiActivity, FiZap, FiCalendar, FiSearch
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, primaryRole } = useAuth();

  const navByRole = {
    admin: [
      { path: '/dashboard/admin', label: 'Command Center', icon: FiZap },
      { path: '/dashboard/user/fixtures', label: 'Season Schedule', icon: FiCalendar }
    ],
    organizer: [
      { path: '/dashboard/organizer', label: 'Organizer Hub', icon: FiHome },
      { path: '/dashboard/organizer/teams', label: 'Team Registry', icon: FiUsers },
      { path: '/dashboard/organizer/matches', label: 'Match Control', icon: FiActivity },
      { path: '/dashboard/organizer/feed', label: 'Live Broadcast', icon: FiZap },
      { path: '/dashboard/user/live', label: 'Tournament Arena', icon: FiActivity },
      { path: '/dashboard/user/fixtures', label: 'Schedule', icon: FiCalendar }
    ],
    player: [
      { path: '/dashboard/player', label: 'Athlete Home', icon: FiHome },
      { path: '/dashboard/player/live', label: 'My Matches', icon: FiActivity },
      { path: '/dashboard/user/fixtures', label: 'Upcoming', icon: FiCalendar },
      { path: '/dashboard/user', label: 'Personal Dashboard', icon: FiGrid }
    ],
    umpire: [
      { path: '/dashboard/umpire', label: 'Official Home', icon: FiHome },
      { path: '/dashboard/umpire/scoring-hub', label: 'Scoring Command', icon: FiZap },
      { path: '/dashboard/user/live', label: 'Official Arena', icon: FiActivity },
      { path: '/dashboard/user', label: 'Personal Dashboard', icon: FiGrid }
    ],
    user: [
      { path: '/dashboard/user', label: 'Dashboard', icon: FiHome },
      { path: '/dashboard/user/live', label: 'Live Arena', icon: FiZap },
      { path: '/dashboard/user/fixtures', label: 'Fixtures', icon: FiCalendar },
      { path: '/dashboard/user/promotion', label: 'Role Request', icon: FiSettings }
    ]
  };

  const navItems = navByRole[primaryRole] || navByRole.user;

  const handleLogout = () => {
    logout();
    toast.success('Securely logged out');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '?');

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-6 top-6 bottom-6 w-[260px] z-50 flex-col surface-panel p-6 shadow-2xl shadow-black/60">
        <div className="mb-10 px-2">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-[#020617] font-black text-xl italic shadow-lg shadow-emerald-500/20">
                 C
              </div>
              <div>
                 <p className="text-lg font-black tracking-tight text-white italic">CREASE</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{(primaryRole || 'Viewer')}</p>
              </div>
          </div>
        </div>

        <div className="mb-8 px-2">
           <div className="relative group">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input 
                 placeholder="Discovery Search..." 
                 className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-emerald-500/30 focus:bg-white/[0.08] transition-all"
              />
           </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          <p className="px-4 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Platform Navigation</p>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-emerald-500 text-[#020617] font-bold shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`text-lg transition-transform group-hover:scale-110 ${isActive(item.path) ? 'text-[#020617]' : 'text-slate-500'}`} />
              <span className="text-sm tracking-tight">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
             <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
             </div>
             <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user?.fullName || 'Active User'}</p>
                <p className="truncate text-[10px] text-slate-500 uppercase tracking-widest">Premium Member</p>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 py-3 text-xs font-black text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
          >
            <FiLogOut />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-[60] px-4 py-4 backdrop-blur-xl border-b border-white/5 bg-[#020617]/80">
        <div className="flex items-center justify-between">
           <p className="text-xl font-black text-white italic tracking-tighter">CREASE</p>
           <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
              {isOpen ? <FiX /> : <FiMenu />}
           </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="lg:hidden fixed inset-0 z-50 bg-[#020617] pt-24 px-6 flex flex-col"
          >
             <div className="flex-1 space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl ${isActive(item.path) ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-slate-400'}`}
                  >
                    <item.icon className="text-xl" />
                    <span>{item.label}</span>
                  </Link>
                ))}
             </div>
             <div className="py-10">
                <button onClick={handleLogout} className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-bold">SIGN OUT</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
