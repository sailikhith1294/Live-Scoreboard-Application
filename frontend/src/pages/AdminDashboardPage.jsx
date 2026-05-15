import { useState, useEffect } from 'react';
import { useAdminSync } from '../context/AdminSyncContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiZap, FiUsers, FiShield, FiTrendingUp, FiSearch, FiTrash2, FiShieldOff, FiStar, FiCheckCircle, FiXCircle, FiActivity, FiTarget, FiBox } from 'react-icons/fi';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { stats, users, tournaments, matches, loading, refresh } = useAdminSync();
  const [activeTab, setActiveTab] = useState('overview');
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [promotionRequests, setPromotionRequests] = useState([]);

  const getId = (u) => u?._id || u?.id;

  const loadPromotionRequests = async () => {
    try {
      const { data } = await api.get('/admin/promotion-requests');
      setPromotionRequests(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'moderation') loadPromotionRequests();
  }, [activeTab]);

  const handlePromotion = async (requestId, decision) => {
    try {
      await api.patch(`/admin/promotion-requests/${requestId}`, { decision });
      toast.success(`Request ${decision === 'approved' ? 'granted' : 'declined'}`);
      loadPromotionRequests();
      refresh();
    } catch (err) { toast.error('Action failed'); }
  };

  const sendGlobalNotification = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications/broadcast', notificationForm);
      toast.success('Broadcast transmitted globally');
      setNotificationForm({ title: '', message: '' });
    } catch (err) { toast.error('Transmission failed'); }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('Access level updated');
      refresh();
    } catch (err) { toast.error('Role update failed'); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('IRREVERSIBLE: Permanently purge this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User purged from system');
      refresh();
    } catch (err) { toast.error('Purge failed'); }
  };

  const deleteTournament = async (tournamentId) => {
    if (!window.confirm('IRREVERSIBLE: Purge tournament and all associated match data?')) return;
    try {
      await api.delete(`/admin/tournaments/${tournamentId}`);
      toast.success('Tournament purged successfully');
      refresh();
    } catch (err) { toast.error('Tournament purge failed'); }
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm('IRREVERSIBLE: Purge match and all associated score/event data?')) return;
    try {
      await api.delete(`/admin/matches/${matchId}`);
      toast.success('Match purged from system');
      refresh();
    } catch (err) { toast.error('Match purge failed'); }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-indigo-500/5 z-0"></div>
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h2 className="text-4xl font-black text-white italic tracking-tighter">Command <span className="text-rose-500">Center</span></h2>
               <div className="flex items-center gap-3 mt-2">
                  <p className="text-slate-400 font-medium text-xs">Governance and moderation hub.</p>
                  <span className="text-slate-600 text-[9px] font-black font-mono uppercase tracking-widest opacity-50">UID: {user?._id}</span>
               </div>
            </div>
           <div className="flex gap-4">
              <div className="surface-panel !bg-rose-500/10 border-rose-500/20 px-6 py-3">
                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">System Status</p>
                 <p className="text-sm font-bold text-white uppercase italic text-center">Operational</p>
              </div>
           </div>
        </div>

        <div className="relative z-10 px-8 flex gap-8 border-t border-white/5 overflow-x-auto no-scrollbar">
           {[
              { id: 'overview', label: 'Systems', icon: FiZap },
              { id: 'users', label: 'User Ledger', icon: FiUsers },
              { id: 'audit', label: 'Circuit Audit', icon: FiTarget },
              { id: 'moderation', label: 'Governance', icon: FiShield }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
               className={`py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 whitespace-nowrap ${
                 activeTab === tab.id ? 'border-b-2 border-rose-500 text-rose-500' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               <tab.icon />
               {tab.label}
             </button>
           ))}
        </div>
      </section>

      {activeTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in duration-500">
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total Users', value: stats.users, icon: FiUsers, color: 'text-white' },
                { label: 'Tournaments', value: stats.tournaments, icon: FiTrendingUp, color: 'text-emerald-400' },
                { label: 'Live Matches', value: stats.matches, icon: FiActivity, color: 'text-amber-400' },
                { label: 'Ball Events', value: stats.balls, icon: FiZap, color: 'text-cyan-400' },
                { label: 'Organizers', value: stats.organizers, icon: FiShield, color: 'text-indigo-400' },
              ].map((s, i) => (
                <div key={i} className="surface-panel p-6 group hover:border-white/20 transition-all">
                   <div className="p-3 rounded-2xl bg-white/5 w-fit mb-4 group-hover:scale-110 transition-transform"><s.icon className={s.color} /></div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                   <p className="text-3xl font-black text-white italic mt-1">{s.value?.toLocaleString()}</p>
                </div>
              ))}
           </div>

           <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-3 surface-panel p-8 bg-mesh border-rose-500/20">
                 <h3 className="text-xl font-black text-white italic mb-8 flex items-center gap-3">
                    <FiZap className="text-rose-500" /> Global Broadcast Studio
                 </h3>
                 <form onSubmit={sendGlobalNotification} className="space-y-6">
                    <input required className="input-field" placeholder="Broadcast Headline" value={notificationForm.title} onChange={e => setNotificationForm({...notificationForm, title: e.target.value})} />
                    <textarea required className="input-field min-h-[150px]" placeholder="Platform-wide announcement message..." value={notificationForm.message} onChange={e => setNotificationForm({...notificationForm, message: e.target.value})} />
                    <button className="w-full btn-primary !bg-rose-600 hover:!bg-rose-500 !py-4 shadow-rose-900/40">TRANSMIT GLOBAL ALERT</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="surface-panel flex flex-col md:flex-row gap-6 items-center p-8">
              <div className="relative flex-grow w-full">
                 <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input className="input-field pl-12" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="input-field md:w-64" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                 <option value="all">All Access Levels</option>
                 <option value="viewer">Viewer</option>
                 <option value="player">Player</option>
                 <option value="organizer">Organizer</option>
                 <option value="umpire">Umpire</option>
                 <option value="admin">Administrator</option>
              </select>
           </div>

           <div className="surface-panel p-0 overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-white/5 border-b border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="px-8 py-6">Identity</th>
                          <th className="px-8 py-6">Access Level</th>
                          <th className="px-8 py-6">Status</th>
                          <th className="px-8 py-6 text-right">Operations</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {filteredUsers.map((user) => (
                          <tr key={getId(user)} className="group hover:bg-white/[0.02] transition-all">
                             <td className="px-8 py-6">
                                <p className="font-bold text-white text-lg italic">{user.fullName || 'Anonymous'}</p>
                                <div className="flex flex-col mt-1">
                                   <p className="text-xs text-slate-500">{user.email}</p>
                                   <p className="text-[8px] font-black text-slate-700 font-mono uppercase tracking-widest mt-1">UID: {getId(user)}</p>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <select 
                                   className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-300 outline-none"
                                   value={user.role}
                                   onChange={e => updateUserRole(getId(user), e.target.value)}
                                >
                                   <option value="viewer">Viewer</option>
                                   <option value="player">Player</option>
                                   <option value="organizer">Organizer</option>
                                   <option value="umpire">Umpire</option>
                                   <option value="admin">Admin</option>
                                </select>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                   <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verified</span>
                                </div>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <button onClick={() => deleteUser(getId(user))} className="p-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                   <FiTrash2 />
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-12 animate-in fade-in duration-500">
           <div className="surface-panel flex flex-col md:flex-row gap-6 items-center p-8">
              <div className="relative flex-grow w-full">
                 <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input className="input-field pl-12" placeholder="Search organizer, tournament, or team..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
           </div>

           <div className="space-y-20">
              {Object.values((tournaments || []).reduce((acc, t) => {
                 const orgId = t.organizerId?._id || t.organizerId || 'system';
                 const orgName = t.organizerId?.fullName || 'Platform System';
                 if (!acc[orgId]) acc[orgId] = { name: orgName, id: orgId, tournaments: [] };
                 
                 // Get matches for this tournament
                 const tMatches = (matches || []).filter(m => (m.tournamentId?._id || m.tournamentId) === getId(t));
                 acc[orgId].tournaments.push({ ...t, matches: tMatches });
                 return acc;
              }, {})).map((org) => (
                <div key={org.id} className="space-y-10">
                   <div className="flex items-center gap-6 px-4">
                      <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 font-black text-2xl italic">
                         {org.name.charAt(0)}
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Organizer / Official</p>
                         <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">{org.name}</h3>
                      </div>
                      <div className="h-[2px] flex-1 bg-white/5 ml-4"></div>
                   </div>

                   <div className="grid gap-10">
                      {org.tournaments.map((t) => (
                        <div key={getId(t)} className="surface-panel p-10 border-white/5 bg-white/[0.01] hover:border-emerald-500/20 transition-all">
                           <div className="flex justify-between items-start mb-10 border-b border-white/5 pb-6">
                              <div>
                                 <div className="flex items-center gap-4">
                                    <h4 className="text-2xl font-black text-white italic tracking-tight">{t.name}</h4>
                                    <span className="badge badge-emerald uppercase text-[9px]">{t.status}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{t.format} • {t.location} • {t.matches.length} matches</p>
                              </div>
                              <button onClick={() => deleteTournament(getId(t))} className="btn-secondary !bg-rose-500/10 !text-rose-500 hover:!bg-rose-500 hover:!text-white border-rose-500/20 !px-6 !py-3 !text-[10px] font-black flex items-center gap-2">
                                 <FiTrash2 /> PURGE CIRCUIT
                              </button>
                           </div>

                           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                              {t.matches.map((m) => (
                                <div key={getId(m)} className="surface-panel !p-6 !bg-black/20 border-white/5 group hover:border-amber-500/30 transition-all">
                                   <div className="flex justify-between items-start mb-4">
                                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${m.status === 'live' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-500'}`}>{m.status}</span>
                                      <button onClick={() => deleteMatch(getId(m))} className="text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                         <FiTrash2 className="text-sm" />
                                      </button>
                                   </div>
                                   <div className="text-center space-y-3">
                                      <p className="text-lg font-black text-white italic truncate">{m.homeTeamId?.shortCode} <span className="text-[10px] text-slate-700 mx-1">VS</span> {m.awayTeamId?.shortCode}</p>
                                      <p className="text-[8px] text-slate-500 font-bold uppercase">{m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : 'TBD'}</p>
                                   </div>
                                </div>
                              ))}
                              {t.matches.length === 0 && (
                                 <div className="lg:col-span-4 py-10 text-center border border-dashed border-white/10 rounded-3xl opacity-30">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No match fixtures scheduled</p>
                                 </div>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
              {(tournaments || []).length === 0 && (
                 <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-30">
                    <FiTarget className="text-6xl text-slate-800 mx-auto mb-6" />
                    <p className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] italic">No organizational circuits detected</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in duration-500">
           <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-black text-white italic flex items-center gap-3">
                 <FiShield className="text-indigo-400" /> Governance Ledger
              </h3>
              <div className="space-y-4">
                 {promotionRequests.map(req => (
                    <div key={req._id} className="surface-panel p-8 border-white/5 group hover:border-indigo-500/30 transition-all">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black">
                                {req.userId?.fullName?.charAt(0) || '?'}
                             </div>
                             <div>
                                <p className="font-bold text-white italic">{req.userId?.fullName}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{req.userId?.email}</p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="badge badge-indigo">UPGRADE TO {req.requestedRole}</span>
                             {req.advisedBy && (
                               <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                                  Advised by {req.advisedBy.fullName}
                               </span>
                             )}
                          </div>
                       </div>
                       
                       <div className="bg-black/20 p-6 rounded-2xl mb-8 border border-white/5">
                          <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">Statement of Purpose</p>
                          <p className="text-sm text-slate-400 leading-relaxed italic">"{req.message || 'No statement provided'}"</p>
                       </div>

                       <div className="flex gap-3">
                          <button onClick={() => handlePromotion(req._id, 'approved')} className="flex-1 btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-4 shadow-emerald-900/20">Grant Access</button>
                          <button onClick={() => handlePromotion(req._id, 'rejected')} className="px-8 py-4 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">Reject</button>
                       </div>
                    </div>
                 ))}
                 {promotionRequests.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-50">
                       <FiShieldOff className="text-4xl text-slate-800 mx-auto mb-4" />
                       <p className="text-slate-600 font-black uppercase tracking-widest text-xs italic">Governance Ledger Clear</p>
                    </div>
                 )}
              </div>
           </div>
           
           <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Maintenance Tools</h3>
              <div className="surface-panel p-8 space-y-4">
                 <button className="w-full p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                    Purge Flagged Activity
                 </button>
                 <button className="w-full p-5 rounded-2xl bg-white/5 border border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-white/20 transition-all">
                    Reset Sync Nodes
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
