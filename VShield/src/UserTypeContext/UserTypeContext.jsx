import React, { createContext, useState, useContext, useEffect } from 'react';

const UserTypeContext = createContext();

// EXACT STANDARDIZED PERMISSION MATRIX
// Keys directly map to route paths and layout navigation permissions
export const ROLE_PERMISSIONS = {
  'Admin': [
    'start-campaign',
    'scenarios',
    'campaigns',
    'training',
    'landing-page-catalogue',
    'announcements',
    'user-dls',
    'email-domains',
    'requests-approvals',
    'gamification-engine',
    'analytics',
    'my-space',
    'my-training'
  ],
  'Campaign Creator': [
    'start-campaign',
    'scenarios',
    'campaigns',
    'training',
    'landing-page-catalogue',
    'announcements',
    'user-dls',
    'email-domains',
    'requests-approvals',
    'analytics',
    'my-space',
    'my-training'
  ],
  'Campaign Manager': [
    'start-campaign',
    'scenarios',
    'campaigns',
    'training',
    'landing-page-catalogue',
    'announcements',
    'user-dls',
    'email-domains',
    'requests-approvals',
    'analytics',
    'my-space',
    'my-training'
  ],
  'Gamification Engine Manager': [
    'gamification-engine',
    'analytics',
    'my-space',
    'my-training'
  ],
  'Regular User': [
    'my-space',
    'my-training'
  ],
  'GMT': [
    'analytics',
    'my-space',
    'my-training'
  ]
};

export const UserTypeProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('voisshield_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const login = (role, password) => {
    if (password === '123456') {
      const normalizedRole = role === 'GMT (Leadership)' ? 'GMT' : role;
      const userData = {
        role: normalizedRole,
        permissions: ROLE_PERMISSIONS[normalizedRole] || []
      };
      setUser(userData);
      try {
        localStorage.setItem('voisshield_active_user', JSON.stringify(userData));
      } catch (e) {
        console.error(e);
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('voisshield_active_user');
    } catch (e) {
      console.error(e);
    }
  };

  const hasAccess = (permission) => {
    if (permission === 'always') return true;
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  // Helper to find the first accessible route when entering dashboard
  const getDefaultRoute = () => {
    if (!user || user.permissions.length === 0) return '/home';
    const firstPerm = user.permissions[0];
    if (firstPerm === 'scenarios') return '/create-scenario';
    if (firstPerm === 'training') return '/add-training';
    return `/${firstPerm}`;
  };

  return (
    <UserTypeContext.Provider
      value={{
        user,
        login,
        logout,
        isDark,
        setIsDark,
        hasAccess,
        getDefaultRoute
      }}
    >
      {children}
    </UserTypeContext.Provider>
  );
};

export const useUserType = () => useContext(UserTypeContext);