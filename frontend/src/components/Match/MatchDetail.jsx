import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiClock, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { GiCricketBat, GiTennisBall } from 'react-icons/gi';
import api from '../../services/api';

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [activeTab, setActiveTab] = useState('scorecard');
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const normalizeStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'live') return 'Live';
    if (normalized === 'completed' || normalized === 'finished') return 'Completed';
    if (normalized === 'scheduled' || normalized === 'upcoming') return 'Scheduled';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
    return 'Scheduled';
  };

  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'Live':
        return { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-200', label: '🔴 LIVE' };
      case 'Completed':
        return { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-200', label: '✓ Completed' };
      case 'Scheduled':
        return { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-200', label: '⏰ Scheduled' };
      case 'Cancelled':
        return { bg: 'bg-gray-500/20', border: 'border-gray-500/40', text: 'text-gray-200', label: '✗ Cancelled' };
      default:
        return { bg: 'bg-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-200', label: status };
    }
  };

  const getMatchTypeBadge = (type) => {
    const normalized = String(type || 'ODI').toUpperCase();
    switch (normalized) {
      case 'T20':
      case 'T20I':
        return { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-200', label: 'T20' };
      case 'ODI':
        return { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-200', label: 'ODI' };
      case 'TEST':
      case 'Test':
        return { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-200', label: 'TEST' };
      case 'T10':
        return { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-200', label: 'T10' };
      default:
        return { bg: 'bg-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-200', label: normalized };
    }
  };

  const normalizeMatch = (raw) => {
    if (!raw) return null;
    return {
      ...raw,
      status: normalizeStatus(raw.status),
      matchType: raw.matchType || raw.type || 'ODI',
      venue: raw.venue || raw.ground || 'Venue not available',
      date: raw.date || raw.startDate || raw.matchDate,
      result: raw.result || raw.statusText || '',
      team1: {
        ...raw.team1,
        name: raw.team1?.name || raw.team1?.teamName || 'Team 1',
        shortName: raw.team1?.shortName || raw.team1?.teamSName || 'TM1',
        score: raw.team1?.score ?? raw.team1Score ?? 0,
        wickets: raw.team1?.wickets ?? raw.team1Wickets ?? 0,
        overs: raw.team1?.overs ?? raw.team1Overs ?? 0
      },
      team2: {
        ...raw.team2,
        name: raw.team2?.name || raw.team2?.teamName || 'Team 2',
        shortName: raw.team2?.shortName || raw.team2?.teamSName || 'TM2',
        score: raw.team2?.score ?? raw.team2Score ?? 0,
        wickets: raw.team2?.wickets ?? raw.team2Wickets ?? 0,
        overs: raw.team2?.overs ?? raw.team2Overs ?? 0
      },
      ballHistory: Array.isArray(raw.ballHistory) ? raw.ballHistory : [],
      battingStats: Array.isArray(raw.battingStats) ? raw.battingStats : [],
      bowlingStats: Array.isArray(raw.bowlingStats) ? raw.bowlingStats : [],
      innings: Array.isArray(raw.innings) ? raw.innings : []
    };
  };

  const connectWebSocket = () => {
    if (wsRef.current) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsLiveConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', matchId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'matchUpdate' && data.matchId === matchId) {
            setMatch(prev => normalizeMatch({ ...prev, ...data.match }));
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onerror = () => setIsLiveConnected(false);
      ws.onclose = () => {
        setIsLiveConnected(false);
        wsRef.current = null;
        if (autoRefresh) {
          reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection error:', err);
      if (autoRefresh) {
        reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 3000);
      }
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsLiveConnected(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const matchRes = await api.get(`/matches/${matchId}`);

        const base = normalizeMatch(matchRes.data?.data || matchRes.data);

        let merged = base;
        if (base?.status === 'Live') {
          try {
            const scoreRes = await api.get(`/matches/${matchId}/scorecard`);
            const score = normalizeMatch(scoreRes.data?.data || scoreRes.data);
            merged = {
              ...(base || {}),
              ...(score || {}),
              team1: { ...(base?.team1 || {}), ...(score?.team1 || {}) },
              team2: { ...(base?.team2 || {}), ...(score?.team2 || {}) },
              ballHistory: (score?.ballHistory && score.ballHistory.length > 0) ? score.ballHistory : (base?.ballHistory || []),
              battingStats: (score?.battingStats && score.battingStats.length > 0) ? score.battingStats : (base?.battingStats || []),
              bowlingStats: (score?.bowlingStats && score.bowlingStats.length > 0) ? score.bowlingStats : (base?.bowlingStats || []),
              innings: (score?.innings && score.innings.length > 0) ? score.innings : (base?.innings || [])
            };
          } catch {
            merged = base;
          }
        }

        if (mounted) {
          setMatch(merged);
          if (merged?.status === 'Live' && autoRefresh) {
            connectWebSocket();
          }
        }
      } catch {
        if (mounted) setMatch(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      disconnectWebSocket();
    };
  }, [matchId, autoRefresh]);

  const manualRefresh = async () => {
    if (match?.status !== 'Live') return;
    try {
      const res = await api.get(`/matches/${matchId}/scorecard`);
      const normalized = normalizeMatch(res.data?.data || res.data);
      if (normalized) {
        setMatch(normalized);
      }
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  const battingStats = useMemo(() => {
    if (match?.battingStats && match.battingStats.length > 0) return match.battingStats;
    return [];
  }, [match]);

  const bowlingStats = useMemo(() => {
    if (match?.bowlingStats && match.bowlingStats.length > 0) return match.bowlingStats;
    return [];
  }, [match]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-400" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-4 py-8 text-center text-slate-300">
        <p>Unable to load match details.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-cricket">Back to Dashboard</button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(match.status);
  const typeBadge = getMatchTypeBadge(match.matchType);
  const isLiveMatch = match.status === 'Live';
  const isCompletedMatch = match.status === 'Completed';
  const availableTabs = isLiveMatch
    ? ['scorecard', 'innings', 'commentary', 'statistics']
    : ['scorecard'];

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('scorecard');
    }
  }, [activeTab, availableTabs]);

  return (
    <div className="space-y-6 py-4 text-white">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
        <FiArrowLeft /> Back
      </button>

      <div className="surface-panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {/* Match Type Badge */}
            <div className={`rounded-full border ${typeBadge.border} ${typeBadge.bg} ${typeBadge.text} px-4 py-1 text-sm font-semibold`}>
              {typeBadge.label}
            </div>
            {/* Status Badge */}
            <div className={`rounded-full border ${statusBadge.border} ${statusBadge.bg} ${statusBadge.text} px-4 py-1 text-sm font-semibold flex items-center gap-2`}>
              {match.status === 'Live' && <span className="animate-pulse">🔴</span>}
              {statusBadge.label}
            </div>
          </div>
          <button
            onClick={manualRefresh}
            disabled={!isLiveMatch}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/30"
            title={isLiveMatch ? 'Refresh scorecard' : 'Live-only score refresh'}
          >
            <FiRefreshCw className="animate-spin" /> Refresh
          </button>
        </div>

        <h1 className="text-2xl font-bold">{match.team1.name} vs {match.team2.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1"><FiClock /> {match.date || 'TBD'}</span>
          <span className="inline-flex items-center gap-1"><FiMapPin /> {match.venue}</span>
          {isLiveConnected && <span className="inline-flex items-center gap-1 text-green-400">● Connected</span>}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 hover:border-blue-500/40 transition">
            <p className="text-lg font-semibold">{match.team1.name}</p>
            <p className="mt-2 text-4xl font-bold">{match.team1.score}/{match.team1.wickets}</p>
            <p className="text-sm text-slate-400 mt-1">{match.team1.overs} overs</p>
            {match.team1.overs > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Run rate: {(match.team1.score / (match.team1.overs || 1)).toFixed(2)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 hover:border-green-500/40 transition">
            <p className="text-lg font-semibold">{match.team2.name}</p>
            <p className="mt-2 text-4xl font-bold">{match.team2.score}/{match.team2.wickets}</p>
            <p className="text-sm text-slate-400 mt-1">{match.team2.overs} overs</p>
            {match.team2.overs > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Run rate: {(match.team2.score / (match.team2.overs || 1)).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {match.result && (
          <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm text-green-200"><strong>Result:</strong> {match.result}</p>
          </div>
        )}
      </div>

      <div className="surface-panel p-2">
        <div className="flex gap-2 overflow-x-auto">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === tab ? 'bg-blue-500/20 text-blue-200' : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'scorecard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-panel p-6">
          <h2 className="mb-6 text-xl font-bold">{isCompletedMatch ? '📊 Match Result' : '📊 Scorecard Summary'}</h2>
          <div className="space-y-4">
            {/* Team 1 */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{match.team1.name}</h3>
                <span className="text-2xl font-bold">{match.team1.score}/{match.team1.wickets}</span>
              </div>
              <p className="text-sm text-slate-300">{match.team1.overs} overs</p>
              {match.team1.overs > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Run rate: {(match.team1.score / (match.team1.overs || 1)).toFixed(2)} | Avg: {(match.team1.score / Math.max(match.team1.wickets, 1)).toFixed(1)}
                </p>
              )}
            </div>

            {/* Team 2 */}
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{match.team2.name}</h3>
                <span className="text-2xl font-bold">{match.team2.score}/{match.team2.wickets}</span>
              </div>
              <p className="text-sm text-slate-300">{match.team2.overs} overs</p>
              {match.team2.overs > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Run rate: {(match.team2.score / (match.team2.overs || 1)).toFixed(2)} | Avg: {(match.team2.score / Math.max(match.team2.wickets, 1)).toFixed(1)}
                </p>
              )}
            </div>

            {match.result && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-200"><strong>📌 Result:</strong> {match.result}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'innings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-panel p-6">
          <h2 className="mb-6 text-xl font-bold">🏏 Innings Breakdown</h2>
          {match.innings && match.innings.length > 0 ? (
            <div className="space-y-4">
              {match.innings.map((inning, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">
                      {inning.battingTeamName || `Inning ${idx + 1}`}
                    </h4>
                    <span className="text-xl font-bold">
                      {inning.runs || 0}/{inning.wickets || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                    <p>Overs: <span className="text-white">{inning.overs || 'N/A'}</span></p>
                    <p>Status: <span className="text-white">{inning.isDeclared ? 'Declared' : inning.isFollowOn ? 'Follow On' : 'Batting'}</span></p>
                  </div>
                  {inning.batsmen && inning.batsmen.length > 0 && (
                    <div className="mt-3 space-y-2 text-xs">
                      {inning.batsmen.slice(0, 5).map((batsman, bidx) => (
                        <div key={bidx} className="flex justify-between text-slate-400">
                          <span>{batsman.name || 'Unknown'}</span>
                          <span>{batsman.runs || 0}({batsman.balls || 0})</span>
                        </div>
                      ))}
                      {inning.batsmen.length > 5 && (
                        <p className="text-slate-500">+{inning.batsmen.length - 5} more batsmen</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No detailed innings data available.</p>
          )}
        </motion.div>
      )}

      {activeTab === 'commentary' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-panel p-6">
          <h2 className="mb-4 text-xl font-bold">🎙️ Ball by Ball Commentary</h2>
          {match.ballHistory?.length > 0 ? (
            <div className="space-y-2">
              {match.ballHistory.slice(-20).reverse().map((ball, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-200 hover:bg-slate-800">
                  {typeof ball === 'string' ? ball : (ball.commentary || ball.text || `Ball ${idx + 1}`)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No commentary available.</p>
          )}
        </motion.div>
      )}

      {activeTab === 'statistics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 lg:grid-cols-2">
          <div className="surface-panel p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <GiCricketBat className="text-blue-300" /> 🏏 Batting Stats
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left py-2">Player</th>
                    <th className="text-center py-2">R</th>
                    <th className="text-center py-2">B</th>
                    <th className="text-center py-2">4s</th>
                    <th className="text-center py-2">6s</th>
                    <th className="text-center py-2">SR</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {battingStats.map((p, idx) => (
                    <tr key={idx} className="border-t border-white/5 hover:bg-slate-800/30">
                      <td className="py-2 font-medium text-slate-200">{p.name || p.batsmanName || `Batter ${idx + 1}`}</td>
                      <td className="text-center text-white font-semibold">{p.runs ?? 0}</td>
                      <td className="text-center text-slate-300">{p.balls ?? 0}</td>
                      <td className="text-center text-blue-300">{p.fours ?? 0}</td>
                      <td className="text-center text-red-300">{p.sixes ?? 0}</td>
                      <td className="text-center text-slate-300">{p.strikeRate ? p.strikeRate.toFixed(1) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-panel p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <GiTennisBall className="text-red-400" /> 🎳 Bowling Stats
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left py-2">Bowler</th>
                    <th className="text-center py-2">O</th>
                    <th className="text-center py-2">M</th>
                    <th className="text-center py-2">R</th>
                    <th className="text-center py-2">W</th>
                    <th className="text-center py-2">RR</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {bowlingStats.map((p, idx) => (
                    <tr key={idx} className="border-t border-white/5 hover:bg-slate-800/30">
                      <td className="py-2 font-medium text-slate-200">{p.name || p.bowlerName || `Bowler ${idx + 1}`}</td>
                      <td className="text-center text-white">{p.overs ?? 0}</td>
                      <td className="text-center text-slate-300">{p.maidens ?? 0}</td>
                      <td className="text-center text-orange-300">{p.runs ?? 0}</td>
                      <td className="text-center text-green-300 font-semibold">{p.wickets ?? 0}</td>
                      <td className="text-center text-slate-300">{p.economy ? p.economy.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MatchDetail;