import { useUserSync } from '../context/UserSyncContext';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiTarget, FiZap, FiCalendar, FiArrowRight, FiStar, FiRefreshCw, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useState } from 'react';
import LiveScoresDashboard from './LiveScoresDashboard';
import FixturesDashboard from './FixturesDashboard';

const ViewerDashboardPage = () => {
  const { tournaments, liveMatches, loading, refresh } = useUserSync();
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();

  const getId = (row) => row?._id || row?.id;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-12 animate-slide-up">
      {/* Premium Hero */}
      <section className="surface-panel overflow-hidden relative prism-border">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent z-0" />
        <div className="relative z-10 p-12">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                 <h2 className="text-6xl font-black text-white italic tracking-tighter mb-2">Match <span className="text-emerald-500">Centre.</span></h2>
                 <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] opacity-60">Global Cricket Infrastructure v2.0</p>
              </div>
               <div className="flex flex-col md:flex-row gap-4 items-center">
                  <button 
                    onClick={() => {
                      toast.promise(refresh(true), {
                        loading: 'Connecting to global signal providers...',
                        success: 'Signals synchronized',
                        error: 'Failed to sync signals'
                      });
                    }}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    <FiRefreshCw className="animate-spin-slow" /> Sync Signals
                  </button>
                  <div className="surface-panel !bg-white/5 border-white/10 px-8 py-5 prism-border">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Network Status</p>
                     <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] italic text-center flex items-center justify-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" /> Realtime Sync
                     </p>
                  </div>
               </div>
           </div>
        </div>
      </section>

      {/* Real-time Content Grid */}
      <div className="grid gap-10 lg:grid-cols-12">
         {/* Live Area */}
         <div className="lg:col-span-8 space-y-10">
            <LiveScoresDashboard />
            <FixturesDashboard />
         </div>

         {/* Discovery Sidebar */}
         <div className="lg:col-span-4 space-y-8">
            <section className="surface-panel p-8">
               <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <FiTarget className="text-emerald-500" /> Season Series
               </h3>
               <div className="space-y-4">
                  {tournaments.map((t) => (
                    <Link 
                      to={`/leaderboard/${getId(t)}`} 
                      key={getId(t)} 
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/40 group transition-all"
                    >
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                         <FiStar />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="font-black text-white italic truncate group-hover:text-emerald-400 transition-colors">{t.name}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t.location} • {t.format}</p>
                      </div>
                      <FiArrowRight className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                    </Link>
                  ))}
                  {tournaments.length === 0 && (
                     <div className="py-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest">No active series</p>
                     </div>
                  )}
               </div>
            </section>

            <section className="surface-panel p-8 bg-mesh border-emerald-500/20">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                     <FiHash />
                  </div>
                  <h4 className="text-xl font-black text-white italic">Recruitment</h4>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed mb-6">Have an invite code from a Captain or Organizer? Enter it below to join their squad.</p>
               
               <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="ENTER INVITE CODE" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-[10px] font-black tracking-widest focus:border-emerald-500/50 outline-none transition-all"
                  />
                  <button 
                    onClick={() => {
                      if (!inviteCode) return toast.error('Please enter an invite code');
                      navigate(`/join/team/${inviteCode}`);
                    }}
                    className="w-full btn-primary !py-4 block text-center"
                  >
                    Join Team
                  </button>
               </div>
            </section>

            <section className="surface-panel p-8">
               <h4 className="text-xl font-black text-white italic mb-4">Pro Stats</h4>
               <p className="text-xs text-slate-400 leading-relaxed mb-6">Access advanced player metrics and historical data by upgrading your profile.</p>
               <Link to="/dashboard/user/promotion" className="w-full btn-secondary !py-4 block text-center border-white/10">Upgrade to Player</Link>
            </section>
         </div>
      </div>
    </div>
  );
};

export default ViewerDashboardPage;
