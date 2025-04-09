import React, { useState, useRef, useEffect } from 'react';
import '../styles/VisionPipelineBuilder.css';

// Define types for our vision components
interface VisionComponent {
  id: string;
  type: string;
  name: string;
  category: 'source' | 'detector' | 'tracker' | 'classifier' | 'geometry' | 'sink';
  description: string;
  inputs?: string[];
  outputs?: string[];
  requiresParent?: string[];
  config?: Record<string, any>;
}

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
  onSave: (pipeline: Pipeline) => void;
}

const VisionPipelineBuilder: React.FC<VisionPipelineBuilderProps> = ({ 
  streamId, 
  streamName, 
  streamSource, 
  streamType, 
  onSave 
}) => {
  const [pipeline, setPipeline] = useState<Pipeline>({
    id: `pipeline_${Date.now()}`,
    name: `${streamName || 'New'} Vision Pipeline`,
    nodes: [],
  });
  
  const [activeComponent, setActiveComponent] = useState<VisionComponent | null>(null);
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
  
  const builderRef = useRef<HTMLDivElement>(null);

  // Define available components
  const AVAILABLE_COMPONENTS: VisionComponent[] = [
    // Source components
    {
      id: 'camera_feed',
      type: 'source',
      name: 'Camera Feed',
      category: 'source',
      description: `Stream source: ${streamSource}`,
      outputs: ['image'],
    },
    
    // Detector components
    {
      id: 'object_detector',
      type: 'detector',
      name: 'Object Detector',
      category: 'detector',
      description: 'Detects objects in frames',
      inputs: ['image'],
      outputs: ['detections'],
      config: { confidence: 0.5, classes: ['person', 'car', 'dog'] }
    },
    {
      id: 'motion_detector',
      type: 'detector',
      name: 'Motion Detector',
      category: 'detector',
      description: 'Detects motion between frames',
      inputs: ['image'],
      outputs: ['motion_regions'],
    },
    {
      id: 'face_detector',
      type: 'detector',
      name: 'Face Detector',
      category: 'detector',
      description: 'Detects faces in frames',
      inputs: ['image'],
      outputs: ['faces'],
    },
    
    // Tracker components
    {
      id: 'object_tracker',
      type: 'tracker',
      name: 'Object Tracker',
      category: 'tracker',
      description: 'Tracks detected objects across frames',
      inputs: ['image', 'detections'],
      outputs: ['tracked_objects'],
      requiresParent: ['object_detector'],
    },
    {
      id: 'face_tracker',
      type: 'tracker',
      name: 'Face Tracker',
      category: 'tracker',
      description: 'Tracks detected faces across frames',
      inputs: ['image', 'faces'],
      outputs: ['tracked_faces'],
      requiresParent: ['face_detector'],
    },
    
    // Classifier components
    {
      id: 'object_classifier',
      type: 'classifier',
      name: 'Object Classifier',
      category: 'classifier',
      description: 'Classifies detected objects',
      inputs: ['image', 'detections'],
      outputs: ['classified_objects'],
      requiresParent: ['object_detector'],
    },
    {
      id: 'face_recognition',
      type: 'classifier',
      name: 'Face Recognition',
      category: 'classifier',
      description: 'Recognizes faces against a database',
      inputs: ['image', 'faces'],
      outputs: ['recognized_faces'],
      requiresParent: ['face_detector'],
    },

    // Geometry components
    {
      id: 'polygon_drawer',
      type: 'geometry',
      name: 'Polygon Drawer',
      category: 'geometry',
      description: 'Draw polygons to define regions of interest',
      inputs: ['image', 'detections', 'tracked_objects', 'classified_objects', 'faces', 'tracked_faces', 'recognized_faces'],
      outputs: ['polygons'],
    },
    {
      id: 'line_crossing',
      type: 'geometry',
      name: 'Line Crossing',
      category: 'geometry',
      description: 'Define lines for object crossing detection',
      inputs: ['image', 'detections', 'tracked_objects', 'classified_objects', 'faces', 'tracked_faces', 'recognized_faces'],
      outputs: ['crossing_events'],
    },
    
    // Sink/output components
    {
      id: 'telemetry_sink',
      type: 'sink',
      name: 'Telemetry Output',
      category: 'sink',
      description: 'Outputs detection results as telemetry data',
      inputs: ['detections', 'tracked_objects', 'classified_objects', 'faces', 'tracked_faces', 'recognized_faces', 'polygons', 'crossing_events'],
    },
    {
      id: 'annotated_video_sink',
      type: 'sink',
      name: 'Annotated Video',
      category: 'sink',
      description: 'Outputs video with annotations',
      inputs: ['image', 'detections', 'tracked_objects', 'classified_objects', 'faces', 'tracked_faces', 'recognized_faces', 'polygons'],
    },
  ];

  // Update available categories based on the pipeline state
  useEffect(() => {
    let newCategories = ['source'];
    
    // Check if a source node exists
    const hasSource = pipeline.nodes.some(node => {
      const component = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
      return component?.category === 'source';
    });
    
    if (hasSource) {
      newCategories.push('detector');
    }
    
    // Check if a detector node exists
    const hasDetector = pipeline.nodes.some(node => {
      const component = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
      return component?.category === 'detector';
    });
    
    if (hasDetector) {
      newCategories.push('tracker', 'classifier', 'geometry', 'sink');
    }
    
    setAvailableCategories(newCategories);
    
    // If the currently selected category is no longer available, switch to the first available
    if (!newCategories.includes(selectedCategory)) {
      setSelectedCategory(newCategories[0]);
    }
  }, [pipeline.nodes, selectedCategory]);

  // Filter components based on selected category
  const filteredComponents = AVAILABLE_COMPONENTS.filter(
    component => component.category === selectedCategory
  );

  // Get all component categories
  const componentCategories = Array.from(
    new Set(AVAILABLE_COMPONENTS.map(comp => comp.category))
  ).filter(category => availableCategories.includes(category));

  // Check if adding a component is allowed
  const canAddComponent = (component: VisionComponent): boolean => {
    // If the component requires a parent, check if a compatible parent exists
    if (component.requiresParent && component.requiresParent.length > 0) {
      return pipeline.nodes.some(node => {
        const nodeComponent = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
        return nodeComponent && component.requiresParent?.includes(nodeComponent.id);
      });
    }
    
    // For source components, only allow one
    if (component.category === 'source') {
      return !pipeline.nodes.some(node => {
        const nodeComponent = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
        return nodeComponent?.category === 'source';
      });
    }
    
    return true;
  };

  // Handle starting to drag a component from the palette
  const handleDragStart = (component: VisionComponent, e: React.MouseEvent) => {
    if (!canAddComponent(component)) {
      return; // Don't allow dragging if the component can't be added
    }
    
    setActiveComponent(component);
    
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

  // Check if a connection is valid between two components
  const isValidConnection = (sourceComponent: VisionComponent, targetComponent: VisionComponent): boolean => {
    // Only allow connection if source has outputs and target has inputs
    if (!sourceComponent.outputs || !targetComponent.inputs) {
      return false;
    }
    
    // Check if any output of source matches any input of target
    const hasMatchingIO = sourceComponent.outputs.some(output => 
      targetComponent.inputs?.includes(output)
    );
    
    // Special cases for geometry components - they can connect to/from multiple component types
    const isSourceGeometry = sourceComponent.category === 'geometry';
    const isTargetGeometry = targetComponent.category === 'geometry';
    
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
    
    return hasMatchingIO || allowGeometryConnection;
  };

  // Get possible targets for a connection from a node
  const getPossibleConnectionTargets = (nodeId: string): string[] => {
    const sourceNode = pipeline.nodes.find(n => n.id === nodeId);
    if (!sourceNode) return [];
    
    const sourceComponent = AVAILABLE_COMPONENTS.find(c => c.id === sourceNode.componentId);
    if (!sourceComponent) return [];
    
    return pipeline.nodes
      .filter(node => {
        if (node.id === nodeId) return false; // Can't connect to self
        
        const targetComponent = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
        if (!targetComponent) return false;
        
        return isValidConnection(sourceComponent, targetComponent);
      })
      .map(node => node.id);
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
    }
    
    // Finalize node dragging
    if (draggingNode) {
      setDraggingNode(null);
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
        const sourceComponent = AVAILABLE_COMPONENTS.find(c => c.id === sourceNode?.componentId);
        
        const targetComponent = AVAILABLE_COMPONENTS.find(c => c.id === targetNode.componentId);
        
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

  // Handle selecting a node
  const handleNodeSelect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
  };

  // Handle deleting a node
  const handleDeleteNode = (nodeId: string) => {
    // Find the node and its component
    const node = pipeline.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const component = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
    if (!component) return;
    
    // If it's a source or detector, check if it has dependent nodes
    if (component.category === 'source' || component.category === 'detector') {
      const willOrphanNodes = pipeline.nodes.some(n => {
        // Skip the node being deleted
        if (n.id === nodeId) return false;
        
        // Check if this node depends on the node being deleted
        const nodeComponent = AVAILABLE_COMPONENTS.find(c => c.id === n.componentId);
        
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
          const nodeComponent = AVAILABLE_COMPONENTS.find(c => c.id === n.componentId);
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

  // Handle saving the pipeline
  const handleSavePipeline = () => {
    onSave(pipeline);
  };

  return (
    <div className="vision-pipeline-builder">
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
          <button onClick={handleSavePipeline} className="save-button">
            Save Pipeline
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
                  className={`component-item ${!canAddComponent(component) ? 'disabled' : ''}`}
                  draggable={canAddComponent(component)}
                  onMouseDown={(e) => handleDragStart(component, e)}
                >
                  <div className="component-name">{component.name}</div>
                  <div className="component-description">{component.description}</div>
                  {!canAddComponent(component) && (
                    <div className="component-disabled-reason">
                      {component.category === 'source' ? 
                        'Only one source allowed' : 
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
        >
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
            const component = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
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
                      <div className="source-detail"><strong>Source:</strong> {node.sourceDetails.source}</div>
                      <div className="source-detail"><strong>Type:</strong> {node.sourceDetails.type}</div>
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
        
        {selectedNode && (
          <div className="node-properties">
            <h3>Node Properties</h3>
            {(() => {
              const node = pipeline.nodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              const component = AVAILABLE_COMPONENTS.find(c => c.id === node.componentId);
              if (!component) return null;
              
              return (
                <div>
                  <h4>{component.name}</h4>
                  <p>{component.description}</p>
                  
                  {/* Show stream details for source nodes */}
                  {component.category === 'source' && node.sourceDetails && (
                    <div className="source-properties">
                      <h5>Stream Details</h5>
                      <div className="property-item">
                        <label>Name:</label>
                        <span>{node.sourceDetails.name}</span>
                      </div>
                      <div className="property-item">
                        <label>Source:</label>
                        <span>{node.sourceDetails.source}</span>
                      </div>
                      <div className="property-item">
                        <label>Type:</label>
                        <span>{node.sourceDetails.type}</span>
                      </div>
                    </div>
                  )}
                  
                  {node.config && Object.entries(node.config).length > 0 && (
                    <div className="node-config">
                      <h5>Configuration</h5>
                      {Object.entries(node.config).map(([key, value]) => {
                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="config-item">
                              <label>{key}:</label>
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
                        
                        if (typeof value === 'number') {
                          return (
                            <div key={key} className="config-item">
                              <label>{key}:</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1"
                                value={value}
                                onChange={(e) => {
                                  setPipeline(prev => ({
                                    ...prev,
                                    nodes: prev.nodes.map(n => 
                                      n.id === selectedNode 
                                        ? { 
                                            ...n, 
                                            config: { 
                                              ...n.config, 
                                              [key]: parseFloat(e.target.value) 
                                            } 
                                          } 
                                        : n
                                    )
                                  }));
                                }}
                              />
                              <span>{value.toFixed(1)}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={key} className="config-item">
                            <label>{key}:</label>
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
    </div>
  );
};

export default VisionPipelineBuilder; 