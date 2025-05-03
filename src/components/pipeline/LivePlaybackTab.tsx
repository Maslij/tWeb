import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Divider,
  Alert,
  Box,
  Switch,
  FormControlLabel
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import { ImageSkeleton } from './SkeletonComponents';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import RedoIcon from '@mui/icons-material/Redo';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Camera } from '../../services/api';

interface LivePlaybackTabProps {
  camera: Camera;
  frameUrl: string;
  lastFrameUrl: string;
  pipelineHasRunOnce: boolean;
  refreshFrame: () => void;
  handleStartStop: () => void;
  isStartingPipeline: boolean;
  sourceComponent: any; // Using 'any' since we don't need the specific type here
}

const LivePlaybackTab: React.FC<LivePlaybackTabProps> = ({
  camera,
  frameUrl,
  lastFrameUrl,
  pipelineHasRunOnce,
  refreshFrame,
  handleStartStop,
  isStartingPipeline,
  sourceComponent
}) => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);
  const REFRESH_INTERVAL = 2000; // 2 seconds between refreshes

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is not visible, clear the refresh interval
        if (refreshIntervalRef.current !== null) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      } else if (autoRefresh && camera?.running) {
        // Tab is visible again and auto-refresh is on, restart interval
        startRefreshInterval();
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up interval on component unmount
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, camera?.running]);

  // Start/stop refresh interval when autoRefresh or camera.running changes
  useEffect(() => {
    if (autoRefresh && camera?.running && !document.hidden) {
      startRefreshInterval();
    } else {
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, camera?.running]);

  const startRefreshInterval = () => {
    // Clear any existing interval first
    if (refreshIntervalRef.current !== null) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Set up new interval
    refreshIntervalRef.current = window.setInterval(() => {
      refreshFrame();
    }, REFRESH_INTERVAL);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LiveTvIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Live Playback
            {!camera?.running && pipelineHasRunOnce && " (Last Frame)"}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {camera?.running && (
            <FormControlLabel
              control={
                <Switch 
                  checked={autoRefresh}
                  onChange={toggleAutoRefresh}
                  color="primary"
                />
              }
              label="Auto refresh"
            />
          )}
          {(camera?.running || pipelineHasRunOnce) && (
            <Button 
              variant="contained" 
              onClick={refreshFrame}
              icon={<RedoIcon />}
              disabled={!camera?.running}
            >
              Refresh Frame
            </Button>
          )}
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {camera?.running && !autoRefresh && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Automatic refreshing has been disabled. Click the "Refresh Frame" button to manually update the view.
        </Alert>
      )}
      
      {camera?.running && autoRefresh && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Auto-refreshing is enabled. The frame will update every 2 seconds while this tab is visible.
        </Alert>
      )}
      
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        {(camera?.running && !frameUrl) && (
          <ImageSkeleton />
        )}
        {(camera?.running && frameUrl) && (
          <img 
            src={frameUrl} 
            alt="Camera feed" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '600px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }} 
          />
        )}
        {(!camera?.running && lastFrameUrl) && (
          <img 
            src={lastFrameUrl} 
            alt="Camera feed (last frame)" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '600px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }} 
          />
        )}
        {(!camera?.running && !lastFrameUrl && pipelineHasRunOnce) && (
          <Box 
            sx={{ 
              width: '100%', 
              height: '600px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid #ccc',
              borderRadius: '4px',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No image available from the last session
            </Typography>
          </Box>
        )}
        {(!camera?.running && !lastFrameUrl && !pipelineHasRunOnce) && (
          <Box sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '600px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <LiveTvIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pipeline not started
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start the pipeline to see the live video feed
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartStop}
              disabled={isStartingPipeline || !sourceComponent}
              sx={{ mt: 2 }}
            >
              {isStartingPipeline ? "Starting..." : "Start Pipeline"}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default LivePlaybackTab; 