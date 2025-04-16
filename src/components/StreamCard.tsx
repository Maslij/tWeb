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
    if ((e.target as HTMLElement).closest('.alarm-badge') || 
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
      <style>
        {`
          .stream-card {
            background: var(--background-primary, white);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
            position: relative;
          }

          .stream-card:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          }

          .stream-preview {
            position: relative;
            aspect-ratio: 16/9;
            background: var(--background-secondary, #f5f5f7);
            overflow: hidden;
          }

          .stream-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .stream-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary, #86868b);
            font-weight: 500;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stream-info {
            padding: 1.5rem;
          }

          .stream-name {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary, #1d1d1f);
            margin: 0 0 0.5rem 0;
          }

          .stream-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.9rem;
            color: var(--text-secondary, #86868b);
          }

          .stream-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .status-running {
            background: #30d158;
          }

          .status-stopped {
            background: #ff453a;
          }

          .status-error {
            background: #ff453a;
          }

          .status-created {
            background: #ffd60a;
          }

          .alarm-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: #ff453a;
            color: white;
            border-radius: 20px;
            padding: 0.25rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            z-index: 10;
            /* Add button reset styles */
            border: none;
            cursor: pointer;
            font-family: inherit; /* Ensure font is inherited */
            text-align: left; /* Reset text alignment */
            appearance: none; /* Reset browser default styles */
            -webkit-appearance: none;
            -moz-appearance: none;
          }

          .alarm-badge:hover {
            filter: brightness(0.9);
          }

          .alarm-badge.pulse {
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(1);
            }
          }

          /* Add new styles for pipeline components */
          .pipeline-components {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.05));
          }

          .component-pill {
            background: var(--background-secondary, #f5f5f7);
            color: var(--text-secondary, #86868b);
            padding: 0.25rem 0.75rem;
            border-radius: 980px;
            font-size: 0.8rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
          }

          .component-pill:hover {
            background: var(--hover-bg, rgba(0, 0, 0, 0.08));
            transform: scale(1.02);
          }

          .component-pill .component-icon {
            width: 12px;
            height: 12px;
            opacity: 0.7;
          }

          .component-pill.source {
            background: rgba(0, 113, 227, 0.1);
            color: #0071e3;
          }

          .component-pill.detector {
            background: rgba(255, 149, 0, 0.1);
            color: #ff9500;
          }

          .component-pill.tracker {
            background: rgba(52, 199, 89, 0.1);
            color: #34c759;
          }

          .component-pill.classifier {
            background: rgba(175, 82, 222, 0.1);
            color: #af52de;
          }

          .component-pill.geometry {
            background: rgba(255, 59, 48, 0.1);
            color: #ff3b30;
          }

          .component-pill.sink {
            background: rgba(88, 86, 214, 0.1);
            color: #5856d6;
          }
        `}
      </style>

      <div className="stream-card" onClick={handleClick}>
        {hasAlarmComponent && hasAlarms && (
          <button 
            onClick={handleAlarmClick} 
            className={`alarm-badge ${alarmCount > 0 ? 'pulse' : ''}`}
            aria-label={`View ${alarmCount} alarms`}
          >
            <span>⚠️</span>
            {alarmCount > 99 ? '99+' : alarmCount}
          </button>
        )}
        
        <div className="stream-preview">
          {status === 'running' && imageUrl ? (
            <img 
              src={imageUrl} 
              alt={stream.name || 'Stream preview'} 
              className="stream-image"
              onError={() => setImageUrl('')}
            />
          ) : (
            <div className="stream-placeholder">
              {status}
            </div>
          )}
        </div>
        
        <div className="stream-info">
          <h3 className="stream-name">{stream.name || 'Unnamed Stream'}</h3>
          <div className="stream-meta">
            <div className="stream-status">
              <div className={`status-indicator status-${status}`} />
              <span>{status}</span>
            </div>
            <span>{stream.type || 'unknown'}</span>
            {stream.width && stream.height && (
              <span>{stream.width}x{stream.height}</span>
            )}
          </div>
          {/* Add pipeline components display */}
          {stream.pipeline && stream.pipeline.nodes && stream.pipeline.nodes.length > 0 && (
            <div className="pipeline-components">
              {stream.pipeline.nodes.map((node) => {
                const baseType = node.componentId.split('_')[0]; // For CSS classes only
                return (
                  <div key={node.id} className={`component-pill ${baseType}`}>
                    {node.componentId.includes('camera') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 10L19.553 7.724C19.7054 7.64784 19.8748 7.61188 20.0466 7.61952C20.2184 7.62716 20.3832 7.67814 20.5264 7.76733C20.6696 7.85652 20.7861 7.98097 20.8646 8.12897C20.9432 8.27697 20.9809 8.44334 20.974 8.611V15.389C20.9809 15.5567 20.9432 15.723 20.8646 15.871C20.7861 16.019 20.6696 16.1435 20.5264 16.2327C20.3832 16.3219 20.2184 16.3728 20.0466 16.3805C19.8748 16.3881 19.7054 16.3522 19.553 16.276L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.componentId.includes('detector') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"/>
                        <path d="M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.componentId.includes('tracker') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.componentId.includes('classifier') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 9V5C14 4.46957 13.7893 3.96086 13.4142 3.58579C13.0391 3.21071 12.5304 3 12 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V9C3 9.53043 3.21071 10.0391 3.58579 10.4142C3.96086 10.7893 4.46957 11 5 11H12C12.5304 11 13.0391 10.7893 13.4142 10.4142C13.7893 10.0391 14 9.53043 14 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 9V15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H12C11.4696 17 10.9609 16.7893 10.5858 16.4142C10.2107 16.0391 10 15.5304 10 15V9C10 8.46957 10.2107 7.96086 10.5858 7.58579C10.9609 7.21071 11.4696 7 12 7H19C19.5304 7 20.0391 7.21071 20.4142 7.58579C20.7893 7.96086 21 8.46957 21 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 15V19C17 19.5304 16.7893 20.0391 16.4142 20.4142C16.0391 20.7893 15.5304 21 15 21H8C7.46957 21 6.96086 20.7893 6.58579 20.4142C6.21071 20.0391 6 19.5304 6 19V15C6 14.4696 6.21071 13.9609 6.58579 13.5858C6.96086 13.2107 7.46957 13 8 13H15C15.5304 13 16.0391 13.2107 16.4142 13.5858C16.7893 13.9609 17 14.4696 17 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.componentId.includes('geometry') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 20L21 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 20H21V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 4H3V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.componentId.includes('annotated_stream') && (
                      <svg className="component-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {node.name || node.componentId}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlarmModal
        streamId={stream.id}
        isOpen={showAlarmModal}
        onClose={() => setShowAlarmModal(false)}
      />

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