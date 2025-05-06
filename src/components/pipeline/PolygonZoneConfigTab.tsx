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

interface PolygonZone {
  id: string;
  polygon: { x: number, y: number }[];
  min_crossing_threshold: number;
  triggering_anchors: string[];
  in_count?: number;
  out_count?: number;
  current_count?: number;
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
  refreshFrame
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveZones = async () => {
    if (!polygonZoneManagerComponent || !cameraId) return;
    
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
        // Preserve the counts if they exist
        in_count: zone.in_count,
        out_count: zone.out_count,
        current_count: zone.current_count
      }));

      // Create a new config object without spreading the old config
      // This ensures we don't accidentally keep old zones data
      const config: Record<string, any> = {
        draw_zones: polygonZoneManagerForm.draw_zones,
        fill_color: polygonZoneManagerForm.fill_color,
        opacity: polygonZoneManagerForm.opacity,
        outline_color: polygonZoneManagerForm.outline_color,
        outline_thickness: polygonZoneManagerForm.outline_thickness,
        draw_labels: polygonZoneManagerForm.draw_labels,
        text_color: polygonZoneManagerForm.text_color,
        text_scale: polygonZoneManagerForm.text_scale,
        text_thickness: polygonZoneManagerForm.text_thickness,
        zones: normalizedZones,
        remove_missing: true // Add this flag to tell the backend to remove zones not in this config
      };
      
      // Preserve any other config properties that aren't related to zones
      if (polygonZoneManagerComponent.config) {
        Object.entries(polygonZoneManagerComponent.config as Record<string, any>).forEach(([key, value]) => {
          // Only copy over properties that aren't already set and aren't 'zones'
          if (key !== 'zones' && config[key] === undefined) {
            config[key] = value;
          }
        });
      }
      
      showSnackbar('Saving polygon zones...');
      
      // Use apiService instead of direct fetch
      const result = await apiService.components.processors.update(
        cameraId, 
        polygonZoneManagerComponent.id, 
        { config }
      );
      
      if (result) {
        showSnackbar('Polygon zones saved successfully');
        // Clear the unsaved changes flag
        setHasUnsavedZoneChanges(false);
        
        // Force fetch the updated components from the server
        await fetchComponents(true);
        
        // Call refreshFrame to update the image immediately
        if (refreshFrame && camera?.running) {
          refreshFrame();
        }
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
      
      {!camera?.running && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Start the pipeline to configure polygon zones on a live video feed.
        </Alert>
      )}
      
      {camera?.running && !frameUrl && !lastFrameUrl && !pipelineHasRunOnce && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Waiting for video stream... This may take a few moments.
        </Alert>
      )}
      
      {hasUnsavedZoneChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Click "Save Changes" to apply them.
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Draw polygons on the image to define detection zones. Objects inside these polygons will be counted.
        {camera?.running ? 
          " You can edit these zones in real-time while the pipeline is running." : 
          " The pipeline is currently stopped, but you can still edit the zones based on the last captured frame."}
      </Typography>
      
      <Box sx={{ height: '500px' }}>
        {(frameUrl || lastFrameUrl) ? (
          <PolygonZoneEditor
            zones={polygonZoneManagerForm.zones}
            onZonesChange={(updatedZones) => {
              handlePolygonZonesUpdate(updatedZones);
              setHasUnsavedZoneChanges(true);
            }}
            imageUrl={frameUrl || lastFrameUrl}
            disabled={!camera?.running || isSavingZones}
          />
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '100%', 
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
              Start the pipeline at least once to see the camera feed and configure polygon zones
            </Typography>
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
                onClick={() => {
                  fetchComponents(true);
                  // Call refreshFrame to update the image immediately
                  if (refreshFrame) {
                    refreshFrame();
                  }
                }}
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