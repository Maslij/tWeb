import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggleIcon from './ThemeToggleIcon';

const Navbar = () => {
  const { theme, setTheme } = useTheme();

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
    <nav>
      <style>
        {`
          nav {
            background: var(--nav-bg, rgba(255, 255, 255, 0.8));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--nav-border, rgba(0, 0, 0, 0.1));
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .logo {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary, #1d1d1f);
            text-decoration: none;
            letter-spacing: -0.5px;
          }

          .theme-toggle {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            color: var(--text-primary);
          }

          .theme-toggle:hover {
            background: var(--hover-bg, rgba(0, 0, 0, 0.05));
          }
          
          .theme-icon {
            display: flex;
            align-items: center;
          }
        `}
      </style>
      
      <div className="container">
        <Link to="/" className="logo">
          Vision
        </Link>
        <button 
          className="theme-toggle" 
          onClick={toggleTheme} 
          title={`Current theme: ${theme}. Click to cycle themes.`}
        >
          <ThemeToggleIcon />
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 