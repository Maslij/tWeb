import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          tWeb
        </Link>
        <div style={styles.links}>
          <Link to="/" style={styles.link}>
            Dashboard
          </Link>
          <Link to="/create" style={styles.link}>
            Create Stream
          </Link>
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    backgroundColor: 'var(--secondary-color)',
    color: 'white',
    padding: '10px 0',
    width: '100%',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px',
    boxSizing: 'border-box' as const,
  },
  logo: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
  },
  links: {
    display: 'flex',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    padding: '0 15px',
    transition: 'opacity 0.3s',
    opacity: 0.8,
    ':hover': {
      opacity: 1,
    },
  },
};

export default Navbar; 