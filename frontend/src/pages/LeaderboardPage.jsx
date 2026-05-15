import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { FiAward, FiArrowLeft, FiTrendingUp } from 'react-icons/fi';

const LeaderboardPage = () => {
  const { tournamentId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/tournaments/${tournamentId}/leaderboard`)
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setRows([]);
        setError(err.response?.data?.message || 'Failed to load leaderboard');
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      <section className="surface-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-amber-500/5 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
              <Link to={`/tournaments/${tournamentId}/matches`} className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors mb-4">
                 <FiArrowLeft /> Back to Fixtures
              </Link>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">League <span className="text-emerald-500">Standings</span></h2>
              <p className="mt-1 text-slate-400 font-medium uppercase text-[10px] tracking-[0.2em]">Live Tournament Rankings</p>
           </div>
           <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                 <FiAward className="text-2xl" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase">Season</p>
                 <p className="text-sm font-bold text-white uppercase italic">2026 Championship</p>
              </div>
           </div>
        </div>
      </section>

      {error ? (
        <div className="surface-panel p-10 text-center border-rose-500/20 bg-rose-500/5">
           <p className="text-rose-400 font-bold italic">{error}</p>
        </div>
      ) : (
        <div className="surface-panel p-0 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                       <th className="px-8 py-6">Rank</th>
                       <th className="px-8 py-6">Squad</th>
                       <th className="px-8 py-6 text-center">Played</th>
                       <th className="px-8 py-6 text-center">Won</th>
                       <th className="px-8 py-6 text-center">Lost</th>
                       <th className="px-8 py-6 text-center">Points</th>
                       <th className="px-8 py-6 text-right">NRR</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {rows.map((r, index) => (
                       <tr key={r.id || index} className="group hover:bg-white/[0.02] transition-all">
                          <td className="px-8 py-6">
                             <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-black italic text-sm ${
                                index === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                                index === 1 ? 'bg-slate-300 text-black' : 
                                index === 2 ? 'bg-amber-800 text-white' : 'bg-white/5 text-slate-400'
                             }`}>
                                {index + 1}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-black italic text-xs">
                                   {r.teamId?.shortCode || 'TM'}
                                </div>
                                <p className="font-bold text-white text-lg italic">{r.teamId?.name || 'Unknown Squad'}</p>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-center text-slate-400 font-bold">{r.played}</td>
                          <td className="px-8 py-6 text-center text-emerald-400 font-black">{r.won}</td>
                          <td className="px-8 py-6 text-center text-rose-500 font-bold">{r.lost}</td>
                          <td className="px-8 py-6 text-center">
                             <span className="text-xl font-black text-white italic">{r.points}</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <FiTrendingUp className={parseFloat(r.netRunRate) >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                                <span className={`font-mono text-sm font-bold ${parseFloat(r.netRunRate) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                   {parseFloat(r.netRunRate).toFixed(3)}
                                </span>
                             </div>
                          </td>
                       </tr>
                    ))}
                    {rows.length === 0 && (
                       <tr>
                          <td colSpan="7" className="px-8 py-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs italic">
                             Tournament has not commenced yet.
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2">
         <div className="surface-panel p-8 bg-mesh border-emerald-500/20">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Qualification Status</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Top 4 teams at the end of the group stage will advance to the knockout playoffs. Standings are updated in real-time after every ball event.</p>
         </div>
         <div className="surface-panel p-8">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tie-Breaker Rules</h4>
            <p className="text-sm text-slate-400 leading-relaxed italic">In case of equal points, Net Run Rate (NRR) will be the primary decider, followed by head-to-head results.</p>
         </div>
      </section>
    </div>
  );
};

export default LeaderboardPage;
