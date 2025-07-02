import React, { useState } from 'react';
import {
  Paper,
  Divider,
  Alert,
  Box,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import PolygonZoneEditor from './PolygonZoneEditor';
import { Camera } from '../../services/api';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Component } from '../../services/api';
import apiService from '../../services/api';

interface PolygonZone {
  id: string;
  polygon: { x: number; y: number }[];
  min_crossing_threshold: number;
  triggering_anchors: string[];
  triggering_classes: string[];
  in_count?: number;
  out_count?: number;
  current_count?: number;
}

interface PolygonZoneManagerForm {
  draw_zones: boolean;
  fill_color: number[];
  opacity: number;
  outline_color: number[];
  outline_thickness: number;
  draw_labels: boolean;
  text_color: number[];
  text_scale: number;
  text_thickness: number;
  zones: PolygonZone[];
  [key: string]: any; // Allow for additional properties
}

interface PolygonZoneConfigTabProps {
  camera: Camera;
  frameUrl: string;
  lastFrameUrl: string;
  pipelineHasRunOnce: boolean;
  polygonZoneManagerForm: PolygonZoneManagerForm;
  handlePolygonZonesUpdate: (zones: PolygonZone[]) => void;
  isSavingZones: boolean;
  handleStartStop: () => void;
  isStartingPipeline: boolean;
  sourceComponent: Component | null;
  isRefreshingComponents: boolean;
  fetchComponents: (forceUpdate?: boolean) => Promise<void>;
  polygonZoneManagerComponent: Component | undefined;
  hasUnsavedZoneChanges: boolean;
  setHasUnsavedZoneChanges: (value: boolean) => void;
  showSnackbar: (message: string) => void;
  cameraId: string | undefined;
  refreshFrame?: () => void;
  frameContainerStyle?: any; // Added prop for consistent container styling
  frameStyle?: any; // Added prop for consistent frame styling
  availableClasses?: string[]; // Add availableClasses prop
}

const PolygonZoneConfigTab: React.FC<PolygonZoneConfigTabProps> = ({
  camera,
  frameUrl,
  lastFrameUrl,
  pipelineHasRunOnce,
  polygonZoneManagerForm,
  handlePolygonZonesUpdate,
  isSavingZones,
  handleStartStop,
  isStartingPipeline,
  sourceComponent,
  isRefreshingComponents,
  fetchComponents,
  polygonZoneManagerComponent,
  hasUnsavedZoneChanges,
  setHasUnsavedZoneChanges,
  showSnackbar,
  cameraId,
  refreshFrame,
  frameContainerStyle,
  frameStyle,
  availableClasses
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveZones = async () => {
    if (!polygonZoneManagerComponent || !cameraId) return;
    console.log(polygonZoneManagerForm);
    try {
      setIsSaving(true);
      
      // Normalize all zones to ensure they have proper values
      const normalizedZones = polygonZoneManagerForm.zones.map(zone => ({
        id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
        polygon: zone.polygon,
        min_crossing_threshold: typeof zone.min_crossing_threshold === 'number' ? 
          zone.min_crossing_threshold : parseFloat(String(zone.min_crossing_threshold)) || 1,
        triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
          zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
        triggering_classes: Array.isArray(zone.triggering_classes) ?
          zone.triggering_classes : [],
        // Preserve the counts if they exist
        in_count: zone.in_count,
        out_count: zone.out_count,
        current_count: zone.current_count
      }));
      
      // Create a new config object combining existing config with the updated zones
      const updatedConfig = {
        ...polygonZoneManagerComponent.config,
        zones: normalizedZones
      };
      
      // Update the component configuration
      const result = await apiService.components.processors.update(
        cameraId,
        polygonZoneManagerComponent.id,
        { config: updatedConfig }
      );
      
      if (result) {
        showSnackbar('Polygon zones saved successfully');
        // Clear the unsaved changes flag
        setHasUnsavedZoneChanges(false);
        
        // Force fetch the updated components from the server
        await fetchComponents(true);
      } else {
        showSnackbar('Error saving polygon zones');
      }
    } catch (error) {
      console.error('Error saving polygon zones:', error);
      showSnackbar('Error saving polygon zones');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <VisibilityIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Polygon Zone Configuration
          {!camera?.running && pipelineHasRunOnce && " (Last Frame)"}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Draw polygon zones on the image to define detection areas. Objects crossing into or out of these zones will be counted.
        {camera?.running ? 
          " You can edit these zones in real-time while the pipeline is running." : 
          " The pipeline is currently stopped, but you can still edit the zones based on the last captured frame."}
      </Typography>
      
      {!camera?.running && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Start the pipeline to configure polygon zones on a live video feed.
        </Alert>
      )}
      
      {hasUnsavedZoneChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Click "Save Polygon Zones" to apply them.
        </Alert>
      )}
      
      <Box sx={{ width: '100%', position: 'relative' }}>
        {(camera?.running || pipelineHasRunOnce) ? (
          frameUrl || lastFrameUrl ? (
            <Box sx={frameContainerStyle || {}}>
              <PolygonZoneEditor 
                imageUrl={camera?.running ? frameUrl : lastFrameUrl} 
                zones={polygonZoneManagerForm.zones}
                onZonesChange={(updatedZones) => {
                  handlePolygonZonesUpdate(updatedZones);
                  setHasUnsavedZoneChanges(true);
                }}
                onUnsavedChange={() => setHasUnsavedZoneChanges(true)}
                disabled={isSaving}
                availableClasses={availableClasses}
              />
            </Box>
          ) : (
            <Box sx={frameContainerStyle || { 
              height: '400px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '4px'
            }}>
              <CircularProgress />
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
              Start the pipeline to configure polygon zones
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
          {camera?.running ? (
            <>
              <Button 
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => fetchComponents(true)}
                disabled={isRefreshingComponents}
              >
                Refresh Counts
              </Button>
              
              <Button 
                variant="contained" 
                color="primary"
                disabled={isSaving || !hasUnsavedZoneChanges}
                startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveZones}
              >
                {isSaving ? 'Saving...' : 'Save Polygon Zones'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={isStartingPipeline ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={handleStartStop}
              disabled={isStartingPipeline || !sourceComponent}
            >
              {isStartingPipeline ? "Starting..." : "Start Pipeline"}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default PolygonZoneConfigTab; 