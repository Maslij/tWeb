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
  frameContainerStyle?: any; // Added prop for consistent frame container style
  frameStyle?: any; // Added prop for consistent frame style
}

const LivePlaybackTab: React.FC<LivePlaybackTabProps> = ({
  camera,
  frameUrl,
  lastFrameUrl,
  pipelineHasRunOnce,
  refreshFrame,
  handleStartStop,
  isStartingPipeline,
  sourceComponent,
  frameContainerStyle,
  frameStyle
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
      
      <Box sx={{ width: '100%' }}>
        {(camera?.running && !frameUrl) && (
          <Box sx={frameContainerStyle || {}}>
            <ImageSkeleton />
          </Box>
        )}
        {(camera?.running && frameUrl) && (
          <Box sx={frameContainerStyle || {}}>
            <img 
              src={frameUrl} 
              alt="Camera feed" 
              style={{
                ...frameStyle,
                width: '100%',
                height: '100%',
                objectFit: 'fill'
              }}
            />
          </Box>
        )}
        {(!camera?.running) && (
          <Box sx={frameContainerStyle || { 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px', 
            height: '600px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: 'background.paper'
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <LiveTvIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Pipeline not started
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Start the pipeline to see the live video feed
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default LivePlaybackTab; 