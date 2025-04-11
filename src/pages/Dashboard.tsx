import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService, { Stream } from '../services/api';
import StreamCard from '../components/StreamCard';

const Dashboard = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemoCard, setShowDemoCard] = useState<boolean>(true);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStreams();
      setStreams(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to load streams. Is the tAPI server running?');
      console.error('Error fetching streams:', err);
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleCreateDemoStream = async () => {
    try {
      const payload = {
        source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        type: 'file' as const,
        name: 'Big Buck Bunny',
        autoStart: true
      };
      await apiService.createStream(payload);
      setShowDemoCard(false);
      fetchStreams();
    } catch (err) {
      console.error('Error creating demo stream:', err);
      setError('Failed to create demo stream');
    }
  };

  return (
    <div className="dashboard">
      <style>
        {`
          .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0;
          }
          
          .actions {
            display: flex;
            gap: 1rem;
          }
          
          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 980px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
          }
          
          .btn-primary {
            background: #0071e3;
            color: white;
          }
          
          .btn-primary:hover {
            background: #0077ed;
          }
          
          .btn-secondary {
            background: rgba(0, 0, 0, 0.05);
            color: #1d1d1f;
          }
          
          .btn-secondary:hover {
            background: rgba(0, 0, 0, 0.1);
          }
          
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
          }
          
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: #f5f5f7;
            border-radius: 20px;
            margin-top: 2rem;
          }
          
          .empty-state h2 {
            color: #1d1d1f;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          
          .empty-state p {
            color: #86868b;
            margin-bottom: 2rem;
          }
          
          .demo-card {
            background: linear-gradient(135deg, #0071e3 0%, #42a1ff 100%);
            color: white;
            padding: 2rem;
            border-radius: 20px;
            margin-top: 2rem;
          }
          
          .demo-card h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
          }
          
          .demo-card p {
            margin: 0 0 1.5rem 0;
            opacity: 0.9;
          }
          
          .demo-card button {
            background: white;
            color: #0071e3;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 980px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .demo-card button:hover {
            transform: scale(1.02);
          }
          
          .loading {
            text-align: center;
            color: #86868b;
            padding: 4rem 0;
          }
          
          .error {
            background: #fff2f2;
            color: #ff3b30;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-top: 2rem;
          }
        `}
      </style>

      <header className="header">
        <h1 className="title">Vision Streams</h1>
        <div className="actions">
          <button onClick={fetchStreams} className="btn btn-secondary">
            Refresh
          </button>
          <Link to="/create" className="btn btn-primary">
            New Stream
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="loading">Loading streams...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : streams.length === 0 ? (
        <div className="empty-state">
          <h2>No Streams Yet</h2>
          <p>Create your first stream to get started with vision processing</p>
          <Link to="/create" className="btn btn-primary">
            Create Stream
          </Link>
        </div>
      ) : (
        <div className="grid">
          {streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}

      {!loading && !error && streams.length > 0 && showDemoCard && (
        <div className="demo-card">
          <h3>Try a Demo Stream</h3>
          <p>
            Get started quickly with the Big Buck Bunny sample video stream
          </p>
          <button onClick={handleCreateDemoStream}>
            Create Demo Stream
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 