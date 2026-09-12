import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, signupUser, verifyAuthToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token') || null;
  });
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bioagent_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate existing token against backend /auth/verify
  const verifyToken = useCallback(async (tokenToVerify) => {
    const targetToken = tokenToVerify || token || localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');
    if (!targetToken) {
      return { valid: false };
    }
    try {
      const res = await verifyAuthToken(targetToken);
      if (res && res.valid) {
        setUser((prev) => ({
          user_id: res.user_id,
          username: res.username,
          ...(prev || {}),
        }));
        return res;
      }
      return { valid: false };
    } catch (err) {
      console.warn('Token verification error:', err.message);
      return { valid: false, error: err.message };
    }
  }, [token]);

  // Validate on mount
  useEffect(() => {
    let mounted = true;
    async function checkToken() {
      const existingToken = localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');
      if (!existingToken) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await verifyAuthToken(existingToken);
        if (mounted && res && res.valid) {
          setUser((prev) => ({
            user_id: res.user_id,
            username: res.username,
            ...(prev || {}),
          }));
        } else {
          throw new Error('Token is not valid');
        }
      } catch (err) {
        console.warn('Auth token invalid or expired on load, resetting session:', err.message);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('bioagent_token');
        localStorage.removeItem('bioagent_user');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkToken();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await loginUser(username, password);
    if (res && res.access_token) {
      localStorage.setItem('auth_token', res.access_token);
      localStorage.setItem('bioagent_token', res.access_token);
      const userInfo = {
        user_id: res.user_id,
        username: res.username,
      };
      localStorage.setItem('bioagent_user', JSON.stringify(userInfo));
      setToken(res.access_token);
      setUser(userInfo);
    }
    return res;
  }, []);

  const signup = useCallback(async (username, email, password) => {
    const res = await signupUser(username, email, password);
    // Automatically authenticate on successful registration
    const loginRes = await loginUser(username, password);
    if (loginRes && loginRes.access_token) {
      localStorage.setItem('auth_token', loginRes.access_token);
      localStorage.setItem('bioagent_token', loginRes.access_token);
      const userInfo = {
        user_id: loginRes.user_id,
        username: loginRes.username,
        email: email,
      };
      localStorage.setItem('bioagent_user', JSON.stringify(userInfo));
      setToken(loginRes.access_token);
      setUser(userInfo);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('bioagent_token');
    localStorage.removeItem('bioagent_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    signup,
    logout,
    verifyToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
