import { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';

interface StreamViewProps {
  streamId: string;
  refreshRate?: number; // In milliseconds
  width?: string | number;
  height?: string | number;
}

const StreamView = ({ 
  streamId, 
  refreshRate = 1000, 
  width = '100%', 
  height = 'auto' 
}: StreamViewProps) => {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadingRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  
  // Clear any existing interval
  const clearRefreshInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Also cancel any pending animation frame
    if (requestIdRef.current) {
      cancelAnimationFrame(requestIdRef.current);
      requestIdRef.current = 0;
    }
  };

  // Set up the refresh
  useEffect(() => {
    if (!streamId) {
      setError('Invalid stream ID');
      return;
    }

    // Initial image load
    refreshImage();
    
    // Set up image refresh interval using requestAnimationFrame instead of setInterval
    // for better performance and to avoid timing issues
    const scheduleNextFrame = () => {
      requestIdRef.current = requestAnimationFrame(() => {
        // Only attempt to refresh if we're not already loading an image
        if (!loadingRef.current) {
          refreshImage();
        }
        
        // Schedule next frame after the refresh rate
        setTimeout(() => {
          scheduleNextFrame();
        }, refreshRate);
      });
    };
    
    scheduleNextFrame();
    
    // Clean up on unmount
    return () => {
      clearRefreshInterval();
    };
  }, [streamId, refreshRate]);

  const refreshImage = () => {
    if (!streamId || !imgRef.current) return;

    try {
      // Set loading state to prevent simultaneous image loads
      loadingRef.current = true;
      
      // Create a new image object that won't affect the DOM or cause page refreshes
      const newImage = new Image();
      
      // Set up listeners before setting the src
      newImage.onload = () => {
        // Only update the visible image when the new one is fully loaded
        if (imgRef.current) {
          imgRef.current.src = newImage.src;
        }
        loadingRef.current = false;
        if (error) setError(null);
        if (retryCount > 0) setRetryCount(0);
      };
      
      newImage.onerror = () => {
        loadingRef.current = false;
        handleImageError();
      };
      
      // Set the source last, which triggers the loading
      const baseUrl = apiService.getFrameUrl(streamId);
      const timestamp = Date.now();
      newImage.src = `${baseUrl}?t=${timestamp}`;
    } catch (err) {
      loadingRef.current = false;
      console.error('Error refreshing image:', err);
      handleImageError();
    }
  };

  const handleImageError = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    if (newRetryCount >= 3) {
      setError('Failed to load stream. The stream may be stopped or unavailable.');
      
      // Slow down the retry rate after multiple failures
      clearRefreshInterval();
      intervalRef.current = window.setInterval(refreshImage, refreshRate * 2);
    }
  };

  return (
    <div className="stream-view">
      {error ? (
        <div className="error stream-error">
          {error}
          <button 
            className="btn retry-btn" 
            onClick={() => {
              setError(null);
              setRetryCount(0);
              loadingRef.current = false;
              refreshImage();
              
              // Reset interval to normal rate
              clearRefreshInterval();
              intervalRef.current = window.setInterval(refreshImage, refreshRate);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={`${apiService.getFrameUrl(streamId)}?t=${Date.now()}`}
          alt="Stream View"
          className="stream-image"
          onError={handleImageError}
          style={{ width, height }}
        />
      )}
    </div>
  );
};

export default StreamView; 