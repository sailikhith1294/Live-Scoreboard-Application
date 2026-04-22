import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { getStoredSession } from '../utils/authSession';

const TournamentContext = createContext();

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider');
  }
  return context;
};

export const TournamentProvider = ({ children }) => {
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentLeague, setCurrentLeague] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch user's leagues
  const fetchMyLeagues = useCallback(async () => {
    try {
      setLoading(true);
      const { token } = getStoredSession('tournament-manager');
      const response = await axios.get(`${API_BASE}/tournament/my-leagues`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setLeagues(response.data.data);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's teams
  const fetchMyTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { token } = getStoredSession('tournament-manager');
      const response = await axios.get(`${API_BASE}/tournament/my-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTeams(response.data.data);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new league
  const createLeague = useCallback(async (leagueData) => {
    try {
      setLoading(true);
      const { token } = getStoredSession('tournament-manager');
      const response = await axios.post(`${API_BASE}/tournament/leagues`, leagueData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setLeagues([response.data.data, ...leagues]);
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create league';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [leagues]);

  // Create new team
  const createTeam = useCallback(async (teamData) => {
    try {
      setLoading(true);
      const { token } = getStoredSession('tournament-manager');
      const response = await axios.post(`${API_BASE}/tournament/teams`, teamData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTeams([response.data.data, ...teams]);
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create team';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [teams]);

  // Add player to team
  const addPlayerToTeam = useCallback(async (teamId, playerData) => {
    try {
      setLoading(true);
      const { token } = getStoredSession('tournament-manager');
      const response = await axios.post(
        `${API_BASE}/tournament/teams/${teamId}/add-player`,
        playerData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update team in state
        setTeams(teams.map(t => t._id === teamId ? response.data.data : t));
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add player';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [teams]);

  // Fetch public leagues
  const fetchPublicLeagues = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const response = await axios.get(`${API_BASE}/tournament/leagues-public?${queryParams}`);

      if (response.data.success) {
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch public leagues';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single league with teams
  const getLeagueDetails = useCallback(async (leagueId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/tournament/leagues/${leagueId}`);

      if (response.data.success) {
        setCurrentLeague(response.data.data);
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch league details';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single team details
  const getTeamDetails = useCallback(async (teamId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/tournament/teams/${teamId}`);

      if (response.data.success) {
        setCurrentTeam(response.data.data);
        setError(null);
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch team details';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  // clear errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    leagues,
    teams,
    currentLeague,
    currentTeam,
    loading,
    error,

    // Methods
    fetchMyLeagues,
    fetchMyTeams,
    createLeague,
    createTeam,
    addPlayerToTeam,
    fetchPublicLeagues,
    getLeagueDetails,
    getTeamDetails,
    setCurrentLeague,
    setCurrentTeam,
    clearError
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};
