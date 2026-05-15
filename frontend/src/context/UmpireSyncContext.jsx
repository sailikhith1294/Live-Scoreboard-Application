import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import api from '../services/api';
import { useAuth } from './AuthContext';

const UmpireSyncContext = createContext();

export const useUmpireSync = () => {
  const context = useContext(UmpireSyncContext);
  if (!context) {
    throw new Error('useUmpireSync must be used within UmpireSyncProvider');
  }
  return context;
};

export const UmpireSyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/umpire/dashboard');
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
    } catch (error) {
      console.error('Failed to load umpire matches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'umpire' && user.role !== 'admin')) {
      if (user) setLoading(false);
      return;
    }

    loadMatches();

    try {
      if (!socket.connected) socket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    socket.joinUmpire(user.id);

    // Umpires listen for organizer updates too as they might be assigned to new matches
    const handleOrganizerUpdate = () => loadMatches();
    socket.onOrganizerUpdate(handleOrganizerUpdate);

    return () => {
      socket.offOrganizerUpdate(handleOrganizerUpdate);
      socket.leaveUmpire(user.id);
    };
  }, [user, loadMatches]);

  const value = {
    matches,
    loading,
    refresh: loadMatches,
  };

  return (
    <UmpireSyncContext.Provider value={value}>
      {children}
    </UmpireSyncContext.Provider>
  );
};
