import { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';

interface StreamViewWSProps {
  streamId: string;
  fps?: number; // Target framerate
  width?: string | number;
  height?: string | number;
}

const StreamViewWS = ({ 
  streamId, 
  fps = 15, 
  width = '100%', 
  height = 'auto' 
}: StreamViewWSProps) => {
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [streamExists, setStreamExists] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fallbackImageRef = useRef<HTMLImageElement | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const maxRetries = 3; // Limit retries before committing to fallback

  // First check if the stream exists
  useEffect(() => {
    if (!streamId) {
      setError('Invalid stream ID');
      setLoading(false);
      return;
    }

    const checkStreamExists = async () => {
      try {
        // Check if the stream exists by making a GET request
        const stream = await apiService.getStreamById(streamId);
        if (stream && stream.id) {
          console.log(`Stream ${streamId} exists, status: ${stream.status}`);
          setStreamExists(true);
          setError(null);
        } else {
          console.error(`Stream ${streamId} doesn't exist or returned invalid data`);
          setStreamExists(false);
          setError(`Stream ${streamId} not found. The stream may have been deleted or doesn't exist.`);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error checking if stream ${streamId} exists:`, err);
        setStreamExists(false);
        setError(`Error checking stream: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    checkStreamExists();
  }, [streamId]);

  // Create a WebSocket connection once we confirm the stream exists
  useEffect(() => {
    if (!streamId || streamExists !== true) {
      return; // Don't try to connect if stream doesn't exist
    }

    // If we've tried several times and failed, stick with fallback
    if (retryCount >= maxRetries) {
      console.log(`WebSocket failed ${retryCount} times, staying with fallback mode`);
      setUseFallback(true);
      setLoading(false);
      return;
    }

    // Clean up existing connections before creating a new one
    cleanupConnections();

    // Create an image for pre-loading frames
    if (!imageRef.current) {
      imageRef.current = new Image();
    }

    // Get WebSocket URL (using the API server directly)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = apiService.getWebSocketHost();
    
    // Connect directly to the tAPI WebSocket endpoint
    const wsUrl = `${protocol}//${apiHost}/api/streams/${streamId}/ws`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    setLoading(true);
    
    try {
      // Start fallback mode immediately
      setUseFallback(true);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Set connection timeout - if not connected within 2 seconds, stay with fallback
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout - keeping fallback mode');
          if (wsRef.current) {
            wsRef.current.close();
          }
        }
      }, 2000);
      
      // Connection opened
      ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        // Clear connection timeout
        if (connectionTimeoutRef.current !== null) {
          window.clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setConnected(true);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        // Keep fallback active until we confirm WebSocket works
        
        // Send desired FPS setting
        try {
          ws.send(JSON.stringify({
            command: 'set_framerate',
            fps: fps
          }));
        } catch (e) {
          console.error('Error sending FPS setting:', e);
        }
      });
      
      // Connection closed
      ws.addEventListener('close', (event) => {
        console.log(`WebSocket disconnected with code ${event.code} - ${event.reason || 'No reason provided'}`);
        setConnected(false);
        setLoading(false);
        
        // If fallback isn't already active, activate it
        if (!useFallback) {
          setUseFallback(true);
        }
        
        // Increment retry count
        const newRetryCount = retryCount + 1;
        
        if (newRetryCount < maxRetries) {
          // Retry with increasing delay
          const timeout = Math.min(2000 * Math.pow(2, newRetryCount), 10000);
          console.log(`Will attempt to reconnect in ${timeout}ms (retry ${newRetryCount}/${maxRetries})...`);
          
          if (reconnectTimeoutRef.current !== null) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setRetryCount(newRetryCount);
          }, timeout);
        } else {
          setRetryCount(newRetryCount);
          console.log(`Maximum retry attempts (${maxRetries}) reached, staying in fallback mode`);
        }
      });
      
      // Connection error
      ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        setLoading(false);
        if (!useFallback) {
          setUseFallback(true);
        }
      });
      
      // Handle incoming messages (frames)
      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'frame') {
            if (message.frame && message.frame.length > 0) {
              // If we've received a successful frame, we can turn off fallback mode
              if (useFallback && connected) {
                console.log('Received WebSocket frame successfully, switching from fallback to WebSocket');
                setUseFallback(false);
              }
              
              // Decode base64 frame data and draw to canvas
              const img = imageRef.current;
              if (img && canvasRef.current) {
                // Set the source of the image to the base64 data
                img.onload = () => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      // If width/height provided in message, update canvas size
                      if (message.width && message.height && 
                         (canvas.width !== message.width || canvas.height !== message.height)) {
                        canvas.width = message.width;
                        canvas.height = message.height;
                      }
                      
                      // Draw the image to the canvas
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                  }
                };
                
                img.onerror = (e) => {
                  console.error('Error loading image from base64 data:', e);
                };
                
                // Set image source to trigger loading - add cache buster to prevent browser caching
                const timestamp = new Date().getTime();
                img.src = `data:image/jpeg;base64,${message.frame}#${timestamp}`;
              }
            }
          } else if (message.type === 'ping') {
            // Respond to ping with a pong to keep connection alive
            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'pong',
                  timestamp: new Date().getTime()
                }));
              }
            } catch (e) {
              console.error('Error sending pong:', e);
            }
          } else if (message.type === 'error') {
            console.error('WebSocket error message:', message.message);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });
    } catch (e) {
      console.error('Error creating WebSocket:', e);
      setLoading(false);
      if (!useFallback) {
        setUseFallback(true);
      }
    }
    
    // Clean up on unmount
    return cleanupConnections;
  }, [streamId, fps, retryCount, streamExists]);

  // Helper function to clean up all connections and timers
  const cleanupConnections = () => {
    // Close WebSocket if it exists
    if (wsRef.current) {
      try {
        const ws = wsRef.current;
        // Remove all event listeners to prevent any callbacks
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "Component unmounting");
        }
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      wsRef.current = null;
    }
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear connection timeout
    if (connectionTimeoutRef.current !== null) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Clear fallback interval
    if (fallbackIntervalRef.current !== null) {
      window.clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  };

  // Reset FPS when it changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          command: 'set_framerate',
          fps: fps
        }));
      } catch (e) {
        console.error('Error sending FPS update:', e);
      }
    }
  }, [fps]);
  
  // Fallback image polling mechanism
  useEffect(() => {
    if (useFallback && streamId && streamExists === true) {
      if (!fallbackImageRef.current) {
        fallbackImageRef.current = new Image();
      }
      
      // Start polling for frames via HTTP if WebSocket fails
      console.log('Using fallback HTTP polling mode');
      
      // Clear any existing interval
      if (fallbackIntervalRef.current !== null) {
        window.clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      
      // Function to refresh the image
      const refreshFallbackImage = () => {
        if (fallbackImageRef.current && canvasRef.current) {
          const img = fallbackImageRef.current;
          
          img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Set canvas size if needed
                if (canvas.width === 0 || canvas.height === 0) {
                  canvas.width = img.width;
                  canvas.height = img.height;
                }
                
                // Draw the image to the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            }
          };
          
          img.onerror = (e) => {
            console.error('Error loading fallback image:', e);
          };
          
          // Get a fresh frame with timestamp to prevent caching
          const timestamp = new Date().getTime();
          img.src = `${apiService.getFrameUrlWithTimestamp(streamId)}&nocache=${timestamp}`;
        }
      };
      
      // Initial refresh
      refreshFallbackImage();
      
      // Set up polling interval
      fallbackIntervalRef.current = window.setInterval(refreshFallbackImage, 1000);
      
      return () => {
        if (fallbackIntervalRef.current !== null) {
          window.clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };
    } else if (!useFallback && fallbackIntervalRef.current !== null) {
      // If we're not using fallback anymore but interval is running, stop it
      window.clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, [useFallback, streamId, streamExists]);

  // Ensure we clean up when component unmounts
  useEffect(() => {
    // This effect will run when the component unmounts
    return () => {
      console.log('StreamViewWS component unmounting, cleaning up all resources');
      
      // Cancel all connection attempts and clean up
      cleanupConnections();
      
      // Reset state to prevent any lingering effects
      setConnected(false);
      setUseFallback(false);
      setRetryCount(0);
      setLoading(false);
    };
  }, []);

  return (
    <div className="stream-view-ws">
      {error ? (
        <div className="error stream-error">
          {error}
          <button 
            className="btn retry-btn" 
            onClick={() => {
              setError(null);
              setRetryCount(0);
              setLoading(true);
              setStreamExists(null); // Reset stream existence status to trigger another check
              
              // Clean up existing connections and force reconnect
              cleanupConnections();
              
              // Clear fallback interval
              if (fallbackIntervalRef.current !== null) {
                window.clearInterval(fallbackIntervalRef.current);
                fallbackIntervalRef.current = null;
              }
              
              // Start with fallback mode for immediate feedback
              setUseFallback(true);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="stream-container">
          {loading && !useFallback && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <div className="loading-text">Connecting to stream...</div>
            </div>
          )}
          {streamExists === false && (
            <div className="error stream-placeholder">
              Stream not found or has been deleted.
            </div>
          )}
          {useFallback && !connected && streamExists === true && (
            <div className="fallback-notice">
              Using HTTP fallback mode
            </div>
          )}
          {connected && !useFallback && (
            <div className="websocket-notice">
              WebSocket connected
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            className="stream-canvas"
            style={{ 
              width, 
              height,
              display: (connected || (useFallback && streamExists === true)) ? 'block' : 'none' 
            }}
          />
        </div>
      )}
    </div>
  );
};

export default StreamViewWS; 