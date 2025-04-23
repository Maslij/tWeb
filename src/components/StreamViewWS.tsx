import React, { useState, useEffect, useRef } from 'react';
import apiService, { getStreamAlarms, hasPipelineComponent } from '../services/api';
import AlarmModal from './AlarmModal';

// Declare global extensions to the Window interface
declare global {
  interface Window {
    __wsRegistry?: WebSocket[];
    __registerWs?: (ws: WebSocket) => void;
    __unregisterWs?: (ws: WebSocket) => void;
  }
}

// Add this at the top of the file after the existing declarations
declare global {
  interface WebSocket {
    lastLogTime?: number;
  }
}

// Add at the top with other declarations
interface WebSocketWithLogging extends WebSocket {
  lastLogTime?: number;
}

interface StreamViewWSProps {
  streamId: string;
  width?: string | number;
  height?: string | number;
  fps?: number;
}

const StreamViewWS = ({ streamId, width = '100%', height = 'auto', fps = 15 }: StreamViewWSProps) => {
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [frameData, setFrameData] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const disconnectedRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const alarmCheckRef = useRef<number | null>(null);
  const disconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Log component initialization
  useEffect(() => {
    
    // Perform a health check immediately
    apiService.checkServerHealth()
      .then(isHealthy => {
      })
      .catch(err => {
        console.error('[StreamViewWS] API server health check failed:', err);
      });
      
    // Add a connection status monitor to detect and close stale connections
    const connectionStatusInterval = setInterval(() => {
      if (wsRef.current) {
        const stateMap: Record<number, string> = {
          [WebSocket.CONNECTING]: 'CONNECTING',
          [WebSocket.OPEN]: 'OPEN',
          [WebSocket.CLOSING]: 'CLOSING',
          [WebSocket.CLOSED]: 'CLOSED'
        };
        const currentState = stateMap[wsRef.current.readyState] || 'UNKNOWN';
        
        
        // If the connection is in CLOSING state for too long, force close it
        if (wsRef.current.readyState === WebSocket.CLOSING) {
          console.warn('[StreamViewWS] WebSocket stuck in CLOSING state, forcing cleanup');
          forceCloseConnection();
        }
        
        // Fix inconsistent state
        if (wsRef.current?.readyState !== WebSocket.OPEN && connected) {
          console.warn(`[StreamViewWS] WebSocket in ${currentState} state but component thinks it's connected. Fixing state.`);
          setConnected(false);
        }

        // If component state shows disconnected but we still have a WebSocket reference,
        // force cleanup the connection
        if (!connected && wsRef.current) {
          console.warn('[StreamViewWS] Component state shows disconnected but WebSocket still exists. Forcing cleanup.');
          forceCloseConnection();
        }
      } else if (connected) {
        console.warn('[StreamViewWS] No WebSocket reference but component thinks it\'s connected. Fixing state.');
        setConnected(false);
      }
    }, 2000); // Check more frequently (every 2 seconds)
    
    // Handle window unload event to properly close WebSocket connection
    const handleBeforeUnload = () => {
      cleanupWebSocketConnection();
    };
    
    // Handle visibility change to cleanup when tab is hidden or page changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupWebSocketConnection();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
      
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(connectionStatusInterval);
    };
  }, [streamId, connected]);

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

  // Helper function to properly clean up WebSocket connection
  const cleanupWebSocketConnection = () => {
    try {
      disconnectedRef.current = true;
      if (wsRef.current) {
        const state = wsRef.current.readyState;
        const stateMap: Record<number, string> = {
          [WebSocket.CONNECTING]: 'CONNECTING',
          [WebSocket.OPEN]: 'OPEN',
          [WebSocket.CLOSING]: 'CLOSING',
          [WebSocket.CLOSED]: 'CLOSED'
        };
        
        // First send a disconnect message to tell the server we're leaving
        if (wsRef.current.readyState === WebSocket.OPEN) {
          try {
            // Send terminate command with special flag for server to immediately drop the connection
            wsRef.current.send(JSON.stringify({ 
              type: 'terminate',
              streamId: streamId,
              reason: 'Client disconnected',
              timestamp: Date.now() 
            }));
            
          } catch (e) {
            console.error('[StreamViewWS] Error sending disconnect message:', e);
          }
        }
        
        // Remove all event handlers to prevent any callbacks from firing
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        
        // Unregister from global registry
        if (window.__unregisterWs) {
          window.__unregisterWs(wsRef.current);
        }
        
        // Close with normal closure code
        wsRef.current.close(1000, 'Client terminated connection');
        
        // Immediately nullify the reference and update state
        wsRef.current = null;
        setConnected(false);
        setFrameData(null);
      }
    } catch (err) {
      console.error('[StreamViewWS] Error during WebSocket cleanup:', err);
      forceCloseConnection();
    }
  };

  // Helper function to forcefully close the connection
  const forceCloseConnection = () => {
    try {
      if (wsRef.current) {
        // Remove all event handlers to prevent any callbacks from firing
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        
        // Unregister from global registry
        if (window.__unregisterWs) {
          window.__unregisterWs(wsRef.current);
        }
        
        // Close with normal closure code
        wsRef.current.close(1000, 'Client terminated connection');
        
        // Immediately nullify the reference
        wsRef.current = null;
        
        // Update component state
        setConnected(false);
      }
    } catch (err) {
      console.error('[StreamViewWS] Error during forced WebSocket cleanup:', err);
      // Last resort - just null out the reference
      wsRef.current = null;
      setConnected(false);
    }
  };

  // Modify the cleanup effect to be more aggressive
  useEffect(() => {
    
    // Cleanup function that will run when component unmounts
    return () => {
      
      // First try normal cleanup
      cleanupWebSocketConnection();
      
      // Force immediate cleanup of any remaining connection
      if (wsRef.current) {
        console.warn('[StreamViewWS] Found lingering WebSocket, forcing immediate closure');
        const ws = wsRef.current;
        
        // Remove all event handlers immediately
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        
        // Force close the connection
        try {
          ws.close(1000, 'Component unmounted');
        } catch (err) {
          console.error('[StreamViewWS] Error during forced close:', err);
        }
        
        // Immediately clear the reference and state
        wsRef.current = null;
        setConnected(false);
        setFrameData(null);
      }
    };
  }, []); // Empty dependency array since this is for mount/unmount only

  // Modify the WebSocket connection effect to properly handle cleanup
  useEffect(() => {
    disconnectedRef.current = false;
    
    // Don't attempt connection without a streamId
    if (!streamId) {
      setError('Missing stream ID');
      return;
    }

    
    // First, clean up any existing connection
    cleanupWebSocketConnection();
    
    // Define WebSocket connection setup
    const startWebSocketConnection = (wsUrl: string, isRtspStream: boolean) => {
      try {
        const ws = new WebSocket(wsUrl) as WebSocketWithLogging;
        wsRef.current = ws;
        
        // Register this WebSocket in the global registry
        if (window.__registerWs) {
          window.__registerWs(ws);
        }
        
        ws.onopen = () => {
          setConnected(true);
          setError(null);
          
          // Send a ping to ensure connection is fully established
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
          } catch (err) {
            console.error('[WS] Error sending initial ping:', err);
          }
        };
        
        ws.onclose = (event) => {
          setConnected(false);
          
          // Unregister from global registry
          if (window.__unregisterWs && wsRef.current) {
            window.__unregisterWs(wsRef.current);
          }
          
          wsRef.current = null;
        };
        
        ws.onerror = (event) => {
          console.error('[WS] WebSocket error:', event);
        };
        
        ws.onmessage = (event: MessageEvent) => {
          // Skip logging for high frequency messages
          const now = Date.now();
          const shouldLog = !ws.lastLogTime || now - ws.lastLogTime > 2000;
          
          if (shouldLog) {
            ws.lastLogTime = now;
          }
          
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'ping') {
              // Respond to ping with pong to keep connection alive
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));

                } catch (err) {
                  console.error('[WS] Error sending pong:', err);
                }
              }
              return;
            }
            
            if (message.type === 'frame') {

              // Make sure we're using the correct property for the frame data
              if (message.frame) {
                setFrameData(message.frame);
              } else if (message.data) {
                // Some implementations might use 'data' instead of 'frame'
                setFrameData(message.data);
              } else {
                console.error('[WS] Frame message missing both frame and data properties:', message);
              }
              
              // For RTSP streams, if we're seeing frames, ensure we're showing as connected
              // This helps with temporary frame drops not triggering disconnection UI
              if (isRtspStream && !connected) {
                setConnected(true);
              }
              
              // Reset disconnect delay timer for RTSP streams since we got a good frame
              if (isRtspStream && disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
              }
              
              return;
            }
            
            if (message.type === 'error') {
              console.error('[WS] Error from server:', message.message);
              // For RTSP streams, don't immediately disconnect on errors
              if (!isRtspStream) {
                setError(message.message || 'Error from server');
              }
              return;
            }
            
          } catch (err) {
            console.error('[WS] Error parsing message:', err);
          }
        };
        
        // Special handling for RTSP streams
        if (isRtspStream) {
          
          // Add more aggressive ping interval for RTSP streams to keep connection alive
          const pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              } catch (err) {
                console.error('[WS] Error sending ping:', err);
              }
            }
          }, 15000); // Send ping every 15 seconds
          
          // Store the interval for cleanup
          pingIntervalRef.current = pingInterval;
        }
      } catch (err) {
        console.error('[WS] Error setting up WebSocket:', err);
        setError('Failed to setup WebSocket connection');
      }
    };
    
    // Define connection logic
    const connect = () => {
      try {
        const wsHost = apiService.getWebSocketHost();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${wsHost}/api/streams/${streamId}/ws?fps=${fps}`;
        
        // For RTSP streams, we may need additional connection parameters
        // Check if this is an RTSP stream to set appropriate timeouts and retry logic
        apiService.getStreamById(streamId)
          .then((streamData: any) => {
            const isRtspStream = streamData?.type === 'rtsp';            
            // Start WebSocket connection with stream-type specific settings
            startWebSocketConnection(wsUrl, isRtspStream);
          })
          .catch((err: Error) => {
            console.error(`[WS] Error getting stream info: ${err}, using default connection settings`);
            // If we can't determine stream type, proceed with default settings
            startWebSocketConnection(wsUrl, false);
          });
      } catch (err) {
        console.error('[WS] Error creating WebSocket:', err);
        setError('Failed to connect to stream');
      }
    };
    
    // Create new connection
    connect();
    
    // Cleanup function
    return () => {
      cleanupWebSocketConnection();
      
      // Clear any pending timeouts and intervals
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (alarmCheckRef.current) {
        clearInterval(alarmCheckRef.current);
        alarmCheckRef.current = null;
      }
      
      // Force cleanup any lingering connection
      if (wsRef.current) {
        console.warn('[StreamViewWS] Found lingering WebSocket in cleanup, forcing immediate closure');
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          ws.close(1000, 'Effect cleanup');
        } catch (err) {
          console.error('[StreamViewWS] Error during forced cleanup:', err);
        }
        wsRef.current = null;
        setConnected(false);
        setFrameData(null);
      }
    };
  }, [streamId, fps]); // Dependencies that should trigger reconnection

  // Draw frame data on canvas
  useEffect(() => {
    if (!frameData || !canvasRef.current) {
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Canvas] Failed to get canvas context');
      return;
    }
    
    // Log the first 50 chars of frame data to help with debugging
    const framePreview = frameData.substring(0, 50) + '...';
    
    if (frameData.length < 100) {
      console.error('[Canvas] Frame data too short to be valid:', frameData);
      return;
    }
    
    // Create a new image from the frame data
    const img = new Image();
    
    // Add detailed error handling and debugging for image loading
    img.onload = () => {
      
      if (img.width === 0 || img.height === 0) {
        console.error('[Canvas] Image has invalid dimensions:', img.width, 'x', img.height);
        return;
      }
      
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image on the canvas
      try {
        ctx.drawImage(img, 0, 0);
      } catch (err) {
        console.error('[Canvas] Error drawing image on canvas:', err);
      }
    };
    
    // Handle any errors loading the image
    img.onerror = (e) => {
      console.error('[Canvas] Error loading frame image:', e);
      
      // Log detailed information about the frame data
      console.error(
        '[Canvas] Frame data debug info:',
        'Length:', frameData.length,
        'Valid base64?', /^[A-Za-z0-9+/=]+$/.test(frameData),
        'First chars:', frameData.substring(0, 50)
      );
      
      // Draw error message on canvas
      ctx.fillStyle = '#333';
      canvas.width = 400;
      canvas.height = 300;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText('Error loading image', 10, 30);
      ctx.fillText('Data length: ' + frameData.length, 10, 50);
    };
    
    try {
      // Set the source to load the image
      img.src = `data:image/jpeg;base64,${frameData}`;
      
      // Set a timeout to detect if the image fails to load but doesn't trigger onerror
      const loadTimeout = setTimeout(() => {
        if (!img.complete || img.naturalWidth === 0) {
          console.error('[Canvas] Image load timeout - failed to load within 5 seconds');
          
          // Draw error message on canvas
          ctx.fillStyle = '#333';
          canvas.width = 400;
          canvas.height = 300;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText('Image load timeout', 10, 30);
          ctx.fillText('Data length: ' + frameData.length, 10, 50);
        }
      }, 5000);
      
      // Clean up the timeout when the component unmounts or the frameData changes
      return () => clearTimeout(loadTimeout);
    } catch (err) {
      console.error('[Canvas] Error processing frame data:', err);
      
      // Draw error message on canvas
      ctx.fillStyle = '#333';
      canvas.width = 400;
      canvas.height = 300;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText('Error processing frame data', 10, 30);
      ctx.fillText(err instanceof Error ? err.message : 'Unknown error', 10, 50);
    }
  }, [frameData]);

  // Create a global WebSocket registry to ensure all WebSockets get 
  // properly terminated if the page closes unexpectedly
  useEffect(() => {
    if (!window.__wsRegistry) {
      // Create global registry for tracking WebSockets if it doesn't exist
      window.__wsRegistry = [];
      
      // Add global event handler
      window.addEventListener('beforeunload', () => {
        // Close all registered WebSockets
        if (window.__wsRegistry) {
          window.__wsRegistry.forEach(ws => {
            try {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Window closed');
              }
            } catch (e) {
              console.error('[Global] Error closing WebSocket:', e);
            }
          });
          window.__wsRegistry = [];
        }
      });
    }
    
    // Add current WebSocket to registry when created
    const registerWs = (ws: WebSocket) => {
      if (window.__wsRegistry && ws) {
        window.__wsRegistry.push(ws);
      }
    };
    
    // Remove current WebSocket from registry when closed
    const unregisterWs = (ws: WebSocket) => {
      if (window.__wsRegistry && ws) {
        window.__wsRegistry = window.__wsRegistry.filter(registered => registered !== ws);
      }
    };
    
    // Expose the registration functions
    window.__registerWs = registerWs;
    window.__unregisterWs = unregisterWs;
    
    return () => {
      // Cleanup will be handled by other methods
    };
  }, []);

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
                  backgroundColor: 'var(--background-secondary)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  opacity: 0.9
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