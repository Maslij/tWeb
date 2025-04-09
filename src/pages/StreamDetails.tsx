import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService, { Stream } from '../services/api';
import StreamView from '../components/StreamView';
import StreamViewWS from '../components/StreamViewWS';
import PolygonEditor from '../components/PolygonEditor';

const StreamDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [useWebSocket, setUseWebSocket] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(15);
  const [showPolygonEditor, setShowPolygonEditor] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchStream = async (silentUpdate = false) => {
    if (!id) {
      setError("No stream ID provided");
      setLoading(false);
      return;
    }
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      if (!silentUpdate) {
        setLoading(true);
      }
      
      // Set the polling flag to avoid multiple concurrent requests
      if (isPollingRef.current && silentUpdate) {
        return;
      }
      isPollingRef.current = true;
      
      const data = await apiService.getStreamById(id);
      
      // Validate stream data
      if (!data || !data.id) {
        setError("Invalid stream data received");
        setStream(null);
      } else {
        // Only update the stream if data has actually changed
        // to prevent unnecessary rerenders
        setStream(prevStream => {
          // Skip update if nothing has changed
          if (prevStream && 
              prevStream.id === data.id && 
              prevStream.status === data.status) {
            return prevStream;
          }
          return data;
        });
        setError(null);
      }
    } catch (err) {
      // Don't set error during silent updates to avoid flickering
      if (!silentUpdate) {
        setError('Failed to load stream details. The stream may not exist or the API server might be down.');
        console.error('Error fetching stream:', err);
      }
    } finally {
      if (!silentUpdate) {
        setLoading(false);
      }
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStream();
    
    // Refresh stream details every 5 seconds
    const intervalId = window.setInterval(() => {
      fetchStream(true); // Silent update
    }, 5000);
    
    // Store the interval ID in the ref for cleanup
    pollIntervalRef.current = intervalId;
    
    return () => {
      // Clear polling interval on unmount
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  const handleStartStream = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await apiService.startStream(id);
      fetchStream();
    } catch (err) {
      setError('Failed to start stream. Please try again.');
      console.error('Error starting stream:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopStream = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await apiService.stopStream(id);
      fetchStream();
    } catch (err) {
      setError('Failed to stop stream. Please try again.');
      console.error('Error stopping stream:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStream = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this stream?')) {
      try {
        setActionLoading(true);
        await apiService.deleteStream(id);
        navigate('/');
      } catch (err) {
        setError('Failed to delete stream. Please try again.');
        console.error('Error deleting stream:', err);
        setActionLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading stream details...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button 
          className="btn" 
          style={{ marginTop: '10px' }}
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="card">
        <div className="error">Stream not found or invalid data received</div>
        <button 
          className="btn" 
          style={{ marginTop: '10px' }}
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="stream-details-container">
      <header className="details-header">
        <h1>{stream.name || 'Unnamed Stream'}</h1>
        <button className="btn" onClick={() => fetchStream()}>
          Refresh
        </button>
      </header>

      <div className="card">
        <div className="details-section">
          <h3>Stream Details</h3>
          <div className="details-info">
            <p><strong>ID:</strong> {stream.id}</p>
            <p><strong>Source:</strong> {stream.source}</p>
            <p><strong>Type:</strong> {stream.type || 'unknown'}</p>
            <p><strong>Status:</strong> {stream.status}</p>
            {stream.width && stream.height && (
              <p><strong>Resolution:</strong> {stream.width}x{stream.height}</p>
            )}
            {stream.fps && (
              <p><strong>FPS:</strong> {stream.fps}</p>
            )}
          </div>
        </div>

        <div className="details-section">
          <h3>Stream Controls</h3>
          <div className="stream-actions">
            <button 
              className="btn" 
              onClick={handleStartStream}
              disabled={stream.status === 'running' || actionLoading}
            >
              Start Stream
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleStopStream}
              disabled={stream.status !== 'running' || actionLoading}
            >
              Stop Stream
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleDeleteStream}
              disabled={actionLoading}
            >
              Delete Stream
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Stream View</h3>
        {stream.status === 'running' ? (
          <div className="stream-view-container">
            <div className="stream-settings" style={{ marginBottom: '10px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useWebSocket} 
                      onChange={(e) => setUseWebSocket(e.target.checked)} 
                      style={{ marginRight: '5px' }}
                    />
                    Use WebSocket (Experimental)
                  </label>
                  
                  <div className="stream-mode-info" style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>
                    {useWebSocket ? 
                      'WebSocket mode: Higher performance but may be unstable' : 
                      'HTTP mode: More reliable, works in all browsers'
                    }
                  </div>
                  
                  {useWebSocket && (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}>
                      <label htmlFor="fps-slider" style={{ marginRight: '10px' }}>FPS: {fps}</label>
                      <input 
                        id="fps-slider"
                        type="range" 
                        min="1" 
                        max="30" 
                        value={fps} 
                        onChange={(e) => setFps(parseInt(e.target.value))}
                        style={{ width: '150px' }}
                      />
                    </div>
                  )}
                  
                  <button 
                    className={`btn ${showPolygonEditor ? 'btn-primary' : ''}`}
                    onClick={() => setShowPolygonEditor(!showPolygonEditor)}
                    style={{ marginLeft: 'auto' }}
                  >
                    {showPolygonEditor ? 'Hide Polygon Editor' : 'Show Polygon Editor'}
                  </button>
                </div>
              </div>
            </div>
            
            {!showPolygonEditor && (
              useWebSocket ? (
                <StreamViewWS 
                  key={`ws-${stream.id}-${Date.now()}`} 
                  streamId={stream.id} 
                  fps={fps} 
                />
              ) : (
                <StreamView 
                  key={`http-${stream.id}-${Date.now()}`} 
                  streamId={stream.id} 
                  refreshRate={1000} 
                />
              )
            )}
            
            {showPolygonEditor && (
              <div className="polygon-editor-container">
                <PolygonEditor 
                  streamId={stream.id}
                  width={stream.width || 640}
                  height={stream.height || 480}
                  onPolygonCreated={(polygon) => {
                    console.log('Polygon created:', polygon);
                  }}
                  onPolygonUpdated={(polygon) => {
                    console.log('Polygon updated:', polygon);
                  }}
                  onPolygonDeleted={(polygonId) => {
                    console.log('Polygon deleted:', polygonId);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="error stream-placeholder">
            Stream is not running. Start the stream to view it.
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          className="btn" 
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default StreamDetails; 