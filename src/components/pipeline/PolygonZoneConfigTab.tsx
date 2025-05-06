import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Divider, 
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import PolygonZoneEditor from './PolygonZoneEditor';
import { Camera } from '../../services/api';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  cameraId
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveZones = async () => {
    if (!polygonZoneManagerComponent || !cameraId) return;
    console.log('polygonZoneManagerForm', polygonZoneManagerForm);
    try {
      setIsSaving(true);
      
      // Create updated configuration
      const config = {
        ...polygonZoneManagerForm,
        zones: polygonZoneManagerForm.zones.map(zone => ({
          id: zone.id,
          polygon: zone.polygon,
          min_crossing_threshold: zone.min_crossing_threshold,
          triggering_anchors: zone.triggering_anchors
        }))
      };
      
      // Update the component
      await apiService.components.processors.update(
        cameraId, 
        polygonZoneManagerComponent.id, 
        { config }
      );
      
      // Force refresh of components
      await fetchComponents(true);
      
      // Reset unsaved changes flag
      setHasUnsavedZoneChanges(false);
      
      showSnackbar('Polygon zones saved successfully');
    } catch (error) {
      console.error('Error saving polygon zones:', error);
      showSnackbar('Error saving polygon zones');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Polygon Zone Configuration</Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {camera.running ? (
              <>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchComponents()}
                  disabled={isRefreshingComponents}
                >
                  {isRefreshingComponents ? 'Refreshing...' : 'Refresh'}
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={hasUnsavedZoneChanges ? <SaveIcon /> : <SaveIcon />}
                  onClick={handleSaveZones}
                  disabled={isSaving || !hasUnsavedZoneChanges}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={isStartingPipeline ? <CircularProgress size={24} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleStartStop}
                disabled={isStartingPipeline || !sourceComponent}
              >
                {isStartingPipeline ? "Starting..." : "Start Pipeline"}
              </Button>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {!camera.running && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Start the pipeline to configure polygon zones on a live video feed.
          </Alert>
        )}
        
        {camera.running && !frameUrl && !lastFrameUrl && !pipelineHasRunOnce && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Waiting for video stream... This may take a few moments.
          </Alert>
        )}
        
        {hasUnsavedZoneChanges && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}
        
        <Box sx={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
          {(frameUrl || lastFrameUrl) ? (
            <PolygonZoneEditor
              zones={polygonZoneManagerForm.zones}
              onZonesChange={(updatedZones) => {
                handlePolygonZonesUpdate(updatedZones);
                setHasUnsavedZoneChanges(true);
              }}
              imageUrl={frameUrl || lastFrameUrl}
              disabled={!camera.running || isSavingZones}
            />
          ) : (
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent>
                <Typography variant="h6" align="center" color="textSecondary">
                  {pipelineHasRunOnce ? 
                    "No video stream available. Try refreshing or restarting the pipeline." : 
                    "Start the pipeline to see the video feed and configure zones."}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default PolygonZoneConfigTab; 