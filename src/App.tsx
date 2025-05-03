import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, ReactElement } from 'react';
import './App.css';
import Navbar, { notifyLicenseChanged, LICENSE_CHANGE_EVENT } from './components/Navbar';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import NewCamera from './pages/cameras/NewCamera';
import PipelineBuilder from './pages/cameras/PipelineBuilder';
import LicenseSetup from './pages/LicenseSetup';
import apiService, { LicenseStatus } from './services/api';
import { Box, CircularProgress, Typography, CssBaseline, Paper, Card, CardContent, Container, Chip } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getVersionString } from './utils/version';

// Higher-order component to protect routes that require a valid license
const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [checkingError, setCheckingError] = useState<string | null>(null);
  
  // Function to check license status
  const checkLicense = async () => {
    console.log('ProtectedRoute: Checking license status');
    try {
      const status = await apiService.license.getStatus();
      console.log('ProtectedRoute: License status:', status);
      
      // If license status changed, notify
      if (!licenseStatus || 
          (status && licenseStatus && (
            status.valid !== licenseStatus.valid || 
            status.tier !== licenseStatus.tier)
          )) {
        console.log('ProtectedRoute: License status changed, notifying');
        setLicenseStatus(status);
        // If the license status has changed, notify the navbar
        notifyLicenseChanged();
      } else {
        setLicenseStatus(status);
      }
    } catch (err: any) {
      console.error('Error checking license in protected route:', err);
      setCheckingError(err.response?.status === 401 
        ? 'License is invalid or expired' 
        : 'Failed to verify license status');
      
      // If we previously had a valid license but now don't, notify
      if (licenseStatus?.valid) {
        console.log('ProtectedRoute: License became invalid, notifying');
        notifyLicenseChanged();
      }
    } finally {
      setLicenseChecked(true);
    }
  };
  
  // Check license on mount and when LICENSE_CHANGE_EVENT is fired
  useEffect(() => {
    // Initial check
    checkLicense();
    
    // Listen for license change events
    const handleLicenseChange = () => {
      console.log('ProtectedRoute: License change event received');
      checkLicense();
    };
    
    window.addEventListener(LICENSE_CHANGE_EVENT, handleLicenseChange);
    
    return () => {
      window.removeEventListener(LICENSE_CHANGE_EVENT, handleLicenseChange);
    };
  }, []);
  
  if (!licenseChecked) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '70vh',
        }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Verifying license...
        </Typography>
      </Box>
    );
  }
  
  // Redirect to license page if license check failed or license is invalid
  if (checkingError || !licenseStatus?.valid) {
    return <Navigate to="/license" replace />;
  }
  
  return children;
};

function App() {
  const [initialLicenseChecked, setInitialLicenseChecked] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const versionString = getVersionString();

  useEffect(() => {
    const checkInitialLicense = async () => {
      try {
        const status = await apiService.license.getStatus();
        setLicenseStatus(status);
      } catch (error) {
        console.error('Error checking initial license:', error);
        setLicenseStatus(null);
      } finally {
        setInitialLicenseChecked(true);
      }
    };

    checkInitialLicense();
  }, []);

  if (!initialLicenseChecked) {
    return (
      <ThemeProvider>
        <CssBaseline />
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            backgroundColor: 'background.default',
            color: 'text.primary'
          }}
        >
          <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
            <Card elevation={2} sx={{ 
              py: 4, 
              px: 2, 
              borderRadius: 2, 
              maxWidth: 400, 
              mx: 'auto',
              boxShadow: 3
            }}>
              <CardContent>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                  <VideocamIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="h1" fontWeight={600} gutterBottom>
                    Vision Dashboard
                  </Typography>
                  <Chip 
                    label={versionString} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 1, borderColor: 'rgba(0,0,0,0.2)' }} 
                  />
                </Box>
                
                <Box sx={{ position: 'relative', height: 60, my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 500, color: 'text.secondary' }}>
                      Initializing system...
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Secure license verification in progress
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <div className="app">
          {/* Always show Navbar, it will handle its own license status display */}
          <Navbar />
          <main className="content">
            <Routes>
              {/* License page is always accessible */}
              <Route 
                path="/license" 
                element={<LicenseSetup />} 
              />
              
              {/* Protected routes using the ProtectedRoute HOC */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/cameras/new" 
                element={
                  <ProtectedRoute>
                    <NewCamera />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/cameras/:cameraId/pipeline" 
                element={
                  <ProtectedRoute>
                    <PipelineBuilder />
                  </ProtectedRoute>
                } 
              />
              
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
