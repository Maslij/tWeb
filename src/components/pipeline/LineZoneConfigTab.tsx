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
  frameContainerStyle?: any;
  frameStyle?: any;
  availableClasses?: string[];
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
  cameraId,
  frameContainerStyle,
  frameStyle,
  availableClasses
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
            <Box sx={frameContainerStyle || {}}>
              <LineZoneEditor 
                imageUrl={camera?.running ? frameUrl : lastFrameUrl}
                zones={lineZoneManagerForm.zones}
                onZonesChange={(updatedZones) => {
                  handleLineZonesUpdate(updatedZones);
                  setHasUnsavedZoneChanges(true);
                }}
                onUnsavedChange={() => setHasUnsavedZoneChanges(true)}
                disabled={isSavingZones}
                availableClasses={availableClasses}
              />
            </Box>
          ) : (
            <Box sx={frameContainerStyle || {}}>
              <LineZoneEditorSkeleton />
            </Box>
          )
        ) : (
          <Box sx={frameContainerStyle || { 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px', 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: 'background.paper'
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
            disabled={isSavingZones || !hasUnsavedZoneChanges || (!camera?.running && !pipelineHasRunOnce)}
            startIcon={isSavingZones ? <CircularProgress size={20} /> : null}
            onClick={async () => {
              if (!lineZoneManagerComponent || !cameraId) return;
              
              try {
                
                // Normalize all zones to ensure they have proper values
                const normalizedZones = lineZoneManagerForm.zones.map(zone => ({
                  // Preserve the existing ID or generate a new one if missing
                  id: zone.id || `zone${Math.floor(Math.random() * 1000) + 1}`,
                  start_x: typeof zone.start_x === 'number' ? zone.start_x : parseFloat(String(zone.start_x)) || 0.2,
                  start_y: typeof zone.start_y === 'number' ? zone.start_y : parseFloat(String(zone.start_y)) || 0.5,
                  end_x: typeof zone.end_x === 'number' ? zone.end_x : parseFloat(String(zone.end_x)) || 0.8,
                  end_y: typeof zone.end_y === 'number' ? zone.end_y : parseFloat(String(zone.end_y)) || 0.5,
                  min_crossing_threshold: Math.min(Math.max(parseInt(String(zone.min_crossing_threshold)) || 1, 1), 10),
                  triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
                    zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
                  triggering_classes: Array.isArray(zone.triggering_classes) ?
                    zone.triggering_classes : [],
                  // Preserve the counts if they exist
                  in_count: zone.in_count,
                  out_count: zone.out_count
                }));
                
                // Ensure zone IDs are unique and follow simple naming convention
                const usedIds = new Set<string>();
                normalizedZones.forEach((zone, index) => {
                  if (usedIds.has(zone.id)) {
                    // If ID is duplicated, generate a new simple ID
                    let nextIndex = 1;
                    while (usedIds.has(`zone${nextIndex}`)) {
                      nextIndex++;
                    }
                    zone.id = `zone${nextIndex}`;
                  }
                  usedIds.add(zone.id);
                });
                
                // Extract the non-zone settings from the current config
                const {
                  draw_zones = true,
                  line_color = [0, 0, 255],
                  line_thickness = 2,
                  draw_counts = true,
                  text_color = [255, 255, 255],
                  text_scale = 0.5,
                  text_thickness = 1,
                  // Ensure we don't accidentally extract any other properties
                  ...otherSettings
                } = lineZoneManagerComponent.config || {};
                
                // Create a completely new config object that only has our current UI zones
                // This is critical - we must NOT spread the existing config because that can
                // bring in old zones that were deleted in the UI but still exist in the server config
                const updatedConfig = {
                  // Include only the essential non-zone settings
                  draw_zones,
                  line_color,
                  line_thickness,
                  draw_counts,
                  text_color,
                  text_scale,
                  text_thickness,
                  // Add a flag to ensure old zones are removed
                  remove_missing: true,
                  // Include ONLY the zones from the current UI state
                  zones: normalizedZones
                };
                
                // Send the update to the server as a completely new config
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