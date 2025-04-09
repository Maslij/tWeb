import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService, { Stream } from '../services/api';
import StreamCard from '../components/StreamCard';

const Dashboard = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStreams();
      // Check if data is an array, otherwise initialize an empty array
      setStreams(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load streams. Is the tAPI server running?');
      console.error('Error fetching streams:', err);
      setStreams([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
    
    // Refresh streams every 10 seconds
    const intervalId = setInterval(fetchStreams, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Safe rendering check for streams
  const renderStreams = () => {
    if (!Array.isArray(streams)) {
      return (
        <div className="error">Invalid stream data received from API</div>
      );
    }

    return (
      <div className="grid">
        {streams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Streams</h1>
        <div className="dashboard-actions">
          <button onClick={fetchStreams} className="btn" style={{ marginRight: '10px' }}>
            Refresh
          </button>
          <Link to="/create" className="btn btn-secondary">
            Create New Stream
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="loading">Loading streams...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : streams.length === 0 ? (
        <div className="card">
          <p>No streams available. Create your first stream to get started!</p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/create" className="btn">
              Create Stream
            </Link>
          </div>
        </div>
      ) : (
        renderStreams()
      )}

      {!loading && !error && Array.isArray(streams) && streams.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Quick Demo Stream</h3>
          <p>
            Create a new stream with the Big Buck Bunny sample video:
          </p>
          <button
            className="btn"
            style={{ marginTop: '10px' }}
            onClick={async () => {
              try {
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
              }
            }}
          >
            Create Demo Stream
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 