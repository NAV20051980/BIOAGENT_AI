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

  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token')));
  const [error, setError] = useState(null);

  // Validate on mount
  useEffect(() => {
    const verifyStoredToken = async () => {
      setLoading(true);
      const storedToken = localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');

      // If no token, just set unauthenticated and return
      if (!storedToken) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // Try to verify the token
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          // Token is invalid/expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('bioagent_token');
          localStorage.removeItem('bioagent_user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError(null); // Don't show error
        }
      } catch (error) {
        // Network error or other issue - just log it, don't show "Load failed"
        console.error('Token verification error:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('bioagent_token');
        localStorage.removeItem('bioagent_user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null); // Don't show error
      } finally {
        setLoading(false);
      }
    };

    verifyStoredToken();
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
      setIsAuthenticated(true);
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
      setIsAuthenticated(true);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('bioagent_token');
    localStorage.removeItem('bioagent_user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    token,
    user,
    loading,
    error,
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
