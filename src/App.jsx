import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Navbar } from './components/Navbar/Navbar';
import { Toast } from './components/Toast/Toast';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { PropertySearch } from './pages/PropertySearch/PropertySearch';
import { LandDetails } from './pages/LandDetails/LandDetails';
import { PropertySale } from './pages/PropertySale/PropertySale';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { currentView } = useNavigation();

  // If user is not authenticated, render Login view
  if (!isAuthenticated || currentView === 'login') {
    return (
      <div className="app-wrapper">
        <Login />
        <Toast />
      </div>
    );
  }

  // Authenticated application views
  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content-area" id="main-content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'search' && <PropertySearch />}
        {currentView === 'land-details' && <LandDetails />}
        {currentView === 'upload-sale' && <PropertySale />}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}
