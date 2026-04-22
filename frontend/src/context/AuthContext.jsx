import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('cto_token'));
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
        localStorage.removeItem('cto_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('cto_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('cto_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const requestSignupOtp = async ({ email, phone, channel }) => {
    const { data } = await api.post('/auth/signup/otp/request', { email, phone, channel });
    return data;
  };

  const verifySignupOtp = async ({ email, phone, channel, otp }) => {
    const { data } = await api.post('/auth/signup/otp/verify', { email, phone, channel, otp });
    return data;
  };

  const requestLoginOtp = async ({ identifier }) => {
    const { data } = await api.post('/auth/login/otp/request', { identifier });
    return data;
  };

  const loginWithOtp = async ({ identifier, otp }) => {
    const { data } = await api.post('/auth/login/otp/verify', { identifier, otp });
    localStorage.setItem('cto_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('cto_token');
    setToken(null);
    setUser(null);
  };

  const primaryRole = (() => {
    const role = String(user?.role || 'viewer').toLowerCase();
    if (role === 'viewer') return 'user';
    if (role === 'organizer') return 'organizer';
    return role;
  })();

  // Permission system compatibility for legacy components.
  const canPermission = () => true;

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
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
