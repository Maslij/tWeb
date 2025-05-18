import React from 'react';
import {
  Paper,
  Divider,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import LineZoneEditor from './LineZoneEditor';
import { LineZoneEditorSkeleton } from './SkeletonComponents';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RedoIcon from '@mui/icons-material/Redo';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import apiService, { Camera, Component } from '../../services/api';
import { Zone } from './LineZoneList';

interface LineZoneConfigTabProps {
  camera: Camera;
  frameUrl: string;
  lastFrameUrl: string;
  pipelineHasRunOnce: boolean;
  lineZoneManagerForm: {
    zones: Zone[];
    [key: string]: any;
  };
  handleLineZonesUpdate: (zones: Zone[]) => void;
  isSavingZones: boolean;
  handleStartStop: () => void;
  isStartingPipeline: boolean;
  sourceComponent: Component | null;
  isRefreshingComponents: boolean;
  fetchComponents: (forceUpdate?: boolean) => Promise<void>;
  lineZoneManagerComponent: Component | undefined;
  hasUnsavedZoneChanges: boolean;
  setHasUnsavedZoneChanges: (value: boolean) => void;
  showSnackbar: (message: string) => void;
  cameraId: string | undefined;
}

const LineZoneConfigTab: React.FC<LineZoneConfigTabProps> = ({
  camera,
  frameUrl,
  lastFrameUrl,
  pipelineHasRunOnce,
  lineZoneManagerForm,
  handleLineZonesUpdate,
  isSavingZones,
  handleStartStop,
  isStartingPipeline,
  sourceComponent,
  isRefreshingComponents,
  fetchComponents,
  lineZoneManagerComponent,
  hasUnsavedZoneChanges,
  setHasUnsavedZoneChanges,
  showSnackbar,
  cameraId
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <VisibilityIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Line Zone Configuration
          {!camera?.running && pipelineHasRunOnce && " (Last Frame)"}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Draw crossing lines on the image to define detection zones. Objects crossing these lines will be counted.
        {camera?.running ? 
          " You can edit these zones in real-time while the pipeline is running." : 
          " The pipeline is currently stopped, but you can still edit the zones based on the last captured frame."}
      </Typography>
      
      {/* Line Zone Editor view */}
      <Box sx={{ mt: 3, width: '100%', position: 'relative' }}>
        {hasUnsavedZoneChanges && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have unsaved zone changes. Click "Save Line Zones" to apply them.
          </Alert>
        )}
        
        {/* Show the image and zone editor */}
        {(camera?.running || pipelineHasRunOnce) ? (
          frameUrl || lastFrameUrl ? (
            <LineZoneEditor 
              imageUrl={camera?.running ? frameUrl : lastFrameUrl}
              zones={lineZoneManagerForm.zones}
              onZonesChange={(updatedZones) => {
                handleLineZonesUpdate(updatedZones);
                setHasUnsavedZoneChanges(true);
              }}
              disabled={isSavingZones}
            />
          ) : (
            <LineZoneEditorSkeleton />
          )
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <VisibilityIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pipeline not started
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start the pipeline to configure line zones
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
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained"
            startIcon={<RedoIcon />}
            disabled={isRefreshingComponents || (!camera?.running && !pipelineHasRunOnce)}
            onClick={() => fetchComponents(true)}
          >
            Refresh Counts
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            disabled={isSavingZones || (!camera?.running && !pipelineHasRunOnce)}
            startIcon={isSavingZones ? <CircularProgress size={20} /> : null}
            onClick={async () => {
              if (!lineZoneManagerComponent || !cameraId) return;
              
              try {
                setHasUnsavedZoneChanges(false);
                
                // Normalize all zones to ensure they have proper values
                const normalizedZones = lineZoneManagerForm.zones.map(zone => ({
                  id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
                  start_x: typeof zone.start_x === 'number' ? zone.start_x : parseFloat(String(zone.start_x)) || 0.2,
                  start_y: typeof zone.start_y === 'number' ? zone.start_y : parseFloat(String(zone.start_y)) || 0.5,
                  end_x: typeof zone.end_x === 'number' ? zone.end_x : parseFloat(String(zone.end_x)) || 0.8,
                  end_y: typeof zone.end_y === 'number' ? zone.end_y : parseFloat(String(zone.end_y)) || 0.5,
                  min_crossing_threshold: Math.min(Math.max(parseInt(String(zone.min_crossing_threshold)) || 1, 1), 10),
                  triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
                    zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
                  // Preserve the counts if they exist
                  in_count: zone.in_count,
                  out_count: zone.out_count
                }));
                
                // Update the component configuration
                const updatedConfig = {
                  ...lineZoneManagerComponent.config,
                  zones: normalizedZones
                };
                
                // Send the update to the server
                const result = await apiService.components.processors.update(
                  cameraId, 
                  lineZoneManagerComponent.id, 
                  { config: updatedConfig }
                );
                
                if (result) {
                  showSnackbar('Line zones updated successfully');
                  // Clear the unsaved changes flag
                  setHasUnsavedZoneChanges(false);
                  // Force fetch the updated components from the server
                  await fetchComponents(true);
                } else {
                  showSnackbar('Failed to update line zones');
                }
              } catch (err) {
                console.error('Error updating line zones:', err);
                showSnackbar('Error updating line zones');
              }
            }}
          >
            {isSavingZones ? 'Saving...' : 'Save Line Zones'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default LineZoneConfigTab; 