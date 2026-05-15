import { useOrganizerSync } from '../context/OrganizerSyncContext';
import { FiZap, FiActivity, FiClock, FiCheckCircle, FiRadio } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const OrganizerFeedPage = () => {
  const { dashboard, loading, refresh } = useOrganizerSync();
  const feed = dashboard.liveFeed || { live: [], scheduled: [], completed: [] };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Initializing Broadcast Feeds</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Broadcast Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-30 z-0" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl animate-pulse"></div>
        <div className="relative z-10 p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Signal Status: Synchronized</p>
              </div>
              <h2 className="text-5xl font-black text-white italic tracking-tighter">Broadcast <span className="text-indigo-400">Centre</span></h2>
              <p className="mt-3 text-slate-400 font-medium max-w-xl">Real-time telemetry and match lifecycle monitoring across the global cricket circuit.</p>
           </div>
           <div className="flex flex-col md:flex-row gap-4">
               <button 
                 onClick={() => {
                   toast.promise(refresh(true), {
                     loading: 'Synchronizing global signals...',
                     success: 'Signals synchronized successfully',
                     error: 'Signal synchronization failed'
                   });
                 }}
                 className="btn-secondary !py-4 !px-8 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white"
               >
                 Sync Signals
               </button>
               <div className="surface-panel !bg-white/5 border-white/10 px-8 py-4 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Uplink</p>
                  <p className="text-2xl font-black text-white italic">{(feed.live.length + feed.scheduled.length + feed.completed.length)}</p>
               </div>
            </div>
        </div>
      </section>

      {/* Monitoring Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {[
          { key: 'live', label: 'Live Signals', icon: FiRadio, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { key: 'scheduled', label: 'Scheduled Uplinks', icon: FiClock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { key: 'completed', label: 'Archived Transmissions', icon: FiCheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ].map((bucket) => (
          <div key={bucket.key} className={`surface-panel group border-l-4 ${bucket.border}`}>
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${bucket.bg} ${bucket.color}`}><bucket.icon className="text-xl" /></div>
                  <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">{bucket.label}</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-widest">
                  {feed[bucket.key]?.length || 0}
                </span>
              </div>
              
              <div className="space-y-4">
                {(feed[bucket.key] || []).map((m, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all group/item"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-sm font-black text-white group-hover/item:text-indigo-400 transition-colors uppercase italic tracking-tight">#{m.matchNo || 'EVENT-' + idx}</p>
                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{m.format || 'T20'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                           <div className="flex items-center gap-3">
                              <p className="text-[10px] font-black text-white">{m.team1?.shortName || 'T1'}</p>
                              <span className="text-[8px] font-black text-slate-700 italic">VS</span>
                              <p className="text-[10px] font-black text-white">{m.team2?.shortName || 'T2'}</p>
                           </div>
                           <p className="text-[9px] text-slate-500 font-mono mt-2 line-clamp-1">{m.scorecard?.text || 'No signal data'}</p>
                        </div>
                        
                        {bucket.key === 'live' && (
                          <div className="flex items-center gap-2">
                             <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                             <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">On Air</span>
                          </div>
                        )}
                     </div>

                    {bucket.key === 'scheduled' && (
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-4 flex items-center gap-2 border-t border-white/5 pt-4">
                         <FiClock className="text-amber-500/50" /> {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                      </p>
                    )}
                  </motion.div>
                ))}
                
                {(feed[bucket.key] || []).length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[32px] opacity-20">
                    <FiZap className="mx-auto text-3xl mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[8px]">No Active Transmissions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizerFeedPage;
