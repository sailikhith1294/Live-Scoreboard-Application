import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiActivity, FiClock, FiArrowLeft, FiRefreshCw,
  FiTrendingUp, FiUsers, FiArrowRight 
} from 'react-icons/fi';
import { GiCricketBat, GiTennisBall, GiTrophy } from 'react-icons/gi';
import { BsFillLightningFill } from 'react-icons/bs';
import { FaTrophy } from 'react-icons/fa';
import { matchAPI } from '../../services/api';
import socket from '../../services/socket';
import toast from 'react-hot-toast';

const EnhancedLiveTicker = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [ballHistory, setBallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const ballHistoryRef = useRef(null);

  const parseScoreLine = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return null;

    const scoreMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (!scoreMatch) return null;

    const oversMatch = text.match(/\(([^)]+)\)/);
    const parsedOvers = String(oversMatch?.[1] || '')
      .replace(/\s*ov(?:ers)?\.?\s*/i, '')
      .trim();

    return {
      runs: Number(scoreMatch[1]) || 0,
      wickets: Number(scoreMatch[2]) || 0,
      overs: parsedOvers || null
    };
  };

  const looksLikeInPlayText = (value = '') => {
    const text = String(value || '').toLowerCase();
    if (!text.trim()) return false;
    return /(need\s+\d+\s+runs?|\d+\s+runs?\s+in\s+\d+\s+balls?|requires?\s+\d+\s+runs?|chose to bat|elected to bat|won the toss|target\s+\d+|trail by|lead by|innings break|drinks break)/i.test(text);
  };

  const looksLikeFinalResultText = (value = '') => {
    const text = String(value || '').toLowerCase();
    if (!text.trim()) return false;
    return /(won by|beat|defeated|match tied|tied match|drawn|abandoned|no result|match abandoned|match cancelled)/i.test(text);
  };

  const cleanProviderCommentary = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/not covered live/i.test(text)) {
      return 'Live commentary feed is temporarily unavailable from provider.';
    }
    return text;
  };

  const getInningsOversFallback = (matchData, inningsIndex) => {
    const innings = Array.isArray(matchData?.innings) ? matchData.innings : [];
    const candidate = innings[inningsIndex];
    if (!candidate) return null;
    const overs = candidate?.overs ?? candidate?.o ?? candidate?.teamOvers;
    if (overs === null || overs === undefined || String(overs).trim() === '') return null;
    return String(overs).trim();
  };

  const normalizeMatchData = (matchData) => {
    if (!matchData) return null;

    const normalizedStatus = (() => {
      const value = String(matchData?.status || '').trim().toLowerCase();
      if (
        value === 'live' ||
        value === 'in progress' ||
        value === 'in-progress' ||
        value === 'inplay' ||
        value === 'in play' ||
        value === 'stumps' ||
        value === 'innings break'
      ) return 'Live';
      if (value === 'completed' || value === 'finished' || value === 'result' || value === 'ended') {
        const summaryText = [
          matchData?.result,
          matchData?.statusText,
          matchData?.currentBall?.commentary
        ].filter(Boolean).join(' ');

        const hasBallFeed = Array.isArray(matchData?.ballHistory) && matchData.ballHistory.length > 0;
        const hasInPlaySignals = looksLikeInPlayText(summaryText);
        const hasFinalSignals = looksLikeFinalResultText(summaryText);

        if ((hasInPlaySignals || hasBallFeed) && !hasFinalSignals) return 'Live';
        return 'Completed';
      }
      if (value === 'scheduled' || value === 'upcoming') return 'Scheduled';
      return matchData?.status || 'Scheduled';
    })();

    const parsedTeam1Line = parseScoreLine(
      matchData?.score?.team1Score || matchData?.score?.team1 || matchData?.team1ScoreText
    );
    const parsedTeam2Line = parseScoreLine(
      matchData?.score?.team2Score || matchData?.score?.team2 || matchData?.team2ScoreText
    );

    const getTeam = (team, fallbackName, fallbackShortName, topLevel = {}) => ({
      ...(team || {}),
      name: team?.name || team?.teamName || fallbackName,
      shortName:
        team?.shortName ||
        team?.teamSName ||
        team?.name?.substring(0, 3)?.toUpperCase() ||
        fallbackShortName,
      score: team?.score ?? topLevel.score ?? topLevel.parsedRuns ?? 0,
      wickets: team?.wickets ?? topLevel.wickets ?? topLevel.parsedWickets ?? 0,
      overs: team?.overs ?? topLevel.overs ?? topLevel.parsedOvers ?? '0.0',
      runRate: team?.runRate ?? topLevel.runRate
    });

    return {
      ...matchData,
      status: normalizedStatus,
      result: cleanProviderCommentary(matchData?.result),
      statusText: cleanProviderCommentary(matchData?.statusText),
      currentBall: matchData?.currentBall
        ? {
            ...matchData.currentBall,
            commentary: cleanProviderCommentary(matchData.currentBall.commentary)
          }
        : matchData?.currentBall,
      team1: getTeam(matchData.team1, 'Team 1', 'TM1', {
        score: matchData.team1Score,
        wickets: matchData.team1Wickets,
        overs: matchData.team1Overs ?? getInningsOversFallback(matchData, 0),
        parsedRuns: parsedTeam1Line?.runs,
        parsedWickets: parsedTeam1Line?.wickets,
        parsedOvers: parsedTeam1Line?.overs
      }),
      team2: getTeam(matchData.team2, 'Team 2', 'TM2', {
        score: matchData.team2Score,
        wickets: matchData.team2Wickets,
        overs: matchData.team2Overs ?? getInningsOversFallback(matchData, 1),
        parsedRuns: parsedTeam2Line?.runs,
        parsedWickets: parsedTeam2Line?.wickets,
        parsedOvers: parsedTeam2Line?.overs
      })
    };
  };

  useEffect(() => {
    fetchMatchData();

    socket.connect();

    // Set up listeners first
    const handleLiveUpdateWrapper = (data) => {
      if (data.matchId === matchId) {
        handleLiveUpdate(data);
      }
    };

    const handleDisconnect = () => setIsConnected(false);
    const handleReconnect = () => {
      setIsConnected(true);
      socket.joinMatch(matchId);
      toast.success('Reconnected to live updates');
    };

    socket.onLiveUpdate(handleLiveUpdateWrapper);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    // Wait for connection before joining match
    const connectionCheckInterval = setInterval(() => {
      if (socket.isConnected()) {
        clearInterval(connectionCheckInterval);
        socket.joinMatch(matchId);
        setIsConnected(true);
      }
    }, 100);

    return () => {
      clearInterval(connectionCheckInterval);
      socket.leaveMatch(matchId);
      socket.offLiveUpdate(handleLiveUpdateWrapper);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [matchId]);

  useEffect(() => {
    const isLiveStatus = String(match?.status || '').trim().toLowerCase() === 'live';
    if (!isLiveStatus) return;

    let disposed = false;

    const refreshTickerData = async () => {
      if (disposed) return;
      await fetchMatchData(true);
    };

    refreshTickerData();
    const intervalId = setInterval(refreshTickerData, 5000);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [match?.status, matchId]);

  useEffect(() => {
    if (autoScroll && ballHistoryRef.current) {
      ballHistoryRef.current.scrollTop = 0;
    }
  }, [ballHistory]);

  const fetchMatchData = async (silent = false) => {
    try {
      const [matchRes, scorecardRes, historyRes] = await Promise.allSettled([
        matchAPI.getMatch(matchId),
        matchAPI.getMatchScorecard(matchId, { refresh: true }),
        matchAPI.getBallHistory(matchId, 30)
      ]);

      let nextMatchPayload = null;

      if (matchRes.status === 'fulfilled' && matchRes.value?.data?.success) {
        nextMatchPayload = matchRes.value.data.data;
      }

      if (scorecardRes.status === 'fulfilled' && scorecardRes.value?.data?.success && scorecardRes.value?.data?.data) {
        nextMatchPayload = {
          ...(nextMatchPayload || {}),
          ...scorecardRes.value.data.data
        };
      }

      if (nextMatchPayload) {
        setMatch((prev) => normalizeMatchData({ ...(prev || {}), ...nextMatchPayload }));
      }

      if (historyRes.status === 'fulfilled' && historyRes.value?.data?.success && Array.isArray(historyRes.value?.data?.data)) {
        setBallHistory(historyRes.value.data.data);
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
      if (!silent) {
        toast.error('Failed to load match data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLiveUpdate = (data) => {
    console.log('Live update received:', data);

    if (data.ball) {
      // Add new ball to history with animation
      setBallHistory(prev => [data.ball, ...prev]);
      
      // Show toast notification for significant events
      if (data.ball.isWicket) {
        toast.error('WICKET!', { icon: '🏏', duration: 2000 });
      } else if (data.ball.isSix) {
        toast.success('SIX!', { icon: '🎯', duration: 2000 });
      } else if (data.ball.isFour) {
        toast.success('FOUR!', { icon: '🔥', duration: 2000 });
      }
    }

    if (data.match) {
      setMatch((prev) => normalizeMatchData({ ...(prev || {}), ...data.match }));
    }
  };

  const getBallColorClass = (ball) => {
    if (ball.isWicket) return 'from-red-500 to-red-600';
    if (ball.isSix) return 'from-purple-500 to-pink-500';
    if (ball.isFour) return 'from-sky-500 to-cyan-500';
    if (ball.runs === 0) return 'from-gray-600 to-gray-700';
    return 'from-teal-500 to-cyan-500';
  };

  const getBallIcon = (ball) => {
    if (ball.isWicket) return '🏏';
    if (ball.isSix) return '🎯';
    if (ball.isFour) return '🔥';
    if (ball.runs === 0) return '⚫';
    return '✓';
  };

  const getOverSummary = (over) => {
    const overBalls = ballHistory.filter(b => b.over === over);
    const runs = overBalls.reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0);
    const wickets = overBalls.filter(b => b.isWicket).length;
    return { runs, wickets, balls: overBalls };
  };

  const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatTeamRuns = (team) => {
    const runs = toFiniteNumber(team?.score);
    return runs === null ? '—' : String(runs);
  };

  const formatTeamWickets = (team) => {
    const wickets = toFiniteNumber(team?.wickets);
    return wickets === null ? '—' : String(wickets);
  };

  const formatTeamOvers = (team) => {
    const overs = String(team?.overs ?? '').trim();
    if (overs && overs !== '0' && overs !== '0.0') return overs;

    const runs = toFiniteNumber(team?.score);
    const wickets = toFiniteNumber(team?.wickets);
    if (runs === null && wickets === null) return '—';
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center surface-panel px-8 py-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400 animate-pulse">Loading live ticker...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center surface-panel px-8 py-10">
          <p className="text-2xl text-white mb-4">Match not found</p>
          <button onClick={() => navigate('/dashboard')} className="btn-cricket">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get unique overs for over-by-over breakdown
  const uniqueOvers = [...new Set(
    ballHistory
      .map((b) => Number(b?.over))
      .filter((over) => Number.isFinite(over))
  )].sort((a, b) => b - a);
  const isLiveMatch = String(match?.status || '').trim().toLowerCase() === 'live';
  const hasScoreCoverage =
    toFiniteNumber(match?.team1?.score) !== null ||
    toFiniteNumber(match?.team2?.score) !== null ||
    uniqueOvers.length > 0;

  return (
    <div className="space-y-6 py-4 text-white">
      {/* Header */}
      <div className="surface-panel sticky top-20 z-30 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <FiArrowLeft className="text-xl" />
              <span className="font-medium">Back</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Connection Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                isConnected ? 'bg-teal-500/20 text-teal-200 border border-teal-400/25' : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-300 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs font-semibold">{isConnected ? 'LIVE' : 'Reconnecting...'}</span>
              </div>

              {/* Auto-scroll Toggle */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  autoScroll ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/25' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Auto-scroll {autoScroll ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => fetchMatchData(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FiRefreshCw className="text-slate-300" />
              </button>
            </div>
          </div>

          {/* Live Match Status */}
          {isLiveMatch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-xl p-3 border border-red-500/30"
            >
              <div className="flex items-center justify-center gap-2">
                <FiActivity className="text-red-400 animate-pulse text-xl" />
                <span className="text-white font-bold">LIVE MATCH IN PROGRESS</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Scorecard */}
      <div className="hero-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-white mb-2">{match.title}</h1>
            <p className="section-subtitle">Live ball-by-ball updates</p>
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-pro p-6"
            >
              <h3 className="text-xl font-bold text-white mb-3">{match.team1?.name || match.team1?.shortName || 'Team 1'}</h3>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-5xl font-bold text-white">{formatTeamRuns(match.team1)}</span>
                <span className="text-3xl text-red-400 font-semibold pb-1">/{formatTeamWickets(match.team1)}</span>
              </div>
              <p className="text-slate-400">Overs: {formatTeamOvers(match.team1)}</p>
              {match.team1?.runRate && (
                <p className="text-sm text-cyan-300 mt-1">Run Rate: {match.team1.runRate}</p>
              )}
            </motion.div>

            {/* Team 2 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-pro p-6"
            >
              <h3 className="text-xl font-bold text-white mb-3">{match.team2?.name || match.team2?.shortName || 'Team 2'}</h3>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-5xl font-bold text-white">{formatTeamRuns(match.team2)}</span>
                <span className="text-3xl text-red-400 font-semibold pb-1">/{formatTeamWickets(match.team2)}</span>
              </div>
              <p className="text-slate-400">Overs: {formatTeamOvers(match.team2)}</p>
              {match.team2?.runRate && (
                <p className="text-sm text-cyan-300 mt-1">Run Rate: {match.team2.runRate}</p>
              )}
            </motion.div>
          </div>

          {isLiveMatch && !hasScoreCoverage && (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              Live score feed is currently unavailable from provider for this fixture. Ball events will appear as soon as coverage starts.
            </div>
          )}

          {/* Current Partnership */}
          {isLiveMatch && match.currentPartnership && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 border border-amber-500/30 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <BsFillLightningFill className="text-yellow-400" />
                <span className="text-gray-400 text-sm">Current Partnership</span>
              </div>
              <p className="text-3xl font-bold text-white">{match.currentPartnership} runs</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ball-by-Ball Updates */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <GiTennisBall className="text-teal-300 animate-bounce" />
              Ball-by-Ball Updates
            </h2>

            <div
              ref={ballHistoryRef}
              className="space-y-2 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar"
            >
              <AnimatePresence>
                {ballHistory.length > 0 ? (
                  ballHistory.map((ball, index) => (
                    <motion.div
                      key={`${ball.over}-${ball.ball}-${index}`}
                      initial={{ opacity: 0, x: -30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 30, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                      className="card-pro p-4 hover:border-cyan-300/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 font-mono text-sm">
                            {ball.over}.{ball.ball}
                          </span>
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className={`px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r ${getBallColorClass(ball)} shadow-lg flex items-center gap-2`}
                          >
                            <span>{getBallIcon(ball)}</span>
                            <span>{ball.isWicket ? 'WICKET' : ball.isSix ? 'SIX' : ball.isFour ? 'FOUR' : ball.runs}</span>
                          </motion.div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold text-sm">{ball.striker}</p>
                          <p className="text-gray-400 text-xs">{ball.bowler}</p>
                        </div>
                      </div>

                      {ball.commentary && (
                        <p className="text-gray-300 text-sm leading-relaxed">{cleanProviderCommentary(ball.commentary)}</p>
                      )}

                      {ball.isWicket && ball.dismissalType && (
                        <div className="mt-2 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/30">
                          <p className="text-red-400 text-xs font-semibold">
                            {ball.dismissalType} • {ball.fielder && `c ${ball.fielder}`}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                    <div className="card-pro p-12 text-center">
                    <GiTennisBall className="text-5xl text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No ball updates available yet</p>
                    <p className="text-slate-500 text-sm mt-2">Updates will appear here when the match is live</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Over-by-Over Summary */}
            <div className="card-pro p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FiTrendingUp className="text-cyan-300" />
                Over Summary
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {uniqueOvers.length > 0 ? uniqueOvers.slice(0, 10).map((over, idx) => {
                  const summary = getOverSummary(over);
                  return (
                    <motion.div
                      key={over}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-lg p-3 border border-white/10 bg-slate-900/56"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm font-semibold">Over {over}</span>
                        <span className="text-white font-bold">
                          {summary.runs} runs {summary.wickets > 0 && `• ${summary.wickets}W`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {summary.balls.map((ball, ballIdx) => (
                          <div
                            key={ballIdx}
                            className={`flex-1 h-8 rounded flex items-center justify-center text-white text-xs font-bold bg-gradient-to-r ${getBallColorClass(ball)}`}
                          >
                            {ball.isWicket ? 'W' : ball.runs}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="rounded-lg p-3 border border-white/10 bg-slate-900/56 text-sm text-slate-400">
                    Over summary will appear once ball-by-ball data starts streaming.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 1);
        }
      `}</style>
    </div>
  );
};

export default EnhancedLiveTicker;
