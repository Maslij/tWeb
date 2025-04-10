import { useState, useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);

  // Log component initialization
  useEffect(() => {
    console.log(`[StreamViewWS] Initializing with streamId: ${streamId}`);
    console.log(`[StreamViewWS] API server host: ${apiService.getWebSocketHost()}`);
    
    // Perform a health check immediately
    apiService.checkServerHealth()
      .then(isHealthy => {
        console.log(`[StreamViewWS] API server health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
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
        
        console.log(`[StreamViewWS] WebSocket connection status: ${currentState}`);
        
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
      console.log('[StreamViewWS] Window is being unloaded, closing WebSocket');
      cleanupWebSocketConnection();
    };
    
    // Handle visibility change to cleanup when tab is hidden or page changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[StreamViewWS] Page visibility changed to hidden, cleaning up WebSocket');
        cleanupWebSocketConnection();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
      
    return () => {
      console.log(`[StreamViewWS] Component unmounting for streamId: ${streamId}`);
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
        console.log(`[StreamViewWS] Cleaning up WebSocket connection (current state: ${stateMap[state]})`);
        
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
            
            console.log('[StreamViewWS] Sent termination signal to server');
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
    console.log('[StreamViewWS] Component mounted/remounted');
    
    // Cleanup function that will run when component unmounts
    return () => {
      console.log('[StreamViewWS] Component unmounting, performing cleanup');
      
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

    console.log('[StreamViewWS] Setting up new WebSocket connection');
    
    // First, clean up any existing connection
    cleanupWebSocketConnection();
    
    // Define WebSocket connection setup
    const startWebSocketConnection = (wsUrl: string) => {
      try {
        const ws = new WebSocket(wsUrl) as WebSocketWithLogging;
        wsRef.current = ws;
        
        // Register this WebSocket in the global registry
        if (window.__registerWs) {
          window.__registerWs(ws);
        }
        
        ws.onopen = () => {
          console.log('[WS] WebSocket connection opened');
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
          console.log(`[WS] WebSocket connection closed: ${event.code} ${event.reason || ''}`);
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
        
        ws.onmessage = (event) => {
          try {
            // If we're disconnected or disconnecting, ignore all messages
            if (!ws || ws.readyState !== WebSocket.OPEN) {
              // Only log every 5 seconds to prevent spam
              const now = Date.now();
              if (!ws.lastLogTime || now - ws.lastLogTime >= 5000) {
                console.log('[WS] Ignoring messages - connection not open');
                ws.lastLogTime = now;
              }
              return;
            }
            
            // Process the message
            if (typeof event.data === 'string') {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'frame' && (data.data || data.frame)) {
                  const frameContent = data.data || data.frame;
                  if (typeof frameContent === 'string') {
                    setFrameData(frameContent);
                  }
                }
              } catch (err) {
                // If it's not JSON, check if it's raw base64 image data
                if (event.data.startsWith('/9j/') || event.data.startsWith('iVBOR')) {
                  setFrameData(event.data);
                }
              }
            }
          } catch (err) {
            console.error('[WS] Error processing WebSocket message:', err);
          }
        };
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
        
        console.log(`[WS] Connecting to WebSocket: ${wsUrl}`);
        startWebSocketConnection(wsUrl);
      } catch (err) {
        console.error('[WS] Error creating WebSocket:', err);
        setError('Failed to connect to stream');
      }
    };
    
    // Create new connection
    connect();
    
    // Cleanup function
    return () => {
      console.log('[StreamViewWS] WebSocket effect cleanup - ensuring connection is closed');
      cleanupWebSocketConnection();
      
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
      console.log('[Canvas] No frame data or canvas ref available');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Canvas] Failed to get canvas context');
      return;
    }
    
    console.log('[Canvas] Starting to process frame data, length:', frameData.length);
    
    // Create a new image from the frame data
    const img = new Image();
    img.onload = () => {
      console.log('[Canvas] Image loaded successfully, dimensions:', img.width, 'x', img.height);
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);
      console.log('[Canvas] Image drawn on canvas');
    };
    
    // Handle any errors loading the image
    img.onerror = (e) => {
      console.error('[Canvas] Error loading frame image:', e);
      
      // Draw error message on canvas
      ctx.fillStyle = '#333';
      canvas.width = 400;
      canvas.height = 300;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText('Error loading image', 10, 30);
      
      // Log the first 100 characters of the frame data to help debug
      console.error('[Canvas] Frame data preview:', 
        frameData.substring(0, 100) + '...',
        'Total length:', frameData.length);
    };
    
    try {
      // Set the source to load the image
      img.src = `data:image/jpeg;base64,${frameData}`;
      console.log('[Canvas] Set image source with base64 data');
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
        console.log('[Global] Window unloading, closing all WebSockets');
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
        console.log(`[Global] Registered WebSocket, registry size: ${window.__wsRegistry.length}`);
      }
    };
    
    // Remove current WebSocket from registry when closed
    const unregisterWs = (ws: WebSocket) => {
      if (window.__wsRegistry && ws) {
        window.__wsRegistry = window.__wsRegistry.filter(registered => registered !== ws);
        console.log(`[Global] Unregistered WebSocket, registry size: ${window.__wsRegistry.length}`);
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