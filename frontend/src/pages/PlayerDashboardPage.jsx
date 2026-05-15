import { usePlayerSync } from '../context/PlayerSyncContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiActivity, FiUser, FiZap, FiArrowRight, FiAward } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';

const PlayerDashboardPage = () => {
  const { profile, matches, loading } = usePlayerSync();

  const getId = (row) => row?._id || row?.id;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      <div className="flex justify-start">
         <BackButton />
      </div>
      {/* Player Identity Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center gap-8">
           <div className="h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-4xl text-cyan-400 shadow-2xl">
              {profile?.playerRole === 'batsman' ? '🏏' : profile?.playerRole === 'bowler' ? '⚾' : profile?.playerRole === 'wicket-keeper' ? '🧤' : <FiUser />}
           </div>
            <div className="flex-1">
               <h2 className="text-4xl font-black text-white italic tracking-tighter">Athlete <span className="text-cyan-400">Profile</span></h2>
               <div className="flex flex-wrap items-center gap-4 mt-2">
                  <p className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">{profile?.playerRole || 'Awaiting Assignment'}</p>
                  <div className="flex flex-col">
                     <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">PID: {profile?.playerId}</p>
                     <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest font-mono opacity-50">UID: {profile?.userId?._id || profile?.userId}</p>
                  </div>
               </div>
            </div>
           <div className="flex gap-4">
               <div className="surface-panel !bg-white/5 px-6 py-4 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Matches Played</p>
                  <p className="text-xl font-black text-white italic mt-1">{matches.length}</p>
               </div>
           </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic flex items-center gap-3">
                 <FiActivity className="text-cyan-400" /> Career Matches
              </h3>
              <span className="badge badge-indigo">{matches.length} Total</span>
           </div>

           <div className="grid gap-6 sm:grid-cols-2">
              {matches.map((m) => (
                <Link key={getId(m)} to={`/scorecard/${getId(m)}`} className="surface-panel p-8 group border-white/5 hover:border-cyan-500/30 transition-all">
                   <div className="flex justify-between items-center mb-6">
                      <span className={`badge ${m.status === 'live' ? 'badge-live' : 'badge-indigo'}`}>{m.status}</span>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">#{m.matchNo}</p>
                   </div>
                   
                   <div className="flex justify-between items-center mb-8">
                      <div className="text-center flex-1">
                         <p className="text-2xl font-black text-white italic">{m.homeTeamId?.shortCode || 'HME'}</p>
                      </div>
                      <div className="px-4 text-slate-700 font-black italic text-sm">VS</div>
                      <div className="text-center flex-1">
                         <p className="text-2xl font-black text-white italic">{m.awayTeamId?.shortCode || 'AWY'}</p>
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">View Statistics</p>
                      <FiArrowRight className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                   </div>
                </Link>
              ))}
              {matches.length === 0 && (
                <div className="sm:col-span-2 py-24 text-center surface-panel border-dashed opacity-50">
                   <FiZap className="text-4xl text-slate-700 mx-auto mb-4" />
                   <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">No official matches recorded in this circuit</p>
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <section className="surface-panel p-8 space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                 <FiAward className="text-cyan-400" /> Stats Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Career Runs', value: profile?.careerRuns || '0' },
                    { label: 'Wickets', value: profile?.careerWickets || '0' },
                    { label: 'Strike Rate', value: Number(profile?.careerStrikeRate || 0).toFixed(1) },
                    { label: 'Economy', value: Number(profile?.careerEconomy || 0).toFixed(2) },
                    { label: 'Fours (4s)', value: profile?.fours || '0' },
                    { label: 'Sixes (6s)', value: profile?.sixes || '0' },
                    { label: 'Batting Avg', value: profile?.matchesPlayed > 0 ? (profile.careerRuns / profile.matchesPlayed).toFixed(2) : '0.00' },
                    { label: 'Matches', value: profile?.matchesPlayed || '0' },
                  ].map((stat, i) => (
                     <div key={i} className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-sm font-black text-white italic">{stat.value}</p>
                     </div>
                  ))}
              </div>
           </section>

           <section className="surface-panel p-8 bg-mesh border-cyan-500/20">
              <div className="flex items-center gap-3 mb-4">
                 <FiUser className="text-cyan-400" />
                 <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Athlete Bio</p>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">Dedicated professional athlete participating in the regional cricket championship series.</p>
           </section>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboardPage;
