import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useUserSync } from '../context/UserSyncContext';
import { FiActivity, FiZap, FiAward } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';

const TournamentMatchesPage = () => {
  const { tournamentId } = useParams();
  const { tournaments } = useUserSync();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const tournament = tournaments.find(t => (t._id || t.id) === tournamentId);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data } = await api.get('/common/matches');
        const filtered = data.filter(m => {
          const tId = m.tournamentId?._id || m.tournamentId?.id || m.tournamentId;
          return tId === tournamentId;
        });
        setMatches(filtered);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchMatches();
  }, [tournamentId]);

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

      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">{tournament?.name || 'Tournament'} <span className="text-emerald-500">Arena</span></h2>
              <p className="mt-2 text-slate-400 font-medium">Tournament fixtures, real-time scores, and historical results.</p>
           </div>
           <Link to={`/tournaments/${tournamentId}/leaderboard`} className="btn-primary !px-6 flex items-center gap-2">
              <FiAward className="text-lg" /> League Table
           </Link>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <Link 
            key={m._id || m.id} 
            to={`/scorecard/${m._id || m.id}`}
            className="surface-panel group border-white/5 hover:border-emerald-500/30 transition-all p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <span className={`badge ${
                m.status === 'live' ? 'badge-live' : 
                m.status === 'completed' ? 'badge-emerald' : 'badge-indigo'
              }`}>{m.status}</span>
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Match #{m.matchNo}</span>
            </div>
            
            <div className="flex-1 flex justify-between items-center py-6">
              <div className="text-center flex-1">
                <p className="text-2xl font-black text-white italic">{m.homeTeamId?.shortCode || 'HME'}</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 truncate">{m.homeTeamId?.name}</p>
              </div>
              <div className="px-6 text-slate-700 font-black italic text-sm">VS</div>
              <div className="text-center flex-1">
                <p className="text-2xl font-black text-white italic">{m.awayTeamId?.shortCode || 'AWY'}</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 truncate">{m.awayTeamId?.name}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
              <div className="flex flex-col">
                 <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Schedule</p>
                 <p className="text-xs text-slate-400 font-bold mt-0.5">
                    {m.status === 'scheduled' ? new Date(m.scheduledAt).toLocaleDateString() : 'Result Official'}
                 </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                 <FiZap />
              </div>
            </div>
          </Link>
        ))}
        {matches.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-32 text-center surface-panel border-dashed opacity-50">
            <FiActivity className="text-4xl text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No match operations scheduled for this tournament.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentMatchesPage;
