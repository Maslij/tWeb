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
import { Box, CircularProgress, Typography } from '@mui/material';

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
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh' 
          }}
        >
          <CircularProgress sx={{ mb: 3 }} />
          <Typography>Checking license status...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
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
