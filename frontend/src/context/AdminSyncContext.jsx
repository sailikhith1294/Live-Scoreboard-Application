import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const AdminSyncContext = createContext();

export const useAdminSync = () => {
  const context = useContext(AdminSyncContext);
  if (!context) {
    throw new Error('useAdminSync must be used within AdminSyncProvider');
  }
  return context;
};

export const AdminSyncProvider = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState({
    users: [],
    tournaments: [],
    activities: [],
    stats: { users: 0, tournaments: 0, matches: 0, balls: 0, organizers: 0 },
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [usersRes, tournamentsRes, matchesRes, activitiesRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/tournaments'),
        api.get('/admin/matches'),
        api.get('/admin/activity'),
        api.get('/admin/stats'),
      ]);

      setData({
        users: Array.isArray(usersRes.data) ? usersRes.data : [],
        tournaments: Array.isArray(tournamentsRes.data) ? tournamentsRes.data : [],
        matches: Array.isArray(matchesRes.data) ? matchesRes.data : [],
        activities: Array.isArray(activitiesRes.data) ? activitiesRes.data : [],
        stats: statsRes.data || { users: 0, tournaments: 0, matches: 0, balls: 0, organizers: 0 },
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      if (user) setLoading(false);
      return;
    }

    loadAll();

    try {
      if (!socket.connected) socket.connect();
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    socket.joinAdmin();

    const handleUpdate = (update) => {
      console.log('🛡️ Admin update received:', update);
      loadAll(); // Re-sync for consistency

      const messages = {
        organizer_approved: 'Organizer approval status updated',
        user_role_updated: 'User role has been modified',
        promotion_decided: 'Promotion request has been processed',
        user_status_toggled: 'User account status toggled',
      };

      if (messages[update.type]) {
        toast.success(messages[update.type], { icon: '🛡️' });
      }
    };

    socket.onAdminUpdate(handleUpdate);

    return () => {
      socket.offAdminUpdate(handleUpdate);
      socket.leaveAdmin();
    };
  }, [user, loadAll]);

  const value = {
    ...data,
    loading,
    refresh: loadAll,
  };

  return (
    <AdminSyncContext.Provider value={value}>
      {children}
    </AdminSyncContext.Provider>
  );
};
