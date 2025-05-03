import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Skeleton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import RouterIcon from '@mui/icons-material/Router';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';
import TimelineIcon from '@mui/icons-material/Timeline';
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';

import apiService, { Camera, Component, Task } from '../services/api';

// Define additional interfaces to match the API structure for components
interface CameraComponents {
  source: Component | null;
  processors: Component[];
  sinks: Component[];
}

// Define component type mappings similar to PipelineBuilder.tsx
const sourceTypeMapping: Record<string, { icon: React.ReactElement, label: string }> = {
  file: { icon: <VideoFileIcon fontSize="small" />, label: "File Source" },
  rtsp: { icon: <RouterIcon fontSize="small" />, label: "RTSP Camera" }
};

const processorTypeMapping: Record<string, { icon: React.ReactElement, label: string }> = {
  object_detection: { icon: <LocalPoliceIcon fontSize="small" />, label: "Object Detection" },
  object_tracking: { icon: <TimelineIcon fontSize="small" />, label: "Object Tracking" },
  line_zone_manager: { icon: <FilterCenterFocusIcon fontSize="small" />, label: "Line Zone Manager" }
};

const sinkTypeMapping: Record<string, { icon: React.ReactElement, label: string }> = {
  file: { icon: <SaveIcon fontSize="small" />, label: "File Sink" },
  database: { icon: <StorageIcon fontSize="small" />, label: "Database Sink" }
};

// Skeleton card component for loading state
const CameraSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Skeleton variant="rectangular" height={200} animation="wave" />
    <CardContent sx={{ flexGrow: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Skeleton variant="text" width="60%" height={32} animation="wave" />
        <Skeleton variant="rounded" width={80} height={24} animation="wave" />
      </Box>
      <Skeleton variant="text" width="100%" height={20} animation="wave" />
      <Skeleton variant="text" width="100%" height={20} animation="wave" />
    </CardContent>
    <CardActions sx={{ padding: 2, pt: 0 }}>
      <Skeleton variant="rounded" width={80} height={32} animation="wave" />
      <Skeleton variant="rounded" width={100} height={32} animation="wave" />
      <Box flexGrow={1} />
      <Skeleton variant="circular" width={32} height={32} animation="wave" />
    </CardActions>
  </Card>
);

// Get the actual component type as a string
const getComponentType = (component: Component): string => {
  if (typeof component.type === 'string') {
    return component.type;
  }
  return 'unknown';
};

// Component to display component type icons
const ComponentChips = ({ components }: { components: CameraComponents }) => {
  const { source, processors, sinks } = components;

  // Return early if no components
  if (!source && (!processors || processors.length === 0) && (!sinks || sinks.length === 0)) {
    return <Typography variant="body2" color="text.secondary">No components configured</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {/* Source component */}
      {source && (
        <Tooltip title={sourceTypeMapping[getComponentType(source)]?.label || getComponentType(source)}>
          <Chip
            icon={sourceTypeMapping[getComponentType(source)]?.icon || <VideocamIcon fontSize="small" />}
            label={sourceTypeMapping[getComponentType(source)]?.label || getComponentType(source)}
            size="small"
            sx={{ mb: 1 }}
            variant="outlined"
          />
        </Tooltip>
      )}
      
      {/* Processor components */}
      {processors && processors.map((processor, idx) => (
        <Tooltip key={`proc-${idx}`} title={processorTypeMapping[getComponentType(processor)]?.label || getComponentType(processor)}>
          <Chip
            icon={processorTypeMapping[getComponentType(processor)]?.icon || <SettingsIcon fontSize="small" />}
            label={processorTypeMapping[getComponentType(processor)]?.label || getComponentType(processor)}
            size="small"
            sx={{ mb: 1 }}
            variant="outlined"
          />
        </Tooltip>
      ))}
      
      {/* Sink components */}
      {sinks && sinks.map((sink, idx) => (
        <Tooltip key={`sink-${idx}`} title={sinkTypeMapping[getComponentType(sink)]?.label || getComponentType(sink)}>
          <Chip
            icon={sinkTypeMapping[getComponentType(sink)]?.icon || <SaveIcon fontSize="small" />}
            label={sinkTypeMapping[getComponentType(sink)]?.label || getComponentType(sink)}
            size="small"
            sx={{ mb: 1 }}
            variant="outlined"
          />
        </Tooltip>
      ))}
    </Box>
  );
};

const Dashboard = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraComponents, setCameraComponents] = useState<Record<string, CameraComponents>>({});
  
  // Add state for camera deletion
  const [deletingCameraId, setDeletingCameraId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const camerasData = await apiService.cameras.getAll();
      setCameras(camerasData);
      
      // Fetch components for each camera
      const componentsMap: Record<string, CameraComponents> = {};
      for (const camera of camerasData) {
        const components = await apiService.components.getAll(camera.id);
        if (components) {
          componentsMap[camera.id] = components;
        }
      }
      setCameraComponents(componentsMap);
      setError(null);
    } catch (err) {
      setError('Failed to load cameras. Please try again later.');
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleStartCamera = async (cameraId: string) => {
    try {
      await apiService.cameras.start(cameraId);
      fetchCameras(); // Refresh camera list
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to start camera. Please try again.');
    }
  };

  const handleStopCamera = async (cameraId: string) => {
    try {
      await apiService.cameras.stop(cameraId);
      fetchCameras(); // Refresh camera list
    } catch (err) {
      console.error('Error stopping camera:', err);
      setError('Failed to stop camera. Please try again.');
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (window.confirm('Are you sure you want to delete this camera? All stored database records and analytics data for this camera will also be permanently deleted.')) {
      try {
        // Set the camera as being deleted
        setDeletingCameraId(cameraId);
        setDeleteProgress(0);
        setDeleteStatus('Starting deletion process...');
        setShowDeletionDialog(true);
        
        // Call API with async deletion
        const result = await apiService.cameras.delete(cameraId, true);
        
        if (result.success && result.task_id) {
          // Poll the task until completion
          apiService.tasks.pollUntilComplete(
            result.task_id,
            (task: Task) => {
              setDeleteProgress(task.progress);
              setDeleteStatus(task.message);
              
              // If task completed or failed, refresh camera list
              if (task.state === 'completed' || task.state === 'failed') {
                if (task.state === 'completed') {
                  // Allow the user to see the success message for a moment
                  setTimeout(() => {
                    setShowDeletionDialog(false);
                    setDeletingCameraId(null);
                    fetchCameras(); // Refresh camera list
                  }, 1000);
                } else {
                  setError(`Failed to delete camera: ${task.message}`);
                  setShowDeletionDialog(false);
                  setDeletingCameraId(null);
                }
              }
            }
          );
        } else {
          // Handle synchronous deletion response or failure
          if (result.success) {
            fetchCameras(); // Refresh camera list
          } else {
            setError('Failed to delete camera. Please try again.');
          }
          setShowDeletionDialog(false);
          setDeletingCameraId(null);
        }
      } catch (err) {
        console.error('Error deleting camera:', err);
        setError('Failed to delete camera. Please try again.');
        setShowDeletionDialog(false);
        setDeletingCameraId(null);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Camera Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            component={Link}
            to="/license"
            variant="outlined"
            color="primary"
            startIcon={<VpnKeyIcon />}
          >
            License
          </Button>
          <Button
            component={Link}
            to="/cameras/new"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            Add Camera
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          <CameraSkeleton />
          <CameraSkeleton />
          <CameraSkeleton />
        </Box>
      ) : cameras.length === 0 ? (
        <Paper
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <VideocamOffIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            No Cameras Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first camera to get started with the vision pipeline.
          </Typography>
          <Button
            component={Link}
            to="/cameras/new"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            Add Your First Camera
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {cameras.map((camera) => (
            <Card key={camera.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {camera.running ? (
                <CardMedia
                  component="img"
                  height="200"
                  // We use a timestamp to prevent caching
                  image={`${apiService.cameras.getFrame(camera.id, 75)}?t=${new Date().getTime()}`}
                  alt={camera.name}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                <Box
                  height="200px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="action.disabledBackground"
                >
                  <VideocamOffIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                </Box>
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="h2">
                    {camera.name || `Camera ${camera.id.substring(0, 6)}`}
                  </Typography>
                  {deletingCameraId === camera.id ? (
                    <Chip
                      icon={<CircularProgress size={16} />}
                      label="Deleting..."
                      color="warning"
                      size="small"
                    />
                  ) : (
                    <Chip
                      icon={camera.running ? <VideocamIcon /> : <VideocamOffIcon />}
                      label={camera.running ? "Running" : "Stopped"}
                      color={camera.running ? "success" : "default"}
                      size="small"
                    />
                  )}
                </Box>
                {cameraComponents[camera.id] ? (
                  <ComponentChips components={cameraComponents[camera.id]} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No components configured
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ padding: 2, pt: 0 }}>
                {camera.running ? (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => handleStopCamera(camera.id)}
                    disabled={!!deletingCameraId}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="small"
                    color="success"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartCamera(camera.id)}
                    disabled={!!deletingCameraId}
                  >
                    Start
                  </Button>
                )}
                <Button
                  component={Link}
                  to={`/cameras/${camera.id}/pipeline`}
                  size="small"
                  startIcon={<SettingsIcon />}
                  disabled={!!deletingCameraId}
                >
                  Configure
                </Button>
                <Box flexGrow={1} />
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteCamera(camera.id)}
                  disabled={!!deletingCameraId}
                >
                  {deletingCameraId === camera.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DeleteIcon fontSize="small" />
                  )}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Camera deletion dialog */}
      <Dialog open={showDeletionDialog} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>Deleting Camera</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              {deleteStatus}
            </Typography>
            <LinearProgress variant="determinate" value={deleteProgress} sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" align="right">
              {Math.round(deleteProgress)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary">
            Please wait while the camera is being deleted...
          </Typography>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard; 