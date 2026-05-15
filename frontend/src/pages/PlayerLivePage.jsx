import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiZap, FiActivity } from 'react-icons/fi';

import { usePlayerSync } from '../context/PlayerSyncContext';

const PlayerLivePage = () => {
  const { liveMatches, loading } = usePlayerSync();

  if (loading) return <div className="text-white text-sm">Synchronizing live Arena...</div>;

  const getId = (row) => row?._id || row?.id;

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Header Section */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 z-0" />
        <div className="relative z-10 p-8">
           <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">
             Player <span className="text-cyan-400">Live Arena</span>
           </h2>
           <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mt-2">
             Monitor real-time ball-by-ball telemetry and match states
           </p>
        </div>
      </section>

      {/* Matches List */}
      <div className="grid gap-6">
        {liveMatches.map((m) => (
          <div key={getId(m)} className="surface-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-cyan-500/30 transition-all border-white/5">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-2xl">
                 <FiZap />
              </div>
              <div>
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter">
                  {m.homeTeamId?.shortCode || 'HME'} <span className="text-slate-700 text-sm not-italic mx-2">VS</span> {m.awayTeamId?.shortCode || 'AWY'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                   <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                     Live Match #{m.matchNo}
                   </span>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                     {m.venue || 'Platform Circuit'}
                   </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 w-full md:w-auto">
               <div className="flex-1 md:flex-initial px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Score</p>
                  <p className="text-xl font-black text-cyan-400 italic">
                    {m.scorecard?.runs || 0}/{m.scorecard?.wickets || 0} <span className="text-xs text-slate-500 font-bold not-italic">({m.scorecard?.overs || '0.0'})</span>
                  </p>
               </div>
               <Link 
                 className="btn-primary !px-8 !py-4 shadow-cyan-900/40" 
                 to={`/scorecard/${getId(m)}`}
               >
                 VIEW SCORECARD
               </Link>
            </div>
          </div>
        ))}

        {liveMatches.length === 0 && (
          <div className="py-32 text-center surface-panel border-dashed opacity-40">
             <FiActivity className="text-5xl text-slate-700 mx-auto mb-4" />
             <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">No active match telemetry detected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerLivePage;
