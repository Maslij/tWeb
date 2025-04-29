import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Snackbar,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  FormGroup,
  Chip,
  Slider,
  Checkbox
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import MemoryIcon from '@mui/icons-material/Memory';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

import apiService, { Camera, Component, ComponentInput, ComponentTypes } from '../../services/api';

// File Source form interface
interface FileSourceForm {
  url: string;
  width: number;
  height: number;
  fps: number;
  use_hw_accel: boolean;
  adaptive_timing: boolean;
}

// Add RTSP source form interface after FileSourceForm
interface RtspSourceForm {
  url: string;
  width: number;
  height: number;
  fps: number;
  use_hw_accel: boolean;
  rtsp_transport: string;
  latency: number;
}

// Object Detection form interface
interface ObjectDetectionForm {
  model_id: string;
  classes: string[];
  newClass: string;
}

// Object Tracking form interface
interface ObjectTrackingForm {
  frame_rate: number;
  track_buffer: number;
  track_thresh: number;
  high_thresh: number;
  match_thresh: number;
  draw_tracking: boolean;
  draw_track_trajectory: boolean;
  draw_track_id: boolean;
  draw_semi_transparent_boxes: boolean;
  label_font_scale: number;
}

// Line Zone Manager form interface
interface Zone {
  id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  min_crossing_threshold: number;
  triggering_anchors: string[];
}

interface LineZoneManagerForm {
  draw_zones: boolean;
  line_color: number[];
  line_thickness: number;
  draw_counts: boolean;
  text_color: number[];
  text_scale: number;
  text_thickness: number;
  zones: Zone[];
}

// File Sink form interface
interface FileSinkForm {
  path: string;
  width: number;
  height: number;
  fps: number;
  fourcc: string;
}

// Anchor options for line zones
const ANCHOR_OPTIONS = [
  "BOTTOM_LEFT", 
  "BOTTOM_RIGHT", 
  "CENTER", 
  "TOP_LEFT", 
  "TOP_RIGHT", 
  "BOTTOM_CENTER"
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pipeline-tabpanel-${index}`}
      aria-labelledby={`pipeline-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `pipeline-tab-${index}`,
    'aria-controls': `pipeline-tabpanel-${index}`,
  };
};

// Helper to convert JSON to string with formatting
const formatJson = (json: any): string => {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return JSON.stringify({});
  }
};

// Helper to parse JSON string safely
const parseJson = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return {};
  }
};

const PipelineBuilder = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Component state
  const [componentTypes, setComponentTypes] = useState<ComponentTypes | null>(null);
  const [sourceComponent, setSourceComponent] = useState<Component | null>(null);
  const [processorComponents, setProcessorComponents] = useState<Component[]>([]);
  const [sinkComponents, setSinkComponents] = useState<Component[]>([]);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'source' | 'processor' | 'sink'>('source');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [selectedComponentType, setSelectedComponentType] = useState<string>('');
  const [componentConfig, setComponentConfig] = useState<string>('{}');
  
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Add form state
  const [fileSourceForm, setFileSourceForm] = useState<FileSourceForm>({
    url: "",
    width: 640,
    height: 480,
    fps: 30,
    use_hw_accel: true,
    adaptive_timing: true
  });

  // Add RTSP form state after other form states
  const [rtspSourceForm, setRtspSourceForm] = useState<RtspSourceForm>({
    url: "rtsp://username:password@ip:port/stream",
    width: 640,
    height: 480,
    fps: 30,
    use_hw_accel: true,
    rtsp_transport: "tcp",
    latency: 200
  });

  const [objectDetectionForm, setObjectDetectionForm] = useState<ObjectDetectionForm>({
    model_id: "yolov4-tiny",
    classes: ["person"],
    newClass: ""
  });

  const [objectTrackingForm, setObjectTrackingForm] = useState<ObjectTrackingForm>({
    frame_rate: 30,
    track_buffer: 30,
    track_thresh: 0.5,
    high_thresh: 0.6,
    match_thresh: 0.8,
    draw_tracking: true,
    draw_track_trajectory: true,
    draw_track_id: true,
    draw_semi_transparent_boxes: true,
    label_font_scale: 0.6
  });

  const [lineZoneManagerForm, setLineZoneManagerForm] = useState<LineZoneManagerForm>({
    draw_zones: true,
    line_color: [255, 255, 255],
    line_thickness: 2,
    draw_counts: true,
    text_color: [0, 0, 0],
    text_scale: 0.5,
    text_thickness: 2,
    zones: [{
      id: "zone1",
      start_x: 100,
      start_y: 240,
      end_x: 400,
      end_y: 240,
      min_crossing_threshold: 1,
      triggering_anchors: ["BOTTOM_LEFT", "BOTTOM_RIGHT"]
    }]
  });

  const [fileSinkForm, setFileSinkForm] = useState<FileSinkForm>({
    path: "/tmp/output.mp4",
    width: 640,
    height: 480,
    fps: 30,
    fourcc: "mp4v"
  });

  // After the existing state declarations, add frame refresh and interval state
  const [frameUrl, setFrameUrl] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (!cameraId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch camera data
        const cameraData = await apiService.cameras.getById(cameraId);
        if (!cameraData) {
          setError('Camera not found.');
          setLoading(false);
          return;
        }
        setCamera(cameraData);
        
        // Fetch component types
        const types = await apiService.components.getTypes();
        if (types) {
          setComponentTypes(types);
        }
        
        // Fetch camera components
        const components = await apiService.components.getAll(cameraId);
        if (components) {
          setSourceComponent(components.source);
          setProcessorComponents(components.processors || []);
          setSinkComponents(components.sinks || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [cameraId]);

  const fetchComponents = async () => {
    if (!cameraId) return;
    
    try {
      const components = await apiService.components.getAll(cameraId);
      if (components) {
        setSourceComponent(components.source);
        setProcessorComponents(components.processors || []);
        setSinkComponents(components.sinks || []);
      }
    } catch (err) {
      console.error('Error fetching components:', err);
      showSnackbar('Failed to refresh components');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const openCreateDialog = (type: 'source' | 'processor' | 'sink') => {
    setDialogType(type);
    setDialogMode('create');
    setSelectedComponent(null);
    setSelectedComponentType('');
    setComponentConfig('{}');
    
    // Reset form data to defaults
    if (type === 'source') {
      setFileSourceForm({
        url: "",
        width: 640,
        height: 480,
        fps: 30,
        use_hw_accel: true,
        adaptive_timing: true
      });
      setRtspSourceForm({
        url: "rtsp://username:password@ip:port/stream",
        width: 640,
        height: 480,
        fps: 30,
        use_hw_accel: true,
        rtsp_transport: "tcp",
        latency: 200
      });
    } else if (type === 'processor') {
      setObjectDetectionForm({
        model_id: "yolov4-tiny",
        classes: ["person"],
        newClass: ""
      });
      setObjectTrackingForm({
        frame_rate: 30,
        track_buffer: 30,
        track_thresh: 0.5,
        high_thresh: 0.6,
        match_thresh: 0.8,
        draw_tracking: true,
        draw_track_trajectory: true,
        draw_track_id: true,
        draw_semi_transparent_boxes: true,
        label_font_scale: 0.6
      });
      setLineZoneManagerForm({
        draw_zones: true,
        line_color: [255, 255, 255],
        line_thickness: 2,
        draw_counts: true,
        text_color: [0, 0, 0],
        text_scale: 0.5,
        text_thickness: 2,
        zones: [{
          id: "zone1",
          start_x: 100,
          start_y: 240,
          end_x: 400,
          end_y: 240,
          min_crossing_threshold: 1,
          triggering_anchors: ["BOTTOM_LEFT", "BOTTOM_RIGHT"]
        }]
      });
    } else if (type === 'sink') {
      setFileSinkForm({
        path: "/tmp/output.mp4",
        width: 640,
        height: 480,
        fps: 30,
        fourcc: "mp4v"
      });
    }
    
    setOpenDialog(true);
  };

  const openEditDialog = (component: Component, type: 'source' | 'processor' | 'sink') => {
    setDialogType(type);
    setDialogMode('edit');
    setSelectedComponent(component);
    setSelectedComponentType(component.type);
    setComponentConfig(formatJson(component.config));
    
    // Initialize form data from component config
    if (type === 'source' && component.type === 'file') {
      const config = component.config || {};
      setFileSourceForm({
        url: config.url || "",
        width: config.width || 640,
        height: config.height || 480,
        fps: config.fps || 30,
        use_hw_accel: config.use_hw_accel !== undefined ? config.use_hw_accel : true,
        adaptive_timing: config.adaptive_timing !== undefined ? config.adaptive_timing : true
      });
    } else if (type === 'source' && component.type === 'rtsp') {
      const config = component.config || {};
      setRtspSourceForm({
        url: config.url || "rtsp://username:password@ip:port/stream",
        width: config.width || 640,
        height: config.height || 480,
        fps: config.fps || 30,
        use_hw_accel: config.use_hw_accel !== undefined ? config.use_hw_accel : true,
        rtsp_transport: config.rtsp_transport || "tcp",
        latency: config.latency || 200
      });
    } else if (type === 'processor') {
      const config = component.config || {};
      
      if (component.type === 'object_detection') {
        setObjectDetectionForm({
          model_id: config.model_id || "yolov4-tiny",
          classes: Array.isArray(config.classes) ? config.classes : ["person"],
          newClass: ""
        });
      } else if (component.type === 'object_tracking') {
        setObjectTrackingForm({
          frame_rate: config.frame_rate || 30,
          track_buffer: config.track_buffer || 30,
          track_thresh: config.track_thresh || 0.5,
          high_thresh: config.high_thresh || 0.6,
          match_thresh: config.match_thresh || 0.8,
          draw_tracking: config.draw_tracking !== undefined ? config.draw_tracking : true,
          draw_track_trajectory: config.draw_track_trajectory !== undefined ? config.draw_track_trajectory : true,
          draw_track_id: config.draw_track_id !== undefined ? config.draw_track_id : true,
          draw_semi_transparent_boxes: config.draw_semi_transparent_boxes !== undefined ? config.draw_semi_transparent_boxes : true,
          label_font_scale: config.label_font_scale || 0.6
        });
      } else if (component.type === 'line_zone_manager') {
        setLineZoneManagerForm({
          draw_zones: config.draw_zones !== undefined ? config.draw_zones : true,
          line_color: Array.isArray(config.line_color) ? config.line_color : [255, 255, 255],
          line_thickness: config.line_thickness || 2,
          draw_counts: config.draw_counts !== undefined ? config.draw_counts : true,
          text_color: Array.isArray(config.text_color) ? config.text_color : [0, 0, 0],
          text_scale: config.text_scale || 0.5,
          text_thickness: config.text_thickness || 2,
          zones: Array.isArray(config.zones) ? config.zones : [{
            id: "zone1",
            start_x: 100,
            start_y: 240,
            end_x: 400,
            end_y: 240,
            min_crossing_threshold: 1,
            triggering_anchors: ["BOTTOM_LEFT", "BOTTOM_RIGHT"]
          }]
        });
      }
    } else if (type === 'sink' && component.type === 'file') {
      const config = component.config || {};
      setFileSinkForm({
        path: config.path || "/tmp/output.mp4",
        width: config.width || 640,
        height: config.height || 480,
        fps: config.fps || 30,
        fourcc: config.fourcc || "mp4v"
      });
    }
    
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedComponentType(event.target.value);
  };

  const handleConfigChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComponentConfig(event.target.value);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Form handlers
  const handleFileSourceFormChange = (field: keyof FileSourceForm, value: any) => {
    setFileSourceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRtspSourceFormChange = (field: keyof RtspSourceForm, value: any) => {
    setRtspSourceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleObjectDetectionFormChange = (field: keyof ObjectDetectionForm, value: any) => {
    setObjectDetectionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddClass = () => {
    if (objectDetectionForm.newClass.trim()) {
      setObjectDetectionForm(prev => ({
        ...prev,
        classes: [...prev.classes, prev.newClass.trim()],
        newClass: ""
      }));
    }
  };

  const handleDeleteClass = (index: number) => {
    setObjectDetectionForm(prev => ({
      ...prev,
      classes: prev.classes.filter((_, i) => i !== index)
    }));
  };

  const handleObjectTrackingFormChange = (field: keyof ObjectTrackingForm, value: any) => {
    setObjectTrackingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLineZoneManagerFormChange = (field: keyof LineZoneManagerForm, value: any) => {
    setLineZoneManagerForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleZoneChange = (index: number, field: keyof Zone, value: any) => {
    setLineZoneManagerForm(prev => ({
      ...prev,
      zones: prev.zones.map((zone, i) => {
        if (i === index) {
          return { ...zone, [field]: value };
        }
        return zone;
      })
    }));
  };

  const handleAddZone = () => {
    setLineZoneManagerForm(prev => ({
      ...prev,
      zones: [
        ...prev.zones,
        {
          id: `zone${prev.zones.length + 1}`,
          start_x: 100,
          start_y: 240,
          end_x: 400,
          end_y: 240,
          min_crossing_threshold: 1,
          triggering_anchors: ["CENTER"]
        }
      ]
    }));
  };

  const handleDeleteZone = (index: number) => {
    setLineZoneManagerForm(prev => ({
      ...prev,
      zones: prev.zones.filter((_, i) => i !== index)
    }));
  };

  const handleToggleAnchor = (zoneIndex: number, anchor: string) => {
    setLineZoneManagerForm(prev => ({
      ...prev,
      zones: prev.zones.map((zone, i) => {
        if (i === zoneIndex) {
          const anchors = [...zone.triggering_anchors];
          const anchorIndex = anchors.indexOf(anchor);
          
          if (anchorIndex >= 0) {
            anchors.splice(anchorIndex, 1);
          } else {
            anchors.push(anchor);
          }
          
          return { ...zone, triggering_anchors: anchors };
        }
        return zone;
      })
    }));
  };

  const handleFileSinkFormChange = (field: keyof FileSinkForm, value: any) => {
    setFileSinkForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update the submit handler to use form data
  const handleSubmit = async () => {
    if (!cameraId) return;
    
    try {
      let config: any = {};
      
      // Build config based on component type
      if (dialogType === 'source' && selectedComponentType === 'file') {
        config = {
          url: fileSourceForm.url,
          width: fileSourceForm.width,
          height: fileSourceForm.height,
          fps: fileSourceForm.fps,
          use_hw_accel: fileSourceForm.use_hw_accel,
          adaptive_timing: fileSourceForm.adaptive_timing
        };
      } else if (dialogType === 'source' && selectedComponentType === 'rtsp') {
        config = {
          url: rtspSourceForm.url,
          width: rtspSourceForm.width,
          height: rtspSourceForm.height,
          fps: rtspSourceForm.fps,
          use_hw_accel: rtspSourceForm.use_hw_accel,
          rtsp_transport: rtspSourceForm.rtsp_transport,
          latency: rtspSourceForm.latency
        };
      } else if (dialogType === 'processor') {
        if (selectedComponentType === 'object_detection') {
          config = {
            model_id: objectDetectionForm.model_id,
            classes: objectDetectionForm.classes
          };
        } else if (selectedComponentType === 'object_tracking') {
          config = { ...objectTrackingForm };
        } else if (selectedComponentType === 'line_zone_manager') {
          // Ensure we're creating the exactly correct format for the line zone manager
          config = {
            draw_zones: lineZoneManagerForm.draw_zones,
            line_color: lineZoneManagerForm.line_color,
            line_thickness: lineZoneManagerForm.line_thickness,
            draw_counts: lineZoneManagerForm.draw_counts,
            text_color: lineZoneManagerForm.text_color,
            text_scale: lineZoneManagerForm.text_scale,
            text_thickness: lineZoneManagerForm.text_thickness,
            zones: lineZoneManagerForm.zones.map(zone => ({
              id: zone.id,
              start_x: zone.start_x,
              start_y: zone.start_y,
              end_x: zone.end_x,
              end_y: zone.end_y,
              min_crossing_threshold: zone.min_crossing_threshold,
              triggering_anchors: zone.triggering_anchors
            }))
          };
          // Log the config for debugging purposes
          console.log("Line zone manager config:", JSON.stringify(config, null, 2));
        } else {
          // For unsupported component types, fall back to JSON editor
          config = parseJson(componentConfig);
        }
      } else if (dialogType === 'sink' && selectedComponentType === 'file') {
        config = {
          path: fileSinkForm.path,
          width: fileSinkForm.width,
          height: fileSinkForm.height,
          fps: fileSinkForm.fps,
          fourcc: fileSinkForm.fourcc
        };
      } else {
        // For unsupported component types, fall back to JSON editor
        config = parseJson(componentConfig);
      }
      
      const componentData: ComponentInput = {
        type: selectedComponentType,
        config: config
      };
      
      if (selectedComponent && dialogMode === 'edit') {
        componentData.id = selectedComponent.id;
      }
      
      let success = false;
      
      if (dialogType === 'source') {
        if (dialogMode === 'create') {
          const result = await apiService.components.source.create(cameraId, componentData);
          success = !!result;
        } else {
          const result = await apiService.components.source.update(cameraId, { config });
          success = !!result;
        }
      } else if (dialogType === 'processor') {
        if (dialogMode === 'create') {
          const result = await apiService.components.processors.create(cameraId, componentData);
          success = !!result;
        } else if (selectedComponent) {
          const result = await apiService.components.processors.update(cameraId, selectedComponent.id, { config });
          success = !!result;
        }
      } else if (dialogType === 'sink') {
        if (dialogMode === 'create') {
          const result = await apiService.components.sinks.create(cameraId, componentData);
          success = !!result;
        } else if (selectedComponent) {
          const result = await apiService.components.sinks.update(cameraId, selectedComponent.id, { config });
          success = !!result;
        }
      }
      
      if (success) {
        showSnackbar(`Component ${dialogMode === 'create' ? 'created' : 'updated'} successfully`);
        setOpenDialog(false);
        fetchComponents();
      } else {
        showSnackbar(`Failed to ${dialogMode} component`);
      }
    } catch (err) {
      console.error('Error submitting component:', err);
      showSnackbar(`Failed to ${dialogMode} component: Invalid configuration`);
    }
  };

  const handleDeleteComponent = async (component: Component, type: 'source' | 'processor' | 'sink') => {
    if (!cameraId) return;
    
    try {
      let success = false;
      
      if (type === 'source') {
        success = await apiService.components.source.delete(cameraId);
      } else if (type === 'processor') {
        success = await apiService.components.processors.delete(cameraId, component.id);
      } else if (type === 'sink') {
        success = await apiService.components.sinks.delete(cameraId, component.id);
      }
      
      if (success) {
        showSnackbar('Component deleted successfully');
        fetchComponents();
      } else {
        showSnackbar('Failed to delete component');
      }
    } catch (err) {
      console.error('Error deleting component:', err);
      showSnackbar('Error deleting component');
    }
  };

  const handleStartStop = async () => {
    if (!camera || !cameraId) return;
    
    try {
      if (camera.running) {
        const result = await apiService.cameras.stop(cameraId);
        if (result) {
          setCamera(result);
          showSnackbar('Pipeline stopped successfully');
        } else {
          showSnackbar('Failed to stop pipeline');
        }
      } else {
        // Check if there's at least a source component
        if (!sourceComponent) {
          showSnackbar('Cannot start pipeline without a source component');
          return;
        }
        
        const result = await apiService.cameras.start(cameraId);
        if (result) {
          setCamera(result);
          showSnackbar('Pipeline started successfully');
        } else {
          showSnackbar('Failed to start pipeline');
        }
      }
    } catch (err) {
      console.error('Error starting/stopping pipeline:', err);
      showSnackbar('Error toggling pipeline state');
    }
  };

  // Add a function to refresh the frame
  const refreshFrame = () => {
    if (camera?.running && cameraId) {
      const timestamp = new Date().getTime(); // Add timestamp to prevent caching
      setFrameUrl(`${apiService.cameras.getFrame(cameraId, 90)}&t=${timestamp}`);
    }
  };

  // Set up frame refresh when camera is running
  useEffect(() => {
    if (camera?.running && cameraId) {
      // Initial frame load
      refreshFrame();
      
      // Set up interval for frame refresh (every 1 second)
      const interval = window.setInterval(refreshFrame, 1000);
      setRefreshInterval(interval);
      
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    } else {
      // Clear interval when camera stops
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setFrameUrl('');
    }
  }, [camera?.running, cameraId]);

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Render component card
  const renderComponentCard = (component: Component, type: 'source' | 'processor' | 'sink') => {
    return (
      <Card key={component.id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {component.type_name || component.type}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {component.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {component.running ? 'Running' : 'Stopped'}
          </Typography>
        </CardContent>
        <CardActions>
          <Button 
            size="small" 
            startIcon={<EditIcon />}
            onClick={() => openEditDialog(component, type)}
            disabled={camera?.running}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteComponent(component, type)}
            disabled={camera?.running}
          >
            Delete
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !camera) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Alert severity="error">{error || 'Camera not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            {camera.name || `Camera ${camera.id.substring(0, 6)}`} - Pipeline Configuration
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            color={camera.running ? "error" : "success"}
            startIcon={camera.running ? <StopIcon /> : <PlayArrowIcon />}
            onClick={handleStartStop}
          >
            {camera.running ? "Stop Pipeline" : "Start Pipeline"}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="pipeline tabs">
            <Tab icon={<VideoSettingsIcon />} label="Source" {...a11yProps(0)} />
            <Tab icon={<MemoryIcon />} label="Processors" {...a11yProps(1)} />
            <Tab icon={<SaveIcon />} label="Sinks" {...a11yProps(2)} />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => openCreateDialog('source')}
              disabled={!!sourceComponent || camera.running}
            >
              Add Source
            </Button>
          </Box>
          
          <Box sx={{ minHeight: '400px' }}>
            {sourceComponent ? (
              renderComponentCard(sourceComponent, 'source')
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                No source component added yet. Add a source to start building your pipeline.
              </Typography>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => openCreateDialog('processor')}
              disabled={!sourceComponent || camera.running}
            >
              Add Processor
            </Button>
          </Box>
          
          <Box sx={{ minHeight: '400px' }}>
            {processorComponents.length > 0 ? (
              <Stack spacing={2}>
                {processorComponents.map(processor => (
                  <Box key={processor.id}>
                    {renderComponentCard(processor, 'processor')}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                No processor components added yet. Add processors to process the video stream.
              </Typography>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => openCreateDialog('sink')}
              disabled={!sourceComponent || camera.running}
            >
              Add Sink
            </Button>
          </Box>
          
          <Box sx={{ minHeight: '400px' }}>
            {sinkComponents.length > 0 ? (
              <Stack spacing={2}>
                {sinkComponents.map(sink => (
                  <Box key={sink.id}>
                    {renderComponentCard(sink, 'sink')}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                No sink components added yet. Add sinks to save or stream the processed video.
              </Typography>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialog for creating/editing components */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create' : 'Edit'} {dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} Component
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Component Type Selection (only for create mode) */}
            {dialogMode === 'create' && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="component-type-label">Component Type</InputLabel>
                <Select
                  labelId="component-type-label"
                  value={selectedComponentType}
                  onChange={handleTypeChange}
                  label="Component Type"
                >
                  {componentTypes && componentTypes[dialogType === 'source' ? 'sources' : 
                                      dialogType === 'processor' ? 'processors' : 'sinks'].map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {/* Source Form (File type) */}
            {dialogType === 'source' && selectedComponentType === 'file' && (
              <Box>
                <Typography variant="h6" gutterBottom>File Source Configuration</Typography>
                
                <TextField
                  label="Video File URL"
                  value={fileSourceForm.url}
                  onChange={(e) => handleFileSourceFormChange('url', e.target.value)}
                  fullWidth
                  margin="normal"
                  helperText="Path to video file, e.g., /path/to/video.mp4"
                />
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={fileSourceForm.width}
                    onChange={(e) => handleFileSourceFormChange('width', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={fileSourceForm.height}
                    onChange={(e) => handleFileSourceFormChange('height', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="FPS"
                    type="number"
                    value={fileSourceForm.fps}
                    onChange={(e) => handleFileSourceFormChange('fps', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                </Stack>
                
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={fileSourceForm.use_hw_accel}
                        onChange={(e) => handleFileSourceFormChange('use_hw_accel', e.target.checked)}
                      />
                    }
                    label="Use Hardware Acceleration"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={fileSourceForm.adaptive_timing}
                        onChange={(e) => handleFileSourceFormChange('adaptive_timing', e.target.checked)}
                      />
                    }
                    label="Adaptive Timing"
                  />
                </FormGroup>
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify({
                    url: fileSourceForm.url,
                    width: fileSourceForm.width,
                    height: fileSourceForm.height,
                    fps: fileSourceForm.fps,
                    use_hw_accel: fileSourceForm.use_hw_accel,
                    adaptive_timing: fileSourceForm.adaptive_timing
                  }, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* RTSP Source Form */}
            {dialogType === 'source' && selectedComponentType === 'rtsp' && (
              <Box>
                <Typography variant="h6" gutterBottom>RTSP Source Configuration</Typography>
                
                <TextField
                  label="RTSP URL"
                  value={rtspSourceForm.url}
                  onChange={(e) => handleRtspSourceFormChange('url', e.target.value)}
                  fullWidth
                  margin="normal"
                  helperText="RTSP URL, e.g., rtsp://username:password@ip:port/stream"
                />
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={rtspSourceForm.width}
                    onChange={(e) => handleRtspSourceFormChange('width', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={rtspSourceForm.height}
                    onChange={(e) => handleRtspSourceFormChange('height', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="FPS"
                    type="number"
                    value={rtspSourceForm.fps}
                    onChange={(e) => handleRtspSourceFormChange('fps', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                </Stack>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="rtsp-transport-label">RTSP Transport</InputLabel>
                    <Select
                      labelId="rtsp-transport-label"
                      value={rtspSourceForm.rtsp_transport}
                      onChange={(e) => handleRtspSourceFormChange('rtsp_transport', e.target.value)}
                      label="RTSP Transport"
                    >
                      <MenuItem value="tcp">TCP</MenuItem>
                      <MenuItem value="udp">UDP</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                      <MenuItem value="udp_multicast">UDP Multicast</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Latency (ms)"
                    type="number"
                    value={rtspSourceForm.latency}
                    onChange={(e) => handleRtspSourceFormChange('latency', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                    helperText="Lower values reduce delay but may increase jitter"
                  />
                </Stack>
                
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={rtspSourceForm.use_hw_accel}
                        onChange={(e) => handleRtspSourceFormChange('use_hw_accel', e.target.checked)}
                      />
                    }
                    label="Use Hardware Acceleration"
                  />
                </FormGroup>
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify({
                    url: rtspSourceForm.url,
                    width: rtspSourceForm.width,
                    height: rtspSourceForm.height,
                    fps: rtspSourceForm.fps,
                    use_hw_accel: rtspSourceForm.use_hw_accel,
                    rtsp_transport: rtspSourceForm.rtsp_transport,
                    latency: rtspSourceForm.latency
                  }, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* Object Detection Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'object_detection' && (
              <Box>
                <Typography variant="h6" gutterBottom>Object Detection Configuration</Typography>
                
                <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
                  <InputLabel id="model-label">Model</InputLabel>
                  <Select
                    labelId="model-label"
                    value={objectDetectionForm.model_id}
                    onChange={(e) => handleObjectDetectionFormChange('model_id', e.target.value)}
                    label="Model"
                  >
                    <MenuItem value="yolov4">YOLOv4</MenuItem>
                    <MenuItem value="yolov4-tiny">YOLOv4-Tiny</MenuItem>
                    <MenuItem value="yolov5">YOLOv5</MenuItem>
                    <MenuItem value="yolov7">YOLOv7</MenuItem>
                  </Select>
                </FormControl>
                
                <Typography variant="subtitle1" gutterBottom>Classes to Detect</Typography>
                
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {objectDetectionForm.classes.map((cls, index) => (
                    <Chip
                      key={index}
                      label={cls}
                      onDelete={() => handleDeleteClass(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <TextField
                    label="Add Class"
                    value={objectDetectionForm.newClass}
                    onChange={(e) => handleObjectDetectionFormChange('newClass', e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddClass}
                    disabled={!objectDetectionForm.newClass.trim()}
                  >
                    Add
                  </Button>
                </Box>
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify({
                    model_id: objectDetectionForm.model_id,
                    classes: objectDetectionForm.classes
                  }, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* Object Tracking Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'object_tracking' && (
              <Box>
                <Typography variant="h6" gutterBottom>Object Tracking Configuration</Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Frame Rate"
                    type="number"
                    value={objectTrackingForm.frame_rate}
                    onChange={(e) => handleObjectTrackingFormChange('frame_rate', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Track Buffer"
                    type="number"
                    value={objectTrackingForm.track_buffer}
                    onChange={(e) => handleObjectTrackingFormChange('track_buffer', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                </Stack>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Tracking Thresholds</Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Track Threshold: {objectTrackingForm.track_thresh.toFixed(2)}
                    </Typography>
                    <Slider
                      value={objectTrackingForm.track_thresh}
                      onChange={(_, value) => handleObjectTrackingFormChange('track_thresh', value as number)}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      High Threshold: {objectTrackingForm.high_thresh.toFixed(2)}
                    </Typography>
                    <Slider
                      value={objectTrackingForm.high_thresh}
                      onChange={(_, value) => handleObjectTrackingFormChange('high_thresh', value as number)}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Match Threshold: {objectTrackingForm.match_thresh.toFixed(2)}
                    </Typography>
                    <Slider
                      value={objectTrackingForm.match_thresh}
                      onChange={(_, value) => handleObjectTrackingFormChange('match_thresh', value as number)}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Stack>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Visualization Options</Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormGroup sx={{ width: '100%' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={objectTrackingForm.draw_tracking}
                          onChange={(e) => handleObjectTrackingFormChange('draw_tracking', e.target.checked)}
                        />
                      }
                      label="Draw Tracking"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={objectTrackingForm.draw_track_trajectory}
                          onChange={(e) => handleObjectTrackingFormChange('draw_track_trajectory', e.target.checked)}
                        />
                      }
                      label="Draw Track Trajectory"
                    />
                  </FormGroup>
                  <FormGroup sx={{ width: '100%' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={objectTrackingForm.draw_track_id}
                          onChange={(e) => handleObjectTrackingFormChange('draw_track_id', e.target.checked)}
                        />
                      }
                      label="Draw Track ID"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={objectTrackingForm.draw_semi_transparent_boxes}
                          onChange={(e) => handleObjectTrackingFormChange('draw_semi_transparent_boxes', e.target.checked)}
                        />
                      }
                      label="Draw Semi-Transparent Boxes"
                    />
                  </FormGroup>
                </Stack>
                
                <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Label Font Scale: {objectTrackingForm.label_font_scale.toFixed(1)}
                  </Typography>
                  <Slider
                    value={objectTrackingForm.label_font_scale}
                    onChange={(_, value) => handleObjectTrackingFormChange('label_font_scale', value as number)}
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify(objectTrackingForm, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* Line Zone Manager Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'line_zone_manager' && (
              <Box>
                <Typography variant="h6" gutterBottom>Line Zone Manager Configuration</Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormGroup sx={{ width: '100%' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={lineZoneManagerForm.draw_zones}
                          onChange={(e) => handleLineZoneManagerFormChange('draw_zones', e.target.checked)}
                        />
                      }
                      label="Draw Zones"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={lineZoneManagerForm.draw_counts}
                          onChange={(e) => handleLineZoneManagerFormChange('draw_counts', e.target.checked)}
                        />
                      }
                      label="Draw Counts"
                    />
                  </FormGroup>
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      label="Line Thickness"
                      type="number"
                      value={lineZoneManagerForm.line_thickness}
                      onChange={(e) => handleLineZoneManagerFormChange('line_thickness', parseInt(e.target.value))}
                      fullWidth
                      margin="normal"
                    />
                    <TextField
                      label="Text Scale"
                      type="number"
                      value={lineZoneManagerForm.text_scale}
                      onChange={(e) => handleLineZoneManagerFormChange('text_scale', parseFloat(e.target.value))}
                      fullWidth
                      margin="normal"
                      inputProps={{ step: 0.1 }}
                    />
                    <TextField
                      label="Text Thickness"
                      type="number"
                      value={lineZoneManagerForm.text_thickness}
                      onChange={(e) => handleLineZoneManagerFormChange('text_thickness', parseInt(e.target.value))}
                      fullWidth
                      margin="normal"
                    />
                  </Box>
                </Stack>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Zones</Typography>
                
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddZone} 
                  sx={{ mb: 2 }}
                >
                  Add Zone
                </Button>
                
                {lineZoneManagerForm.zones.map((zone, index) => (
                  <Card key={index} sx={{ mb: 2, mt: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1">Zone {index + 1}</Typography>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteZone(index)}
                          disabled={lineZoneManagerForm.zones.length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      <TextField
                        label="Zone ID"
                        value={zone.id}
                        onChange={(e) => handleZoneChange(index, 'id', e.target.value)}
                        fullWidth
                        margin="normal"
                      />
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Start X"
                          type="number"
                          value={zone.start_x}
                          onChange={(e) => handleZoneChange(index, 'start_x', parseInt(e.target.value))}
                          fullWidth
                          margin="normal"
                        />
                        <TextField
                          label="Start Y"
                          type="number"
                          value={zone.start_y}
                          onChange={(e) => handleZoneChange(index, 'start_y', parseInt(e.target.value))}
                          fullWidth
                          margin="normal"
                        />
                      </Stack>
                      
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="End X"
                          type="number"
                          value={zone.end_x}
                          onChange={(e) => handleZoneChange(index, 'end_x', parseInt(e.target.value))}
                          fullWidth
                          margin="normal"
                        />
                        <TextField
                          label="End Y"
                          type="number"
                          value={zone.end_y}
                          onChange={(e) => handleZoneChange(index, 'end_y', parseInt(e.target.value))}
                          fullWidth
                          margin="normal"
                        />
                      </Stack>
                      
                      <TextField
                        label="Min Crossing Threshold"
                        type="number"
                        value={zone.min_crossing_threshold}
                        onChange={(e) => handleZoneChange(index, 'min_crossing_threshold', parseInt(e.target.value))}
                        fullWidth
                        margin="normal"
                      />
                      
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Triggering Anchors</Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {ANCHOR_OPTIONS.map((anchor) => (
                          <Chip
                            key={anchor}
                            label={anchor}
                            onClick={() => handleToggleAnchor(index, anchor)}
                            color={zone.triggering_anchors.includes(anchor) ? "primary" : "default"}
                            variant={zone.triggering_anchors.includes(anchor) ? "filled" : "outlined"}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify(lineZoneManagerForm, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* File Sink Form */}
            {dialogType === 'sink' && selectedComponentType === 'file' && (
              <Box>
                <Typography variant="h6" gutterBottom>File Sink Configuration</Typography>
                
                <TextField
                  label="Output File Path"
                  value={fileSinkForm.path}
                  onChange={(e) => handleFileSinkFormChange('path', e.target.value)}
                  fullWidth
                  margin="normal"
                  helperText="Path to output file, e.g., /tmp/output.mp4"
                />
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={fileSinkForm.width}
                    onChange={(e) => handleFileSinkFormChange('width', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={fileSinkForm.height}
                    onChange={(e) => handleFileSinkFormChange('height', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="FPS"
                    type="number"
                    value={fileSinkForm.fps}
                    onChange={(e) => handleFileSinkFormChange('fps', parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                  />
                </Stack>
                
                <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
                  <InputLabel id="fourcc-label">Codec (FourCC)</InputLabel>
                  <Select
                    labelId="fourcc-label"
                    value={fileSinkForm.fourcc}
                    onChange={(e) => handleFileSinkFormChange('fourcc', e.target.value)}
                    label="Codec (FourCC)"
                  >
                    <MenuItem value="mp4v">MP4V (MPEG-4)</MenuItem>
                    <MenuItem value="avc1">AVC1 (H.264)</MenuItem>
                    <MenuItem value="hevc">HEVC (H.265)</MenuItem>
                  </Select>
                </FormControl>
                
                {/* JSON Preview */}
                <TextField
                  label="Configuration Preview (JSON)"
                  multiline
                  rows={6}
                  value={JSON.stringify({
                    path: fileSinkForm.path,
                    width: fileSinkForm.width,
                    height: fileSinkForm.height,
                    fps: fileSinkForm.fps,
                    fourcc: fileSinkForm.fourcc
                  }, null, 2)}
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 3 }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Box>
            )}
            
            {/* Generic JSON Editor for unsupported component types */}
            {((dialogType === 'source' && selectedComponentType !== 'file') ||
              (dialogType === 'processor' && 
               selectedComponentType !== 'object_detection' && 
               selectedComponentType !== 'object_tracking' && 
               selectedComponentType !== 'line_zone_manager') ||
              (dialogType === 'sink' && selectedComponentType !== 'file')) && (
              <TextField
                label="Component Configuration (JSON)"
                multiline
                rows={10}
                value={componentConfig}
                onChange={handleConfigChange}
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={(dialogType === 'source' && selectedComponentType === 'file' && !fileSourceForm.url) ||
                     (dialogType === 'source' && selectedComponentType === 'rtsp' && !rtspSourceForm.url) ||
                     (dialogType === 'sink' && selectedComponentType === 'file' && !fileSinkForm.path)}
          >
            {dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />

      {/* Add this component right after the Paper component and before the Dialog */}
      {camera?.running && frameUrl && (
        <Paper sx={{ width: '100%', mt: 4, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Live Preview
          </Typography>
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <img 
              src={frameUrl} 
              alt="Camera feed" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '500px', 
                border: '1px solid #ccc',
                borderRadius: '4px'
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="outlined" onClick={refreshFrame}>
              Refresh Frame
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default PipelineBuilder; 