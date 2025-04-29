import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

import apiService from '../services/api';

const LicenseSetup = () => {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasValidLicense, setHasValidLicense] = useState(false);

  // Check license status on component mount
  useEffect(() => {
    const checkLicense = async () => {
      setCheckingLicense(true);
      try {
        const status = await apiService.license.getStatus();
        if (status && status.valid) {
          setHasValidLicense(true);
          // If we have a valid license, redirect to home
          setTimeout(() => navigate('/'), 1500);
        } else {
          setHasValidLicense(false);
        }
      } catch (err) {
        console.error('Error checking license:', err);
        setError('Could not verify license status. Please try again.');
      } finally {
        setCheckingLicense(false);
        setLoading(false);
      }
    };

    checkLicense();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Please enter a valid license key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await apiService.license.setLicense(licenseKey);
      if (success) {
        setHasValidLicense(true);
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError('Invalid license key. Please try again.');
      }
    } catch (err) {
      console.error('Error setting license key:', err);
      setError('Failed to activate license. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingLicense) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" my={5}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Checking license status...</Typography>
        </Box>
      </Container>
    );
  }

  if (hasValidLicense) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          License valid! Redirecting to dashboard...
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mb={4}
        >
          <LockIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            License Activation
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Please enter your license key to continue using the Vision Dashboard.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box
            display="flex"
            flexDirection="column"
            gap={3}
          >
            <TextField
              required
              fullWidth
              id="licenseKey"
              name="licenseKey"
              label="License Key"
              value={licenseKey}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your license key"
              autoFocus
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading || !licenseKey.trim()}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Activating...' : 'Activate License'}
            </Button>

            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Don't have a license? Contact your administrator to obtain one.
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default LicenseSetup; 