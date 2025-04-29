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
    palette: {
      mode: effectiveTheme,
      primary: {
        main: '#2196f3', // Blue
      },
      secondary: {
        main: '#f50057', // Pink
      },
      background: {
        default: effectiveTheme === 'light' ? '#f5f5f5' : '#121212',
        paper: effectiveTheme === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: effectiveTheme === 'light' ? '#ffffff' : '#1e1e1e',
            color: effectiveTheme === 'light' ? '#333333' : '#ffffff',
            boxShadow: effectiveTheme === 'light' 
              ? '0 1px 3px rgba(0,0,0,0.12)' 
              : '0 1px 3px rgba(0,0,0,0.5)',
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