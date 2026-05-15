import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { FiSearch, FiTarget, FiZap, FiActivity, FiArrowRight, FiShield, FiStar } from 'react-icons/fi';

const PublicLanding = () => {
  const { isAuthenticated, loading } = useAuth();
  const [query, setQuery] = useState('live');
  const [filters, setFilters] = useState({ location: '', format: '', date: '' });
  const [result, setResult] = useState({ tournaments: [], teams: [], players: [] });
  const [matchBuckets, setMatchBuckets] = useState({ live: [], scheduled: [], completed: [] });

  const filteredMatches = useMemo(() => {
    const bucket = matchBuckets[query] || [];
    // Only show real-world matches (source !== 'organized')
    return bucket.filter(m => m.source !== 'organized');
  }, [matchBuckets, query]);

  const loadMatches = async () => {
    try {
      const { data } = await api.get('/schedules');
      const grouped = { live: [], scheduled: [], completed: [] };
      
      const allMatchesRaw = [...(data.organized || []), ...(data.global || [])];
      
      // Deduplicate by ID
      const uniqueMap = new Map();
      allMatchesRaw.forEach(m => {
        const id = m._id || m.id;
        if (id) uniqueMap.set(String(id), m);
      });

      const allMatches = Array.from(uniqueMap.values());
      
      allMatches.forEach((match) => {
        const raw = String(match.status || '').toLowerCase();
        const status = raw === 'live' ? 'live' : raw === 'completed' ? 'completed' : 'scheduled';
        grouped[status].push(match);
      });
      setMatchBuckets(grouped);
    } catch (err) { console.error(err); }
  };

  const runSearch = async () => {
    try {
      const { data } = await api.get('/search', { params: { query, ...filters } });
      setResult(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    runSearch();
    loadMatches();
    
    // Connect socket if needed
    if (!socket.connected) socket.connect();

    const handleGlobalUpdate = () => {
      loadMatches();
    };

    socket.onLiveUpdate(handleGlobalUpdate);
    return () => {
      socket.offLiveUpdate(handleGlobalUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 selection:text-emerald-400 pb-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent z-0" />
        
        <div className="max-w-[1200px] mx-auto relative z-10 text-center">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-8"
           >
              <FiZap className="animate-pulse" /> The Next-Gen Cricket Infrastructure
           </motion.div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-7xl md:text-9xl font-black italic tracking-tighter mb-8 leading-[0.9]"
           >
              CREASE
           </motion.h1>

           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed mb-12"
           >
              Global real-time cricket data, tournament management, and professional analytics.
           </motion.p>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="flex flex-wrap justify-center gap-6"
           >
              {loading ? (
                 <div className="h-14 w-48 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
              ) : (
                 <>
                    <Link to="/login" className="btn-primary">Sign In</Link>
                    <Link to="/signup" className="btn-secondary">Register Now</Link>
                    {isAuthenticated && (
                      <Link to="/dashboard" className="btn-secondary !bg-emerald-500/10 !text-emerald-400">
                        Back to Dashboard
                      </Link>
                    )}
                 </>
              )}
           </motion.div>
        </div>
      </section>

      {/* Arena Section */}
      <section className="px-6 py-12 max-w-[1400px] mx-auto">
         <div className="surface-panel p-10 bg-mesh prism-border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
               <div>
                  <h2 className="text-4xl font-black italic tracking-tighter mb-2 uppercase text-emerald-500">Global Match Centre</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live feeds from international & domestic circuits</p>
               </div>
               
               <div className="flex p-1 bg-white/5 rounded-2xl">
                  {['live', 'scheduled', 'completed'].map((cat) => (
                     <button
                        key={cat}
                        onClick={() => setQuery(cat)}
                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${query === cat ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        {cat}
                     </button>
                  ))}
               </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {filteredMatches.slice(0, 6).map((m, i) => (
                  <Link key={i} to={`/scorecard/${m._id || m.id}`} className="p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                     {query === 'live' && <span className="absolute top-6 right-6 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Live</span>
                     </span>}
                     
                     <div className="space-y-6">
                        <div className="flex justify-between items-center text-xl font-black italic tracking-tighter">
                           <span>{m.team1?.shortName || m.team1?.shortCode || m.homeTeamId?.shortCode || 'TM1'}</span>
                           <span className="text-slate-800 text-xs px-3">VS</span>
                           <span>{m.team2?.shortName || m.team2?.shortCode || m.awayTeamId?.shortCode || 'TM2'}</span>
                        </div>
                        
                        <div className="flex justify-between items-center bg-black/20 rounded-2xl p-4">
                           <span className="text-sm font-black text-emerald-400 truncate max-w-[150px]">
                              {m.scorecard?.text || `${m.scorecard?.runs || 0}/${m.scorecard?.wickets || 0}`}
                           </span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.format || 'T20'}</span>
                        </div>
                     </div>
                  </Link>
               ))}
               {filteredMatches.length === 0 && (
                  <div className="lg:col-span-3 py-24 text-center border border-dashed border-white/10 rounded-[40px]">
                     <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px] italic">No real-world {query || 'live'} matches available</p>
                  </div>
               )}
            </div>
         </div>
      </section>

      {/* Features Bento */}
      <section className="px-6 py-12 max-w-[1400px] mx-auto grid gap-8 md:grid-cols-3">
         <div className="surface-panel p-8 bg-indigo-500/5 border-indigo-500/10">
            <FiShield className="text-3xl text-indigo-400 mb-6" />
            <h4 className="text-xl font-black italic mb-4 text-white">GOVERNANCE</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Dedicated dashboards for Umpires and Organizers with secure audit logs and decision verification.</p>
         </div>

         <div className="surface-panel p-8 bg-emerald-500/5 border-emerald-500/10">
            <FiActivity className="text-3xl text-emerald-400 mb-6" />
            <h4 className="text-xl font-black italic mb-4 text-white">LIVE ANALYTICS</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Real-time score updates and detailed match statistics powered by our global telemetry engine.</p>
         </div>

         <div className="surface-panel p-8 bg-amber-500/5 border-amber-500/10">
            <FiTarget className="text-3xl text-amber-400 mb-6" />
            <h4 className="text-xl font-black italic mb-4 text-white">ROSTER MGMT</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Complete squad orchestration and player registries for official tournament sanctioned play.</p>
         </div>
      </section>
    </div>
  );
};

export default PublicLanding;
