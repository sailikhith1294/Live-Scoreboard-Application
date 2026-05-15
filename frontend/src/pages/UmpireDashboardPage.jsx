import { useState, useEffect } from 'react';
import { useUmpireSync } from '../context/UmpireSyncContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiActivity, FiShield, FiZap, FiArrowRight, FiClock, FiCheckCircle, FiAlertCircle, FiUsers, FiTarget } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';
import api from '../services/api';

const UmpireDashboardPage = () => {
  const { user } = useAuth();
  const { matches, loading, refresh } = useUmpireSync();
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const getId = (row) => row?._id || row?.id;

  const submitToss = async (matchId, tossWinnerTeamId, tossDecision) => {
    try {
      await api.patch(`/umpire/matches/${matchId}/toss`, { tossWinnerTeamId, tossDecision });
      refresh();
    } catch (err) { /* silent */ }
  };

  const startMatch = async (matchId) => {
    try {
      await api.patch(`/umpire/matches/${matchId}/start`);
      refresh();
    } catch (err) { /* silent */ }
  };

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
      {/* Official Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Official <span className="text-emerald-500">Dashboard</span></h2>
              <div className="flex flex-col gap-2 mt-2">
                 <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Global Cricket Infrastructure • Active Duty Session</p>
                 <div className="flex flex-wrap gap-4 mt-2">
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-900/10 transition-all flex items-center gap-2">
                       OFFICIAL STATUS: ACTIVE
                    </p>
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-900/10">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center mb-1">Status</p>
                 <p className="text-sm font-bold text-white uppercase italic tracking-tighter">Active Duty</p>
              </div>
           </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-12 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic flex items-center gap-3 uppercase tracking-tighter">
                 <FiActivity className="text-emerald-500" /> Assigned Match Protocol
              </h3>
              <span className="badge badge-emerald">{matches.length} Assignments</span>
           </div>

           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <div 
                  key={getId(m)} 
                  className={`surface-panel p-8 group border-white/5 hover:border-emerald-500/30 transition-all flex flex-col h-full ${getId(m) === selectedMatchId ? 'border-emerald-500/50 bg-emerald-500/5 shadow-2xl shadow-emerald-900/20' : ''}`}
                >
                   <div className="flex justify-between items-center mb-6">
                      <span className={`badge ${m.status === 'live' ? 'badge-live' : 'badge-emerald'}`}>{m.status}</span>

                   </div>
                   
                   <div className="flex justify-between items-center mb-10">
                      <div className="text-center flex-1">
                         <p className="text-3xl font-black text-white italic">{m.homeTeamId?.shortCode || 'HME'}</p>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.homeTeamId?.name}</p>
                      </div>
                      <div className="px-4 text-slate-800 font-black italic text-sm">VS</div>
                      <div className="text-center flex-1">
                         <p className="text-3xl font-black text-white italic">{m.awayTeamId?.shortCode || 'AWY'}</p>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.awayTeamId?.name}</p>
                      </div>
                   </div>

                   <div className="flex-1 space-y-6">
                      {/* Toss Resolution Section */}
                      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                               <FiTarget className="text-amber-500" /> Toss Protocol
                            </p>
                            {m.tossWinnerTeamId && <FiCheckCircle className="text-emerald-500" />}
                         </div>
                         
                         {m.tossWinnerTeamId ? (
                             <p className="text-[10px] font-bold text-white italic leading-relaxed flex items-center gap-2">
                                <span className="text-emerald-500 uppercase font-black">{m.tossWinnerTeamId?.name || 'Unknown'}</span> won the toss and elected to <span className="text-amber-500 uppercase font-black">{m.tossDecision}</span> first.
                             </p>
                         ) : (
                            <div className="space-y-3">
                               <div className="grid grid-cols-2 gap-2">
                                   <button onClick={() => submitToss(getId(m), getId(m.homeTeamId), 'bat')} className="btn-secondary !py-3 !text-[7px] !bg-emerald-500/10 !text-emerald-500 border-emerald-500/20 hover:!bg-emerald-500 hover:!text-black uppercase">
                                      {m.homeTeamId?.shortCode || 'HME'} WON <br/> <span className="opacity-50">Elected to Bat</span>
                                   </button>
                                   <button onClick={() => submitToss(getId(m), getId(m.homeTeamId), 'bowl')} className="btn-secondary !py-3 !text-[7px] !bg-emerald-500/10 !text-emerald-500 border-emerald-500/20 hover:!bg-emerald-500 hover:!text-black uppercase">
                                      {m.homeTeamId?.shortCode || 'HME'} WON <br/> <span className="opacity-50">Elected to Bowl</span>
                                   </button>
                                   <button onClick={() => submitToss(getId(m), getId(m.awayTeamId), 'bat')} className="btn-secondary !py-3 !text-[7px] !bg-indigo-500/10 !text-indigo-500 border-indigo-500/20 hover:!bg-indigo-500 hover:!text-white uppercase">
                                      {m.awayTeamId?.shortCode || 'AWY'} WON <br/> <span className="opacity-50">Elected to Bat</span>
                                   </button>
                                   <button onClick={() => submitToss(getId(m), getId(m.awayTeamId), 'bowl')} className="btn-secondary !py-3 !text-[7px] !bg-indigo-500/10 !text-indigo-500 border-indigo-500/20 hover:!bg-indigo-500 hover:!text-white uppercase">
                                      {m.awayTeamId?.shortCode || 'AWY'} WON <br/> <span className="opacity-50">Elected to Bowl</span>
                                   </button>
                               </div>
                            </div>
                         )}
                      </div>

                      {/* Squad/Start Section */}
                      {m.status === 'scheduled' && (
                         <button 
                           onClick={() => {
                              if (!m.tossWinnerTeamId) return;
                              startMatch(getId(m));
                           }}
                           className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${m.tossWinnerTeamId ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:scale-[1.02]' : 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'}`}
                         >
                            <FiZap /> Start Official Match
                         </button>
                      )}
                   </div>

                   <div className="mt-8 pt-8 border-t border-white/5 space-y-3">
                      <Link to={`/dashboard/umpire/scoring/${getId(m)}`} className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-black transition-all">
                         <FiActivity className="text-lg" /> Launch Scoring Console
                      </Link>
                      <Link to={`/scorecard/${getId(m)}`} className="block w-full py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all">
                         Public Match View
                      </Link>
                   </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 py-32 text-center surface-panel border-dashed opacity-40">
                   <FiZap className="text-5xl text-slate-700 mx-auto mb-4" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No official matches assigned to your ID</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default UmpireDashboardPage;
