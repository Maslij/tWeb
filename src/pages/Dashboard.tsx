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
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

import apiService, { Camera } from '../services/api';

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
    </CardContent>
    <CardActions sx={{ padding: 2, pt: 0 }}>
      <Skeleton variant="rounded" width={80} height={32} animation="wave" />
      <Skeleton variant="rounded" width={100} height={32} animation="wave" />
      <Box flexGrow={1} />
      <Skeleton variant="circular" width={32} height={32} animation="wave" />
    </CardActions>
  </Card>
);

const Dashboard = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const camerasData = await apiService.cameras.getAll();
      setCameras(camerasData);
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
        const result = await apiService.cameras.delete(cameraId);
        if (result.success) {
          fetchCameras(); // Refresh camera list
        } else {
          setError('Failed to delete camera. Please try again.');
        }
      } catch (err) {
        console.error('Error deleting camera:', err);
        setError('Failed to delete camera. Please try again.');
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
                  <Chip
                    icon={camera.running ? <VideocamIcon /> : <VideocamOffIcon />}
                    label={camera.running ? "Running" : "Stopped"}
                    color={camera.running ? "success" : "default"}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Components: 
                  {camera.components && (
                    <>
                      {camera.components.source > 0 && ` Source (${camera.components.source})`}
                      {camera.components.processors > 0 && ` Processors (${camera.components.processors})`}
                      {camera.components.sinks > 0 && ` Sinks (${camera.components.sinks})`}
                    </>
                  )}
                  {(!camera.components || 
                    (camera.components.source === 0 && 
                     camera.components.processors === 0 && 
                     camera.components.sinks === 0)) && 
                    ' None'
                  }
                </Typography>
              </CardContent>
              <CardActions sx={{ padding: 2, pt: 0 }}>
                {camera.running ? (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => handleStopCamera(camera.id)}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="small"
                    color="success"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartCamera(camera.id)}
                  >
                    Start
                  </Button>
                )}
                <Button
                  component={Link}
                  to={`/cameras/${camera.id}/pipeline`}
                  size="small"
                  startIcon={<SettingsIcon />}
                >
                  Configure
                </Button>
                <Box flexGrow={1} />
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteCamera(camera.id)}
                >
                  <DeleteIcon fontSize="small" />
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard; 