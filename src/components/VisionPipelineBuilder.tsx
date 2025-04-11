import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import '../styles/VisionPipelineBuilder.css';

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
    config: component.config || {}
  };
  
  // Special handling for annotated stream components to ensure they have all the config options
  if (normalizedComponent.id === 'annotated_stream' || normalizedComponent.id === 'annotated_video_sink') {
    normalizedComponent.config = {
      show_labels: true,
      show_bounding_boxes: true,
      show_tracks: true,
      show_title: true,
      show_timestamp: true,
      label_font_scale: 0.5,
      text_color: [255, 255, 255],
      title_position: [10, 30],
      timestamp_position: [10, 60],
      ...normalizedComponent.config // Keep any existing config values
    };
  }
  
  // Special handling for event alarm components
  if (normalizedComponent.id === 'event_alarm') {
    normalizedComponent.config = {
      min_confidence: 0.6,
      trigger_delay: 5,
      cool_down_period: 30,
      notify_on_alarm: true,
      ...normalizedComponent.config // Keep any existing config values
    };
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
  onStartStream?: () => void;
  onStopStream?: () => void;
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
        <h3>{title}</h3>
        <p>{message}</p>
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

const VisionPipelineBuilder: React.FC<VisionPipelineBuilderProps> = ({ 
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
      console.log("Using initial pipeline:", initialPipeline);
      return initialPipeline;
    }
    
    // Otherwise create a new pipeline with a pre-populated source component
    const sourceNode: PipelineNode = {
      id: `camera_feed_${Date.now()}`,
      componentId: 'camera_feed',
      position: { x: 50, y: 50 }, // Position near top-left
      connections: [],
      config: {},
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
  
  const builderRef = useRef<HTMLDivElement>(null);

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
    
    return components;
  }, [availableComponents, streamSource]);

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
      newCategories.push('tracker', 'classifier', 'geometry');
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
    // If the component requires a parent, check if a compatible parent exists
    if (component.requiresParent && component.requiresParent.length > 0) {
      return pipeline.nodes.some(node => {
        const nodeComponent = componentsList.find(c => c.id === node.componentId);
        return nodeComponent && component.requiresParent?.includes(nodeComponent.id);
      });
    }
    
    // For source components, only allow one
    if (component.category === 'source') {
      return !pipeline.nodes.some(node => {
        const nodeComponent = componentsList.find(c => c.id === node.componentId);
        return nodeComponent?.category === 'source';
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
      config: activeComponent.config ? { ...activeComponent.config } : undefined
    };
    
    // If it's a source component, add stream details
    if (activeComponent.category === 'source') {
      newNode.sourceDetails = {
        name: streamName,
        source: streamSource,
        type: streamType
      };
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
    // Only allow connection if source has outputs and target has inputs
    if (!sourceComponent.outputs || !targetComponent.inputs) {
      // Special case for sink components - they might not have explicitly defined outputs
      // but we still want to allow connecting them to other sinks
      const isSourceSink = sourceComponent.category === 'sink';
      const isTargetSink = targetComponent.category === 'sink';
      
      if (isSourceSink && isTargetSink) {
        return true; // Allow sink-to-sink connections even without explicit outputs/inputs
      }
      
      return false;
    }
    
    // Check if any output of source matches any input of target
    const hasMatchingIO = sourceComponent.outputs.some((output: string) => 
      targetComponent.inputs?.includes(output)
    );
    
    // Special cases for geometry components
    const isSourceGeometry = sourceComponent.category === 'geometry';
    const isTargetGeometry = targetComponent.category === 'geometry';
    
    // Special cases for sink components
    const isSourceSink = sourceComponent.category === 'sink';
    const isTargetSink = targetComponent.category === 'sink';
    
    // Allow connections to geometry components from most types
    const allowGeometryConnection = 
      (isTargetGeometry && sourceComponent.outputs.includes('image')) || 
      (isTargetGeometry && (
        sourceComponent.outputs.includes('detections') || 
        sourceComponent.outputs.includes('tracked_objects') || 
        sourceComponent.outputs.includes('classified_objects') || 
        sourceComponent.outputs.includes('faces') || 
        sourceComponent.outputs.includes('tracked_faces') || 
        sourceComponent.outputs.includes('recognized_faces')
      )) ||
      (isSourceGeometry && targetComponent.inputs.includes('polygons'));
      
    // Allow sink -> sink connections
    // This will allow connecting annotated video to other sinks like event logger or alarms
    const allowSinkConnection = isSourceSink && isTargetSink;
    
    return hasMatchingIO || allowGeometryConnection || allowSinkConnection;
  };

  // Get possible targets for a connection from a node
  const getPossibleConnectionTargets = (nodeId: string): string[] => {
    const sourceNode = pipeline.nodes.find(n => n.id === nodeId);
    if (!sourceNode) return [];
    
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
        config: activeComponent.config ? { ...activeComponent.config } : undefined
      };
      
      // If it's a source component, add stream details
      if (activeComponent.category === 'source') {
        newNode.sourceDetails = {
          name: streamName,
          source: streamSource,
          type: streamType
        };
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
      // Find node at mouse position
      const targetNode = pipeline.nodes.find(node => {
        const nodeRect = {
          left: node.position.x,
          right: node.position.x + 180,
          top: node.position.y,
          bottom: node.position.y + 80
        };
        
        return x >= nodeRect.left && x <= nodeRect.right && 
               y >= nodeRect.top && y <= nodeRect.bottom;
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
    
    const rect = builderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawingConnection(true);
    setConnectionStart({ nodeId, x, y });
    setConnectionEnd({ x, y });
    
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
      console.log("Updating pipeline from props:", initialPipeline);
      
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
    
    // Create a deep copy of the current pipeline for the API
    const apiPipeline = JSON.parse(JSON.stringify(pipeline));
    apiPipeline.streamId = streamId;
    apiPipeline.active = true;  // Mark as active when saving
    
    console.log("Saving pipeline with config:", apiPipeline);
    
    try {
      // Call the onSave handler passed from parent
      onSave(apiPipeline);
      
      // Show success message
      setFlashMessage({
        message: 'Pipeline saved successfully!',
        type: 'success'
      });
    } catch (error) {
      // Show error message if save fails
      setFlashMessage({
        message: 'Failed to save pipeline. Please try again.',
        type: 'error'
      });
      console.error('Error saving pipeline:', error);
    }
    
    // End saving state after a short delay
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  // Clear flash message
  const clearFlashMessage = () => {
    setFlashMessage(null);
  };

  // Update a node configuration property
  const updateNodeConfig = (nodeId: string, key: string, value: any) => {
    console.log(`Updating node ${nodeId} config: ${key} = `, value);
    
    setPipeline(prev => {
      const node = prev.nodes.find(n => n.id === nodeId);
      if (!node) return prev;
      
      // Deep copy the pipeline to avoid reference issues
      const newPipeline = JSON.parse(JSON.stringify(prev));
      const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
      if (targetNode) {
        targetNode.config = { ...node.config, [key]: value };
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
      // Stop the stream if it's running
      if (streamStatus === 'running' && onStopStream) {
        onStopStream();
      }
      // Delete the stream
      if (onDeleteStream) {
        onDeleteStream();
      }
    }, 300);

  return (
    <div className="vision-pipeline-builder">
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
            className={`save-button ${isSaving || isSavingPipeline ? 'saving' : ''}`}
            disabled={isSaving || isSavingPipeline}
          >
            {isSaving || isSavingPipeline ? (
              <>
                <span className="spinner"></span>
                <span className="button-text">Saving...</span>
              </>
            ) : (
              <span className="button-text">Save Pipeline</span>
            )}
          </button>
          <button 
            onClick={() => setShowDeletePipelineConfirmation(true)}
            className={`delete-button ${actionLoading || isDeletingPipeline ? 'loading' : ''}`}
            disabled={actionLoading || isDeletingPipeline}
          >
            {actionLoading || isDeletingPipeline ? (
              <>
                <span className="spinner"></span>
                <span className="button-text">Deleting...</span>
              </>
            ) : (
              <span className="button-text">Delete Pipeline</span>
            )}
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
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
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
                  config: component.config ? { ...component.config } : undefined
                };
                
                // If it's a source component, add stream details
                if (component.category === 'source') {
                  newNode.sourceDetails = {
                    name: streamName,
                    source: streamSource,
                    type: streamType
                  };
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
          
          <div className="nodes-container">
            {/* Draw connections between nodes */}
            <svg className="connections-layer">
              {pipeline.nodes.map(node => 
                node.connections.map(targetId => {
                  const targetNode = pipeline.nodes.find(n => n.id === targetId);
                  if (!targetNode) return null;
                  
                  const sourceX = node.position.x + 180; // Right side of source node
                  const sourceY = node.position.y + 40; // Middle of source node
                  const targetX = targetNode.position.x; // Left side of target node
                  const targetY = targetNode.position.y + 40; // Middle of target node
                  
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
            
            {/* Render nodes */}
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
                  }}
                  onClick={(e) => handleNodeSelect(node.id, e)}
                  onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                >
                  <div className="node-header">
                    <div className="node-name">{component.name}</div>
                    <div className="node-controls">
                      <button 
                        className="start-connection-btn"
                        onClick={(e) => handleStartConnection(node.id, e)}
                        title="Connect to another node"
                      >
                        →
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
              
              // Special case handling for annotated video components
              if (component.id === 'annotated_video_sink' || component.id === 'annotated_stream') {
                return (
                  <div>
                    <h4>{component.name}</h4>
                    <p>{component.description}</p>
                    
                    <div className="node-config">
                      <h5>Configuration</h5>
                      
                      {/* Show/Hide Options */}
                      <div className="config-section">
                        <h6>Display Options</h6>
                        
                        {/* Show Labels */}
                        <div className="config-item">
                          <label>Show Labels:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.show_labels ?? true}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.show_labels = e.target.checked;
                              console.log(`Updating node ${node.id} config: show_labels = `, e.target.checked);
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                        
                        {/* Show Bounding Boxes */}
                        <div className="config-item">
                          <label>Show Bounding Boxes:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.show_bounding_boxes ?? true}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.show_bounding_boxes = e.target.checked;
                              console.log(`Updating node ${node.id} config: show_bounding_boxes = `, e.target.checked);
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                        
                        {/* Show Tracks */}
                        <div className="config-item">
                          <label>Show Tracks:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.show_tracks ?? true}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.show_tracks = e.target.checked;
                              console.log(`Updating node ${node.id} config: show_tracks = `, e.target.checked);
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                        
                        {/* Show Title */}
                        <div className="config-item">
                          <label>Show Title:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.show_title ?? true}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.show_title = e.target.checked;
                              console.log(`Updating node ${node.id} config: show_title = `, e.target.checked);
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                        
                        {/* Show Timestamp */}
                        <div className="config-item">
                          <label>Show Timestamp:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.show_timestamp ?? true}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.show_timestamp = e.target.checked;
                              console.log(`Updating node ${node.id} config: show_timestamp = `, e.target.checked);
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Font and Color Settings */}
                      <div className="config-section">
                        <h6>Font and Color Settings</h6>
                        
                        {/* Label Font Scale */}
                        <div className="config-item">
                          <label>Label Font Scale:</label>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="2.0" 
                            step="0.1"
                            value={node.config?.label_font_scale ?? 0.5}
                            onChange={(e) => {
                              // Create a deep copy of the config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.label_font_scale = parseFloat(e.target.value);
                              console.log(`Updating node ${node.id} config: label_font_scale = `, parseFloat(e.target.value));
                              
                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                          <span>{(node.config?.label_font_scale ?? 0.5).toFixed(1)}</span>
                        </div>
                        
                        {/* Text Color */}
                        <div className="config-item">
                          <label>Text Color:</label>
                          <ColorPickerControl 
                            value={node.config?.text_color ?? [255, 255, 255]} 
                            onChange={(newColor) => {
                              // Create a deep copy of the current config to avoid reference issues
                              const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                              newConfig.text_color = [...newColor]; // Create a new array to avoid reference issues
                              console.log(`Updating node ${node.id} config: text_color = `, newColor);

                              // Update the pipeline with the modified node
                              setPipeline(prev => {
                                // Deep copy the pipeline to avoid reference issues
                                const newPipeline = JSON.parse(JSON.stringify(prev));
                                const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                if (targetNode) {
                                  targetNode.config = newConfig;
                                }
                                return newPipeline;
                              });
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Position Settings */}
                      <div className="config-section">
                        <h6>Position Settings</h6>
                        
                        {/* Title Position */}
                        <div className="config-item">
                          <label>Title Position:</label>
                          <div className="position-inputs">
                            <div>
                              <label className="position-label">X:</label>
                              <input 
                                type="number" 
                                min="0" 
                                max="1920" 
                                value={node.config?.title_position ? node.config.title_position[0] : 10}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  if (!newConfig.title_position) {
                                    newConfig.title_position = [10, 30];
                                  }
                                  newConfig.title_position[0] = parseInt(e.target.value);
                                  console.log(`Updating node ${node.id} config: title_position[0] = `, parseInt(e.target.value));
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
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
                                value={node.config?.title_position ? node.config.title_position[1] : 30}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  if (!newConfig.title_position) {
                                    newConfig.title_position = [10, 30];
                                  }
                                  newConfig.title_position[1] = parseInt(e.target.value);
                                  console.log(`Updating node ${node.id} config: title_position[1] = `, parseInt(e.target.value));
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
                                }}
                                style={{ width: '60px' }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Timestamp Position */}
                        <div className="config-item">
                          <label>Timestamp Position:</label>
                          <div className="position-inputs">
                            <div>
                              <label className="position-label">X:</label>
                              <input 
                                type="number" 
                                min="0" 
                                max="1920" 
                                value={node.config?.timestamp_position ? node.config.timestamp_position[0] : 10}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  if (!newConfig.timestamp_position) {
                                    newConfig.timestamp_position = [10, 60];
                                  }
                                  newConfig.timestamp_position[0] = parseInt(e.target.value);
                                  console.log(`Updating node ${node.id} config: timestamp_position[0] = `, parseInt(e.target.value));
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
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
                                value={node.config?.timestamp_position ? node.config.timestamp_position[1] : 60}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  if (!newConfig.timestamp_position) {
                                    newConfig.timestamp_position = [10, 60];
                                  }
                                  newConfig.timestamp_position[1] = parseInt(e.target.value);
                                  console.log(`Updating node ${node.id} config: timestamp_position[1] = `, parseInt(e.target.value));
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
                                }}
                                style={{ width: '60px' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Special case handling for Event Alarm
              if (component.id === 'event_alarm') {
                return (
                  <div>
                    <h4>{component.name}</h4>
                    <p>{component.description}</p>
                    
                    <div className="node-config">
                      <h5>Configuration</h5>
                      
                      <div className="config-section">
                        <h6>Alarm Settings</h6>
                        
                        {/* Minimum Confidence */}
                        <div className="config-item">
                          <label>Minimum Confidence:</label>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="1.0" 
                            step="0.05"
                            value={node.config?.min_confidence ?? 0.6}
                            onChange={(e) => updateNodeConfig(node.id, 'min_confidence', parseFloat(e.target.value))}
                          />
                          <span>{(node.config?.min_confidence ?? 0.6).toFixed(2)}</span>
                        </div>
                        
                        {/* Trigger Delay */}
                        <div className="config-item">
                          <label>Trigger Delay (seconds):</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="60" 
                            value={node.config?.trigger_delay ?? 5}
                            onChange={(e) => updateNodeConfig(node.id, 'trigger_delay', parseInt(e.target.value))}
                            style={{ width: '60px' }}
                          />
                        </div>
                        
                        {/* Cool Down Period */}
                        <div className="config-item">
                          <label>Cool Down Period (seconds):</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="300" 
                            value={node.config?.cool_down_period ?? 30}
                            onChange={(e) => updateNodeConfig(node.id, 'cool_down_period', parseInt(e.target.value))}
                            style={{ width: '60px' }}
                          />
                        </div>
                        
                        {/* Notify on Alarm */}
                        <div className="config-item">
                          <label>Notify on Alarm:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.notify_on_alarm ?? true}
                            onChange={(e) => updateNodeConfig(node.id, 'notify_on_alarm', e.target.checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Special case handling for Event Logger
              if (component.id === 'event_logger') {
                return (
                  <div>
                    <h4>{component.name}</h4>
                    <p>{component.description}</p>
                    
                    <div className="node-config">
                      <h5>Configuration</h5>
                      
                      <div className="config-section">
                        <h6>Logging Settings</h6>
                        
                        {/* Log Level */}
                        <div className="config-item">
                          <label>Log Level:</label>
                          <select 
                            value={node.config?.log_level ?? 'info'}
                            onChange={(e) => updateNodeConfig(node.id, 'log_level', e.target.value)}
                          >
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                          </select>
                        </div>
                        
                        {/* Include Images */}
                        <div className="config-item">
                          <label>Include Images:</label>
                          <input 
                            type="checkbox" 
                            checked={node.config?.include_images ?? true}
                            onChange={(e) => updateNodeConfig(node.id, 'include_images', e.target.checked)}
                          />
                        </div>
                        
                        {/* Retention Days */}
                        <div className="config-item">
                          <label>Retention Period (days):</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="365" 
                            value={node.config?.retention_days ?? 7}
                            onChange={(e) => updateNodeConfig(node.id, 'retention_days', parseInt(e.target.value))}
                            style={{ width: '60px' }}
                          />
                        </div>
                        
                        {/* Max Events Per Day */}
                        <div className="config-item">
                          <label>Max Events Per Day:</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="10000" 
                            value={node.config?.max_events_per_day ?? 1000}
                            onChange={(e) => updateNodeConfig(node.id, 'max_events_per_day', parseInt(e.target.value))}
                            style={{ width: '80px' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div>
                  <h4>{component.name}</h4>
                  <p>{component.description}</p>
                  
                  {/* Detailed Stream Details and Controls for source nodes */}
                  {component.category === 'source' && node.sourceDetails && (
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
                                className={`btn ${actionLoading || isStartingStream ? 'loading' : ''}`}
                                onClick={handleStartStreamDebounced}
                                disabled={actionLoading || isStartingStream}
                              >
                                {actionLoading || isStartingStream ? (
                                  <>
                                    <span className="spinner"></span>
                                    <span className="button-text">Starting...</span>
                                  </>
                                ) : (
                                  <span className="button-text">Start Stream</span>
                                )}
                              </button>
                            )}
                            {streamStatus === 'running' && onStopStream && (
                              <button 
                                className={`btn btn-secondary ${actionLoading || isStoppingStream ? 'loading' : ''}`}
                                onClick={handleStopStreamDebounced}
                                disabled={actionLoading || isStoppingStream}
                              >
                                {actionLoading || isStoppingStream ? (
                                  <>
                                    <span className="spinner"></span>
                                    <span className="button-text">Stopping...</span>
                                  </>
                                ) : (
                                  <span className="button-text">Stop Stream</span>
                                )}
                              </button>
                            )}
                            {onDeleteStream && (
                              <button 
                                className={`btn btn-danger ${actionLoading || isDeletingStream ? 'loading' : ''}`}
                                onClick={() => setShowDeleteConfirmation(true)}
                                disabled={actionLoading || isDeletingStream}
                              >
                                {actionLoading || isDeletingStream ? (
                                  <>
                                    <span className="spinner"></span>
                                    <span className="button-text">Deleting...</span>
                                  </>
                                ) : (
                                  <span className="button-text">Delete Stream</span>
                                )}
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
                  )}
                  
                  {node.config && Object.entries(node.config).length > 0 && (
                    <div className="node-config">
                      <h5>Configuration</h5>
                      {Object.entries(node.config).map(([key, value]) => {
                        if (Array.isArray(value)) {
                          // Special handling for text_color to show a color preview
                          if (key === 'text_color' && value.length === 3) {
                            return (
                              <div key={key} className="config-item">
                                <label>{key.replace(/_/g, ' ')}:</label>
                                <ColorPickerControl 
                                  value={value as number[]} 
                                  onChange={(newColor) => {
                                    // Create a deep copy of the current config to avoid reference issues
                                    const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                    newConfig[key] = [...newColor]; // Create a new array to avoid reference issues
                                    console.log(`Updating node ${node.id} config: ${key} = `, newColor);

                                    // Update the pipeline with the modified node
                                    setPipeline(prev => {
                                      // Deep copy the pipeline to avoid reference issues
                                      const newPipeline = JSON.parse(JSON.stringify(prev));
                                      const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                      if (targetNode) {
                                        targetNode.config = newConfig;
                                      }
                                      return newPipeline;
                                    });
                                  }}
                                />
                              </div>
                            );
                          }
                          
                          // Position arrays
                          if ((key === 'title_position' || key === 'timestamp_position') && value.length === 2) {
                            return (
                              <div key={key} className="config-item">
                                <label>{key.replace(/_/g, ' ')}:</label>
                                <div className="position-config">
                                  <span>x: {value[0]}, y: {value[1]}</span>
                                </div>
                              </div>
                            );
                          }
                          
                          // Standard array display for other arrays
                          return (
                            <div key={key} className="config-item">
                              <label>{key.replace(/_/g, ' ')}:</label>
                              <div className="array-config">
                                {value.map((item, idx) => (
                                  <div key={idx} className="array-item">
                                    {item.toString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        
                        // Handle boolean values as toggles
                        if (typeof value === 'boolean') {
                          return (
                            <div key={key} className="config-item">
                              <label>{key.replace(/_/g, ' ')}:</label>
                              <input 
                                type="checkbox" 
                                checked={value}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  newConfig[key] = e.target.checked;
                                  console.log(`Updating node ${node.id} config: ${key} = `, e.target.checked);
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
                                }}
                              />
                            </div>
                          );
                        }
                        
                        if (typeof value === 'number') {
                          return (
                            <div key={key} className="config-item">
                              <label>{key.replace(/_/g, ' ')}:</label>
                              <input 
                                type="range" 
                                min={key === 'label_font_scale' ? "0.1" : "0"} 
                                max={key === 'label_font_scale' ? "2" : "1"} 
                                step={key === 'label_font_scale' ? "0.1" : "0.1"}
                                value={value}
                                onChange={(e) => {
                                  // Create a deep copy of the config to avoid reference issues
                                  const newConfig = node.config ? JSON.parse(JSON.stringify(node.config)) : {};
                                  newConfig[key] = parseFloat(e.target.value);
                                  console.log(`Updating node ${node.id} config: ${key} = `, parseFloat(e.target.value));
                                  
                                  // Update the pipeline with the modified node
                                  setPipeline(prev => {
                                    // Deep copy the pipeline to avoid reference issues
                                    const newPipeline = JSON.parse(JSON.stringify(prev));
                                    const targetNode = newPipeline.nodes.find((n: any) => n.id === node.id);
                                    if (targetNode) {
                                      targetNode.config = newConfig;
                                    }
                                    return newPipeline;
                                  });
                                }}
                              />
                              <span>{typeof value === 'number' ? value.toFixed(1) : value}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={key} className="config-item">
                            <label>{key.replace(/_/g, ' ')}:</label>
                            <span>{value.toString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
    </div>
  );
};

export default VisionPipelineBuilder; 