import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { FiActivity, FiShield, FiMessageSquare, FiTrendingUp, FiClock, FiTarget } from 'react-icons/fi';
import ProfessionalScorecard from '../components/Scorecard/ProfessionalScorecard';

const ScorecardPage = () => {
  const { matchId } = useParams();
  const [data, setData] = useState({ match: null, scorecard: null, events: [], decisions: [] });
  const [activeTab, setActiveTab] = useState('commentary'); // Default to Feed as requested
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get(`/matches/${matchId}/scorecard`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.emit('match:join', matchId);
    
    const handleScoreUpdate = (update) => {
      setData(prev => ({
        ...prev,
        match: update.match,
        scorecard: update.scorecard,
        events: update.ball ? [update.ball, ...prev.events] : prev.events
      }));
    };

    socket.on('score:update', handleScoreUpdate);

    return () => {
      socket.off('score:update', handleScoreUpdate);
      socket.emit('match:leave', matchId);
    };
  }, [matchId]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { match, scorecard, events, decisions } = data;
  const status = String(match?.status || '').toLowerCase();
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-start">
         <Link to="/dashboard/user" className="btn-secondary !px-4 !py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <FiActivity /> Back to Arena
         </Link>
      </div>

      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-emerald-500/10 z-0" />
        
        <div className="relative z-10 p-2 sm:p-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-6">
              <div className="text-center md:text-right flex-1 space-y-2">
                 <div className="h-20 w-20 bg-white/5 border border-white/10 rounded-3xl mx-auto md:ml-auto flex items-center justify-center text-3xl shadow-xl font-black italic text-white uppercase">
                    {(match?.team1?.name || 'T1').charAt(0)}
                 </div>
                 <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{match?.team1?.name}</h2>
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{match?.team1?.shortName || match?.team1?.shortCode}</p>
              </div>

              <div className="text-center space-y-4 min-w-[300px]">
                 <div className="flex justify-center gap-3">
                    {isLive && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-rose-900/40">
                         <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live Broadcast
                      </div>
                    )}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 ${isCompleted ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-white'} text-[10px] font-black uppercase tracking-widest rounded-full`}>
                       {status.toUpperCase()}
                    </div>
                 </div>

                  {isScheduled ? (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Scheduled For</p>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                           {match?.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                        </h1>
                     </div>
                  ) : (
                     <div className="space-y-2">
                        <h1 className="text-6xl font-black text-white italic tracking-tighter">
                           {scorecard?.runs || 0}<span className="text-emerald-500">/</span>{scorecard?.wickets || 0}
                        </h1>
                        <p className="text-lg font-bold text-slate-400 italic">
                           {scorecard?.overs ? `Overs ${scorecard.overs}` : isLive ? 'Innings Starting' : (match?.result || match?.providerStatus || 'Match Completed')}
                        </p>
                     </div>
                  )}
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-4">{match?.venue || 'Live Stadium'}</p>
               </div>

              <div className="text-center md:text-left flex-1 space-y-2">
                 <div className="h-20 w-20 bg-white/5 border border-white/10 rounded-3xl mx-auto md:mr-auto flex items-center justify-center text-3xl shadow-xl font-black italic text-white uppercase">
                    {(match?.team2?.name || 'T2').charAt(0)}
                 </div>
                 <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{match?.team2?.name}</h2>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{match?.team2?.shortName || match?.team2?.shortCode}</p>
              </div>
           </div>
        </div>

         <div className="relative z-10 flex gap-1 p-1 bg-white/5 backdrop-blur-xl border-t border-white/5">
            {[
                { id: 'commentary', label: 'Match Feed', icon: FiMessageSquare },
                { id: 'summary', label: 'Scorecard', icon: FiActivity }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                   activeTab === tab.id ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <tab.icon className="text-sm" />
                 <span>{tab.label}</span>
               </button>
            ))}
         </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
         <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
                {activeTab === 'commentary' && (
                  <motion.div 
                    key="commentary"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                     {/* ACTIVE PERFORMANCE SUMMARY */}
                     {isLive && (
                        <div className="surface-panel p-8 bg-mesh border-emerald-500/20 grid md:grid-cols-2 gap-8 shadow-2xl">
                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Batsmen</p>
                              {match?.activeStrikerData && (
                                 <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-emerald-500/10">
                                    <p className="text-sm font-black text-white italic">
                                       <span className="text-cyan-400 mr-2 text-lg">*</span>{match.activeStrikerData.name}
                                    </p>
                                    <p className="text-xl font-black text-emerald-400">
                                       {match.activeStrikerData.runs} <span className="text-xs font-normal text-slate-500 ml-1">({match.activeStrikerData.balls})</span>
                                    </p>
                                 </div>
                              )}
                              {match?.activeNonStrikerData && (
                                 <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl opacity-60">
                                    <p className="text-sm font-bold text-slate-400">{match.activeNonStrikerData.name}</p>
                                    <p className="text-xl font-black text-slate-500">
                                       {match.activeNonStrikerData.runs} <span className="text-xs font-normal text-slate-600 ml-1">({match.activeNonStrikerData.balls})</span>
                                    </p>
                                 </div>
                              )}
                           </div>
                           <div className="space-y-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Active Bowler</p>
                              {match?.activeBowlerData && (
                                 <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                                    <p className="text-lg font-black text-indigo-400 italic mb-4 text-right truncate">{match.activeBowlerData.name}</p>
                                    <div className="grid grid-cols-3 gap-6">
                                       <div className="text-right">
                                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Overs</p>
                                          <p className="text-xl font-black text-white">{match.activeBowlerData.overs}</p>
                                       </div>
                                       <div className="text-right border-l border-white/10 pl-6">
                                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Runs</p>
                                          <p className="text-xl font-black text-white">{match.activeBowlerData.runs}</p>
                                       </div>
                                       <div className="text-right border-l border-white/10 pl-6">
                                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Wkts</p>
                                          <p className="text-xl font-black text-rose-500">{match.activeBowlerData.wickets}</p>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}

                     <div className="surface-panel p-8">
                        <h3 className="text-xl font-black text-white mb-8 italic flex items-center gap-3">
                           <FiMessageSquare className="text-emerald-500" /> Ball-by-Ball Feed
                        </h3>
                        <div className="space-y-4">
                           {events.map((e, idx) => (
                              <div key={idx} className="flex items-center gap-6 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                 <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black italic shadow-inner">
                                    {e.overNumber}.{e.ballNumber}
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-sm font-bold text-white leading-relaxed">{e.commentary}</p>
                                    <div className="flex gap-4 mt-2">
                                       <span className="text-[10px] font-black uppercase text-slate-500">Batsman: <span className="text-slate-300">{e.batsmanRuns} Runs</span></span>
                                       {e.isWicket && <span className="text-[10px] font-black uppercase text-rose-500 animate-pulse">WICKET</span>}
                                    </div>
                                 </div>
                                 <div className="text-right px-6 py-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10">
                                    <p className="text-2xl font-black text-white italic">{e.batsmanRuns + e.extras}</p>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Score</p>
                                 </div>
                              </div>
                           ))}
                           {events.length === 0 && (
                              <div className="py-20 text-center opacity-20">
                                 <FiActivity className="text-6xl mx-auto mb-4" />
                                 <p className="text-sm font-black uppercase tracking-widest">Awaiting match events...</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </motion.div>
                )}

                {activeTab === 'summary' && (
                  <motion.div 
                    key="summary"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                     <ProfessionalScorecard match={match} scorecard={scorecard} events={events} />
                  </motion.div>
                )}
             </AnimatePresence>
         </div>

         <div className="space-y-8">
            <section className="surface-panel p-8 space-y-6">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Match Information</h3>
               <div className="space-y-6">
                  <div className="flex items-center gap-5">
                     <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 text-xl border border-white/5"><FiTarget /></div>
                     <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Stadium</p>
                        <p className="text-sm font-black text-white uppercase italic">{match?.venue || 'Live Arena'}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-5">
                     <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 text-xl border border-white/5"><FiTrendingUp /></div>
                     <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Match Format</p>
                        <p className="text-sm font-black text-white uppercase italic">{match?.format || (match?.oversLimit ? match.oversLimit + ' Overs' : 'Standard')}</p>
                     </div>
                  </div>
               </div>
            </section>

            <section className="surface-panel p-8 bg-emerald-500/5 border-emerald-500/10">
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Official Feed
               </p>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter leading-relaxed">
                  This broadcast is verified and synchronized in real-time by the appointed match official.
               </p>
            </section>

            <Link to="/dashboard/user" className="btn-secondary w-full">
               Exit Match Center
            </Link>
         </div>
      </div>
    </div>
  );
};

export default ScorecardPage;
