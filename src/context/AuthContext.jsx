import { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USER } from '../data/mockLandData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('project_green_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (user) {
      localStorage.setItem('project_green_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('project_green_user');
    }
  }, [user]);

  function login(credentials) {
    // If logging in with demo email or any custom email
    const email = credentials.email?.trim().toLowerCase();
    let authenticatedUser;

    if (email === DEMO_USER.email.toLowerCase() || email === 'admin@projectgreen.in') {
      authenticatedUser = { ...DEMO_USER };
    } else {
      // Create user profile based on input email
      const nameFromEmail = credentials.email.split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      authenticatedUser = {
        name: nameFromEmail || 'Citizen Researcher',
        email: credentials.email,
        role: 'Verified Citizen Researcher',
        accountType: 'Karnataka Citizen Portal Account',
        avatar: (nameFromEmail || 'CR').slice(0, 2).toUpperCase(),
        primaryDistrict: 'Mysuru',
        phone: '+91 98000 00000',
        verifiedLandsCount: 0,
        savedParcelsCount: 1
      };
    }

    setUser(authenticatedUser);
    return authenticatedUser;
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
