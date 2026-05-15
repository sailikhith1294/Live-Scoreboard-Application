import { Link } from 'react-router-dom';
import { useUserSync } from '../context/UserSyncContext';
import { motion } from 'framer-motion';
import { FiActivity, FiZap, FiArrowRight } from 'react-icons/fi';

const LiveScoresDashboard = ({ liveMatches: propsMatches }) => {
  const contextData = useUserSync();
  const liveMatches = propsMatches || contextData.liveMatches;
  const { loading } = contextData;

  const getId = (row) => row?._id || row?.id;

  if (loading) return (
    <div className="surface-panel py-20 flex justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="font-black text-white italic text-xl flex items-center gap-3">
            <FiActivity className="text-rose-500 animate-pulse" /> Live Broadcasts
         </h3>
         <span className="badge badge-live">{liveMatches.length} Active</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {liveMatches.length === 0 && (
          <div className="md:col-span-2 py-24 text-center surface-panel border-dashed opacity-50">
             <FiZap className="text-4xl text-slate-700 mx-auto mb-4" />
             <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No match operations in progress</p>
          </div>
        )}
        
        {liveMatches.map((m, i) => (
          <motion.div 
            key={getId(m)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="surface-panel group hover:border-emerald-500/30 transition-all p-8 flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
               <div className="flex flex-col">
                  <p className="text-2xl font-black text-white italic tracking-tight uppercase">
                     {m.team1?.shortName || m.team1?.shortCode || m.homeTeamId?.shortCode || 'TM1'} <span className="text-slate-700 text-sm mx-1">VS</span> {m.team2?.shortName || m.team2?.shortCode || m.awayTeamId?.shortCode || 'TM2'}
                  </p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.source === 'organized' ? `Match #${m.matchNo}` : 'Global Feed'}</p>
               </div>
               <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <FiZap />
               </div>
            </div>

            <div className="flex-1 flex flex-col justify-center mb-8">
               <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-black text-white italic tracking-tighter">
                     {m.scorecard?.runs || m.currentRuns || 0}<span className="text-emerald-500">/</span>{m.scorecard?.wickets || m.currentWickets || 0}
                  </p>
                  <p className="text-lg text-slate-500 font-black italic">({m.scorecard?.overs || m.currentOver || 0}.{m.scorecard?.ball || m.currentBall || 0})</p>
               </div>
               {m.tossWinnerTeamId && (
                  <p className="mt-4 text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 self-start">
                     TOSS: {m.tossWinnerTeamId?.name || 'Winner'} ELECTED TO {m.tossDecision?.toUpperCase() || 'BAT'}
                  </p>
               )}

               {/* Active Performance Layer */}
               <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                  <div className="space-y-3">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Batsmen</p>
                     {m.activeStrikerData && (
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                           <p className="text-[10px] font-black text-white italic truncate pr-2">
                              <span className="text-cyan-400 mr-1">*</span>{m.activeStrikerData.name}
                           </p>
                           <p className="text-xs font-black text-emerald-400 whitespace-nowrap">
                              {m.activeStrikerData.runs}<span className="text-[10px] opacity-50 font-normal ml-0.5">({m.activeStrikerData.balls})</span>
                           </p>
                        </div>
                     )}
                     {m.activeNonStrikerData && (
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl opacity-60">
                           <p className="text-[10px] font-bold text-slate-300 truncate pr-2">{m.activeNonStrikerData.name}</p>
                           <p className="text-xs font-black text-slate-400 whitespace-nowrap">
                              {m.activeNonStrikerData.runs}<span className="text-[10px] opacity-50 font-normal ml-0.5">({m.activeNonStrikerData.balls})</span>
                           </p>
                        </div>
                     )}
                  </div>
                  <div className="space-y-3">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Active Bowler</p>
                     {m.activeBowlerData && (
                        <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                           <p className="text-[10px] font-black text-indigo-400 italic mb-1 text-right truncate">{m.activeBowlerData.name}</p>
                           <div className="flex justify-end gap-3">
                              <div className="text-right">
                                 <p className="text-[7px] font-black text-slate-500 uppercase">Ov</p>
                                 <p className="text-[10px] font-black text-white">{m.activeBowlerData.overs}</p>
                              </div>
                              <div className="text-right border-l border-white/10 pl-3">
                                 <p className="text-[7px] font-black text-slate-500 uppercase">Runs</p>
                                 <p className="text-[10px] font-black text-white">{m.activeBowlerData.runs}</p>
                              </div>
                              <div className="text-right border-l border-white/10 pl-3">
                                 <p className="text-[7px] font-black text-slate-500 uppercase">Wkt</p>
                                 <p className="text-[10px] font-black text-rose-500">{m.activeBowlerData.wickets}</p>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <Link 
              to={`/scorecard/${getId(m)}`}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500 transition-all"
            >
              Full Scorecard <FiArrowRight />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default LiveScoresDashboard;
