import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import InfoIcon from '@mui/icons-material/Info';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningIcon from '@mui/icons-material/Warning';

import apiService, { LicenseStatus, LicenseUpdate } from '../services/api';

// Define tier information interface
interface TierInfo {
  name: string;
  description: string;
  features?: string[];
}

// Sample license descriptions
const LICENSE_TIERS: Record<string, TierInfo> = {
  none: {
    name: 'None',
    description: 'No license activated'
  },
  basic: {
    name: 'Basic',
    description: 'Video sources and file recording only',
    features: ['Video sources (RTSP, files)', 'File recording']
  },
  standard: {
    name: 'Standard',
    description: 'Basic features plus object detection',
    features: ['All Basic features', 'Object detection']
  },
  professional: {
    name: 'Professional',
    description: 'Full access to all features',
    features: ['All Standard features', 'Object tracking', 'Line crossing detection', 'Database storage']
  }
};

// Sample license keys for demonstration
const SAMPLE_LICENSES = [
  { key: 'BASIC-LICENSE-KEY-123', tier: 'Basic' },
  { key: 'STANDARD-LICENSE-KEY-456', tier: 'Standard' },
  { key: 'PRO-LICENSE-KEY-789', tier: 'Professional' }
];

const LicenseSetup = () => {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseOwner, setLicenseOwner] = useState('');
  const [licenseEmail, setLicenseEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSamplesDialog, setShowSamplesDialog] = useState(false);

  // Check license status on component mount
  useEffect(() => {
    const checkLicense = async () => {
      setCheckingLicense(true);
      try {
        const status = await apiService.license.getStatus();
        if (status) {
          setLicenseStatus(status);
          // If we have a valid license, populate the edit form
          if (status.valid) {
            setLicenseOwner(status.owner || '');
            setLicenseEmail(status.email || '');
          }
        }
      } catch (err) {
        console.error('Error checking license:', err);
        setError('Could not verify license status. Please try again.');
      } finally {
        setCheckingLicense(false);
        setLoading(false);
      }
    };

    checkLicense();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Please enter a valid license key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const licenseData: LicenseUpdate = {
        license_key: licenseKey,
        owner: licenseOwner,
        email: licenseEmail
      };
      
      const result = await apiService.license.setLicense(licenseData);
      if (result && result.valid) {
        setLicenseStatus(result);
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError('Invalid license key. Please try again.');
      }
    } catch (err) {
      console.error('Error setting license key:', err);
      setError('Failed to activate license. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!licenseStatus) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updateData = {
        owner: licenseOwner,
        email: licenseEmail
      };
      
      const result = await apiService.license.updateLicense(updateData);
      if (result && result.valid) {
        setLicenseStatus(result);
        setShowEditDialog(false);
      } else {
        setError('Failed to update license information.');
      }
    } catch (err) {
      console.error('Error updating license:', err);
      setError('Failed to update license information. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await apiService.license.deleteLicense();
      if (success) {
        setLicenseStatus(null);
        setShowDeleteDialog(false);
        setLicenseKey('');
        setLicenseOwner('');
        setLicenseEmail('');
      } else {
        setError('Failed to delete license.');
      }
    } catch (err) {
      console.error('Error deleting license:', err);
      setError('Failed to delete license. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const copyLicenseKey = (key: string) => {
    setLicenseKey(key);
    setShowSamplesDialog(false);
  };

  if (checkingLicense) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" my={5}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Checking license status...</Typography>
        </Box>
      </Container>
    );
  }

  if (licenseStatus && licenseStatus.valid) {
    // Show license details and management options
    const tier = licenseStatus.tier || 'none';
    const tierInfo = LICENSE_TIERS[tier] || LICENSE_TIERS.none;
    
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mb={4}
          >
            <VerifiedIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              License Active
            </Typography>
            <Chip 
              label={tierInfo.name} 
              color={
                licenseStatus.tier === 'professional' ? 'success' :
                licenseStatus.tier === 'standard' ? 'primary' :
                'default'
              }
              sx={{ mt: 1 }}
            />
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                License Information
              </Typography>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
                <div style={{ gridColumn: 'span 6' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>License Key:</strong> {licenseStatus.key}
                  </Typography>
                </div>
                <div style={{ gridColumn: 'span 6' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>License Tier:</strong> {tierInfo.name}
                  </Typography>
                </div>
                <div style={{ gridColumn: 'span 6' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Owner:</strong> {licenseStatus.owner || 'Not specified'}
                  </Typography>
                </div>
                <div style={{ gridColumn: 'span 6' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {licenseStatus.email || 'Not specified'}
                  </Typography>
                </div>
                <div style={{ gridColumn: 'span 12' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Expiration:</strong> {licenseStatus.expiration ? 
                      new Date(licenseStatus.expiration).toLocaleDateString() : 'Not specified'}
                  </Typography>
                </div>
              </div>
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<EditIcon />} 
                onClick={() => setShowEditDialog(true)}
              >
                Edit Details
              </Button>
              <Button 
                startIcon={<DeleteIcon />} 
                color="error"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete License
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="contained"
                sx={{ ml: 'auto' }}
              >
                Go to Dashboard
              </Button>
            </CardActions>
          </Card>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Features Included in {tierInfo.name} License
          </Typography>
          
          {tierInfo.features && (
            <Box sx={{ mt: 2 }}>
              {tierInfo.features.map((feature: string, index: number) => (
                <Chip 
                  key={index} 
                  label={feature} 
                  sx={{ m: 0.5 }}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Paper>
        
        {/* Delete License Dialog */}
        <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
          <DialogTitle>Delete License?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this license? This will remove all license information and
              restrict access to premium features.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" disabled={loading}>
              {loading ? 'Deleting...' : 'Delete License'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Edit License Dialog */}
        <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
          <DialogTitle>Edit License Details</DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                id="owner"
                label="License Owner"
                name="owner"
                value={licenseOwner}
                onChange={(e) => setLicenseOwner(e.target.value)}
                InputProps={{
                  startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                }}
              />
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Contact Email"
                name="email"
                value={licenseEmail}
                onChange={(e) => setLicenseEmail(e.target.value)}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdate} 
              color="primary" 
              variant="contained"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          mb={4}
        >
          <LockIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            License Activation
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            Please enter your license key to continue using the Vision Dashboard.
          </Typography>
          <Button 
            startIcon={<InfoIcon />}
            onClick={() => setShowSamplesDialog(true)}
            sx={{ mt: 1 }}
          >
            View Sample License Keys
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box
            display="flex"
            flexDirection="column"
            gap={3}
          >
            <TextField
              required
              fullWidth
              id="licenseKey"
              name="licenseKey"
              label="License Key"
              value={licenseKey}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your license key"
              autoFocus
            />
            
            <TextField
              fullWidth
              id="licenseOwner"
              name="licenseOwner"
              label="Owner Name (Optional)"
              value={licenseOwner}
              onChange={(e) => setLicenseOwner(e.target.value)}
              disabled={loading}
              placeholder="Enter the license owner's name"
              InputProps={{
                startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <TextField
              fullWidth
              id="licenseEmail"
              name="licenseEmail"
              label="Email (Optional)"
              value={licenseEmail}
              onChange={(e) => setLicenseEmail(e.target.value)}
              disabled={loading}
              placeholder="Enter a contact email"
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading || !licenseKey.trim()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {loading ? 'Activating...' : 'Activate License'}
            </Button>

            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Don't have a license? Contact your administrator to obtain one.
            </Typography>
          </Box>
        </form>
      </Paper>
      
      {/* Sample License Keys Dialog */}
      <Dialog open={showSamplesDialog} onClose={() => setShowSamplesDialog(false)} maxWidth="md">
        <DialogTitle>Sample License Keys</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            <WarningIcon fontSize="small" color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
            For demonstration purposes, you can use the following sample license keys:
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>License Tier</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Features</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAMPLE_LICENSES.map((license) => (
                  <TableRow key={license.key}>
                    <TableCell>
                      <Chip 
                        label={license.tier} 
                        size="small" 
                        color={
                          license.tier === 'Professional' ? 'success' :
                          license.tier === 'Standard' ? 'primary' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{license.key}</TableCell>
                    <TableCell>
                      {LICENSE_TIERS[license.tier.toLowerCase()]?.description}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => copyLicenseKey(license.key)}
                      >
                        Use This Key
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSamplesDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LicenseSetup; 