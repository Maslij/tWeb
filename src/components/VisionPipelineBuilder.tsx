import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import '../styles/VisionPipelineBuilder.css';
import LineZoneConfigModal from './LineZoneConfigModal';
import ConfigurableProperties from './ConfigurableProperties';
import { isPipelineProcessing, waitForPipelineProcessing, getVisionModels } from '../services/api';

// Add a declaration for the global window property
declare global {
  interface Window {
    __COMPONENT_DEFS__?: any[];
    __PIPELINE_DATA__?: any;
  }
}

// Define types for our vision components
interface VisionComponent {
  id: string;
  type: string;
  name: string;
  category: string;
  description: string;
  inputs?: string[];
  outputs?: string[];
  requiresParent?: string[];
  config?: Record<string, any>;
  model_classes?: Record<string, string[]>;
  available_models?: {id: string, name: string}[];
}

// Add a utility function to normalize component formats from the API
const normalizeComponent = (component: any): VisionComponent => {
  // Make sure the component has all the required fields
  const normalizedComponent = {
    id: component.id,
    name: component.name,
    type: component.type || component.id,
    category: component.category,
    description: component.description || '',
    inputs: component.inputs || [],
    outputs: component.outputs || [],
    requiresParent: component.requiresParent || [],
    config: component.config || {},
    model_classes: component.model_classes || {},
    available_models: component.available_models || []
  };
  
  // Special handling for source/camera components to turn OFF hardware acceleration by default
  if (normalizedComponent.id === 'camera_feed' || normalizedComponent.category === 'source') {
    normalizedComponent.config = {
      hw_acceleration: false,  // Turn OFF hardware acceleration by default
      ...normalizedComponent.config // Keep any existing config values
    };
  }
  
  // Special handling for annotated stream components to ensure they have all the config options
  if (normalizedComponent.id === 'annotated_stream' || normalizedComponent.id === 'annotated_video_sink') {
    normalizedComponent.config = {
      show_labels: true,
      show_bounding_boxes: true,
      show_tracks: true,
      show_title: true,
      show_timestamp: true,
      show_performance_metrics: false,  // This is the correct format
      show_line_zones: true,           // Enable line zones display
      label_font_scale: 0.5,
      text_color: [255, 255, 255],
      title_position: [10, 30],
      timestamp_position: [10, 60],
      // Default line zone config
      line_zone_thickness: 2,
      line_zone_color: [255, 255, 255],
      line_zone_text_color: [0, 0, 0],
      line_zone_text_thickness: 2,
      line_zone_text_scale: 0.5,
      line_zone_text_offset: 1.5,
      line_zone_text_padding: 10,
      line_zone_display_in_count: true,
      line_zone_display_out_count: true,
      line_zone_display_text_box: true,
      line_zone_text_orient_to_line: false,
      line_zone_text_centered: true,
      // When normalizing a component, also add default line zone config
      // This will be updated when a pipeline is constructed
      line_zones: [],
      ...normalizedComponent.config // Keep any existing config values
    };
  }
  
  // Special handling for detector components - ensure they have proper model data
  if (normalizedComponent.category === 'detector' || 
      normalizedComponent.id === 'object_detector' || 
      normalizedComponent.id === 'face_detector' ||
      normalizedComponent.id === 'image_classifier') {
    
    // Check for available_models in component data and ensure it's handled properly
    if (component.available_models && Array.isArray(component.available_models)) {
      normalizedComponent.available_models = component.available_models;
      
      // If the component has available_models but no model set, use the first one as default
      if (!normalizedComponent.config.model && normalizedComponent.available_models.length > 0) {
        const defaultModel = normalizedComponent.available_models[0].id || normalizedComponent.available_models[0];
        normalizedComponent.config.model = defaultModel;
      }
    }
    
    // Initialize model_classes if not present but there's model information
    if (!normalizedComponent.model_classes || Object.keys(normalizedComponent.model_classes).length === 0) {
      if (window.__COMPONENT_DEFS__) {
        // Try to get model_classes from global definitions
        const globalModelClasses = window.__COMPONENT_DEFS__.find(def => 
          def.id === normalizedComponent.id
        )?.model_classes;
        
        if (globalModelClasses) {
          normalizedComponent.model_classes = globalModelClasses;
        }
        // No default fallback - if no model classes available, leave empty
      }
    }
    
    // Ensure the config contains a model field, but don't set a default value if no models available
    if (!normalizedComponent.config.model) {
      const modelKeys = Object.keys(normalizedComponent.model_classes || {});
      if (modelKeys.length > 0) {
        normalizedComponent.config.model = modelKeys[0];
      }
      // Otherwise leave model unset - UI will show "no models available"
    }
    
    // Initialize classes array if not set, but only if we have available classes
    if (!normalizedComponent.config.classes) {
      const modelId = normalizedComponent.config.model;
      if (modelId && normalizedComponent.model_classes && normalizedComponent.model_classes[modelId]) {
        const availableClasses = normalizedComponent.model_classes[modelId];
        if (availableClasses && availableClasses.length > 0) {
          // Default to first 5 classes or fewer if not enough available
          normalizedComponent.config.classes = availableClasses.slice(0, Math.min(5, availableClasses.length));
          
          // Ensure "person" is included if available in this model
          if (availableClasses.includes("person") && !normalizedComponent.config.classes.includes("person")) {
            normalizedComponent.config.classes.push("person");
          }
        }
        // Otherwise leave classes empty - UI will show "no classes available"
      }
    }
  }
  
  // Special handling for event alarm components
  if (normalizedComponent.id === 'event_alarm') {
    normalizedComponent.config = {
      min_confidence: 0.6,
      trigger_delay: 5,
      cool_down_period: 30,
      notify_on_alarm: true,
      allowed_classes: [], // Start with empty array - will be populated when connected to a detector
      ...normalizedComponent.config // Keep any existing config values
    };
    
    // If allowed_classes is set in the existing config, ensure it's properly formatted
    if (normalizedComponent.config && normalizedComponent.config.allowed_classes) {
      if (typeof normalizedComponent.config.allowed_classes === 'string') {
        // If it's the string "allowed_classes", convert to empty array
        if (normalizedComponent.config.allowed_classes === "allowed_classes") {
          normalizedComponent.config.allowed_classes = [];
        } else {
          // Try to parse it as JSON if it looks like an array
          try {
            const parsed = JSON.parse(normalizedComponent.config.allowed_classes);
            if (Array.isArray(parsed)) {
              normalizedComponent.config.allowed_classes = parsed;
            } else {
              // If it's a string but not a JSON array, treat as single class name
              normalizedComponent.config.allowed_classes = [normalizedComponent.config.allowed_classes];
            }
          } catch (e) {
            // If parsing fails, use it as a single class name
            normalizedComponent.config.allowed_classes = [normalizedComponent.config.allowed_classes];
          }
        }
      } else if (!Array.isArray(normalizedComponent.config.allowed_classes)) {
        // If it's not a string or array, initialize as empty array
        normalizedComponent.config.allowed_classes = [];
      }
    }
  }
  
  // Special handling for event logger components
  if (normalizedComponent.id === 'event_logger') {
    normalizedComponent.config = {
      log_level: 'info',
      include_images: true,
      retention_days: 7,
      max_events_per_day: 1000,
      ...normalizedComponent.config // Keep any existing config values
    };
  }
  
  // Special handling for line zone components
  if (normalizedComponent.id === 'line_zone') {
    // Generate a line that goes across the screen horizontally at a random y position
    // Random Y between 200 and 500 for good visibility
    const randomY = Math.floor(Math.random() * 300) + 200;
    
    // Create an initial line object
    const initialLine = {
      id: `line_${Date.now()}`,
      start_x: 50,          // Start from left side
      start_y: randomY,     // Random Y position
      end_x: 1000,          // End at right side (should be wide enough for most videos)
      end_y: randomY,       // Same Y position (horizontal line)
      in_count: 0,
      out_count: 0
    };
    
    normalizedComponent.config = {
      minimum_crossing_threshold: 1,  // Default value
      // Default triggering anchors (all corners of the bounding box)
      triggering_anchors: ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"],
      // Store lines in an array instead of individual properties
      lines: [initialLine],
      ...normalizedComponent.config // Keep any existing config values
    };
    
    // If we have legacy config with individual properties, convert them to a line
    if (component.config && (component.config.start_x !== undefined || 
                            component.config.start_y !== undefined ||
                            component.config.end_x !== undefined || 
                            component.config.end_y !== undefined)) {
      const legacyLine = {
        id: `line_${Date.now()}`,
        start_x: component.config.start_x ?? 50,
        start_y: component.config.start_y ?? randomY,
        end_x: component.config.end_x ?? 1000,
        end_y: component.config.end_y ?? randomY,
        in_count: 0,
        out_count: 0
      };
      
      // Replace the initial line with the legacy config
      normalizedComponent.config.lines = [legacyLine];
    }
  }
  
  // Special handling for line zone manager component
  if (normalizedComponent.id === 'line_zone_manager') {
    // Initialize the line_zone_manager configuration without any default lines
    normalizedComponent.config = {
      ...normalizedComponent.config // Keep any existing config values
    };
    
    // If there are already lines in the configuration, ensure they have the required properties
    if (normalizedComponent.config.lines && Array.isArray(normalizedComponent.config.lines)) {
      normalizedComponent.config.lines = normalizedComponent.config.lines.map((line: any) => {
        return {
          id: line.id || `line_${Date.now()}`,
          start_x: line.start_x || 50,
          start_y: line.start_y || 200,
          end_x: line.end_x || 1000,
          end_y: line.end_y || 200,
          minimum_crossing_threshold: line.minimum_crossing_threshold || 1,
          triggering_anchors: line.triggering_anchors || ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"],
          in_count: line.in_count || 0,
          out_count: line.out_count || 0
        };
      });
    }
  }
  
  return normalizedComponent;
};

interface PipelineNode {
  id: string;
  componentId: string;
  position: { x: number; y: number };
  connections: string[]; // IDs of connected nodes
  config?: Record<string, any>;
  sourceDetails?: {
    name: string;
    source: string;
    type: string;
  };
}

interface Pipeline {
  id: string;
  name: string;
  nodes: PipelineNode[];
}

interface VisionPipelineBuilderProps {
  streamId: string;
  streamName: string;
  streamSource: string;
  streamType: 'camera' | 'file' | 'rtsp';
  streamStatus: 'created' | 'running' | 'stopped' | 'error';
  streamResolution?: string;
  streamFps?: number;
  onSave: (pipeline: any) => void;
  onStartStream?: () => void | Promise<void>;
  onStopStream?: () => void | Promise<void>;
  onDeleteStream?: () => void;
  actionLoading?: boolean;
  availableComponents?: any[]; // Optional array of available components from API
  initialPipeline?: any; // Optional initial pipeline data
  renderCameraFeedPreview?: () => React.ReactNode; // Optional function to render camera feed preview
}

// Create a color picker component
interface ColorPickerControlProps {
  value: number[];
  onChange: (newValue: number[]) => void;
}

const ColorPickerControl: React.FC<ColorPickerControlProps> = ({ value, onChange }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // RGB color string for display
  const rgbColor = `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
  
  // Convert RGB to hex for the color picker
  const toHex = (c: number): string => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };
  
  const hexColor = rgbToHex(value[0], value[1], value[2]);
  
  // Handle color change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const hex = e.target.value;
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    onChange([r, g, b]);
  };
  
  return (
    <div className="color-config">
      <div 
        className="color-preview" 
        style={{ 
          backgroundColor: rgbColor,
          width: '24px',
          height: '24px',
          display: 'inline-block',
          border: '1px solid #ccc',
          marginRight: '8px',
          cursor: 'pointer',
          borderRadius: '3px'
        }}
        onClick={() => setShowColorPicker(!showColorPicker)}
      />
      <span>[{value.join(', ')}]</span>
      
      {showColorPicker && (
        <div className="color-picker-container" style={{ marginTop: '8px' }}>
          <input 
            type="color" 
            value={hexColor}
            onChange={handleColorChange}
            style={{ width: '100%', height: '30px' }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
            Click to select color
          </div>
        </div>
      )}
    </div>
  );
};

// Generic component for rendering and editing configuration properties
interface ConfigPropertyControlProps {
  nodeId: string;
  propKey: string;
  propValue: any;
  componentType?: string; // Optional component type for special cases
  onConfigUpdate: (nodeId: string, key: string, value: any) => void;
}

const ConfigPropertyControl: React.FC<ConfigPropertyControlProps> = ({ 
  nodeId, 
  propKey, 
  propValue, 
  componentType, 
  onConfigUpdate 
}) => {
  // Helper to format property name for display
  const formatPropName = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Special property groups - to help organize properties in logical categories
  const displayProperties = ['show_labels', 'show_bounding_boxes', 'show_tracks', 'show_title', 'show_timestamp', 'show_performance_metrics'];
  const styleProperties = ['label_font_scale', 'text_color'];
  const positionProperties = ['title_position', 'timestamp_position'];
  const alarmProperties = ['min_confidence', 'trigger_delay', 'cool_down_period', 'notify_on_alarm', 'allowed_classes'];
  const loggerProperties = ['log_level', 'include_images', 'retention_days', 'max_events_per_day'];
  const modelProperties = ['model', 'classes', 'confidence'];
  
  // Special handling for line_zone coordinates
  if ((componentType === 'line_zone' || componentType === 'line_zone_manager') && propKey === 'lines') {
    // Use state to manage the array of lines
    const [lines, setLines] = useState<any[]>(Array.isArray(propValue) ? propValue : []);
    
    // Add a new line function
    const addLine = () => {
      const randomY = Math.floor(Math.random() * 300) + 200;
      const newLine = {
        id: `line_${Date.now()}`,
        start_x: 50,
        start_y: randomY,
        end_x: 1000,
        end_y: randomY,
        in_count: 0,
        out_count: 0,
        minimum_crossing_threshold: 1,
        triggering_anchors: ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"]
      };
      
      const updatedLines = [...lines, newLine];
      setLines(updatedLines);
      onConfigUpdate(nodeId, propKey, updatedLines);
    };
    
    // Remove a line function
    const removeLine = (lineId: string) => {
      if (lines.length <= 1) {
        // Don't allow removing the last line
        return;
      }
      
      const updatedLines = lines.filter(line => line.id !== lineId);
      setLines(updatedLines);
      onConfigUpdate(nodeId, propKey, updatedLines);
    };
    
    // Update line properties
    const updateLineProperty = (lineId: string, property: string, value: any) => {
      const updatedLines = lines.map(line => {
        if (line.id === lineId) {
          return { ...line, [property]: value };
        }
        return line;
      });
      
      setLines(updatedLines);
      onConfigUpdate(nodeId, propKey, updatedLines);
    };
    
    return (
      <div className="config-item line-zones-editor">
        <label>{formatPropName(propKey)}:</label>
        <div className="line-zones-list">
          {lines.map((line, index) => (
            <div key={line.id} className="line-zone-item">
              <div className="line-zone-header">
                <h4>Line {index + 1}</h4>
                {lines.length > 1 && (
                  <button 
                    className="remove-line-btn" 
                    onClick={() => removeLine(line.id)}
                    title="Remove line"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="line-coords">
                <div className="coord-group">
                  <label>Start X:</label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={line.start_x}
                    onChange={(e) => updateLineProperty(line.id, 'start_x', parseFloat(e.target.value))}
                    style={{ width: '80px' }}
                  />
                </div>
                
                <div className="coord-group">
                  <label>Start Y:</label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={line.start_y}
                    onChange={(e) => updateLineProperty(line.id, 'start_y', parseFloat(e.target.value))}
                    style={{ width: '80px' }}
                  />
                </div>
                
                <div className="coord-group">
                  <label>End X:</label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={line.end_x}
                    onChange={(e) => updateLineProperty(line.id, 'end_x', parseFloat(e.target.value))}
                    style={{ width: '80px' }}
                  />
                </div>
                
                <div className="coord-group">
                  <label>End Y:</label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={line.end_y}
                    onChange={(e) => updateLineProperty(line.id, 'end_y', parseFloat(e.target.value))}
                    style={{ width: '80px' }}
                  />
                </div>
                
                {componentType === 'line_zone_manager' && (
                  <div className="coord-group">
                    <label>Min. Crossing:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={line.minimum_crossing_threshold || 1}
                      onChange={(e) => updateLineProperty(line.id, 'minimum_crossing_threshold', parseInt(e.target.value))}
                      style={{ width: '80px' }}
                      title="Minimum crossing threshold"
                    />
                  </div>
                )}
              </div>
              
              <div className="line-counts">
                <small>In Count: {line.in_count || 0}</small>
                <small>Out Count: {line.out_count || 0}</small>
              </div>
            </div>
          ))}
          
          <button className="add-line-btn" onClick={addLine}>
            + Add Line
          </button>
        </div>
      </div>
    );
  }
  
  // Keep the legacy individual property handlers for backward compatibility
  if ((componentType === 'line_zone' || componentType === 'line_zone_manager') && 
      (propKey === 'start_x' || propKey === 'start_y' || propKey === 'end_x' || propKey === 'end_y')) {
    return (
      <div className="config-item legacy-warning">
        <label>{formatPropName(propKey)}:</label>
        <div className="warning-message">
          This property is deprecated. Please use the 'Lines' property instead.
        </div>
      </div>
    );
  }
  
  // Special handling for model selection dropdown
  if (propKey === 'model' && componentType && (
      componentType === 'object_detector' || 
      componentType === 'face_detector' || 
      componentType === 'image_classifier')) {
    

    // Use state to ensure component re-renders when models are loaded
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
    
    // Effect to load available models when component mounts or changes
    useEffect(() => {
      const loadModelData = () => {
        setIsLoadingModels(true);
        let modelList: any[] = [];
        
        // First check for model_classes in the global component definitions
        const componentDef = window.__COMPONENT_DEFS__?.find(c => c.id === componentType);
        
        // Try to get models from available_models property first (preferred)
        if (componentDef && componentDef.available_models && Array.isArray(componentDef.available_models)) {
          modelList = componentDef.available_models;
        }
        // Then try to extract from model_classes object
        else if (componentDef && componentDef.model_classes) {
          const modelClasses = componentDef.model_classes;
          
          if (typeof modelClasses === 'object' && !Array.isArray(modelClasses)) {
            // Extract model IDs from model_classes object
            modelList = Object.keys(modelClasses).map(id => ({ 
              id, 
              name: id.toUpperCase() // Uppercase for better display
            }));
          }
        }
        
        // If no models found, check component config
        if (modelList.length === 0) {
          const nodeConfig = document.getElementById(`node-config-${nodeId}`);
          if (nodeConfig) {
            const configData = (nodeConfig as any).dataset?.config;
            if (configData) {
              try {
                const config = JSON.parse(configData);
                
                // Check available_models property first
                if (config.available_models && Array.isArray(config.available_models)) {
                  modelList = config.available_models;
                }
                // Otherwise check model_classes
                else if (config.model_classes) {
                  let modelClasses = config.model_classes;
                  
                  if (typeof modelClasses === 'string') {
                    try {
                      modelClasses = JSON.parse(modelClasses);
                    } catch (e) {
                      console.error("Failed to parse model_classes string:", e);
                    }
                  }
                  
                  if (typeof modelClasses === 'object' && !Array.isArray(modelClasses)) {
                    modelList = Object.keys(modelClasses).map(id => ({ 
                      id, 
                      name: id.toUpperCase() // Uppercase for better display
                    }));
                  }
                }
              } catch (e) {
                console.error("Failed to parse config data:", e);
              }
            }
          }
        }
        
        // If the current model value is different, add it too
        if (propValue && !modelList.some(m => m.id === propValue)) {
          modelList.push({ id: propValue, name: propValue.toUpperCase() });
        }
        
        // Update state with the found models
        setAvailableModels(modelList);
        setIsLoadingModels(false);
      };
      
      // Load model data initially
      loadModelData();
      
      // Set up an observer to detect when the config data might change
      const observer = new MutationObserver(loadModelData);
      const nodeConfig = document.getElementById(`node-config-${nodeId}`);
      if (nodeConfig) {
        observer.observe(nodeConfig, { attributes: true, attributeFilter: ['data-config'] });
      }
      
      // Add event listener for models-updated event
      const handleModelsUpdated = () => {
        loadModelData();
      };
      document.addEventListener('models-updated', handleModelsUpdated);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('models-updated', handleModelsUpdated);
      };
    }, [nodeId, componentType, propValue]);
    
    // Show loading state
    if (isLoadingModels) {
      return (
        <div className="config-item model-select">
          <label>{formatPropName(propKey)}:</label>
          <div className="loading-models">Loading available models...</div>
        </div>
      );
    }
    
    // No models available
    if (availableModels.length === 0) {
      return (
        <div className="config-item model-select">
          <label>{formatPropName(propKey)}:</label>
          <div className="no-models-available">
            No models available for this component.
          </div>
        </div>
      );
    }
    
    return (
      <div className="config-item model-select">
        <label>{formatPropName(propKey)}:</label>
        <select 
          value={propValue}
          onChange={(e) => {
            onConfigUpdate(nodeId, propKey, e.target.value);
            
            // Re-render component to update the class list based on the selected model
            // This is a hack, but it works for immediate updates
            setTimeout(() => {
              const element = document.getElementById(`node-config-${nodeId}`);
              if (element) {
                const event = new Event('change', { bubbles: true });
                element.dispatchEvent(event);
              }
            }, 50);
          }}
        >
          {availableModels.length > 0 && availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name || model.id.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="model-count">{availableModels.length} models available</div>
      </div>
    );
  }
  
  // Special handling for model-specific classes
  if (propKey === 'classes' && componentType && (
      componentType === 'object_detector' || 
      componentType === 'image_classifier')) {
    
    // State to track available classes and current model
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [currentModel, setCurrentModel] = useState<string>("");
    const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);
    
    // Use state to track selected classes
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    
    // Effect to load available classes for the current model
    useEffect(() => {
      const loadClassData = () => {
        setIsLoadingClasses(true);
        
        // Check if this component has model_classes property (first in config then globally)
        const nodeConfig = document.getElementById(`node-config-${nodeId}`);
        let modelClassesMap: Record<string, string[]> = {};
        let model = "";
        
        if (nodeConfig) {
          const configData = (nodeConfig as any).dataset?.config;
          if (configData) {
            try {
              const config = JSON.parse(configData);
              
              if (config.model && typeof config.model === 'string') {
                model = config.model;
              }
              
              if (config.model_classes) {
                // Handle both object and stringified JSON
                if (typeof config.model_classes === 'string') {
                  try {
                    modelClassesMap = JSON.parse(config.model_classes);
                  } catch (e) {
                    console.error("Failed to parse model_classes string:", e);
                  }
                } else if (typeof config.model_classes === 'object') {
                  modelClassesMap = config.model_classes;
                }
              }
            } catch (e) {
              console.error("Failed to parse config data:", e);
            }
          }
        }
        
        // If no model_classes found in node config, try getting from window.__COMPONENT_DEFS__
        if (Object.keys(modelClassesMap).length === 0) {
          const componentDef = window.__COMPONENT_DEFS__?.find(c => c.id === componentType);
          if (componentDef && componentDef.model_classes) {
            modelClassesMap = componentDef.model_classes;
          }
        }
        
        // Get classes for the current model
        let classes: string[] = [];
        
        // If we have a model and that model exists in the map, use its classes
        if (model && modelClassesMap[model]) {
          classes = modelClassesMap[model];
        } 
        // Otherwise if we have any model with classes, use the first one
        else if (Object.keys(modelClassesMap).length > 0) {
          const firstModel = Object.keys(modelClassesMap)[0];
          model = firstModel;
          classes = modelClassesMap[firstModel];
        }
                
        // Update state with found data
        setCurrentModel(model);
        setAvailableClasses(classes || []);
        setIsLoadingClasses(false);
      };
      
      // Load class data initially
      loadClassData();
      
      // Set up an observer to detect when the config data might change
      const observer = new MutationObserver(loadClassData);
      const nodeConfig = document.getElementById(`node-config-${nodeId}`);
      if (nodeConfig) {
        observer.observe(nodeConfig, { attributes: true, attributeFilter: ['data-config'] });
      }
      
      return () => observer.disconnect();
    }, [nodeId, componentType]);
    
    // Initialize selected classes when component mounts or when availableClasses changes
    useEffect(() => {
      // Support both string JSON and array for propValue
      let initialSelectedClasses: string[] = [];
      if (typeof propValue === 'string') {
        try {
          // Try to parse if it's a JSON string
          if (propValue.trim().startsWith('[')) {
            initialSelectedClasses = JSON.parse(propValue);
          } else {
            // Single class as string
            initialSelectedClasses = [propValue];
          }
        } catch (e) {
          console.error("Error parsing class selection:", e);
          initialSelectedClasses = [];
        }
      } else if (Array.isArray(propValue)) {
        initialSelectedClasses = propValue;
      }
      
      // Filter selected classes to only include those available in the current model
      const validClasses = initialSelectedClasses.filter(cls => 
        availableClasses.includes(cls)
      );
      
      // Update selected classes state
      setSelectedClasses(validClasses);
    }, [JSON.stringify(availableClasses), propValue]);
    
    // Show loading state
    if (isLoadingClasses) {
      return (
        <div className="config-item classes-selection">
          <label>{formatPropName(propKey)}:</label>
          <div className="loading-classes">Loading available classes...</div>
        </div>
      );
    }
    
    // No model selected
    if (!currentModel) {
      return (
        <div className="config-item classes-selection">
          <label>{formatPropName(propKey)}:</label>
          <div className="no-model-selected">
            Please select a model first to see available classes.
          </div>
        </div>
      );
    }
    
    // No classes available for this model
    if (availableClasses.length === 0) {
      return (
        <div className="config-item">
          <label>{formatPropName(propKey)}:</label>
          <div className="classes-empty">
            No classes available for model "{currentModel}"
          </div>
        </div>
      );
    }
    
    // Update handler - this will be called when checkboxes are toggled
    const handleClassToggle = (className: string) => {
      const newSelectedClasses = [...selectedClasses];
      if (newSelectedClasses.includes(className)) {
        // Remove class
        const index = newSelectedClasses.indexOf(className);
        newSelectedClasses.splice(index, 1);
      } else {
        // Add class
        newSelectedClasses.push(className);
      }
      
      // Sort classes alphabetically for better organization
      newSelectedClasses.sort();
      
      // Update state and notify parent
      setSelectedClasses(newSelectedClasses);
      onConfigUpdate(nodeId, propKey, newSelectedClasses);
    };
    
    // Select/deselect all handler
    const handleSelectAll = (selectAll: boolean) => {
      if (selectAll) {
        const sortedClasses = [...availableClasses].sort();
        setSelectedClasses(sortedClasses);
        onConfigUpdate(nodeId, propKey, sortedClasses);
      } else {
        setSelectedClasses([]);
        onConfigUpdate(nodeId, propKey, []);
      }
    };
    
    return (
      <div className="config-item classes-selection">
        <label>{formatPropName(propKey)}:</label>
        <div className="model-info">Current model: <strong>{currentModel || "None"}</strong></div>
        <div className="classes-controls">
          <button 
            className="select-all-btn" 
            onClick={() => handleSelectAll(true)}
            disabled={selectedClasses.length === availableClasses.length}
          >
            Select All
          </button>
          <button 
            className="deselect-all-btn" 
            onClick={() => handleSelectAll(false)}
            disabled={selectedClasses.length === 0}
          >
            Deselect All
          </button>
        </div>
        <div className="classes-list">
          {availableClasses.sort().map((className) => (
            <div key={className} className="class-item">
              <input
                type="checkbox"
                id={`class-${nodeId}-${className}`}
                checked={selectedClasses.includes(className)}
                onChange={() => handleClassToggle(className)}
              />
              <label htmlFor={`class-${nodeId}-${className}`}>{className}</label>
            </div>
          ))}
        </div>
        <div className="selected-count">
          {selectedClasses.length} of {availableClasses.length} classes selected
        </div>
      </div>
    );
  }
  
  // Special handling for classes in alarm components
  if (propKey === 'allowed_classes' && componentType === 'event_alarm') {
    // State to track available classes and allowed classes
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [isConnectedToDetector, setIsConnectedToDetector] = useState<boolean>(false);
    const [isLoadingDetectorClasses, setIsLoadingDetectorClasses] = useState<boolean>(true);
    
    // Function to load detector classes
    const loadClassData = useCallback(() => {
      setIsLoadingDetectorClasses(true);
      
      // Check if this alarm node is connected to any detectors (directly or indirectly)
      const pipelineData = (window as any).__PIPELINE_DATA__;
      let detectorClasses: string[] = [];
      let detectorFound = false;
      
      if (pipelineData && pipelineData.nodes) {
        const alarmNode = pipelineData.nodes.find((n: any) => n.id === nodeId);
        if (!alarmNode) {
          setIsConnectedToDetector(false);
          setIsLoadingDetectorClasses(false);
          return;
        }
        
        // Find all nodes that connect to this alarm node
        const findConnectedDetectors = (targetId: string, visited = new Set<string>()): boolean => {
          if (visited.has(targetId)) return false;
          visited.add(targetId);
          
          // Check each node in the pipeline
          for (const node of pipelineData.nodes) {
            // If this node connects to our target
            if (node.connections && node.connections.includes(targetId)) {
              // Check if it's a detector
              const isDetector = node.componentId && 
                (node.componentId.includes('detector') || node.componentId === 'object_detector');
              
              if (isDetector) {
                // Found a detector directly connected to our alarm
                if (node.config && node.config.classes && Array.isArray(node.config.classes)) {
                  detectorClasses = [...detectorClasses, ...node.config.classes];
                }
                detectorFound = true;
                return true;
              }
              
              // If not a detector, check if it's connected to a detector (recursive)
              if (findConnectedDetectors(node.id, visited)) {
                detectorFound = true;
                return true;
              }
            }
          }
          
          return false;
        };
        
        // Start the search from the alarm node
        findConnectedDetectors(nodeId);
        
        // If we didn't find detector connections, check through DOM scanning
        if (!detectorFound) {
          // Scan node configs for detector classes
          document.querySelectorAll('[id^="node-config-"]').forEach((el: any) => {
            if (!el || !el.getAttribute) return;
            
            try {
              const configData = el.getAttribute('data-config');
              if (configData) {
                const config = JSON.parse(configData);
                const nodeIdParts = el.id.split('node-config-');
                const configNodeId = nodeIdParts.length > 1 ? nodeIdParts[1] : '';
                
                if (configNodeId) {
                  const nodeElement = document.querySelector(`[data-node-id="${configNodeId}"]`);
                  const componentId = nodeElement?.getAttribute('data-component-id');
                  
                  if (componentId && (componentId.includes('detector') || componentId === 'object_detector') &&
                      config.classes && Array.isArray(config.classes) && config.classes.length > 0) {
                    
                    // Now check if this detector is connected to our alarm
                    const detector = pipelineData.nodes.find((n: any) => n.id === configNodeId);
                    if (detector && detector.connections) {
                      let isConnectedToAlarm = false;
                      
                      // Direct connection check
                      if (detector.connections.includes(nodeId)) {
                        isConnectedToAlarm = true;
                      }
                      
                      // Indirect connection check through a simple traversal
                      const checkConnection = (sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
                        if (visited.has(sourceId)) return false;
                        visited.add(sourceId);
                        
                        const node = pipelineData.nodes.find((n: any) => n.id === sourceId);
                        if (!node || !node.connections) return false;
                        
                        if (node.connections.includes(targetId)) return true;
                        
                        for (const connId of node.connections) {
                          if (checkConnection(connId, targetId, visited)) return true;
                        }
                        
                        return false;
                      };
                      
                      if (!isConnectedToAlarm) {
                        for (const connId of detector.connections) {
                          if (checkConnection(connId, nodeId)) {
                            isConnectedToAlarm = true;
                            break;
                          }
                        }
                      }
                      
                      if (isConnectedToAlarm) {
                        detectorClasses = [...detectorClasses, ...config.classes];
                        detectorFound = true;
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error parsing node config:", error);
            }
          });
        }
      }
      
      // Update state based on detector connections status
      setIsConnectedToDetector(detectorFound);
      
      // Remove duplicates
      detectorClasses = Array.from(new Set(detectorClasses));
      
      // Set available classes from detector
      setAvailableClasses(detectorFound ? detectorClasses : []);
      setIsLoadingDetectorClasses(false);
    }, [nodeId]);
    
    // Effect to set up listeners and load initial data
    useEffect(() => {
      // Load classes immediately
      loadClassData();
      
      // Set up mutation observer for DOM changes
      const observer = new MutationObserver(() => {
        loadClassData();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-config', 'data-component-id', 'data-connection']
      });
      
      // Set up listeners for custom events
      const handlePipelineDataUpdate = () => loadClassData();
      const handleDetectorClassesUpdate = (event: any) => {
        if (event.detail && event.detail.classes && 
            Array.isArray(event.detail.classes) && event.detail.classes.length > 0) {
          setAvailableClasses(Array.from(new Set(event.detail.classes)));
          setIsConnectedToDetector(true);
          setIsLoadingDetectorClasses(false);
        }
      };
      
      document.addEventListener('pipeline-data-updated', handlePipelineDataUpdate);
      document.addEventListener('detector-classes-updated', handleDetectorClassesUpdate);
      
      // Clean up
      return () => {
        observer.disconnect();
        document.removeEventListener('pipeline-data-updated', handlePipelineDataUpdate);
        document.removeEventListener('detector-classes-updated', handleDetectorClassesUpdate);
      };
    }, [loadClassData]);
    
    // Effect to initialize selected classes
    useEffect(() => {
      // Support both string JSON and array for propValue
      let initialSelectedClasses: string[] = [];
      
      if (typeof propValue === 'string') {
        try {
          // Try to parse if it's a JSON string
          if (propValue.trim().startsWith('[')) {
            initialSelectedClasses = JSON.parse(propValue);
          } else if (propValue) {
            // Single class as string
            initialSelectedClasses = [propValue];
          }
        } catch (e) {
          console.error("Error parsing class selection for alarm:", e);
          initialSelectedClasses = [];
        }
      } else if (Array.isArray(propValue)) {
        initialSelectedClasses = propValue;
      }
      
      // If no classes are selected but we have available classes, don't automatically select them all
      // The user needs to specifically choose which classes to use for alarms
      
      // Filter selected classes to only include those available
      const validClasses = initialSelectedClasses.filter(cls => 
        availableClasses.includes(cls)
      );
      
      // Update selected classes state
      setSelectedClasses(validClasses);
    }, [JSON.stringify(availableClasses), propValue, nodeId, propKey, onConfigUpdate, isConnectedToDetector]);
    
    // Loading state
    if (isLoadingDetectorClasses) {
      return (
        <div className="config-item">
          <label>Allowed Classes:</label>
          <div className="loading-detector-classes">
            Checking for connected detectors...
          </div>
        </div>
      );
    }
    
    // No detector connected yet - show message
    if (!isConnectedToDetector) {
      return (
        <div className="config-item">
          <label>Allowed Classes:</label>
          <div className="classes-empty message-connect-detector">
            <p>This alarm component needs to be connected to an object detector.</p>
            <ol>
              <li>Add an object detector to the pipeline</li>
              <li>Connect the detector to this alarm (directly or through other components)</li>
              <li>Select classes in the detector's properties</li>
            </ol>
            <div className="connect-tip">Object classes will appear here after connection.</div>
          </div>
        </div>
      );
    }
    
    // No detector with classes connected
    if (availableClasses.length === 0) {
      return (
        <div className="config-item">
          <label>Allowed Classes:</label>
          <div className="classes-empty">
            No classes available for filtering. Make sure you have:
            <ol>
              <li>Added an object detector to the pipeline</li>
              <li>Selected classes in the detector's properties</li>
              <li>Connected the detector to this alarm component (directly or through other components)</li>
            </ol>
          </div>
        </div>
      );
    }
    
    // Update handler - this will be called when checkboxes are toggled
    const handleClassToggle = (className: string) => {
      const newSelectedClasses = [...selectedClasses];
      if (newSelectedClasses.includes(className)) {
        // Remove class
        const index = newSelectedClasses.indexOf(className);
        newSelectedClasses.splice(index, 1);
      } else {
        // Add class
        newSelectedClasses.push(className);
      }
      
      // Sort classes alphabetically for better organization
      newSelectedClasses.sort();
      
      // Update state and notify parent
      setSelectedClasses(newSelectedClasses);
      onConfigUpdate(nodeId, propKey, newSelectedClasses);
    };
    
    // Select/deselect all handler
    const handleSelectAll = (selectAll: boolean) => {
      if (selectAll) {
        const sortedClasses = [...availableClasses].sort();
        setSelectedClasses(sortedClasses);
        onConfigUpdate(nodeId, propKey, sortedClasses);
      } else {
        setSelectedClasses([]);
        onConfigUpdate(nodeId, propKey, []);
      }
    };
    
    return (
      <div className="config-item classes-selection">
        <label>Allowed Classes:</label>
        <div className="classes-desc">
          Select which object classes should trigger alarms. Only detections or events for these classes will create alerts.
        </div>
        <div className="classes-controls">
          <button 
            className="select-all-btn" 
            onClick={() => handleSelectAll(true)}
            disabled={selectedClasses.length === availableClasses.length}
          >
            Select All
          </button>
          <button 
            className="deselect-all-btn" 
            onClick={() => handleSelectAll(false)}
            disabled={selectedClasses.length === 0}
          >
            Deselect All
          </button>
        </div>
        <div className="classes-list">
          {availableClasses.sort().map((className) => (
            <div key={className} className="class-item">
              <input
                type="checkbox"
                id={`alarm-class-${nodeId}-${className}`}
                checked={selectedClasses.includes(className)}
                onChange={() => handleClassToggle(className)}
              />
              <label htmlFor={`alarm-class-${nodeId}-${className}`}>{className}</label>
            </div>
          ))}
        </div>
        <div className="selected-count">
          {selectedClasses.length} of {availableClasses.length} classes selected for alerting
        </div>
      </div>
    );
  }
  
  // Determine property type
  if (Array.isArray(propValue)) {
    // Special handling for text_color - RGB array
    if (propKey === 'text_color' && propValue.length === 3) {
      return (
        <div className="config-item">
          <label>{formatPropName(propKey)}:</label>
          <ColorPickerControl 
            value={propValue as number[]} 
            onChange={(newColor) => onConfigUpdate(nodeId, propKey, newColor)}
          />
        </div>
      );
    }
    
    // Position arrays (x,y coordinates)
    if ((propKey === 'title_position' || propKey === 'timestamp_position') && propValue.length === 2) {
      return (
        <div className="config-item position-item">
          <label>{formatPropName(propKey)}:</label>
          <div className="position-inputs">
            <div>
              <label className="position-label">X:</label>
              <input 
                type="number" 
                min="0" 
                max="1920" 
                value={propValue[0]}
                onChange={(e) => {
                  const newValue = [...propValue];
                  newValue[0] = parseInt(e.target.value);
                  onConfigUpdate(nodeId, propKey, newValue);
                }}
                style={{ width: '60px', marginRight: '10px' }}
              />
            </div>
            <div>
              <label className="position-label">Y:</label>
              <input 
                type="number" 
                min="0" 
                max="1080" 
                value={propValue[1]}
                onChange={(e) => {
                  const newValue = [...propValue];
                  newValue[1] = parseInt(e.target.value);
                  onConfigUpdate(nodeId, propKey, newValue);
                }}
                style={{ width: '60px' }}
              />
            </div>
          </div>
        </div>
      );
    }
    
    // Standard array display for other arrays
    return (
      <div className="config-item">
        <label>{formatPropName(propKey)}:</label>
        <div className="array-config">
          {propValue.map((item, idx) => (
            <div key={idx} className="array-item">
              {item.toString()}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Handle boolean values as toggles
  if (typeof propValue === 'boolean') {
    return (
      <div className="config-item">
        <label>{formatPropName(propKey)}:</label>
        <input 
          type="checkbox" 
          checked={propValue}
          onChange={(e) => onConfigUpdate(nodeId, propKey, e.target.checked)}
        />
      </div>
    );
  }
  
  // Handle number values with appropriate ranges
  if (typeof propValue === 'number') {
    // Determine appropriate min, max, and step based on property key
    let min = "0";
    let max = "1";
    let step = "0.1";
    
    if (propKey === 'label_font_scale') {
      min = "0.1";
      max = "2";
      step = "0.1";
    } else if (propKey === 'min_confidence') {
      min = "0.1";
      max = "1.0";
      step = "0.05";
    } else if (propKey === 'trigger_delay' || propKey === 'cool_down_period') {
      min = "0";
      max = "300";
      step = "1";
    } else if (propKey === 'retention_days') {
      min = "1";
      max = "365";
      step = "1";
    } else if (propKey === 'max_events_per_day') {
      min = "1";
      max = "10000";
      step = "100";
    }
    
    return (
      <div className="config-item">
        <label>{formatPropName(propKey)}:</label>
        <input 
          type="range" 
          min={min}
          max={max}
          step={step}
          value={propValue}
          onChange={(e) => onConfigUpdate(nodeId, propKey, parseFloat(e.target.value))}
        />
        <span>{propValue.toFixed(step === "0.1" || step === "0.05" ? 1 : 0)}</span>
      </div>
    );
  }
  
  // Handle string values - select for enum-like properties, text input for others
  if (typeof propValue === 'string') {
    // Special case for log_level - use a select
    if (propKey === 'log_level') {
      return (
        <div className="config-item">
          <label>{formatPropName(propKey)}:</label>
          <select 
            value={propValue}
            onChange={(e) => onConfigUpdate(nodeId, propKey, e.target.value)}
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      );
    }
    
    // Default text input for other strings
    return (
      <div className="config-item">
        <label>{formatPropName(propKey)}:</label>
        <input
          type="text"
          value={propValue}
          onChange={(e) => onConfigUpdate(nodeId, propKey, e.target.value)}
        />
      </div>
    );
  }
  
  // Default fallback for any other types
  return (
    <div className="config-item">
      <label>{formatPropName(propKey)}:</label>
      <span>{JSON.stringify(propValue)}</span>
    </div>
  );
};

// Helper function to group properties
const groupNodeProperties = (config: Record<string, any>): { [category: string]: [string, any][] } => {
  const displayProperties = ['show_labels', 'show_bounding_boxes', 'show_tracks', 'show_title', 'show_timestamp', 'show_performance_metrics'];
  const styleProperties = ['label_font_scale', 'text_color'];
  const positionProperties = ['title_position', 'timestamp_position'];
  const alarmProperties = ['min_confidence', 'trigger_delay', 'cool_down_period', 'notify_on_alarm', 'allowed_classes'];
  const loggerProperties = ['log_level', 'include_images', 'retention_days', 'max_events_per_day'];
  const modelProperties = ['model', 'classes', 'confidence'];
  
  // Properties that should be hidden from the UI
  const hiddenProperties = [
    'all_classes', 
    'available_models', 
    'model_classes',
    '_internal',
    '_metadata'
  ];
  
  const groups: { [category: string]: [string, any][] } = {
    'Model Settings': [],
    'Display Options': [],
    'Style Settings': [],
    'Position Settings': [],
    'Alarm Settings': [],
    'Logger Settings': [],
    'Other Settings': []
  };
  
  Object.entries(config).forEach(([key, value]) => {
    // Skip hidden properties
    if (hiddenProperties.includes(key) || key.startsWith('_')) {
      return;
    }
    
    if (modelProperties.includes(key)) {
      groups['Model Settings'].push([key, value]);
    } else if (displayProperties.includes(key)) {
      groups['Display Options'].push([key, value]);
    } else if (styleProperties.includes(key)) {
      groups['Style Settings'].push([key, value]);
    } else if (positionProperties.includes(key)) {
      groups['Position Settings'].push([key, value]);
    } else if (alarmProperties.includes(key)) {
      groups['Alarm Settings'].push([key, value]);
    } else if (loggerProperties.includes(key)) {
      groups['Logger Settings'].push([key, value]);
    } else {
      groups['Other Settings'].push([key, value]);
    }
  });
  
  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
};

// Flash message component
interface FlashMessageProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const FlashMessage: React.FC<FlashMessageProps> = ({ message, type, onClose }) => {
  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`flash-message ${type}`}>
      <span>{message}</span>
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  );
};

// Confirmation Dialog component
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <h3 className="confirmation-title">{title}</h3>
        <p className="confirmation-message">{message}</p>
        <div className="confirmation-buttons">
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Debounce hooks to prevent accidental double-clicks
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  
  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsDebouncing(true);
    
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
      setIsDebouncing(false);
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { debouncedCallback, isDebouncing };
};

// Add this helper function before the VisionPipelineBuilder component
const getConnectionPointPosition = (nodeElement: HTMLElement, isInput: boolean): { x: number, y: number } | null => {
  const connectionPoint = nodeElement.querySelector(isInput ? '.input-point' : '.output-point');
  if (!connectionPoint) return null;

  const rect = connectionPoint.getBoundingClientRect();
  const nodeRect = nodeElement.getBoundingClientRect();
  
  // Get the center of the connection point relative to the node
  return {
    x: isInput ? 0 : nodeRect.width,  // Input point is at left edge (0), output is at right edge
    y: (rect.top - nodeRect.top) + (rect.height / 2)  // Get exact vertical center of the connection point relative to node
  };
};

// Add the Promise to the return type of the function component
const VisionPipelineBuilder: React.FunctionComponent<VisionPipelineBuilderProps> = ({
  streamId, 
  streamName, 
  streamSource, 
  streamType, 
  streamStatus, 
  streamResolution, 
  streamFps, 
  onSave, 
  onStartStream, 
  onStopStream, 
  onDeleteStream, 
  actionLoading, 
  availableComponents, 
  initialPipeline, 
  renderCameraFeedPreview 
}) => {
  const [pipeline, setPipeline] = useState<Pipeline>(() => {
    // If initialPipeline is provided, use it
    if (initialPipeline) {
      return {
        ...initialPipeline,  // This preserves the original ID and other properties
        nodes: [...initialPipeline.nodes]  // Create a new array of nodes to avoid reference issues
      };
    }
    
    // Otherwise create a new pipeline with a pre-populated source component
    const sourceNode: PipelineNode = {
      id: `camera_feed_${Date.now()}`,
      componentId: 'camera_feed',
      position: { x: 50, y: 50 }, // Position near top-left
      connections: [],
      config: {
        hw_acceleration: false // Disable hardware acceleration by default
      },
      sourceDetails: {
        name: streamName,
        source: streamSource,
        type: streamType
      }
    };

    return {
      id: `pipeline_${Date.now()}`,
      name: `${streamName || 'New'} Vision Pipeline`,
      nodes: [sourceNode],
    };
  });
  
  const [activeComponent, setActiveComponent] = useState<VisionComponent | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showComponentList, setShowComponentList] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('source');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{nodeId: string, x: number, y: number} | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{x: number, y: number} | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['source']);
  const [possibleConnectionTargets, setPossibleConnectionTargets] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMessage, setFlashMessage] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeletePipelineConfirmation, setShowDeletePipelineConfirmation] = useState(false);
  
  // Add state for LineZoneConfigModal
  const [isLineZoneModalOpen, setIsLineZoneModalOpen] = useState(false);
  const [currentLineZoneNode, setCurrentLineZoneNode] = useState<PipelineNode | null>(null);
  const [cameraFeedNode, setCameraFeedNode] = useState<PipelineNode | null>(null);
  
  // Add state for pipeline processing status
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [processingMessage, setProcessingMessage] = useState<string>('');
  
  // Add state for loading models from API
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  
  const builderRef = useRef<HTMLDivElement>(null);

  // At the top of the component, after state declarations, add a ref to track deleted pipeline IDs
  const deletedPipelineIds = useRef<Set<string>>(new Set());

  // Fetch models data from API when component mounts
  useEffect(() => {
    const fetchModelsData = async (): Promise<void> => {
      try {
        setLoadingModels(true);
        
        const modelsData = await getVisionModels();
        
        // Only continue if we got valid model data
        if (!modelsData) {
          console.warn("No models data received from API");
          setLoadingModels(false);
          return;
        }

        // Update global component definitions with model data
        if (window.__COMPONENT_DEFS__ && Array.isArray(window.__COMPONENT_DEFS__)) {
          const updatedDefs = [...window.__COMPONENT_DEFS__];
          
          // Process object detection models
          if (modelsData.model_classes) {
            // Map components to appropriate model data
            updatedDefs.forEach(comp => {
              // Object detector components
              if (comp.id === 'object_detector') {
                comp.model_classes = modelsData.model_classes;
                
                // Create models list for dropdown
                comp.available_models = Object.keys(modelsData.model_classes).map(id => ({
                  id,
                  name: id.toUpperCase()
                }));
              }
              
              // Face detector components
              else if (comp.id === 'face_detector') {
                // For face detectors, we can use available models but without class labels
                if (modelsData.model_types && modelsData.model_types.face_detection) {
                  comp.available_models = modelsData.model_types.face_detection;
                }
              }
              
              // Image classifier components
              else if (comp.id === 'image_classifier') {
                // For classifiers, use available models and their classes
                if (modelsData.model_types && modelsData.model_types.image_classification) {
                  comp.available_models = modelsData.model_types.image_classification;
                  
                  // If model_classes has entries for these models, add them
                  if (modelsData.model_classes) {
                    comp.model_classes = {};
                    
                    // Filter model_classes to only include classification models
                    Object.keys(modelsData.model_classes).forEach(modelId => {
                      const isClassificationModel = modelsData.model_types.image_classification.some(
                        (m: any) => m.id === modelId
                      );
                      
                      if (isClassificationModel) {
                        comp.model_classes![modelId] = modelsData.model_classes[modelId];
                      }
                    });
                    
                  }
                }
              }
            });
            
            window.__COMPONENT_DEFS__ = updatedDefs;
            
            // Trigger a change event to refresh any components that might be listening
            const event = new CustomEvent('models-updated', { 
              detail: { modelsData } 
            });
            document.dispatchEvent(event);
          }
        }
        
        setLoadingModels(false);
      } catch (error) {
        console.error("Error fetching models data:", error);
        setLoadingModels(false);
      }
    };
    
    fetchModelsData();
  }, []);

  // Modify the componentsList definition to ensure there's a source component
  const componentsList: VisionComponent[] = useMemo(() => {
    // Get API components or use the built-in ones
    const components: VisionComponent[] = availableComponents 
      ? availableComponents.map(comp => normalizeComponent(comp as any))
      : [];
    
    // Check if we have any source component
    const hasSourceComponent = components.some(comp => comp.category === 'source');
    
    // If no source component, add a camera feed component based on stream details
    if (!hasSourceComponent) {
      components.push({
        id: 'camera_feed',
        type: 'source',
        name: 'Camera Feed',
        category: 'source',
        description: `Stream source: ${streamSource}`,
        inputs: [],
        outputs: ['image'],
        requiresParent: [],
        config: {}
      });
    }
    
    // Ensure detector components have model_classes
    components.forEach(component => {
      if (component.category === 'detector' && (!component.model_classes || Object.keys(component.model_classes || {}).length === 0)) {
        
        // Look for model classes from window.__COMPONENT_DEFS__ first
        const globalDef = window.__COMPONENT_DEFS__?.find(def => def.id === component.id);
        if (globalDef && globalDef.model_classes) {
          component.model_classes = globalDef.model_classes;
        }
        // No hardcoded defaults - if no model classes are available, leave empty
      }
      
      if (component.model_classes) {
      } else {
      }
    });
    
    // Make component definitions available globally for other components to access
    (window as any).__COMPONENT_DEFS__ = components;
    
    return components;
  }, [availableComponents, streamSource]);

  // Store pipeline data in window object for component access and
  // trigger immediate events when pipeline changes
  useEffect(() => {
    // Make pipeline data accessible to components via window
    (window as any).__PIPELINE_DATA__ = pipeline;
    
    // Trigger immediate class updates by dispatching custom event
    const event = new CustomEvent('pipeline-data-updated', { 
      detail: { pipeline }
    });
    document.dispatchEvent(event);
    
    // If this is a pipeline initialization with pre-populated detectors, 
    // trigger immediate detector class events for any alarm components
    const detectorNodes = pipeline.nodes.filter(node => {
      const component = componentsList.find(c => c.id === node.componentId);
      return component?.category === 'detector' && 
             node.config?.classes && 
             Array.isArray(node.config.classes) &&
             node.config.classes.length > 0;
    });
    
    if (detectorNodes.length > 0) {
      // Combine all detected classes
      let allClasses: string[] = [];
      detectorNodes.forEach(node => {
        if (node.config?.classes) {
          allClasses = [...allClasses, ...node.config.classes];
        }
      });
      
      // Remove duplicates
      const uniqueClasses = Array.from(new Set(allClasses));
      
      if (uniqueClasses.length > 0) {
        // Trigger detector class update event
        const classEvent = new CustomEvent('detector-classes-updated', {
          detail: { classes: uniqueClasses }
        });
        setTimeout(() => {
          document.dispatchEvent(classEvent);
        }, 50);
      }
    }
  }, [pipeline, componentsList]);

  // Update available categories based on the pipeline state
  useEffect(() => {
    let newCategories = ['source', 'sink'];  // Make sink always available
    
    // Check if a source node exists
    const hasSource = pipeline.nodes.some(node => {
      const component = componentsList.find(c => c.id === node.componentId);
      return component?.category === 'source';
    });
    
    if (hasSource) {
      newCategories.push('detector');
    }
    
    // Check if a detector node exists
    const hasDetector = pipeline.nodes.some(node => {
      const component = componentsList.find(c => c.id === node.componentId);
      return component?.category === 'detector';
    });
    
    if (hasDetector) {
      newCategories.push('tracker', 'classifier');
    }
    
    // Rule 4: Geometry is only enabled after a tracker has been added
    const hasTracker = pipeline.nodes.some(node => {
      const component = componentsList.find(c => c.id === node.componentId);
      return component?.category === 'tracker';
    });
    
    if (hasTracker) {
      newCategories.push('geometry');
    }
    
    // Only set state if categories have actually changed
    if (!arraysEqual(availableCategories, newCategories)) {
      setAvailableCategories(newCategories);
    }
    
    // Helper function to compare arrays
    function arraysEqual(a: string[], b: string[]) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
  }, [pipeline.nodes, componentsList, availableCategories]);

  // Separate effect to update selected category when available categories change
  useEffect(() => {
    // If the currently selected category is no longer available, switch to the first available
    if (!availableCategories.includes(selectedCategory)) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  // Filter components based on selected category
  const filteredComponents = componentsList.filter(
    component => component.category === selectedCategory
  );

  // Get all component categories
  const componentCategories = Array.from(
    new Set(componentsList.map(comp => comp.category))
  ).filter(category => availableCategories.includes(category));

  // Check if adding a component is allowed
  const canAddComponent = (component: VisionComponent): boolean => {
    // For source components, only allow one
    if (component.category === 'source') {
      return !pipeline.nodes.some(node => {
        const nodeComponent = componentsList.find(c => c.id === node.componentId);
        return nodeComponent?.category === 'source';
      });
    }

    // For tracker components, only allow one
    if (component.category === 'tracker') {
      return !pipeline.nodes.some(node => {
        const nodeComponent = componentsList.find(c => c.id === node.componentId);
        return nodeComponent?.category === 'tracker';
      });
    }

    // If the component requires a parent, check if a compatible parent exists
    if (component.requiresParent && component.requiresParent.length > 0) {
      return pipeline.nodes.some(node => {
        const nodeComponent = componentsList.find(c => c.id === node.componentId);
        return nodeComponent && component.requiresParent?.includes(nodeComponent.id);
      });
    }

    // Check if component type already exists in pipeline
    const componentExists = pipeline.nodes.some(node => node.componentId === component.id);
    if (componentExists) {
      return false;
    }
    
    return true;
  };

  // Handle starting to drag a component from the palette
  const handleDragStart = (component: VisionComponent, e: React.MouseEvent) => {
    if (!canAddComponent(component)) {
      return; // Don't allow dragging if the component can't be added
    }
    
    setActiveComponent(component);
    setSelectedComponent(component.id);
    
    if (builderRef.current) {
      const rect = builderRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Handle starting to drag an existing node
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
    
    const node = pipeline.nodes.find(n => n.id === nodeId);
    if (node && builderRef.current) {
      const rect = builderRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - node.position.x,
        y: e.clientY - rect.top - node.position.y
      });
    }
  };

  // Handle drag over the canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop on the canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!builderRef.current || !activeComponent) return;
    
    const rect = builderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add new component to pipeline
    const newNode: PipelineNode = {
      id: `${activeComponent.id}_${Date.now()}`,
      componentId: activeComponent.id,
      position: { x: x - dragOffset.x, y: y - dragOffset.y },
      connections: [],
      config: activeComponent.config ? { ...activeComponent.config } : {}
    };
    
    // If it's a source component, add stream details and ensure hardware acceleration is disabled
    if (activeComponent.category === 'source') {
      newNode.sourceDetails = {
        name: streamName,
        source: streamSource,
        type: streamType
      };
      
      // Make sure hw_acceleration is false by default
      if (!newNode.config) newNode.config = {};
      newNode.config.hw_acceleration = false;
    }
    
    // If it's an event_alarm component, initialize with just "person" as default
    if (activeComponent.id === 'event_alarm') {
      if (!newNode.config) {
        newNode.config = {};
      }
      // Always initialize with "person" by default - we'll update when connected
      newNode.config.allowed_classes = ["person"];
    }
    
    setPipeline(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    
    setActiveComponent(null);
    setSelectedComponent(null);
  };

  // Handle mouse move for dragging nodes and drawing connections
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!builderRef.current) return;
    
    const rect = builderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle node dragging
    if (draggingNode) {
      setPipeline(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === draggingNode 
            ? { 
                ...node, 
                position: { 
                  x: x - dragOffset.x, 
                  y: y - dragOffset.y 
                } 
              } 
            : node
        )
      }));
    }
    
    // Handle connection drawing
    if (isDrawingConnection && connectionStart) {
      setConnectionEnd({ x, y });
    }
  };

  // Function to check if a connection is valid
  const isValidConnection = (sourceComponent: any, targetComponent: any) => {
    // Rule 1: Camera MUST connect to detector ONLY
    if (sourceComponent.category === 'source') {
      return targetComponent.category === 'detector';
    }
    
    // Rule 2: Object detector can connect to tracker, classifier or sink
    if (sourceComponent.category === 'detector') {
      return ['tracker', 'classifier', 'sink'].includes(targetComponent.category);
    }
    
    // Rule 3: Object tracker can ONLY be connected from a detector (enforced above)
    // and can connect to geometry and sinks
    if (sourceComponent.category === 'tracker') {
      return ['geometry', 'sink'].includes(targetComponent.category);
    }
    
    // Geometry can connect to sinks
    if (sourceComponent.category === 'geometry') {
      return targetComponent.category === 'sink';
    }
    
    // Classifiers can connect to sinks
    if (sourceComponent.category === 'classifier') {
      return targetComponent.category === 'sink';
    }
    
    // Allow sinks to connect to other sinks
    if (sourceComponent.category === 'sink') {
      return targetComponent.category === 'sink';
    }
    
    // By default, connections are not allowed
    return false;
  };

  // Get possible targets for a connection from a node
  const getPossibleConnectionTargets = (nodeId: string): string[] => {
    const sourceNode = pipeline.nodes.find(n => n.id === nodeId);
    if (!sourceNode) return [];
    
    // Rule 5: Each node can only make one connection
    // If the node already has a connection, no further connections are allowed
    if (sourceNode.connections && sourceNode.connections.length > 0) {
      return [];
    }
    
    const sourceComponent = componentsList.find(c => c.id === sourceNode.componentId);
    if (!sourceComponent) return [];
    
    return pipeline.nodes
      .filter(node => {
        if (node.id === nodeId) return false; // Can't connect to self
        
        const targetComponent = componentsList.find(c => c.id === node.componentId);
        if (!targetComponent) return false;
        
        return isValidConnection(sourceComponent, targetComponent);
      })
      .map(node => node.id);
  };

  // Handle selecting a node
  const handleNodeSelect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
  };

  // Handle mouse up for dropping components and nodes
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!builderRef.current) return;
    
    const rect = builderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add new component to pipeline
    if (activeComponent) {
      const newNode: PipelineNode = {
        id: `${activeComponent.id}_${Date.now()}`,
        componentId: activeComponent.id,
        position: { x: x - dragOffset.x, y: y - dragOffset.y },
        connections: [],
        config: activeComponent.config ? { ...activeComponent.config } : {}
      };
      
      // If it's a source component, add stream details and ensure hardware acceleration is disabled
      if (activeComponent.category === 'source') {
        newNode.sourceDetails = {
          name: streamName,
          source: streamSource,
          type: streamType
        };
        
        // Make sure hw_acceleration is false by default
        if (!newNode.config) newNode.config = {};
        newNode.config.hw_acceleration = false;
      }
      
      setPipeline(prev => ({
        ...prev,
        nodes: [...prev.nodes, newNode]
      }));
      
      setActiveComponent(null);
      setSelectedComponent(null);
    }
    
    // Finalize node dragging
    if (draggingNode) {
      setDraggingNode(null);
      // Keep the node selected after dragging
      setSelectedNode(draggingNode);
    }
    
    // Handle connecting nodes
    if (isDrawingConnection && connectionStart) {
      // Find node at mouse position by checking all node elements
      const targetNode = pipeline.nodes.find(node => {
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return false;
        
        const nodeRect = nodeElement.getBoundingClientRect();
        const builderRect = builderRef.current!.getBoundingClientRect();
        
        // Calculate relative position within the builder canvas
        const relativeX = e.clientX - builderRect.left + builderRef.current!.scrollLeft;
        const relativeY = e.clientY - builderRect.top + builderRef.current!.scrollTop;
        
        // Check if click is within node bounds
        return relativeX >= node.position.x && 
               relativeX <= node.position.x + nodeRect.width && 
               relativeY >= node.position.y && 
               relativeY <= node.position.y + nodeRect.height;
      });
      
      if (targetNode && targetNode.id !== connectionStart.nodeId) {
        // Check if connection is valid (source to target)
        const sourceNode = pipeline.nodes.find(n => n.id === connectionStart.nodeId);
        const sourceComponent = componentsList.find(c => c.id === sourceNode?.componentId);
        
        const targetComponent = componentsList.find(c => c.id === targetNode.componentId);
        
        if (sourceComponent && targetComponent && isValidConnection(sourceComponent, targetComponent)) {
          // Connect the nodes
          setPipeline(prev => ({
            ...prev,
            nodes: prev.nodes.map(node => 
              node.id === connectionStart.nodeId 
                ? { 
                    ...node, 
                    connections: [...node.connections, targetNode.id] 
                  } 
                : node
            )
          }));
          
          // Check if we're connecting a detector to an event_alarm
          const isDetectorToAlarm = 
            (sourceComponent.category === 'detector' && targetComponent.id === 'event_alarm');
          
          // Check if we're connecting something that might be connected to a detector to an alarm
          const isPotentialDetectorPath = 
            (targetComponent.id === 'event_alarm' && sourceNode && 
             (sourceComponent.category === 'tracker' || 
              sourceComponent.category === 'classifier' || 
              sourceComponent.category === 'geometry' || 
              sourceComponent.category === 'sink'));

          // If connecting directly or indirectly to an alarm, update the alarm's allowed_classes
          if (isDetectorToAlarm || isPotentialDetectorPath) {
            // Use setTimeout to ensure the pipeline state is updated first
            setTimeout(() => {
              // For direct detector-to-alarm connections
              if (isDetectorToAlarm && sourceNode?.config?.classes) {
                const detectorClasses = sourceNode.config.classes;
                if (Array.isArray(detectorClasses) && detectorClasses.length > 0) {
                  
                  // Update the alarm node with the detector's selected classes
                  setPipeline(prev => {
                    const newPipeline = JSON.parse(JSON.stringify(prev));
                    const alarmNode = newPipeline.nodes.find((n: any) => n.id === targetNode.id);
                    if (alarmNode) {
                      if (!alarmNode.config) {
                        alarmNode.config = {};
                      }
                      alarmNode.config.allowed_classes = [...detectorClasses];
                    }
                    return newPipeline;
                  });
                }
              }
              
              // For indirect connections (through trackers, geometry, etc.)
              if (isPotentialDetectorPath) {
                // Find all detector nodes that connect to this source node
                const findAllDetectors = (nodeId: string, visited = new Set<string>()): string[] => {
                  if (visited.has(nodeId)) return [];
                  visited.add(nodeId);
                  
                  const node = pipeline.nodes.find(n => n.id === nodeId);
                  if (!node) return [];
                  
                  const nodeComponent = componentsList.find(c => c.id === node.componentId);
                  if (nodeComponent?.category === 'detector') {
                    return [nodeId];
                  }
                  
                  // Find all nodes that connect to this node
                  return pipeline.nodes
                    .filter(n => n.connections.includes(nodeId))
                    .flatMap(n => findAllDetectors(n.id, visited));
                };
                
                const detectorNodeIds = findAllDetectors(sourceNode.id);
                const detectorNodes = pipeline.nodes.filter(n => detectorNodeIds.includes(n.id));
                
                // Collect classes from all connected detectors
                let allClasses: string[] = [];
                detectorNodes.forEach(detector => {
                  if (detector.config?.classes && Array.isArray(detector.config.classes)) {
                    allClasses = [...allClasses, ...detector.config.classes];
                  }
                });
                
                // Remove duplicates
                const uniqueClasses = Array.from(new Set(allClasses));
                
                if (uniqueClasses.length > 0) {
                  
                  // Update the alarm node with the collected classes
                  setPipeline(prev => {
                    const newPipeline = JSON.parse(JSON.stringify(prev));
                    const alarmNode = newPipeline.nodes.find((n: any) => n.id === targetNode.id);
                    if (alarmNode) {
                      if (!alarmNode.config) {
                        alarmNode.config = {};
                      }
                      alarmNode.config.allowed_classes = [...uniqueClasses];
                    }
                    return newPipeline;
                  });
                }
              }
              
              // Trigger custom events to update UI
              const event = new CustomEvent('pipeline-data-updated', { 
                detail: { sourceId: sourceNode?.id, targetId: targetNode.id }
              });
              document.dispatchEvent(event);
              
              // Also fire a specific event for detector classes if we're dealing with a detector connection
              if (isDetectorToAlarm || isPotentialDetectorPath) {
                let classesToPropagate: string[] = ["person"];
                
                if (isDetectorToAlarm && sourceNode?.config?.classes && Array.isArray(sourceNode.config.classes)) {
                  // For direct detector connections, use its classes
                  classesToPropagate = [...sourceNode.config.classes];
                } 
                // We don't need to handle indirect connections here since the class update already happened
                
                const detectorClassesEvent = new CustomEvent('detector-classes-updated', {
                  detail: { 
                    nodeId: targetNode.id,
                    classes: classesToPropagate
                  }
                });
                
                document.dispatchEvent(detectorClassesEvent);
              }
            }, 100);
          }
        }
      }
      
      setIsDrawingConnection(false);
      setConnectionStart(null);
      setConnectionEnd(null);
      setPossibleConnectionTargets([]);
    }
  };

  // Handle starting a connection from a node
  const handleStartConnection = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!builderRef.current) return;
    
    // Get the node
    const node = pipeline.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // If node already has a connection, remove it
    if (node.connections.length > 0) {
      setPipeline(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => 
          n.id === nodeId 
            ? { ...n, connections: [] } 
            : n
        )
      }));
      return;
    }
    
    const sourceElement = document.getElementById(nodeId);
    if (!sourceElement) return;

    const sourcePos = getConnectionPointPosition(sourceElement, false); // get output point position
    if (!sourcePos) return;

    const rect = builderRef.current.getBoundingClientRect();
    const absoluteX = node.position.x + sourcePos.x;
    const absoluteY = node.position.y + sourcePos.y;
    
    setIsDrawingConnection(true);
    setConnectionStart({ nodeId, x: absoluteX, y: absoluteY });
    setConnectionEnd({ x: absoluteX, y: absoluteY });
    
    // Highlight possible targets
    const possibleTargets = getPossibleConnectionTargets(nodeId);
    setPossibleConnectionTargets(possibleTargets);
  };

  // Handle deleting a node
  const handleDeleteNode = (nodeId: string) => {
    // Find the node and its component
    const node = pipeline.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const component = componentsList.find(c => c.id === node.componentId);
    if (!component) return;
    
    // If it's a source or detector, check if it has dependent nodes
    if (component.category === 'source' || component.category === 'detector') {
      const willOrphanNodes = pipeline.nodes.some(n => {
        // Skip the node being deleted
        if (n.id === nodeId) return false;
        
        // Check if this node depends on the node being deleted
        const nodeComponent = componentsList.find(c => c.id === n.componentId);
        
        // If the node being deleted is a source, any detector depends on it
        if (component.category === 'source' && nodeComponent?.category === 'detector') {
          return true;
        }
        
        // If the node being deleted is a detector, check if any tracker/classifier depends on it
        if (component.category === 'detector' && 
            (nodeComponent?.category === 'tracker' || 
             nodeComponent?.category === 'classifier' ||
             nodeComponent?.category === 'geometry' || 
             nodeComponent?.category === 'sink')) {
          return true;
        }
        
        return false;
      });
      
      if (willOrphanNodes) {
        if (!window.confirm(`Deleting this ${component.category} will also remove dependent components. Continue?`)) {
          return;
        }
      }
    }
    
    // Proceed with deletion
    setPipeline(prev => {
      // First, identify nodes that should be deleted
      const nodesToDelete = new Set<string>([nodeId]);
      
      // If deleting a source, remove all nodes
      if (component.category === 'source') {
        prev.nodes.forEach(n => nodesToDelete.add(n.id));
      }
      
      // If deleting a detector, remove dependent trackers/classifiers/sinks
      if (component.category === 'detector') {
        // First identify all nodes that will be orphaned
        let orphanedNodes = prev.nodes.filter(n => {
          // Skip the node being deleted
          if (n.id === nodeId) return false;
          
          // Check if this node depends on the detector
          const nodeComponent = componentsList.find(c => c.id === n.componentId);
          return nodeComponent?.category === 'tracker' || 
                 nodeComponent?.category === 'classifier' ||
                 nodeComponent?.category === 'geometry' || 
                 nodeComponent?.category === 'sink';
        }).map(n => n.id);
        
        // Add all orphaned nodes to delete set
        orphanedNodes.forEach(id => nodesToDelete.add(id));
      }
      
      // Filter out the nodes to delete
      const filteredNodes = prev.nodes.filter(node => !nodesToDelete.has(node.id));
      
      // Then, remove any connections to this node
      const updatedNodes = filteredNodes.map(node => ({
        ...node,
        connections: node.connections.filter(connId => !nodesToDelete.has(connId))
      }));
      
      return {
        ...prev,
        nodes: updatedNodes
      };
    });
    
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  // Helper function to deep compare objects
  const isEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      return obj1.every((item, index) => isEqual(item, obj2[index]));
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      if (!obj2.hasOwnProperty(key)) return false;
      if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
        return isEqual(obj1[key], obj2[key]);
      }
      return obj1[key] === obj2[key];
    });
  };

  // Update the pipeline when initialPipeline prop changes
  useEffect(() => {
    if (initialPipeline) {
      
      // Create a deep copy of the initialPipeline to avoid reference issues
      const newPipelineData = JSON.parse(JSON.stringify(initialPipeline));
      
      // Apply position from current state if available
      setPipeline(prev => {
        const updatedNodes = newPipelineData.nodes.map((newNode: any) => {
          // Find matching node in current pipeline to preserve position
          const currentNode = prev.nodes.find(n => n.id === newNode.id);
          if (currentNode) {
            return {
              ...newNode,
              position: currentNode.position,
            };
          }
          return newNode;
        });
        
        // Return the updated pipeline with preserved positions
        return {
          ...newPipelineData,
          nodes: updatedNodes
        };
      });
    }
  }, [initialPipeline]);

  // Handle saving the pipeline
  const handleSavePipeline = () => {
    // Set saving state
    setIsSaving(true);
    setProcessingState('processing');
    setProcessingMessage('Saving pipeline and applying changes...');
    
    // Create an AbortController for cleanup
    const abortController = new AbortController();
    
    // Create a deep copy of the current pipeline for the API
    const apiPipeline = JSON.parse(JSON.stringify(pipeline));
    apiPipeline.streamId = streamId;
    apiPipeline.active = true;  // Mark as active when saving
    
    // Find all line zone components and annotated stream components
    const lineZoneNodes = apiPipeline.nodes.filter((node: PipelineNode) => 
      node.componentId === 'line_zone' || node.componentId === 'line_zone_manager'
    );
    const annotatedNodes = apiPipeline.nodes.filter((node: PipelineNode) => 
      node.componentId === 'annotated_stream' || node.componentId === 'annotated_video_sink'
    );
    
    // If we have both line zones and annotated stream components, update the configs
    if (lineZoneNodes.length > 0 && annotatedNodes.length > 0) {
      // Create line zones configuration from line zone components
      const lineZones = lineZoneNodes.flatMap((node: PipelineNode) => {
        // Check if we have the new lines array format
        if (node.config?.lines && Array.isArray(node.config.lines)) {
          // Use the lines array, adding node ID as identifier to ensure uniqueness
          return node.config.lines.map((line: any, index: number) => {
            // Create a new object to avoid mutating the original
            const processedLine = { ...line };
            
            // Ensure each line has a valid unique ID
            processedLine.id = line.id || `${node.id}_${Date.now()}_${index}`;
            
            // Ensure all required properties exist with proper types
            processedLine.start_x = Number(processedLine.start_x || 50);
            processedLine.start_y = Number(processedLine.start_y || 200);
            processedLine.end_x = Number(processedLine.end_x || 1000);
            processedLine.end_y = Number(processedLine.end_y || 200);
            processedLine.in_count = Number(processedLine.in_count || 0);
            processedLine.out_count = Number(processedLine.out_count || 0);
            
            // For line_zone_manager, ensure we have these properties
            processedLine.minimum_crossing_threshold = Number(processedLine.minimum_crossing_threshold || 1);
            
            // Ensure triggering_anchors is an array
            if (!processedLine.triggering_anchors || !Array.isArray(processedLine.triggering_anchors) || processedLine.triggering_anchors.length === 0) {
              processedLine.triggering_anchors = ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"];
            }
            
            return processedLine;
          });
        } else {
          // Fallback to legacy format
          const startX = node.config?.start_x ?? 50;
          const startY = node.config?.start_y ?? 200;
          const endX = node.config?.end_x ?? 1000;
          const endY = node.config?.end_y ?? 200;
          
          return [{
            id: node.id,
            start_x: Number(startX),
            start_y: Number(startY),
            end_x: Number(endX),
            end_y: Number(endY),
            in_count: 0,
            out_count: 0,
            // Add these fields for line_zone_manager compatibility
            minimum_crossing_threshold: 1,
            triggering_anchors: ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"]
          }];
        }
      });
      
      // Log the total line zones for debugging
      console.log(`Adding ${lineZones.length} line zones to ${annotatedNodes.length} annotated nodes`);
      
      // Update each annotated stream component
      annotatedNodes.forEach((node: PipelineNode) => {
        // Ensure we have a config object
        if (!node.config) {
          node.config = {};
        }
        
        // Set line zones config
        node.config.show_line_zones = true;
        node.config.line_zones = lineZones;
      });
    }
    
    // Final validation pass - ensure ALL event_alarm components have valid allowed_classes
    apiPipeline.nodes.forEach((node: PipelineNode) => {
      if (node.componentId === 'event_alarm') {
        if (!node.config || !node.config.allowed_classes) {
          console.error(`Event alarm ${node.id} is missing allowed_classes`);
        } else {
          // Only check these conditions if config and allowed_classes exist
          if (!Array.isArray(node.config.allowed_classes)) {
            console.error(`Event alarm ${node.id} allowed_classes is not an array`);
          } else if (node.config.allowed_classes.length === 0) {
            console.error(`Event alarm ${node.id} allowed_classes is empty`);
          } else if (!node.config.allowed_classes.includes("person")) {
            console.error(`Event alarm ${node.id} allowed_classes does not include "person"`);
          }
        }
      }
    });
    
    try {
      // Save the pipeline using the onSave callback from props
      // First check if it's a function to avoid TypeScript errors
      if (typeof onSave !== 'function') {
        throw new Error('onSave is not a function');
      }
      
      // Call onSave with the pipeline data and check the return type
      try {
        const result = onSave(apiPipeline);
        
        // Cast to any to avoid TypeScript errors with void type
        const saveResult = result as any;
        
        // If the result has a then method, treat it as a Promise
        if (saveResult && typeof saveResult === 'object' && typeof saveResult.then === 'function') {
          // It's a Promise, wait for it to resolve
          saveResult.then((savedPipelineData: any) => {
            // If we have a valid saved pipeline with an ID
            if (savedPipelineData && savedPipelineData.id) {
              // Update our local state with the new ID
              setPipeline(prev => ({
                ...prev,
                id: savedPipelineData.id
              }));
              
              // Only check processing status if the ID is permanent (not a temp ID)
              if (!savedPipelineData.id.startsWith('pipeline_')) {
                // Use the API to wait for pipeline processing to complete
                waitForPipelineProcessing(
                  streamId, 
                  savedPipelineData.id, 
                  30000,
                  500,
                  abortController.signal
                )
                  .then((finalState: string) => {
                    if (finalState === 'error') {
                      setFlashMessage({
                        message: 'Error applying pipeline changes',
                        type: 'error'
                      });
                    } else {
                      setFlashMessage({
                        message: 'Pipeline saved successfully!',
                        type: 'success'
                      });
                    }
                    setProcessingState('idle');
                    setProcessingMessage('');
                    setIsSaving(false);
                  })
                  .catch((err: Error) => {
                    // Check if this was an abort error from cleanup
                    if (err instanceof DOMException && err.name === 'AbortError') {
                      console.log('Pipeline processing check was aborted - component may have unmounted');
                      return; // Don't update state if unmounted
                    }
                    
                    console.error('Error waiting for pipeline processing:', err);
                    setFlashMessage({
                      message: 'Pipeline saved, but status update timed out.',
                      type: 'info'
                    });
                    setProcessingState('idle');
                    setProcessingMessage('');
                    setIsSaving(false);
                  });
              } else {
                // Can't check status for temporary IDs
                setFlashMessage({
                  message: 'Pipeline saved successfully!',
                  type: 'success'
                });
                setProcessingState('idle');
                setProcessingMessage('');
                setIsSaving(false);
              }
            } else {
              // No ID in response, can't check processing
              setFlashMessage({
                message: 'Pipeline saved successfully!',
                type: 'success'
              });
              setProcessingState('idle');
              setProcessingMessage('');
              setIsSaving(false);
            }
          }).catch((err: any) => {
            console.error('Error saving pipeline:', err);
            setFlashMessage({
              message: 'Failed to save pipeline. Please try again.',
              type: 'error'
            });
            setProcessingState('error');
            setProcessingMessage('');
            setIsSaving(false);
            
            // Clean up on error
            abortController.abort();
          });
        } else {
          // Not a Promise, just show success
          setFlashMessage({
            message: 'Pipeline saved successfully!',
            type: 'success'
          });
          setProcessingState('idle');
          setProcessingMessage('');
          setIsSaving(false);
          
          // Clean up
          abortController.abort();
        }
      } catch (error) {
        // Handle any errors during the save process
        console.error('Error saving pipeline:', error);
        setFlashMessage({
          message: 'Failed to save pipeline. Please try again.',
          type: 'error'
        });
        setProcessingState('error');
        setProcessingMessage('');
        setIsSaving(false);
        
        // Clean up on error
        abortController.abort();
      }
    } catch (error) {
      // Handle any errors during the save process
      console.error('Error saving pipeline:', error);
      setFlashMessage({
        message: 'Failed to save pipeline. Please try again.',
        type: 'error'
      });
      setProcessingState('error');
      setProcessingMessage('');
      setIsSaving(false);
      
      // Clean up on error
      abortController.abort();
    }
  };

  // Clear flash message
  const clearFlashMessage = () => {
    setFlashMessage(null);
  };

  // Update a node configuration property
  const updateNodeConfig = (nodeId: string, key: string, value: any) => {
    
    setPipeline(prev => {
      const node = prev.nodes.find(n => n.id === nodeId);
      if (!node) return prev;
      
      // Deep copy the pipeline to avoid reference issues
      const newPipeline = JSON.parse(JSON.stringify(prev));
      const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
      if (targetNode) {
        targetNode.config = { ...node.config, [key]: value };
        
        // Check if we're updating classes in a detector component
        const isDetector = targetNode.componentId?.includes('detector') || targetNode.componentId === 'object_detector';
        if (isDetector && key === 'classes') {
          // When classes change in a detector, we should notify other components that might use these classes
          setTimeout(() => {
            const event = new CustomEvent('detector-classes-updated', {
              detail: { nodeId, classes: value }
            });
            document.dispatchEvent(event);
          }, 50);
        }
      }
      return newPipeline;
    });
  };

  // Add these handlers after the pipeline state
  // Create debounced stream control handlers
  const { debouncedCallback: handleStartStreamDebounced, isDebouncing: isStartingStream } = 
    useDebounce(() => onStartStream && onStartStream(), 300);

  const { debouncedCallback: handleStopStreamDebounced, isDebouncing: isStoppingStream } = 
    useDebounce(() => onStopStream && onStopStream(), 300);

  const { debouncedCallback: handleDeleteStreamDebounced, isDebouncing: isDeletingStream } = 
    useDebounce(() => {
      setShowDeleteConfirmation(false);
      onDeleteStream && onDeleteStream();
    }, 300);

  // Add a debounced save handler
  const { debouncedCallback: handleSavePipelineDebounced, isDebouncing: isSavingPipeline } = 
    useDebounce(handleSavePipeline, 300);

  // Add a debounced delete pipeline handler
  const { debouncedCallback: handleDeletePipelineDebounced, isDebouncing: isDeletingPipeline } = 
    useDebounce(() => {
      setShowDeletePipelineConfirmation(false);
      
      // Set loading state to prevent further requests
      setProcessingState('processing');
      setProcessingMessage('Deleting stream...');
      
      // Add current pipeline ID to deleted set immediately
      if (pipeline && pipeline.id) {
        deletedPipelineIds.current.add(pipeline.id);
      }
      
      // Reset pipeline state to avoid further requests after deletion
      resetPipelineState();
      
      // Combine stopping and deleting into a single operation
      if (streamStatus === 'running' && onStopStream) {
        // If stream is running, stop it first, then delete
        const stopResult = onStopStream();
        
        // Check if onStopStream returns a Promise
        if (stopResult && typeof stopResult.then === 'function') {
          stopResult
            .then(() => {
              // After successfully stopping, delete the stream
              if (onDeleteStream) {
                onDeleteStream();
              }
            })
            .catch(() => {
              // If stopping fails, try deleting anyway
              if (onDeleteStream) {
                onDeleteStream();
              }
            });
        } else {
          // If it doesn't return a Promise, just delete after stopping
          if (onDeleteStream) {
            onDeleteStream();
          }
        }
      } else {
        // If stream is not running, just delete it
        if (onDeleteStream) {
          onDeleteStream();
        }
      }
    }, 300);

  // Create a NodePropertiesPanel component to render all properties for a node
  interface NodePropertiesPanelProps {
    node: PipelineNode;
    component: VisionComponent;
    onConfigUpdate: (nodeId: string, key: string, value: any) => void;
  }

  const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({ node, component, onConfigUpdate }) => {
    // Use effect to ensure model configuration data is loaded when node is selected
    useEffect(() => {
      // For detector nodes, ensure we refresh the configuration on mount
      if (component.category === 'detector' || 
          component.id === 'object_detector' || 
          component.id === 'face_detector' || 
          component.id === 'image_classifier') {
        
        // This will force the component's configuration to be accessed by the UI
        const element = document.getElementById(`node-config-${node.id}`);
        if (element) {
          const event = new Event('change', { bubbles: true });
          element.dispatchEvent(event);
        }
      }
    }, [node.id, component.id, component.category]);
    
    // If no config exists or is empty, show a simple message
    if (!node.config || Object.keys(node.config).length === 0) {
      return (
        <div>
          <h4>{component.name}</h4>
          <p>{component.description}</p>
          <div className="node-config">
            <div className="config-section">
              <p>No configuration options available for this component.</p>
            </div>
          </div>
        </div>
      );
    }

    // Group properties by category
    const groupedProperties = groupNodeProperties(node.config);

    // Clean up the configuration data for the UI by removing duplicate information
    const configForUI = { ...node.config };
    
    // For detector nodes, ensure we don't pass raw JSON strings
    if (component.category === 'detector' && configForUI.model_classes) {
      // If model_classes is a string, parse it
      if (typeof configForUI.model_classes === 'string') {
        try {
          configForUI.model_classes = JSON.parse(configForUI.model_classes);
        } catch (e) {
          console.error("Failed to parse model_classes:", e);
        }
      }
    }
    
    // Store the configuration data in a hidden element to be used by UI components
    const configJson = JSON.stringify(configForUI);
    
    // Create a renderPropertyControl function to pass to ConfigurableProperties
    const renderPropertyControl = (key: string, value: any) => {
      return (
        <ConfigPropertyControl
          key={key}
          nodeId={node.id}
          propKey={key}
          propValue={value}
          componentType={component.id}
          onConfigUpdate={onConfigUpdate}
        />
      );
    };
    
    return (
      <div>
        <h4>{component.name}</h4>
        <p>{component.description}</p>
        
        {/* Hidden element to store configuration data */}
        <div id={`node-config-${node.id}`} data-config={configJson} style={{ display: 'none' }}></div>
        
        {/* Add the "Configure Line Zones" button for line_zone_manager components */}
        {component.id === 'line_zone_manager' && streamStatus === 'running' && (
          <div className="line-zone-config-button-container">
            <button 
              className="line-zone-config-button"
              onClick={() => openLineZoneConfigModal(node.id)}
            >
              Configure Line Zones
            </button>
            <p className="line-zone-config-hint">
              Click the button above to visually configure line zones using the camera feed.
            </p>
          </div>
        )}
        
        {component.id === 'line_zone_manager' && streamStatus !== 'running' && (
          <div className="line-zone-config-warning">
            <p>
              <strong>Note:</strong> To use the visual line configuration tool, 
              the stream must be running. Start the stream to enable this feature.
            </p>
          </div>
        )}
        
        <div className="node-config">
          <h5>Configuration</h5>
          
          {/* Render each property group with the ConfigurableProperties component */}
          {Object.entries(groupedProperties).map(([groupName, properties]) => (
            <div key={groupName} className="config-section">
              <h6>{groupName}</h6>
              <ConfigurableProperties
                nodeId={node.id}
                componentType={component.id}
                properties={properties}
                renderPropertyControl={renderPropertyControl}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Add a function to open the LineZoneConfigModal
  const openLineZoneConfigModal = (nodeId: string) => {
    const node = pipeline.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    
    // Find the camera feed node to get the source URL
    const cameraNode = pipeline.nodes.find(n => n.componentId === 'camera_feed');
    setCameraFeedNode(cameraNode || null);
    
    // Ensure that line coordinates are properly formatted before passing to modal
    // Deep clone the node to avoid modifying the original
    const clonedNode = JSON.parse(JSON.stringify(node));
    
    // Ensure node has a config and lines array
    if (!clonedNode.config) {
      clonedNode.config = {};
    }
    
    if (!clonedNode.config.lines || !Array.isArray(clonedNode.config.lines)) {
      clonedNode.config.lines = [];
    }
    
    // Ensure each line has required properties and is valid
    clonedNode.config.lines = clonedNode.config.lines.map((line: any) => {
      // Skip invalid lines
      if (!line || typeof line !== 'object') {
        console.warn("Skipping invalid line:", line);
        return null;
      }
      
      // Ensure the line has a valid ID
      if (!line.id) {
        line.id = `line_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      }
      
      // Ensure the line has the required properties
      return {
        id: line.id,
        name: line.name || '',
        start_x: Number(line.start_x || 100),
        start_y: Number(line.start_y || 200),
        end_x: Number(line.end_x || 800),
        end_y: Number(line.end_y || 200),
        in_count: Number(line.in_count || 0),
        out_count: Number(line.out_count || 0),
        minimum_crossing_threshold: Number(line.minimum_crossing_threshold || 1),
        triggering_anchors: line.triggering_anchors || ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"],
        // Preserve normalized coordinates if they exist
        norm_start_x: line.norm_start_x,
        norm_start_y: line.norm_start_y,
        norm_end_x: line.norm_end_x,
        norm_end_y: line.norm_end_y
      };
    }).filter(Boolean); // Remove any null entries
    
    
    setCurrentLineZoneNode(clonedNode);
    setIsLineZoneModalOpen(true);
  };

  // Add a function to handle saving line zones from the modal
  const handleSaveLineZones = (lines: any[]) => {
    if (!currentLineZoneNode) return;
    
    // Process the lines to ensure we retain normalized coordinates
    const processedLines = lines.map((line, index) => {
      // Create a new object to avoid mutating the original
      const processedLine = { ...line };
      
      // Ensure each line has a valid ID, use index in fallback to prevent duplicates
      if (!processedLine.id) {
        processedLine.id = `line_${Date.now()}_${index}`;
      }
      
      // Ensure all numeric fields are properly parsed as numbers
      processedLine.start_x = Number(processedLine.start_x || 100);
      processedLine.start_y = Number(processedLine.start_y || 200);
      processedLine.end_x = Number(processedLine.end_x || 800);
      processedLine.end_y = Number(processedLine.end_y || 200);
      processedLine.in_count = Number(processedLine.in_count || 0);
      processedLine.out_count = Number(processedLine.out_count || 0);
      processedLine.minimum_crossing_threshold = Number(processedLine.minimum_crossing_threshold || 1);
      
      // Ensure triggering anchors is an array
      if (!processedLine.triggering_anchors || !Array.isArray(processedLine.triggering_anchors) || processedLine.triggering_anchors.length === 0) {
        processedLine.triggering_anchors = ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"];
      }
      
      // If for some reason norm coordinates are missing, calculate them
      if (processedLine.norm_start_x === undefined) {
        // Default to 1920x1080 if we don't know the actual dimensions
        const width = 1920;
        const height = 1080;
        
        processedLine.norm_start_x = processedLine.start_x / width;
        processedLine.norm_start_y = processedLine.start_y / height;
        processedLine.norm_end_x = processedLine.end_x / width;
        processedLine.norm_end_y = processedLine.end_y / height;
      }
      
      return processedLine;
    });
    
    // Log the processed lines for debugging
    console.log("Updating line zones:", processedLines);
    
    // Update the node configuration with the new lines
    updateNodeConfig(currentLineZoneNode.id, 'lines', processedLines);
    setIsLineZoneModalOpen(false);
  };

  // Function to reset the pipeline state
  const resetPipelineState = () => {
    // If there's a current pipeline ID, add it to the deleted set
    if (pipeline && pipeline.id) {
      deletedPipelineIds.current.add(pipeline.id);
    }
    
    // Reset connection and selection states
    setIsDrawingConnection(false);
    setConnectionStart(null);
    setConnectionEnd(null);
    setPossibleConnectionTargets([]);
    setSelectedNode(null);
    setDraggingNode(null);
    setActiveComponent(null);
    setSelectedComponent(null);
  };

  // Add a function to check pipeline processing state
  const checkPipelineProcessingState = useCallback(async (signal?: AbortSignal) => {
    // Don't make the API call if pipeline ID doesn't exist or has a temporary ID
    // (pipeline_TIMESTAMP format indicates it hasn't been saved to the server yet)
    if (!pipeline || !pipeline.id || !streamId || pipeline.id.startsWith('pipeline_')) {
      return;
    }
    
    // Skip API calls for deleted pipelines
    if (deletedPipelineIds.current.has(pipeline.id)) {
      setProcessingState('idle');
      return;
    }
    
    try {
      // Pass the signal to the API call
      const isProcessing = await isPipelineProcessing(streamId, pipeline.id, signal);
      setProcessingState(isProcessing ? 'processing' : 'idle');
    } catch (error: any) {
      // Skip handling AbortError - this is expected during cleanup
      if (error.name === 'AbortError') {
        return;
      }
      
      // Check if this is a 404 error, which is expected for deleted pipelines
      const errorString = String(error);
      const isNotFoundError = errorString.includes('404');
      
      if (isNotFoundError) {
        // For 404 errors, add the pipeline ID to deleted set and don't log errors
        deletedPipelineIds.current.add(pipeline.id);
        setProcessingState('idle');
      } else {
        // Only log unexpected errors
        console.error('Error checking pipeline processing state:', error);
        setProcessingState('idle');
      }
    }
  }, [pipeline, streamId]);
  
  // Check processing state when component mounts and when pipeline ID changes
  useEffect(() => {
    // Don't check if component is being unmounted or pipeline is deleted
    let isActive = true;
    // Track any in-flight controller for aborting requests
    const abortController = new AbortController();
    
    const checkState = async () => {
      if (!isActive) return;
      try {
        // Pass the abort controller signal to the API call
        await checkPipelineProcessingState(abortController.signal);
      } catch (error: any) {
        // Ignore errors during cleanup or aborted requests
        if (error.name !== 'AbortError') {
          console.error('Error checking pipeline state:', error);
        }
      }
    };
    
    // Initial check
    checkState();
    
    // Set up interval to check processing state, but only if we have a valid pipeline ID
    // that's not a temporary ID (doesn't start with pipeline_)
    let intervalId: number | undefined;
    if (pipeline.id && !pipeline.id.startsWith('pipeline_')) {
      intervalId = window.setInterval(() => {
        if (isActive) {
          checkState();
        } else if (intervalId) {
          clearInterval(intervalId);
        }
      }, 5000); // Reduced frequency to 5s
    }
    
    return () => {
      // Mark component as inactive to prevent state updates after unmount
      isActive = false;
      
      // Clear interval when component unmounts or dependencies change
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
      
      // Abort any in-flight requests
      abortController.abort();
      
      // Add this pipeline ID to deleted set to prevent future requests
      if (pipeline && pipeline.id) {
        deletedPipelineIds.current.add(pipeline.id);
      }
    };
  }, [pipeline.id, checkPipelineProcessingState]);
  
  // Disable UI interaction if pipeline is processing
  const isUIDisabled = processingState === 'processing' || actionLoading;

  return (
    <div className="vision-pipeline-builder">
      {/* Add overlay for processing state */}
      {isUIDisabled && (
        <div className="pipeline-processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner"></div>
            <div className="processing-message">
              {processingMessage || 'Processing pipeline, please wait...'}
            </div>
          </div>
        </div>
      )}
      
      {/* Flash message */}
      {flashMessage && (
        <FlashMessage 
          message={flashMessage.message} 
          type={flashMessage.type} 
          onClose={clearFlashMessage} 
        />
      )}
      
      <div className="pipeline-controls">
        <div className="pipeline-name">
          <input 
            type="text" 
            value={pipeline.name}
            onChange={(e) => setPipeline(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Pipeline Name"
          />
        </div>
        <div className="control-buttons">
          <button onClick={() => setShowComponentList(!showComponentList)}>
            {showComponentList ? 'Hide Components' : 'Show Components'}
          </button>
          <button 
            onClick={handleSavePipelineDebounced} 
            className="save-button"
            disabled={isSaving || isSavingPipeline}
          >
            Save Pipeline
          </button>
          <button 
            onClick={() => setShowDeletePipelineConfirmation(true)}
            className="delete-button"
            disabled={actionLoading || isDeletingPipeline}
          >
            Delete Pipeline
          </button>
        </div>
      </div>
      
      <div className="pipeline-builder-container">
        {showComponentList && (
          <div className="component-palette">
            <div className="component-categories">
              {componentCategories.map(category => (
                <button 
                  key={category}
                  className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="component-list">
              {filteredComponents.map(component => (
                <div 
                  key={component.id}
                  className={`component-item ${selectedComponent === component.id ? 'selected' : ''} ${!canAddComponent(component) ? 'disabled' : ''}`}
                  draggable={canAddComponent(component)}
                  onDragStart={(e) => {
                    if (canAddComponent(component)) {
                      setActiveComponent(component);
                      setSelectedComponent(component.id);
                      if (builderRef.current) {
                        const rect = builderRef.current.getBoundingClientRect();
                        setDragOffset({
                          x: 90, // Half the component width for centered placement
                          y: 40  // Half the component height for centered placement
                        });
                      }
                    }
                  }}
                  onMouseDown={(e) => handleDragStart(component, e)}
                  onClick={() => canAddComponent(component) && setSelectedComponent(component.id)}
                >
                  <div className="component-name">{component.name}</div>
                  <div className="component-description">{component.description}</div>
                  {!canAddComponent(component) && (
                    <div className="component-disabled-reason">
                      {component.category === 'source' ? 
                        'Only one source allowed' : 
                        component.category === 'tracker' ?
                        'Only one tracker allowed' :
                        pipeline.nodes.some(node => node.componentId === component.id) ?
                        'Component already in use' :
                        'Requires compatible parent component'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div 
          ref={builderRef}
          className="builder-canvas"
          onMouseMove={isUIDisabled ? undefined : handleMouseMove}
          onMouseUp={isUIDisabled ? undefined : handleMouseUp}
          onDragOver={isUIDisabled ? undefined : handleDragOver}
          onDrop={isUIDisabled ? undefined : handleDrop}
          onClick={(e) => {
            // If a component is selected, place it at the click position
            if (selectedComponent && builderRef.current) {
              const component = componentsList.find(c => c.id === selectedComponent);
              if (component && canAddComponent(component)) {
                const rect = builderRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left + builderRef.current.scrollLeft;
                const y = e.clientY - rect.top + builderRef.current.scrollTop;
                
                // Add new component to pipeline
                const newNode: PipelineNode = {
                  id: `${component.id}_${Date.now()}`,
                  componentId: component.id,
                  position: { 
                    x: x - 90, // Center the component horizontally
                    y: y - 40  // Center the component vertically
                  },
                  connections: [],
                  config: component.config ? { ...component.config } : {}
                };
                
                // If it's a source component, add stream details and ensure hardware acceleration is disabled
                if (component.category === 'source') {
                  newNode.sourceDetails = {
                    name: streamName,
                    source: streamSource,
                    type: streamType
                  };
                  
                  // Make sure hw_acceleration is false by default
                  if (!newNode.config) newNode.config = {};
                  newNode.config.hw_acceleration = false;
                }
                
                setPipeline(prev => ({
                  ...prev,
                  nodes: [...prev.nodes, newNode]
                }));
                
                setActiveComponent(null);
                setSelectedComponent(null);
              }
            } else {
              // If no component is selected and we clicked on empty space, unselect the current node
              setSelectedNode(null);
            }
          }}
        >
          {/* Add this render element inside the builder-canvas div, just before the connections-layer svg */}
          {pipeline.nodes.length === 0 && (
            <div className="empty-pipeline-hint">
              <h3>Start Building Your Pipeline</h3>
              <p>Drag a source component here to begin.</p>
              <div className="arrow-hint">⟵ Select components from the panel</div>
            </div>
          )}
          
          {/* Draw connections between nodes */}
          <svg className="connections-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {pipeline.nodes.map(node => 
              node.connections.map(targetId => {
                const targetNode = pipeline.nodes.find(n => n.id === targetId);
                if (!targetNode) return null;
                
                // Get the DOM elements for source and target nodes
                const sourceElement = document.getElementById(node.id);
                const targetElement = document.getElementById(targetId);
                if (!sourceElement || !targetElement) return null;

                // Get connection point positions
                const sourcePos = getConnectionPointPosition(sourceElement, false); // output point
                const targetPos = getConnectionPointPosition(targetElement, true);  // input point
                if (!sourcePos || !targetPos) return null;

                // Calculate absolute positions
                const sourceX = node.position.x + sourcePos.x;
                const sourceY = node.position.y + sourcePos.y;
                const targetX = targetNode.position.x + targetPos.x;
                const targetY = targetNode.position.y + targetPos.y;
                
                // Control points for curved line
                const cp1x = sourceX + Math.min(100, (targetX - sourceX) / 2);
                const cp1y = sourceY;
                const cp2x = targetX - Math.min(100, (targetX - sourceX) / 2);
                const cp2y = targetY;
                
                return (
                  <path 
                    key={`${node.id}-${targetId}`}
                    d={`M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`}
                    fill="none"
                    stroke="#666"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    data-connection={`${node.id}-${targetId}`}
                  />
                );
              })
            )}
            
            {/* Drawing connection line */}
            {isDrawingConnection && connectionStart && connectionEnd && (
              <path 
                d={`M ${connectionStart.x} ${connectionStart.y} L ${connectionEnd.x} ${connectionEnd.y}`}
                fill="none"
                stroke="#666"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </svg>
          
          <div className="nodes-container" style={{ position: 'relative', zIndex: 2 }}>
            {pipeline.nodes.map(node => {
              const component = componentsList.find(c => c.id === node.componentId);
              if (!component) return null;
              
              const isPossibleTarget = possibleConnectionTargets.includes(node.id);
              
              return (
                <div 
                  key={node.id}
                  className={`pipeline-node ${component.category} ${selectedNode === node.id ? 'selected' : ''} ${isPossibleTarget ? 'possible-target' : ''} ${isDrawingConnection ? 'during-connection' : ''}`}
                  style={{ 
                    left: `${node.position.x}px`, 
                    top: `${node.position.y}px`,
                    cursor: isDrawingConnection && isPossibleTarget ? 'pointer' : 'default'
                  }}
                  id={node.id}
                  data-node-id={node.id}
                  data-component-id={component.id}
                  onClick={(e) => {
                    if (isDrawingConnection) {
                      // Let the handleMouseUp handle the connection logic
                      return;
                    }
                    handleNodeSelect(node.id, e);
                  }}
                  onMouseDown={(e) => {
                    if (isDrawingConnection) {
                      // Prevent dragging while drawing connections
                      return;
                    }
                    handleNodeDragStart(node.id, e);
                  }}
                >
                  <div className="node-header">
                    <div className="node-name">{component.name}</div>
                    <div className="node-controls">
                      <button 
                        className={`start-connection-btn ${node.connections.length > 0 ? 'is-connected' : ''}`}
                        onClick={(e) => handleStartConnection(node.id, e)}
                        title={node.connections.length > 0 ? "Disconnect node" : "Connect to another node"}
                      >
                        {node.connections.length > 0 ? '⊖' : '→'}
                      </button>
                      <button 
                        className="delete-node-btn"
                        onClick={() => handleDeleteNode(node.id)}
                        title="Delete node"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="node-body">
                    <div className="node-type">{component.type}</div>
                    
                    {/* Show stream details for source nodes */}
                    {component.category === 'source' && node.sourceDetails && (
                      <div className="node-source-details">
                        <div className="source-detail"><strong>Stream:</strong> {node.sourceDetails.name}</div>
                        <div className="source-detail"><strong>Status:</strong> <span className={`status-indicator ${streamStatus}`}>{streamStatus}</span></div>
                      </div>
                    )}
                    
                    {component.inputs && component.inputs.length > 0 && (
                      <div className="node-info">
                        <small>Inputs: {component.inputs.join(', ')}</small>
                      </div>
                    )}
                    {component.outputs && component.outputs.length > 0 && (
                      <div className="node-info">
                        <small>Outputs: {component.outputs.join(', ')}</small>
                      </div>
                    )}
                  </div>
                  
                  {/* Connection points */}
                  {component.inputs && component.inputs.length > 0 && (
                    <div className="connection-point input-point" title="Input"></div>
                  )}
                  {component.outputs && component.outputs.length > 0 && (
                    <div className="connection-point output-point" title="Output"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {selectedNode && (
          <div className="node-properties">
            <h3>Node Properties</h3>
            {(() => {
              const node = pipeline.nodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              const component = componentsList.find(c => c.id === node.componentId);
              if (!component) return null;
              
              // Add special handling for source components to keep stream controls and details
              if (component.category === 'source' && node.sourceDetails) {
                return (
                  <div>
                    <h4>{component.name}</h4>
                    <p>{component.description}</p>
                    
                    <div className="source-properties">
                      <h5>Stream Details</h5>
                      <div className="property-item">
                        <label>ID:</label>
                        <span>{streamId}</span>
                      </div>
                      <div className="property-item">
                        <label>Name:</label>
                        <span>{node.sourceDetails.name}</span>
                      </div>
                      <div className="property-item">
                        <label>Source:</label>
                        <span title={node.sourceDetails.source} className="source-url">{node.sourceDetails.source}</span>
                      </div>
                      <div className="property-item">
                        <label>Type:</label>
                        <span>{node.sourceDetails.type}</span>
                      </div>
                      <div className="property-item">
                        <label>Status:</label>
                        <span className={`status-indicator ${streamStatus}`}>{streamStatus}</span>
                      </div>
                      {streamResolution && (
                        <div className="property-item">
                          <label>Resolution:</label>
                          <span>{streamResolution}</span>
                        </div>
                      )}
                      {streamFps && (
                        <div className="property-item">
                          <label>FPS:</label>
                          <span>{streamFps}</span>
                        </div>
                      )}
                      
                      {/* Stream Controls */}
                      {component.id === 'camera_feed' && (
                        <div className="stream-controls">
                          <h5>Stream Controls</h5>
                          <div className="stream-actions">
                            {streamStatus !== 'running' && onStartStream && (
                              <button 
                                className="btn"
                                onClick={handleStartStreamDebounced}
                                disabled={actionLoading || isStartingStream}
                              >
                                Start Stream
                              </button>
                            )}
                            {streamStatus === 'running' && onStopStream && (
                              <button 
                                className="btn btn-secondary"
                                onClick={handleStopStreamDebounced}
                                disabled={actionLoading || isStoppingStream}
                              >
                                Stop Stream
                              </button>
                            )}
                            {onDeleteStream && (
                              <button 
                                className="btn btn-danger"
                                onClick={() => setShowDeleteConfirmation(true)}
                                disabled={actionLoading || isDeletingStream}
                              >
                                Delete Stream
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Camera feed preview */}
                      {component.id === 'camera_feed' && renderCameraFeedPreview && (
                        <div className="camera-feed-preview-container">
                          <h5>Camera Feed Preview</h5>
                          {renderCameraFeedPreview()}
                        </div>
                      )}
                    </div>
                    
                    {/* Add configuration panel for any properties */}
                    {node.config && Object.keys(node.config).length > 0 && (
                      <NodePropertiesPanel
                        node={node}
                        component={component}
                        onConfigUpdate={updateNodeConfig}
                      />
                    )}
                  </div>
                );
              }
              
              // For non-source components, use the dynamic properties panel
              return (
                <NodePropertiesPanel
                  node={node}
                  component={component}
                  onConfigUpdate={updateNodeConfig}
                />
              );
            })()}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          title="Delete Stream"
          message="Are you sure you want to delete this stream? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteStreamDebounced}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {/* Delete Pipeline Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeletePipelineConfirmation}
        title="Delete Pipeline"
        message="Are you sure you want to delete this pipeline? This action cannot be undone. If the pipeline is currently running, it will be stopped before deletion."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          setShowDeletePipelineConfirmation(false);
          handleDeletePipelineDebounced();
        }}
        onCancel={() => setShowDeletePipelineConfirmation(false)}
      />
      
      {/* Add the LineZoneConfigModal */}
      {isLineZoneModalOpen && currentLineZoneNode && (
        <LineZoneConfigModal 
          isOpen={isLineZoneModalOpen}
          onClose={() => setIsLineZoneModalOpen(false)}
          streamId={streamId}
          lines={currentLineZoneNode.config?.lines || []}
          onSave={handleSaveLineZones}
        />
      )}
    </div>
  );
};

export default VisionPipelineBuilder;