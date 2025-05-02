import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import NewCamera from './pages/cameras/NewCamera';
import PipelineBuilder from './pages/cameras/PipelineBuilder';
import LicenseSetup from './pages/LicenseSetup';
import apiService from './services/api';
import { Box, CircularProgress, Typography, CssBaseline, Paper, Card, CardContent, Container } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import LockIcon from '@mui/icons-material/Lock';

function App() {
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const licenseStatus = await apiService.license.getStatus();
        setHasLicense(licenseStatus?.valid || false);
      } catch (error) {
        console.error('Error checking license:', error);
        setHasLicense(false);
      } finally {
        setLicenseChecked(true);
        setCheckingLicense(false);
      }
    };

    checkLicense();
  }, []);

  if (checkingLicense) {
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
                </Box>
                
                <Box sx={{ position: 'relative', height: 60, my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 500, color: 'text.secondary' }}>
                      Checking license status...
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
          {licenseChecked && hasLicense && <Navbar />}
          <main className="content">
            <Routes>
              {/* License check route */}
              <Route 
                path="/license" 
                element={<LicenseSetup />} 
              />
              
              {/* Protected routes */}
              <Route 
                path="/" 
                element={
                  licenseChecked && !hasLicense ? (
                    <Navigate to="/license" replace />
                  ) : (
                    <Dashboard />
                  )
                } 
              />
              <Route 
                path="/cameras/new" 
                element={
                  licenseChecked && !hasLicense ? (
                    <Navigate to="/license" replace />
                  ) : (
                    <NewCamera />
                  )
                } 
              />
              <Route 
                path="/cameras/:cameraId/pipeline" 
                element={
                  licenseChecked && !hasLicense ? (
                    <Navigate to="/license" replace />
                  ) : (
                    <PipelineBuilder />
                  )
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
