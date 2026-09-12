import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { BioAgentProvider } from './context/BioAgentContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/layout/AppShell.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import DemoLogin from './components/DemoLogin.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BioLens from './pages/BioLens.jsx';
import Weather from './pages/Weather.jsx';
import About from './pages/About.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BioAgentProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/demo" element={<DemoLogin />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/biolens" element={<BioLens />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/about" element={<About />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BioAgentProvider>
    </AuthProvider>
  );
}
