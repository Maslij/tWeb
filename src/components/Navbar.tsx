import { Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggleIcon from './ThemeToggleIcon';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Container,
  Tooltip,
  Link,
  Chip,
  Badge
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import apiService, { LicenseStatus } from '../services/api';

// Get app version from Vite environment or fallback to default
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(false);
  const [checkingLicense, setCheckingLicense] = useState<boolean>(true);

  // Check license status on component mount
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await apiService.license.getStatus();
        setLicenseStatus(status);
        setIsLicenseValid(status?.valid || false);
      } catch (err) {
        console.error('Error checking license:', err);
        setIsLicenseValid(false);
      } finally {
        setCheckingLicense(false);
      }
    };

    checkLicense();

    // Periodically check license status every 5 minutes
    const intervalId = setInterval(checkLicense, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <VideocamIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Vision Dashboard
          </Typography>

          {/* Mobile logo */}
          <VideocamIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Vision
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex' }}>
            <Button
              component={RouterLink}
              to="/"
              sx={{ my: 2, color: 'inherit', display: 'block' }}
            >
              Cameras
            </Button>
          </Box>

          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
            {/* Version indicator */}
            <Tooltip title="Application Version">
              <Chip 
                label={`v${APP_VERSION}`} 
                size="small" 
                variant="outlined"
                sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.3)' }}
              />
            </Tooltip>
            
            {/* License status indicator */}
            <Tooltip title={
              isLicenseValid 
                ? "License valid" 
                : checkingLicense 
                  ? "Checking license..." 
                  : "License invalid or expired"
            }>
              <Chip
                icon={isLicenseValid 
                  ? <VerifiedIcon fontSize="small" /> 
                  : <ErrorOutlineIcon fontSize="small" />
                }
                label={isLicenseValid ? "Licensed" : "Unlicensed"}
                color={isLicenseValid ? "success" : "error"}
                size="small"
                sx={{ mr: 2 }}
                onClick={() => !isLicenseValid && window.location.pathname !== '/license' && (window.location.href = '/license')}
                clickable={!isLicenseValid}
              />
            </Tooltip>
            
            <Tooltip title="Add new camera">
              <Button
                component={RouterLink}
                to="/cameras/new"
                variant="outlined"
                color="inherit"
                startIcon={<AddIcon />}
                sx={{ mr: 2 }}
              >
                New Camera
              </Button>
            </Tooltip>
            <Tooltip title={`Current theme: ${theme}. Click to cycle themes.`}>
              <IconButton onClick={toggleTheme} color="inherit">
                <ThemeToggleIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 