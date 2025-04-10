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

  // Clean up when component unmounts
  useEffect(() => {
    console.log('[StreamViewWS] Component unmounting, cleaning up WebSocket');
    cleanupWebSocketConnection();
    
    // Force cleanup any lingering connections after a short delay
    const cleanupTimeout = setTimeout(() => {
      if (wsRef.current) {
        console.warn('[StreamViewWS] Found lingering WebSocket after unmount, forcing cleanup');
        forceCloseConnection();
      }
    }, 100);

    return () => {
      clearTimeout(cleanupTimeout);
      cleanupWebSocketConnection();
    };
  }, []);

  // Add an effect to handle parent component's WebSocket toggle
  useEffect(() => {
    // This will run whenever the component is mounted or remounted
    console.log('[StreamViewWS] Component mounted/remounted');
    
    return () => {
      // This will run whenever the component is unmounted
      console.log('[StreamViewWS] Component will unmount, ensuring cleanup');
      cleanupWebSocketConnection();
      
      // Force close any remaining connection
      if (wsRef.current) {
        console.warn('[StreamViewWS] Found WebSocket during unmount, forcing close');
        forceCloseConnection();
      }
    };
  }, [streamId]); // Only re-run if streamId changes

  // WebSocket connection
  useEffect(() => {
    // Don't attempt connection without a streamId
    if (!streamId) {
      setError('Missing stream ID');
      return;
    }
  
    // Close any existing connection before creating a new one
    cleanupWebSocketConnection();
  
    // Rest of connection logic
    const connect = () => {
      try {
        const wsHost = apiService.getWebSocketHost();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${wsHost}/api/streams/${streamId}/ws?fps=${fps}`;
        
        console.log(`[WS] Connecting to WebSocket: ${wsUrl}`);
        
        // Check if the API server is reachable first
        apiService.checkServerHealth()
          .then(isHealthy => {
            if (isHealthy) {
              console.log('[WS] API server is reachable, establishing WebSocket connection');
              startWebSocketConnection(wsUrl);
            } else {
              console.error('[WS] API server is not reachable');
              setError('Cannot connect to API server');
              handleReconnect();
            }
          })
          .catch(error => {
            console.error('[WS] Error checking API server health:', error);
            setError('Cannot connect to API server');
            handleReconnect();
          });
      } catch (err) {
        console.error('[WS] Error creating WebSocket:', err);
        setError('Failed to connect to stream');
        handleReconnect();
      }
    };
    
    const startWebSocketConnection = (wsUrl: string) => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        // Register this WebSocket in the global registry
        if (window.__registerWs) {
          window.__registerWs(ws);
        }
        
        let connectionTimeout = setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
            console.error('[WS] Connection timed out');
            ws.close();
            setError('Connection timed out');
          }
        }, 10000); // 10 second timeout
        
        ws.onopen = () => {
          console.log('[WS] WebSocket connection opened');
          clearTimeout(connectionTimeout);
          setConnected(true);
          setError(null);
          setReconnectCount(0);
          
          // Send a ping to ensure connection is fully established
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
          } catch (err) {
            console.error('[WS] Error sending initial ping:', err);
          }
        };
        
        ws.onclose = (event) => {
          console.log(`[WS] WebSocket connection closed: ${event.code} ${event.reason || ''}`);
          clearTimeout(connectionTimeout);
          setConnected(false);
          
          // Unregister from global registry
          if (window.__unregisterWs && wsRef.current) {
            window.__unregisterWs(wsRef.current);
          }
          
          wsRef.current = null;
          
          // Check closure code
          if (event.code === 1000) {
            // Normal closure
            console.log('[WS] Normal closure, not reconnecting');
          } else if (event.code === 1006) {
            // Abnormal closure - likely server not running
            setError(`Connection lost: Server may be unavailable (Code ${event.code})`);
            handleReconnect();
          } else if (event.code === 1011) {
            // Server error
            setError(`Server error: ${event.reason || 'Unknown error'} (Code ${event.code})`);
            handleReconnect();
          } else {
            // Other errors
            setError(`Connection closed: ${event.reason || 'Unknown reason'} (Code ${event.code})`);
            handleReconnect();
          }
        };
        
        ws.onerror = (event) => {
          console.error('[WS] WebSocket error:', event);
          // Don't set error here, let onclose handle it
          // This prevents duplicate error messages
        };
        
        ws.onmessage = (event) => {
          try {
            // If we're in the process of disconnecting or already disconnected, don't process new messages
            if (!wsRef.current) {
              console.log('[WS] Received message after disconnection, ignoring');
              return;
            }
            
            // Show the first 100 characters of the message for debugging
            const previewData = typeof event.data === 'string' 
              ? (event.data.length > 100 ? event.data.substring(0, 100) + '...' : event.data)
              : '[Binary data]';
            console.log('[WS] Received message:', previewData);
            
            // Check if the data might be a binary message
            if (typeof event.data !== 'string') {
              console.error('[WS] Received binary data which is not supported');
              return;
            }
            
            // Check if this looks like raw base64 image data
            if (event.data.startsWith('/9j/') || event.data.startsWith('iVBOR')) {
              // This appears to be raw base64 image data
              console.log('[WS] Detected raw base64 image data');
              setFrameData(event.data);
              return;
            }
            
            // Try to parse as JSON
            let data;
            try {
              data = JSON.parse(event.data);
            } catch (parseError) {
              console.error('[WS] Error parsing message as JSON:', parseError);
              
              // See if we can extract a base64 image from the corrupted data
              const base64Match = /\/9j\/[A-Za-z0-9+/=]+/.exec(event.data);
              if (base64Match) {
                console.log('[WS] Extracted base64 image data from corrupted message');
                setFrameData(base64Match[0]);
              }
              return;
            }
            
            // Handle JSON messages
            if (data.type === 'frame') {
              // Check if frame data exists and process it
              if (data.data || data.frame) {
                const frameContent = data.data || data.frame;
                // Verify it looks like base64 data
                if (typeof frameContent === 'string' && 
                    (frameContent.startsWith('/9j/') || 
                     frameContent.startsWith('iVBOR'))) {
                  setFrameData(frameContent);
                } else {
                  console.error('[WS] Received invalid frame data format:', 
                              typeof frameContent === 'string' 
                              ? frameContent.substring(0, 20) + '...' 
                              : typeof frameContent);
                }
              } else {
                console.error('[WS] Frame message missing data field:', data);
              }
            } else if (data.type === 'error') {
              // Handle error messages from the server
              console.error('[WS] Server sent error:', data.message || 'Unknown error');
              setError(data.message || 'Unknown error');
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
            } else if (data.type === 'info') {
              // Info messages from server
              console.log('[WS] Server info:', data.message);
            } else if (data.type === 'ping') {
              // Server ping message, respond with pong to keep connection alive
              try {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
              } catch (err) {
                console.error('[WS] Error sending pong response:', err);
              }
            } else if (data.frame) {
              // Direct frame data without type field
              setFrameData(data.frame);
            }
            
            // No error if we got a message
            if (error) setError(null);
          } catch (err) {
            console.error('[WS] Error processing WebSocket message:', err);
          }
        };
      } catch (err) {
        console.error('[WS] Error setting up WebSocket:', err);
        setError('Failed to setup WebSocket connection');
      }
    };
    
    const handleReconnect = () => {
      const newReconnectCount = reconnectCount + 1;
      setReconnectCount(newReconnectCount);
      
      // Implement exponential backoff for reconnection attempts
      const backoff = Math.min(30000, Math.pow(2, newReconnectCount) * 1000);
      console.log(`[WS] Attempting to reconnect in ${backoff}ms (attempt ${newReconnectCount})`);
      
      // If we've had too many failures, check server health before reconnecting
      if (newReconnectCount > 3) {
        apiService.checkServerHealth()
          .then(isHealthy => {
            if (!isHealthy) {
              console.error('[WS] API server health check failed before reconnect');
              setError('Server appears to be unavailable. Please check that the API server is running.');
              return;
            }
            
            // Server is healthy, schedule reconnect with backoff
            setTimeout(() => {
              if (newReconnectCount <= 10) {
                connect();
              } else {
                setError('Failed to connect after multiple attempts. Please check the server status and try again.');
              }
            }, backoff);
          })
          .catch(() => {
            // Health check itself failed
            setError('Cannot connect to API server. Please check that it is running.');
          });
      } else {
        // For first few attempts, just try reconnecting
        setTimeout(() => {
          if (newReconnectCount <= 10) {
            connect();
          } else {
            setError('Failed to connect after multiple attempts. Please check the server status and try again.');
          }
        }, backoff);
      }
    };
    
    connect();
    
    // Cleanup function
    return () => {
      console.log('[StreamViewWS] Effect cleanup - closing connection');
      cleanupWebSocketConnection();
    };
  }, [streamId, fps]); // Add fps to dependencies to reconnect when it changes

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
    img.onerror = (e) => {
      console.error('[WS] Error loading frame image:', e);
      
      // Draw error message on canvas
      ctx.fillStyle = '#333';
      canvas.width = 400;
      canvas.height = 300;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText('Error loading image', 10, 30);
    };
    
    try {
      // Check if the frameData is valid base64
      const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(frameData.trim());
      if (!isValidBase64) {
        console.error('[WS] Received invalid base64 data');
        throw new Error('Invalid base64 data');
      }
      
      // Set the source to load the image
      img.src = `data:image/jpeg;base64,${frameData}`;
    } catch (err) {
      console.error('[WS] Error processing frame data:', err);
      
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