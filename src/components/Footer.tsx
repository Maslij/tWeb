import { Box, Container, Typography, Link } from '@mui/material';
import appConfig from '../utils/appConfig';
import { useTheme } from '../contexts/ThemeContext';

const Footer = () => {
  const { effectiveTheme } = useTheme();
  const isLightMode = effectiveTheme === 'light';

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: isLightMode ? '#ffffff' : '#2C3E66', // White for light, Deep Blue for dark
        color: isLightMode ? '#4A4A4A' : '#F7F9FC', // Graphite Grey for light, Soft White for dark
        fontFamily: 'Montserrat, sans-serif',
        boxShadow: isLightMode 
          ? '0 -1px 3px rgba(0,0,0,0.12)' 
          : '0 -1px 3px rgba(0,0,0,0.5)',
      }}
    >
      <Container maxWidth="xl">
        <Typography 
          variant="body2" 
          align="center"
          sx={{ 
            fontFamily: 'Montserrat, sans-serif',
            color: 'inherit',
          }}
        >
          {'© '}
          {appConfig.copyrightYear}{' '}
          <Link 
            href="https://brinkbyte.com"
            sx={{ 
              color: isLightMode ? '#2C3E66' : '#3FB8AF', // Deep Blue for light, Sky Teal for dark
              '&:hover': {
                color: isLightMode ? '#1e2c4c' : '#C5E86C', // Darker Deep Blue for light, Vibrant Lime for dark
              },
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {appConfig.appName} by {appConfig.companyName}
          </Link>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 