import { useState, useEffect, useRef } from 'react';
import apiService, { getStreamAlarms, hasPipelineComponent } from '../services/api';
import AlarmModal from './AlarmModal';

interface StreamViewWSProps {
  streamId: string;
  width?: string | number;
  height?: string | number;
}

const StreamViewWS = ({ streamId, width = '100%', height = 'auto' }: StreamViewWSProps) => {
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [frameData, setFrameData] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);

  // Check if the stream has an EventAlarm component
  useEffect(() => {
    if (!streamId) return;

    let mounted = true;
    
    const checkForAlarmComponent = async () => {
      try {
        const hasComponent = await hasPipelineComponent(streamId, 'EventAlarm');
        if (mounted) {
          setHasAlarmComponent(hasComponent);
        }
      } catch (error) {
        console.error('Error checking for alarm component:', error);
      }
    };
    
    checkForAlarmComponent();
    
    return () => {
      mounted = false;
    };
  }, [streamId]);

  // Check for alarms if the stream has an EventAlarm component
  useEffect(() => {
    if (!streamId || !hasAlarmComponent || !connected) return;

    let mounted = true;
    
    const checkForAlarms = async () => {
      try {
        const alarms = await getStreamAlarms(streamId);
        if (mounted) {
          setHasAlarms(alarms.length > 0);
          setAlarmCount(alarms.length);
        }
      } catch (error) {
        console.error('Error checking for alarms:', error);
      }
    };
    
    // Initial check
    checkForAlarms();
    
    // Set up periodic checks
    const intervalId = setInterval(checkForAlarms, 5000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [streamId, hasAlarmComponent, connected]);

  // WebSocket connection
  useEffect(() => {
    // Don't attempt connection without a streamId
    if (!streamId) {
      setError('Missing stream ID');
      return;
    }
  
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  
    // Connection logic
    const connect = () => {
      try {
        // Get the WebSocket host from the API service
        const wsHost = apiService.getWebSocketHost();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${wsHost}/api/streams/${streamId}/ws`;
        
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('WebSocket connection opened');
          setConnected(true);
          setError(null);
          setReconnectCount(0);
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          setConnected(false);
          wsRef.current = null;
          
          // Only attempt reconnect if this wasn't a normal closure
          if (event.code !== 1000) {
            handleReconnect();
          }
        };
        
        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('Connection error');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check if this is a frame message
            if (data.type === 'frame' && data.data) {
              setFrameData(data.data);
            }
            
            // No error if we got a message
            if (error) setError(null);
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setError('Failed to connect to stream');
        handleReconnect();
      }
    };
    
    const handleReconnect = () => {
      const newReconnectCount = reconnectCount + 1;
      setReconnectCount(newReconnectCount);
      
      // Implement exponential backoff for reconnection attempts
      const backoff = Math.min(30000, Math.pow(2, newReconnectCount) * 1000);
      console.log(`Attempting to reconnect in ${backoff}ms (attempt ${newReconnectCount})`);
      
      setTimeout(() => {
        if (newReconnectCount <= 10) {
          connect();
        } else {
          setError('Failed to connect after multiple attempts');
        }
      }, backoff);
    };
    
    connect();
    
    // Clean up on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [streamId]);
  
  // Draw frame data on canvas
  useEffect(() => {
    if (!frameData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Create a new image from the frame data
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);
    };
    
    // Handle any errors loading the image
    img.onerror = () => {
      console.error('Error loading frame image');
    };
    
    // Set the source to load the image
    img.src = `data:image/jpeg;base64,${frameData}`;
  }, [frameData]);

  const handleAlarmClick = () => {
    setShowAlarmModal(true);
  };

  return (
    <div className="stream-view-container">
      <div className="stream-view" style={{ position: 'relative' }}>
        {hasAlarmComponent && hasAlarms && connected && (
          <div 
            className={`alarm-indicator ${alarmCount > 0 ? 'alarm-pulse' : ''}`}
            onClick={handleAlarmClick}
            style={{ 
              top: '20px', 
              right: '20px', 
              width: '30px', 
              height: '30px',
              fontSize: '1.1rem',
              zIndex: 100
            }}
          >
            {alarmCount > 99 ? '99+' : alarmCount}
          </div>
        )}
        
        {error ? (
          <div className="error stream-error">
            {error}
            <button 
              className="btn retry-btn" 
              onClick={() => {
                setError(null);
                setReconnectCount(0);
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                // This will trigger the reconnect in the useEffect
                setReconnectCount(0);
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {!connected && (
              <div 
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10
                }}
              >
                Connecting...
              </div>
            )}
            <canvas 
              ref={canvasRef}
              className="stream-canvas"
              style={{ 
                width, 
                height,
                maxHeight: '70vh',
                objectFit: 'contain',
                opacity: connected ? 1 : 0.5
              }}
            />
          </>
        )}
      </div>
      
      {showAlarmModal && (
        <AlarmModal
          streamId={streamId}
          isOpen={showAlarmModal}
          onClose={() => setShowAlarmModal(false)}
        />
      )}
    </div>
  );
};

export default StreamViewWS; 