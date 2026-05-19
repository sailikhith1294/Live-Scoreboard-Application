import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiActivity, FiZap, FiTarget, FiArrowLeft, FiClock, FiCheckCircle, 
  FiUser, FiUsers, FiTrendingUp, FiAlertCircle, FiRotateCcw, FiCloud
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const ScoringPage = () => {
  const { primaryRole } = useAuth();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState({ home: [], away: [] });
  
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');

  const outPlayerIds = new Set(
    events.filter(e => e.isWicket).map(e => String(e.strikerId?._id || e.strikerId))
  );

  const getBowlerBalls = (bId) => {
    return events.filter(e => String(e.bowlerId?._id || e.bowlerId) === String(bId) && !['wide', 'no-ball'].includes(e.extraType)).length;
  };

  const overLimit = match?.format === 'T20' ? 4 : match?.format === 'ODI' ? 10 : 20;

  const renderPlayerOption = (p) => {
    const isOut = outPlayerIds.has(String(p.id));
    if (isOut) return null;
    
    // Check if player is already striker/non-striker to prevent duplicates
    const isActive = (String(p.id) === String(strikerId) || String(p.id) === String(nonStrikerId));
    
    return (
      <option key={p.id} value={p.id} disabled={isActive}>
        {p.userId?.name} ({p.role?.toUpperCase() || 'PLY'})
      </option>
    );
  };

  const renderBowlerOption = (p) => {
    const balls = getBowlerBalls(p.id);
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    const isFinished = overs >= overLimit;

    return (
      <option key={p.id} value={p.id} disabled={isFinished}>
        {p.userId?.name} ({p.role?.toUpperCase() || 'BOWL'}) - {overs}.{remainingBalls} Ov {isFinished ? '(QUOTA FULL)' : ''}
      </option>
    );
  };

  const [showWicketOptions, setShowWicketOptions] = useState(false);
  const [activeExtra, setActiveExtra] = useState('none'); // none, wide, no-ball, leg-bye, bye
  const [freeHit, setFreeHit] = useState(false);
  
  const [battingTeamId, setBattingTeamId] = useState(null);
  const [bowlingTeamId, setBowlingTeamId] = useState(null);

  const getInningsTeams = (m, scorecardObj) => {
    if (!m || !m.tossWinnerTeamId) return { batting: null, bowling: null };
    const curInnings = scorecardObj?.innings || 1;
    const tossWinnerId = m.tossWinnerTeamId?._id || m.tossWinnerTeamId;
    const homeId = m.homeTeamId?._id || m.homeTeamId;
    const awayId = m.awayTeamId?._id || m.awayTeamId;

    let firstBatting, firstBowling;
    if (String(tossWinnerId) === String(homeId)) {
       firstBatting = m.tossDecision === 'bat' ? homeId : awayId;
       firstBowling = m.tossDecision === 'bat' ? awayId : homeId;
    } else {
       firstBatting = m.tossDecision === 'bat' ? awayId : homeId;
       firstBowling = m.tossDecision === 'bat' ? homeId : awayId;
    }

    return curInnings === 1 
      ? { batting: firstBatting, bowling: firstBowling }
      : { batting: firstBowling, bowling: firstBatting };
  };

  const load = async () => {
    try {
      const { data } = await api.get(`/matches/${matchId}/scorecard`);
      setMatch(data.match);
      setScorecard(data.scorecard);
      setEvents(data.events || []);

      const teams = getInningsTeams(data.match, data.scorecard);
      setBattingTeamId(teams.batting);
      setBowlingTeamId(teams.bowling);

      const [homeRoster, awayRoster] = await Promise.all([
        api.get(`/common/teams/${data.match.homeTeamId._id || data.match.homeTeamId}/players`),
        api.get(`/common/teams/${data.match.awayTeamId._id || data.match.awayTeamId}/players`)
      ]);
      setRosters({ home: homeRoster.data, away: awayRoster.data });
      
    } catch (err) {
      // toast.error('Session expired or access denied');
      navigate(primaryRole === 'organizer' ? '/dashboard/organizer/matches' : '/dashboard/umpire');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    socket.emit('match:join', matchId);
    const onScoreUpdate = ({ scorecard: updated, ball }) => {
      setScorecard(updated);
      setEvents((prev) => [ball, ...prev]);
    };
    socket.on('score:update', onScoreUpdate);
    return () => {
      socket.emit('match:leave', matchId);
      socket.off('score:update', onScoreUpdate);
    };
  }, [matchId]);

  const registerBall = async (runs, extras = 0, isWicket = false, extraType = 'none', wicketType = null) => {
    if (!strikerId || !bowlerId) {
      toast.error('Select Striker and Bowler first', { icon: '⚠️' });
      return;
    }

    try {
      const lastOver = scorecard?.overs || 0;
      const over = Math.floor(lastOver);
      const ball = Math.round((lastOver - over) * 10);
      
      const isExtra = ['wide', 'no-ball'].includes(extraType);
      
      let nextOver = over;
      let nextBall = isExtra ? ball : ball + 1;
      if (nextBall > 6) { nextOver += 1; nextBall = 1; }

      const payload = {
        innings: 1,
        overNumber: nextOver,
        ballNumber: nextBall,
        batsmanRuns: runs,
        extras: extras,
        isWicket: isWicket,
        strikerId: strikerId,
        nonStrikerId: nonStrikerId, // Added for live tracking
        bowlerId: bowlerId,
        extraType: extraType,
        wicketType: wicketType,
        isFreeHit: freeHit,
        commentary: isWicket 
          ? `WICKET! (${wicketType || 'Dismissal'})` 
          : `${freeHit ? 'FREE HIT! ' : ''}${runs} run(s)${extras > 0 ? ` (+${extras} extra)` : ''}`,
      };

      await api.post(`/matches/${matchId}/balls`, payload);
      toast.success(isWicket ? 'WICKET REGISTERED' : `${nextOver}.${nextBall}: ${runs} Run(s)`);
      setShowWicketOptions(false);
      
      // Update Free Hit status
      if (extraType === 'no-ball') {
        setFreeHit(true);
      } else if (!isExtra) {
        setFreeHit(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    }
  };

  const handleRunClick = (val) => {
    if (activeExtra === 'wide') {
      // Wide + Runs: All are extras
      registerBall(0, 1 + val, false, 'wide');
    } else if (activeExtra === 'no-ball') {
      // No Ball + Runs: 1 extra + val batsman runs
      registerBall(val, 1, false, 'no-ball');
    } else if (activeExtra === 'leg-bye' || activeExtra === 'bye') {
      // Bye/Leg Bye + Runs: All are extras
      registerBall(0, val, false, activeExtra);
    } else {
      // Standard run
      registerBall(val, 0, false, 'none');
    }
    setActiveExtra('none');

    // Auto swap strike on odd runs
    if ([1, 3, 5].includes(val)) {
       const s = strikerId;
       setStrikerId(nonStrikerId);
       setNonStrikerId(s);
    }

    // Auto swap strike on end of over
    const lastOver = scorecard?.overs || 0;
    const over = Math.floor(lastOver);
    const ball = Math.round((lastOver - over) * 10);
    if (ball === 5) { // This was the 6th ball (since scorecard shows before this ball)
       // Wait, scorecard is updated AFTER ball.
       // Let's just provide a manual swap button that's very easy to hit.
    }
  };

  const swapStrike = () => {
    const s = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(s);
    toast('Strike Swapped', { icon: '🔄' });
  };

  const submitToss = async (tossWinnerTeamId, tossDecision) => {
    try {
      await api.patch(`/umpire/matches/${matchId}/toss`, { tossWinnerTeamId, tossDecision });
      load();
    } catch (err) { /* silent fail */ }
  };

  const updateStatus = async (status, note, winnerId = null) => {
    try {
      const payload = { status, note };
      if (winnerId) payload.winnerId = winnerId;
      await api.patch(`/matches/${matchId}/status`, payload);
      toast.success(`MATCH ${status.toUpperCase()}`);
      setMatch(prev => ({ ...prev, status, winnerId }));
      if (status === 'completed') {
        setShowFinalizeModal(false);
      }
    } catch (err) {
      toast.error('Failed to update match status');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  if (!match) return <div>Access Denied</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
        {/* Main Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 surface-panel !bg-white/[0.02] border-white/5 p-8">
           <div className="flex items-center gap-6">
              <Link to={primaryRole === 'organizer' ? '/dashboard/organizer/matches' : '/dashboard/umpire'} className="p-4 rounded-2xl bg-white/5 hover:bg-emerald-500 hover:text-black transition-all border border-white/5">
                 <FiArrowLeft className="text-xl" />
              </Link>
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    <FiActivity className="text-emerald-400 text-[10px] animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Official Scoring Dashboard</span>
                 </div>
                 <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                    {match.homeTeamId?.shortCode} <span className="text-emerald-500 font-normal lowercase not-italic mx-2">vs</span> {match.awayTeamId?.shortCode}
                 </h1>
                 <div className="flex flex-wrap items-center gap-4 mt-2">
                    <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase flex items-center gap-2">
                       <FiTarget className="text-emerald-500/50" /> {match.venue || 'Match Venue'} • {match.format || 'T20'}
                    </p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center sm:text-right">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Innings Progress</p>
                 <div className="flex items-center justify-center sm:justify-end gap-3">
                    <span className="text-xs font-black text-emerald-400 font-mono">{scorecard?.overs || '0.0'} / {match.oversLimit || 20}</span>
                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-emerald-500 transition-all duration-1000" 
                         style={{ width: `${((scorecard?.overs || 0) / (match.oversLimit || 20)) * 100}%` }} 
                       />
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-1 bg-white/5 p-2 rounded-3xl border border-white/10">
                 <div className="px-8 py-4 rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Runs</p>
                    <p className="text-4xl font-black italic leading-none">{scorecard?.runs || 0}</p>
                 </div>
                 <div className="px-6 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wkts</p>
                    <p className="text-4xl font-black italic leading-none text-rose-500">{scorecard?.wickets || 0}</p>
                 </div>
              </div>
           </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-12">
           {/* Left Column: Lineup & Controls */}
           <div className="lg:col-span-8 space-y-8">
              {/* Official Assignment Card */}
              {match.status === 'completed' ? (
                 <div className="surface-panel p-10 text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[300px] bg-emerald-500/[0.02] border-emerald-500/20 mb-8">
                    <FiCheckCircle className="text-7xl mb-6 text-emerald-500" />
                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">Match Finalized</h3>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-2">Scoring operations have concluded</p>
                 </div>
              ) : match.status === 'delayed' ? (
                 <div className="surface-panel p-10 text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[300px] bg-amber-500/[0.02] border-amber-500/20 mb-8">
                    <FiClock className="text-7xl mb-6 text-amber-500 animate-pulse" />
                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">Match Delayed</h3>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mt-2 mb-8">Match operations are temporarily paused</p>
                    <button 
                      onClick={() => updateStatus('live', 'Match resumed')}
                      className="px-8 py-4 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3"
                    >
                       <FiZap className="text-lg" /> Resume Match
                    </button>
                 </div>
              ) : (
                 <>
                   <section className="surface-panel p-8 bg-mesh border-emerald-500/10">
                 <div className="grid sm:grid-cols-3 gap-6 items-end">
                    <div className="space-y-4">
                       <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          <FiUser /> Striker
                       </div>
                       <select 
                         className="input-field !bg-white/5 !border-white/10 !text-xs font-bold"
                         value={strikerId}
                         onChange={e => setStrikerId(e.target.value)}
                       >
                          <option value="">Facing</option>
                          {String(battingTeamId) === String(match.homeTeamId?._id || match.homeTeamId) ? (
                              rosters.home.map(p => renderPlayerOption(p))
                           ) : (
                              rosters.away.map(p => renderPlayerOption(p))
                           )}
                       </select>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                       <button 
                         onClick={swapStrike}
                         className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500 hover:text-black transition-all text-slate-500 hover:border-emerald-500 shadow-lg"
                         title="Swap Strike"
                       >
                          <FiRotateCcw className="text-lg" />
                       </button>
                       <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Swap</span>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <FiUser /> Non-Striker
                       </div>
                       <select 
                         className="input-field !bg-white/5 !border-white/10 !text-xs font-bold opacity-60 focus:opacity-100 transition-opacity"
                         value={nonStrikerId}
                         onChange={e => setNonStrikerId(e.target.value)}
                       >
                          <option value="">Other End</option>
                          {String(battingTeamId) === String(match.homeTeamId?._id || match.homeTeamId) ? (
                              rosters.home.map(p => renderPlayerOption(p))
                           ) : (
                              rosters.away.map(p => renderPlayerOption(p))
                           )}
                       </select>
                    </div>
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                       <FiRotateCcw /> Active Bowler
                    </div>
                    <select 
                      className="input-field !bg-white/5 !border-white/10 !text-sm font-bold"
                      value={bowlerId}
                      onChange={e => setBowlerId(e.target.value)}
                    >
                       <option value="">Select Bowler</option>
                       {String(bowlingTeamId) === String(match.homeTeamId?._id || match.homeTeamId) ? (
                           rosters.home.map(p => renderBowlerOption(p))
                        ) : (
                           rosters.away.map(p => renderBowlerOption(p))
                        )}
                    </select>
                 </div>
              </section>

              {/* Score Management */}
              <section className="surface-panel p-10 space-y-10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5"><FiZap className="text-8xl" /></div>
                 
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                       {activeExtra !== 'none' ? `Runs after ${activeExtra.toUpperCase()}` : 'Standard Runs'}
                       {freeHit && (
                          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-indigo-500 text-white text-[8px] font-black animate-pulse tracking-widest uppercase">
                             Free Hit
                          </div>
                       )}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                       {[0, 1, 2, 3, 4, 6].map(val => (
                          <button 
                            key={val}
                            onClick={() => handleRunClick(val)}
                            className={`aspect-square flex flex-col items-center justify-center rounded-3xl border active:scale-90 transition-all group ${
                               activeExtra !== 'none' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                            }`}
                          >
                             <span className={`text-3xl font-black italic ${activeExtra !== 'none' ? 'text-amber-400' : 'group-hover:text-emerald-400'}`}>{val}</span>
                             <span className={`text-[8px] font-black uppercase mt-1 ${activeExtra !== 'none' ? 'text-amber-500/50' : 'text-slate-600 group-hover:text-emerald-500/50'}`}>Runs</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Extras (Toggles Mode)</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {['wide', 'no-ball', 'leg-bye', 'bye'].map(type => (
                             <button 
                               key={type}
                               onClick={() => setActiveExtra(activeExtra === type ? 'none' : type)}
                               className={`py-6 rounded-3xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                                  activeExtra === type 
                                     ? 'bg-amber-500 text-black border-amber-600 shadow-lg shadow-amber-500/20' 
                                     : 'bg-white/5 border-white/5 text-slate-400 hover:border-amber-500/50'
                               }`}
                             >
                                {type.replace('-', ' ')}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Critical Events</h3>
                       {!showWicketOptions ? (
                          <button 
                            onClick={() => setShowWicketOptions(true)}
                            className="w-full py-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white shadow-lg shadow-rose-900/10 active:scale-95 transition-all text-sm font-black italic tracking-[0.2em] uppercase flex items-center justify-center gap-3"
                          >
                             <FiAlertCircle /> WICKET dismissal
                          </button>
                       ) : (
                          <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-rose-500 uppercase">Select Wicket Type</span>
                                <button onClick={() => setShowWicketOptions(false)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase">Cancel</button>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Others'].map(type => (
                                   <button 
                                     key={type}
                                     onClick={() => registerBall(0, 0, true, 'none', type)}
                                     className="py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-500 hover:bg-rose-500 hover:text-white transition-all uppercase"
                                   >
                                      {type}
                                   </button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </section>

                 {/* Match Breaks & Player Status */}
                 <section className="surface-panel p-8 bg-indigo-500/5 border-indigo-500/10 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Match Breaks & Player Status</h3>
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${match.status === 'delayed' ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                          Status: {match.status}
                       </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                       <button 
                         onClick={() => updateStatus('delayed', 'Match delayed due to bad weather')}
                         className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                       >
                          <FiCloud className="text-amber-500 text-lg" />
                          Bad Weather
                       </button>
                       <button 
                         onClick={() => updateStatus('delayed', 'Match delayed')}
                         className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                       >
                          <FiClock className="text-amber-400 text-lg" />
                          Match Delay
                       </button>
                       <button 
                         onClick={() => updateStatus('live', 'Match resumed')}
                         className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                       >
                          <FiZap className="text-emerald-500 text-lg" />
                          Resumed
                       </button>
                       <button 
                         onClick={() => {
                            if(!strikerId) return;
                            registerBall(0, 0, false, 'none', 'Retired Hurt');
                         }}
                         className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                       >
                          <FiActivity className="text-rose-500 text-lg" />
                          Retired Hurt
                       </button>
                       <button 
                         onClick={() => {
                            setSelectedWinnerId(match.homeTeamId?._id || match.homeTeamId || '');
                            setShowFinalizeModal(true);
                         }}
                         className="p-4 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 group sm:col-span-1"
                       >
                          <FiCheckCircle className="text-emerald-500 text-lg group-hover:text-white" />
                          Finalize
                       </button>
                    </div>
                 </section>

                 </>
              )}

                 {/* Squad Reference */}
              <section className="grid sm:grid-cols-2 gap-8">
                 <div className={`surface-panel !bg-transparent border-dashed border-2 p-8 ${String(battingTeamId) === String(match.homeTeamId?._id || match.homeTeamId) ? 'border-emerald-500/30' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-xs font-black text-white uppercase tracking-widest">{match.homeTeamId?.name} {String(battingTeamId) === String(match.homeTeamId?._id || match.homeTeamId) ? '(Batting)' : '(Bowling)'}</h4>
                       <span className="badge badge-emerald">{rosters.home.length} Players</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                       {rosters.home.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-[10px] font-bold">
                             <span className="text-white uppercase italic">{p.userId?.name}</span>
                             <span className="text-slate-600 uppercase text-[8px]">{p.role}</span>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className={`surface-panel !bg-transparent border-dashed border-2 p-8 ${String(battingTeamId) === String(match.awayTeamId?._id || match.awayTeamId) ? 'border-indigo-500/30' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-xs font-black text-white uppercase tracking-widest">{match.awayTeamId?.name} {String(battingTeamId) === String(match.awayTeamId?._id || match.awayTeamId) ? '(Batting)' : '(Bowling)'}</h4>
                       <span className="badge badge-indigo">{rosters.away.length} Players</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                       {rosters.away.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-[10px] font-bold">
                             <span className="text-white uppercase italic">{p.userId?.name}</span>
                             <span className="text-slate-600 uppercase text-[8px]">{p.role}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </section>
           </div>

           {/* Right Column: Ball-by-Ball Feed */}
           <div className="lg:col-span-4 space-y-8">
              {/* Event Feed */}
              <section className="surface-panel p-8 sticky top-10 flex flex-col max-h-[calc(100vh-80px)]">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                       <FiZap className="text-emerald-500 animate-pulse" /> Ball-by-Ball Feed
                    </h3>
                    <div className="flex gap-1">
                       <div className="h-1 w-1 rounded-full bg-emerald-500" />
                       <div className="h-1 w-1 rounded-full bg-emerald-500 opacity-50" />
                       <div className="h-1 w-1 rounded-full bg-emerald-500 opacity-20" />
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                    {events.length === 0 ? (
                       <div className="py-20 text-center opacity-20">
                          <FiActivity className="text-4xl mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Ball...</p>
                       </div>
                    ) : (
                       events.map((e, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={idx} 
                            className={`p-5 rounded-2xl border transition-all flex justify-between items-center group ${
                              e.isWicket ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/5 hover:border-emerald-500/20'
                            }`}
                          >
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="text-[10px] font-black text-emerald-400 font-mono tracking-tighter">OV {e.overNumber}.{e.ballNumber}</span>
                                   {e.isWicket && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">{e.wicketType || 'WICKET'}</span>}
                                   {e.extraType !== 'none' && <span className="text-[8px] font-black text-amber-500 uppercase">{e.extraType}</span>}
                                </div>
                                <p className="text-xs font-bold text-white italic">{e.commentary}</p>
                             </div>
                             <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black">
                                {e.batsmanRuns + e.extras}
                             </div>
                          </motion.div>
                       ))
                    )}
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/5">
                    <button 
                      onClick={() => window.confirm('DANGER: This will purge the last recorded event. Proceed?') && toast.error('Undo functionality pending backend support')}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                       <FiRotateCcw className="text-xs" /> Correct Last Ball
                    </button>
                 </div>
              </section>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowFinalizeModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg surface-panel p-8 bg-mesh border-emerald-500/30 shadow-2xl shadow-emerald-900/20"
            >
              <div className="text-center mb-8">
                <FiCheckCircle className="text-5xl text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Finalize Match</h2>
                <p className="text-xs text-slate-400 mt-2">End the live scoring session and officially declare the winner.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Select Match Winner</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedWinnerId(match.homeTeamId?._id || match.homeTeamId)}
                      className={`py-4 px-4 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${selectedWinnerId === (match.homeTeamId?._id || match.homeTeamId) ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >
                      <span className="uppercase">{match.homeTeamId?.shortCode}</span>
                      <span className="text-[10px] font-normal opacity-80">{match.homeTeamId?.name}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedWinnerId(match.awayTeamId?._id || match.awayTeamId)}
                      className={`py-4 px-4 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${selectedWinnerId === (match.awayTeamId?._id || match.awayTeamId) ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >
                      <span className="uppercase">{match.awayTeamId?.shortCode}</span>
                      <span className="text-[10px] font-normal opacity-80">{match.awayTeamId?.name}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedWinnerId('draw')}
                      className={`col-span-2 py-4 px-4 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${selectedWinnerId === 'draw' ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >
                      <span className="uppercase">Match Drawn / Tied</span>
                    </button>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-white/10 flex gap-4">
                  <button 
                    onClick={() => setShowFinalizeModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const finalWinnerId = selectedWinnerId === 'draw' ? null : selectedWinnerId;
                      updateStatus('completed', 'Match finalized by umpire', finalWinnerId);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Confirm Winner
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScoringPage;
