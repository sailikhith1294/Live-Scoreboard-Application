import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const OrganizerSyncContext = createContext();

export const OrganizerSyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState({
    tournaments: [],
    teams: [],
    venues: [],
    matches: [],
    liveFeed: { live: [], scheduled: [], completed: [] },
  });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (force = false) => {
    try {
      const res = await api.get(`/organizer/dashboard${force ? '?force=true' : ''}`);
      const data = res?.data || { tournaments: [], teams: [], venues: [], matches: [], liveFeed: { live: [], scheduled: [], completed: [] } };
      setDashboard({
        tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
        teams: Array.isArray(data.teams) ? data.teams : [],
        venues: Array.isArray(data.venues) ? data.venues : [],
        matches: Array.isArray(data.matches) ? data.matches : [],
        liveFeed: {
          live: Array.isArray(data?.liveFeed?.live) ? data.liveFeed.live : [],
          scheduled: Array.isArray(data?.liveFeed?.scheduled) ? data.liveFeed.scheduled : [],
          completed: Array.isArray(data?.liveFeed?.completed) ? data.liveFeed.completed : [],
        },
      });
    } catch (error) {
      console.error('Failed to load organizer dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      if (user) setLoading(false);
      return;
    }

    loadDashboard();

    try {
      if (!socket.connected) socket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    socket.joinOrganizer(user.id);

    const handleUpdate = (update) => {
      console.log('📡 Organizer update received:', update);
      
      if (update.type === 'team_player_added') {
        toast.success(`${update.data.player} joined ${update.data.teamName}!`, {
          icon: '🏏',
          duration: 5000
        });
      }

      // Silent refresh to keep aggregate accuracy (e.g. counts and lists)
      loadDashboard();
    };

    socket.onOrganizerUpdate(handleUpdate);
    socket.onLiveUpdate(handleUpdate);

    return () => {
      socket.offOrganizerUpdate(handleUpdate);
      socket.offLiveUpdate(handleUpdate);
      socket.leaveOrganizer(user.id);
    };
  }, [user, loadDashboard]);

  const value = {
    dashboard,
    loading,
    refresh: loadDashboard,
  };

  return (
    <OrganizerSyncContext.Provider value={value}>
      {children}
    </OrganizerSyncContext.Provider>
  );
};

export const useOrganizerSync = () => {
  const context = useContext(OrganizerSyncContext);
  if (!context) {
    throw new Error('useOrganizerSync must be used within OrganizerSyncProvider');
  }
  return context;
};
