import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiClock, FiMapPin, FiActivity, FiShare2, 
  FiTrendingUp, FiBarChart2, FiVideo, FiUsers, FiRefreshCw 
} from 'react-icons/fi';
import { GiCricketBat, GiTennisBall, GiTrophy } from 'react-icons/gi';
import { BsGraphUp, BsFillLightningFill } from 'react-icons/bs';
import { FaTrophy, FaBolt } from 'react-icons/fa';
import { matchAPI } from '../../services/api';
import socket from '../../services/socket';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const EnhancedMatchCenter = () => {
  const { canPermission } = useAuth();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [match, setMatch] = useState(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'scorecard');
  const [loading, setLoading] = useState(true);
  const [lastBall, setLastBall] = useState(null);
  const [battingStats, setBattingStats] = useState([]);
  const [bowlingStats, setBowlingStats] = useState([]);
  const [ballHistory, setBallHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [scorerBusy, setScorerBusy] = useState(false);
  const [scorerVersion, setScorerVersion] = useState(undefined);
  const [scorerLifecycle, setScorerLifecycle] = useState('');
  const [scorerStatusText, setScorerStatusText] = useState('');
  const [undoReason, setUndoReason] = useState('Scoring correction');
  const [scorerBall, setScorerBall] = useState({
    battingTeam: 'team1',
    over: 1,
    ball: 1,
    runs: 0,
    extras: 0,
    isWicket: false,
    isFour: false,
    isSix: false,
    striker: '',
    bowler: '',
    commentary: '',
    inningsEnded: false,
    matchCompleted: false,
    result: ''
  });
  const STALE_LIVE_NO_FEED_MS = 75 * 60 * 1000;
  const canManageScores = canPermission('tournament.manage_scores');

  const syncScorerFromMatch = (matchData) => {
    if (!matchData) return;
    const nextVersion = Number(matchData.__v);
    if (Number.isFinite(nextVersion)) {
      setScorerVersion(nextVersion);
    }
    setScorerLifecycle(String(matchData.lifecycleState || '').trim());
    setScorerStatusText(String(matchData.statusText || ''));
  };

  const nextEventKey = () => `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  const deriveDisplayStatus = (matchData) => {
    const normalized = String(matchData?.status || '').trim().toLowerCase();

    const isStaleLiveNoFeed = () => {
      if (
        normalized !== 'live' &&
        normalized !== 'in progress' &&
        normalized !== 'in-progress' &&
        normalized !== 'inplay' &&
        normalized !== 'in play'
      ) {
        return false;
      }

      const updatedAt = new Date(
        matchData?.lastUpdated ||
        matchData?.updatedAt ||
        matchData?.currentBall?.timestamp ||
        matchData?.startTime ||
        0
      );

      if (Number.isNaN(updatedAt.getTime())) return false;
      if (Date.now() - updatedAt.getTime() < STALE_LIVE_NO_FEED_MS) return false;

      const team1Runs = Number(matchData?.team1?.score ?? matchData?.team1Score ?? 0) || 0;
      const team2Runs = Number(matchData?.team2?.score ?? matchData?.team2Score ?? 0) || 0;
      const team1Wickets = Number(matchData?.team1?.wickets ?? matchData?.team1Wickets ?? 0) || 0;
      const team2Wickets = Number(matchData?.team2?.wickets ?? matchData?.team2Wickets ?? 0) || 0;
      const hasScoreActivity = team1Runs + team2Runs > 0 || team1Wickets + team2Wickets > 0;

      const hasBallFeed = Array.isArray(matchData?.ballHistory) && matchData.ballHistory.length > 0;
      const summaryText = [
        matchData?.result,
        matchData?.statusText,
        matchData?.currentBall?.commentary
      ].filter(Boolean).join(' ');
      const hasInPlaySignals = looksLikeInPlayText(summaryText);
      const hasFinalSignals = looksLikeFinalResultText(summaryText);

      return !hasScoreActivity && !hasBallFeed && !hasInPlaySignals && !hasFinalSignals;
    };

    if (isStaleLiveNoFeed()) return 'Completed';

    if (
      normalized === 'live' ||
      normalized === 'in progress' ||
      normalized === 'in-progress' ||
      normalized === 'inplay' ||
      normalized === 'in play' ||
      normalized === 'stumps' ||
      normalized === 'innings break'
    ) return 'Live';

    if (normalized === 'scheduled' || normalized === 'upcoming') return 'Scheduled';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';

    if (
      normalized === 'completed' ||
      normalized === 'finished' ||
      normalized === 'result' ||
      normalized === 'ended'
    ) {
      const summaryText = [
        matchData?.result,
        matchData?.statusText,
        matchData?.currentBall?.commentary
      ].filter(Boolean).join(' ');

      const hasBallFeed = Array.isArray(matchData?.ballHistory) && matchData.ballHistory.length > 0;
      const hasInPlaySignals = looksLikeInPlayText(summaryText);
      const hasFinalSignals = looksLikeFinalResultText(summaryText);

      if ((hasInPlaySignals || hasBallFeed) && !hasFinalSignals) {
        return 'Live';
      }

      return 'Completed';
    }

    return matchData?.status || 'Scheduled';
  };

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
      overs: team?.overs ?? topLevel.overs ?? topLevel.parsedOvers ?? '0.0'
    });

    return {
      ...matchData,
      status: deriveDisplayStatus(matchData),
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
      }),
      ballHistory: Array.isArray(matchData.ballHistory) ? matchData.ballHistory : [],
      battingStats: Array.isArray(matchData.battingStats) ? matchData.battingStats : [],
      bowlingStats: Array.isArray(matchData.bowlingStats) ? matchData.bowlingStats : []
    };
  };

  const mergeScorecardData = (baseMatch, scorecardData) => {
    if (!baseMatch) return baseMatch;
    if (!scorecardData) return baseMatch;

    return {
      ...baseMatch,
      ...scorecardData,
      team1: {
        ...baseMatch.team1,
        ...scorecardData.team1
      },
      team2: {
        ...baseMatch.team2,
        ...scorecardData.team2
      },
      ballHistory: Array.isArray(scorecardData.ballHistory) && scorecardData.ballHistory.length > 0
        ? scorecardData.ballHistory
        : baseMatch.ballHistory,
      battingStats: Array.isArray(scorecardData.battingStats) && scorecardData.battingStats.length > 0
        ? scorecardData.battingStats
        : baseMatch.battingStats,
      bowlingStats: Array.isArray(scorecardData.bowlingStats) && scorecardData.bowlingStats.length > 0
        ? scorecardData.bowlingStats
        : baseMatch.bowlingStats
    };
  };

  const normalizeBattingRows = (rows = []) => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row, idx) => ({
        name: row?.name || row?.batsmanName || row?.playerName || `Batter ${idx + 1}`,
        runs: Number(row?.runs ?? row?.r ?? 0),
        balls: Number(row?.balls ?? row?.b ?? 0),
        fours: Number(row?.fours ?? row?.f ?? 0),
        sixes: Number(row?.sixes ?? row?.s ?? 0),
        strikeRate: row?.strikeRate ?? row?.sr ?? '0.00'
      }))
      .filter((r) => r.name);
  };

  const normalizeBowlingRows = (rows = []) => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row, idx) => ({
        name: row?.name || row?.bowlerName || row?.playerName || `Bowler ${idx + 1}`,
        overs: row?.overs ?? row?.o ?? '0.0',
        runs: Number(row?.runs ?? row?.r ?? 0),
        wickets: Number(row?.wickets ?? row?.w ?? 0),
        economy: row?.economy ?? row?.econ ?? '0.00'
      }))
      .filter((r) => r.name);
  };

  const oversToBalls = (oversValue) => {
    if (oversValue === null || oversValue === undefined) return 0;

    const asString = String(oversValue).trim();
    if (!asString) return 0;

    if (asString.includes('.')) {
      const [whole, fraction] = asString.split('.');
      const completedOvers = Number(whole);
      const remainingBalls = Number(fraction);
      if (Number.isFinite(completedOvers) && Number.isFinite(remainingBalls)) {
        return (completedOvers * 6) + Math.min(Math.max(remainingBalls, 0), 5);
      }
    }

    const numeric = Number(asString);
    return Number.isFinite(numeric) ? Math.round(numeric * 6) : 0;
  };

  const ballsToOvers = (balls) => {
    const validBalls = Number.isFinite(Number(balls)) ? Number(balls) : 0;
    const completedOvers = Math.floor(validBalls / 6);
    const remainingBalls = validBalls % 6;
    return `${completedOvers}.${remainingBalls}`;
  };

  const extractStatsFromInnings = (inningsRows = []) => {
    if (!Array.isArray(inningsRows) || inningsRows.length === 0) {
      return { batting: [], bowling: [] };
    }

    const battingMap = new Map();
    const bowlingMap = new Map();

    inningsRows.forEach((innings) => {
      const batsmen = Array.isArray(innings?.batsmen) ? innings.batsmen : [];
      const bowlers = Array.isArray(innings?.bowlers) ? innings.bowlers : [];

      batsmen.forEach((player, idx) => {
        const name = player?.name || `Batter ${idx + 1}`;
        if (!battingMap.has(name)) {
          battingMap.set(name, {
            name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: '0.00'
          });
        }

        const current = battingMap.get(name);
        current.runs += Number(player?.runs ?? 0) || 0;
        current.balls += Number(player?.balls ?? 0) || 0;
        current.fours += Number(player?.fours ?? 0) || 0;
        current.sixes += Number(player?.sixes ?? 0) || 0;
      });

      bowlers.forEach((player, idx) => {
        const name = player?.name || `Bowler ${idx + 1}`;
        if (!bowlingMap.has(name)) {
          bowlingMap.set(name, {
            name,
            balls: 0,
            overs: '0.0',
            runs: 0,
            wickets: 0,
            economy: '0.00'
          });
        }

        const current = bowlingMap.get(name);
        current.balls += oversToBalls(player?.overs ?? 0);
        current.runs += Number(player?.runs ?? 0) || 0;
        current.wickets += Number(player?.wickets ?? 0) || 0;
      });
    });

    const batting = Array.from(battingMap.values())
      .map((player) => ({
        ...player,
        strikeRate: player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.runs - a.runs);

    const bowling = Array.from(bowlingMap.values())
      .map((player) => ({
        name: player.name,
        overs: ballsToOvers(player.balls),
        runs: player.runs,
        wickets: player.wickets,
        economy: player.balls > 0 ? ((player.runs * 6) / player.balls).toFixed(2) : '0.00'
      }))
      .sort((a, b) => (b.wickets - a.wickets) || (a.runs - b.runs));

    return { batting, bowling };
  };

  const flattenObjects = (value, result = []) => {
    if (Array.isArray(value)) {
      value.forEach((item) => flattenObjects(item, result));
      return result;
    }

    if (value && typeof value === 'object') {
      result.push(value);
      Object.values(value).forEach((child) => flattenObjects(child, result));
    }

    return result;
  };

  const isInningsLikeRow = (row) => {
    if (!row || typeof row !== 'object') return false;

    const hasInningsId = row.inningsid !== undefined || row.inningid !== undefined || row.inningId !== undefined;
    const hasBattingMeta = row.batteamname !== undefined || row.batTeamName !== undefined || row.inning !== undefined;
    const hasScoreBits =
      row.score !== undefined ||
      row.r !== undefined ||
      row.runs !== undefined ||
      row.w !== undefined ||
      row.wickets !== undefined ||
      row.o !== undefined ||
      row.overs !== undefined;

    return hasInningsId || (hasBattingMeta && hasScoreBits);
  };

  const parseProviderScorecardPayload = (payload) => {
    if (!payload) return { innings: [], battingStats: [], bowlingStats: [] };

    const objects = flattenObjects(payload);
    const inningsRows = [];

    objects.forEach((obj) => {
      Object.values(obj).forEach((value) => {
        if (Array.isArray(value)) {
          value.filter(isInningsLikeRow).forEach((entry) => inningsRows.push(entry));
        }
      });
    });

    const innings = inningsRows.map((inn, idx) => ({
      inningsId: Number(inn?.inningsid ?? inn?.inningid ?? inn?.inningId ?? (idx + 1)),
      battingTeamId: inn?.batteamid !== undefined ? String(inn.batteamid) : '',
      battingTeamName: String(inn?.batteamname || inn?.batTeamName || inn?.inning || inn?.team || ''),
      runs: Number(inn?.score ?? inn?.r ?? inn?.runs ?? 0) || 0,
      wickets: Number(inn?.wickets ?? inn?.w ?? 0) || 0,
      overs: String(inn?.overs ?? inn?.o ?? '0'),
      isDeclared: Boolean(inn?.isdeclared || inn?.declared),
      isFollowOn: Boolean(inn?.isfollowon || inn?.followOn),
      batsmen: Array.isArray(inn?.batsman)
        ? inn.batsman.map((b) => ({
            name: String(b?.name || ''),
            id: b?.id !== undefined ? String(b.id) : '',
            runs: Number(b?.runs ?? 0) || 0,
            balls: Number(b?.balls ?? 0) || 0,
            fours: Number(b?.fours ?? 0) || 0,
            sixes: Number(b?.sixes ?? 0) || 0,
            strikeRate: Number(b?.strkrate ?? b?.strikeRate ?? 0) || 0,
            isOut: !!(b?.outdec && b.outdec !== 'batting' && b.outdec !== 'yet to bat'),
            dismissalText: String(b?.outdec || '')
          }))
        : [],
      bowlers: Array.isArray(inn?.bowler)
        ? inn.bowler.map((b) => ({
            name: String(b?.name || ''),
            id: b?.id !== undefined ? String(b.id) : '',
            overs: String(b?.overs ?? '0'),
            wickets: Number(b?.wickets ?? 0) || 0,
            maidens: Number(b?.maidens ?? 0) || 0,
            runs: Number(b?.runs ?? 0) || 0,
            economyRate: Number(b?.economy ?? 0) || 0
          }))
        : []
    }));

    const derived = extractStatsFromInnings(innings);
    return {
      innings,
      battingStats: derived.batting,
      bowlingStats: derived.bowling
    };
  };

  const shouldTryProviderFallback = (data) => {
    if (!data) return false;
    const hasInnings = Array.isArray(data.innings) && data.innings.length > 0;
    const hasBatting = Array.isArray(data.battingStats) && data.battingStats.length > 0;
    const hasBowling = Array.isArray(data.bowlingStats) && data.bowlingStats.length > 0;
    return !hasInnings && !hasBatting && !hasBowling && !!data.externalId;
  };

  const hasDetailedScorecardRows = (scorecardData) => {
    if (!scorecardData || !Array.isArray(scorecardData.innings)) return false;
    return scorecardData.innings.some(
      (innings) =>
        (Array.isArray(innings?.batsmen) && innings.batsmen.length > 0)
        || (Array.isArray(innings?.bowlers) && innings.bowlers.length > 0)
    );
  };

  useEffect(() => {
    fetchMatchDetails();
    
    // Establish socket connection and wait for it before joining match
    socket.connect();
    
    // Set up live update listener before joining
    const handleLiveUpdate = (data) => {
      if (data.matchId === matchId) {
        const normalizedMatch = normalizeMatchData(data.match);
        syncScorerFromMatch(normalizedMatch);
        setMatch((prev) => {
          if (!prev) return normalizedMatch;
          return mergeScorecardData(prev, normalizedMatch);
        });

        const incomingBallHistory = Array.isArray(data.match?.ballHistory) ? data.match.ballHistory : [];
        if (data.ball) {
          setLastBall(data.ball);
          setBallHistory(prev => {
            const next = [data.ball, ...prev.slice(0, 19)];
            calculateStats(normalizedMatch, next);
            return next;
          });
          toast.success(`${data.ball.runs} runs!`, { duration: 1500 });
          setTimeout(() => setLastBall(null), 3000);
        } else if (incomingBallHistory.length > 0) {
          const next = [...incomingBallHistory].slice(-20).reverse();
          setBallHistory(next);
          calculateStats(normalizedMatch, next);
        } else {
          calculateStats(normalizedMatch, ballHistory);
        }
      }
    };
    
    // Wait a bit for connection to establish, then join match
    const connectionCheckInterval = setInterval(() => {
      if (socket.isConnected()) {
        clearInterval(connectionCheckInterval);
        socket.joinMatch(matchId);
        setIsConnected(true);
      }
    }, 100);

    socket.onLiveUpdate(handleLiveUpdate);

    const handleDisconnect = () => setIsConnected(false);
    const handleReconnect = () => {
      setIsConnected(true);
      socket.joinMatch(matchId);
      toast.success('Reconnected to live updates');
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    return () => {
      clearInterval(connectionCheckInterval);
      socket.offLiveUpdate(handleLiveUpdate);
      socket.leaveMatch(matchId);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [matchId]);

  useEffect(() => {
    const isLiveStatus = String(match?.status || '').trim().toLowerCase() === 'live';

    if ((activeTab === 'live' || activeTab === 'stats') && !isLiveStatus) {
      setActiveTab('scorecard');
    }
  }, [activeTab, match?.status]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (!requestedTab) return;
    if (requestedTab === 'scorer' && canManageScores) {
      setActiveTab('scorer');
      return;
    }
    if (requestedTab === 'live' && match?.status === 'Live') {
      setActiveTab('live');
    }
  }, [searchParams, canManageScores, match?.status]);

  const handleLifecycleTransition = async () => {
    if (!canManageScores) {
      toast.error('You do not have permission to manage scores.');
      return;
    }

    const selectedState = String(scorerLifecycle || '').trim();
    if (!selectedState) {
      toast.error('Select a lifecycle state');
      return;
    }

    setScorerBusy(true);
    try {
      const response = await matchAPI.transitionLifecycle(matchId, selectedState, scorerStatusText, scorerVersion);
      const payload = response?.data?.data;
      if (payload) {
        setMatch(normalizeMatchData(payload));
        syncScorerFromMatch(payload);
      }
      toast.success('Lifecycle updated');
      await fetchMatchDetails(true);
    } catch (error) {
      if (error.response?.status === 409) {
        const currentVersion = Number(error.response?.data?.currentVersion);
        if (Number.isFinite(currentVersion)) {
          setScorerVersion(currentVersion);
        }
        toast.error('Version conflict detected. Refreshed latest version; retry action.');
        await fetchMatchDetails(true);
      } else {
        toast.error(error.response?.data?.message || 'Unable to transition lifecycle');
      }
    } finally {
      setScorerBusy(false);
    }
  };

  const handleRecordBall = async () => {
    if (!canManageScores) {
      toast.error('You do not have permission to manage scores.');
      return;
    }

    if (!scorerBall.battingTeam || !scorerBall.over || !scorerBall.ball) {
      toast.error('Batting team, over and ball are required');
      return;
    }

    const sequence = Number(match?.lastEventSequence || 0) + 1;

    const payload = {
      eventKey: nextEventKey(),
      sequence,
      inningsNumber: Number(match?.currentInningsNumber || 1),
      battingTeam: scorerBall.battingTeam,
      over: Number(scorerBall.over),
      ball: Number(scorerBall.ball),
      runs: Number(scorerBall.runs || 0),
      extras: Number(scorerBall.extras || 0),
      isWicket: Boolean(scorerBall.isWicket),
      isFour: Boolean(scorerBall.isFour),
      isSix: Boolean(scorerBall.isSix),
      striker: String(scorerBall.striker || '').trim(),
      bowler: String(scorerBall.bowler || '').trim(),
      commentary: String(scorerBall.commentary || '').trim(),
      inningsEnded: Boolean(scorerBall.inningsEnded),
      matchCompleted: Boolean(scorerBall.matchCompleted),
      result: String(scorerBall.result || '').trim(),
      expectedVersion: scorerVersion
    };

    setScorerBusy(true);
    try {
      const response = await matchAPI.recordBallEvent(matchId, payload);
      const nextVersion = Number(response?.data?.data?.version);
      if (Number.isFinite(nextVersion)) {
        setScorerVersion(nextVersion);
      }
      toast.success('Ball event recorded');
      setScorerBall((prev) => ({
        ...prev,
        runs: 0,
        extras: 0,
        isWicket: false,
        isFour: false,
        isSix: false,
        commentary: '',
        inningsEnded: false,
        matchCompleted: false,
        result: ''
      }));
      await fetchMatchDetails(true);
    } catch (error) {
      if (error.response?.status === 409) {
        const currentVersion = Number(error.response?.data?.currentVersion);
        if (Number.isFinite(currentVersion)) {
          setScorerVersion(currentVersion);
        }
        toast.error('Version conflict detected. Refreshed latest version; retry ball entry.');
        await fetchMatchDetails(true);
      } else {
        toast.error(error.response?.data?.message || 'Unable to record ball event');
      }
    } finally {
      setScorerBusy(false);
    }
  };

  const handleUndoBall = async () => {
    if (!canManageScores) {
      toast.error('You do not have permission to manage scores.');
      return;
    }

    setScorerBusy(true);
    try {
      const response = await matchAPI.undoLastBallEvent(matchId, {
        reason: undoReason,
        expectedVersion: scorerVersion
      });
      const nextVersion = Number(response?.data?.data?.version);
      if (Number.isFinite(nextVersion)) {
        setScorerVersion(nextVersion);
      }
      toast.success('Last ball event undone');
      await fetchMatchDetails(true);
    } catch (error) {
      if (error.response?.status === 409) {
        const currentVersion = Number(error.response?.data?.currentVersion);
        if (Number.isFinite(currentVersion)) {
          setScorerVersion(currentVersion);
        }
        toast.error('Version conflict detected. Refreshed latest version; retry undo.');
        await fetchMatchDetails(true);
      } else {
        toast.error(error.response?.data?.message || 'Unable to undo ball event');
      }
    } finally {
      setScorerBusy(false);
    }
  };

  useEffect(() => {
    const isLiveStatus = String(match?.status || '').trim().toLowerCase() === 'live';
    if (activeTab !== 'stats' || !isLiveStatus) return;

    let cancelled = false;

    const refreshScorecardStats = async () => {
      try {
        const scorecardRes = await matchAPI.getMatchScorecard(matchId);
        if (!scorecardRes?.data?.success || !scorecardRes?.data?.data || cancelled) return;

        const merged = normalizeMatchData(
          mergeScorecardData(match || {}, scorecardRes.data.data)
        );

        if (!cancelled) {
          setMatch((prev) => normalizeMatchData(mergeScorecardData(prev || {}, scorecardRes.data.data)));
          calculateStats(merged, ballHistory);
        }
      } catch (error) {
        // Keep current stats view when refresh fails.
      }
    };

    refreshScorecardStats();

    return () => {
      cancelled = true;
    };
  }, [activeTab, matchId, match?.status]);

  const fetchMatchDetails = async (forceScorecardRefresh = false) => {
    try {
      const matchRes = await matchAPI.getMatch(matchId);
      let matchData = normalizeMatchData(matchRes?.data?.data);
      const isLiveStatus = String(matchData?.status || '').trim().toLowerCase() === 'live';

      if (isLiveStatus) {
        try {
          const scorecardRes = await matchAPI.getMatchScorecard(
            matchId,
            forceScorecardRefresh ? { refresh: true } : undefined
          );
          if (scorecardRes?.data?.success && scorecardRes?.data?.data) {
            matchData = normalizeMatchData(mergeScorecardData(matchData, scorecardRes.data.data));
          }
        } catch (scorecardError) {
          // Keep base match payload when scorecard endpoint is unavailable.
        }
      }

      // Provider-specific frontend fallbacks are disabled.
      // Match details now rely on backend scorecard + CricAPI pipelines.

      setMatch(matchData);
      syncScorerFromMatch(matchData);

      let nextHistory = [];
      if (isLiveStatus) {
        nextHistory = Array.isArray(matchData?.ballHistory)
          ? [...matchData.ballHistory].slice(-20).reverse()
          : [];

        try {
          const historyRes = await matchAPI.getBallHistory(matchId, 20);
          if (historyRes?.data?.success && Array.isArray(historyRes.data.data)) {
            nextHistory = historyRes.data.data;
          }
        } catch (historyError) {
          console.warn('Ball history unavailable, using match payload history instead');
        }
      }

      setBallHistory(nextHistory);
      calculateStats(matchData, nextHistory);

    } catch (error) {
      toast.error('Failed to load match details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isLiveStatus = String(match?.status || '').trim().toLowerCase() === 'live';
    if (!isLiveStatus) return;

    let disposed = false;

    const refreshBallByBall = async () => {
      try {
        const historyRes = await matchAPI.getBallHistory(matchId, 30);
        if (disposed) return;
        if (historyRes?.data?.success && Array.isArray(historyRes?.data?.data)) {
          const nextHistory = historyRes.data.data;
          setBallHistory(nextHistory);
        }
      } catch (error) {
        // Keep socket-driven stream active even if one poll cycle fails.
      }
    };

    const refreshScorecardAndPlayers = async () => {
      try {
        const [scorecardRes, playersRes] = await Promise.allSettled([
          matchAPI.getMatchScorecard(matchId, { refresh: true }),
          matchAPI.getMatchPlayers(matchId)
        ]);

        if (disposed) return;

        let latestMergedMatch = null;

        if (scorecardRes.status === 'fulfilled' && scorecardRes.value?.data?.success && scorecardRes.value?.data?.data) {
          const scorecardData = scorecardRes.value.data.data;
          setMatch((prev) => {
            const next = normalizeMatchData(mergeScorecardData(prev || {}, scorecardData));
            latestMergedMatch = next;
            return next;
          });
        }

        if (playersRes.status === 'fulfilled' && playersRes.value?.data?.success) {
          const playerPayload = playersRes.value.data.data || {};
          const playerBatting = normalizeBattingRows(playerPayload.battingStats || []);
          const playerBowling = normalizeBowlingRows(playerPayload.bowlingStats || []);

          if (playerBatting.length > 0) {
            setBattingStats(playerBatting);
          }
          if (playerBowling.length > 0) {
            setBowlingStats(playerBowling);
          }
        }

        if (latestMergedMatch) {
          const nextHistory = Array.isArray(latestMergedMatch.ballHistory) ? latestMergedMatch.ballHistory : [];
          calculateStats(latestMergedMatch, nextHistory);
        }
      } catch (error) {
        // Keep socket-driven stream active even if one poll cycle fails.
      }
    };

    refreshBallByBall();
    refreshScorecardAndPlayers();

    return () => {
      disposed = true;
    };
  }, [match?.status, matchId]);

  const calculateStats = (matchData, sourceBallHistory = ballHistory) => {
    if (!matchData) {
      setBattingStats([]);
      setBowlingStats([]);
      return;
    }

    const payloadBatting = normalizeBattingRows(matchData.battingStats || []);
    const payloadBowling = normalizeBowlingRows(matchData.bowlingStats || []);
    const inningsDerivedStats = extractStatsFromInnings(matchData.innings || []);

    // Always prefer API scorecard stats for player names and official score columns.
    if (payloadBatting.length > 0 || payloadBowling.length > 0) {
      setBattingStats(payloadBatting);
      setBowlingStats(payloadBowling);
      return;
    }

    if (inningsDerivedStats.batting.length > 0 || inningsDerivedStats.bowling.length > 0) {
      setBattingStats(inningsDerivedStats.batting);
      setBowlingStats(inningsDerivedStats.bowling);
      return;
    }

    if (!sourceBallHistory.length) {
      setBattingStats([]);
      setBowlingStats([]);
      return;
    }

    const batsmen = {};
    sourceBallHistory.forEach((ball) => {
      if (!ball?.striker) return;
      if (!batsmen[ball.striker]) {
        batsmen[ball.striker] = { name: ball.striker, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
      }
      batsmen[ball.striker].runs += ball.runs || 0;
      batsmen[ball.striker].balls += 1;
      if (ball.isFour) batsmen[ball.striker].fours += 1;
      if (ball.isSix) batsmen[ball.striker].sixes += 1;
    });

    Object.values(batsmen).forEach((batsman) => {
      batsman.strikeRate = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(2) : '0.00';
    });

    const derivedBatting = Object.values(batsmen).sort((a, b) => b.runs - a.runs);

    const bowlers = {};
    sourceBallHistory.forEach((ball) => {
      if (!ball?.bowler) return;
      if (!bowlers[ball.bowler]) {
        bowlers[ball.bowler] = { name: ball.bowler, overs: 0, runs: 0, wickets: 0, economy: 0, balls: 0 };
      }
      bowlers[ball.bowler].runs += (ball.runs || 0) + (ball.extras || 0);
      bowlers[ball.bowler].balls += 1;
      if (ball.isWicket) bowlers[ball.bowler].wickets += 1;
    });

    Object.values(bowlers).forEach((bowler) => {
      bowler.overs = (bowler.balls / 6).toFixed(1);
      bowler.economy = bowler.balls > 0 ? (bowler.runs / (bowler.balls / 6)).toFixed(2) : '0.00';
    });

    const derivedBowling = Object.values(bowlers).sort((a, b) => b.wickets - a.wickets);
    setBattingStats(derivedBatting);
    setBowlingStats(derivedBowling);
  };

  const getBallColorClass = (ball) => {
    if (ball.isWicket) return 'from-leather-500 to-leather-600';
    if (ball.isSix) return 'from-cricket-500 to-cricket-600';
    if (ball.isFour) return 'from-blue-500 to-cyan-500';
    if (ball.runs === 0) return 'from-slate-600 to-slate-700';
    return 'from-cricket-500 to-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mb-4 mx-auto">
            <div className="absolute inset-0 border-4 border-cricket-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cricket-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400 animate-pulse font-medium">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel max-w-md p-8 text-center">
          <p className="text-2xl font-bold text-white mb-4">Match not found</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')} 
            className="btn-cricket"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </div>
    );
  }

  const isLiveMatch = match.status === 'Live';
  const isScheduledMatch = String(match?.status || '').trim().toLowerCase() === 'scheduled';
  const isCompletedMatch = String(match?.status || '').trim().toLowerCase() === 'completed';
  const isTestMatch = String(match?.matchType || '').trim().toLowerCase() === 'test';
  const headlineSummary =
    match?.result ||
    match?.statusText ||
    match?.currentBall?.commentary ||
    `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}`;
  const topBattersPreview = [...battingStats]
    .sort((a, b) => Number(b?.runs || 0) - Number(a?.runs || 0))
    .slice(0, 2);
  const topBowlerPreview = [...bowlingStats]
    .sort((a, b) => Number(b?.wickets || 0) - Number(a?.wickets || 0))[0];

  const getOrdinalLabel = (index) => {
    if (index === 0) return '1st Innings';
    if (index === 1) return '2nd Innings';
    if (index === 2) return '3rd Innings';
    if (index === 3) return '4th Innings';
    return `Innings ${index + 1}`;
  };

  const parseInningsValue = (entry, idx) => {
    if (!entry || typeof entry !== 'object') return null;

    const score = Number(entry.score ?? entry.runs ?? entry.total ?? entry.teamScore ?? entry.value);
    const wickets = Number(entry.wickets ?? entry.wkts ?? entry.out ?? entry.teamWickets);
    const overs = entry.overs ?? entry.ov ?? entry.teamOvers ?? null;

    const hasScore = Number.isFinite(score);
    const hasWickets = Number.isFinite(wickets);

    return {
      label: entry.label || entry.name || entry.inningsName || getOrdinalLabel(idx),
      score: hasScore ? score : null,
      wickets: hasWickets ? wickets : null,
      overs: overs ?? null,
      hasData: hasScore || hasWickets || overs !== null
    };
  };

  const buildTestInnings = (team) => {
    const inningsCandidates = [
      team?.innings,
      team?.inningsList,
      team?.inningsScores,
      team?.scores,
      team?.scorecard?.innings
    ];

    const inningsArray = inningsCandidates.find((value) => Array.isArray(value) && value.length > 0);
    let parsed = Array.isArray(inningsArray)
      ? inningsArray.map((entry, idx) => parseInningsValue(entry, idx)).filter(Boolean)
      : [];

    if (parsed.length === 0) {
      const first = {
        label: '1st Innings',
        score: Number.isFinite(Number(team?.score)) ? Number(team.score) : null,
        wickets: Number.isFinite(Number(team?.wickets)) ? Number(team.wickets) : null,
        overs: team?.overs ?? null,
        hasData: Number.isFinite(Number(team?.score)) || Number.isFinite(Number(team?.wickets)) || team?.overs !== undefined
      };

      const secondScore = Number(team?.secondInningsScore ?? team?.innings2Score ?? team?.score2);
      const secondWickets = Number(team?.secondInningsWickets ?? team?.innings2Wickets ?? team?.wickets2);
      const secondOvers = team?.secondInningsOvers ?? team?.innings2Overs ?? team?.overs2;

      const second = {
        label: '2nd Innings',
        score: Number.isFinite(secondScore) ? secondScore : null,
        wickets: Number.isFinite(secondWickets) ? secondWickets : null,
        overs: secondOvers ?? null,
        hasData: Number.isFinite(secondScore) || Number.isFinite(secondWickets) || secondOvers !== undefined
      };

      parsed = [first, second];
    }

    if (parsed.length === 1) {
      parsed.push({ label: '2nd Innings', score: null, wickets: null, overs: null, hasData: false });
    }

    return parsed.slice(0, 2);
  };

  const formatInningsScore = (innings) => {
    if (!innings?.hasData || innings?.score === null) return 'Yet to bat';
    const wickets = innings?.wickets ?? 0;
    return `${innings.score}/${wickets}`;
  };

  const formatInningsTeamName = (innings, idx) => {
    const raw = String(innings?.battingTeamName || '').trim();
    const fallback = getOrdinalLabel(idx);
    const team1Name = String(match?.team1?.name || '').trim();
    const team2Name = String(match?.team2?.name || '').trim();

    const numericRuns = Number(innings?.runs);
    const numericWickets = Number(innings?.wickets);
    const numericOvers = String(innings?.overs ?? '').trim();

    const team1Score = Number(match?.team1?.score);
    const team2Score = Number(match?.team2?.score);
    const team1Wickets = Number(match?.team1?.wickets);
    const team2Wickets = Number(match?.team2?.wickets);
    const team1Overs = String(match?.team1?.overs ?? '').trim();
    const team2Overs = String(match?.team2?.overs ?? '').trim();

    const team1ScoreMatch = Number.isFinite(numericRuns) && Number.isFinite(team1Score) && numericRuns === team1Score;
    const team2ScoreMatch = Number.isFinite(numericRuns) && Number.isFinite(team2Score) && numericRuns === team2Score;
    const team1WicketMatch = Number.isFinite(numericWickets) && Number.isFinite(team1Wickets) && numericWickets === team1Wickets;
    const team2WicketMatch = Number.isFinite(numericWickets) && Number.isFinite(team2Wickets) && numericWickets === team2Wickets;
    const team1OversMatch = numericOvers && team1Overs && numericOvers === team1Overs;
    const team2OversMatch = numericOvers && team2Overs && numericOvers === team2Overs;

    if (team1Name && (team1ScoreMatch || (team1WicketMatch && team1OversMatch))) return team1Name;
    if (team2Name && (team2ScoreMatch || (team2WicketMatch && team2OversMatch))) return team2Name;

    if (!raw) {
      if (team1Name && team2Name) {
        return idx % 2 === 0 ? team1Name : team2Name;
      }
      return fallback;
    }

    const candidates = [
      team1Name,
      team2Name
    ].filter(Boolean);

    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const rawNormalized = normalize(raw);

    for (const teamName of candidates) {
      const teamNormalized = normalize(teamName);
      if (teamNormalized && rawNormalized.includes(teamNormalized)) {
        return teamName;
      }
    }

    return raw
      .split(',')[0]
      .replace(/inning[s]?\s*\d*/i, '')
      .replace(/\s+/g, ' ')
      .trim() || fallback;
  };

  const detailedInnings = Array.isArray(match?.innings)
    ? match.innings.filter((innings) => {
        const hasRuns = Number.isFinite(Number(innings?.runs));
        const hasOvers = innings?.overs !== undefined && innings?.overs !== null && String(innings.overs).trim() !== '';
        const hasBatsmen = Array.isArray(innings?.batsmen) && innings.batsmen.length > 0;
        const hasBowlers = Array.isArray(innings?.bowlers) && innings.bowlers.length > 0;
        const hasTeamName = Boolean(String(innings?.battingTeamName || '').trim());
        return hasTeamName || hasRuns || hasOvers || hasBatsmen || hasBowlers;
      })
    : [];

  const hasDetailedPlayerRows = detailedInnings.some(
    (innings) =>
      (Array.isArray(innings?.batsmen) && innings.batsmen.length > 0) ||
      (Array.isArray(innings?.bowlers) && innings.bowlers.length > 0)
  );
  const matchStartDate = match?.startTime ? new Date(match.startTime) : null;
  const validMatchStart = matchStartDate instanceof Date && !Number.isNaN(matchStartDate.getTime());
  const formattedStartTime = validMatchStart
    ? matchStartDate.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : 'Start time to be announced';
  const msToStart = validMatchStart ? matchStartDate.getTime() - Date.now() : null;
  const preMatchCountdown = (() => {
    if (!isScheduledMatch || !Number.isFinite(msToStart)) return 'Start time to be announced';
    if (msToStart <= 0) return 'Match start window is open';
    const totalMinutes = Math.floor(msToStart / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m to start`;
    return `${hours}h ${minutes}m to start`;
  })();

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

  return (
    <div className="space-y-3 py-4">
      {/* Live Score Banner */}
      <div className="surface-panel sticky top-20 z-50 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <FiArrowLeft className="text-xl" />
              <span className="font-medium">Back</span>
            </button>

            <div className="flex items-center gap-3">

              {isLiveMatch && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="badge-live"
                >
                  <FaBolt className="animate-pulse" />
                  <span>LIVE MATCH</span>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchMatchDetails(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FiRefreshCw className="text-slate-400" />
              </motion.button>
            </div>
          </div>

          {/* Match Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">{match.title}</h1>
            <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <FiMapPin className="text-cricket-500" />
                <span>{match.venue || 'Stadium'}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiClock className="text-cyan-300" />
                <span>{new Date(match.startTime).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Status-specific top display */}
          {!isScheduledMatch && (
            <div className="score-matrix items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="score-cell"
              >
                <h3 className="text-sm sm:text-lg font-bold text-white mb-2 truncate">{match.team1?.name || match.team1?.shortName || 'Team 1'}</h3>
                <div className="flex items-end gap-2">
                  <span className="text-2xl sm:text-4xl font-mono font-bold text-white">{formatTeamRuns(match.team1)}</span>
                  <span className="text-lg sm:text-2xl text-leather-400 font-semibold">/{formatTeamWickets(match.team1)}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">({formatTeamOvers(match.team1)} overs)</p>
              </motion.div>

              <div className="text-center px-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="bg-gradient-cricket rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center shadow-lg"
                >
                  <span className="text-lg sm:text-2xl font-bold text-white">VS</span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="score-cell"
              >
                <h3 className="text-sm sm:text-lg font-bold text-white mb-2 truncate">{match.team2?.name || match.team2?.shortName || 'Team 2'}</h3>
                <div className="flex items-end gap-2">
                  <span className="text-2xl sm:text-4xl font-mono font-bold text-white">{formatTeamRuns(match.team2)}</span>
                  <span className="text-lg sm:text-2xl text-leather-400 font-semibold">/{formatTeamWickets(match.team2)}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">({formatTeamOvers(match.team2)} overs)</p>
              </motion.div>
            </div>
          )}

          {isScheduledMatch && (
            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Pre-Match Center</p>
                  <p className="mt-1 text-lg sm:text-xl font-bold text-white">{match.team1?.name || 'Team 1'} vs {match.team2?.name || 'Team 2'}</p>
                  <p className="mt-1 text-sm text-cyan-100">{preMatchCountdown}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Match Summary</p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-3">{headlineSummary}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Players & Scores</p>
              <div className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-200">
                {topBattersPreview.length > 0 ? (
                  topBattersPreview.map((batter, idx) => (
                    <p key={`${batter.name}-${idx}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">{batter.name}</span>
                      <span className="font-semibold text-white">{batter.runs} runs</span>
                    </p>
                  ))
                ) : (
                  <p className="text-slate-300">Player scoring details will appear as the match updates.</p>
                )}
                {topBowlerPreview && (
                  <p className="flex items-center justify-between gap-2 text-slate-300/90">
                    <span className="truncate">{topBowlerPreview.name}</span>
                    <span className="font-semibold text-white">{topBowlerPreview.wickets} wkts</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Last Ball Animation */}
          <AnimatePresence>
            {lastBall && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className={`mt-4 bg-gradient-to-r ${getBallColorClass(lastBall)} p-4 rounded-xl text-white text-center`}
              >
                <div className="flex items-center justify-center gap-4">
                  <span className="text-base sm:text-lg font-semibold">Latest Ball:</span>
                  <span className={`text-2xl sm:text-3xl font-bold ${lastBall.isSix || lastBall.isFour ? 'animate-pulse' : ''}`}>
                    {lastBall.isWicket ? 'WICKET!' : lastBall.isSix ? '6!' : lastBall.isFour ? '4!' : `${lastBall.runs} runs`}
                  </span>
                </div>
                {lastBall.commentary && (
                  <p className="text-xs sm:text-sm mt-2 opacity-90">{lastBall.commentary}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[250px] sm:top-[228px] z-40 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 overflow-x-auto scrollbar-thin">
            {(
              isLiveMatch
                ? [
                    { id: 'scorecard', label: 'Scorecard', icon: FiActivity },
                    { id: 'live', label: 'Live', icon: FaBolt },
                    { id: 'stats', label: 'Statistics', icon: FiBarChart2 },
                    ...(canManageScores ? [{ id: 'scorer', label: 'Scorer Console', icon: GiTennisBall }] : [])
                  ]
                : isScheduledMatch
                  ? [
                      { id: 'scorecard', label: 'Match Overview', icon: FiActivity },
                      ...(canManageScores ? [{ id: 'scorer', label: 'Scorer Console', icon: GiTennisBall }] : [])
                    ]
                  : [
                      { id: 'scorecard', label: 'Match Result', icon: FiActivity },
                      ...(canManageScores ? [{ id: 'scorer', label: 'Scorer Console', icon: GiTennisBall }] : [])
                  ]
            ).map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 py-4 px-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cricket-500 text-cricket-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <tab.icon />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 mt-2">
        {/* Live Tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">
            {isCompletedMatch && (
              <div className="card-pro">
                <h2 className="section-title mb-4 flex items-center gap-2">
                  <GiTrophy className="text-teal-300" />
                  <span>Completed Match Summary</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">{match.team1?.name || 'Team 1'}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {formatTeamRuns(match.team1)}/{formatTeamWickets(match.team1)}
                    </p>
                    <p className="text-xs text-slate-300">{formatTeamOvers(match.team1)} overs</p>
                  </div>
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">{match.team2?.name || 'Team 2'}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {formatTeamRuns(match.team2)}/{formatTeamWickets(match.team2)}
                    </p>
                    <p className="text-xs text-slate-300">{formatTeamOvers(match.team2)} overs</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-amber-200">Result</p>
                  <p className="mt-1 text-sm sm:text-base font-semibold text-white">{match.result || match.statusText || 'Result unavailable'}</p>
                </div>
              </div>
            )}

            {isLiveMatch && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-pro">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <GiCricketBat className="text-cricket-500" />
                <span>Innings Summary</span>
              </h2>
              {isTestMatch ? (
                <div className="space-y-4">
                  {[
                    { name: match.team1?.name || 'Team 1', innings: buildTestInnings(match.team1) },
                    { name: match.team2?.name || 'Team 2', innings: buildTestInnings(match.team2) }
                  ].map((teamBlock) => (
                    <div key={teamBlock.name} className="rounded-xl border border-white/10 bg-slate-900/56 p-4">
                      <p className="text-sm font-semibold text-slate-300 mb-3">{teamBlock.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teamBlock.innings.map((innings, idx) => (
                          <div key={`${teamBlock.name}-${idx}`} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                            <p className="text-xs text-cyan-200 mb-1">{innings.label || getOrdinalLabel(idx)}</p>
                            <p className="text-xl font-bold text-white">{formatInningsScore(innings)}</p>
                            <p className="text-xs text-slate-400">{innings?.overs ? `${innings.overs} overs` : 'No overs yet'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-900/56 p-4">
                    <p className="text-sm text-slate-400">{match.team1?.name}</p>
                    <p className="text-2xl font-bold text-white">{match.team1?.score || 0}/{match.team1?.wickets || 0}</p>
                    <p className="text-xs text-slate-400">{match.team1?.overs || '0.0'} overs</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/56 p-4">
                    <p className="text-sm text-slate-400">{match.team2?.name}</p>
                    <p className="text-2xl font-bold text-white">{match.team2?.score || 0}/{match.team2?.wickets || 0}</p>
                    <p className="text-xs text-slate-400">{match.team2?.overs || '0.0'} overs</p>
                  </div>
                </div>
              )}
              </div>

              <div className="card-pro">
                <h2 className="section-title mb-4 flex items-center gap-2">
                  <FiTrendingUp className="text-cyan-300" />
                  <span>Match Result</span>
                </h2>
                <p className="text-slate-200 leading-7">
                  {match.result || match.statusText || `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}`}
                </p>
              </div>
            </div>
            )}

            {isScheduledMatch && activeTab === 'scorecard' && (
              <div className="card-pro">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Toss Window</p>
                    <p className="mt-2 text-sm text-white">Auto-refresh starts when match status moves to live.</p>
                  </div>
                  <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-200">Start Time</p>
                    <p className="mt-2 text-sm text-white">{formattedStartTime}</p>
                  </div>
                </div>
              </div>
            )}

            {isLiveMatch && detailedInnings.length > 0 && (
              <div className="card-pro">
                <h2 className="section-title mb-4 flex items-center gap-2">
                  <FiBarChart2 className="text-emerald-300" />
                  <span>Detailed Scorecard</span>
                </h2>

                {!hasDetailedPlayerRows && (
                  <div className="mb-4 rounded-lg border border-amber-300/25 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-100">
                      Provider returned innings totals only for this match. Player-wise batting and bowling rows are not available in the upstream scorecard feed yet.
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {detailedInnings.map((innings, idx) => (
                    <div key={`${innings?.inningsId || idx}-${innings?.battingTeamName || 'innings'}`} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm sm:text-base font-semibold text-white">
                          {formatInningsTeamName(innings, idx)}
                        </p>
                        <p className="text-sm sm:text-base font-semibold text-cyan-200">
                          {Number(innings?.runs || 0)}/{Number(innings?.wickets || 0)}{' '}
                          <span className="text-xs sm:text-sm text-slate-400">({innings?.overs || '0'} ov)</span>
                        </p>
                      </div>

                      {Array.isArray(innings?.batsmen) && innings.batsmen.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Batting</p>
                          <div className="data-table-wrap overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Batter</th>
                                  <th className="text-center">R</th>
                                  <th className="text-center">B</th>
                                  <th className="text-center">4s</th>
                                  <th className="text-center">6s</th>
                                  <th className="text-center">SR</th>
                                  <th>Dismissal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {innings.batsmen.map((batter, bIdx) => (
                                  <tr key={`${innings?.inningsId || idx}-batter-${bIdx}`}>
                                    <td className="font-medium text-xs sm:text-sm">{batter?.name || '-'}</td>
                                    <td className="text-center text-cyan-300 text-xs sm:text-sm tabular-nums">{Number(batter?.runs ?? 0)}</td>
                                    <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{Number(batter?.balls ?? 0)}</td>
                                    <td className="text-center text-sky-300 text-xs sm:text-sm tabular-nums">{Number(batter?.fours ?? 0)}</td>
                                    <td className="text-center text-teal-300 text-xs sm:text-sm tabular-nums">{Number(batter?.sixes ?? 0)}</td>
                                    <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">
                                      {Number.isFinite(Number(batter?.strikeRate)) ? Number(batter?.strikeRate).toFixed(2) : '0.00'}
                                    </td>
                                    <td className="text-xs sm:text-sm text-slate-300">{batter?.dismissalText || (batter?.isOut ? 'Out' : 'Not out')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {Array.isArray(innings?.bowlers) && innings.bowlers.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Bowling</p>
                          <div className="data-table-wrap overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Bowler</th>
                                  <th className="text-center">O</th>
                                  <th className="text-center">M</th>
                                  <th className="text-center">R</th>
                                  <th className="text-center">W</th>
                                  <th className="text-center">Econ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {innings.bowlers.map((bowler, bwIdx) => (
                                  <tr key={`${innings?.inningsId || idx}-bowler-${bwIdx}`}>
                                    <td className="font-medium text-xs sm:text-sm">{bowler?.name || '-'}</td>
                                    <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{bowler?.overs || '0.0'}</td>
                                    <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{Number(bowler?.maidens ?? 0)}</td>
                                    <td className="text-center text-orange-300 text-xs sm:text-sm tabular-nums">{Number(bowler?.runs ?? 0)}</td>
                                    <td className="text-center text-teal-300 font-bold text-xs sm:text-sm tabular-nums">{Number(bowler?.wickets ?? 0)}</td>
                                    <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">
                                      {Number.isFinite(Number(bowler?.economyRate)) ? Number(bowler?.economyRate).toFixed(2) : '0.00'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLiveMatch && (battingStats.length > 0 || bowlingStats.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {battingStats.length > 0 && (
                  <div className="card-pro">
                    <h2 className="section-title mb-4 flex items-center gap-2">
                      <GiCricketBat className="text-cricket-500" />
                      <span>Batting Scorecard</span>
                    </h2>
                    <div className="data-table-wrap overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Batsman</th>
                            <th className="text-center">Runs</th>
                            <th className="text-center">Balls</th>
                            <th className="text-center">4s</th>
                            <th className="text-center">6s</th>
                            <th className="text-center">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {battingStats.map((batsman, idx) => (
                            <tr key={`scorecard-bat-${idx}`}>
                              <td className="font-medium text-xs sm:text-sm">{batsman.name}</td>
                              <td className="text-center text-cyan-300 font-bold text-xs sm:text-sm tabular-nums">{batsman.runs}</td>
                              <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{batsman.balls}</td>
                              <td className="text-center text-sky-300 text-xs sm:text-sm tabular-nums">{batsman.fours}</td>
                              <td className="text-center text-teal-300 text-xs sm:text-sm tabular-nums">{batsman.sixes}</td>
                              <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">{batsman.strikeRate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {bowlingStats.length > 0 && (
                  <div className="card-pro">
                    <h2 className="section-title mb-4 flex items-center gap-2">
                      <GiTennisBall className="text-leather-500" />
                      <span>Bowling Scorecard</span>
                    </h2>
                    <div className="data-table-wrap overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Bowler</th>
                            <th className="text-center">Overs</th>
                            <th className="text-center">Runs</th>
                            <th className="text-center">Wickets</th>
                            <th className="text-center">Economy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bowlingStats.map((bowler, idx) => (
                            <tr key={`scorecard-bowl-${idx}`}>
                              <td className="font-medium text-xs sm:text-sm">{bowler.name}</td>
                              <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{bowler.overs}</td>
                              <td className="text-center text-orange-300 text-xs sm:text-sm tabular-nums">{bowler.runs}</td>
                              <td className="text-center text-teal-300 font-bold text-xs sm:text-sm tabular-nums">{bowler.wickets}</td>
                              <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">{bowler.economy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Tab */}
        {activeTab === 'live' && isLiveMatch && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ball-by-Ball */}
            <div className="lg:col-span-2">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <GiCricketBat className="text-cricket-500" />
                <span>Ball-by-Ball Commentary</span>
              </h2>

              <div className="space-y-3">
                {ballHistory.length > 0 ? (
                  ballHistory.map((ball, index) => (
                    <motion.div
                      key={`${ball.over}-${ball.ball}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card-pro"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-semibold text-sm">
                            {ball.over}.{ball.ball}
                          </span>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`px-3 py-1 rounded-lg font-bold text-white bg-gradient-to-r ${getBallColorClass(ball)}`}
                          >
                            {ball.isWicket ? 'W' : ball.isSix ? '6' : ball.isFour ? '4' : ball.runs}
                          </motion.span>
                        </div>
                        <div className="text-right text-xs sm:text-sm text-slate-400">
                          <div>{ball.striker}</div>
                          <div className="text-xs">{ball.bowler}</div>
                        </div>
                      </div>
                      {ball.commentary && (
                        <p className="text-slate-300 text-xs sm:text-sm">{cleanProviderCommentary(ball.commentary)}</p>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="card-pro p-8 sm:p-12 text-center">
                    <GiTennisBall className="text-4xl sm:text-5xl text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No active ball-by-ball stream is available for this match right now.</p>
                    <p className="mt-2 text-xs text-slate-500">Scoreboard updates will appear as soon as provider commentary/live feed resumes.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Partnership */}
              {match.status === 'Live' && (
                <div className="card-pro">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BsFillLightningFill className="text-yellow-500" />
                    <span>Current Partnership</span>
                  </h3>
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-cricket-500 mb-2">
                      {match.currentPartnership || '0'}
                    </p>
                    <p className="text-slate-400 text-sm">runs</p>
                  </div>
                </div>
              )}

              {match.status === 'Live' && (
                <div className="card-pro">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FiUsers className="text-cyan-300" />
                    <span>Live Player Scores</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-cyan-200 mb-2">Top Batters</p>
                      {battingStats.length > 0 ? (
                        <div className="space-y-2">
                          {battingStats.slice(0, 4).map((batter, idx) => (
                            <div key={`live-batter-${idx}`} className="flex items-center justify-between text-sm">
                              <span className="truncate text-slate-200">{batter.name}</span>
                              <span className="font-semibold text-white tabular-nums">{batter.runs} ({batter.balls})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Waiting for batting updates...</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-emerald-200 mb-2">Top Bowlers</p>
                      {bowlingStats.length > 0 ? (
                        <div className="space-y-2">
                          {bowlingStats.slice(0, 4).map((bowler, idx) => (
                            <div key={`live-bowler-${idx}`} className="flex items-center justify-between text-sm">
                              <span className="truncate text-slate-200">{bowler.name}</span>
                              <span className="font-semibold text-white tabular-nums">{bowler.wickets}/{bowler.runs}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Waiting for bowling updates...</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && isLiveMatch && (
          <div className="space-y-6">
            {/* Batting Stats */}
            <div className="card-pro">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <GiCricketBat className="text-cricket-500" />
                <span>Batting Statistics</span>
              </h2>
              {battingStats.length > 0 ? (
                <div className="data-table-wrap overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Batsman</th>
                        <th className="text-center">Runs</th>
                        <th className="text-center">Balls</th>
                        <th className="text-center">4s</th>
                        <th className="text-center">6s</th>
                        <th className="text-center">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingStats.map((batsman, idx) => (
                        <tr key={idx}>
                          <td className="font-medium text-xs sm:text-sm">{batsman.name}</td>
                          <td className="text-center text-cyan-300 font-bold text-xs sm:text-sm tabular-nums">{batsman.runs}</td>
                          <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{batsman.balls}</td>
                          <td className="text-center text-sky-300 text-xs sm:text-sm tabular-nums">{batsman.fours}</td>
                          <td className="text-center text-teal-300 text-xs sm:text-sm tabular-nums">{batsman.sixes}</td>
                          <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">{batsman.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No batting stats available</p>
              )}
            </div>

            {/* Bowling Stats */}
            <div className="card-pro">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <GiTennisBall className="text-leather-500" />
                <span>Bowling Statistics</span>
              </h2>
              {bowlingStats.length > 0 ? (
                <div className="data-table-wrap overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bowler</th>
                        <th className="text-center">Overs</th>
                        <th className="text-center">Runs</th>
                        <th className="text-center">Wickets</th>
                        <th className="text-center">Economy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingStats.map((bowler, idx) => (
                        <tr key={idx}>
                          <td className="font-medium text-xs sm:text-sm">{bowler.name}</td>
                          <td className="text-center text-slate-300 text-xs sm:text-sm tabular-nums">{bowler.overs}</td>
                          <td className="text-center text-orange-300 text-xs sm:text-sm tabular-nums">{bowler.runs}</td>
                          <td className="text-center text-teal-300 font-bold text-xs sm:text-sm tabular-nums">{bowler.wickets}</td>
                          <td className="text-center text-amber-300 text-xs sm:text-sm tabular-nums">{bowler.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No bowling stats available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scorer' && canManageScores && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card-pro space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <FiActivity className="text-cyan-300" />
                <span>Lifecycle Control</span>
              </h2>
              <p className="text-xs text-slate-400">Current: {match.lifecycleState || 'pre_match'} | Version: {Number.isFinite(Number(scorerVersion)) ? scorerVersion : 'N/A'}</p>
              <select
                value={scorerLifecycle}
                onChange={(e) => setScorerLifecycle(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select lifecycle state</option>
                <option value="pre_match">pre_match</option>
                <option value="toss">toss</option>
                <option value="innings_1">innings_1</option>
                <option value="innings_break">innings_break</option>
                <option value="innings_2">innings_2</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <input
                value={scorerStatusText}
                onChange={(e) => setScorerStatusText(e.target.value)}
                placeholder="Status text"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={handleLifecycleTransition}
                disabled={scorerBusy}
                className="rounded-md border border-cyan-300/40 bg-cyan-500/16 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
              >
                Apply Lifecycle
              </button>
            </div>

            <div className="card-pro space-y-4">
              <h2 className="section-title flex items-center gap-2">
                <GiCricketBat className="text-cricket-500" />
                <span>Ball Event</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <select value={scorerBall.battingTeam} onChange={(e) => setScorerBall((p) => ({ ...p, battingTeam: e.target.value }))} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option value="team1">team1</option>
                  <option value="team2">team2</option>
                </select>
                <input type="number" min={1} value={scorerBall.over} onChange={(e) => setScorerBall((p) => ({ ...p, over: e.target.value }))} placeholder="Over" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input type="number" min={1} max={6} value={scorerBall.ball} onChange={(e) => setScorerBall((p) => ({ ...p, ball: e.target.value }))} placeholder="Ball" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input type="number" min={0} max={6} value={scorerBall.runs} onChange={(e) => setScorerBall((p) => ({ ...p, runs: e.target.value }))} placeholder="Runs" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input type="number" min={0} value={scorerBall.extras} onChange={(e) => setScorerBall((p) => ({ ...p, extras: e.target.value }))} placeholder="Extras" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input value={scorerBall.striker} onChange={(e) => setScorerBall((p) => ({ ...p, striker: e.target.value }))} placeholder="Striker" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input value={scorerBall.bowler} onChange={(e) => setScorerBall((p) => ({ ...p, bowler: e.target.value }))} placeholder="Bowler" className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              </div>
              <textarea value={scorerBall.commentary} onChange={(e) => setScorerBall((p) => ({ ...p, commentary: e.target.value }))} rows={2} placeholder="Commentary" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={scorerBall.isWicket} onChange={(e) => setScorerBall((p) => ({ ...p, isWicket: e.target.checked }))} />Wicket</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={scorerBall.isFour} onChange={(e) => setScorerBall((p) => ({ ...p, isFour: e.target.checked }))} />Four</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={scorerBall.isSix} onChange={(e) => setScorerBall((p) => ({ ...p, isSix: e.target.checked }))} />Six</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={scorerBall.inningsEnded} onChange={(e) => setScorerBall((p) => ({ ...p, inningsEnded: e.target.checked }))} />End Innings</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={scorerBall.matchCompleted} onChange={(e) => setScorerBall((p) => ({ ...p, matchCompleted: e.target.checked }))} />Complete Match</label>
              </div>
              <input value={scorerBall.result} onChange={(e) => setScorerBall((p) => ({ ...p, result: e.target.value }))} placeholder="Result (if completed)" className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" />
              <button type="button" onClick={handleRecordBall} disabled={scorerBusy} className="rounded-md border border-emerald-300/40 bg-emerald-500/16 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60">Record Ball</button>
            </div>

            <div className="card-pro space-y-3 lg:col-span-2">
              <h3 className="text-lg font-bold text-white">Undo</h3>
              <input value={undoReason} onChange={(e) => setUndoReason(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="Undo reason" />
              <button type="button" onClick={handleUndoBall} disabled={scorerBusy} className="rounded-md border border-red-300/40 bg-red-500/16 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-60">Undo Last Ball</button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default EnhancedMatchCenter;
