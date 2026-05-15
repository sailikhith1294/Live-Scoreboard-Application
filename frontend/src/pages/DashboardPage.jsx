import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserSync } from '../context/UserSyncContext';
import { motion } from 'framer-motion';
import { FiActivity, FiCalendar, FiLogOut, FiArrowRight, FiZap, FiStar, FiGlobe, FiTarget, FiUsers, FiClock, FiBox } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';
import { useState } from 'react';
import toast from 'react-hot-toast';

const getId = (row) => row?._id || row?.id;

const DashboardPage = () => {
  const { user, logout, primaryRole } = useAuth();
  const { organized, global: globalData, tournaments, notifications, loading } = useUserSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [dataSource, setDataSource] = useState('api'); // 'api' or 'organized'

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    navigate(`/join/team/${inviteCode.trim()}`);
  };

  const rawView = searchParams.get('view');
  const activeTab = ['live', 'fixtures', 'completed'].includes(rawView) ? rawView : 'live';

  const currentSourceData = (dataSource === 'api' ? globalData : organized) || { live: [], upcoming: [], completed: [] };

  // Grouping logic for organized matches
  const groupedMatches = dataSource === 'organized' && Array.isArray(tournaments) ? tournaments.map(t => {
    const tIdStr = String(getId(t));
    return {
      ...t,
      matches: (activeTab === 'live' ? organized.live : activeTab === 'fixtures' ? organized.upcoming : organized.completed).filter(m => {
        const rawTId = m.tournamentId?._id || m.tournamentId?.id || m.tournamentId;
        return rawTId && String(rawTId) === tIdStr;
      })
    };
  }).filter(t => t.matches.length > 0) : [];

  const displayMatches = (activeTab === 'live' ? currentSourceData.live : activeTab === 'fixtures' ? currentSourceData.upcoming : currentSourceData.completed) || [];
  
  const independentMatches = dataSource === 'organized' 
    ? displayMatches.filter(m => {
        const rawTId = m.tournamentId?._id || m.tournamentId?.id || m.tournamentId;
        const tIdStr = rawTId ? String(rawTId) : null;
        return !tIdStr || !tournaments.some(t => String(getId(t)) === tIdStr);
      }) 
    : displayMatches;

  const renderMatchCard = (m) => (
     <Link key={getId(m)} to={`/scorecard/${getId(m)}`} className={`surface-panel p-8 group transition-all relative overflow-hidden flex flex-col ${dataSource === 'api' ? 'border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/[0.02]' : 'border-indigo-500/20 hover:border-indigo-500 bg-indigo-500/[0.02]'}`}>
        <div className="flex justify-between items-center mb-6">
           <span className={`badge ${m?.status === 'live' ? 'badge-live' : dataSource === 'api' ? 'badge-emerald' : 'badge-indigo'}`}>{String(m?.status || 'TBD').toUpperCase()}</span>
           {m?.status === 'live' && <span className="animate-pulse h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />}
        </div>
       <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
             <p className="text-2xl font-black text-white italic tracking-tight">{m.team1?.shortName || m.team1?.shortCode || m.homeTeamId?.shortCode || 'TM1'}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">{m.team1?.name || m.homeTeamId?.name}</p>
          </div>
          <div className="px-4 text-slate-700 font-black italic text-sm">VS</div>
          <div className="text-center flex-1">
             <p className="text-2xl font-black text-white italic tracking-tight">{m.team2?.shortName || m.team2?.shortCode || m.awayTeamId?.shortCode || 'TM2'}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">{m.team2?.name || m.awayTeamId?.name}</p>
          </div>
       </div>
       
       {(m.status === 'live' || m.status === 'completed') && (
         <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className={`text-xs font-black italic text-center leading-relaxed ${dataSource === 'api' ? 'text-emerald-400' : 'text-indigo-400'}`}>
               {m.scorecard?.text || m.result || (m.currentRuns !== undefined ? `${m.currentRuns}/${m.currentWickets} (${m.currentOver}.${m.currentBall})` : 'Match in progress')}
            </p>
         </div>
       )}

       <div className="mt-auto flex justify-between items-center pt-6 border-t border-white/5">
          <div className="flex flex-col">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.format || 'T20'} • {m.venue}</p>
             <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}</p>
          </div>
          <FiArrowRight className={`${dataSource === 'api' ? 'text-emerald-500' : 'text-indigo-500'} group-hover:translate-x-1 transition-transform`} />
       </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-slide-up">
      <div className="flex justify-start">
         <BackButton to="/" />
      </div>

      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
        <div className="flex items-center gap-5">
           <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center text-[#020617] font-black text-3xl italic shadow-2xl shadow-emerald-500/20">
              {user?.fullName?.charAt(0) || 'U'}
           </div>
            <div>
               <h2 className="text-4xl font-black text-white italic tracking-tighter">Welcome, {user?.fullName?.split(' ')?.[0] || 'User'}</h2>
               <div className="flex flex-col mt-1">
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Verified Member</span>
                  </div>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-900/10 mt-2 inline-block">USER ID: {user?._id || user?.id || 'N/A'}</p>
               </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
           <Link to="/" className="btn-secondary !px-6 !py-3 text-[10px] font-black uppercase tracking-widest">Public Portal</Link>
           <button onClick={logout} className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
              <FiLogOut />
           </button>
        </div>
      </header>

      {/* DataSource Info & Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
            <button 
              onClick={() => setDataSource('api')} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'api' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <FiGlobe /> Global Feed
            </button>
            <button 
              onClick={() => setDataSource('organized')} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'organized' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <FiActivity /> Local Circuit
            </button>
         </div>
         
         <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
            <button onClick={() => setSearchParams({ view: 'live' })} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Live</button>
            <button onClick={() => setSearchParams({ view: 'fixtures' })} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'fixtures' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Upcoming</button>
            <button onClick={() => setSearchParams({ view: 'completed' })} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Results</button>
         </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Left Column: Content */}
        <div className="lg:col-span-8 space-y-12">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                  {dataSource === 'api' ? <><FiGlobe className="text-emerald-500" /> Professional <span className="text-emerald-500">Arena</span></> : <><FiActivity className="text-indigo-500" /> Organized <span className="text-indigo-500">Series</span></>}
               </h3>
            </div>

            <div className="space-y-16">
               {/* Grouped Tournament Matches */}
               {dataSource === 'organized' && groupedMatches.map(tournament => (
                 <div key={getId(tournament)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-6 p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                       <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl text-indigo-400">
                          <FiBox />
                       </div>
                       <div>
                          <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{tournament.name}</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{tournament.location} • {tournament.format} • {tournament.matches.length} Matches</p>
                       </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                       {tournament.matches.map(m => renderMatchCard(m))}
                    </div>
                 </div>
               ))}

               {/* Independent or Global Matches */}
               {(dataSource === 'api' || independentMatches.length > 0) && (
                 <div className="space-y-8">
                    {dataSource === 'organized' && independentMatches.length > 0 && (
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Exhibition Matches</h4>
                    )}
                    <div className="grid gap-6 sm:grid-cols-2">
                       {independentMatches.map(m => renderMatchCard(m))}
                    </div>
                 </div>
               )}

               {displayMatches.length === 0 && (
                 <div className="py-32 text-center surface-panel border-dashed opacity-40">
                    <FiClock className="text-5xl text-slate-800 mx-auto mb-6" />
                    <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-xs italic">No match operations identified</p>
                 </div>
               )}
            </div>
        </div>

        {/* Right Column: Feed */}
        <div className="lg:col-span-4 space-y-8">


           {/* Recruitment Box - Only for Viewer/User role */}
           {primaryRole === 'user' && (
              <section className="surface-panel p-8 space-y-6 prism-border bg-emerald-500/[0.02] border-emerald-500/20">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                       <FiUsers />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Recruitment</h3>
                 </div>
                 <p className="text-[11px] text-slate-400 leading-relaxed">Invited by a Captain or Organizer? Enter the code to join their official squad.</p>
                 <form onSubmit={handleJoinByCode} className="space-y-3">
                    <input 
                       type="text" 
                       placeholder="CODE-XYZ"
                       value={inviteCode}
                       onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[10px] font-black tracking-widest focus:border-emerald-500/50 outline-none transition-all"
                    />
                    <button 
                       type="submit"
                       className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10"
                    >
                       Join Team
                    </button>
                 </form>
              </section>
           )}

           <section className="surface-panel p-8 space-y-6 prism-border bg-white/[0.01]">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Live Bulletins</h3>
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                 {notifications.map((n, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                       <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500/50 group-hover:bg-emerald-500 transition-all" />
                       <p className="text-xs font-black text-white mb-2 uppercase tracking-tight">{n.title}</p>
                       <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                       <div className="mt-6 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-all">
                          <span className="text-[9px] font-black text-slate-600 font-mono uppercase">{new Date(n.createdAt).toLocaleTimeString()}</span>
                          <FiZap className="text-[10px] text-emerald-500" />
                       </div>
                    </div>
                 ))}
                 {notifications.length === 0 && (
                    <p className="text-center py-20 text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">No announcements</p>
                 )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
