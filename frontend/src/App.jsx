import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';


// Page Components
import LandingPage from './pages/LandingPage';
import ProfileSetup from './pages/ProfileSetup';
import JobListing from './pages/JobListing';
import JobDetail from './pages/JobDetail';
import RoadmapView from './pages/RoadmapView';
import AppliedJobs from './pages/AppliedJobs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RankingsPage from './pages/CampusRankings';

// Helper: Scroll to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Wrapper for Private Routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-slate-50">

        <Navbar />
        
        <main className="grow">
          <Routes>
            {/* Public Access */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/jobs" element={<JobListing />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Authenticated Only Access */}
            <Route path="/profile" element={
              <ProtectedRoute><ProfileSetup /></ProtectedRoute>
            } />
            
            <Route path="/jobs/:id" element={
              <ProtectedRoute><JobDetail /></ProtectedRoute>
            } />
            
            <Route path="/roadmap" element={
              <ProtectedRoute><RoadmapView /></ProtectedRoute>
            } />
            
            <Route path="/applied" element={
              <ProtectedRoute><AppliedJobs /></ProtectedRoute>
            } />
            
            <Route path="/rankings" element={
              <ProtectedRoute><RankingsPage /></ProtectedRoute>
            } />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <Footer />

        {/* Global Notification System */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#2563eb',
                secondary: '#ffffff',
              },
            },
          }} 
        />
      </div>
    </Router>
  );
}

export default App;