import React, { createContext, useState, useContext, useEffect } from 'react';

const UserTypeContext = createContext();

// EXACT STANDARDIZED PERMISSION MATRIX
// 'home' is restricted to Admin, Campaign Creator, and Campaign Manager only
// 'leaderboard' (nav item + /leaderboard page) is every role except Regular User;
// everyone, Regular User included, can open it from the My Space LEADERBOARD button
export const ROLE_PERMISSIONS = {
  'Admin': [
    'home',
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
    'leaderboard',
    'my-space',
    'my-training'
  ],
  'Campaign Creator': [
    'home',
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
    'leaderboard',
    'my-space',
    'my-training'
  ],
  'Campaign Manager': [
    'home',
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
    'leaderboard',
    'my-space',
    'my-training'
  ],
  'Gamification Engine Manager': [
    'gamification-engine',
    'leaderboard',
    'my-space',
    'my-training'
  ],
  'Regular User': [
    'my-space',
    'my-training'
  ],
  'GMT': [
    'analytics',
    'leaderboard',
    'my-space',
    'my-training'
  ]
};

// ROLE-SPECIFIC DEFAULT LANDING ROUTES
export const ROLE_DEFAULT_ROUTES = {
  'Admin': '/home',
  'Campaign Creator': '/home',
  'Campaign Manager': '/home',
  'Regular User': '/my-space',
  'Gamification Engine Manager': '/gamification',
  'GMT': '/analytics'
};

export const UserTypeProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('voisshield_active_user') || localStorage.getItem('voisshield_current_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.role) {
        parsed.permissions = ROLE_PERMISSIONS[parsed.role] || [];
      }
      return parsed;
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

  const login = (role, password, userProfile = null) => {
    if (password === '123456') {
      const normalizedRole = role === 'GMT (Leadership)' ? 'GMT' : role;
      const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
      
      const userData = {
        ...(userProfile || {}),
        role: normalizedRole,
        permissions
      };

      setUser(userData);
      try {
        localStorage.setItem('voisshield_active_user', JSON.stringify(userData));
        localStorage.setItem('voisshield_current_user', JSON.stringify(userData));
        localStorage.setItem('voisshield_user_role', normalizedRole);
        sessionStorage.setItem('voisshield_active_user', JSON.stringify(userData));
        sessionStorage.setItem('voisshield_current_user', JSON.stringify(userData));
      } catch (e) {
        console.error('Storage write error:', e);
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('voisshield_active_user');
      localStorage.removeItem('voisshield_current_user');
      localStorage.removeItem('voisshield_user_role');
      sessionStorage.removeItem('voisshield_active_user');
      sessionStorage.removeItem('voisshield_current_user');
    } catch (e) {
      console.error('Storage removal error:', e);
    }
  };

  const hasAccess = (permission) => {
    if (permission === 'always') return true;
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Helper to find the first accessible default route by role
  const getDefaultRoute = (customUser = user) => {
    if (!customUser) return '/';
    // Unknown roles go to /my-space (open to everyone); '/home' would loop via its 'home' guard
    return ROLE_DEFAULT_ROUTES[customUser.role] || '/my-space';
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