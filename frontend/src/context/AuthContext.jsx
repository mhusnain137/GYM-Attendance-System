import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  MEMBER: 'MEMBER'
};

export const ROLE_LABELS = {
  SUPER_ADMIN: '👑 Super Admin (Software Creator)',
  ADMIN: '🏢 Admin (Gym Owner)',
  MANAGER: '👔 Manager (Supervisor)',
  RECEPTIONIST: '🛎️ Receptionist (Front Desk)',
  MEMBER: '🏋️ Gym Member (Customer Portal)'
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('gym_auth_token') || null;
    } catch (e) {
      return null;
    }
  });

  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem('gym_auth_role') || null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    if (isAuthenticated) {
      try {
        localStorage.setItem('gym_auth_token', token);
        localStorage.setItem('gym_auth_role', role);
        localStorage.setItem('gym_auth_user', JSON.stringify(user));
      } catch (e) {
        console.error('Error saving session:', e);
      }

      // Set global headers for API role guards
      axios.defaults.headers.common['X-User-Role'] = role || '';
      axios.defaults.headers.common['X-User-Id'] = user?.user_id || '';
    } else {
      try {
        localStorage.removeItem('gym_auth_token');
        localStorage.removeItem('gym_auth_role');
        localStorage.removeItem('gym_auth_user');
      } catch (e) {
        console.error('Error clearing session:', e);
      }
      delete axios.defaults.headers.common['X-User-Role'];
      delete axios.defaults.headers.common['X-User-Id'];
    }
  }, [token, role, user, isAuthenticated]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.data && res.data.status === 'success') {
        setToken(res.data.token);
        setRole(res.data.user.role);
        setUser(res.data.user);
        return { success: true };
      } else {
        return { success: false, message: 'Invalid credentials' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed';
      return { success: false, message: errorMsg };
    }
  };

  const loginAsMember = async (memberIdOrPhone) => {
    try {
      const res = await axios.post('/api/auth/login', {
        username: memberIdOrPhone.trim(),
        password: 'pass' // Member login by ID/Phone
      });

      if (res.data && res.data.status === 'success') {
        setToken(res.data.token);
        setRole(ROLES.MEMBER);
        setUser(res.data.user);
        return { success: true };
      } else {
        return { success: false, message: 'Member record not found' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Member lookup failed';
      return { success: false, message: errorMsg };
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isGymOwner = role === ROLES.ADMIN;
  const isManager = role === ROLES.MANAGER;
  const isReceptionist = role === ROLES.RECEPTIONIST;
  const isMember = role === ROLES.MEMBER;

  const canViewLeadsCRM = isSuperAdmin; // ONLY the software maker / SaaS Provider can view demo leads
  const canDelete = isAdmin;
  const canManageStaff = isAdmin;
  const canEditSettings = isAdmin;
  const canFreezePass = isAdmin || isManager;
  const canViewProfit = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      user,
      token,
      login,
      loginAsMember,
      logout,
      isSuperAdmin,
      isAdmin,
      isGymOwner,
      isManager,
      isReceptionist,
      isMember,
      canViewLeadsCRM,
      canDelete,
      canManageStaff,
      canEditSettings,
      canFreezePass,
      canViewProfit
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
