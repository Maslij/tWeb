import React from 'react';
import {
  Paper,
  Divider,
  Box
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import { ImageSkeleton } from './SkeletonComponents';
import LiveTvIcon from '@mui/icons-material/LiveTv';
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
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LiveTvIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Live Playback
          {!camera?.running && pipelineHasRunOnce && " (Last Frame)"}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
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