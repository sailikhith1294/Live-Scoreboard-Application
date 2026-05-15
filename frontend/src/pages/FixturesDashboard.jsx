import { useUserSync } from '../context/UserSyncContext';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiTarget, FiBox, FiArrowRight, FiCheckCircle, FiActivity } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const FixturesDashboard = ({ fixtures: propsFixtures, tournaments: propsTournaments }) => {
  const contextData = useUserSync();
  const fixtures = propsFixtures || contextData.fixtures;
  const tournaments = propsTournaments || contextData.tournaments;
  const { loading } = contextData;

  const getId = (row) => row?._id || row?.id;

  // Map matches to tournaments
  const tournamentMatches = tournaments.map(t => {
    const tId = getId(t);
    return {
      ...t,
      matches: (fixtures || []).filter(m => {
        const rawTId = m.tournamentId?._id || m.tournamentId?.id || m.tournamentId;
        const tIdStr = rawTId ? String(rawTId) : null;
        return tIdStr === String(tId);
      })
    };
  });

  // Also catch matches that don't belong to any tournament in our list (if any)
  const knownTournamentIds = new Set(tournaments.map(t => String(getId(t))));
  const independentMatches = (fixtures || []).filter(m => {
    const rawTId = m.tournamentId?._id || m.tournamentId?.id || m.tournamentId;
    const tIdStr = rawTId ? String(rawTId) : null;
    return !tIdStr || !knownTournamentIds.has(tIdStr);
  });

  if (loading) return (
    <div className="surface-panel py-20 flex justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
    </div>
  );

  const renderMatchCard = (f, i) => {
    const status = String(f.status || 'scheduled').toLowerCase();
    const isLive = status === 'live';
    const isCompleted = status === 'completed';
    
    return (
      <motion.div 
        key={getId(f)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="surface-panel p-6 border-white/5 hover:bg-white/[0.02] transition-all group relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-6">
           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Match #{f.matchNo || i+1}</span>
           <div className="flex items-center gap-2">
              {isLive ? (
                <span className="badge badge-live">ON AIR</span>
              ) : isCompleted ? (
                <span className="badge badge-emerald">FINISHED</span>
              ) : (
                <span className="badge badge-indigo">SCHEDULED</span>
              )}
           </div>
        </div>

        <div className="flex justify-between items-center py-4 border-y border-white/5 mb-6 bg-white/[0.01] rounded-xl px-4">
           <div className="text-center flex-1">
              <p className="text-xl font-black text-white italic group-hover:text-indigo-400 transition-colors">{f.team1?.shortName || f.team1?.shortCode || f.homeTeamId?.shortCode || 'TM1'}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1 truncate">{f.team1?.name || f.homeTeamId?.name || 'Team 1'}</p>
           </div>
           <div className="px-4 text-slate-800 font-black italic text-xs">VS</div>
           <div className="text-center flex-1">
              <p className="text-xl font-black text-white italic group-hover:text-indigo-400 transition-colors">{f.team2?.shortName || f.team2?.shortCode || f.awayTeamId?.shortCode || 'TM2'}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1 truncate">{f.team2?.name || f.awayTeamId?.name || 'Team 2'}</p>
           </div>
        </div>

        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3 text-slate-400">
              <div className={`h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center ${isLive ? 'text-rose-400' : isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                 {isLive ? <FiActivity /> : isCompleted ? <FiCheckCircle /> : <FiClock />}
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                   {isCompleted ? 'Final Result' : isLive ? 'Live Tracking' : 'Kickoff Time'}
                 </p>
                 <p className="text-xs font-bold text-slate-300">
                    {isCompleted || isLive ? (f.scorecard?.text || `${f.scorecard?.runs || 0}/${f.scorecard?.wickets || 0} (${f.scorecard?.overs || 0})`) : f.scheduledAt ? new Date(f.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
                 </p>
              </div>
           </div>
           <Link 
             to={`/scorecard/${getId(f)}`} 
             className={`p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-indigo-500 hover:text-black transition-all border border-white/5 group-hover:border-indigo-500/50`}
           >
              <FiArrowRight />
           </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <section className="space-y-16">
      <div className="flex items-center justify-between">
         <h3 className="font-black text-white italic text-xl flex items-center gap-3">
            <FiCalendar className="text-indigo-400" /> Season Schedule
         </h3>
         <div className="flex gap-4">
            <span className="badge badge-indigo">{tournaments.length} Series</span>
            <span className="badge badge-emerald">{fixtures.length} Fixtures</span>
         </div>
      </div>

      {tournamentMatches.map((tournament, tIdx) => (
        <div key={getId(tournament)} className="space-y-8">
           <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-indigo-400 shadow-xl shadow-indigo-900/10">
                 <FiBox />
              </div>
              <div>
                 <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{tournament.name}</h4>
                 <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tournament.location} • {tournament.format}</p>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{tournament.matches.length} matches</p>
                 </div>
              </div>
           </div>

           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {tournament.matches.length > 0 ? tournament.matches.map((f, i) => renderMatchCard(f, i)) : (
               <div className="col-span-full py-12 text-center surface-panel border-dashed opacity-30">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No fixtures announced for this series yet</p>
               </div>
             )}
           </div>
        </div>
      ))}

      {independentMatches.length > 0 && (
        <div className="space-y-8">
           <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-slate-400">
                 <FiTarget />
              </div>
              <div>
                 <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Independent Matches</h4>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Non-tournament exhibition matches</p>
              </div>
           </div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {independentMatches.map((f, i) => renderMatchCard(f, i))}
           </div>
        </div>
      )}

      {tournaments.length === 0 && fixtures.length === 0 && (
        <div className="py-32 text-center surface-panel border-dashed opacity-50">
           <FiClock className="text-5xl text-slate-800 mx-auto mb-6" />
           <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-xs italic">The Circuit is Currently Dormant</p>
        </div>
      )}
    </section>
  );
};

export default FixturesDashboard;
