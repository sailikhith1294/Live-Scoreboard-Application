import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(sessionStorage.getItem('cto_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (error) {
        sessionStorage.removeItem('cto_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      sessionStorage.setItem('cto_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', payload);
      sessionStorage.setItem('cto_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const requestSignupOtp = async ({ email }) => {
    const { data } = await api.post('/auth/signup/otp/request', { email });
    return data;
  };

  const verifySignupOtp = async ({ email, otp }) => {
    const { data } = await api.post('/auth/signup/otp/verify', { email, otp });
    return data;
  };

  const requestLoginOtp = async ({ identifier }) => {
    const { data } = await api.post('/auth/login/otp/request', { identifier });
    return data;
  };

  const loginWithOtp = async ({ identifier, otp }) => {
    const { data } = await api.post('/auth/login/otp/verify', { identifier, otp });
    sessionStorage.setItem('cto_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    sessionStorage.removeItem('cto_token');
    setToken(null);
    setUser(null);
  };

  const primaryRole = (() => {
    const role = String(user?.role || 'viewer').toLowerCase();
    // 'viewer' is the default role for registered users, which maps to the 'user' dashboard.
    if (role === 'viewer' || role === 'user') return 'user';
    if (role === 'organizer') return 'organizer';
    if (role === 'admin') return 'admin';
    if (role === 'umpire') return 'umpire';
    if (role === 'player') return 'player';
    return 'user';
  })();

  // Permission system compatibility for legacy components.
  const canPermission = () => true;

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      primaryRole,
      canPermission,
      login,
      loginWithOtp,
      signup,
      requestSignupOtp,
      verifySignupOtp,
      requestLoginOtp,
      logout,
    }),
    [token, user, loading, primaryRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
