import React, { useState, useMemo } from 'react';
import { FiTrendingUp, FiActivity, FiUser, FiTarget } from 'react-icons/fi';

const ProfessionalScorecard = ({ match, scorecard, events }) => {
  const [activeInnings, setActiveInnings] = useState(match?.innings || 1);

  const stats = useMemo(() => {
    const inningsEvents = events.filter(e => e.innings === activeInnings);
    
    const batting = new Map();
    const bowling = new Map();
    
    let totalRuns = 0;
    let totalWickets = 0;
    let totalExtras = { wide: 0, noBall: 0, bye: 0, legBye: 0 };
    let legalBalls = 0;

    inningsEvents.forEach(e => {
      // Setup Batsman
      const sId = e.strikerId?._id || e.strikerId;
      if (sId && !batting.has(sId)) {
        batting.set(sId, { 
          id: sId, 
          name: e.strikerId?.userId?.fullName || e.strikerId?.userId?.name || 'Batsman', 
          runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: '' 
        });
      }
      
      // Setup Bowler
      const bId = e.bowlerId?._id || e.bowlerId;
      if (bId && !bowling.has(bId)) {
        bowling.set(bId, { 
          id: bId, 
          name: e.bowlerId?.userId?.fullName || e.bowlerId?.userId?.name || 'Bowler', 
          runs: 0, balls: 0, wickets: 0, wides: 0, noBalls: 0, maidens: 0 
        });
      }

      // Update Batting Stats
      if (sId) {
        const bat = batting.get(sId);
        bat.runs += e.batsmanRuns;
        if (e.extraType !== 'wide') bat.balls += 1;
        if (e.batsmanRuns === 4) bat.fours += 1;
        if (e.batsmanRuns === 6) bat.sixes += 1;
        
        if (e.isWicket && (!e.wicketType || !e.wicketType.toLowerCase().includes('run out'))) {
           bat.out = true;
           bat.dismissal = e.wicketType || 'Out';
        }
      }

      // Special case for run outs (might be non-striker, but we don't track non-striker precisely in events yet, so assume striker)
      if (sId && e.isWicket && e.wicketType?.toLowerCase().includes('run out')) {
         const bat = batting.get(sId);
         bat.out = true;
         bat.dismissal = 'Run Out';
      }

      // Update Bowling Stats
      if (bId) {
        const bowl = bowling.get(bId);
        bowl.runs += e.batsmanRuns + e.extras;
        if (e.extraType === 'wide') bowl.wides += 1;
        else if (e.extraType === 'no-ball') bowl.noBalls += 1;
        else bowl.balls += 1;
        
        if (e.isWicket && (!e.wicketType || !e.wicketType.toLowerCase().includes('run out'))) {
           bowl.wickets += 1;
        }
      }

      // Update Totals
      totalRuns += e.batsmanRuns + e.extras;
      if (e.isWicket) totalWickets += 1;
      if (e.extraType === 'wide') totalExtras.wide += e.extras;
      if (e.extraType === 'no-ball') totalExtras.noBall += e.extras;
      if (e.extraType === 'bye') totalExtras.bye += e.extras;
      if (e.extraType === 'leg-bye') totalExtras.legBye += e.extras;
      
      if (e.extraType !== 'wide' && e.extraType !== 'no-ball') legalBalls += 1;
    });

    const overs = Math.floor(legalBalls / 6);
    const balls = legalBalls % 6;

    return {
      batting: Array.from(batting.values()),
      bowling: Array.from(bowling.values()),
      totalRuns,
      totalWickets,
      overs: `${overs}.${balls}`,
      extras: totalExtras
    };
  }, [events, activeInnings]);

  return (
    <div className="surface-panel p-8 md:p-10 bg-mesh border-emerald-500/10 space-y-8">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h3 className="text-2xl font-black text-white italic flex items-center gap-4 uppercase tracking-tighter">
             <FiTrendingUp className="text-emerald-500" /> Professional Scorecard
          </h3>
          <div className="flex gap-4">
             <button 
               onClick={() => setActiveInnings(1)}
               className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInnings === 1 ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
             >
                1st Innings
             </button>
             {match?.innings >= 2 && (
               <button 
                 onClick={() => setActiveInnings(2)}
                 className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInnings === 2 ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
               >
                  2nd Innings
               </button>
             )}
          </div>
       </div>

       {/* Score Summary */}
       <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 mb-8">
          <div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Innings Score</p>
             <p className="text-3xl font-black text-white italic">{stats.totalRuns}<span className="text-emerald-500 mx-1">/</span>{stats.totalWickets}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Overs</p>
             <p className="text-2xl font-black text-white italic">{stats.overs}</p>
          </div>
       </div>

       {/* Batting Table */}
       <div className="overflow-x-auto">
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
             <FiUser /> Batting Card
          </h4>
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.02]">
                   <th className="p-4 rounded-tl-xl">Batter</th>
                   <th className="p-4">Status</th>
                   <th className="p-4 text-right text-emerald-400">R</th>
                   <th className="p-4 text-right">B</th>
                   <th className="p-4 text-right">4s</th>
                   <th className="p-4 text-right">6s</th>
                   <th className="p-4 text-right rounded-tr-xl">SR</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {stats.batting.map(bat => {
                   const sr = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : '0.0';
                   return (
                      <tr key={bat.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="p-4 font-bold text-white text-xs">{bat.name}</td>
                         <td className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bat.out ? bat.dismissal : <span className="text-emerald-500">Not Out</span>}</td>
                         <td className="p-4 text-right font-black text-white text-sm">{bat.runs}</td>
                         <td className="p-4 text-right text-xs text-slate-400 font-bold">{bat.balls}</td>
                         <td className="p-4 text-right text-xs text-slate-400 font-bold">{bat.fours}</td>
                         <td className="p-4 text-right text-xs text-slate-400 font-bold">{bat.sixes}</td>
                         <td className="p-4 text-right text-[10px] font-black text-slate-500">{sr}</td>
                      </tr>
                   );
                })}
                {stats.batting.length === 0 && (
                   <tr>
                      <td colSpan="7" className="p-8 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">No Batting Data Available</td>
                   </tr>
                )}
             </tbody>
          </table>
       </div>

       {/* Extras Summary */}
       <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400 uppercase tracking-widest text-[10px]">Extras</span>
          <span className="text-white italic">
             {stats.extras.wide + stats.extras.noBall + stats.extras.bye + stats.extras.legBye} 
             <span className="text-slate-500 text-[10px] ml-2 not-italic font-normal">
                (W {stats.extras.wide}, NB {stats.extras.noBall}, B {stats.extras.bye}, LB {stats.extras.legBye})
             </span>
          </span>
       </div>

       {/* Bowling Table */}
       <div className="overflow-x-auto mt-10">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
             <FiTarget /> Bowling Card
          </h4>
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.02]">
                   <th className="p-4 rounded-tl-xl">Bowler</th>
                   <th className="p-4 text-right">O</th>
                   <th className="p-4 text-right">M</th>
                   <th className="p-4 text-right text-rose-400">R</th>
                   <th className="p-4 text-right text-emerald-400">W</th>
                   <th className="p-4 text-right text-amber-500/50">WD</th>
                   <th className="p-4 text-right text-amber-500/50">NB</th>
                   <th className="p-4 text-right rounded-tr-xl">ECON</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {stats.bowling.map(bowl => {
                   const overs = Math.floor(bowl.balls / 6);
                   const balls = bowl.balls % 6;
                   const totalOvers = overs + (balls / 6);
                   const econ = totalOvers > 0 ? (bowl.runs / totalOvers).toFixed(1) : '0.0';
                   return (
                      <tr key={bowl.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="p-4 font-bold text-white text-xs">{bowl.name}</td>
                         <td className="p-4 text-right text-xs text-slate-400 font-bold">{overs}.{balls}</td>
                         <td className="p-4 text-right text-xs text-slate-400 font-bold">{bowl.maidens}</td>
                         <td className="p-4 text-right text-sm text-rose-400 font-black">{bowl.runs}</td>
                         <td className="p-4 text-right text-sm text-emerald-400 font-black">{bowl.wickets}</td>
                         <td className="p-4 text-right text-xs text-slate-500 font-bold">{bowl.wides}</td>
                         <td className="p-4 text-right text-xs text-slate-500 font-bold">{bowl.noBalls}</td>
                         <td className="p-4 text-right text-[10px] font-black text-slate-500">{econ}</td>
                      </tr>
                   );
                })}
                {stats.bowling.length === 0 && (
                   <tr>
                      <td colSpan="8" className="p-8 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">No Bowling Data Available</td>
                   </tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default ProfessionalScorecard;
