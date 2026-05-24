import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import { matchAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getStoredSession } from '../utils/authSession';

const DataSyncContext = createContext();

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within DataSyncProvider');
  }
  return context;
};

export const DataSyncProvider = ({ children }) => {
  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Cache management
  const cache = {
    matches: new Map(),
    players: new Map()
  };

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Initialize socket connection
  useEffect(() => {
    try {
      socket.connect();
      
      socket.on('connect', () => {
        setIsConnected(true);
        console.log('✅ Data Sync: Socket connected');
      });
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Data Sync: Socket disconnected');
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      toast.success('Reconnected to live updates');
      syncAllData(); // Re-sync data on reconnect
    });

    // Listen for global live updates
    socket.onLiveUpdate(handleLiveUpdate);

    // Initial data sync (non-blocking)
    setTimeout(() => syncAllData(), 100);

    return () => {
      socket.offLiveUpdate(handleLiveUpdate);
    };
  }, []);

  // Handle live updates from socket
  const handleLiveUpdate = useCallback((data) => {
    console.log('📡 Live update received:', data);

    if ((data.type === 'matchUpdate' || data.type === 'status' || data.type === 'match_status') && data.match) {
      updateMatch(data.match);
    }

    if (data.type === 'ballUpdate' && data.matchId) {
      updateMatchBall(data.matchId, data.ball);
    }

    if (data.type === 'scoreUpdate' && data.matchId) {
      updateMatchScore(data.matchId, data.score);
    }

    setLastUpdate(new Date());
  }, []);

  // Sync all data
  const syncAllData = useCallback(async () => {
    if (syncInProgress) return;

    try {
      setSyncInProgress(true);
      console.log('🔄 Syncing all data...');

      // Check if user is authenticated before syncing
      const { token } = getStoredSession('match-centre');
      if (!token) {
        console.log('⚠️ User not authenticated, skipping data sync');
        setSyncInProgress(false);
        return;
      }

      const [matchesRes] = await Promise.all([
        matchAPI.getAllMatches().catch(err => ({ data: { success: false } }))
      ]);

      if (matchesRes.data.success) {
        const allMatches = matchesRes.data.data || [];
        setMatches(allMatches);
        setLiveMatches(allMatches.filter(m => m.status === 'Live'));
        setUpcomingMatches(allMatches.filter(m => m.status === 'Scheduled'));

        // Update cache
        allMatches.forEach(match => {
          cache.matches.set(match._id, {
            data: match,
            timestamp: Date.now()
          });
        });
      }

      setLastUpdate(new Date());
      console.log('✅ Data sync complete');
    } catch (error) {
      console.error('❌ Data sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [syncInProgress]);

  // Update a single match
  const updateMatch = useCallback((updatedMatch) => {
    setMatches(prev => {
      const index = prev.findIndex(m => m._id === updatedMatch._id);
      if (index !== -1) {
        const newMatches = [...prev];
        newMatches[index] = { ...newMatches[index], ...updatedMatch };
        return newMatches;
      }
      return [...prev, updatedMatch];
    });

    // Update live/upcoming lists
    if (updatedMatch.status === 'Live') {
      setLiveMatches(prev => {
        const index = prev.findIndex(m => m._id === updatedMatch._id);
        if (index !== -1) {
          const newLive = [...prev];
          newLive[index] = { ...newLive[index], ...updatedMatch };
          return newLive;
        }
        return [...prev, updatedMatch];
      });
    } else if (updatedMatch.status === 'Scheduled') {
      setUpcomingMatches(prev => {
        const index = prev.findIndex(m => m._id === updatedMatch._id);
        if (index !== -1) {
          const newUpcoming = [...prev];
          newUpcoming[index] = { ...newUpcoming[index], ...updatedMatch };
          return newUpcoming;
        }
        return [...prev, updatedMatch];
      });
    }

    // Update cache
    cache.matches.set(updatedMatch._id, {
      data: updatedMatch,
      timestamp: Date.now()
    });

    // Invalidate related caches
    invalidateRelatedCaches('match', updatedMatch._id);
  }, []);

  // Update match with new ball
  const updateMatchBall = useCallback((matchId, ball) => {
    setMatches(prev =>
      prev.map(m =>
        m._id === matchId
          ? {
              ...m,
              currentBall: ball,
              ballHistory: [ball, ...(m.ballHistory || []).slice(0, 19)]
            }
          : m
      )
    );

    setLiveMatches(prev =>
      prev.map(m =>
        m._id === matchId
          ? {
              ...m,
              currentBall: ball,
              ballHistory: [ball, ...(m.ballHistory || []).slice(0, 19)]
            }
          : m
      )
    );
  }, []);

  // Update match score
  const updateMatchScore = useCallback((matchId, score) => {
    setMatches(prev =>
      prev.map(m =>
        m._id === matchId
          ? {
              ...m,
              team1Score: score.team1Score,
              team1Wickets: score.team1Wickets,
              team1Overs: score.team1Overs,
              team2Score: score.team2Score,
              team2Wickets: score.team2Wickets,
              team2Overs: score.team2Overs
            }
          : m
      )
    );

    setLiveMatches(prev =>
      prev.map(m =>
        m._id === matchId
          ? {
              ...m,
              team1Score: score.team1Score,
              team1Wickets: score.team1Wickets,
              team1Overs: score.team1Overs,
              team2Score: score.team2Score,
              team2Wickets: score.team2Wickets,
              team2Overs: score.team2Overs
            }
          : m
      )
    );
  }, []);

  // Update a single contest
  const updateContest = useCallback((updatedContest) => {
    setContests(prev => {
      const index = prev.findIndex(c => c._id === updatedContest._id);
      if (index !== -1) {
        const newContests = [...prev];
        newContests[index] = { ...newContests[index], ...updatedContest };
        return newContests;
      }
      return [...prev, updatedContest];
    });

    // Update cache
    cache.contests.set(updatedContest._id, {
      data: updatedContest,
      timestamp: Date.now()
    });
  }, []);

  // Get cached data
  const getCachedData = useCallback((type, id) => {
    const cacheMap = cache[type];
    if (!cacheMap) return null;

    const cached = cacheMap.get(id);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      cacheMap.delete(id);
      return null;
    }

    return cached.data;
  }, []);

  // Invalidate cache
  const invalidateCache = useCallback((type, id) => {
    const cacheMap = cache[type];
    if (cacheMap) {
      if (id) {
        cacheMap.delete(id);
      } else {
        cacheMap.clear();
      }
    }
  }, []);

  // Invalidate related caches
  const invalidateRelatedCaches = useCallback((type, id) => {
    // Future: add logic for related cache invalidation
  }, []);

  // Get match by ID (with cache)
  const getMatch = useCallback(async (matchId) => {
    // Check cache first
    const cached = getCachedData('matches', matchId);
    if (cached) return cached;

    // Fetch from API
    try {
      const response = await matchAPI.getMatch(matchId);
      if (response.data.success) {
        const match = response.data.data;
        cache.matches.set(matchId, {
          data: match,
          timestamp: Date.now()
        });
        return match;
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    }
    return null;
  }, [getCachedData]);

  // Subscribe to match updates
  const subscribeToMatch = useCallback((matchId) => {
    socket.joinMatch(matchId);
    console.log(`📍 Subscribed to match: ${matchId}`);
  }, []);

  // Unsubscribe from match updates
  const unsubscribeFromMatch = useCallback((matchId) => {
    socket.leaveMatch(matchId);
    console.log(`📍 Unsubscribed from match: ${matchId}`);
  }, []);

  const value = {
    // State
    matches,
    liveMatches,
    upcomingMatches,
    lastUpdate,
    isConnected,
    syncInProgress,

    // Methods
    syncAllData,
    updateMatch,
    updateMatchBall,
    updateMatchScore,
    getMatch,
    getCachedData,
    invalidateCache,
    subscribeToMatch,
    unsubscribeFromMatch
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};

export default DataSyncContext;
