import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import api from '../services/api';
import { useAuth } from './AuthContext';

const UserSyncContext = createContext();

export const useUserSync = () => {
  const context = useContext(UserSyncContext);
  if (!context) {
    throw new Error('useUserSync must be used within UserSyncProvider');
  }
  return context;
};

export const UserSyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState({
    organized: { live: [], upcoming: [], completed: [] },
    global: { live: [], upcoming: [], completed: [] },
    tournaments: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (force = false) => {
    try {
      const [schedulesRes, tournamentsRes, notificationsRes] = await Promise.all([
        api.get(`/schedules${force ? '?force=true' : ''}`),
        api.get('/tournaments'),
        api.get('/notifications'),
      ]);

      const organized = Array.isArray(schedulesRes.data?.organized) ? schedulesRes.data.organized : [];
      const global = Array.isArray(schedulesRes.data?.global) ? schedulesRes.data.global : [];
      console.log('[UserSync] Schedules:', { globalCount: global.length, organizedCount: organized.length });

      setData({
        organized: {
          live: organized.filter(m => m && m.status === 'live'),
          upcoming: organized.filter(m => m && m.status === 'scheduled'),
          completed: organized.filter(m => m && m.status === 'completed'),
        },
        global: {
          live: global.filter(m => m && m.status === 'live'),
          upcoming: global.filter(m => m && m.status === 'scheduled'),
          completed: global.filter(m => m && m.status === 'completed'),
        },
        tournaments: Array.isArray(tournamentsRes.data) ? tournamentsRes.data : [],
        notifications: Array.isArray(notificationsRes.data) ? notificationsRes.data : [],
      });
    } catch (error) {
      console.error('Failed to load user dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard users don't have a special room, they listen to global updates
    loadAll();

    try {
      if (!socket.connected) socket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    const handleUpdate = () => loadAll();
    
    socket.onLiveUpdate(handleUpdate);
    socket.on('notification:global', handleUpdate);

    return () => {
      socket.offLiveUpdate(handleUpdate);
      socket.off('notification:global', handleUpdate);
    };
  }, [loadAll]);

  const value = {
    ...data,
    liveMatches: [...data.organized.live, ...data.global.live],
    fixtures: [...data.organized.upcoming, ...data.global.upcoming],
    loading,
    refresh: loadAll,
  };

  return (
    <UserSyncContext.Provider value={value}>
      {children}
    </UserSyncContext.Provider>
  );
};
