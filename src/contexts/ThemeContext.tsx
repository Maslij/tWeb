import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Try to get theme from cookie or default to system
  const getInitialTheme = (): Theme => {
    const storedTheme = document.cookie
      .split('; ')
      .find(row => row.startsWith('theme='))
      ?.split('=')[1] as Theme | undefined;
    
    return storedTheme || 'system';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // Set cookie when theme changes
  useEffect(() => {
    document.cookie = `theme=${theme}; max-age=31536000; path=/; SameSite=Lax; Secure`; // 1 year expiry
  }, [theme]);

  // Handle system theme detection and changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setEffectiveTheme(theme);
      }
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // Create Material-UI theme
  const muiTheme = createTheme({
    typography: {
      fontFamily: [
        'Inter',
        '"Segoe UI"',
        'Roboto',
        'Arial',
        'sans-serif'
      ].join(','),
      h1: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
      },
      h2: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
      },
      h3: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
      },
      h4: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
      },
      h5: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
      },
      h6: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
      },
      subtitle1: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
      },
      subtitle2: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
      },
      button: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    palette: {
      mode: effectiveTheme,
      primary: {
        main: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF', // Deep Blue for light, Sky Teal for dark
      },
      secondary: {
        main: effectiveTheme === 'light' ? '#3FB8AF' : '#C5E86C', // Sky Teal for light, Vibrant Lime for dark
      },
      background: {
        default: effectiveTheme === 'light' ? '#F7F9FC' : '#1e2536', // Soft White for light, Dark version of Deep Blue for dark
        paper: effectiveTheme === 'light' ? '#ffffff' : '#2C3E66', // White for light, Deep Blue for dark
      },
      text: {
        primary: effectiveTheme === 'light' ? '#4A4A4A' : '#F7F9FC', // Graphite Grey for light, Soft White for dark
        secondary: effectiveTheme === 'light' ? '#666666' : '#b0b0b0',
      },
      success: {
        main: '#C5E86C', // Vibrant Lime for both themes
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: effectiveTheme === 'light' ? '#ffffff' : '#2C3E66', // White for light, Deep Blue for dark
            color: effectiveTheme === 'light' ? '#4A4A4A' : '#F7F9FC', // Graphite Grey for light, Soft White for dark
            boxShadow: effectiveTheme === 'light' 
              ? '0 1px 3px rgba(0,0,0,0.12)' 
              : '0 1px 3px rgba(0,0,0,0.5)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            backgroundColor: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF', // Deep Blue for light, Sky Teal for dark
            color: effectiveTheme === 'light' ? '#ffffff' : '#ffffff',
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? '#1e2c4c' : '#35a098', // Darker versions
              color: '#ffffff', // Ensure text stays white on hover
            },
          },
          containedSecondary: {
            backgroundColor: effectiveTheme === 'light' ? '#3FB8AF' : '#C5E86C', // Sky Teal for light, Vibrant Lime for dark
            color: effectiveTheme === 'light' ? '#ffffff' : '#4A4A4A', // White for light, Graphite Grey for dark
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? '#35a098' : '#b4d457', // Darker versions
              color: effectiveTheme === 'light' ? '#ffffff' : '#4A4A4A', // Keep the same text color on hover
            },
          },
          outlined: {
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(44, 62, 102, 0.04)' : 'rgba(63, 184, 175, 0.04)',
              borderColor: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF',
            },
          },
          outlinedPrimary: {
            borderColor: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF',
            color: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF',
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(44, 62, 102, 0.04)' : 'rgba(63, 184, 175, 0.04)',
              borderColor: effectiveTheme === 'light' ? '#1e2c4c' : '#35a098',
              color: effectiveTheme === 'light' ? '#1e2c4c' : '#35a098',
            },
          },
          outlinedSecondary: {
            borderColor: effectiveTheme === 'light' ? '#3FB8AF' : '#C5E86C',
            color: effectiveTheme === 'light' ? '#3FB8AF' : '#C5E86C',
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(63, 184, 175, 0.04)' : 'rgba(197, 232, 108, 0.04)',
              borderColor: effectiveTheme === 'light' ? '#35a098' : '#b4d457',
              color: effectiveTheme === 'light' ? '#35a098' : '#b4d457',
            },
          },
          text: {
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(44, 62, 102, 0.04)' : 'rgba(63, 184, 175, 0.04)',
            },
          },
          textPrimary: {
            color: effectiveTheme === 'light' ? '#2C3E66' : '#3FB8AF',
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(44, 62, 102, 0.04)' : 'rgba(63, 184, 175, 0.04)',
              color: effectiveTheme === 'light' ? '#1e2c4c' : '#35a098',
            },
          },
          textSecondary: {
            color: effectiveTheme === 'light' ? '#3FB8AF' : '#C5E86C',
            '&:hover': {
              backgroundColor: effectiveTheme === 'light' ? 'rgba(63, 184, 175, 0.04)' : 'rgba(197, 232, 108, 0.04)',
              color: effectiveTheme === 'light' ? '#35a098' : '#b4d457',
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            fontFamily: 'Inter, sans-serif',
          },
          h1: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
          },
          h2: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
          },
          h3: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
          },
          h4: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
          },
          h5: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
          },
          h6: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 