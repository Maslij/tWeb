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

          .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
          }

          .nav-link {
            color: var(--text-primary, #1d1d1f);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            padding: 0.5rem 0;
            position: relative;
          }

          .nav-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--accent-color, #0071e3);
            transform: scaleX(0);
            transition: transform 0.2s ease;
          }

          .nav-link:hover::after {
            transform: scaleX(1);
          }

          .theme-toggle {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            margin-left: 1rem;
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
        <div className="nav-links">
          <Link to="/" className="nav-link">
            Streams
          </Link>
          <Link to="/create" className="nav-link">
            Create
          </Link>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme} 
            title={`Current theme: ${theme}. Click to cycle themes.`}
          >
            <ThemeToggleIcon />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 