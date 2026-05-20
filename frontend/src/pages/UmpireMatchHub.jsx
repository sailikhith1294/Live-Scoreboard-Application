import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiActivity, FiZap, FiTarget, FiArrowRight, FiClock, FiSearch, FiArrowLeft, FiUser, FiCheckCircle } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';
import toast from 'react-hot-toast';

const UmpireMatchHub = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [squads, setSquads] = useState({ home: [], away: [] });
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [tossForm, setTossForm] = useState({ tossWinnerTeamId: '', tossDecision: 'bat' });

  const getId = (row) => row?._id || row?.id;

  const loadMatches = async () => {
    try {
      const { data } = await api.get('/umpire/dashboard');
      setMatches(data.matches || []);
    } catch (err) {
      // toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchSquadPlayers = async (homeId, awayId) => {
    setLoadingPlayers(true);
    try {
      const [homeRes, awayRes] = await Promise.all([
         api.get(`/common/teams/${homeId}/players`),
         api.get(`/common/teams/${awayId}/players`)
      ]);
      
      const homePlayers = homeRes.data.map(p => ({ ...p, team: { _id: homeId }, user: { fullName: p.userId?.name } }));
      const awayPlayers = awayRes.data.map(p => ({ ...p, team: { _id: awayId }, user: { fullName: p.userId?.name } }));
      
      setTeamPlayers([...homePlayers, ...awayPlayers]);
    } catch (err) {
      // toast.error('Failed to load team rosters');
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchSquadPlayers(getId(selectedMatch.homeTeamId), getId(selectedMatch.awayTeamId));
      setTossForm({
        tossWinnerTeamId: selectedMatch.tossWinnerTeamId?._id || selectedMatch.tossWinnerTeamId || '',
        tossDecision: selectedMatch.tossDecision || 'bat'
      });
      setSquads({
        home: selectedMatch.homeSquad || [],
        away: selectedMatch.awaySquad || []
      });
    }
  }, [selectedMatch]);

  const submitToss = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/umpire/matches/${getId(selectedMatch)}/toss`, tossForm);
      // toast.success('Toss results saved');
      loadMatches();
    } catch (err) { /* toast.error('Failed to save toss'); */ }
  };

  const saveSquads = async () => {
    try {
      await api.patch(`/umpire/matches/${getId(selectedMatch)}/squads`, {
        homeSquad: squads.home,
        awaySquad: squads.away
      });
      // toast.success('Squads committed');
      loadMatches();
    } catch (err) { /* toast.error('Failed to update squads'); */ }
  };

  const startMatch = async () => {
    if (!selectedMatch.tossWinnerTeamId && !tossForm.tossWinnerTeamId) {
      // return toast.error('Please resolve the toss first');
      return;
    }
    if (squads.home.length < 11 || squads.away.length < 11) {
      if (!window.confirm('Squads are incomplete. Proceed anyway?')) return;
    }
    try {
      await api.patch(`/umpire/matches/${getId(selectedMatch)}/start`);
      // toast.success('Match is now LIVE');
      loadMatches();
      setSelectedMatch(null);
    } catch (err) { /* toast.error('Failed to start match'); */ }
  };

  const filteredMatches = matches.filter(m => 
    m.homeTeamId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.awayTeamId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.matchNo?.toString().includes(searchTerm)
  );

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

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Match List */}
        <div className="lg:col-span-8 space-y-8">
           <section className="surface-panel overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 z-0" />
             <div className="relative z-10 p-8">
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Scoring <span className="text-emerald-500">Command</span></h2>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mt-2">Manage live scores and official match protocols</p>
             </div>
           </section>

           <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:w-96 group">
                 <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Search by Team or Match ID..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-emerald-500/30 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="flex gap-4">
                 <span className="badge badge-emerald">{matches.filter(m => m.status === 'live').length} Live</span>
                 <span className="badge badge-slate">{matches.filter(m => m.status === 'scheduled').length} Scheduled</span>
              </div>
           </div>

           <div className="grid gap-6 md:grid-cols-2">
              {filteredMatches.map((m) => (
                 <div 
                   key={m._id} 
                   onClick={() => setSelectedMatch(m)}
                   className={`surface-panel p-8 group border-white/5 hover:border-emerald-500/30 transition-all relative overflow-hidden cursor-pointer ${getId(selectedMatch) === m._id ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                 >
                    <div className="flex justify-between items-center mb-6">
                       <span className={`badge ${m.status === 'live' ? 'badge-live' : 'badge-emerald'}`}>{m.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-8">
                       <div className="text-center flex-1">
                          <p className="text-2xl font-black text-white italic">{m.homeTeamId?.shortCode || 'HME'}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.homeTeamId?.name}</p>
                       </div>
                       <div className="px-4 text-slate-800 font-black italic text-sm">VS</div>
                       <div className="text-center flex-1">
                          <p className="text-2xl font-black text-white italic">{m.awayTeamId?.shortCode || 'AWY'}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.awayTeamId?.name}</p>
                       </div>
                    </div>

                    <div className="flex gap-3">
                       <Link 
                         to={`/dashboard/umpire/scoring/${m._id}`} 
                         onClick={(e) => e.stopPropagation()}
                         className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                       >
                          Scoring <FiArrowRight />
                       </Link>
                       <button className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                          <FiTarget />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Right Column: Match Settings */}
        <div className="lg:col-span-4">
           <AnimatePresence mode="wait">
              {selectedMatch ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="surface-panel p-10 bg-mesh border-emerald-500/20 sticky top-10"
                >
                   <div className="flex justify-between items-center mb-10">
                       <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                             <FiTarget className="text-emerald-500" /> Match Settings
                          </h3>
                          <p className="text-[8px] font-black text-slate-500 uppercase mt-1">Official Pre-Match Protocol</p>
                       </div>
                       <button onClick={() => setSelectedMatch(null)} className="p-3 rounded-xl bg-white/5 text-slate-600 hover:text-white transition-all"><FiArrowLeft /></button>
                   </div>
                   
                    <div className="space-y-10">
                       {/* Toss Section */}
                       <section className="space-y-5">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Toss Details</p>
                          <form onSubmit={submitToss} className="space-y-4">
                             <select 
                                required
                                className="input-field !py-4 !bg-white/5 border-white/10"
                                value={tossForm.tossWinnerTeamId}
                                onChange={e => setTossForm({...tossForm, tossWinnerTeamId: e.target.value})}
                             >
                                <option value="">Select Winning Team</option>
                                <option value={getId(selectedMatch.homeTeamId)}>{selectedMatch.homeTeamId?.name}</option>
                                <option value={getId(selectedMatch.awayTeamId)}>{selectedMatch.awayTeamId?.name}</option>
                             </select>
                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                  type="button"
                                  onClick={() => setTossForm({...tossForm, tossDecision: 'bat'})}
                                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${tossForm.tossDecision === 'bat' ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-white/5 text-slate-600 border-white/5 hover:border-white/10'}`}
                                >Bat First</button>
                                <button 
                                  type="button"
                                  onClick={() => setTossForm({...tossForm, tossDecision: 'bowl'})}
                                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${tossForm.tossDecision === 'bowl' ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-white/5 text-slate-600 border-white/5 hover:border-white/10'}`}
                                >Bowl First</button>
                             </div>
                             <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Save Toss Results</button>
                          </form>
                       </section>

                        {/* Squad Selection Section */}
                        <section className="space-y-5 pt-10 border-t border-white/10">
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Playing 11 Selection</p>
                                 <p className="text-[8px] font-black text-emerald-500/50 uppercase mt-1">Select 11 Players for each side</p>
                              </div>
                              <button 
                                onClick={saveSquads}
                                className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all"
                              >Commit Playing 11</button>
                           </div>
                           
                           {loadingPlayers ? (
                             <div className="py-10 text-center opacity-30"><p className="text-[10px] font-black uppercase">Loading Rosters...</p></div>
                           ) : (
                             <div className="grid grid-cols-2 gap-6">
                                {/* Batting Team Selection */}
                                <div className="space-y-4">
                                   <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Batting Side</p>
                                      <p className="text-xs font-black text-white uppercase italic mt-1">
                                         {tossForm.tossWinnerTeamId === getId(selectedMatch.homeTeamId) 
                                           ? (tossForm.tossDecision === 'bat' ? selectedMatch.homeTeamId?.name : selectedMatch.awayTeamId?.name)
                                           : (tossForm.tossDecision === 'bat' ? selectedMatch.awayTeamId?.name : selectedMatch.homeTeamId?.name)
                                         }
                                      </p>
                                   </div>
                                   <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                      {teamPlayers.filter(p => {
                                         const isHome = String(p.team?._id || p.team?.id) === getId(selectedMatch.homeTeamId);
                                         const isHomeBatting = (tossForm.tossWinnerTeamId === getId(selectedMatch.homeTeamId) && tossForm.tossDecision === 'bat') || (tossForm.tossWinnerTeamId !== getId(selectedMatch.homeTeamId) && tossForm.tossDecision === 'bowl');
                                         return isHome === isHomeBatting;
                                      }).map(p => {
                                         const teamKey = String(p.team?._id || p.team?.id) === getId(selectedMatch.homeTeamId) ? 'home' : 'away';
                                         return (
                                            <div 
                                              key={p.id}
                                              onClick={() => {
                                                const isSelected = squads[teamKey].includes(p.id);
                                                setSquads({
                                                  ...squads,
                                                  [teamKey]: isSelected ? squads[teamKey].filter(id => id !== p.id) : [...squads[teamKey], p.id]
                                                });
                                              }}
                                              className={`p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${squads[teamKey].includes(p.id) ? 'bg-emerald-500/10 border-emerald-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                                            >
                                               {p.user?.fullName}
                                            </div>
                                         );
                                      })}
                                   </div>
                                </div>

                                {/* Bowling Team Selection */}
                                <div className="space-y-4">
                                   <div className="text-center p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Bowling Side</p>
                                      <p className="text-xs font-black text-white uppercase italic mt-1">
                                         {tossForm.tossWinnerTeamId === getId(selectedMatch.homeTeamId) 
                                           ? (tossForm.tossDecision === 'bowl' ? selectedMatch.homeTeamId?.name : selectedMatch.awayTeamId?.name)
                                           : (tossForm.tossDecision === 'bowl' ? selectedMatch.awayTeamId?.name : selectedMatch.homeTeamId?.name)
                                         }
                                      </p>
                                   </div>
                                   <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                      {teamPlayers.filter(p => {
                                         const isHome = String(p.team?._id || p.team?.id) === getId(selectedMatch.homeTeamId);
                                         const isHomeBowling = (tossForm.tossWinnerTeamId === getId(selectedMatch.homeTeamId) && tossForm.tossDecision === 'bowl') || (tossForm.tossWinnerTeamId !== getId(selectedMatch.homeTeamId) && tossForm.tossDecision === 'bat');
                                         return isHome === isHomeBowling;
                                      }).map(p => {
                                         const teamKey = String(p.team?._id || p.team?.id) === getId(selectedMatch.homeTeamId) ? 'home' : 'away';
                                         return (
                                            <div 
                                              key={p.id}
                                              onClick={() => {
                                                const isSelected = squads[teamKey].includes(p.id);
                                                setSquads({
                                                  ...squads,
                                                  [teamKey]: isSelected ? squads[teamKey].filter(id => id !== p.id) : [...squads[teamKey], p.id]
                                                });
                                              }}
                                              className={`p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${squads[teamKey].includes(p.id) ? 'bg-indigo-500/10 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                                            >
                                               {p.user?.fullName}
                                            </div>
                                         );
                                      })}
                                   </div>
                                </div>
                             </div>
                           )}
                        </section>

                       <div className="pt-10 border-t border-white/10">
                          <button 
                            onClick={startMatch}
                            className="w-full py-6 rounded-3xl bg-emerald-600 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20"
                          >
                             <FiZap /> Start Match Session
                          </button>
                       </div>
                    </div>
                </motion.div>
              ) : (
                <div className="surface-panel p-20 text-center opacity-30 border-dashed border-2 flex flex-col items-center justify-center min-h-[400px]">
                   <p className="text-7xl mb-8 italic font-black text-slate-800 tracking-tighter">WAIT</p>
                   <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Select a Match to Manage</p>
                </div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UmpireMatchHub;

