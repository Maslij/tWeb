import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideocamIcon from '@mui/icons-material/Videocam';

import apiService, { CameraInput } from '../../services/api';

const NewCamera = () => {
  const navigate = useNavigate();
  const [cameraData, setCameraData] = useState<CameraInput>({
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCameraData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.cameras.create(cameraData);
      if (response) {
        navigate(`/cameras/${response.id}/pipeline`);
      } else {
        setError('Failed to create camera. Please try again.');
      }
    } catch (err) {
      console.error('Error creating camera:', err);
      setError('Failed to create camera. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Camera
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box
            display="flex"
            flexDirection="column"
            gap={3}
          >
            <Box display="flex" justifyContent="center" mb={2}>
              <VideocamIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>
            <TextField
              required
              fullWidth
              id="name"
              name="name"
              label="Camera Name"
              value={cameraData.name || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter a descriptive name for this camera"
            />
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !(cameraData.name?.trim())}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {loading ? 'Creating...' : 'Create Camera'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default NewCamera; 