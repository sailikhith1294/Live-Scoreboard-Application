import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizerSync } from '../context/OrganizerSyncContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiGrid, FiActivity, FiSettings, FiBarChart2, FiPlusCircle, FiZap, FiTarget, FiClock, FiShield, FiTrash2 } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';

const OrganizerDashboardPage = () => {
  const { user } = useAuth();
  const { dashboard, loading, refresh } = useOrganizerSync();
  const [activeTab, setActiveTab] = useState('overview');
  const [leaderboard, setLeaderboard] = useState([]);
  const [reportData, setReportData] = useState(null);
  
  // Filter live feed to only show organiser's own tournaments
  const myTournamentIds = new Set(dashboard.tournaments.map(t => t._id || t.id));
  const filteredFeed = {
    live: (dashboard.liveFeed?.live || []).filter(m => myTournamentIds.has(m.tournamentId?._id || m.tournamentId)),
    scheduled: (dashboard.liveFeed?.scheduled || []).filter(m => myTournamentIds.has(m.tournamentId?._id || m.tournamentId)),
    completed: (dashboard.liveFeed?.completed || []).filter(m => myTournamentIds.has(m.tournamentId?._id || m.tournamentId)),
  };

  // Form states
  const [tournamentForm, setTournamentForm] = useState({ name: '', format: 'T20', location: '', startDate: '', endDate: '' });
  const [teamForm, setTeamForm] = useState({ name: '', shortCode: '' });
  const [venueForm, setVenueForm] = useState({ tournamentId: '', name: '', city: '', address: '' });
  const [matchForm, setMatchForm] = useState({ tournamentId: '', homeTeamId: '', awayTeamId: '', scheduledAt: '', venueId: '' });
  const [wizardForm, setWizardForm] = useState({ tournamentId: '', startAt: '', format: 'round-robin', venueId: '', teamIds: [] });

  const getId = (row) => row?._id || row?.id;

  const handleSubmit = async (e, endpoint, payload, successMsg, resetForm) => {
    e.preventDefault();
    try {
      await api.post(endpoint, payload);
      toast.success(successMsg);
      if (resetForm) resetForm();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up pb-20">
      <div className="flex justify-start">
         <BackButton />
      </div>
      {/* Header & Premium Tabs */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-20 z-0" />
        <div className="relative z-10 p-10">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    <FiActivity className="text-emerald-500 text-xs animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Operations Management Hub</span>
                 </div>
                 <h2 className="text-5xl font-black text-white italic tracking-tighter">Organizer <span className="text-emerald-500">Hub</span></h2>
                 <div className="flex items-center gap-3 mt-3">
                    <p className="text-slate-400 font-medium max-w-xl text-xs">Series orchestration & broadcast monitoring.</p>
                    <span className="text-slate-600 text-[9px] font-black font-mono uppercase tracking-widest opacity-50">UID: {user?._id}</span>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setActiveTab('creation')} className="btn-primary !px-8 !py-5 shadow-emerald-900/40"><FiPlusCircle className="text-xl" /> Initialize Series</button>
              </div>
           </div>
           
           <div className="mt-12 flex gap-10 border-b border-white/5 overflow-x-auto no-scrollbar">
              {[
                 { id: 'overview', label: 'Dashboard', icon: FiGrid },
                 { id: 'management', label: 'Series Management', icon: FiTarget },
                 { id: 'creation', label: 'The Wizard', icon: FiZap },
                 { id: 'leaderboard', label: 'Standings', icon: FiShield },
                 { id: 'reports', label: 'Intelligence', icon: FiBarChart2 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 whitespace-nowrap ${
                    activeTab === tab.id ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="text-lg" />
                  {tab.label}
                </button>
              ))}
           </div>
        </div>
      </section>

      {/* Tab Content */}
      <div className="space-y-10">
         {activeTab === 'overview' && (
            <div className="space-y-10">
               {/* KPI Cards */}
               <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                     { label: 'Active Series', value: dashboard.tournaments.length, icon: FiTarget, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                     { label: 'Squad Registry', value: dashboard.teams.length, icon: FiGrid, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                     { label: 'Scheduled Ops', value: dashboard.matches.length, icon: FiActivity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                     { label: 'Network Uptime', value: '99.9%', icon: FiZap, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  ].map((s, i) => (
                     <div key={i} className="surface-panel p-8 group hover:border-emerald-500/20 transition-all border-l-2 border-transparent hover:border-l-emerald-500">
                        <div className="flex justify-between items-start mb-6">
                           <div className={`p-4 rounded-[20px] ${s.bg} ${s.color}`}><s.icon className="text-xl" /></div>
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Real-time</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{s.label}</p>
                        <p className="text-4xl font-black text-white italic mt-2 tracking-tighter">{s.value}</p>
                     </div>
                  ))}
               </div>

               {/* Broadcast Monitoring Centre */}
               <div className="surface-panel p-10 border-indigo-500/10">
                  <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                     <div>
                        <h3 className="text-2xl font-black text-white italic flex items-center gap-4">
                           <FiActivity className="text-indigo-400 animate-pulse" /> Broadcast Centre
                        </h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Real-time Telemetry & Signal Monitoring</p>
                     </div>
                     <div className="flex gap-3 items-center">
                        <button 
                          onClick={() => {
                            toast.promise(refresh(true), {
                              loading: 'Synchronizing global signals...',
                              success: 'Signals synchronized successfully',
                              error: 'Signal synchronization failed'
                            });
                          }}
                          className="btn-secondary !py-3 !px-6 !text-[10px] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                        >
                          Sync Signals
                        </button>
                        <Link to="/dashboard/organizer/feed" className="btn-secondary !py-3 !px-6 !text-[10px]">Access Signal Hub</Link>
                     </div>
                  </div>

                  <div className="grid gap-10 lg:grid-cols-2">
                     {/* Live Stream Section */}
                     <div className="space-y-6">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                           <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span> Live Transmissions
                        </p>
                        <div className="space-y-4">
                           {filteredFeed.live.length > 0 ? filteredFeed.live.map((m, idx) => (
                              <div key={idx} className="p-6 rounded-[32px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                 <div className="flex items-center gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                       <FiTarget className="text-indigo-400 text-xl" />
                                    </div>
                                    <div>
                                       <p className="text-lg font-black text-white italic tracking-tight">{m.team1?.shortName} <span className="text-slate-600 px-1">vs</span> {m.team2?.shortName}</p>
                                       <div className="flex items-center gap-3 mt-1">
                                          <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">{m.tournamentId?.name || m.source || 'Managed Series'}</p>
                                          <span className="text-[10px] text-slate-500 font-mono">{m.scorecard?.text || 'Connecting...'}</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">ON AIR</span>
                                    <span className="text-[9px] text-slate-500 font-mono">SIGNAL: 100%</span>
                                 </div>
                              </div>
                           )) : (
                              <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">No Active Uplinks</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Scheduled Uplinks Section */}
                     <div className="space-y-6">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                           <FiClock className="animate-spin-slow" /> Scheduled Uplinks
                        </p>
                        <div className="space-y-4">
                           {filteredFeed.scheduled.length > 0 ? filteredFeed.scheduled.map((m, idx) => (
                              <div key={idx} className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 flex items-center justify-between hover:border-amber-500/20 transition-all">
                                 <div className="flex items-center gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10">
                                       <FiClock className="text-amber-500/50" />
                                    </div>
                                    <div>
                                       <p className="text-lg font-black text-white italic tracking-tight opacity-70">{m.team1?.shortName} vs {m.team2?.shortName}</p>
                                       <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">Starting @ {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                 </div>
                                 <Link to="/dashboard/organizer/matches" className="p-3 rounded-xl bg-white/5 text-amber-500/50 hover:bg-amber-500 hover:text-black transition-all">
                                    <FiSettings />
                                 </Link>
                              </div>
                           )) : (
                              <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Silent Spectrum</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'management' && (
            <div className="grid gap-10 lg:grid-cols-2">
               <div className="surface-panel p-10 border-emerald-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-10 flex items-center gap-4">
                     <FiTarget className="text-emerald-500" /> Series Registry
                  </h3>
                  <div className="space-y-6">
                     {dashboard.tournaments.map(t => (
                        <div key={getId(t)} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                           <div>
                              <div className="flex items-center gap-3">
                                 <p className="font-black text-white italic text-lg tracking-tight">{t.name}</p>
                                 <span className="badge badge-emerald">{t.tournamentCode}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">{t.format} Format • {t.location}</p>
                           </div>
                           <div className="flex gap-2">
                               <button 
                                 onClick={async () => {
                                   if (!window.confirm('IRREVERSIBLE: Purge this tournament and all associated matches/data?')) return;
                                   try {
                                     await api.delete(`/organizer/tournaments/${getId(t)}`);
                                     toast.success('Series purged permanently');
                                     refresh();
                                   } catch (err) { toast.error('Purge failed'); }
                                 }}
                                 className="p-4 rounded-2xl bg-white/5 text-slate-600 hover:bg-rose-500 hover:text-white transition-all border border-white/5"
                                 title="Delete Series"
                               >
                                  <FiTrash2 />
                               </button>
                               <Link to={`/dashboard/organizer/matches?tournament=${getId(t)}`} className="p-4 rounded-2xl bg-white/5 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all border border-white/5">
                                  <FiSettings />
                               </Link>
                            </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="surface-panel p-10 border-indigo-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-10 flex items-center gap-4">
                     <FiShield className="text-indigo-400" /> Squad Registry
                  </h3>
                  <div className="space-y-6">
                     {dashboard.teams.map(team => (
                        <div key={getId(team)} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                           <div>
                              <p className="font-black text-white italic text-lg tracking-tight">{team.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Code: {team.shortCode || 'N/A'}</p>
                           </div>
                           <Link to="/dashboard/organizer/teams" className="text-[10px] font-black text-indigo-400 hover:underline uppercase tracking-widest">Roster</Link>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}         {activeTab === 'creation' && (
            <div className="grid gap-10 md:grid-cols-2">
               {/* Fixture Wizard */}
               <div className="surface-panel p-12 md:col-span-2 bg-mesh border-emerald-500/20">
                  <h3 className="text-3xl font-black text-white italic mb-3 tracking-tighter">Fixture Wizard</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.3em] font-black mb-12">Automated Scheduling Engine</p>
                  
                  <form onSubmit={(e) => handleSubmit(e, '/organizer/matches/fixtures/auto', wizardForm, 'Schedule generated successfully')} className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-3">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Series</label>
                        <select required className="input-field !py-5" value={wizardForm.tournamentId} onChange={(e) => setWizardForm(p => ({ ...p, tournamentId: e.target.value }))}>
                          <option value="">-- Choose Series --</option>
                          {dashboard.tournaments.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kickoff Epoch</label>
                        <input required type="datetime-local" className="input-field !py-5" value={wizardForm.startAt} onChange={(e) => setWizardForm(p => ({ ...p, startAt: e.target.value }))} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Format</label>
                        <select required className="input-field !py-5" value={wizardForm.format} onChange={(e) => setWizardForm(p => ({ ...p, format: e.target.value }))}>
                          <option value="round-robin">Round Robin</option>
                          <option value="knockout">Knockout (Elimination)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary Venue</label>
                        <select className="input-field !py-5" value={wizardForm.venueId} onChange={(e) => setWizardForm(p => ({ ...p, venueId: e.target.value }))}>
                          <option value="">-- Select Venue (Optional) --</option>
                          {dashboard.venues?.map(v => <option key={getId(v)} value={getId(v)}>{v.name} ({v.city})</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Participating Teams</label>
                        <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl max-h-40 overflow-y-auto">
                          {dashboard.teams.map(team => (
                            <label key={getId(team)} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${wizardForm.teamIds.includes(getId(team)) ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-transparent'}`}>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={wizardForm.teamIds.includes(getId(team))}
                                onChange={(e) => {
                                  const id = getId(team);
                                  setWizardForm(p => ({
                                    ...p,
                                    teamIds: e.target.checked ? [...p.teamIds, id] : p.teamIds.filter(tid => tid !== id)
                                  }));
                                }}
                              />
                              <span className="text-[10px] font-black text-white">{team.shortCode || team.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button className="w-full btn-primary !py-5 !text-xs shadow-emerald-500/20">GENERATE TOURNAMENT FIXTURES</button>
                  </form>
               </div>

               {/* Manual Match Creation */}
               <div className="surface-panel p-10 border-amber-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-8 tracking-tight">Manual Match Configuration</h3>
                  <form onSubmit={(e) => handleSubmit(e, '/organizer/matches', matchForm, 'Match scheduled successfully', () => setMatchForm({ tournamentId: '', homeTeamId: '', awayTeamId: '', scheduledAt: '', venueId: '' }))} className="space-y-6">
                    <select required className="input-field !py-5" value={matchForm.tournamentId} onChange={(e) => setMatchForm(p => ({ ...p, tournamentId: e.target.value }))}>
                      <option value="">-- Select Series --</option>
                      {dashboard.tournaments.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                      <select required className="input-field !py-5" value={matchForm.homeTeamId} onChange={(e) => setMatchForm(p => ({ ...p, homeTeamId: e.target.value }))}>
                        <option value="">Home Squad</option>
                        {dashboard.teams.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                      </select>
                      <select required className="input-field !py-5" value={matchForm.awayTeamId} onChange={(e) => setMatchForm(p => ({ ...p, awayTeamId: e.target.value }))}>
                        <option value="">Away Squad</option>
                        {dashboard.teams.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="datetime-local" className="input-field !py-5" value={matchForm.scheduledAt} onChange={(e) => setMatchForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                      <select className="input-field !py-5" value={matchForm.venueId} onChange={(e) => setMatchForm(p => ({ ...p, venueId: e.target.value }))}>
                        <option value="">Select Venue</option>
                        {dashboard.venues?.map(v => <option key={getId(v)} value={getId(v)}>{v.name}</option>)}
                      </select>
                    </div>
                    <button className="w-full btn-primary !py-5 !bg-amber-500 !text-black border-amber-600 shadow-amber-900/10">Authorize Fixture</button>
                  </form>
               </div>

               {/* Venue Infrastructure */}
               <div className="surface-panel p-10 border-cyan-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-8 tracking-tight">Venue Infrastructure</h3>
                  <form onSubmit={(e) => handleSubmit(e, '/organizer/venues', venueForm, 'Venue created', () => setVenueForm({ tournamentId: '', name: '', city: '', address: '' }))} className="space-y-6">
                    <select required className="input-field !py-5" value={venueForm.tournamentId} onChange={(e) => setVenueForm(p => ({ ...p, tournamentId: e.target.value }))}>
                      <option value="">-- Assign to Series --</option>
                      {dashboard.tournaments.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                    </select>
                    <input required className="input-field !py-5" placeholder="Venue Name (e.g. Wankhede Stadium)" value={venueForm.name} onChange={(e) => setVenueForm(p => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <input required className="input-field !py-5" placeholder="City" value={venueForm.city} onChange={(e) => setVenueForm(p => ({ ...p, city: e.target.value }))} />
                      <input className="input-field !py-5" placeholder="Address (Optional)" value={venueForm.address} onChange={(e) => setVenueForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <button className="w-full btn-secondary !py-5 !bg-cyan-500/10 !text-cyan-400 border-cyan-500/20 shadow-cyan-900/10">Register Infrastructure</button>
                  </form>
               </div>

               {/* New Tournament Creation */}
               <div className="surface-panel p-10 border-emerald-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-8 tracking-tight">New Tournament</h3>
                  <form onSubmit={(e) => handleSubmit(e, '/organizer/tournaments', tournamentForm, 'Tournament created', () => setTournamentForm({ name: '', format: 'T20', location: '', startDate: '', endDate: '' }))} className="space-y-6">
                    <input required className="input-field !py-5" placeholder="Series Name (e.g. IPL 2026)" value={tournamentForm.name} onChange={(e) => setTournamentForm(p => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <select className="input-field !py-5" value={tournamentForm.format} onChange={(e) => setTournamentForm(p => ({ ...p, format: e.target.value }))}>
                        <option value="T20">T20 International</option>
                        <option value="ODI">One Day International</option>
                      </select>
                      <input required className="input-field !py-5" placeholder="Location/Region" value={tournamentForm.location} onChange={(e) => setTournamentForm(p => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input required type="date" className="input-field !py-5" value={tournamentForm.startDate} onChange={(e) => setTournamentForm(p => ({ ...p, startDate: e.target.value }))} />
                      <input required type="date" className="input-field !py-5" value={tournamentForm.endDate} onChange={(e) => setTournamentForm(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    <button className="w-full btn-primary !py-5">Initialize Registry</button>
                  </form>
               </div>

               {/* Squad Registration */}
               <div className="surface-panel p-10 border-indigo-500/10">
                  <h3 className="text-2xl font-black text-white italic mb-8 tracking-tight">Squad Registration</h3>
                  <form onSubmit={(e) => handleSubmit(e, '/organizer/teams', teamForm, 'Team added', () => setTeamForm({ name: '', shortCode: '' }))} className="space-y-6">
                    <input required className="input-field !py-5" placeholder="Franchise Full Name" value={teamForm.name} onChange={(e) => setTeamForm(p => ({ ...p, name: e.target.value }))} />
                    <input required className="input-field !py-5" placeholder="Short Code (e.g. RCB)" value={teamForm.shortCode} onChange={(e) => setTeamForm(p => ({ ...p, shortCode: e.target.value }))} />
                    <button className="w-full btn-secondary !py-5 shadow-indigo-900/10">Authorize Squad</button>
                  </form>
               </div>
            </div>
         )}
          {activeTab === 'leaderboard' && (
            <div className="space-y-10">
               <div className="surface-panel p-12 bg-mesh border-emerald-500/20">
                  <h3 className="text-3xl font-black text-white italic mb-4 tracking-tighter">Live Tournament Standings</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-10">Real-time Net Run Rate (NNR) and points aggregation.</p>
                  <div className="flex gap-6">
                     <select 
                       className="input-field max-w-md !py-5 !bg-white/5 border-white/10" 
                       value={matchForm.tournamentId} 
                       onChange={(e) => {
                         const tId = e.target.value;
                         setMatchForm(p => ({ ...p, tournamentId: tId }));
                         if (!tId) return;
                         // Fetch leaderboard data
                         api.get(`/common/leaderboard/${tId}`).then(({data}) => {
                           setLeaderboard(data);
                           toast.success('Standings synchronized');
                         }).catch(() => toast.error('Leaderboard sync failed'));
                       }}
                     >
                        <option value="">Select Tournament to Audit</option>
                        {dashboard.tournaments.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                     </select>
                  </div>
               </div>

               {leaderboard.length > 0 ? (
                 <div className="surface-panel overflow-hidden">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-white/5 border-b border-white/10">
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Squad</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">P</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">W</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">L</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center text-emerald-400">Pts</th>
                             <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">NNR</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {leaderboard.map((row, idx) => (
                             <tr key={idx} className="group hover:bg-white/[0.02] transition-all">
                                <td className="p-6 font-black italic text-slate-700">#{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="p-6">
                                   <div className="flex items-center gap-4">
                                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black italic">{row.teamId?.shortCode?.charAt(0) || 'T'}</div>
                                      <div>
                                         <p className="font-black text-white italic">{row.teamId?.name}</p>
                                         <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{row.teamId?.shortCode}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-6 text-center font-bold text-white">{row.played}</td>
                                <td className="p-6 text-center font-bold text-emerald-500">{row.won}</td>
                                <td className="p-6 text-center font-bold text-rose-500">{row.lost}</td>
                                <td className="p-6 text-center font-black text-2xl text-emerald-400 italic tracking-tighter">{row.points}</td>
                                <td className="p-6 text-right">
                                   <span className={`px-4 py-2 rounded-xl text-[10px] font-black ${row.netRunRate >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {row.netRunRate >= 0 ? '+' : ''}{row.netRunRate.toFixed(3)}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="py-32 surface-panel border-dashed border-2 opacity-30 text-center">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">No Standings Data Recorded</p>
                 </div>
               )}
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               <div className="surface-panel p-12 bg-mesh border-emerald-500/20">
                  <h3 className="text-3xl font-black text-white italic mb-4 tracking-tighter">Analytical Intelligence</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-10">Data-driven insights and series performance metrics.</p>
                  <div className="flex gap-6">
                     <select className="input-field max-w-md !py-5 !bg-white/5 border-white/10" onChange={(e) => {
                        const tId = e.target.value;
                        if (!tId) {
                           setReportData(null);
                           return;
                        }
                        api.get(`/organizer/reports/tournaments/${tId}`).then(({data}) => {
                           setReportData(data);
                           toast.success('Analytics loaded: ' + data.tournament.name);
                        }).catch(() => toast.error('Intelligence link failed'));
                     }}>
                        <option value="">Select Target for Insight</option>
                        {dashboard.tournaments.map(t => <option key={getId(t)} value={getId(t)}>{t.name}</option>)}
                     </select>
                  </div>
               </div>

               <div className="grid gap-8 lg:grid-cols-3">
                  {[
                     { label: 'Leading Run Scorer', player: reportData?.insights?.topScorer?.name || 'N/A', stats: reportData?.insights?.topScorer?.stats || 'No statistics recorded', iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
                     { label: 'Leading Wicket Taker', player: reportData?.insights?.topWicketTaker?.name || 'N/A', stats: reportData?.insights?.topWicketTaker?.stats || 'No statistics recorded', iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10' },
                     { label: 'Highest Strike Rate', player: reportData?.insights?.highestStrikeRate?.name || 'N/A', stats: reportData?.insights?.highestStrikeRate?.stats || 'No statistics recorded', iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/10' },
                  ].map((stat, i) => (
                     <div key={i} className="surface-panel p-10 border-white/5 group hover:border-white/10 transition-all">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">{stat.label}</p>
                        <div className="flex items-center gap-6">
                           <div className={`h-16 w-16 rounded-[24px] ${stat.iconBg} flex items-center justify-center ${stat.iconColor} font-black italic text-2xl border border-white/5`}>{i+1}</div>
                           <div>
                              <p className="text-xl font-black text-white italic tracking-tight">{stat.player}</p>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{stat.stats}</p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default OrganizerDashboardPage;
