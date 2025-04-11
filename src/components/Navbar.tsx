import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav>
      <style>
        {`
          nav {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
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
            color: #1d1d1f;
            text-decoration: none;
            letter-spacing: -0.5px;
          }

          .nav-links {
            display: flex;
            gap: 2rem;
          }

          .nav-link {
            color: #1d1d1f;
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
            background: #0071e3;
            transform: scaleX(0);
            transition: transform 0.2s ease;
          }

          .nav-link:hover::after {
            transform: scaleX(1);
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 