import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar/Navbar';
import { Toast } from './components/Toast/Toast';
import { LandingPage } from './pages/LandingPage/LandingPage';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { PropertySearch } from './pages/PropertySearch/PropertySearch';
import { LandDetails } from './pages/LandDetails/LandDetails';
import { PropertySale } from './pages/PropertySale/PropertySale';
import { Marketplace } from './pages/Marketplace/Marketplace';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { currentView } = useNavigation();

  // Public visitor routes
  if (!isAuthenticated) {
    if (currentView === 'login') {
      return (
        <div className="app-wrapper">
          <Login />
          <Toast />
        </div>
      );
    }
    return (
      <div className="app-wrapper">
        <LandingPage />
        <Toast />
      </div>
    );
  }

  // If authenticated user specifically navigates to public landing
  if (currentView === 'landing') {
    return (
      <div className="app-wrapper">
        <LandingPage />
        <Toast />
      </div>
    );
  }

  // Authenticated workspace views
  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content-area" id="main-content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'search' && <PropertySearch />}
        {currentView === 'marketplace' && <Marketplace />}
        {currentView === 'land-details' && <LandDetails />}
        {currentView === 'upload-sale' && <PropertySale />}
        {currentView === 'login' && <Dashboard />}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
