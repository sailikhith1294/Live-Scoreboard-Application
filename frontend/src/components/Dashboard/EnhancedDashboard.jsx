import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiTv, FiActivity,
  FiClock, FiMapPin, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { FaCheckCircle, FaBolt, FaCalendarAlt, FaStar } from 'react-icons/fa';
import api from '../../services/api';
import socket from '../../services/socket';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { PRESENTATION_MODE } from '../../config/presentationMode';

const DASHBOARD_CACHE_KEY = 'dashboard:enhanced:v1';
const DASHBOARD_CACHE_TTL_MS = 15 * 1000;
const DASHBOARD_AUTO_REFRESH = true;

const EnhancedDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    liveMatches: [],
    pausedLiveMatches: [],
    upcomingMatches: [],
    completedMatches: [],
    recentResults: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('all');
  const [completedVisibleCount, setCompletedVisibleCount] = useState(6);
  const [isFetching, setIsFetching] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const lastImmediateLiveRefreshRef = useRef(0);
  const livePollInFlightRef = useRef(false);
  const liveSeenAtRef = useRef(new Map());

  const LIVE_REFRESH_ACTIVE_MS = 5000;
  const LIVE_REFRESH_IDLE_MS = 15000;
  const LIVE_DROP_GRACE_MS = 45000;
  const SCHEDULED_REFRESH_MS = 60000;
  const SOCKET_REFRESH_THROTTLE_MS = 1200;
  const DISPLAY_TIMEZONE = 'Asia/Kolkata';

  const getLiveRefreshInterval = (liveCount) =>
    liveCount > 0 ? LIVE_REFRESH_ACTIVE_MS : LIVE_REFRESH_IDLE_MS;

  const getMatchKey = (match) => String(match?._id || match?.id || match?.externalId || '');

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

  const deriveDisplayStatus = (match) => {
    const normalized = String(match?.status || '').trim().toLowerCase();

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
        match?.result,
        match?.statusText,
        match?.currentBall?.commentary
      ].filter(Boolean).join(' ');

      const hasBallFeed = Array.isArray(match?.ballHistory) && match.ballHistory.length > 0;
      const hasInPlaySignals = looksLikeInPlayText(summaryText);
      const hasFinalSignals = looksLikeFinalResultText(summaryText);

      if ((hasInPlaySignals || hasBallFeed) && !hasFinalSignals) return 'Live';
      return 'Completed';
    }

    return match?.status || 'Scheduled';
  };

  const normalizeStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (
      normalized === 'live' ||
      normalized === 'in progress' ||
      normalized === 'in-progress' ||
      normalized === 'inplay' ||
      normalized === 'in play' ||
      normalized === 'stumps' ||
      normalized === 'innings break'
    ) return 'Live';
    if (
      normalized === 'completed' ||
      normalized === 'finished' ||
      normalized === 'result' ||
      normalized === 'ended'
    ) return 'Completed';
    if (normalized === 'scheduled' || normalized === 'upcoming') return 'Scheduled';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
    return status || 'Scheduled';
  };

  const parseScoreLine = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return null;

    const scoreMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    const oversMatch = text.match(/\(([^)]+)\)/);
    if (!scoreMatch) return null;

    const runs = Number(scoreMatch[1]);
    const wickets = Number(scoreMatch[2]);
    const overs = String(oversMatch?.[1] || '')
      .replace(/\s*ov(?:ers)?\.?\s*/i, '')
      .trim();

    return {
      runs: Number.isFinite(runs) ? runs : 0,
      wickets: Number.isFinite(wickets) ? wickets : 0,
      overs: overs || '0'
    };
  };

  const isUpcomingScheduledMatch = (match, referenceTime = new Date()) => {
    if (normalizeStatus(match?.status) !== 'Scheduled') return false;

    const start = new Date(match?.startTime);
    if (Number.isNaN(start.getTime())) return false;

    // Upcoming must be in the future.
    return start >= referenceTime;
  };

  const normalizeMatch = (match) => {
    const parsedTeam1 = parseScoreLine(match?.score?.team1Score);
    const parsedTeam2 = parseScoreLine(match?.score?.team2Score);

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
      overs: team?.overs ?? topLevel.overs ?? topLevel.parsedOvers ?? 0
    });

    return {
      ...match,
      status: deriveDisplayStatus(match),
      result: cleanProviderCommentary(match?.result),
      statusText: cleanProviderCommentary(match?.statusText),
      currentBall: match?.currentBall
        ? {
            ...match.currentBall,
            commentary: cleanProviderCommentary(match.currentBall.commentary)
          }
        : match?.currentBall,
      team1: getTeam(match?.team1, 'Team 1', 'TM1', {
        score: match?.team1Score,
        wickets: match?.team1Wickets,
        overs: match?.team1Overs,
        parsedRuns: parsedTeam1?.runs,
        parsedWickets: parsedTeam1?.wickets,
        parsedOvers: parsedTeam1?.overs
      }),
      team2: getTeam(match?.team2, 'Team 2', 'TM2', {
        score: match?.team2Score,
        wickets: match?.team2Wickets,
        overs: match?.team2Overs,
        parsedRuns: parsedTeam2?.runs,
        parsedWickets: parsedTeam2?.wickets,
        parsedOvers: parsedTeam2?.overs
      })
    };
  };

  const hasLiveDisplayDetails = (match) => {
    const t1 = match?.team1 || {};
    const t2 = match?.team2 || {};

    const hasScoreData =
      toNum(t1.score) > 0 ||
      toNum(t2.score) > 0 ||
      toNum(t1.wickets) > 0 ||
      toNum(t2.wickets) > 0 ||
      toNum(t1.overs) > 0 ||
      toNum(t2.overs) > 0;

    const hasBallFeed = Array.isArray(match?.ballHistory) && match.ballHistory.length > 0;
    const signalText = `${match?.currentBall?.commentary || ''} ${match?.statusText || ''} ${match?.result || ''}`.toLowerCase();
    const hasLiveSignal = /(live|in progress|ongoing|need\s+\d+\s+runs?|trail by|lead by|runs? in \d+ balls?|innings|over\s+\d+|powerplay|drinks break|strategic timeout)/i.test(signalText);
    const hasFinalSignal = /(won by|defeated|match tied|drawn|abandoned|no result|cancelled|canceled|match ended|completed|finished)/i.test(signalText);

    return (hasScoreData || hasBallFeed || hasLiveSignal) && !hasFinalSignal;
  };

  const toNum = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const topBatters = (match, limit = 2) => {
    const rows = Array.isArray(match?.battingStats) ? match.battingStats : [];
    return rows
      .map((row, idx) => ({
        name: row?.name || row?.batsmanName || row?.playerName || `Batter ${idx + 1}`,
        runs: toNum(row?.runs ?? row?.r ?? 0)
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, limit);
  };

  const topBowlers = (match, limit = 1) => {
    const rows = Array.isArray(match?.bowlingStats) ? match.bowlingStats : [];
    return rows
      .map((row, idx) => ({
        name: row?.name || row?.bowlerName || row?.playerName || `Bowler ${idx + 1}`,
        wickets: toNum(row?.wickets ?? row?.w ?? 0)
      }))
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, limit);
  };

  const getMatchSummary = (match) => {
    if (match?.result) return match.result;
    if (match?.statusText) return match.statusText;
    if (match?.currentBall?.commentary) return match.currentBall.commentary;
    if (match?.status === 'Live') return 'Live action in progress.';
    if (match?.status === 'Completed') return 'Final scorecard available.';
    return `${match?.team1?.name || 'Team 1'} vs ${match?.team2?.name || 'Team 2'}`;
  };

  const getRelativeUpdateText = (lastUpdatedValue) => {
    const timestamp = new Date(lastUpdatedValue || 0);
    if (Number.isNaN(timestamp.getTime())) return 'Update time unavailable';

    const diffMs = Date.now() - timestamp.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));

    if (minutes < 1) return 'Updated just now';
    if (minutes < 60) return `Updated ${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Updated ${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `Updated ${days}d ago`;
  };

  const formatMatchStartTime = (startTimeValue) => {
    const start = new Date(startTimeValue);
    if (Number.isNaN(start.getTime())) return 'Start time unavailable';

    return start.toLocaleString('en-US', {
      timeZone: DISPLAY_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const readDashboardCache = () => {
    try {
      const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const ageMs = Date.now() - Number(parsed?.savedAt || 0);
      if (!Number.isFinite(ageMs) || ageMs > DASHBOARD_CACHE_TTL_MS) {
        sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        return null;
      }

      if (!parsed?.stats || typeof parsed.stats !== 'object') return null;
      return parsed.stats;
    } catch (_) {
      return null;
    }
  };

  const writeDashboardCache = (cachedStats) => {
    try {
      sessionStorage.setItem(
        DASHBOARD_CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          stats: cachedStats
        })
      );
    } catch (_) {
      // Best-effort cache only.
    }
  };

  const mergeRealtimeMatchData = ({ liveMatches = null, upcomingMatches = null }) => {
    const dedupeById = (matches) => {
      const seen = new Set();
      return matches.filter((match) => {
        const id = String(match?._id || match?.externalId || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };

    setStats((prev) => {
      const nextLiveMatches = (() => {
        if (!Array.isArray(liveMatches)) return prev.liveMatches;

        const now = Date.now();
        const incomingLive = dedupeById(liveMatches);
        const incomingIds = new Set(incomingLive.map((m) => getMatchKey(m)).filter(Boolean));

        incomingLive.forEach((match) => {
          const id = getMatchKey(match);
          if (id) liveSeenAtRef.current.set(id, now);
        });

        const retainedFromPrevious = (prev.liveMatches || []).filter((match) => {
          const id = getMatchKey(match);
          if (!id || incomingIds.has(id)) return false;
          if (deriveDisplayStatus(match) !== 'Live') return false;

          const lastSeenAt = Number(liveSeenAtRef.current.get(id) || 0);
          return now - lastSeenAt <= LIVE_DROP_GRACE_MS;
        });

        const merged = dedupeById([...incomingLive, ...retainedFromPrevious])
          .sort((a, b) => new Date(b?.startTime || 0) - new Date(a?.startTime || 0));

        const activeIds = new Set(merged.map((m) => getMatchKey(m)).filter(Boolean));
        Array.from(liveSeenAtRef.current.keys()).forEach((id) => {
          if (!activeIds.has(id) && now - Number(liveSeenAtRef.current.get(id) || 0) > LIVE_DROP_GRACE_MS) {
            liveSeenAtRef.current.delete(id);
          }
        });

        return merged;
      })();

      const nextUpcomingMatches = Array.isArray(upcomingMatches)
        ? dedupeById(upcomingMatches).sort((a, b) => new Date(a?.startTime || 0) - new Date(b?.startTime || 0))
        : prev.upcomingMatches;

      if (
        nextLiveMatches === prev.liveMatches &&
        nextUpcomingMatches === prev.upcomingMatches
      ) {
        return prev;
      }

      return {
        ...prev,
        liveMatches: nextLiveMatches,
        upcomingMatches: nextUpcomingMatches
      };
    });
  };

  const fetchRealtimeLiveAndScheduled = async ({ fetchLive = true, fetchScheduled = true } = {}) => {
    try {
      const publicResponse = await api.get('/matches/public', {
        params: {
          includeFinished: false,
          noCache: true
        }
      });
      const publicData = publicResponse?.data?.data || {};

      const liveMatches = fetchLive
        ? (publicData.live || [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Live')
            .filter((match) => hasLiveDisplayDetails(match))
        : null;

      const upcomingMatches = fetchScheduled
        ? (publicData.scheduled || [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Scheduled')
            .filter((match) => isUpcomingScheduledMatch(match))
        : null;

      mergeRealtimeMatchData({ liveMatches, upcomingMatches });
    } catch (realtimeError) {
      // Keep existing UI state when realtime fetch fails.
    }
  };

  const triggerImmediateLiveRefresh = () => {
    if (!DASHBOARD_AUTO_REFRESH) return;

    const now = Date.now();
    if (now - lastImmediateLiveRefreshRef.current < SOCKET_REFRESH_THROTTLE_MS) {
      return;
    }

    lastImmediateLiveRefreshRef.current = now;
    fetchRealtimeLiveAndScheduled({ fetchLive: true, fetchScheduled: false });
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        const cachedStats = readDashboardCache();

        if (cachedStats) {
          setStats((prev) => ({
            ...prev,
            ...cachedStats
          }));
          setLoading(false);
          return;
        }

        await fetchDashboardData();
      }
    };
    
    loadData();
    socket.connect();

    const handleLiveUpdate = (data) => {
      if (isMounted) {
        updateLiveMatches(data);
        triggerImmediateLiveRefresh();
      }
    };
    
    socket.onLiveUpdate(handleLiveUpdate);

    // Don't disconnect socket on unmount - it's a singleton used by other components
    return () => {
      isMounted = false;
      socket.offLiveUpdate(handleLiveUpdate);
      
      stats.liveMatches?.forEach(match => {
        socket.leaveMatch(match._id);
      });
    };
  }, []);

  useEffect(() => {
    if (stats.liveMatches?.length > 0) {
      // Wait for socket to be connected before joining
      const connectionCheckInterval = setInterval(() => {
        if (socket.isConnected()) {
          clearInterval(connectionCheckInterval);
          console.log('🔌 Joining', stats.liveMatches.length, 'live match rooms');
          stats.liveMatches.forEach(match => {
            socket.joinMatch(match._id);
          });
        }
      }, 100);
      
      return () => {
        clearInterval(connectionCheckInterval);
        stats.liveMatches?.forEach(match => {
          socket.leaveMatch(match._id);
        });
      };
    }
  }, [stats.liveMatches?.length]);

  useEffect(() => {
    if (!DASHBOARD_AUTO_REFRESH) return;

    let cancelled = false;
    let timeoutId;

    const refreshLive = async () => {
      if (cancelled || livePollInFlightRef.current) return;

      livePollInFlightRef.current = true;
      try {
        await fetchRealtimeLiveAndScheduled({ fetchLive: true, fetchScheduled: false });
      } finally {
        livePollInFlightRef.current = false;
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = getLiveRefreshInterval(stats.liveMatches.length);
      timeoutId = setTimeout(async () => {
        await refreshLive();
        scheduleNext();
      }, delay);
    };

    refreshLive().finally(scheduleNext);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stats.liveMatches.length]);

  useEffect(() => {
    if (!DASHBOARD_AUTO_REFRESH) return;

    let cancelled = false;

    const refreshScheduled = async () => {
      if (cancelled) return;
      await fetchRealtimeLiveAndScheduled({ fetchLive: false, fetchScheduled: true });
    };

    refreshScheduled();
    const intervalId = setInterval(refreshScheduled, SCHEDULED_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setCompletedVisibleCount(activeView === 'completed' ? 12 : 6);
  }, [activeView]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isFetching) {
      console.log('⏳ Already fetching data, skipping duplicate call');
      return;
    }
    
    try {
      setIsFetching(true);
      console.log('📊 Fetching dashboard data...', isRefresh ? '(refresh)' : '(initial)');
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const computeBuckets = (matches) => {
        const now = new Date();
        const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
        const thirtySixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const liveFreshnessCutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const getStartTimeMs = (match) => {
          const date = new Date(match?.startTime);
          return Number.isNaN(date.getTime()) ? 0 : date.getTime();
        };

        const removeDuplicates = (matchList) => {
          const seen = new Set();
          return matchList.filter((match) => {
            const id = match.externalId || match._id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        };

        const liveMatches = removeDuplicates(
          matches.filter((m) => {
            if (m.status !== 'Live') return false;
            const matchStart = new Date(m.startTime);
            if (Number.isNaN(matchStart.getTime())) return true;
            const lastUpdated = new Date(m.lastUpdated || m.updatedAt || m.startTime);
            const isFresh = !Number.isNaN(lastUpdated.getTime()) ? lastUpdated >= liveFreshnessCutoff : false;
            return matchStart >= eightHoursAgo && isFresh;
          })
        ).sort((a, b) => getStartTimeMs(b) - getStartTimeMs(a));

        const pausedLiveMatches = removeDuplicates(
          matches.filter((m) => {
            if (m.status !== 'Live') return false;
            const matchStart = new Date(m.startTime);
            const lastUpdated = new Date(m.lastUpdated || m.updatedAt || m.startTime);
            if (Number.isNaN(matchStart.getTime()) || Number.isNaN(lastUpdated.getTime())) return false;

            const recentWindow = matchStart >= thirtySixHoursAgo;
            const isStale = lastUpdated < liveFreshnessCutoff;
            return recentWindow && isStale;
          })
        ).sort((a, b) => getStartTimeMs(b) - getStartTimeMs(a));

        const upcomingMatches = removeDuplicates(
          matches.filter((m) => isUpcomingScheduledMatch(m, now))
        ).sort((a, b) => getStartTimeMs(a) - getStartTimeMs(b));

        const completedMatches = removeDuplicates(
          matches.filter((m) => {
            if (m.status !== 'Completed') return false;
            const matchStart = new Date(m.startTime);
            if (Number.isNaN(matchStart.getTime())) return true;
            return matchStart >= sevenDaysAgo;
          })
        ).sort((a, b) => getStartTimeMs(b) - getStartTimeMs(a));

        return { liveMatches, pausedLiveMatches, upcomingMatches, completedMatches };
      };

      if (isRefresh) {
        try {
          await api.post('/sync/matches');
        } catch (syncError) {
          console.warn('Manual refresh sync unavailable:', syncError?.response?.data?.message || syncError.message);
        }
      }

      const loadFromPublicFeed = async () => {
        try {
          const publicRes = await api.get('/matches/public', {
            params: {
              finishedLimit: 150
            }
          });
          const publicData = publicRes?.data?.data || {};

          const liveMatches = (publicData.live || []).map(normalizeMatch);
          const upcomingMatches = (publicData.scheduled || [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Scheduled')
            .filter((match) => isUpcomingScheduledMatch(match));
          const completedMatches = (publicData.finished || [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Completed');

          const filteredLive = liveMatches
            .filter((match) => normalizeStatus(match?.status) === 'Live')
            .filter((match) => hasLiveDisplayDetails(match));

          return {
            liveMatches: filteredLive,
            pausedLiveMatches: [],
            upcomingMatches,
            completedMatches,
            total: filteredLive.length + upcomingMatches.length + completedMatches.length
          };
        } catch (publicFeedError) {
          const [liveRes, scheduledRes, completedRes] = await Promise.allSettled([
            api.get('/matches', { params: { status: 'Live', noCache: true, limit: 100, includeLegacy: true } }),
            api.get('/matches', { params: { status: 'Scheduled', noCache: true, limit: 200, includeLegacy: true } }),
            api.get('/matches', { params: { status: 'Completed', noCache: true, limit: 150, includeLegacy: true } })
          ]);

          const liveMatches = (liveRes.status === 'fulfilled' ? (liveRes.value?.data?.data || []) : [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Live')
            .filter((match) => hasLiveDisplayDetails(match));
          const upcomingMatches = (scheduledRes.status === 'fulfilled' ? (scheduledRes.value?.data?.data || []) : [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Scheduled')
            .filter((match) => isUpcomingScheduledMatch(match));
          const completedMatches = (completedRes.status === 'fulfilled' ? (completedRes.value?.data?.data || []) : [])
            .map(normalizeMatch)
            .filter((match) => normalizeStatus(match?.status) === 'Completed');

          return {
            liveMatches,
            pausedLiveMatches: [],
            upcomingMatches,
            completedMatches,
            total: liveMatches.length + upcomingMatches.length + completedMatches.length
          };
        }
      };

      const applyMatchBuckets = ({
        liveMatches,
        pausedLiveMatches,
        upcomingMatches,
        completedMatches
      }) => {
        setStats((prev) => ({
          ...prev,
          liveMatches,
          pausedLiveMatches,
          upcomingMatches,
          completedMatches
        }));

        setCompletedVisibleCount((prev) => {
          const minimum = activeView === 'completed' ? 12 : 6;
          return Math.max(minimum, Math.min(prev, completedMatches.length || minimum));
        });
      };

      const loadedBuckets = await loadFromPublicFeed();

      let {
        liveMatches = [],
        pausedLiveMatches = [],
        upcomingMatches = [],
        completedMatches = []
      } = loadedBuckets || {};

      const total = liveMatches.length + upcomingMatches.length + completedMatches.length;

      if (liveMatches.length === 0 && !syncAttempted) {
        setSyncAttempted(true);
        // Trigger sync in background so initial dashboard render is not blocked.
        (async () => {
          try {
            await api.post('/matches/sync-live').catch(() => null);
            await api.post('/sync/matches').catch(() => null);
            const refreshedBuckets = await loadFromPublicFeed();
            applyMatchBuckets({
              liveMatches: refreshedBuckets.liveMatches || [],
              pausedLiveMatches: refreshedBuckets.pausedLiveMatches || [],
              upcomingMatches: refreshedBuckets.upcomingMatches || [],
              completedMatches: refreshedBuckets.completedMatches || []
            });
          } catch (syncError) {
            console.warn('Match sync fallback unavailable:', syncError?.response?.data?.message || syncError.message);
          }
        })();
      }

      console.log('📊 Dashboard Matches:', {
        live: liveMatches.length,
        paused: pausedLiveMatches.length,
        upcoming: upcomingMatches.length,
        completed: completedMatches.length,
        total
      });

      applyMatchBuckets({ liveMatches, pausedLiveMatches, upcomingMatches, completedMatches });

      // Remove full-page loader as soon as core match data is available.
      if (!isRefresh) {
        setLoading(false);
      }
      
      writeDashboardCache({
        liveMatches,
        pausedLiveMatches,
        upcomingMatches,
        completedMatches,
        recentResults: []
      });

      if (isRefresh) {
        toast.success('Dashboard refreshed!');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      setError('Unable to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetching(false);
      console.log('✅ Dashboard data fetch complete');
    }
  };

  const updateLiveMatches = (data) => {
    setStats(prev => ({
      ...prev,
      liveMatches: prev.liveMatches.map(m =>
        m._id === data.matchId ? normalizeMatch({ ...m, ...data.match }) : m
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-400 animate-pulse font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="surface-panel max-w-md p-8 text-center">
          <FiAlertCircle className="text-red-400 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Unable to Load Dashboard</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchDashboardData()}
            className="btn-cricket"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  const totalMatches =
    stats.liveMatches.length +
    stats.pausedLiveMatches.length +
    stats.upcomingMatches.length +
    stats.completedMatches.length;

  const nextMatch = stats.upcomingMatches[0];
  const latestResult = stats.completedMatches[0];
  const viewMeta = {
    all: { label: 'Overview', summary: 'Live, scheduled and result intelligence in one feed.' },
    live: { label: 'In Play', summary: 'Realtime score pressure and active match tempo.' },
    upcoming: { label: 'Scheduled', summary: 'Upcoming fixtures and countdown windows.' },
    completed: { label: 'Results', summary: 'Final scorecards and recent match outcomes.' }
  };
  const viewCounts = {
    all: totalMatches,
    live: stats.liveMatches.length,
    upcoming: stats.upcomingMatches.length,
    completed: stats.completedMatches.length
  };
  const visibleCompletedMatches = stats.completedMatches.slice(0, completedVisibleCount);
  const hasMoreCompletedMatches = completedVisibleCount < stats.completedMatches.length;

  return (
    <div className="relative mx-auto max-w-[118rem] space-y-6 overflow-hidden pb-6 pt-3 sm:space-y-8 sm:pb-8 sm:pt-4">
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <motion.section
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-slate-950/55"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(140deg,rgba(2,6,23,0.88),rgba(11,31,53,0.6))]" />
        <div className="relative z-10 grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="rounded-2xl border border-cyan-200/20 bg-slate-950/50 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/90">Command Bridge</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Welcome, {user?.username || user?.name || 'Player'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200 sm:text-base">Live pressure, lineup preparation, and final results are aligned in one operational board.</p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Total', value: totalMatches, tone: 'border-cyan-300/25 bg-cyan-500/12 text-cyan-100' },
                { label: 'Live', value: stats.liveMatches.length, tone: 'border-red-300/25 bg-red-500/10 text-red-100' },
                { label: 'Upcoming', value: stats.upcomingMatches.length, tone: 'border-amber-300/25 bg-amber-500/10 text-amber-100' },
                { label: 'Results', value: stats.completedMatches.length, tone: 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100' }
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border px-3 py-2.5 ${item.tone}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{item.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/14 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/22 disabled:opacity-50"
              >
                <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Refreshing' : 'Refresh Dashboard'}</span>
              </motion.button>
              <button
                onClick={() => setActiveView('live')}
                className="rounded-lg border border-slate-500/50 bg-slate-900/45 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-300/45 hover:text-cyan-100"
              >
                Open In Play
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/52 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Live Pulse</p>
              <p className="mt-2 text-sm text-slate-300">{viewMeta[activeView]?.summary}</p>
              <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Active Streams</p>
                <p className="mt-1 text-2xl font-bold text-white tabular-nums">{stats.liveMatches.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/52 p-4">
              <div className="space-y-2.5 text-sm">
                <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Next Lock</p>
                  <p className="mt-1 line-clamp-1 font-semibold text-white">{nextMatch?.seriesName || 'No scheduled fixture'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Latest Result</p>
                  <p className="mt-1 line-clamp-1 font-semibold text-white">{latestResult?.seriesName || 'No recent result'}</p>
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/8 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-200">Network Status</p>
                  <p className="mt-1 text-xs text-slate-200">
                    Live poll: {stats.liveMatches.length > 0 ? '3s ball-by-ball + 9s scores' : 'Idle'} | Realtime: Socket.io
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-cyan-200/15 px-4 py-3 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Fixtures', value: totalMatches, icon: FaStar },
              { label: 'In Play', value: stats.liveMatches.length, icon: FaBolt },
              { label: 'Completed', value: stats.completedMatches.length, icon: FaCheckCircle },
              { label: 'Scheduled', value: stats.upcomingMatches.length, icon: FaCalendarAlt }
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -1 }}
                className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-3 sm:px-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white tabular-nums">{item.value}</p>
                  </div>
                  <item.icon className="text-lg text-cyan-200" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="sticky top-24 z-10 rounded-2xl border border-cyan-300/20 bg-slate-950/86 p-3 backdrop-blur-xl">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { id: 'all', label: 'Overview', icon: FiTv },
            { id: 'live', label: 'In Play', icon: FaBolt },
            { id: 'upcoming', label: 'Scheduled', icon: FaCalendarAlt },
            { id: 'completed', label: 'Results', icon: FaCheckCircle }
          ].map((view) => (
            <motion.button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${
                activeView === view.id
                  ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2)_inset]'
                  : 'border-slate-600/40 bg-slate-900/45 text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <view.icon className="text-sm" />
                <span>{view.label}</span>
              </span>
              <span className="rounded-md border border-slate-500/40 bg-slate-900/60 px-2 py-0.5 text-[11px] tabular-nums">
                {viewCounts[view.id]}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <FiActivity className="text-cyan-200" />
          <p>{viewMeta[activeView]?.summary}</p>
        </div>
      </div>

      {/* Content */}
      <div className="py-2 sm:py-3">
        {/* In Play Matches Section */}
        {(activeView === 'all' || activeView === 'live') && (
          <div className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/38 p-4 sm:mb-8 sm:p-5">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
                <FaBolt className="text-red-400 animate-pulse" />
                <span>In Play Matches</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-sm text-slate-400">{stats.liveMatches.length} active</span>
                {stats.pausedLiveMatches.length > 0 && (
                  <span className="text-xs rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                    {stats.pausedLiveMatches.length} at stumps
                  </span>
                )}
              </div>
            </div>
            {stats.liveMatches.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
              {stats.liveMatches.map((match, index) => {
                const liveBatters = topBatters(match, 2);
                const liveBowler = topBowlers(match, 1)[0];
                const liveSummary = getMatchSummary(match);
                const MatchCard = (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-pro group flex h-full cursor-pointer flex-col p-4 sm:p-6"
                  >
                    {/* Match Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="badge-live flex items-center gap-1.5 text-xs sm:text-sm">
                        <FaBolt />
                        <span>LIVE NOW</span>
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                        {match.sport}
                      </span>
                    </div>

                    {/* Series */}
                    <div className="mb-4">
                      <h3 className="font-bold text-sm sm:text-base text-white mb-2 group-hover:text-cricket-400 transition-colors line-clamp-1">
                        {match.seriesName || 'Cricket Match'}
                      </h3>
                      <span className="inline-block px-2 py-1 bg-cricket-500/10 text-cricket-400 text-xs font-medium rounded border border-cricket-500/30">
                        {match.category || 'Cricket'}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 sm:p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {match.team1?.shortName || 'T1'}
                            </span>
                          </div>
                          <span className="font-semibold text-white text-sm sm:text-base truncate">{match.team1?.name || 'Team 1'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                            {match.team1?.score || 0}/{match.team1?.wickets || 0}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            ({match.team1?.overs || '0.0'} ov)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 sm:p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {match.team2?.shortName || 'T2'}
                            </span>
                          </div>
                          <span className="font-semibold text-white text-sm sm:text-base truncate">{match.team2?.name || 'Team 2'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                            {match.team2?.score || 0}/{match.team2?.wickets || 0}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            ({match.team2?.overs || '0.0'} ov)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Ball Commentary */}
                    {match.currentBall && match.currentBall.commentary && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-3 bg-gradient-to-r from-blue-500/10 via-red-400/10 to-blue-500/10 rounded-lg border border-blue-500/20"
                      >
                        <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">{match.currentBall.commentary}</p>
                      </motion.div>
                    )}

                    {/* Key Players */}
                    <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-500/8 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Key Players</p>
                      <div className="mt-2 space-y-1.5 text-xs text-slate-200">
                        {liveBatters.length > 0 ? (
                          liveBatters.map((batter, i) => (
                            <p key={`${batter.name}-${i}`} className="flex items-center justify-between gap-2">
                              <span className="truncate">{batter.name}</span>
                              <span className="font-semibold text-white">{batter.runs} runs</span>
                            </p>
                          ))
                        ) : (
                          <p className="flex items-center justify-between gap-2">
                            <span className="truncate">{match.currentBall?.striker || 'Current Batter'}</span>
                            <span className="font-semibold text-white">Live</span>
                          </p>
                        )}
                        <p className="flex items-center justify-between gap-2 text-slate-300/90">
                          <span className="truncate">{liveBowler?.name || match.currentBall?.bowler || 'Current Bowler'}</span>
                          <span className="font-semibold text-white">{liveBowler ? `${liveBowler.wickets} wkts` : 'Bowling'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Match Summary */}
                    <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-500/8 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Match Summary</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-200 line-clamp-3">{liveSummary}</p>
                    </div>

                    {/* Venue */}
                    <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center text-slate-400 gap-1.5 min-w-0">
                        <FiMapPin className="flex-shrink-0" />
                        <span className="truncate">{match.venue || 'Venue TBA'}</span>
                      </div>
                      <span className="text-cricket-400 group-hover:text-cricket-300 font-medium whitespace-nowrap ml-2">
                        View Details →
                      </span>
                    </div>
                  </motion.div>
                );
                
                return PRESENTATION_MODE ? (
                  <div key={match._id}>{MatchCard}</div>
                ) : (
                  <Link key={match._id} to={`/match/${match._id}/live`}>
                    {MatchCard}
                  </Link>
                );
              })}
            </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-pro p-8 sm:p-12 text-center"
              >
                <div className="bg-gradient-to-br from-red-400/20 to-red-500/20 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
                  <FaBolt className="text-4xl sm:text-5xl text-red-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No In Play Matches</h3>
                <p className="text-slate-400 text-sm sm:text-base mb-4">No active games are being tracked at this moment.</p>
                <p className="text-slate-500 text-xs">Realtime streams appear here as soon as a match enters live state.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Day Break / Stumps Section */}
        {(activeView === 'all' || activeView === 'live') && stats.pausedLiveMatches.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/38 p-4 sm:mb-8 sm:p-5">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
                <FiClock className="text-amber-300" />
                <span>Day Break / Stumps</span>
              </h2>
              <span className="text-sm text-slate-400">{stats.pausedLiveMatches.length} paused streams</span>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
              {stats.pausedLiveMatches.map((match, index) => {
                const pausedSummary = getMatchSummary(match);
                const dayBreakStartText = `${formatMatchStartTime(match?.startTime)} IST`;
                const MatchCard = (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-pro group flex h-full cursor-pointer flex-col p-4 sm:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-100">
                        <FiClock />
                        <span>PAUSED</span>
                      </span>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-500">{match.sport}</span>
                    </div>

                    <div className="mb-4">
                      <h3 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-amber-200 sm:text-base">
                        {match.seriesName || 'Cricket Match'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">{pausedSummary}</p>
                    </div>

                    <div className="space-y-3">
                      {[match.team1, match.team2].map((team, idx) => (
                        <div key={`${team?.shortName || idx}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3 sm:p-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-xs font-bold text-white">
                              {team?.shortName || `T${idx + 1}`}
                            </div>
                            <span className="truncate text-sm font-semibold text-white sm:text-base">{team?.name || `Team ${idx + 1}`}</span>
                          </div>
                          <div className="ml-2 text-right">
                            <div className="tabular-nums text-lg font-bold text-white sm:text-xl">
                              {team?.score || 0}/{team?.wickets || 0}
                            </div>
                            <div className="tabular-nums text-xs text-slate-400">({team?.overs || '0.0'} ov)</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto border-t border-slate-800/50 pt-3 text-xs text-slate-400">
                      <p className="inline-flex items-center gap-1.5">
                        <FiClock className="flex-shrink-0" />
                        <span>Starts: {dayBreakStartText}</span>
                      </p>
                    </div>
                  </motion.div>
                );

                return PRESENTATION_MODE ? (
                  <div key={match._id}>{MatchCard}</div>
                ) : (
                  <Link key={match._id} to={`/match/${match._id}/live`}>
                    {MatchCard}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Scheduled Matches Section */}
        {(activeView === 'all' || activeView === 'upcoming') && (
          <div className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/38 p-4 sm:mb-8 sm:p-5">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
                <FaCalendarAlt className="text-blue-300" />
                <span>Scheduled Matches</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-sm text-slate-400">{stats.upcomingMatches.length} queued</span>
              </div>
            </div>
            {stats.upcomingMatches.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stats.upcomingMatches.map((match, index) => {
                const MatchCard = (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-pro group flex h-full cursor-pointer flex-col p-4 sm:p-6"
                  >
                    {/* Status and Sport */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="badge-scheduled text-xs sm:text-sm">
                        SCHEDULED
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                        {match.sport}
                      </span>
                    </div>

                    {/* Series */}
                    <div className="mb-4">
                      <h3 className="font-bold text-sm text-white mb-2 line-clamp-1 group-hover:text-blue-300 transition-colors">
                        {match.seriesName || 'Cricket Match'}
                      </h3>
                      <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-300 text-xs font-medium rounded border border-blue-500/30">
                        {match.category || 'Cricket'}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-cricket-500 to-cricket-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="font-bold text-white text-xs">
                              {match.team1?.shortName || 'T1'}
                            </span>
                          </div>
                          <span className="text-sm text-white font-semibold truncate">{match.team1?.name || 'Team 1'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="px-4 py-1 bg-slate-800/80 rounded-full border border-slate-700/50">
                          <span className="text-slate-400 font-bold text-xs tracking-wider">VS</span>
                        </div>
                      </div>

                      <div className="flex items-center bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-leather-500 to-leather-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="font-bold text-white text-xs">
                              {match.team2?.shortName || 'T2'}
                            </span>
                          </div>
                          <span className="text-sm text-white font-semibold truncate">{match.team2?.name || 'Team 2'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-800/50 rounded-lg p-2.5">
                        <FiClock className="text-blue-300 flex-shrink-0" />
                        <span className="text-slate-300 text-xs font-medium">
                          {formatMatchStartTime(match.startTime)} IST
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-slate-800/50 rounded-lg p-2.5">
                        <FiMapPin className="text-cricket-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs line-clamp-1 font-medium">
                          {match.venue || 'Venue TBA'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-cyan-300/25 bg-cyan-500/8 p-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">Kickoff Window</span>
                        <span className="text-xs font-semibold text-white">Track pre-match updates</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center">
                      <span className="text-xs text-slate-500">Prematch window open</span>
                      <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </motion.div>
                );
                
                const matchKey = getMatchKey(match);

                return PRESENTATION_MODE ? (
                  <div key={matchKey}>{MatchCard}</div>
                ) : (
                  <Link key={matchKey} to={`/match/${matchKey}`}>
                    {MatchCard}
                  </Link>
                );
              })}
            </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-pro p-8 sm:p-12 text-center"
              >
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
                    <FaCalendarAlt className="text-4xl sm:text-5xl text-blue-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Scheduled Matches</h3>
                <p className="text-slate-400 text-sm sm:text-base mb-4">There are no confirmed upcoming fixtures in the current window.</p>
                <p className="text-slate-500 text-xs">Newly scheduled fixtures will show up here after sync.</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Results Section */}
        {(activeView === 'all' || activeView === 'completed') && (
          <div className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/38 p-4 sm:mb-8 sm:p-5">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
                <FaCheckCircle className="text-blue-500" />
                <span>Recent Results</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-sm text-slate-400">{stats.completedMatches.length} finalized</span>
              </div>
            </div>
            {stats.completedMatches.length > 0 ? (
              <>
              <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleCompletedMatches.map((match, index) => {
                const resultSummary = getMatchSummary(match);
                const MatchCard = (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-pro group flex h-full cursor-pointer flex-col p-4 sm:p-6"
                  >
                    {/* Status and Sport */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="badge-finished flex items-center gap-1.5 text-xs sm:text-sm">
                        <FaCheckCircle />
                        <span>FINISHED</span>
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                        {match.sport}
                      </span>
                    </div>

                    {/* Series */}
                    <div className="mb-4">
                      <h3 className="font-bold text-sm text-white mb-2 line-clamp-1 group-hover:text-cricket-400 transition-colors">
                        {match.seriesName || 'Cricket Match'}
                      </h3>
                      <span className="inline-block px-2 py-1 bg-cricket-500/10 text-cricket-400 text-xs font-medium rounded border border-cricket-500/30">
                        {match.category || 'Cricket'}
                      </span>
                    </div>

                    {/* Teams with Scores */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-cricket-500 to-cricket-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="font-bold text-white text-xs">
                              {match.team1?.shortName || 'T1'}
                            </span>
                          </div>
                          <span className="text-sm text-white font-semibold truncate">{match.team1?.name || 'Team 1'}</span>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="text-lg font-mono font-bold text-white tabular-nums">
                            {match.team1?.score || 0}/{match.team1?.wickets || 0}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            ({match.team1?.overs || '0.0'} ov)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-leather-500 to-leather-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="font-bold text-white text-xs">
                              {match.team2?.shortName || 'T2'}
                            </span>
                          </div>
                          <span className="text-sm text-white font-semibold truncate">{match.team2?.name || 'Team 2'}</span>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="text-lg font-mono font-bold text-white tabular-nums">
                            {match.team2?.score || 0}/{match.team2?.wickets || 0}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            ({match.team2?.overs || '0.0'} ov)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-500/8 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Final Result</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-200 line-clamp-3">{resultSummary}</p>
                    </div>

                    <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-500/8 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Scorecard</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-200">Open final scorecard for innings, batting and bowling details.</p>
                    </div>

                    {/* Venue & Date */}
                    <div className="mt-auto pt-3 border-t border-slate-800/50 space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-800/30 rounded-lg p-2">
                        <FiMapPin className="text-cricket-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs line-clamp-1 font-medium">
                          {match.venue || 'Venue TBA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg p-2">
                        <FiClock className="flex-shrink-0" />
                        <span className="font-medium">
                          {new Date(match.startTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
                
                return PRESENTATION_MODE ? (
                  <div key={match._id}>{MatchCard}</div>
                ) : (
                  <Link key={match._id} to={`/match/${match._id}`}>
                    {MatchCard}
                  </Link>
                );
              })}
            </div>
            {hasMoreCompletedMatches && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3">
                <p className="text-xs text-slate-300">
                  Showing {visibleCompletedMatches.length} of {stats.completedMatches.length} completed matches.
                </p>
                <button
                  type="button"
                  onClick={() => setCompletedVisibleCount((prev) => prev + 12)}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-500/12 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/22"
                >
                  Load More Results
                </button>
              </div>
            )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-pro p-8 sm:p-12 text-center"
              >
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
                  <FaCheckCircle className="text-4xl sm:text-5xl text-blue-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Results Yet</h3>
                <p className="text-slate-400 text-sm sm:text-base mb-4">No finalized scorecards are available for this period.</p>
                <p className="text-slate-500 text-xs">Result cards will populate here once matches finish.</p>
              </motion.div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default EnhancedDashboard;
