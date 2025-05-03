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
import { getVersionString } from '../utils/version';

// Get version display string
const VERSION_DISPLAY = getVersionString();

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(false);
  const [checkingLicense, setCheckingLicense] = useState<boolean>(true);

  // Check license status on component mount and periodically
  useEffect(() => {
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

    checkLicense();

    // Periodically check license status every minute (reduced from 5 minutes for quicker feedback)
    const intervalId = setInterval(checkLicense, 60 * 1000);
    
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
                label={VERSION_DISPLAY} 
                size="small" 
                variant="outlined"
                sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.3)' }}
              />
            </Tooltip>
            
            {/* License status indicator */}
            <Tooltip title={
              isLicenseValid 
                ? `License valid - ${licenseStatus?.tier || 'Basic'} tier` 
                : checkingLicense 
                  ? "Checking license..." 
                  : "License invalid or expired. Click to manage license."
            }>
              <Chip
                icon={isLicenseValid 
                  ? <VerifiedIcon fontSize="small" /> 
                  : <ErrorOutlineIcon fontSize="small" />
                }
                label={isLicenseValid 
                  ? `${licenseStatus?.tier ? licenseStatus.tier.charAt(0).toUpperCase() + licenseStatus.tier.slice(1) : 'Licensed'}` 
                  : "Unlicensed"
                }
                color={isLicenseValid ? "success" : "error"}
                size="small"
                sx={{ mr: 2 }}
                onClick={() => window.location.pathname !== '/license' && (window.location.href = '/license')}
                clickable
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