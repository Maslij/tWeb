import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
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
import LockIcon from '@mui/icons-material/Lock';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import apiService, { Camera, Component, Task, LicenseStatus } from '../services/api';

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
  line_zone_manager: { icon: <FilterCenterFocusIcon fontSize="small" />, label: "Line Zone Manager" },
  polygon_zone_manager: { icon: <FilterCenterFocusIcon fontSize="small" />, label: "Polygon Zone Manager" }
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
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraComponents, setCameraComponents] = useState<Record<string, CameraComponents>>({});
  
  // Add state for inference server availability
  const [inferenceServerAvailable, setInferenceServerAvailable] = useState(true);
  
  // Add state for license status
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLicenseChecked, setIsLicenseChecked] = useState(false);
  
  // Add state for camera deletion
  const [deletingCameraId, setDeletingCameraId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);

  // Add state for tracking camera start/stop operations
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  
  // Track cameras with unlicensed components
  const [unlicensedCameras, setUnlicensedCameras] = useState<Record<string, boolean>>({});
  
  // Add state for camera action menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  
  // Check license first
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await apiService.license.getStatus();
        setLicenseStatus(status);
        
        // If license is invalid, redirect to license page
        if (!status?.valid) {
          console.warn('No valid license found. Redirecting to license page.');
          navigate('/license');
          return;
        }
      } catch (err: any) {
        console.error('Error checking license:', err);
        
        // If we get a 401 Unauthorized, redirect to license page
        if (err.response && err.response.status === 401) {
          navigate('/license');
          return;
        }
        
        setError('Failed to verify license status. Some features may be restricted.');
      } finally {
        setIsLicenseChecked(true);
      }
    };
    
    checkLicense();
  }, [navigate]);

  // Only fetch cameras if license is checked and valid
  useEffect(() => {
    if (isLicenseChecked && licenseStatus?.valid) {
      fetchCameras();
    }
  }, [isLicenseChecked, licenseStatus]);

  // Check if camera has AI-dependent components
  const hasAIDependentComponents = useCallback((cameraId: string): boolean => {
    const components = cameraComponents[cameraId];
    if (!components || !components.processors) return false;
    
    // Check if any processor components require the AI server
    return components.processors.some(component => {
      const componentType = component.type;
      return ['object_detection', 'object_classification', 'age_gender_detection'].includes(String(componentType));
    });
  }, [cameraComponents]);

  // Function to check if all components of a camera are covered by the license
  const checkCameraComponentLicenseCoverage = (cameraId: string, components: CameraComponents): boolean => {
    if (!licenseStatus || !licenseStatus.tier_id) {
      return false; // If we don't have license info, mark as unlicensed
    }
    
    const currentTier = licenseStatus.tier_id;
    
    // Check source component
    if (components.source) {
      const sourceType = getComponentType(components.source);
      // Basic licensing logic based on component permissions
      // For simplicity, we'll assume some components need higher tiers
      if (sourceType === 'usb' || sourceType === 'http') {
        if (currentTier < 3) { // These require Professional tier
          return false;
        }
      }
    }
    
    // Check processor components
    for (const processor of components.processors) {
      const processorType = getComponentType(processor);
      
      // More advanced processors require higher tiers
      if (processorType === 'object_detection') {
        if (currentTier < 2) { // Requires at least Standard tier
          return false;
        }
      } else if (processorType === 'object_tracking' || 
                 processorType === 'line_zone_manager' || 
                 processorType === 'face_recognition') {
        if (currentTier < 3) { // Requires Professional tier
          return false;
        }
      }
    }
    
    // Check sink components
    for (const sink of components.sinks) {
      const sinkType = getComponentType(sink);
      
      if (sinkType === 'database' || 
          sinkType === 'rtmp' || 
          sinkType === 'websocket' || 
          sinkType === 'mqtt') {
        if (currentTier < 3) { // These require Professional tier
          return false;
        }
      }
    }
    
    return true; // All components are covered by the license
  };

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const camerasData = await apiService.cameras.getAll();
      setCameras(camerasData);
      
      // Fetch components for each camera
      const componentsMap: Record<string, CameraComponents> = {};
      const unlicensedMap: Record<string, boolean> = {};
      
      // Check for inference server availability by getting available models
      try {
        const modelResponse = await apiService.models.getObjectDetectionModels();
        setInferenceServerAvailable(modelResponse && modelResponse.models && modelResponse.models.length > 0);
      } catch (error) {
        console.error("Error checking inference server:", error);
        setInferenceServerAvailable(false);
      }
      
      for (const camera of camerasData) {
        try {
          const components = await apiService.components.getAll(camera.id);
          if (components) {
            componentsMap[camera.id] = components;
            
            // Check if camera has components not covered by license
            const isFullyLicensed = checkCameraComponentLicenseCoverage(camera.id, components);
            unlicensedMap[camera.id] = !isFullyLicensed;
          }
        } catch (err: any) {
          console.error(`Error fetching components for camera ${camera.id}:`, err);
          
          // If the error is license-related (401), redirect to license page
          if (err.response && err.response.status === 401) {
            setError('Your license is no longer valid. Redirecting to license page...');
            setTimeout(() => navigate('/license'), 2000);
            return;
          }
        }
      }
      setCameraComponents(componentsMap);
      setUnlicensedCameras(unlicensedMap);
      setError(null);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('Your license is no longer valid. Redirecting to license page...');
        setTimeout(() => navigate('/license'), 2000);
      } else {
        setError('Failed to load cameras. Please try again later.');
        console.error('Error fetching cameras:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = async (cameraId: string) => {
    try {
      // Check if camera has AI components but server is unavailable
      if (hasAIDependentComponents(cameraId) && !inferenceServerAvailable) {
        showSnackbar('Cannot start camera: AI server is unavailable');
        return;
      }
      
      setActionInProgressId(cameraId);
      await apiService.cameras.start(cameraId);
      fetchCameras(); // Refresh camera list
    } catch (err: any) {
      console.error('Error starting camera:', err);
      
      if (err.response && err.response.status === 401) {
        setError('Your license is no longer valid. Redirecting to license page...');
        setTimeout(() => navigate('/license'), 2000);
      } else {
        setError('Failed to start camera. Please try again.');
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStopCamera = async (cameraId: string) => {
    try {
      setActionInProgressId(cameraId);
      await apiService.cameras.stop(cameraId);
      fetchCameras(); // Refresh camera list
    } catch (err: any) {
      console.error('Error stopping camera:', err);
      
      if (err.response && err.response.status === 401) {
        setError('Your license is no longer valid. Redirecting to license page...');
        setTimeout(() => navigate('/license'), 2000);
      } else {
        setError('Failed to stop camera. Please try again.');
      }
    } finally {
      setActionInProgressId(null);
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
      } catch (err: any) {
        console.error('Error deleting camera:', err);
        
        if (err.response && err.response.status === 401) {
          setError('Your license is no longer valid. Redirecting to license page...');
          setTimeout(() => navigate('/license'), 2000);
          setShowDeletionDialog(false);
          setDeletingCameraId(null);
        } else {
          setError('Failed to delete camera. Please try again.');
          setShowDeletionDialog(false);
          setDeletingCameraId(null);
        }
      }
    }
  };

  // Handle opening the menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cameraId: string) => {
    event.stopPropagation(); // Prevent card click when clicking menu
    setMenuAnchorEl(event.currentTarget);
    setActiveCamera(cameraId);
  };
  
  // Handle closing the menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveCamera(null);
  };
  
  // Modified delete camera handler to work with menu
  const handleDeleteFromMenu = () => {
    if (activeCamera) {
      handleMenuClose();
      handleDeleteCamera(activeCamera);
    }
  };
  
  // Handle card click to navigate to camera details
  const handleCardClick = (cameraId: string, isUnlicensed: boolean) => {
    if (!isUnlicensed) {
      navigate(`/cameras/${cameraId}/pipeline`);
    }
  };

  // Add a showSnackbar function
  const showSnackbar = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Don't render content until license is checked
  if (!isLicenseChecked) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" my={5}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Checking license status...</Typography>
        </Box>
      </Container>
    );
  }

  // If license is invalid (but we somehow got here), show a message
  if (isLicenseChecked && (!licenseStatus || !licenseStatus.valid)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
          <VpnKeyIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            License Required
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            A valid license is required to use the Vision Dashboard.
            Please activate your license to continue.
          </Typography>
          <Button
            component={Link}
            to="/license"
            variant="contained"
            color="primary"
            startIcon={<VpnKeyIcon />}
          >
            Activate License
          </Button>
        </Paper>
      </Container>
    );
  }

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
          {cameras.map((camera) => {
            const isUnlicensed = unlicensedCameras[camera.id] || false;
            const isActionInProgress = actionInProgressId === camera.id;
            const hasAIComponents = hasAIDependentComponents(camera.id);
            const cannotStart = !camera.running && hasAIComponents && !inferenceServerAvailable;
            return (
            <Card 
              key={camera.id} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                cursor: isUnlicensed ? 'default' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: isUnlicensed ? 'none' : 'translateY(-4px)',
                  boxShadow: isUnlicensed ? undefined : (theme) => theme.shadows[6],
                },
                ...(isUnlicensed && { 
                  border: '1px solid', 
                  borderColor: 'warning.light',
                  boxShadow: theme => `0 0 8px ${theme.palette.warning.light}`
                })
              }}
              onClick={() => handleCardClick(camera.id, isUnlicensed)}
              role="button"
              aria-disabled={isUnlicensed}
            >
              {isUnlicensed && (
                <Box position="absolute" top={8} right={8} zIndex={2}>
                  <Tooltip title="This camera uses features not included in your current license tier. Please upgrade your license to use this camera.">
                    <Chip
                      icon={<LockIcon />}
                      label="License Required"
                      color="warning"
                      size="small"
                    />
                  </Tooltip>
                </Box>
              )}
              {camera.running && !isUnlicensed ? (
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
                  flexDirection="column"
                  bgcolor="action.disabledBackground"
                >
                  {isUnlicensed ? (
                    <>
                      <LockIcon sx={{ fontSize: 60, color: 'warning.main' }} />
                      <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                        License Upgrade Required
                      </Typography>
                    </>
                  ) : (
                    <VideocamOffIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                  )}
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
                {isUnlicensed && (
                  <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }} icon={<InfoIcon fontSize="small" />}>
                    This camera contains components that require a higher license tier.
                  </Alert>
                )}
              </CardContent>
              <CardActions sx={{ padding: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  {isUnlicensed ? (
                    <Button
                      component={Link}
                      to="/license"
                      size="medium"
                      color="warning"
                      startIcon={<VpnKeyIcon />}
                      variant="contained"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Upgrade License
                    </Button>
                  ) : camera.running ? (
                    <Button
                      size="medium"
                      color="error"
                      variant="contained"
                      startIcon={isActionInProgress ? <CircularProgress size={20} color="inherit" /> : <StopIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopCamera(camera.id);
                      }}
                      disabled={!!deletingCameraId || isActionInProgress}
                    >
                      {isActionInProgress ? "Stopping..." : "Stop"}
                    </Button>
                  ) : (
                    <Tooltip 
                      title={cannotStart ? 
                        "Cannot start: AI server is unavailable. This camera has AI components that require the server." : ""}
                    >
                      <span>
                        <Button
                          size="medium"
                          color="success"
                          variant="contained"
                          startIcon={isActionInProgress ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCamera(camera.id);
                          }}
                          disabled={!!deletingCameraId || isActionInProgress || cannotStart}
                        >
                          {isActionInProgress ? "Starting..." : "Start"}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                
                {!isUnlicensed && (
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, camera.id)}
                    disabled={!!deletingCameraId || isActionInProgress}
                    color="inherit"
                    aria-label="More camera options"
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </CardActions>
            </Card>
          )})}
        </Box>
      )}

      {/* Action Menu for Camera Options */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            if (activeCamera) navigate(`/cameras/${activeCamera}/pipeline`);
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Configure Pipeline</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleDeleteFromMenu} 
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Camera</ListItemText>
        </MenuItem>
      </Menu>

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