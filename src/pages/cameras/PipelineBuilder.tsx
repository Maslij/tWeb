import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
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
  Tooltip,
  Snackbar,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  FormGroup,
  Chip,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton
} from '@mui/material';

// Import our custom UI components
import { Box } from '../../components/ui/Box';
import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { IconButton as CustomIconButton } from '../../components/ui/IconButton';
import { Divider as CustomDivider } from '../../components/ui/Divider';

// Import extracted components
import LineZoneEditor from '../../components/pipeline/LineZoneEditor';
import { Zone } from '../../components/pipeline/LineZoneList';
import TabPanel from '../../components/pipeline/TabPanel';
import ComponentCard from '../../components/pipeline/ComponentCard';
import { 
  getComponentTypeName, 
  getComponentTypeDescription,
  sourceTypeMapping,
  processorTypeMapping,
  sinkTypeMapping
} from '../../components/pipeline/ComponentTypeMapping';
import { 
  formatJson, 
  parseJson,
  FileSourceForm,
  RtspSourceForm,
  ObjectDetectionForm,
  ObjectTrackingForm,
  LineZoneManagerForm,
  FileSinkForm,
  DatabaseSinkForm
} from '../../components/pipeline/FormTypes';
import { 
  pipelineTemplates,
  defaultLineZone,
} from '../../components/pipeline/PipelineTemplates';
import {
  ComponentCardSkeleton,
  ImageSkeleton,
  LineZoneEditorSkeleton,
  TelemetryChartSkeleton,
  DatabaseTableSkeleton
} from '../../components/pipeline/SkeletonComponents';

import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import MemoryIcon from '@mui/icons-material/Memory';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import DatabaseIcon from '@mui/icons-material/Storage';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import WarningIcon from '@mui/icons-material/Warning';

import apiService, { 
  Camera, 
  Component, 
  ComponentInput, 
  EventRecord,
} from '../../services/api';

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

// Add new interfaces for telemetry data
interface ZoneLineCount {
  timestamp: number;
  zone_id: string;
  count: number;
  direction: string;
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
);

// Import extracted tab components
import PipelineConfigTab from '../../components/pipeline/PipelineConfigTab';
import LivePlaybackTab from '../../components/pipeline/LivePlaybackTab';
import LineZoneConfigTab from '../../components/pipeline/LineZoneConfigTab';
import TelemetryTab from '../../components/pipeline/TelemetryTab';

const PipelineBuilder = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTabValue, setMainTabValue] = useState(0);
  
  // Component state
  const [componentTypes, setComponentTypes] = useState<ComponentTypes | null>(null);
  const [sourceComponent, setSourceComponent] = useState<Component | null>(null);
  const [processorComponents, setProcessorComponents] = useState<Component[]>([]);
  const [sinkComponents, setSinkComponents] = useState<Component[]>([]);
  
  // Add loading state for various actions
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  const [isStoppingPipeline, setIsStoppingPipeline] = useState(false);
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);
  const [isUpdatingComponent, setIsUpdatingComponent] = useState(false);
  const [isDeletingComponent, setIsDeletingComponent] = useState<string | null>(null);
  const [isSavingZones, setIsSavingZones] = useState(false);
  const [isRefreshingComponents, setIsRefreshingComponents] = useState(false);
  
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
    use_hw_accel: false,
    adaptive_timing: true
  });

  // Add RTSP form state after other form states
  const [rtspSourceForm, setRtspSourceForm] = useState<RtspSourceForm>({
    url: "rtsp://username:password@ip:port/stream",
    width: 640,
    height: 480,
    fps: 30,
    use_hw_accel: false,
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

  // Update the lineZoneManagerForm initialization
  const [lineZoneManagerForm, setLineZoneManagerForm] = useState<LineZoneManagerForm>({
    draw_zones: true,
    line_color: [255, 255, 255],
    line_thickness: 2,
    draw_counts: true,
    text_color: [0, 0, 0],
    text_scale: 0.5,
    text_thickness: 2,
    zones: [defaultLineZone]
  });

  const [fileSinkForm, setFileSinkForm] = useState<FileSinkForm>({
    path: "/tmp/output.mp4",
    width: 640,
    height: 480,
    fps: 30,
    fourcc: "mp4v"
  });

  const [databaseSinkForm, setDatabaseSinkForm] = useState<DatabaseSinkForm>({
    store_thumbnails: false,
    thumbnail_width: 320,
    thumbnail_height: 180,
    retention_days: 30,
    store_detection_events: true,
    store_tracking_events: true,
    store_counting_events: true
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

  // Add state to track if pipeline has been started at least once
  const [pipelineHasRunOnce, setPipelineHasRunOnce] = useState(false);
  const [lastFrameUrl, setLastFrameUrl] = useState<string>('');

  // Add template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Add a state to track unsaved zone changes near the other state declarations in PipelineBuilder
  const [hasUnsavedZoneChanges, setHasUnsavedZoneChanges] = useState<boolean>(false);

  // Define hasLineZoneManagerComponent and lineZoneManagerComponent here to ensure
  // our hooks are called in the same order every render
  const hasLineZoneManagerComponent = processorComponents.some(
    component => component.type === 'line_zone_manager'
  );

  const lineZoneManagerComponent = processorComponents.find(
    component => component.type === 'line_zone_manager'
  );

  // Make showSnackbar a useCallback
  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  // Define handleSnackbarClose function
  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Add Database tab state
  const [databaseRecords, setDatabaseRecords] = useState<EventRecord[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [isDeletingRecords, setIsDeletingRecords] = useState<boolean>(false);
  const [dbComponentExists, setDbComponentExists] = useState<boolean>(false);
  // Add a ref to track if telemetry data has been loaded for the current tab session
  const telemetryTabFirstLoadRef = useRef<boolean>(false);

  // Add new state for telemetry visualization data
  const [zoneLineCounts, setZoneLineCounts] = useState<ZoneLineCount[]>([]);
  const [isLoadingZoneData, setIsLoadingZoneData] = useState<boolean>(false);
  const [isLoadingHeatmapData, setIsLoadingHeatmapData] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<{start: number, end: number} | null>(null);

  // Add the state variables at the top of the component
  const [hasZoneLineData, setHasZoneLineData] = useState<boolean>(true);
  const [hasHeatmapData, setHasHeatmapData] = useState<boolean>(true);

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
          setSourceComponent(components.source);
          setProcessorComponents(components.processors || []);
          setSinkComponents(components.sinks || []);
          
          // Check if a database sink component exists and set state accordingly
          const hasDbSink = (components.sinks || []).some(
            sink => sink.type === 'database'
          );
          setDbComponentExists(hasDbSink);
          
          // Look for line zone manager component and initialize its zones if found
          const lineZoneManager = components.processors?.find(
            comp => comp.type === 'line_zone_manager'
          );
          
          if (lineZoneManager) {
            // Determine where the zones are stored in the component data
            let zones: any[] = [];
            
            if (Array.isArray(lineZoneManager.zones)) {
              zones = lineZoneManager.zones;
            } else if (lineZoneManager.config && Array.isArray(lineZoneManager.config.zones)) {
              zones = lineZoneManager.config.zones;
            }
            
            if (zones.length > 0) {
              // Ensure zones have all required properties in the correct format
              const normalizedZones = zones.map(zone => {
                // Handle nested structure {start: {x, y}, end: {x, y}}
                const start_x = zone.start && typeof zone.start.x === 'number' ? zone.start.x :
                                zone.start_x !== undefined ? (typeof zone.start_x === 'number' ? zone.start_x : 
                                parseFloat(String(zone.start_x))) : 0.2;
                                
                const start_y = zone.start && typeof zone.start.y === 'number' ? zone.start.y :
                                zone.start_y !== undefined ? (typeof zone.start_y === 'number' ? zone.start_y : 
                                parseFloat(String(zone.start_y))) : 0.5;
                                
                const end_x = zone.end && typeof zone.end.x === 'number' ? zone.end.x :
                              zone.end_x !== undefined ? (typeof zone.end_x === 'number' ? zone.end_x : 
                              parseFloat(String(zone.end_x))) : 0.8;
                              
                const end_y = zone.end && typeof zone.end.y === 'number' ? zone.end.y :
                              zone.end_y !== undefined ? (typeof zone.end_y === 'number' ? zone.end_y : 
                              parseFloat(String(zone.end_y))) : 0.5;
                
                return {
                  id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
                  start_x,
                  start_y,
                  end_x,
                  end_y,
                  min_crossing_threshold: zone.min_crossing_threshold || 1,
                  triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
                    zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"]
                };
              });
              
              // Update the line zone manager form with the normalized zones
              setLineZoneManagerForm(prev => ({
                ...prev,
                zones: normalizedZones
              }));
            }
          }
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

  // Update the form when the processor components change - moved up to follow React hooks rules
  useEffect(() => {
    if (!lineZoneManagerComponent) return;
    
    // Extract zones from the component
    let zones: any[] = [];
    
    if (Array.isArray(lineZoneManagerComponent.zones)) {
      zones = lineZoneManagerComponent.zones;
    } else if (lineZoneManagerComponent.config && Array.isArray(lineZoneManagerComponent.config.zones)) {
      zones = lineZoneManagerComponent.config.zones;
    }
    
    if (zones.length > 0) {
      // Ensure zones have all required properties in the correct format
      const normalizedZones = zones.map(zone => {
        // Handle nested structure {start: {x, y}, end: {x, y}}
        const start_x = zone.start && typeof zone.start.x === 'number' ? zone.start.x :
                        zone.start_x !== undefined ? (typeof zone.start_x === 'number' ? zone.start_x : 
                        parseFloat(String(zone.start_x))) : 0.2;
                        
        const start_y = zone.start && typeof zone.start.y === 'number' ? zone.start.y :
                        zone.start_y !== undefined ? (typeof zone.start_y === 'number' ? zone.start_y : 
                        parseFloat(String(zone.start_y))) : 0.5;
                        
        const end_x = zone.end && typeof zone.end.x === 'number' ? zone.end.x :
                      zone.end_x !== undefined ? (typeof zone.end_x === 'number' ? zone.end_x : 
                      parseFloat(String(zone.end_x))) : 0.8;
                      
        const end_y = zone.end && typeof zone.end.y === 'number' ? zone.end.y :
                      zone.end_y !== undefined ? (typeof zone.end_y === 'number' ? zone.end_y : 
                      parseFloat(String(zone.end_y))) : 0.5;
        
        return {
          id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
          start_x,
          start_y,
          end_x,
          end_y,
          min_crossing_threshold: zone.min_crossing_threshold || 1,
          triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
            zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
          in_count: zone.in_count !== undefined ? zone.in_count : undefined,
          out_count: zone.out_count !== undefined ? zone.out_count : undefined
        };
      });
            
      // Get a stringified version of the current zones to compare
      const currentZonesString = JSON.stringify(lineZoneManagerForm.zones);
      const newZonesString = JSON.stringify(normalizedZones);
      
      // Only update state if the zones have actually changed
      if (currentZonesString !== newZonesString) {
        // Update the line zone manager form with the normalized zones
        setLineZoneManagerForm(prev => ({
          ...prev,
          zones: normalizedZones
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineZoneManagerComponent]);

  // Use useCallback for fetchComponents
  const fetchComponents = useCallback(async (forceUpdate: boolean = false) => {
    if (!cameraId) return;
    
    // Skip the update if there are unsaved zone changes, unless forceUpdate is true
    if (hasUnsavedZoneChanges && !forceUpdate) {
      return;
    }
    
    try {
      setIsRefreshingComponents(true);
      const components = await apiService.components.getAll(cameraId);
      if (components) {
        setSourceComponent(components.source);
        setProcessorComponents(components.processors || []);
        setSinkComponents(components.sinks || []);
        
        // Check if a database sink component exists
        const hasDbSink = (components.sinks || []).some(
          sink => {
            return sink.type === "database";
          }
        );
        setDbComponentExists(hasDbSink);
        
        // Look for line zone manager component and initialize its zones if found
        const lineZoneManager = components.processors?.find(
          comp => comp.type === 'line_zone_manager'
        );
        
        if (lineZoneManager) {
          // Determine where the zones are stored in the component data
          let zones: any[] = [];
          
          if (Array.isArray(lineZoneManager.zones)) {
            zones = lineZoneManager.zones;
          } else if (lineZoneManager.config && Array.isArray(lineZoneManager.config.zones)) {
            zones = lineZoneManager.config.zones;
          }
          
          if (zones.length > 0) {
            // Ensure zones have all required properties in the correct format
            const normalizedZones = zones.map(zone => {
              // Handle nested structure {start: {x, y}, end: {x, y}}
              const start_x = zone.start && typeof zone.start.x === 'number' ? zone.start.x :
                              zone.start_x !== undefined ? (typeof zone.start_x === 'number' ? zone.start_x : 
                              parseFloat(String(zone.start_x))) : 0.2;
                              
              const start_y = zone.start && typeof zone.start.y === 'number' ? zone.start.y :
                              zone.start_y !== undefined ? (typeof zone.start_y === 'number' ? zone.start_y : 
                              parseFloat(String(zone.start_y))) : 0.5;
                              
              const end_x = zone.end && typeof zone.end.x === 'number' ? zone.end.x :
                            zone.end_x !== undefined ? (typeof zone.end_x === 'number' ? zone.end_x : 
                            parseFloat(String(zone.end_x))) : 0.8;
                            
              const end_y = zone.end && typeof zone.end.y === 'number' ? zone.end.y :
                            zone.end_y !== undefined ? (typeof zone.end_y === 'number' ? zone.end_y : 
                            parseFloat(String(zone.end_y))) : 0.5;
              
              return {
                id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
                start_x,
                start_y,
                end_x,
                end_y,
                min_crossing_threshold: zone.min_crossing_threshold || 1,
                triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
                  zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
                in_count: zone.in_count !== undefined ? zone.in_count : undefined,
                out_count: zone.out_count !== undefined ? zone.out_count : undefined
              };
            });
            
            // Update the line zone manager form with the normalized zones
            // Only if we don't have unsaved changes
            if (!hasUnsavedZoneChanges || forceUpdate) {
              setLineZoneManagerForm(prev => ({
                ...prev,
                zones: normalizedZones
              }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching components:', err);
      showSnackbar('Failed to refresh components');
    } finally {
      setIsRefreshingComponents(false);
    }
  }, [cameraId, showSnackbar, hasUnsavedZoneChanges]);

  const handleMainTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  const openCreateDialog = (type: 'source' | 'processor' | 'sink') => {
    setDialogType(type);
    setDialogMode('create');
    setSelectedComponent(null);
    setComponentConfig('{}');
    
    // Find the first available component type
    const availableTypes = componentTypes?.[type === 'source' ? 'sources' : 
                            type === 'processor' ? 'processors' : 'sinks'] || [];
    
    const firstAvailableType = availableTypes.find(t => canAddComponent(t, type));
    
    if (firstAvailableType) {
      setSelectedComponentType(firstAvailableType);
      initializeFormForComponentType(firstAvailableType);
    } else {
      setSelectedComponentType('');
      // Show a message that no components are available
      showSnackbar(`No available ${type} components to add`);
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
      // If type is a number or unknown format, try to determine the type based on inspection
      // of the component properties
      if (component.url && (component.url.startsWith('rtsp://') || component.rtsp_transport)) {
        componentType = 'rtsp';
      } else if (component.url) {
        componentType = 'file';
      } else if (component.model_id && component.classes) {
        componentType = 'object_detection';
      } else if (component.track_thresh !== undefined) {
        componentType = 'object_tracking';
      } else if (component.zones) {
        componentType = 'line_zone_manager';
      } else if (component.path && component.fourcc) {
        componentType = 'file'; // file sink
      } else if ((component as any).db_path ) {
        componentType = 'database'; // database sink
      } else {
        componentType = 'unknown';
      }
    }

    setSelectedComponentType(componentType);
    
    // The API returns the component status with properties directly on the object
    // rather than nested in a config property. We'll use these values directly.
    // Create a config object for the JSON editor
    const configData = component.config || {};
    setComponentConfig(formatJson(component.config));
    
    // Initialize form data from component properties
    // We need to check both flattened properties and config object properties
    if (type === 'source' && componentType === 'file') {
      setFileSourceForm({
        url: component.url || configData.url || "",
        width: component.width || configData.width || 640,
        height: component.height || configData.height || 480,
        fps: component.target_fps || component.fps || configData.fps || 30,
        use_hw_accel: component.hardware_acceleration === "enabled" || 
                      (configData.use_hw_accel !== undefined ? configData.use_hw_accel : false),
        adaptive_timing: component.adaptive_timing === "enabled" || configData.adaptive_timing || true
      });
    } else if (type === 'source' && componentType === 'rtsp') {
      setRtspSourceForm({
        url: component.url || configData.url || "rtsp://username:password@ip:port/stream",
        width: component.width || configData.width || 640,
        height: component.height || configData.height || 480,
        fps: component.target_fps || component.fps || configData.fps || 30,
        use_hw_accel: component.hardware_acceleration === "enabled" || 
                      (configData.use_hw_accel !== undefined ? configData.use_hw_accel : false),
        rtsp_transport: component.rtsp_transport || configData.rtsp_transport || "tcp",
        latency: component.latency || configData.latency || 200
      });
    } else if (type === 'processor') {
      if (componentType === 'object_detection') {
        // For object detection, set the form and find the available classes for the selected model
        const modelId = component.model_id || configData.model_id || "yolov4-tiny";
        setObjectDetectionForm({
          model_id: modelId,
          server_url: component.server_url || configData.server_url || "http://localhost:8080",
          confidence_threshold: component.confidence_threshold !== undefined ? component.confidence_threshold : 
                              configData.confidence_threshold !== undefined ? configData.confidence_threshold : 0.5,
          draw_bounding_boxes: component.draw_bounding_boxes !== undefined ? component.draw_bounding_boxes : 
                             configData.draw_bounding_boxes !== undefined ? configData.draw_bounding_boxes : true,
          use_shared_memory: component.use_shared_memory !== undefined ? component.use_shared_memory : 
                           configData.use_shared_memory !== undefined ? configData.use_shared_memory : true,
          label_font_scale: component.label_font_scale !== undefined ? component.label_font_scale : 
                          configData.label_font_scale !== undefined ? configData.label_font_scale : 0.5,
          classes: Array.isArray(component.classes) ? component.classes : 
                 Array.isArray(configData.classes) ? configData.classes : ["person"],
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
          frame_rate: component.frame_rate || configData.frame_rate || 30,
          track_buffer: component.track_buffer || configData.track_buffer || 30,
          track_thresh: component.track_thresh !== undefined ? component.track_thresh : 
                      configData.track_thresh !== undefined ? configData.track_thresh : 0.5,
          high_thresh: component.high_thresh !== undefined ? component.high_thresh : 
                     configData.high_thresh !== undefined ? configData.high_thresh : 0.6,
          match_thresh: component.match_thresh !== undefined ? component.match_thresh : 
                      configData.match_thresh !== undefined ? configData.match_thresh : 0.8,
          draw_tracking: component.draw_tracking !== undefined ? component.draw_tracking : 
                       configData.draw_tracking !== undefined ? configData.draw_tracking : true,
          draw_track_trajectory: component.draw_track_trajectory !== undefined ? component.draw_track_trajectory : 
                               configData.draw_track_trajectory !== undefined ? configData.draw_track_trajectory : true,
          draw_track_id: component.draw_track_id !== undefined ? component.draw_track_id : 
                       configData.draw_track_id !== undefined ? configData.draw_track_id : true,
          draw_semi_transparent_boxes: component.draw_semi_transparent_boxes !== undefined ? component.draw_semi_transparent_boxes : 
                                     configData.draw_semi_transparent_boxes !== undefined ? configData.draw_semi_transparent_boxes : true,
          label_font_scale: component.label_font_scale || configData.label_font_scale || 0.6
        });
      } else if (componentType === 'line_zone_manager') {
        // Extract zones from either the component directly or its config
        let zones: any[] = [];
        
        if (Array.isArray(component.zones)) {
          zones = component.zones;
        } else if (configData && Array.isArray(configData.zones)) {
          zones = configData.zones;
        }
        
        // Normalize the zones data to ensure it's in the correct format
        const normalizedZones = zones.length > 0 ? zones.map(zone => {
          // Handle nested structure {start: {x, y}, end: {x, y}}
          const start_x = zone.start && typeof zone.start.x === 'number' ? zone.start.x :
                          zone.start_x !== undefined ? (typeof zone.start_x === 'number' ? zone.start_x : 
                          parseFloat(String(zone.start_x))) : 0.2;
                          
          const start_y = zone.start && typeof zone.start.y === 'number' ? zone.start.y :
                          zone.start_y !== undefined ? (typeof zone.start_y === 'number' ? zone.start_y : 
                          parseFloat(String(zone.start_y))) : 0.5;
                          
          const end_x = zone.end && typeof zone.end.x === 'number' ? zone.end.x :
                        zone.end_x !== undefined ? (typeof zone.end_x === 'number' ? zone.end_x : 
                        parseFloat(String(zone.end_x))) : 0.8;
                        
          const end_y = zone.end && typeof zone.end.y === 'number' ? zone.end.y :
                        zone.end_y !== undefined ? (typeof zone.end_y === 'number' ? zone.end_y : 
                        parseFloat(String(zone.end_y))) : 0.5;
          
          return {
            id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
            start_x,
            start_y,
            end_x,
            end_y,
            min_crossing_threshold: zone.min_crossing_threshold || 1,
            triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
              zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"],
            in_count: zone.in_count !== undefined ? zone.in_count : undefined,
            out_count: zone.out_count !== undefined ? zone.out_count : undefined
          };
        }) : [defaultLineZone];
        
        setLineZoneManagerForm({
          draw_zones: component.draw_zones !== undefined ? component.draw_zones : 
                    configData.draw_zones !== undefined ? configData.draw_zones : true,
          line_color: Array.isArray(component.line_color) ? component.line_color : 
                    Array.isArray(configData.line_color) ? configData.line_color : [255, 255, 255],
          line_thickness: component.line_thickness || configData.line_thickness || 2,
          draw_counts: component.draw_counts !== undefined ? component.draw_counts : 
                     configData.draw_counts !== undefined ? configData.draw_counts : true,
          text_color: Array.isArray(component.text_color) ? component.text_color : 
                    Array.isArray(configData.text_color) ? configData.text_color : [0, 0, 0],
          text_scale: component.text_scale || configData.text_scale || 0.5,
          text_thickness: component.text_thickness || configData.text_thickness || 2,
          zones: normalizedZones
        });
      }
    } else if (type === 'sink' && componentType === 'file') {
      setFileSinkForm({
        path: component.file_path || component.path || configData.path || "/tmp/output.mp4",
        width: component.resolution?.width || component.width || configData.width || 640,
        height: component.resolution?.height || component.height || configData.height || 480,
        fps: component.fps || configData.fps || 30,
        fourcc: component.fourcc || configData.fourcc || "mp4v"
      });
    } else if (type === 'sink' && componentType === 'database') {
      setDatabaseSinkForm({
        store_thumbnails: (component as any).store_thumbnails !== undefined ? (component as any).store_thumbnails : 
                        configData.store_thumbnails !== undefined ? configData.store_thumbnails : false,
        thumbnail_width: (component as any).thumbnail_width || configData.thumbnail_width || 320,
        thumbnail_height: (component as any).thumbnail_height || configData.thumbnail_height || 180,
        retention_days: (component as any).retention_days || configData.retention_days || 30,
        store_detection_events: (component as any).store_detection_events !== undefined ? (component as any).store_detection_events : 
                               configData.store_detection_events !== undefined ? configData.store_detection_events : true,
        store_tracking_events: (component as any).store_tracking_events !== undefined ? (component as any).store_tracking_events : 
                              configData.store_tracking_events !== undefined ? configData.store_tracking_events : true,
        store_counting_events: (component as any).store_counting_events !== undefined ? (component as any).store_counting_events : 
                              configData.store_counting_events !== undefined ? configData.store_counting_events : true
      });
    }
    
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    const selectedType = event.target.value;
    
    // Check if the selected component type can be added
    if (!canAddComponent(selectedType, dialogType)) {
      // Find the next available component type
      const availableTypes = componentTypes ? componentTypes[dialogType === 'source' ? 'sources' : 
                              dialogType === 'processor' ? 'processors' : 'sinks'] : [];
      
      const nextAvailableType = availableTypes.find(type => canAddComponent(type, dialogType));
      
      if (nextAvailableType) {
        // Set to the next available type instead
        setSelectedComponentType(nextAvailableType);
        
        // Initialize the appropriate form for the selected type
        initializeFormForComponentType(nextAvailableType);
        
        // Show a notification that we selected a different component
        showSnackbar(`Selected ${getComponentTypeName(nextAvailableType, dialogType)} instead, as ${getComponentTypeName(selectedType, dialogType)} is not available`);
      } else {
        // No available types
        setSelectedComponentType('');
        showSnackbar('No available component types to add');
      }
    } else {
      // Set the selected component type and initialize its form
      setSelectedComponentType(selectedType);
      initializeFormForComponentType(selectedType);
    }
  };

  const handleConfigChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComponentConfig(event.target.value);
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

  const handleObjectTrackingFormChange = (field: keyof ObjectTrackingForm, value: any) => {
    setObjectTrackingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLineZoneManagerFormChange = (field: keyof LineZoneManagerForm, value: any) => {
    // Skip zone updates if we're in the dialog
    if (field === 'zones' && openDialog) return;
    
    setLineZoneManagerForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSinkFormChange = (field: keyof FileSinkForm, value: any) => {
    setFileSinkForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDatabaseSinkFormChange = (field: keyof DatabaseSinkForm, value: any) => {
    setDatabaseSinkForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update the submit handler to use form data
  const handleSubmit = async () => {
    if (!cameraId) return;
    
    try {
      // Set loading state based on dialog mode
      if (dialogMode === 'create') {
        setIsCreatingComponent(true);
      } else {
        setIsUpdatingComponent(true);
      }
      
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
      } else if (dialogType === 'sink' && selectedComponentType === 'database') {
        config = {
          store_thumbnails: databaseSinkForm.store_thumbnails,
          thumbnail_width: databaseSinkForm.thumbnail_width,
          thumbnail_height: databaseSinkForm.thumbnail_height,
          retention_days: databaseSinkForm.retention_days,
          store_detection_events: databaseSinkForm.store_detection_events,
          store_tracking_events: databaseSinkForm.store_tracking_events,
          store_counting_events: databaseSinkForm.store_counting_events
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
    } finally {
      // Reset loading states
      setIsCreatingComponent(false);
      setIsUpdatingComponent(false);
    }
  };

  const handleDeleteComponent = async (component: Component, type: 'source' | 'processor' | 'sink') => {
    if (!cameraId) return;
    
    try {
      // Set the deleting state with the component ID
      setIsDeletingComponent(component.id);
      
      let success = false;
      
      if (type === 'source') {
        // If we're deleting the source, delete all processors and sinks
        // as they can't function without a source
        if (processorComponents.length > 0 || sinkComponents.length > 0) {
          const confirmMsg = "Deleting the source will also delete all processors and sinks. Continue?";
          if (!window.confirm(confirmMsg)) {
            setIsDeletingComponent(null);
            return;
          }
          
          // Delete all processors and sinks first
          for (const proc of processorComponents) {
            await apiService.components.processors.delete(cameraId, proc.id);
          }
          for (const sink of sinkComponents) {
            await apiService.components.sinks.delete(cameraId, sink.id);
          }
        }
        
        success = await apiService.components.source.delete(cameraId);
      } else if (type === 'processor') {
        // Get component type name
        const componentTypeName = component.type;
        
        // Check if any other components depend on this one
        const dependentComponents = [];
        
        // Find all components that depend on this one
        for (const [depType, requiredTypes] of Object.entries(dependencies)) {
          if (requiredTypes.includes(String(componentTypeName))) {
            // This component is a dependency for depType
            // Find all components of type depType and mark them for deletion
            const componentsToDelete = processorComponents.filter(proc => {
              const procType = proc.type;
              return String(procType) === depType;
            });
            
            dependentComponents.push(...componentsToDelete);
          }
        }
        
        // If we found dependent components, warn the user and handle cascading deletion
        if (dependentComponents.length > 0) {
          const dependentNames = dependentComponents.map(dep => {
            const depType = dep.type;
            return getComponentTypeName(String(depType), 'processor');
          }).join(", ");
          
          const confirmMsg = `Deleting this component will also delete dependent components: ${dependentNames}. Continue?`;
          if (!window.confirm(confirmMsg)) {
            setIsDeletingComponent(null);
            return;
          }
          
          // Delete dependent components first (recursive cascading deletion)
          for (const dep of dependentComponents) {
            await handleDeleteComponent(dep, 'processor');
          }
        }
        
        // Handle database sink dependencies based on processor type
        const dbSink = sinkComponents.find(sink => {
          const sinkType = sink.type;
          return String(sinkType) === 'database';
        });
        
        if (dbSink) {
          // If this is object_detection and we're removing it, remove the database sink entirely
          if (String(componentTypeName) === 'object_detection') {
            const confirmDbMsg = "Removing object detection will also remove the database sink as it depends on it. Continue?";
            if (!window.confirm(confirmDbMsg)) {
              setIsDeletingComponent(null);
              return;
            }
            
            await apiService.components.sinks.delete(cameraId, dbSink.id);
            showSnackbar('Database sink removed as it depends on object detection');
          } 
          // If this is line_zone_manager, disable counting events in database
          else if (String(componentTypeName) === 'line_zone_manager') {
            // Get the current config
            const currentConfig = dbSink.config || {};
            
            // Update config to disable counting events
            const updatedConfig = {
              ...currentConfig,
              store_counting_events: false
            };
            
            // Update the database sink
            await apiService.components.sinks.update(cameraId, dbSink.id, { config: updatedConfig });
            showSnackbar('Counting events disabled in database sink as line zone manager was removed');
          } 
          // If this is object_tracking, disable tracking events in database
          else if (String(componentTypeName) === 'object_tracking') {
            // Get the current config
            const currentConfig = dbSink.config || {};
            
            // Update config to disable tracking events
            const updatedConfig = {
              ...currentConfig,
              store_tracking_events: false
            };
            
            // Update the database sink
            await apiService.components.sinks.update(cameraId, dbSink.id, { config: updatedConfig });
            showSnackbar('Tracking events disabled in database sink as object tracker was removed');
          }
        }
        
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
    } finally {
      setIsDeletingComponent(null);
    }
  };

  // Modify handleStartStop function to track if pipeline has run once
  const handleStartStop = async () => {
    if (!camera || !cameraId) return;
    
    try {
      if (camera.running) {
        setIsStoppingPipeline(true);
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
        
        setIsStartingPipeline(true);
        const result = await apiService.cameras.start(cameraId);
        if (result) {
          setCamera(result);
          setPipelineHasRunOnce(true);
          showSnackbar('Pipeline started successfully');
        } else {
          showSnackbar('Failed to start pipeline');
        }
      }
    } catch (err) {
      console.error('Error starting/stopping pipeline:', err);
      showSnackbar('Error toggling pipeline state');
    } finally {
      setIsStartingPipeline(false);
      setIsStoppingPipeline(false);
    }
  };

  // Modify the refreshFrame function to store the last frame URL
  const refreshFrame = () => {
    if (camera?.running && cameraId) {
      const timestamp = new Date().getTime(); // Add timestamp to prevent caching
      const newFrameUrl = `${apiService.cameras.getFrame(cameraId, 90)}&t=${timestamp}`;
      setFrameUrl(newFrameUrl);
      setLastFrameUrl(newFrameUrl);
    }
  };

  // Set up frame refresh when camera is running
  useEffect(() => {
    let interval: number | null = null;
    
    // Only load frames if the camera is running AND we're on the relevant tabs
    // Tab indices: 1 = Live Playback, 2 = Line Zone Config (if source exists)
    const isLivePlaybackTab = mainTabValue === 1;
    const isLineZoneTab = sourceComponent 
      ? mainTabValue === 2 && hasLineZoneManagerComponent
      : mainTabValue === 1 && hasLineZoneManagerComponent;
    
    if (camera?.running && cameraId && (isLivePlaybackTab || isLineZoneTab)) {
      refreshFrame();
    } else {
      setFrameUrl('');
    }
    
    // Clean up function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    };
  }, [camera?.running, cameraId, mainTabValue, sourceComponent, hasLineZoneManagerComponent]); // Added tab dependencies

  // Update the zone counts refresh interval to respect the unsaved changes flag
  useEffect(() => {
    let zoneCountsInterval: number | null = null;
    
    // No automatic refresh - commented out refresh logic
    /*
    // Only start the interval if the camera is running and we have a line zone manager
    if (camera?.running && hasLineZoneManagerComponent && cameraId) {
      // Set up interval for refreshing zone counts (every 3 seconds)
      zoneCountsInterval = window.setInterval(() => {
        // Get a reference to the LineZoneEditor's active dragging flag
        const lineZoneEditorElement = document.querySelector('[data-line-zone-editor="true"]');
        const isActivelyDragging = lineZoneEditorElement && 
          (lineZoneEditorElement as any).__isActivelyDragging === true;
        
        // Only refresh if not actively dragging and no unsaved changes
        if (!isActivelyDragging && !hasUnsavedZoneChanges) {
          fetchComponents();
        }
      }, 3000);
    }
    */
    
    // Clean up function
    return () => {
      if (zoneCountsInterval) {
        clearInterval(zoneCountsInterval);
      }
    };
  }, [camera?.running, hasLineZoneManagerComponent, cameraId, fetchComponents, hasUnsavedZoneChanges]);

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
          processor => processor.type === requiredType
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
        !processorComponents.some(proc => proc.type === reqType)
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
          return false;
        })
      );
    }
    
    return false;
  };

  // Handle line zone updates from the visual editor
  const handleLineZonesUpdate = (updatedZones: Zone[]) => {
    // Ensure all zones have valid values before updating
    const normalizedZones = updatedZones.map(zone => ({
      id: zone.id || `zone${Math.random().toString(36).substr(2, 9)}`,
      start_x: typeof zone.start_x === 'number' ? zone.start_x : parseFloat(String(zone.start_x)) || 0.2,
      start_y: typeof zone.start_y === 'number' ? zone.start_y : parseFloat(String(zone.start_y)) || 0.5,
      end_x: typeof zone.end_x === 'number' ? zone.end_x : parseFloat(String(zone.end_x)) || 0.8,
      end_y: typeof zone.end_y === 'number' ? zone.end_y : parseFloat(String(zone.end_y)) || 0.5,
      min_crossing_threshold: zone.min_crossing_threshold || 1,
      triggering_anchors: Array.isArray(zone.triggering_anchors) ? 
        zone.triggering_anchors : ["BOTTOM_CENTER", "CENTER"]
    }));
    
    // Get current zones string for comparison
    const currentZonesString = JSON.stringify(lineZoneManagerForm.zones);
    const newZonesString = JSON.stringify(normalizedZones);
    
    // Only update if the zones have actually changed
    if (currentZonesString !== newZonesString) {
      setLineZoneManagerForm(prev => ({
        ...prev,
        zones: normalizedZones
      }));
      
      // Track that we have unsaved changes
      setHasUnsavedZoneChanges(true);
      
      // If editing a component, update the component as well
      if (dialogMode === 'edit' && selectedComponent && selectedComponentType === 'line_zone_manager') {
        // Create a deep copy of the component config
        const updatedConfig = {
          ...parseJson(componentConfig),
          zones: normalizedZones
        };
        
        setComponentConfig(formatJson(updatedConfig));
      }
    }
  };

  // Add a new helper function to initialize forms based on component type
  const initializeFormForComponentType = (componentType: string) => {
    if (dialogType === 'source') {
      if (componentType === 'file') {
        setFileSourceForm({
          url: "",
          width: 640,
          height: 480,
          fps: 30,
          use_hw_accel: false,
          adaptive_timing: true
        });
      } else if (componentType === 'rtsp') {
        setRtspSourceForm({
          url: "rtsp://username:password@ip:port/stream",
          width: 640,
          height: 480,
          fps: 30,
          use_hw_accel: false,
          rtsp_transport: "tcp",
          latency: 200
        });
      }
    } else if (dialogType === 'processor') {
      if (componentType === 'object_detection') {
        const defaultModel = objectDetectionModels.length > 0 ? objectDetectionModels[0] : null;
        setObjectDetectionForm({
          model_id: defaultModel?.id || "yolov4-tiny",
          server_url: "http://localhost:8080",
          confidence_threshold: 0.5,
          draw_bounding_boxes: true,
          use_shared_memory: true,
          label_font_scale: 0.5,
          classes: [],
          newClass: ""
        });
        
        // Set available classes for the selected model
        if (defaultModel?.classes) {
          setSelectedModelClasses(defaultModel.classes);
        }
      } else if (componentType === 'object_tracking') {
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
      } else if (componentType === 'line_zone_manager') {
        setLineZoneManagerForm({
          draw_zones: true,
          line_color: [255, 255, 255],
          line_thickness: 2,
          draw_counts: true,
          text_color: [0, 0, 0],
          text_scale: 0.5,
          text_thickness: 2,
          zones: [defaultLineZone]
        });
      }
    } else if (dialogType === 'sink') {
      if (componentType === 'file') {
        setFileSinkForm({
          path: "/tmp/output.mp4",
          width: 640,
          height: 480,
          fps: 30,
          fourcc: "mp4v"
        });
      }
    }
  };

  // Add template dialog handlers
  const openTemplateDialog = () => {
    setSelectedTemplate(null);
    setTemplateDialogOpen(true);
  };
  
  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
  };
  
  const selectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };
  
  const applyTemplate = async () => {
    if (!selectedTemplate || !cameraId) return;
    
    const template = pipelineTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    setApplyingTemplate(true);
    
    try {
      // Check if there are existing processor components
      if (processorComponents.length > 0) {
        const shouldReplace = window.confirm(
          `Applying the "${template.name}" template will replace your existing processor components. Continue?`
        );
        
        if (!shouldReplace) {
          setApplyingTemplate(false);
          return;
        }
        
        // Delete existing processors
        for (const processor of processorComponents) {
          await apiService.components.processors.delete(cameraId, processor.id);
        }
      }
      
      // Check if there are existing sink components that would clash with the template
      const templateSinkTypes = template.components.sinks?.map(sink => sink.type) || [];
      const existingSinks = sinkComponents.filter(sink => {
        const sinkType = sink.type;
        return templateSinkTypes.includes(String(sinkType));
      });
      
      if (existingSinks.length > 0) {
        const shouldReplaceSinks = window.confirm(
          `Applying the "${template.name}" template will replace ${existingSinks.length} existing sink component(s). Continue?`
        );
        
        if (!shouldReplaceSinks) {
          setApplyingTemplate(false);
          return;
        }
        
        // Delete existing sinks that would clash with template
        for (const sink of existingSinks) {
          await apiService.components.sinks.delete(cameraId, sink.id);
        }
      }
      
      // Add processor components from the template
      for (const processorConfig of template.components.processors) {
        await apiService.components.processors.create(cameraId, {
          type: processorConfig.type,
          config: processorConfig.config
        });
      }
      
      // Add sink components from the template if any
      if (template.components.sinks && template.components.sinks.length > 0) {
        for (const sinkConfig of template.components.sinks) {
          await apiService.components.sinks.create(cameraId, {
            type: sinkConfig.type,
            config: sinkConfig.config
          });
        }
      }
      
      // Refresh components
      await fetchComponents();
      showSnackbar(`Successfully applied "${template.name}" template`);
      closeTemplateDialog();
    } catch (err) {
      console.error('Error applying template:', err);
      showSnackbar('Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  // New function to fetch database records
  const fetchDatabaseRecords = useCallback(async () => {
    if (!cameraId || !dbComponentExists) return;
    
    try {
      setIsLoadingRecords(true);
      const response = await apiService.database.getRecords(cameraId, page, rowsPerPage);
      if (response) {
        setDatabaseRecords(response.events);
        setTotalEvents(response.total_events);
        setTotalFrames(response.total_frames);
      }
    } catch (err) {
      console.error('Error fetching database records:', err);
      showSnackbar('Failed to load database records');
    } finally {
      setIsLoadingRecords(false);
    }
  }, [cameraId, dbComponentExists, page, rowsPerPage, showSnackbar]);

  // Load database records when tab changes to Database or pagination changes
  useEffect(() => {
    // Calculate the telemetry tab index dynamically based on available tabs
    const telemetryTabIndex = sourceComponent ? 
      (hasLineZoneManagerComponent ? 3 : 2) : 
      (hasLineZoneManagerComponent ? 2 : 1);
    
    if (mainTabValue === telemetryTabIndex && dbComponentExists) {
      // Only fetch data when the tab is first selected
      if (!telemetryTabFirstLoadRef.current) {
        fetchDatabaseRecords();
        telemetryTabFirstLoadRef.current = true;
      }
    } else {
      // Reset the ref when navigating away from the tab
      telemetryTabFirstLoadRef.current = false;
    }
  }, [mainTabValue, sourceComponent, hasLineZoneManagerComponent, dbComponentExists, fetchDatabaseRecords]);

  // Function to delete all records for this camera
  const handleDeleteAllRecords = async () => {
    if (!cameraId || !dbComponentExists) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete all database records for camera ${camera?.name || cameraId}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeletingRecords(true);
      const success = await apiService.database.deleteRecords(cameraId);
      if (success) {
        showSnackbar('All database records deleted successfully');
        // Reset pagination and refetch
        setPage(0);
        fetchDatabaseRecords();
      } else {
        showSnackbar('Failed to delete database records');
      }
    } catch (err) {
      console.error('Error deleting database records:', err);
      showSnackbar('Failed to delete database records');
    } finally {
      setIsDeletingRecords(false);
    }
  };

  // Handler for page change
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    // Force a refresh when changing pages
    fetchDatabaseRecords();
  };

  // Handler for rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    // Force a refresh when changing rows per page
    fetchDatabaseRecords();
  };

  // Get event type name
  const getEventTypeName = (type: number): string => {
    switch(type) {
      case 0: return 'Detection';
      case 1: return 'Tracking';
      case 2: return 'Crossing';
      default: return `Unknown (${type})`;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Add function to fetch zone line counts
  const fetchZoneLineCounts = useCallback(async () => {
    if (!cameraId || !dbComponentExists) return;
    
    try {
      setIsLoadingZoneData(true);
      
      const response = await apiService.database.getZoneLineCounts(cameraId, timeRange || undefined);
      if (response) {
        if (response.success === false || !response.has_data) {
          // No data available
          setZoneLineCounts([]);
          setHasZoneLineData(false);
        } else {
          setZoneLineCounts(response.zone_line_counts || []);
          setHasZoneLineData(true);
        }
      } else {
        setZoneLineCounts([]);
        setHasZoneLineData(false);
      }
    } catch (err) {
      console.error('Error fetching zone line counts:', err);
      showSnackbar('Failed to load zone line count data');
      setZoneLineCounts([]);
      setHasZoneLineData(false);
    } finally {
      setIsLoadingZoneData(false);
    }
  }, [cameraId, dbComponentExists, timeRange, showSnackbar]);

  // Add function to fetch class heatmap data
  const fetchClassHeatmapData = useCallback(async () => {
    if (!cameraId || !dbComponentExists) return;
    
    try {
      setIsLoadingHeatmapData(true);
      
      // Check if we have heatmap data by making a lightweight request
      const response = await fetch(`/api/v1/cameras/${cameraId}/database/class-heatmap`);
      const data = await response.json();
      
      if (response.status === 204 || (data && data.success === false) || (data && data.has_data === false)) {
        // No data available
        setHasHeatmapData(false);
      } else {
        setHasHeatmapData(true);
      }
      
      // Just a short delay to avoid UI flickering
      setTimeout(() => {
        setIsLoadingHeatmapData(false);
      }, 300);
    } catch (err) {
      console.error('Error preparing heatmap data:', err);
      showSnackbar('Failed to load heatmap data');
      setHasHeatmapData(false);
      setIsLoadingHeatmapData(false);
    }
  }, [cameraId, dbComponentExists, showSnackbar]);

  // Update telemetry data loading effect
  useEffect(() => {
    // Calculate the telemetry tab index dynamically based on available tabs
    const telemetryTabIndex = sourceComponent ? 
      (hasLineZoneManagerComponent ? 3 : 2) : 
      (hasLineZoneManagerComponent ? 2 : 1);
    
    if (mainTabValue === telemetryTabIndex && dbComponentExists) {
      // Only fetch data when the tab is first selected
      if (!telemetryTabFirstLoadRef.current) {
        fetchDatabaseRecords();
        fetchZoneLineCounts();
        fetchClassHeatmapData();
        telemetryTabFirstLoadRef.current = true;
      }
    } else {
      // Reset the ref when navigating away from the tab
      telemetryTabFirstLoadRef.current = false;
    }
  }, [mainTabValue, sourceComponent, hasLineZoneManagerComponent, dbComponentExists, 
      fetchDatabaseRecords, fetchZoneLineCounts, fetchClassHeatmapData]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Skeleton variant="text" width={120} height={40} sx={{ mb: 2 }} />
            <Skeleton variant="text" width={300} height={40} />
          </Box>
          <Skeleton variant="rounded" width={150} height={40} />
        </Box>

        <Box sx={{ width: '100%', mb: 4 }}>
          <Paper elevation={3} sx={{ borderRadius: '4px 4px 0 0' }}>
            <Skeleton variant="rectangular" height={64} width="100%" />
          </Paper>
          
          <Box sx={{ mt: 3 }}>
            {/* Source Card Skeleton */}
            <Paper elevation={2} sx={{ p: 3, width: '100%', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width={120} height={32} />
                </Box>
                <Skeleton variant="rounded" width={120} height={36} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <ComponentCardSkeleton />
            </Paper>

            {/* Processors Card Skeleton */}
            <Paper elevation={2} sx={{ p: 3, width: '100%', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width={120} height={32} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rounded" width={120} height={36} />
                  <Skeleton variant="rounded" width={120} height={36} />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <ComponentCardSkeleton />
            </Paper>

            {/* Sinks Card Skeleton */}
            <Paper elevation={2} sx={{ p: 3, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                  <Skeleton variant="text" width={120} height={32} />
                </Box>
                <Skeleton variant="rounded" width={120} height={36} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <ComponentCardSkeleton />
            </Paper>
          </Box>
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
            icon={<ArrowBackIcon />}
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
            startIcon={
              isStartingPipeline || isStoppingPipeline ? 
                <CircularProgress size={24} color="inherit" /> : 
                camera.running ? <StopIcon /> : <PlayArrowIcon />
            }
            onClick={handleStartStop}
            disabled={isStartingPipeline || isStoppingPipeline}
          >
            {isStartingPipeline ? "Starting..." : 
             isStoppingPipeline ? "Stopping..." :
             camera.running ? "Stop Pipeline" : "Start Pipeline"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: '4px 4px 0 0' }}>
          <Tabs 
            value={mainTabValue} 
            onChange={handleMainTabChange} 
            aria-label="main tabs"
            variant="fullWidth"
            sx={{ 
              minHeight: '64px',
              '& .MuiTab-root': { 
                fontWeight: 'bold',
                fontSize: '1rem'
              }
            }}
          >
            <Tab icon={<TuneIcon />} iconPosition="start" label="Pipeline Configuration" />
            {sourceComponent && 
              <Tab icon={<LiveTvIcon />} iconPosition="start" label="Live Playback" />
            }
            {hasLineZoneManagerComponent && 
              <Tab icon={<VisibilityIcon />} iconPosition="start" label="Line Zone Configuration" />
            }
            {dbComponentExists && 
              <Tab 
                icon={<DatabaseIcon />} 
                iconPosition="start"
                label="Telemetry" 
              />
            }
          </Tabs>
        </Paper>

        <TabPanel value={mainTabValue} index={0} sx={{ p: 0, mt: 3 }}>
          <PipelineConfigTab 
            sourceComponent={sourceComponent}
            processorComponents={processorComponents}
            sinkComponents={sinkComponents}
            openCreateDialog={openCreateDialog}
            openEditDialog={openEditDialog}
            handleDeleteComponent={handleDeleteComponent}
            isDeletingComponent={isDeletingComponent}
            camera={camera}
            areAllComponentTypesUsed={areAllComponentTypesUsed}
            openTemplateDialog={openTemplateDialog}
          />
        </TabPanel>

        {/* Live Playback Tab */}
        {sourceComponent && (
          <TabPanel value={mainTabValue} index={1} sx={{ p: 0, mt: 3 }}>
            <LivePlaybackTab
              camera={camera}
              frameUrl={frameUrl}
              lastFrameUrl={lastFrameUrl}
              pipelineHasRunOnce={pipelineHasRunOnce}
              refreshFrame={refreshFrame}
              handleStartStop={handleStartStop}
              isStartingPipeline={isStartingPipeline}
              sourceComponent={sourceComponent}
            />
          </TabPanel>
        )}

        {/* Line Zone Configuration Tab */}
        {hasLineZoneManagerComponent && (
          <TabPanel value={mainTabValue} index={sourceComponent ? 2 : 1} sx={{ p: 0, mt: 3 }}>
            <LineZoneConfigTab
              camera={camera}
              frameUrl={frameUrl}
              lastFrameUrl={lastFrameUrl}
              pipelineHasRunOnce={pipelineHasRunOnce}
              lineZoneManagerForm={lineZoneManagerForm}
              handleLineZonesUpdate={handleLineZonesUpdate}
              isSavingZones={isSavingZones}
              handleStartStop={handleStartStop}
              isStartingPipeline={isStartingPipeline}
              sourceComponent={sourceComponent}
              isRefreshingComponents={isRefreshingComponents}
              fetchComponents={fetchComponents}
              lineZoneManagerComponent={lineZoneManagerComponent}
              hasUnsavedZoneChanges={hasUnsavedZoneChanges}
              setHasUnsavedZoneChanges={setHasUnsavedZoneChanges}
              showSnackbar={showSnackbar}
              cameraId={cameraId}
            />
          </TabPanel>
        )}
        
        <TabPanel value={mainTabValue} index={sourceComponent ? (hasLineZoneManagerComponent ? 3 : 2) : (hasLineZoneManagerComponent ? 2 : 1)} sx={{ p: 0, mt: 3 }}>
          {/* Telemetry Tab */}
          {dbComponentExists && (
            <TelemetryTab
              camera={camera}
              cameraId={cameraId || ''}
              zoneLineCounts={zoneLineCounts}
              isLoadingZoneData={isLoadingZoneData}
              isLoadingHeatmapData={isLoadingHeatmapData}
              fetchZoneLineCounts={fetchZoneLineCounts}
              fetchClassHeatmapData={fetchClassHeatmapData}
              databaseRecords={databaseRecords}
              isLoadingRecords={isLoadingRecords}
              isDeletingRecords={isDeletingRecords}
              totalEvents={totalEvents}
              totalFrames={totalFrames}
                        page={page}
              rowsPerPage={rowsPerPage}
              handlePageChange={handlePageChange}
              handleChangeRowsPerPage={handleChangeRowsPerPage}
              fetchDatabaseRecords={fetchDatabaseRecords}
              handleDeleteAllRecords={handleDeleteAllRecords}
              getEventTypeName={getEventTypeName}
              formatTimestamp={formatTimestamp}
              hasHeatmapData={hasHeatmapData}
              hasZoneLineData={hasZoneLineData}
            />
          )}
        </TabPanel>
      </Box>

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
          
          {/* Show a message when no components are available */}
          {selectedComponentType === '' && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              No available component types to add. {
                dialogType === 'source' ? 'A source component already exists.' :
                dialogType === 'processor' ? 'All processor components have been added or their dependencies are not met.' :
                'All sink components have been added.'
              }
            </Alert>
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
            
            {/* Only render the appropriate form if component can be added or in edit mode */}
            {selectedComponentType !== '' && (dialogMode === 'edit' || canAddComponent(selectedComponentType, dialogType)) && (
              <>
                {/* Source - File type */}
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
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Line zones can be created and edited in the Live Preview section after the pipeline has been started at least once.
                    </Alert>
                    
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
                          value={JSON.stringify({
                            draw_zones: lineZoneManagerForm.draw_zones,
                            line_color: lineZoneManagerForm.line_color,
                            line_thickness: lineZoneManagerForm.line_thickness,
                            draw_counts: lineZoneManagerForm.draw_counts,
                            text_color: lineZoneManagerForm.text_color,
                            text_scale: lineZoneManagerForm.text_scale,
                            text_thickness: lineZoneManagerForm.text_thickness,
                            // Don't show zones in the preview
                            zones: lineZoneManagerForm.zones.length + " zones configured"
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
                
                {/* File Sink Form */}
                {dialogType === 'sink' && selectedComponentType === 'file' && (
                  <Box sx={{ mt: 2 }}>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>File Sink Configuration</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Output Path"
                            value={fileSinkForm.path}
                            onChange={(e) => handleFileSinkFormChange('path', e.target.value)}
                            fullWidth
                            variant="outlined"
                          />
                        </FormControl>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Width"
                            type="number"
                            value={fileSinkForm.width}
                            onChange={(e) => handleFileSinkFormChange('width', parseInt(e.target.value))}
                            fullWidth
                            variant="outlined"
                          />
                        </FormControl>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Height"
                            type="number"
                            value={fileSinkForm.height}
                            onChange={(e) => handleFileSinkFormChange('height', parseInt(e.target.value))}
                            fullWidth
                            variant="outlined"
                          />
                        </FormControl>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="FPS"
                            type="number"
                            value={fileSinkForm.fps}
                            onChange={(e) => handleFileSinkFormChange('fps', parseInt(e.target.value))}
                            fullWidth
                            variant="outlined"
                          />
                        </FormControl>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="FourCC Code"
                            value={fileSinkForm.fourcc}
                            onChange={(e) => handleFileSinkFormChange('fourcc', e.target.value)}
                            fullWidth
                            variant="outlined"
                            helperText="Video codec code (e.g., mp4v, avc1, H264)"
                          />
                        </FormControl>
                        
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

                {/* Database Sink Form */}
                {dialogType === 'sink' && selectedComponentType === 'database' && (
                  <Box sx={{ mt: 2 }}>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Database Sink Configuration</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={databaseSinkForm.store_thumbnails}
                                onChange={(e) => handleDatabaseSinkFormChange('store_thumbnails', e.target.checked)}
                              />
                            }
                            label="Store Frame Thumbnails"
                          />
                        </FormControl>
                        
                        {databaseSinkForm.store_thumbnails && (
                          <>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <TextField
                                label="Thumbnail Width"
                                type="number"
                                value={databaseSinkForm.thumbnail_width}
                                onChange={(e) => handleDatabaseSinkFormChange('thumbnail_width', parseInt(e.target.value))}
                                fullWidth
                                variant="outlined"
                              />
                            </FormControl>
                            
                            <FormControl fullWidth sx={{ mb: 2 }}>
                              <TextField
                                label="Thumbnail Height"
                                type="number"
                                value={databaseSinkForm.thumbnail_height}
                                onChange={(e) => handleDatabaseSinkFormChange('thumbnail_height', parseInt(e.target.value))}
                                fullWidth
                                variant="outlined"
                              />
                            </FormControl>
                          </>
                        )}
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Data Retention (days)"
                            type="number"
                            value={databaseSinkForm.retention_days}
                            onChange={(e) => handleDatabaseSinkFormChange('retention_days', parseInt(e.target.value))}
                            fullWidth
                            variant="outlined"
                            helperText="Set to 0 to keep data indefinitely"
                          />
                        </FormControl>
                        
                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Event Storage Settings</Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        {/* Check if object detection exists in the pipeline */}
                        {(() => {
                          const hasObjectDetection = processorComponents.some(
                            comp => (comp.type === "object_detection")
                          );
                          
                          return (
                            <Tooltip 
                              title={!hasObjectDetection ? "Object detection component is required" : ""}
                              placement="right"
                            >
                              <FormControl fullWidth sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={databaseSinkForm.store_detection_events}
                                        onChange={(e) => handleDatabaseSinkFormChange('store_detection_events', e.target.checked)}
                                        disabled={!hasObjectDetection}
                                      />
                                    }
                                    label={
                                      <Box sx={{ color: !hasObjectDetection ? 'text.disabled' : 'inherit' }}>
                                        Store Detection Events
                                      </Box>
                                    }
                                  />
                                  <Chip 
                                    color="warning" 
                                    size="small" 
                                    label="High Volume" 
                                    icon={<WarningIcon fontSize="small" />} 
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                                <Typography 
                                  variant="caption" 
                                  color="warning.main" 
                                  sx={{ ml: 4, color: !hasObjectDetection ? 'text.disabled' : 'warning.main' }}
                                >
                                  Warning: Enabling detection events can significantly increase database size and resource usage.
                                </Typography>
                              </FormControl>
                            </Tooltip>
                          );
                        })()}
                        
                        {/* Check if object tracking exists in the pipeline */}
                        {(() => {
                          const hasObjectTracking = processorComponents.some(
                            comp => (comp.type === "object_tracking")
                          );
                          
                          return (
                            <Tooltip 
                              title={!hasObjectTracking ? "Object tracking component is required" : ""}
                              placement="right"
                            >
                              <FormControl fullWidth sx={{ mb: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={databaseSinkForm.store_tracking_events}
                                      onChange={(e) => handleDatabaseSinkFormChange('store_tracking_events', e.target.checked)}
                                      disabled={!hasObjectTracking}
                                    />
                                  }
                                  label={
                                    <Box sx={{ color: !hasObjectTracking ? 'text.disabled' : 'inherit' }}>
                                      Store Tracking Events
                                    </Box>
                                  }
                                />
                              </FormControl>
                            </Tooltip>
                          );
                        })()}
                        
                        {/* Check if line zone manager exists in the pipeline */}
                        {(() => {
                          const hasLineZoneManager = processorComponents.some(
                            comp => (comp.type === "line_zone_manager")
                          );
                          
                          return (
                            <Tooltip 
                              title={!hasLineZoneManager ? "Line zone manager component is required" : ""}
                              placement="right"
                            >
                              <FormControl fullWidth sx={{ mb: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={databaseSinkForm.store_counting_events}
                                      onChange={(e) => handleDatabaseSinkFormChange('store_counting_events', e.target.checked)}
                                      disabled={!hasLineZoneManager}
                                    />
                                  }
                                  label={
                                    <Box sx={{ color: !hasLineZoneManager ? 'text.disabled' : 'inherit' }}>
                                      Store Counting Events
                                    </Box>
                                  }
                                />
                              </FormControl>
                            </Tooltip>
                          );
                        })()}
                        
                        <TextField
                          label="Configuration Preview (JSON)"
                          multiline
                          rows={6}
                          value={JSON.stringify({
                            store_thumbnails: databaseSinkForm.store_thumbnails,
                            thumbnail_width: databaseSinkForm.thumbnail_width,
                            thumbnail_height: databaseSinkForm.thumbnail_height,
                            retention_days: databaseSinkForm.retention_days,
                            store_detection_events: databaseSinkForm.store_detection_events,
                            store_tracking_events: databaseSinkForm.store_tracking_events,
                            store_counting_events: databaseSinkForm.store_counting_events
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
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isCreatingComponent || isUpdatingComponent}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={
              isCreatingComponent || isUpdatingComponent ||
              selectedComponentType === '' || 
              (selectedComponentType !== '' && !canAddComponent(selectedComponentType, dialogType) && dialogMode === 'create') ||
              (dialogType === 'source' && selectedComponentType === 'file' && !fileSourceForm.url) ||
              (dialogType === 'source' && selectedComponentType === 'rtsp' && !rtspSourceForm.url) ||
              (dialogType === 'sink' && selectedComponentType === 'file' && !fileSinkForm.path)
            }
            startIcon={isCreatingComponent || isUpdatingComponent ? <CircularProgress size={20} /> : null}
          >
            {isCreatingComponent ? 'Creating...' : 
             isUpdatingComponent ? 'Saving...' :
             dialogMode === 'create' ? 'Create' : 'Save'}
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

      {/* Add loading indicator for component refresh */}
      {isRefreshingComponents && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16, 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 1,
          px: 2,
          py: 1
        }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Refreshing components...</Typography>
        </Box>
      )}
      
      {/* Add Templates Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={closeTemplateDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <AutoFixHighIcon sx={{ mr: 1 }} />
          Pipeline Templates
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose a template to automatically configure your pipeline for a specific use case.
            This will add all necessary processor components with pre-configured settings.
          </Typography>
          
          {!sourceComponent && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You need to add a source component before applying a template.
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {pipelineTemplates.map((template) => (
              <Card 
                key={template.id}
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  border: selectedTemplate === template.id ? '2px solid' : '1px solid',
                  borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                  bgcolor: selectedTemplate === template.id ? 'action.selected' : 'background.paper'
                }}
                onClick={() => selectTemplate(template.id)}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    p: 1.5, 
                    bgcolor: 'primary.light', 
                    color: 'primary.contrastText',
                    borderRadius: 1
                  }}>
                    {template.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom>{template.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{template.description}</Typography>
                    
                    <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5 }}>Includes:</Typography>
                    <CustomDivider spacing={0.5} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {template.components.processors.map((processor) => (
                        <Chip
                          key={processor.type}
                          label={getComponentTypeName(processor.type, 'processor')}
                          size="small"
                          icon={processorTypeMapping[processor.type]?.icon ? 
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                              {processorTypeMapping[processor.type]?.icon}
                            </Box> : undefined}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTemplateDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            loading={applyingTemplate}
            icon={<AutoFixHighIcon />}
            disabled={!selectedTemplate || !sourceComponent}
            onClick={applyTemplate}
          >
            Apply Template
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PipelineBuilder; 