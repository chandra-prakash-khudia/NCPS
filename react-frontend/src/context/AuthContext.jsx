import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  getAuthToken,
  getMe,
  getStoredUser,
  googleLoginAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  setAuthSession,
  updateStoredUser,
} from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [initializing, setInitializing] = useState(() => Boolean(getAuthToken()));

  const clearSession = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setInitializing(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAuthToken()) {
      clearSession();
      return null;
    }
    const res = await getMe();
    const nextUser = res.data.user;
    setUser(nextUser);
    updateStoredUser(nextUser);
    return nextUser;
  }, [clearSession]);

  useEffect(() => {
    const handleExpired = () => clearSession();
    window.addEventListener('ncps-auth-expired', handleExpired);
    return () => window.removeEventListener('ncps-auth-expired', handleExpired);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const nextUser = await refreshUser();
        if (!cancelled && nextUser) {
          setInitializing(false);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token, refreshUser, clearSession]);

  const login = useCallback(async (payload) => {
    const res = await loginAccount(payload);
    setAuthSession(res.data.access_token, res.data.user);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await registerAccount(payload);
    setAuthSession(res.data.access_token, res.data.user);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await googleLoginAccount(credential);
    setAuthSession(res.data.access_token, res.data.user);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await logoutAccount();
      }
    } catch {
      // Token is cleared locally even if the server is unavailable.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({
    initializing,
    isAuthenticated: Boolean(token && user),
    login,
    loginWithGoogle,
    logout,
    refreshUser,
    register,
    token,
    user,
  }), [initializing, login, loginWithGoogle, logout, refreshUser, register, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
