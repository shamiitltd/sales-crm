import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('shamiit_crm_token') || null);
  const [user, setUser] = useState(null);
  const [googleDrive, setGoogleDrive] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session once on mount or explicitly when token changes via login
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      setLoading(true);

      // Check if token was provided in URL search params (e.g. from Google OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');

      // Clean URL immediately so reloading or history navigation does not re-trigger
      if (urlToken || urlParams.has('drive_status') || urlParams.has('google_sync')) {
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('token');
          // Note: keep drive_status/google_sync for App.jsx toast or clean if needed
          window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.searchParams.toString() ? '?' + cleanUrl.searchParams.toString() : ''));
        } catch {}
      }

      const activeToken = urlToken || localStorage.getItem('shamiit_crm_token');

      if (!activeToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setGoogleDrive(null);
          setLoading(false);
        }
        return;
      }

      // Persist in localStorage and state
      localStorage.setItem('shamiit_crm_token', activeToken);
      if (isMounted) {
        setToken(activeToken);
      }

      try {
        const me = await api.getMe(activeToken);
        if (isMounted && me) {
          setUser(me.user);
          setGoogleDrive(me.googleDrive);
        }
      } catch (err) {
        console.warn('Session check notice:', err.message);
        // Only clear token if server explicitly rejected auth (401/403)
        if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('Unauthorized') || err.message.includes('Forbidden'))) {
          localStorage.removeItem('shamiit_crm_token');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []); // Run ONCE on mount

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('shamiit_crm_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setGoogleDrive(data.googleDrive);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    localStorage.setItem('shamiit_crm_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setGoogleDrive(data.googleDrive);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('shamiit_crm_token');
    setToken(null);
    setUser(null);
    setGoogleDrive(null);
  };

  const refreshDriveStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await api.getGoogleStatus(token);
      setGoogleDrive(status);
    } catch (e) {
      console.error('Error refreshing Drive status:', e);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        googleDrive,
        loading,
        login,
        register,
        logout,
        refreshDriveStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
