import { useState, useEffect } from 'react';
import { useOrganizerSync } from '../context/OrganizerSyncContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiGrid, FiSearch, FiCopy, FiCheckCircle, FiTrash2 } from 'react-icons/fi';

const OrganizerTeamsPage = () => {
  const { dashboard, loading, refresh } = useOrganizerSync();
  const [playerRoster, setPlayerRoster] = useState([]);
  const [activeView, setActiveView] = useState('teams');
  const [search, setSearch] = useState('');
  const [editingCaptainId, setEditingCaptainId] = useState(null);
  const [captainForms, setCaptainForms] = useState({}); // Mapping of teamId -> input string
  const [teamErrors, setTeamErrors] = useState({}); // Mapping of teamId -> error string
  
  const getId = (row) => {
    if (!row) return '';
    if (typeof row === 'string') return row;
    return String(row._id || row.id || row);
  };

  const loadPlayers = async () => {
    try {
      const { data } = await api.get('/organizer/players');
      setPlayerRoster(Array.isArray(data) ? data : []);
    } catch (err) { toast.error('Failed to load roster ledger'); }
  };

  useEffect(() => { loadPlayers(); }, [dashboard]);

  const filteredPlayers = playerRoster.filter(p => 
    [p.playerId, p.user?.fullName, p.team?.name].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
  );

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up pb-20">
      {/* Registry Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent z-0" />
        <div className="relative z-10 p-8">
           <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">Asset <span className="text-indigo-400">Registry</span></h2>
           <p className="mt-2 text-slate-400 font-medium text-xs">Squad roster governance and athlete credentialing systems.</p>
           
           <div className="mt-10 flex gap-8 border-b border-white/5 overflow-x-auto no-scrollbar">
              {[
                 { id: 'teams', label: 'Squads', icon: FiGrid },
                 { id: 'players', label: 'Athlete Ledger', icon: FiUsers }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeView === tab.id ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <tab.icon />
                  {tab.label}
                </button>
              ))}
           </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {/* View: Teams */}
        {activeView === 'teams' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {dashboard.teams.map((team) => (
              <div key={getId(team)} className="surface-panel group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 border border-white/5 hover:border-indigo-500/30">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="p-8">
                  {/* Header: Logo & Actions */}
                  <div className="flex justify-between items-start mb-8">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-3xl font-black italic shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {team.shortCode || team.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#020617] shadow-lg shadow-emerald-500/20" />
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <button 
                        onClick={async () => {
                          if (!window.confirm('IRREVERSIBLE: Purge this squad from the registry?')) return;
                          try {
                            await api.delete(`/organizer/teams/${getId(team)}`);
                            toast.success('Squad purged');
                            refresh();
                          } catch (err) { toast.error(err.response?.data?.message || 'Purge failed'); }
                        }}
                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                        title="Delete Squad"
                      >
                         <FiTrash2 size={16} />
                      </button>
                      <button 
                        onClick={() => copyToClipboard(team.inviteCode, 'Invite Code')}
                        className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                        title="Copy Invite Code"
                      >
                         <FiCopy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Team Identity */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Code: {team.inviteCode}</span>
                    </div>
                    <h4 className="text-3xl font-black text-white italic tracking-tighter leading-tight group-hover:text-indigo-400 transition-colors">{team.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">{team.shortCode || 'No Alias Assigned'}</p>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-8 group-hover:bg-indigo-500/[0.03] transition-colors">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Team Captain Protocol</p>
                    {team.captainId || editingCaptainId === getId(team) ? (
                      editingCaptainId === getId(team) ? (
                        <div className="space-y-4">
                           <div className="relative">
                              <input 
                                type="text"
                                autoFocus
                                placeholder="ENTER ATHLETE ID (PLY-...)"
                                value={captainForms[getId(team)] || ''}
                                onChange={(e) => {
                                  setCaptainForms(prev => ({ ...prev, [getId(team)]: e.target.value.toUpperCase() }));
                                  setTeamErrors(prev => ({ ...prev, [getId(team)]: '' }));
                                }}
                                className="w-full bg-[#020617] text-sm font-black text-white outline-none border border-white/10 rounded-xl px-5 py-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-700"
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const val = (captainForms[getId(team)] || '').trim();
                                    if (!val) { setEditingCaptainId(null); return; }
                                    try {
                                      const res = await api.patch(`/organizer/teams/${getId(team)}/captain`, { identifier: val });
                                      toast.success(res.data.message || 'Captain redesignated');
                                      setEditingCaptainId(null);
                                      setTeamErrors(prev => {
                                        const next = { ...prev };
                                        delete next[getId(team)];
                                        return next;
                                      });
                                      loadPlayers();
                                      refresh();
                                    } catch (err) { 
                                      setTeamErrors(prev => ({ ...prev, [getId(team)]: err.response?.data?.message || 'Assignment failed' }));
                                      toast.error(err.response?.data?.message || 'Assignment failed'); 
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingCaptainId(null);
                                    setTeamErrors(prev => ({ ...prev, [getId(team)]: '' }));
                                  }
                                }}
                              />
                              {teamErrors[getId(team)] && (
                                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                                   <p className="text-[9px] font-black text-red-400 uppercase leading-relaxed tracking-wider">
                                      {teamErrors[getId(team)]}
                                   </p>
                                </div>
                              )}
                           </div>
                           <button 
                             onClick={async () => {
                               const val = (captainForms[getId(team)] || '').trim();
                               if (!val) { setEditingCaptainId(null); return; }
                               try {
                                 const res = await api.patch(`/organizer/teams/${getId(team)}/captain`, { identifier: val });
                                 toast.success(res.data.message || 'Captain redesignated');
                                 setEditingCaptainId(null);
                                 setCaptainForms(prev => {
                                   const next = { ...prev };
                                   delete next[getId(team)];
                                   return next;
                                 });
                                 setTeamErrors(prev => {
                                    const next = { ...prev };
                                    delete next[getId(team)];
                                    return next;
                                 });
                                 loadPlayers();
                                 refresh();
                               } catch (err) { 
                                 setTeamErrors(prev => ({ ...prev, [getId(team)]: err.response?.data?.message || 'Assignment failed' }));
                                 toast.error(err.response?.data?.message || 'Assignment failed'); 
                               }
                             }}
                             className="w-full py-4 rounded-xl bg-indigo-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-indigo-500/20"
                           >
                             {team.captainId ? 'COMMIT NEW ASSIGNMENT' : 'DESIGNATE AS CAPTAIN'}
                           </button>
                           <button 
                             onClick={() => setEditingCaptainId(null)}
                             className="w-full text-[8px] font-black text-slate-700 uppercase hover:text-white transition-colors"
                           >
                             CANCEL
                           </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-5">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                 <FiCheckCircle size={24} />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-1">Active Authority</p>
                                 <p className="text-base font-black text-white italic tracking-tight truncate leading-none">
                                    {playerRoster.find(p => String(getId(p.user)) === String(getId(team.captainId)))?.user?.fullName || 'Captain Designated'}
                                 </p>
                              </div>
                           </div>
                           <button 
                             onClick={() => {
                               setEditingCaptainId(getId(team));
                               setCaptainForms(prev => ({ ...prev, [getId(team)]: '' }));
                             }}
                             className="w-full py-3 rounded-xl bg-white/[0.03] text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 hover:bg-indigo-500/10 transition-all border border-white/5"
                           >
                             REASSIGN AUTHORITY
                           </button>
                        </div>
                      )
                    ) : (
                      <div className="py-4 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center group/btn hover:border-indigo-500/20 transition-all">
                         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-3">No Authority Designated</p>
                         <button 
                           onClick={() => {
                             setEditingCaptainId(getId(team));
                             setCaptainForms(prev => ({ ...prev, [getId(team)]: '' }));
                           }}
                           className="px-6 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/5"
                         >
                           Assign Captain
                         </button>
                      </div>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <div>
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Squad Assets</p>
                       <p className="text-lg font-black text-white italic tracking-tighter">
                         {playerRoster.filter(p => {
                           const pTeamId = getId(p.team);
                           const currentTeamId = getId(team);
                           return pTeamId && currentTeamId && String(pTeamId) === String(currentTeamId);
                         }).length} <span className="text-slate-700 text-xs font-bold">/ 15</span>
                       </p>
                    </div>
                    <button 
                      onClick={() => { setSearch(team.name); setActiveView('players'); }} 
                      className="px-5 py-2 rounded-xl bg-white/5 text-[9px] font-black text-indigo-400 hover:bg-indigo-500 hover:text-white uppercase tracking-widest transition-all border border-white/5"
                    >
                      Roster Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* View: Players */}
        {activeView === 'players' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="surface-panel flex items-center p-6 bg-white/[0.02]">
              <FiSearch className="text-slate-500 mr-4 ml-2" />
              <input 
                className="flex-grow bg-transparent text-sm text-white outline-none font-medium" 
                placeholder="Search by identity, ID, or squad affiliation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {playerRoster
                .filter(p => 
                  [p.playerId, p.user?.fullName, p.team?.name].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
                )
                .map((p) => (
                <div key={p.id} className="surface-panel p-6 border-white/5 group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" />
                        {dashboard.teams.some(t => String(getId(t.captainId)) === String(getId(p.user))) && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-widest">Captain</span>
                        )}
                     </div>
                     <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Verified Athlete</p>
                  </div>
                  <p className="text-2xl font-black text-white italic tracking-tight leading-none">{p.user?.fullName}</p>
                  <p className="text-[10px] text-indigo-400 font-mono mt-2 flex items-center gap-2">
                     {p.playerId}
                     <FiCopy className="cursor-pointer hover:text-white transition-colors" onClick={() => copyToClipboard(p.playerId, 'Player ID')} />
                  </p>
                  
                  <div className="mt-8 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest p-2 rounded-lg bg-white/[0.02]">
                       <span className="text-slate-600">Discipline</span>
                       <span className="text-slate-300 italic">{p.playerRole || 'Awaiting Assignment'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest p-2 rounded-lg bg-white/[0.02]">
                       <span className="text-slate-600">Affiliation</span>
                       <span className="text-emerald-400 italic">{p.team?.name || 'Free Agent'}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      if (window.confirm('IRREVERSIBLE: Release athlete from squad contract?')) {
                        try { await api.delete(`/organizer/teams/${getId(p.team)}/players/${getId(p)}`); toast.success('Contract terminated'); loadPlayers(); refresh(); }
                        catch (err) { toast.error('Termination failed'); }
                      }
                    }}
                    className="mt-8 w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-white/5 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                  >
                    Release Asset
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizerTeamsPage;