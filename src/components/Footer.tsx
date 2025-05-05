import { Box, Container, Typography, Link } from '@mui/material';
import appConfig from '../utils/appConfig';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#2C3E66', // Deep Blue brand color
        color: '#F7F9FC', // Soft White for text
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <Container maxWidth="xl">
        <Typography 
          variant="body2" 
          align="center"
          sx={{ 
            fontFamily: 'Montserrat, sans-serif',
            color: '#F7F9FC',
          }}
        >
          {'© '}
          {appConfig.copyrightYear}{' '}
          <Link 
            href="https://brinkbyte.com"
            sx={{ 
              color: '#3FB8AF', // Sky Teal for link
              '&:hover': {
                color: '#C5E86C', // Vibrant Lime on hover
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