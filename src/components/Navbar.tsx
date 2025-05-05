import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggleIcon from './ThemeToggleIcon';
import LicenseBadge from './LicenseBadge';
import appConfig from '../utils/appConfig';
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
import StarIcon from '@mui/icons-material/Star';
import DiamondIcon from '@mui/icons-material/Diamond';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LockIcon from '@mui/icons-material/Lock';
import apiService, { LicenseStatus } from '../services/api';
import { getVersionString } from '../utils/version';
import { LICENSE_CHANGED_EVENT } from '../pages/LicenseSetup';

// Get version display string
const VERSION_DISPLAY = getVersionString();

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(false);
  const [checkingLicense, setCheckingLicense] = useState<boolean>(true);
  const location = useLocation();
  const previousPath = useRef<string>('');
  const licenseCheckTimer = useRef<number | null>(null);

  // Check license status immediately and then periodically
  const checkLicense = async () => {
    setCheckingLicense(true);
    try {
      const status = await apiService.license.getStatus();
      setLicenseStatus(status);
      
      // Check the actual validity (using the new isValid field)
      const valid = status?.valid === true;
      setIsLicenseValid(valid);

      if (!valid && window.location.pathname !== '/license') {
        // If license is invalid and we're not already on the license page, show a warning
        console.warn('License is invalid or missing. Access to features may be restricted.');
      }
    } catch (err: any) {
      console.error('Error checking license:', err);
      setIsLicenseValid(false);
      
      // If we get a 401 Unauthorized, it means the license is invalid
      if (err.response && err.response.status === 401) {
        // If we're not on the license page, redirect to it
        if (window.location.pathname !== '/license') {
          window.location.href = '/license';
        }
      }
    } finally {
      setCheckingLicense(false);
    }
  };

  // Initial setup and periodic checks
  useEffect(() => {
    checkLicense();

    // Periodically check license status every minute
    const intervalId = setInterval(checkLicense, 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
      // Also clear our visibilityChange timer if it exists
      if (licenseCheckTimer.current) {
        window.clearTimeout(licenseCheckTimer.current);
      }
    };
  }, []);
  
  // Listen for license change events from other components
  useEffect(() => {
    const handleLicenseChanged = () => {
      console.log('License change detected, refreshing status...');
      checkLicense();
    };
    
    // Add event listener for custom license change events
    document.addEventListener(LICENSE_CHANGED_EVENT, handleLicenseChanged);
    
    return () => {
      document.removeEventListener(LICENSE_CHANGED_EVENT, handleLicenseChanged);
    };
  }, []);

  // Check for page visibility changes to refresh license when user comes back to the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Wait a short period after becoming visible before checking
        // This gives time for any backend changes to take effect
        if (licenseCheckTimer.current) {
          window.clearTimeout(licenseCheckTimer.current);
        }
        
        licenseCheckTimer.current = window.setTimeout(() => {
          checkLicense();
          licenseCheckTimer.current = null;
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check license when navigating back from license page
  useEffect(() => {
    // If we've just navigated from /license to another page, refresh license status
    if (previousPath.current === '/license' && location.pathname !== '/license') {
      checkLicense();
    }
    
    // Store current path for next comparison
    previousPath.current = location.pathname;
  }, [location.pathname]);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Helper function to get tier display text and associated properties
  const getTierInfo = () => {
    if (!licenseStatus?.tier || !isLicenseValid) {
      return {
        label: 'Unlicensed',
        icon: <LockIcon fontSize="small" />,
        color: 'default',
        backgroundColor: '#6e6e6e',
        textColor: '#ffffff'
      };
    }
    
    const tier = licenseStatus.tier.toLowerCase();
    
    switch(tier) {
      case 'basic':
        return {
          label: 'Basic',
          icon: <VerifiedIcon fontSize="small" />,
          color: 'primary',
          backgroundColor: '#2196f3',
          textColor: '#ffffff'
        };
      case 'professional':
      case 'pro':
        return {
          label: 'Pro',
          icon: <WorkspacePremiumIcon fontSize="small" />,
          color: 'secondary',
          backgroundColor: '#673ab7',
          textColor: '#ffffff'
        };
      case 'business':
        return {
          label: 'Business',
          icon: <StarIcon fontSize="small" />,
          color: 'success',
          backgroundColor: '#388e3c',
          textColor: '#ffffff'
        };
      case 'enterprise':
        return {
          label: 'Enterprise',
          icon: <DiamondIcon fontSize="small" />,
          color: 'warning',
          backgroundColor: '#ff9800',
          textColor: '#ffffff'
        };
      default:
        // Capitalize first letter of tier
        const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
        return {
          label: displayTier,
          icon: <VerifiedIcon fontSize="small" />,
          color: 'success',
          backgroundColor: '#4caf50',
          textColor: '#ffffff'
        };
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
            {appConfig.appName}
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
            {appConfig.appName.split(' ')[0]}
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
                label={VERSION_DISPLAY} 
                size="small" 
                variant="outlined"
                sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.3)' }}
              />
            </Tooltip>
            
            {/* License status indicator */}
            <LicenseBadge
              tier={licenseStatus?.tier || 'none'}
              isValid={isLicenseValid}
              tooltipText={
                isLicenseValid 
                  ? `License valid - ${licenseStatus?.tier || 'Basic'} tier` 
                  : checkingLicense 
                    ? "Checking license..." 
                    : "License invalid or expired. Click to manage license."
              }
              onClick={() => window.location.pathname !== '/license' && (window.location.href = '/license')}
              style={{ marginRight: '16px' }}
            />
            
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