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
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';

import apiService, { Camera, Component, ComponentInput } from '../../services/api';

// Component type mapping interfaces
interface ComponentTypeInfo {
  name: string;
  description: string;
  icon?: React.ReactNode;
}

interface ComponentTypeMapping {
  [key: string]: ComponentTypeInfo;
}

// Human-readable component type mappings
const sourceTypeMapping: ComponentTypeMapping = {
  "rtsp": {
    name: "RTSP Camera Stream",
    description: "Connect to an IP camera using the RTSP protocol",
    icon: <VideoSettingsIcon />
  },
  "file": {
    name: "Video File",
    description: "Process a pre-recorded video file",
    icon: <VideoSettingsIcon />
  }
};

const processorTypeMapping: ComponentTypeMapping = {
  "object_detection": {
    name: "Object Detection",
    description: "Detect objects in the video using deep learning models",
    icon: <MemoryIcon />
  },
  "object_tracking": {
    name: "Object Tracking",
    description: "Track detected objects across video frames",
    icon: <MemoryIcon />
  },
  "line_zone_manager": {
    name: "Line Crossing Detection",
    description: "Count objects crossing defined line zones",
    icon: <MemoryIcon />
  }
};

const sinkTypeMapping: ComponentTypeMapping = {
  "file": {
    name: "Video File Output",
    description: "Save processed video to a file",
    icon: <SaveIcon />
  }
};

// Helper function to get human-readable name for a component type
const getComponentTypeName = (type: string, componentCategory: 'source' | 'processor' | 'sink'): string => {
  const mapping = componentCategory === 'source' 
    ? sourceTypeMapping 
    : componentCategory === 'processor' 
      ? processorTypeMapping 
      : sinkTypeMapping;
  
  return mapping[type]?.name || type;
};

// Helper function to get description for a component type
const getComponentTypeDescription = (type: string, componentCategory: 'source' | 'processor' | 'sink'): string => {
  const mapping = componentCategory === 'source' 
    ? sourceTypeMapping 
    : componentCategory === 'processor' 
      ? processorTypeMapping 
      : sinkTypeMapping;
  
  return mapping[type]?.description || '';
};

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
  server_url: string;
  confidence_threshold: number;
  draw_bounding_boxes: boolean;
  use_shared_memory: boolean;
  label_font_scale: number;
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

// Add dependency type definitions
interface ComponentDependencyMap {
  [key: string]: string[];
}

// Define ComponentTypes interface
interface ComponentTypes {
  sources: string[];
  processors: string[];
  sinks: string[];
  dependencies: ComponentDependencyMap;
  dependency_rules: string[];
}

// Add model interfaces
interface AIModel {
  id: string;
  type: string;
  status: string;
  classes?: string[];
}

interface ModelsResponse {
  models: AIModel[];
  service: string;
  status: string;
}

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
    server_url: "http://localhost:8080",
    confidence_threshold: 0.5,
    draw_bounding_boxes: true,
    use_shared_memory: true,
    label_font_scale: 0.5,
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

  // Add state for component dependencies
  const [dependencies, setDependencies] = useState<ComponentDependencyMap>({});
  const [dependencyRules, setDependencyRules] = useState<string[]>([]);

  // Add state for available models
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [objectDetectionModels, setObjectDetectionModels] = useState<AIModel[]>([]);
  const [selectedModelClasses, setSelectedModelClasses] = useState<string[]>([]);
  const [objectDetectionAvailable, setObjectDetectionAvailable] = useState(false);

  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState({
    fileSource: false,
    rtspSource: false,
    objectDetection: false,
    objectTracking: false,
    lineZoneManager: false,
    fileSink: false
  });

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
          setComponentTypes(types as ComponentTypes);
          // Store dependencies if available
          setDependencies(types.dependencies || {});
          setDependencyRules(types.dependency_rules || []);
        }
        
        // Fetch camera components
        const components = await apiService.components.getAll(cameraId);
        if (components) {
          console.log("Fetched components:", components);
          setSourceComponent(components.source);
          setProcessorComponents(components.processors || []);
          setSinkComponents(components.sinks || []);
        }

        // Fetch available object detection models
        const modelResponse = await apiService.models.getObjectDetectionModels();
        if (modelResponse && modelResponse.models) {
          setAvailableModels(modelResponse.models);
          
          // Filter out object detection models
          const detectionModels = modelResponse.models.filter(
            (model: AIModel) => model.type === 'object_detection' && model.status === 'loaded'
          );
          
          setObjectDetectionModels(detectionModels);
          setObjectDetectionAvailable(detectionModels.length > 0);
          
          // If object detection models are available, set default model
          if (detectionModels.length > 0) {
            const defaultModel = detectionModels[0];
            setObjectDetectionForm(prev => ({
              ...prev,
              model_id: defaultModel.id,
              server_url: "http://localhost:8080",
              confidence_threshold: 0.5,
              draw_bounding_boxes: true,
              use_shared_memory: true,
              label_font_scale: 0.5,
              classes: [],
              newClass: ""
            }));
            
            // Set available classes for the selected model
            if (defaultModel.classes && defaultModel.classes.length > 0) {
              setSelectedModelClasses(defaultModel.classes);
            }
          }
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
      // Default to 'file' source type for create mode
      setSelectedComponentType('file');
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
      // For processor, default to 'object_detection' if it's available
      if (objectDetectionAvailable && objectDetectionModels.length > 0) {
        setSelectedComponentType('object_detection');
        const defaultModel = objectDetectionModels[0];
        setObjectDetectionForm({
          model_id: defaultModel.id,
          server_url: "http://localhost:8080",
          confidence_threshold: 0.5,
          draw_bounding_boxes: true,
          use_shared_memory: true,
          label_font_scale: 0.5,
          classes: [],
          newClass: ""
        });
        
        // Set available classes for the selected model
        if (defaultModel.classes && defaultModel.classes.length > 0) {
          setSelectedModelClasses(defaultModel.classes);
        }
      } else {
        // If object detection is not available, default to another processor type
        setObjectDetectionForm({
          model_id: "yolov4-tiny",
          server_url: "http://localhost:8080",
          confidence_threshold: 0.5,
          draw_bounding_boxes: true,
          use_shared_memory: true,
          label_font_scale: 0.5,
          classes: ["person"],
          newClass: ""
        });
      }
      
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
    
    // Make sure we get the correct component type as a string
    let componentType: string;
    
    if (typeof component.type === 'string') {
      componentType = component.type;
    } else if (component.type_name) {
      componentType = component.type_name.toLowerCase();
    } else {
      // If type is a number or unknown format, try to determine the type based on inspection
      // of the component config
      const config = component.config || {};
      
      if (config.url && (config.url.startsWith('rtsp://') || config.rtsp_transport)) {
        componentType = 'rtsp';
      } else if (config.url) {
        componentType = 'file';
      } else if (config.model_id && config.classes) {
        componentType = 'object_detection';
      } else if (config.track_thresh !== undefined) {
        componentType = 'object_tracking';
      } else if (config.zones) {
        componentType = 'line_zone_manager';
      } else if (config.path && config.fourcc) {
        componentType = 'file'; // file sink
      } else {
        componentType = 'unknown';
      }
    }
    
    console.log("Editing component:", component, "extracted type:", componentType);
    
    setSelectedComponentType(componentType);
    setComponentConfig(formatJson(component.config));
    
    // Initialize form data from component config
    if (type === 'source' && componentType === 'file') {
      const config = component.config || {};
      setFileSourceForm({
        url: config.url || "",
        width: config.width || 640,
        height: config.height || 480,
        fps: config.fps || 30,
        use_hw_accel: config.use_hw_accel !== undefined ? config.use_hw_accel : true,
        adaptive_timing: config.adaptive_timing !== undefined ? config.adaptive_timing : true
      });
    } else if (type === 'source' && componentType === 'rtsp') {
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
      
      if (componentType === 'object_detection') {
        // For object detection, set the form and find the available classes for the selected model
        const modelId = config.model_id || "yolov4-tiny";
        setObjectDetectionForm({
          model_id: modelId,
          server_url: config.server_url || "http://localhost:8080",
          confidence_threshold: config.confidence_threshold !== undefined ? config.confidence_threshold : 0.5,
          draw_bounding_boxes: config.draw_bounding_boxes !== undefined ? config.draw_bounding_boxes : true,
          use_shared_memory: config.use_shared_memory !== undefined ? config.use_shared_memory : true,
          label_font_scale: config.label_font_scale !== undefined ? config.label_font_scale : 0.5,
          classes: Array.isArray(config.classes) ? config.classes : ["person"],
          newClass: ""
        });
        
        // Find the corresponding model to get its available classes
        const selectedModel = objectDetectionModels.find(model => model.id === modelId);
        if (selectedModel && selectedModel.classes) {
          setSelectedModelClasses(selectedModel.classes);
        } else {
          // If model not found in available models, try to get it from API
          const fetchModelClasses = async () => {
            try {
              const modelResponse = await apiService.models.getObjectDetectionModels();
              if (modelResponse && modelResponse.models) {
                const model = modelResponse.models.find((m: AIModel) => m.id === modelId);
                if (model && model.classes) {
                  setSelectedModelClasses(model.classes);
                }
              }
            } catch (err) {
              console.error('Error fetching model classes:', err);
            }
          };
          fetchModelClasses();
        }
      } else if (componentType === 'object_tracking') {
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
      } else if (componentType === 'line_zone_manager') {
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
    } else if (type === 'sink' && componentType === 'file') {
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

    // If model_id changes, update the available classes
    if (field === 'model_id') {
      const selectedModel = objectDetectionModels.find(model => model.id === value);
      if (selectedModel && selectedModel.classes) {
        setSelectedModelClasses(selectedModel.classes);
        // Reset selected classes when changing the model
        setObjectDetectionForm(prev => ({
          ...prev,
          model_id: value,
          classes: []
        }));
      }
    }
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
            server_url: objectDetectionForm.server_url,
            confidence_threshold: objectDetectionForm.confidence_threshold,
            draw_bounding_boxes: objectDetectionForm.draw_bounding_boxes,
            use_shared_memory: objectDetectionForm.use_shared_memory,
            label_font_scale: objectDetectionForm.label_font_scale,
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

  // Add function to check if a component can be added based on dependencies
  const canAddComponent = (type: string, category: 'source' | 'processor' | 'sink'): boolean => {
    // Source can always be added if none exists
    if (category === 'source') {
      return !sourceComponent;
    }
    
    // Any processor or sink requires a source
    if (!sourceComponent) {
      return false;
    }
    
    // Check if a component of this specific type already exists
    if (category === 'processor') {
      // Check if a processor with this type already exists
      const existingProcessor = processorComponents.find(
        (p: Component) => {
          if (typeof p.type === 'string') {
            return p.type === type;
          }
          if (p.type_name) {
            return p.type_name === type;
          }
          return false;
        }
      );
      
      if (existingProcessor) {
        return false; // Component of this type already exists
      }
    } else if (category === 'sink') {
      // Check if a sink with this type already exists
      const existingSink = sinkComponents.find(
        (s: Component) => {
          if (typeof s.type === 'string') {
            return s.type === type;
          }
          if (s.type_name) {
            return s.type_name === type;
          }
          return false;
        }
      );
      
      if (existingSink) {
        return false; // Component of this type already exists
      }
    }
    
    // For object_detection processor, check if it's available
    if (type === 'object_detection' && category === 'processor') {
      return objectDetectionAvailable;
    }
    
    // If this component type has dependencies, check if they're satisfied
    if (dependencies[type]) {
      const requiredTypes = dependencies[type];
      // Check if we have all required components
      for (const requiredType of requiredTypes) {
        // Check if any processor matches the required type
        const hasRequiredComponent = processorComponents.some(
          processor => processor.type === requiredType || processor.type_name === requiredType
        );
        
        if (!hasRequiredComponent) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Add function to get reason why component cannot be added
  const getDisabledReason = (type: string, category: 'source' | 'processor' | 'sink'): string => {
    if (camera?.running) {
      return "Pipeline is running";
    }
    
    if (category === 'source' && sourceComponent) {
      return "Source component already exists";
    }
    
    if (!sourceComponent && (category === 'processor' || category === 'sink')) {
      return "Source component is required first";
    }
    
    // Check if component of this type already exists
    if (category === 'processor') {
      const existingProcessor = processorComponents.find(
        (p: Component) => {
          if (typeof p.type === 'string') {
            return p.type === type;
          }
          if (p.type_name) {
            return p.type_name === type;
          }
          return false;
        }
      );
      
      if (existingProcessor) {
        return `${getComponentTypeName(type, 'processor')} component already exists`;
      }
    } else if (category === 'sink') {
      const existingSink = sinkComponents.find(
        (s: Component) => {
          if (typeof s.type === 'string') {
            return s.type === type;
          }
          if (s.type_name) {
            return s.type_name === type;
          }
          return false;
        }
      );
      
      if (existingSink) {
        return `${getComponentTypeName(type, 'sink')} component already exists`;
      }
    }
    
    if (type === 'object_detection' && !objectDetectionAvailable) {
      return "Object detection model not available";
    }
    
    if (dependencies[type]) {
      const requiredTypes = dependencies[type];
      const missingDeps = requiredTypes.filter(reqType => 
        !processorComponents.some(proc => proc.type === reqType || proc.type_name === reqType)
      );
      
      if (missingDeps.length > 0) {
        return `Requires ${missingDeps.map(dep => 
          getComponentTypeName(dep, 'processor')
        ).join(", ")}`;
      }
    }
    
    return "";
  };

  // New method to toggle a class selection
  const handleToggleClass = (className: string) => {
    setObjectDetectionForm(prev => {
      // Check if the class is already selected
      const isSelected = prev.classes.includes(className);
      
      if (isSelected) {
        // Remove the class if already selected
        return {
          ...prev,
          classes: prev.classes.filter(c => c !== className)
        };
      } else {
        // Add the class if not selected
        return {
          ...prev,
          classes: [...prev.classes, className]
        };
      }
    });
  };

  const toggleAdvancedSettings = (component: keyof typeof advancedSettingsExpanded) => {
    setAdvancedSettingsExpanded(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  // Render component card
  const renderComponentCard = (component: Component, type: 'source' | 'processor' | 'sink') => {
    // Determine display name for component type
    let componentType = component.type_name || component.type;
    if (typeof componentType !== 'string') {
      componentType = `${componentType}`;
    }
    
    const displayName = getComponentTypeName(componentType, type);
    const description = getComponentTypeDescription(componentType, type);
    const mapping = type === 'source' 
      ? sourceTypeMapping 
      : type === 'processor' 
        ? processorTypeMapping 
        : sinkTypeMapping;
    const icon = mapping[componentType]?.icon;
    
    return (
      <Card key={component.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {icon && (
              <Box sx={{ mr: 2, color: 'primary.main' }}>
                {icon}
              </Box>
            )}
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              {displayName}
            </Typography>
          </Box>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {description}
            </Typography>
          )}
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary">
            ID: {component.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            Status: {component.running ? 
              <Chip size="small" color="success" label="Running" /> : 
              <Chip size="small" color="default" label="Stopped" />
            }
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

  // Add function to check if all component types of a category have been added
  const areAllComponentTypesUsed = (category: 'processor' | 'sink'): boolean => {
    if (!componentTypes) return false;
    
    if (category === 'processor') {
      // If no processor types exist in the system, return false
      if (componentTypes.processors.length === 0) return false;
      
      // Check if every processor type has at least one instance
      return componentTypes.processors.every(type => 
        processorComponents.some(component => {
          if (typeof component.type === 'string') {
            return component.type === type;
          }
          if (component.type_name) {
            return component.type_name === type;
          }
          return false;
        })
      );
    } else if (category === 'sink') {
      // If no sink types exist in the system, return false
      if (componentTypes.sinks.length === 0) return false;
      
      // Check if every sink type has at least one instance
      return componentTypes.sinks.every(type => 
        sinkComponents.some(component => {
          if (typeof component.type === 'string') {
            return component.type === type;
          }
          if (component.type_name) {
            return component.type_name === type;
          }
          return false;
        })
      );
    }
    
    return false;
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
              <Paper sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <VideoSettingsIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No source component added yet. Add a source to start building your pipeline.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openCreateDialog('source')}
                  disabled={!!sourceComponent || camera.running}
                  sx={{ mt: 2 }}
                >
                  Add Source
                </Button>
              </Paper>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => openCreateDialog('processor')}
              disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('processor')}
            >
              Add Processor
            </Button>
            {areAllComponentTypesUsed('processor') && sourceComponent && !camera.running && (
              <Alert severity="info" sx={{ mt: 2 }}>
                All available processor types have been added. Each processor type can only be added once.
              </Alert>
            )}
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
              <Paper sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <MemoryIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {areAllComponentTypesUsed('processor') ? 
                    "All available processor types have been added." : 
                    "No processor components added yet. Add processors to process the video stream."
                  }
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openCreateDialog('processor')}
                  disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('processor')}
                  sx={{ mt: 2 }}
                >
                  Add Processor
                </Button>
              </Paper>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => openCreateDialog('sink')}
              disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('sink')}
            >
              Add Sink
            </Button>
            {areAllComponentTypesUsed('sink') && sourceComponent && !camera.running && (
              <Alert severity="info" sx={{ mt: 2 }}>
                All available sink types have been added. Each sink type can only be added once.
              </Alert>
            )}
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
              <Paper sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <SaveIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {areAllComponentTypesUsed('sink') ? 
                    "All available sink types have been added." : 
                    "No sink components added yet. Add sinks to save or stream the processed video."
                  }
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => openCreateDialog('sink')}
                  disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('sink')}
                  sx={{ mt: 2 }}
                >
                  Add Sink
                </Button>
              </Paper>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialog for creating/editing components */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {dialogType === 'source' && <VideoSettingsIcon sx={{ mr: 1 }} />}
            {dialogType === 'processor' && <MemoryIcon sx={{ mr: 1 }} />}
            {dialogType === 'sink' && <SaveIcon sx={{ mr: 1 }} />}
            {dialogMode === 'create' ? 'Add' : 'Edit'} {dialogMode === 'edit' && selectedComponentType ? 
              getComponentTypeName(selectedComponentType, dialogType) : 
              dialogType.charAt(0).toUpperCase() + dialogType.slice(1) + ' Component'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'create' && dependencyRules.length > 0 && (
            <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Component Dependencies:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                {dependencyRules.map((rule, index) => (
                  <li key={index}>
                    <Typography variant="body2">{rule}</Typography>
                  </li>
                ))}
                {selectedComponentType && dependencies[selectedComponentType] && (
                  <li>
                    <Typography variant="body2">
                      <strong>{getComponentTypeName(selectedComponentType, dialogType)}</strong> requires: {
                        dependencies[selectedComponentType].map(dep => 
                          getComponentTypeName(dep, 'processor')).join(", ")
                      }
                    </Typography>
                  </li>
                )}
              </ul>
            </Box>
          )}
          
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
                                      dialogType === 'processor' ? 'processors' : 'sinks'].map(type => {
                    const mapping = dialogType === 'source' 
                      ? sourceTypeMapping 
                      : dialogType === 'processor' 
                        ? processorTypeMapping 
                        : sinkTypeMapping;
                    const icon = mapping[type]?.icon;
                    const isDisabled = !canAddComponent(type, dialogType);
                    const disabledReason = getDisabledReason(type, dialogType);
                    
                    return (
                      <MenuItem 
                        key={type} 
                        value={type} 
                        disabled={isDisabled}
                        sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          {icon && <Box sx={{ mr: 1, color: 'primary.main' }}>{icon}</Box>}
                          <Typography variant="body1">{getComponentTypeName(type, dialogType)}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          {getComponentTypeDescription(type, dialogType)}
                          {isDisabled && disabledReason && (
                            <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                              ({disabledReason})
                            </Box>
                          )}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}

            {/* Show component type in edit mode */}
            {dialogMode === 'edit' && selectedComponentType && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {getComponentTypeName(selectedComponentType, dialogType)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getComponentTypeDescription(selectedComponentType, dialogType)}
                </Typography>
              </Box>
            )}
            
            {/* Source Form (File type) */}
            {dialogType === 'source' && selectedComponentType === 'file' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <VideoSettingsIcon sx={{ mr: 1, fontSize: 20 }} />
                    Video File Configuration
                  </Box>
                </Typography>
                
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
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.fileSource}
                  onChange={() => toggleAdvancedSettings('fileSource')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="file-source-advanced-settings-content"
                    id="file-source-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* RTSP Source Form */}
            {dialogType === 'source' && selectedComponentType === 'rtsp' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <VideoSettingsIcon sx={{ mr: 1, fontSize: 20 }} />
                    RTSP Camera Configuration
                  </Box>
                </Typography>
                
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
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.rtspSource}
                  onChange={() => toggleAdvancedSettings('rtspSource')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="rtsp-source-advanced-settings-content"
                    id="rtsp-source-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1, mb: 2 }}>
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
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* Object Detection Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'object_detection' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MemoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    Object Detection Configuration
                  </Box>
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
                  <InputLabel id="model-label">Model</InputLabel>
                  <Select
                    labelId="model-label"
                    value={objectDetectionForm.model_id}
                    onChange={(e) => handleObjectDetectionFormChange('model_id', e.target.value)}
                    label="Model"
                  >
                    {objectDetectionModels.map((model) => (
                      <MenuItem key={model.id} value={model.id}>
                        {model.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Confidence Threshold: {objectDetectionForm.confidence_threshold.toFixed(2)}
                  </Typography>
                  <Slider
                    value={objectDetectionForm.confidence_threshold}
                    onChange={(_, value) => handleObjectDetectionFormChange('confidence_threshold', value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Visualization Options</Typography>
                
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={objectDetectionForm.draw_bounding_boxes}
                        onChange={(e) => handleObjectDetectionFormChange('draw_bounding_boxes', e.target.checked)}
                      />
                    }
                    label="Draw Bounding Boxes"
                  />
                </FormGroup>
                
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Classes to Detect</Typography>
                
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {objectDetectionForm.classes.length > 0 ? (
                    objectDetectionForm.classes.map((cls, index) => (
                      <Chip
                        key={index}
                        label={cls}
                        onDelete={() => handleToggleClass(cls)}
                        color="primary"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No classes selected. Select from available classes below.
                    </Typography>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>Available Classes</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '200px', overflowY: 'auto', p: 1 }}>
                  {selectedModelClasses.map((cls, index) => (
                    <Chip
                      key={index}
                      label={cls}
                      onClick={() => handleToggleClass(cls)}
                      color={objectDetectionForm.classes.includes(cls) ? "primary" : "default"}
                      variant={objectDetectionForm.classes.includes(cls) ? "filled" : "outlined"}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.objectDetection}
                  onChange={() => toggleAdvancedSettings('objectDetection')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="object-detection-advanced-settings-content"
                    id="object-detection-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      label="Server URL"
                      value={objectDetectionForm.server_url}
                      onChange={(e) => handleObjectDetectionFormChange('server_url', e.target.value)}
                      fullWidth
                      margin="normal"
                      helperText="URL of the AI server, e.g., http://localhost:8080"
                    />
                    
                    <Box sx={{ width: '100%', px: 2, mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Label Font Scale: {objectDetectionForm.label_font_scale.toFixed(1)}
                      </Typography>
                      <Slider
                        value={objectDetectionForm.label_font_scale}
                        onChange={(_, value) => handleObjectDetectionFormChange('label_font_scale', value as number)}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    
                    <FormGroup sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={objectDetectionForm.use_shared_memory}
                            onChange={(e) => handleObjectDetectionFormChange('use_shared_memory', e.target.checked)}
                          />
                        }
                        label="Use Shared Memory"
                      />
                    </FormGroup>
                    
                    {/* JSON Preview */}
                    <TextField
                      label="Configuration Preview (JSON)"
                      multiline
                      rows={6}
                      value={JSON.stringify({
                        model_id: objectDetectionForm.model_id,
                        server_url: objectDetectionForm.server_url,
                        confidence_threshold: objectDetectionForm.confidence_threshold,
                        draw_bounding_boxes: objectDetectionForm.draw_bounding_boxes,
                        use_shared_memory: objectDetectionForm.use_shared_memory,
                        label_font_scale: objectDetectionForm.label_font_scale,
                        classes: objectDetectionForm.classes
                      }, null, 2)}
                      fullWidth
                      variant="outlined"
                      sx={{ mt: 3 }}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* Object Tracking Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'object_tracking' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MemoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    Object Tracking Configuration
                  </Box>
                </Typography>
                
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
                          checked={objectTrackingForm.draw_track_id}
                          onChange={(e) => handleObjectTrackingFormChange('draw_track_id', e.target.checked)}
                        />
                      }
                      label="Draw Track ID"
                    />
                  </FormGroup>
                </Stack>
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.objectTracking}
                  onChange={() => toggleAdvancedSettings('objectTracking')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="object-tracking-advanced-settings-content"
                    id="object-tracking-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                    
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
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
                    
                    <FormGroup sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={objectTrackingForm.draw_track_trajectory}
                            onChange={(e) => handleObjectTrackingFormChange('draw_track_trajectory', e.target.checked)}
                          />
                        }
                        label="Draw Track Trajectory"
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
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* Line Zone Manager Processor Form */}
            {dialogType === 'processor' && selectedComponentType === 'line_zone_manager' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MemoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    Line Zone Manager Configuration
                  </Box>
                </Typography>
                
                <FormGroup sx={{ width: '100%', mt: 2 }}>
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
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.lineZoneManager}
                  onChange={() => toggleAdvancedSettings('lineZoneManager')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="line-zone-manager-advanced-settings-content"
                    id="line-zone-manager-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* File Sink Form */}
            {dialogType === 'sink' && selectedComponentType === 'file' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SaveIcon sx={{ mr: 1, fontSize: 20 }} />
                    Video File Output Configuration
                  </Box>
                </Typography>
                
                <TextField
                  label="Output File Path"
                  value={fileSinkForm.path}
                  onChange={(e) => handleFileSinkFormChange('path', e.target.value)}
                  fullWidth
                  margin="normal"
                  helperText="Path to output file, e.g., /tmp/output.mp4"
                />
                
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
                
                {/* Advanced Settings Accordion */}
                <Accordion 
                  expanded={advancedSettingsExpanded.fileSink}
                  onChange={() => toggleAdvancedSettings('fileSink')}
                  sx={{ mt: 2 }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="file-sink-advanced-settings-content"
                    id="file-sink-advanced-settings-header"
                  >
                    <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 1, fontSize: 'small' }} />
                      Advanced Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
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
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* Generic JSON Editor for unsupported component types */}
            {((dialogType === 'source' && selectedComponentType !== 'file' && selectedComponentType !== 'rtsp') ||
              (dialogType === 'processor' && 
               selectedComponentType !== 'object_detection' && 
               selectedComponentType !== 'object_tracking' && 
               selectedComponentType !== 'line_zone_manager') ||
              (dialogType === 'sink' && selectedComponentType !== 'file')) && (
              <>
                <Typography variant="h6" gutterBottom>Advanced Configuration</Typography>
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
              </>
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