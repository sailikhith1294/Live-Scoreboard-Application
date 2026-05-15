import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizerSync } from '../context/OrganizerSyncContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiActivity, FiZap, FiTrash2, FiShield, FiTarget, FiArrowLeft, FiClock, FiCheckCircle, FiCpu, FiNavigation } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const OrganizerMatchesPage = () => {
  const { dashboard, loading, refresh } = useOrganizerSync();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [squads, setSquads] = useState({ home: [], away: [] });
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  const getId = (row) => row?._id || row?.id;

  const fetchSquadPlayers = async (homeId, awayId) => {
    setLoadingPlayers(true);
    try {
      const { data } = await api.get('/organizer/players');
      // Filter for players belonging to these two teams
      const players = data.filter(p => 
        String(p.team?._id || p.team?.id) === String(homeId) || 
        String(p.team?._id || p.team?.id) === String(awayId)
      );
      setTeamPlayers(players);
    } catch (err) {
      // toast.error('Failed to load team rosters');
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    if (selectedMatch) {
      fetchSquadPlayers(getId(selectedMatch.homeTeamId), getId(selectedMatch.awayTeamId));
      setTossForm({
        tossWinnerTeamId: selectedMatch.tossWinnerTeamId?._id || selectedMatch.tossWinnerTeamId || '',
        tossDecision: selectedMatch.tossDecision || 'bat'
      });
      setOfficials({
        umpireId: selectedMatch.umpireId?._id || selectedMatch.umpireId || '',
        legUmpireId: selectedMatch.legUmpireId?._id || selectedMatch.legUmpireId || ''
      });
      setSquads({
        home: selectedMatch.homeSquad || [],
        away: selectedMatch.awaySquad || []
      });
    }
  }, [selectedMatch]);

  const updateStatus = async (matchId, status, winnerId = null) => {
    if (status === 'live') {
      if (!selectedMatch.tossWinnerTeamId && !tossForm.tossWinnerTeamId) {
        return toast.error('Please resolve the toss before starting the match');
      }
      if (squads.home.length < 11 || squads.away.length < 11) {
        if (!window.confirm('Squads are incomplete (less than 11 players). Proceed to start match anyway?')) return;
      }
    }
    
    try {
      await api.patch(`/organizer/matches/${matchId}/status`, { status, winnerId });
      // toast.success(`Match is now ${status.toUpperCase()}`);
      refresh();
      setSelectedMatch(null);
    } catch (err) { 
      // const msg = err.response?.data?.message || 'Update failed';
      // toast.error(msg);
    }
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm('Confirm Match Deletion: This will permanently remove all match data.')) return;
    try {
      await api.delete(`/organizer/matches/${matchId}`);
      // toast.success('Match deleted');
      refresh();
    } catch (err) { /* toast.error('Deletion failed'); */ }
  };

  const [tossForm, setTossForm] = useState({ tossWinnerTeamId: '', tossDecision: 'bat' });
  const [officials, setOfficials] = useState({ umpireId: '', legUmpireId: '' });

  const submitToss = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/organizer/matches/${getId(selectedMatch)}/toss`, tossForm);
      // toast.success('Toss details saved');
      refresh();
    } catch (err) { /* toast.error('Failed to save toss'); */ }
  };

  const assignOfficials = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/organizer/matches/${getId(selectedMatch)}/officials`, officials);
      // toast.success('Officials assigned');
      refresh();
    } catch (err) { 
      // const msg = err.response?.data?.message || 'Assignment failed';
      // toast.error(msg);
    }
  };

  const saveSquads = async () => {
    try {
      await api.patch(`/organizer/matches/${getId(selectedMatch)}/squads`, {
        homeSquad: squads.home,
        awaySquad: squads.away
      });
      // toast.success('Squads updated');
      refresh();
    } catch (err) { /* toast.error('Failed to update squads'); */ }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up pb-20">
      {/* Control Room Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10 z-0" />
        <div className="absolute top-0 right-0 p-8 opacity-10"><FiCpu className="text-8xl" /></div>
        <div className="relative z-10 p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <FiNavigation className="text-amber-500 text-xs animate-pulse" />
                 <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Match Management System</span>
              </div>
              <h2 className="text-5xl font-black text-white italic tracking-tighter">Match <span className="text-amber-500">Control</span></h2>
              <p className="mt-3 text-slate-400 font-medium max-w-lg">Update match details, toss results, and official assignments.</p>
           </div>
           <div className="flex gap-4">
              <div className="surface-panel !bg-amber-500/5 border-amber-500/20 px-8 py-4 flex flex-col items-center">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Status</p>
                 <p className="text-sm font-bold text-white uppercase italic">Active</p>
              </div>
           </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Match Feed */}
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-white italic flex items-center gap-3">
                 <FiActivity className="text-amber-500" /> Scheduled Matches
              </h3>
              <span className="badge badge-amber">{dashboard.matches.length} Scheduled</span>
           </div>

           <div className="space-y-12">
              {Object.values(dashboard.matches.reduce((acc, m) => {
                 const tId = m.tournamentId?._id || m.tournamentId;
                 if (!acc[tId]) acc[tId] = { name: m.tournamentId?.name || 'Managed Series', matches: [] };
                 acc[tId].matches.push(m);
                 return acc;
              }, {})).map((group, gIdx) => (
                <div key={gIdx} className="space-y-6">
                   <div className="flex items-center gap-4 px-2">
                      <div className="h-[2px] flex-1 bg-white/5"></div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">{group.name}</h4>
                      <div className="h-[2px] flex-1 bg-white/5"></div>
                   </div>
                   
                   <div className="space-y-4">
                      {group.matches.map((m) => (
                        <div 
                          key={getId(m)} 
                          onClick={() => setSelectedMatch(m)}
                          className={`surface-panel group cursor-pointer transition-all border-l-4 overflow-hidden ${
                            selectedMatch && getId(selectedMatch) === getId(m) ? 'border-amber-500 bg-white/[0.04]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                          }`}
                        >
                           <div className="flex justify-between items-center p-8">
                              <div className="flex-1">
                                 <div className="flex items-center gap-4 mb-4">
                                    <span className={`badge ${m.status === 'live' ? 'badge-live' : m.status === 'completed' ? 'badge-emerald' : 'badge-indigo'}`}>{m.status}</span>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">#{m.matchNo}</span>
                                 </div>
                                 <h4 className="text-3xl font-black text-white italic tracking-tight flex items-center gap-4">
                                    <span className="text-slate-200">{m.homeTeamId?.shortCode || 'HME'}</span>
                                    <span className="text-slate-800 text-lg">VS</span>
                                    <span className="text-slate-200">{m.awayTeamId?.shortCode || 'AWY'}</span>
                                 </h4>
                                 <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                       <FiShield className={`text-[10px] ${m.umpireId ? 'text-emerald-400' : 'text-slate-600'}`} />
                                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                          Main: {m.umpireId?.name || (m.umpireId ? 'Authorized' : 'TBD')}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <FiShield className={`text-[10px] ${m.legUmpireId ? 'text-indigo-400' : 'text-slate-600'}`} />
                                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                          Leg: {m.legUmpireId?.name || (m.legUmpireId ? 'Authorized' : 'TBD')}
                                       </span>
                                    </div>
                                    {!m.umpireId && !m.legUmpireId && (
                                       <p className="text-[8px] font-black text-rose-500/50 uppercase tracking-[0.2em] italic">No Officials Authorized</p>
                                    )}
                                 </div>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase mt-4 flex items-center gap-2">
                                    <FiClock className="text-amber-500/50" /> {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'NOT SCHEDULED'}
                                 </p>
                              </div>

                              <div className="flex flex-col items-end gap-4">
                                 <div className="flex gap-3">
                                    {m.status !== 'live' && m.status !== 'completed' && (
                                       <button 
                                        onClick={(e) => { e.stopPropagation(); updateStatus(getId(m), 'live'); }} 
                                        className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                      >
                                        Start Match
                                      </button>
                                    )}
                                    {m.status === 'live' && (
                                      <button 
                                        onClick={(e) => { 
                                           e.stopPropagation(); 
                                           const winner = window.prompt(`RESOLVE WINNER: 1 for ${m.homeTeamId?.shortCode}, 2 for ${m.awayTeamId?.shortCode}, or leave blank for DRAW:`);
                                           let winnerId = null;
                                           if (winner === '1') winnerId = m.homeTeamId?._id || m.homeTeamId;
                                           if (winner === '2') winnerId = m.awayTeamId?._id || m.awayTeamId;
                                           updateStatus(getId(m), winnerId ? 'completed' : 'abandoned', winnerId); 
                                        }} 
                                        className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                                      >
                                        Terminate Session
                                      </button>
                                    )}
                                 </div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); deleteMatch(getId(m)); }} 
                                    className="p-4 rounded-2xl bg-white/5 text-slate-700 hover:bg-rose-500 hover:text-white transition-all border border-white/5"
                                 >
                                    <FiTrash2 />
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
              {dashboard.matches.length === 0 && (
                <div className="py-32 text-center surface-panel border-dashed border-2 opacity-30">
                   <FiZap className="text-5xl text-slate-700 mx-auto mb-6" />
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">No Matches Found</p>
                </div>
              )}
           </div>
        </div>

        {/* Steering Panel */}
        <div className="lg:col-span-4">
           <AnimatePresence mode="wait">
              {selectedMatch ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="surface-panel p-10 bg-mesh border-amber-500/20 sticky top-10"
                >
                   <div className="flex justify-between items-center mb-10">
                       <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                             <FiTarget className="text-amber-500" /> Match Settings
                          </h3>
                          <p className="text-[8px] font-black text-slate-500 uppercase mt-1">Update Match Parameters</p>
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
                                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${tossForm.tossDecision === 'bat' ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-white/5 text-slate-600 border-white/5 hover:border-white/10'}`}
                                >Bat First</button>
                                <button 
                                  type="button"
                                  onClick={() => setTossForm({...tossForm, tossDecision: 'bowl'})}
                                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${tossForm.tossDecision === 'bowl' ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-white/5 text-slate-600 border-white/5 hover:border-white/10'}`}
                                >Bowl First</button>
                             </div>
                             <button className="w-full btn-primary !py-4 shadow-lg shadow-amber-900/10">Save Toss Results</button>
                          </form>
                       </section>

                       {/* Squad Selection Section */}
                       <section className="space-y-5 pt-10 border-t border-white/10">
                          <div className="flex justify-between items-center">
                             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Squad Selection</p>
                             <button 
                               onClick={saveSquads}
                               className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20"
                             >Commit Squads</button>
                          </div>
                          
                          {loadingPlayers ? (
                            <div className="py-10 text-center opacity-30"><p className="text-[10px] font-black uppercase">Loading Rosters...</p></div>
                          ) : (
                            <div className="grid grid-cols-2 gap-6">
                               {/* Home Squad */}
                               <div className="space-y-4">
                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">{selectedMatch.homeTeamId?.shortCode} Squad</p>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                     {teamPlayers.filter(p => String(p.team?._id || p.team?.id) === getId(selectedMatch.homeTeamId)).map(p => (
                                       <div 
                                         key={p.id}
                                         onClick={() => {
                                           const isSelected = squads.home.includes(p.id);
                                           setSquads({
                                             ...squads,
                                             home: isSelected ? squads.home.filter(id => id !== p.id) : [...squads.home, p.id]
                                           });
                                         }}
                                         className={`p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${squads.home.includes(p.id) ? 'bg-amber-500/10 border-amber-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                                       >
                                          {p.user?.fullName}
                                       </div>
                                     ))}
                                  </div>
                                  <p className="text-[8px] text-center font-black text-slate-600">{squads.home.length} SELECTED</p>
                               </div>

                               {/* Away Squad */}
                               <div className="space-y-4">
                                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">{selectedMatch.awayTeamId?.shortCode} Squad</p>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                     {teamPlayers.filter(p => String(p.team?._id || p.team?.id) === getId(selectedMatch.awayTeamId)).map(p => (
                                       <div 
                                         key={p.id}
                                         onClick={() => {
                                           const isSelected = squads.away.includes(p.id);
                                           setSquads({
                                             ...squads,
                                             away: isSelected ? squads.away.filter(id => id !== p.id) : [...squads.away, p.id]
                                           });
                                         }}
                                         className={`p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${squads.away.includes(p.id) ? 'bg-amber-500/10 border-amber-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                                       >
                                          {p.user?.fullName}
                                       </div>
                                     ))}
                                  </div>
                                  <p className="text-[8px] text-center font-black text-slate-600">{squads.away.length} SELECTED</p>
                               </div>
                            </div>
                          )}
                       </section>

                       {/* Officials Section */}
                       <section className="space-y-5 pt-10 border-t border-white/10">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Assign Officials</p>
                          <form onSubmit={assignOfficials} className="space-y-4">
                             <input 
                               placeholder="Main Umpire 24-char System ID" 
                               className="input-field !py-4 !text-xs font-mono !bg-white/5 border-white/10"
                               value={officials.umpireId}
                               onChange={e => setOfficials({...officials, umpireId: e.target.value})}
                            />
                            <input 
                               placeholder="Leg Umpire 24-char System ID" 
                               className="input-field !py-4 !text-xs font-mono !bg-white/5 border-white/10"
                               value={officials.legUmpireId}
                               onChange={e => setOfficials({...officials, legUmpireId: e.target.value})}
                            />
                            <button className="w-full btn-secondary !py-4 !text-[10px] !bg-indigo-600/10 !border-indigo-500/20 !text-indigo-400 hover:!bg-indigo-500 hover:!text-white shadow-lg shadow-indigo-900/10">Authorize Official Crew</button>
                          </form>
                       </section>

                       <div className="pt-10 border-t border-white/10">
                          <button 
                            onClick={() => updateStatus(getId(selectedMatch), 'live')}
                            className="w-full py-6 rounded-3xl bg-emerald-600 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20"
                          >
                             <FiZap /> Start Match Session
                          </button>
                       </div>

                       <section className="pt-10 border-t border-white/10">
                          <p className="text-[8px] font-black text-rose-500/50 uppercase tracking-widest mb-4">Admin Override</p>
                          <button 
                            onClick={() => {
                                const status = window.prompt("FORCE GLOBAL STATUS (scheduled/live/completed/abandoned):", selectedMatch.status);
                                if (status) updateStatus(getId(selectedMatch), status);
                            }}
                            className="w-full py-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                          >
                             Force Status Update
                          </button>
                       </section>
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

export default OrganizerMatchesPage;