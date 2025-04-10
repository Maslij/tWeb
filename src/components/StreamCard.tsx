import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stream } from '../services/api';
import apiService, { getStreamAlarms, hasPipelineComponent } from '../services/api';
import AlarmModal from './AlarmModal';
import Modal from './Modal';
import StreamView from './StreamView';
import StreamViewWS from './StreamViewWS';

interface StreamCardProps {
  stream: Stream;
}

const StreamCard = ({ stream }: StreamCardProps) => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [showStreamModal, setShowStreamModal] = useState<boolean>(false);
  const [useWebSocket, setUseWebSocket] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(15);

  // Validate stream has required properties
  const isValidStream = stream && stream.id && stream.status;
  
  // Set a safe status
  const status = isValidStream ? stream.status : 'error';

  // Check if the stream has an EventAlarm component - simplified for testing
  useEffect(() => {
    if (!isValidStream || status !== 'running') return;

    let mounted = true;

    // Define checkForAlarms - same implementation as in the other useEffect
    const checkForAlarms = async () => {
      try {
        const alarms = await getStreamAlarms(stream.id);
        if (mounted) {
          // Always set hasAlarmComponent to true during development
          setHasAlarmComponent(true);
          
          setHasAlarms(alarms.length > 0);
          setAlarmCount(alarms.length);
        }
      } catch (error) {
        console.error('Error checking for alarms:', error);
      }
    };
    
    const checkForAlarmComponent = async () => {
      try {
        // In development, we can just assume the component exists and check for alarms
        if (mounted) {
          setHasAlarmComponent(true);
          checkForAlarms();
        }
      } catch (error) {
        console.error('Error checking for alarm component:', error);
      }
    };
    
    checkForAlarmComponent();
    
    return () => {
      mounted = false;
    };
  }, [isValidStream, stream.id, status]);

  // Check for alarms periodically if stream is running
  useEffect(() => {
    if (!isValidStream || status !== 'running') return;

    let mounted = true;
    
    // Function to check for alarms
    const checkForAlarms = async () => {
      try {
        const alarms = await getStreamAlarms(stream.id);
        if (mounted) {
          setHasAlarms(alarms.length > 0);
          setAlarmCount(alarms.length);
        }
      } catch (error) {
        console.error('Error checking for alarms:', error);
      }
    };
    
    // Set up periodic checks
    const intervalId = setInterval(checkForAlarms, 10000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [isValidStream, stream.id, status]);

  useEffect(() => {
    if (isValidStream && status === 'running') {
      // Initial image load
      setImageUrl(apiService.getFrameUrlWithTimestamp(stream.id));
      
      // Set up periodic refresh for running streams
      const intervalId = setInterval(() => {
        setImageUrl(apiService.getFrameUrlWithTimestamp(stream.id));
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [isValidStream, stream.id, status]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isValidStream) return;
    
    // Don't navigate if clicking on the alarm indicator or fullscreen button
    if ((e.target as HTMLElement).closest('.alarm-indicator') || 
        (e.target as HTMLElement).closest('.fullscreen-button')) {
      e.stopPropagation();
      return;
    }
    
    navigate(`/streams/${stream.id}`);
  };

  const handleAlarmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAlarmModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#27ae60'; // Green
      case 'stopped':
        return '#e74c3c'; // Red
      case 'error':
        return '#e74c3c'; // Red
      default:
        return '#f39c12'; // Orange for 'created'
    }
  };

  if (!isValidStream) {
    return (
      <div className="card stream-card">
        <div className="stream-img" style={{ 
          backgroundColor: '#eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          INVALID STREAM
        </div>
        <h3>Invalid Stream Data</h3>
        <div className="error">This stream has missing or invalid data</div>
      </div>
    );
  }

  return (
    <>
      <div className="card stream-card" onClick={handleClick}>
        {hasAlarmComponent && hasAlarms && (
          <div 
            className={`alarm-indicator ${alarmCount > 0 ? 'alarm-pulse' : ''}`}
            onClick={handleAlarmClick}
          >
            {alarmCount > 99 ? '99+' : alarmCount}
          </div>
        )}
        
        {status === 'running' ? (
          <div className="stream-img-container" style={{ position: 'relative' }}>
            {imageUrl ? (
              <>
                <img 
                  src={imageUrl} 
                  alt={stream.name || 'Unnamed Stream'} 
                  className="stream-img"
                  onError={() => setImageUrl('/placeholder-error.jpg')}
                />
                <button 
                  className="fullscreen-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStreamModal(true);
                  }}
                >
                  <span>⤢</span>
                </button>
              </>
            ) : (
              <div 
                className="stream-img" 
                style={{ 
                  backgroundColor: '#eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}
              >
                LOADING...
              </div>
            )}
          </div>
        ) : (
          <div 
            className="stream-img" 
            style={{ 
              backgroundColor: '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            {status.toUpperCase()}
          </div>
        )}
        
        <h3>{stream.name || 'Unnamed Stream'}</h3>
        
        <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center' }}>
          <div 
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(status),
              marginRight: '8px'
            }}
          />
          <span>{status}</span>
        </div>
        
        <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
          <span>Type: {stream.type || 'unknown'}</span>
          {stream.width && stream.height && (
            <span style={{ marginLeft: '10px' }}>
              {stream.width}x{stream.height}
            </span>
          )}
        </div>
      </div>
      
      {showAlarmModal && (
        <AlarmModal
          streamId={stream.id}
          isOpen={showAlarmModal}
          onClose={() => setShowAlarmModal(false)}
        />
      )}

      {/* Modal for enlarged stream view */}
      <Modal 
        isOpen={showStreamModal} 
        onClose={() => setShowStreamModal(false)}
      >
        <div className="stream-modal-content">
          <h3>{stream.name || 'Stream View'}</h3>
          <div className="stream-modal-settings">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={useWebSocket} 
                  onChange={(e) => setUseWebSocket(e.target.checked)} 
                  style={{ marginRight: '5px' }}
                />
                Use WebSocket (Experimental)
              </label>
              
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
            </div>
          </div>
          
          <div className="stream-view-container">
            {useWebSocket ? (
              <StreamViewWS 
                key={`ws-modal-${stream.id}`}
                streamId={stream.id} 
                fps={fps} 
                width="100%" 
                height="100%"
              />
            ) : (
              <StreamView 
                key={`http-modal-${stream.id}-${Date.now()}`} 
                streamId={stream.id} 
                refreshRate={1000} 
                width="100%"
                height="100%"
              />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default StreamCard; 