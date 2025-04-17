import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiService, { Stream } from '../services/api';
import StreamCard from '../components/StreamCard';

const Dashboard = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchStreams = useCallback(async () => {
    let timeoutId = 0;
    
    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise to detect API outages
      const timeoutPromise = new Promise<Stream[]>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('Connection timed out. Please check if the server is running.'));
        }, 5000);
      });

      // Race between the API call and the timeout
      const fetchedStreams = await Promise.race([
        apiService.getStreams(),
        timeoutPromise
      ]);

      // Clear timeout if API responded
      window.clearTimeout(timeoutId);
      
      // Verify server health if method exists
      if (apiService.checkServerHealth) {
        const isHealthy = await apiService.checkServerHealth();
        if (!isHealthy) {
          throw new Error('Unable to connect to the API server. Please verify it is running.');
        }
      }

      setStreams(fetchedStreams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load streams. Is the server running?';
      setError(errorMessage);
      console.error('Error fetching streams:', err);
    } finally {
      // Clear timeout if it's still active
      if (timeoutId) window.clearTimeout(timeoutId);
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const handleCreateDemoStream = async () => {
    try {
      setIsRefreshing(true);
      const payload = {
        source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        type: 'file' as const,
        name: 'Big Buck Bunny',
        autoStart: true
      };
      await apiService.createStream(payload);
      fetchStreams();
    } catch (err) {
      console.error('Error creating demo stream:', err);
      setError('Failed to create demo stream');
      setIsRefreshing(false);
    }
  };

  return (
    <div className="dashboard">
      <style>
        {`
          .dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            position: sticky;
            top: 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            background-color: transparent;
            z-index: 100;
            padding: 11px;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary, #1d1d1f);
            margin: 0;
            letter-spacing: -0.5px;
          }
          
          .controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }
          
          .view-controls {
            display: flex;
            background: var(--background-secondary, #f5f5f7);
            border-radius: 20px;
            padding: 0.25rem;
            margin-right: 1rem;
          }
          
          .view-btn {
            border: none;
            background: none;
            padding: 0.5rem 0.75rem;
            border-radius: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary, #86868b);
          }
          
          .view-btn.active {
            background: var(--background-primary, white);
            color: var(--text-primary, #1d1d1f);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .view-btn svg {
            width: 18px;
            height: 18px;
          }
          
          .action-buttons {
            display: flex;
            gap: 0.75rem;
          }
          
          .btn {
            padding: 0.75rem 1.25rem;
            border-radius: 980px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .btn svg {
            width: 16px;
            height: 16px;
          }
          
          .btn-primary {
            background: var(--accent-color, #0071e3);
            color: white;
          }
          
          .btn-primary:hover {
            background: var(--accent-hover, #0077ed);
            transform: scale(1.02);
          }
          
          .btn-secondary {
            background: var(--hover-bg, rgba(0, 0, 0, 0.05));
            color: var(--text-primary, #1d1d1f);
          }
          
          .btn-secondary:hover {
            background: var(--button-hover, rgba(0, 0, 0, 0.1));
          }
          
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
          }
          
          .list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 2rem;
          }
          
          .refresh-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary, #86868b);
            font-size: 0.9rem;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .refresh-indicator.visible {
            opacity: 1;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .spinner {
            animation: spin 1s linear infinite;
            width: 16px;
            height: 16px;
          }
          
          .status-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            color: var(--text-secondary, #86868b);
            font-size: 0.9rem;
            border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
            margin-bottom: 1.5rem;
          }
          
          .stream-count {
            font-weight: 500;
          }
          
          .status-chip {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.3rem 0.75rem;
            border-radius: 980px;
            background: var(--background-secondary, #f5f5f7);
            font-size: 0.8rem;
          }
          
          .status-chip.running {
            background: rgba(52, 199, 89, 0.1);
            color: #34c759;
          }
          
          .status-chip.error {
            background: rgba(255, 59, 48, 0.1);
            color: #ff3b30;
          }
          
          .empty-state {
            text-align: center;
            padding: 5rem 2rem;
            background: var(--background-secondary, #f5f5f7);
            border-radius: 24px;
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          .empty-state-icon {
            width: 64px;
            height: 64px;
            margin-bottom: 1.5rem;
            color: var(--text-secondary, #86868b);
          }
          
          .empty-state h2 {
            color: var(--text-primary, #1d1d1f);
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          
          .empty-state p {
            color: var(--text-secondary, #86868b);
            margin-bottom: 2rem;
            max-width: 500px;
          }
          
          .quick-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
          }
          
          .error-state {
            background: var(--background-secondary, #f9f9f9);
            color: var(--text-primary);
            padding: 2rem;
            border-radius: 16px;
            margin-top: 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .error-state h2 {
            font-size: 1.3rem;
            margin-bottom: 1rem;
            color: #ff3b30;
          }
          
          .error-state p {
            margin-bottom: 1.5rem;
            color: var(--text-primary);
            max-width: 600px;
          }
          
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: var(--text-secondary, #86868b);
          }
          
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-color, rgba(0, 0, 0, 0.1));
            border-top-color: var(--accent-color, #0071e3);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
        `}
      </style>

      <header className="header">
        <h1 className="title">Vision Analytics</h1>
        <div className="controls">
          <div className={`refresh-indicator ${isRefreshing ? 'visible' : ''}`}>
            <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refreshing...
          </div>
          <div className="view-controls">
            <button 
              className={`view-btn ${currentView === 'grid' ? 'active' : ''}`}
              onClick={() => setCurrentView('grid')}
              aria-label="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button 
              className={`view-btn ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
              aria-label="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="action-buttons">
            <button onClick={() => fetchStreams()} className="btn btn-secondary" aria-label="Refresh">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9.00001C19.9828 7.56675 19.1209 6.28541 17.9845 5.27546C16.8482 4.26551 15.4745 3.55984 13.9917 3.22427C12.5089 2.8887 10.9652 2.93429 9.50481 3.35685C8.04437 3.77941 6.71475 4.56534 5.64 5.64001L1 10M23 14L18.36 18.36C17.2853 19.4347 15.9556 20.2206 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7758C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4333 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <Link to="/create" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New Stream
            </Link>
          </div>
        </div>
      </header>

      {!loading && !error && streams.length > 0 && (
        <div className="status-bar">
          <div className="stream-count">
            {streams.length} {streams.length === 1 ? 'Stream' : 'Streams'}
          </div>
          <div className="status-overview">
            {streams.filter(s => s.status === 'running').length > 0 && (
              <span className="status-chip running">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="4" cy="4" r="4" fill="currentColor"/>
                </svg>
                {streams.filter(s => s.status === 'running').length} Active
              </span>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading streams...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 16.01L12.01 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchStreams()} className="btn btn-primary">
            Try Again
          </button>
        </div>
      ) : streams.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12.0011C22 17.5239 17.5228 22.0011 12 22.0011C6.47715 22.0011 2 17.5239 2 12.0011C2 6.47821 6.47715 2.00107 12 2.00107C17.5228 2.00107 22 6.47821 22 12.0011Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 12.0011L11 15.0011L16 10.0011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2>No Video Streams</h2>
          <p>Get started by connecting a camera or uploading a video file for analysis</p>
          <div className="quick-actions">
            <Link to="/create" className="btn btn-primary">
              Create Stream
            </Link>
            <button onClick={handleCreateDemoStream} className="btn btn-secondary">
              Try Demo Stream
            </button>
          </div>
        </div>
      ) : (
        <div className={currentView === 'grid' ? 'grid' : 'list'}>
          {streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 