import { createContext, useContext, useState } from 'react';
import { MOCK_LAND_PARCELS } from '../data/mockLandData';
import { useAuth } from './AuthContext';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  // Default view: landing for unauthenticated, otherwise search (handled by login)
  const [currentView, setCurrentView] = useState('landing');
  const [selectedLand, setSelectedLand] = useState(MOCK_LAND_PARCELS[0]);
  const [toast, setToast] = useState(null);

  function navigateTo(view, data = null) {
    console.log('Navigating to', view);
    if (data && view === 'land-details') {
      setSelectedLand(data);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message, type = 'success') {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  }

  function clearToast() {
    setToast(null);
  }

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        navigateTo,
        selectedLand,
        setSelectedLand,
        toast,
        showToast,
        clearToast,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
