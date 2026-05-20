import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import api from '../services/api';
import { useAuth } from './AuthContext';

const PlayerSyncContext = createContext();

export const usePlayerSync = () => {
  const context = useContext(PlayerSyncContext);
  if (!context) {
    throw new Error('usePlayerSync must be used within PlayerSyncProvider');
  }
  return context;
};

export const PlayerSyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState({
    profile: null,
    matches: [],
    liveMatches: [],
    schedule: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, schedulesRes, notificationsRes] = await Promise.all([
        api.get('/me/player-profile').catch(() => ({ data: null })),
        api.get('/schedules'),
        api.get('/notifications'),
      ]);

      // /schedules returns { global, organized }
      const organizedMatches = Array.isArray(schedulesRes.data?.organized) ? schedulesRes.data.organized : [];
      const globalMatches = Array.isArray(schedulesRes.data?.global) ? schedulesRes.data.global : [];
      
      const allMatches = [...organizedMatches, ...globalMatches];

      const profile = profileRes.data;
      const myTeamIds = new Set((profile?.teams || []).map(t => String(t._id || t)));

      const myMatches = organizedMatches.filter(m => {
        const hId = String(m.homeTeamId?._id || m.homeTeamId);
        const aId = String(m.awayTeamId?._id || m.awayTeamId);
        return myTeamIds.has(hId) || myTeamIds.has(aId);
      });

      setData({
        profile,
        matches: myMatches, 
        liveMatches: myMatches.filter(m => m.status === 'live'),
        schedule: myMatches.filter(m => m.status !== 'live' && m.status !== 'completed'),
        notifications: Array.isArray(notificationsRes.data) ? notificationsRes.data : [],
      });
    } catch (error) {
      console.error('Failed to load player dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'player' && user.role !== 'admin')) {
      setLoading(false);
      return;
    }

    loadAll();

    try {
      if (!socket.connected) socket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    socket.joinPlayer(user.id);

    const handleUpdate = (data) => {
      if (data && data.type === 'score' && data.matchId && data.scorecard) {
        setData(prev => {
          const updateArray = (arr) => arr.map(m => {
            if (String(m.id || m._id) === String(data.matchId)) {
              return { 
                ...m, 
                ...data.match,
                scorecard: data.scorecard,
                currentRuns: data.match?.currentRuns || data.scorecard.runs,
                currentWickets: data.match?.currentWickets || data.scorecard.wickets,
              };
            }
            return m;
          });
          return {
            ...prev,
            matches: updateArray(prev.matches),
            liveMatches: updateArray(prev.liveMatches),
            schedule: updateArray(prev.schedule)
          };
        });
      }
      loadAll();
    };
    
    // Listen for global match updates and player-specific updates
    socket.onLiveUpdate(handleUpdate);
    socket.on('notification:global', () => loadAll());
    socket.on('notification:players', () => loadAll());

    return () => {
      socket.offLiveUpdate(handleUpdate);
      socket.off('notification:global', handleUpdate);
      socket.off('notification:players', handleUpdate);
      socket.leavePlayer(user.id);
    };
  }, [user, loadAll]);

  const value = {
    ...data,
    loading,
    refresh: loadAll,
  };

  return (
    <PlayerSyncContext.Provider value={value}>
      {children}
    </PlayerSyncContext.Provider>
  );
};
