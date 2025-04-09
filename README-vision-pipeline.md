# Vision Pipeline Builder Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Component Architecture](#component-architecture)
4. [Data Structures](#data-structures)
5. [Connection Logic](#connection-logic)
6. [Component Categories](#component-categories)
7. [API Integration](#api-integration)
8. [Extending the Builder](#extending-the-builder)
9. [UI/UX Design Considerations](#uiux-design-considerations)
10. [Pipeline Execution](#pipeline-execution)

## Introduction

The Vision Pipeline Builder is a modular, React-based component that enables users to create computer vision processing pipelines through an intuitive, visual drag-and-drop interface. It is designed for interactive creation of video analytics pipelines for stream processing.

Key features:
- Drag-and-drop interface for adding vision components
- Interactive connection creation between components
- Visual feedback for valid connections
- Automatic pipeline validation
- Component configuration through property panels
- Modular design for easy extension

## Core Concepts

The builder is designed around these core principles:

1. **Component-Based Architecture**: The pipeline is built from modular components that each perform a specific function.

2. **Data Flow**: Data flows from source components through processing components to sink components.

3. **Gated Component Selection**: Components become available based on dependencies:
   - Sources must be added first
   - Detectors require a source
   - Other components (trackers, classifiers, etc.) require detectors

4. **Type-Safe Connections**: Only valid connections between compatible component types are allowed.

5. **Visual Feedback**: The UI provides immediate feedback about valid connections and component states.

## Component Architecture

The Vision Pipeline Builder is built as a React component with the following structure:

```tsx
<VisionPipelineBuilder
  streamId="stream-123"
  streamName="Main Camera"
  streamSource="rtsp://example.com/stream"
  streamType="rtsp"
  onSave={(pipeline) => saveToAPI(pipeline)}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `streamId` | string | ID of the stream to build a pipeline for |
| `streamName` | string | Display name of the stream |
| `streamSource` | string | Source URL or identifier |
| `streamType` | 'camera' \| 'file' \| 'rtsp' | Type of the stream |
| `onSave` | (pipeline: Pipeline) => void | Callback when pipeline is saved |

### Internal Components

- **Component Palette**: Lists available vision components, categorized by type
- **Builder Canvas**: The workspace where the pipeline is built
- **Node Component**: Visual representation of a pipeline component
- **Connection Lines**: Visual representation of data flow
- **Property Panel**: Configuration interface for selected components

## Data Structures

### VisionComponent

Defines the properties of a computer vision component:

```typescript
interface VisionComponent {
  id: string;                // Unique identifier
  type: string;              // Component type
  name: string;              // Display name
  category: 'source' | 'detector' | 'tracker' | 'classifier' | 'geometry' | 'sink';
  description: string;       // Description text
  inputs?: string[];         // Input data types
  outputs?: string[];        // Output data types
  requiresParent?: string[]; // Required parent components
  config?: Record<string, any>; // Configuration options
}
```

### PipelineNode

Represents an instance of a component in the pipeline:

```typescript
interface PipelineNode {
  id: string;                // Unique instance ID
  componentId: string;       // Reference to the component type
  position: { x: number; y: number }; // Position on canvas
  connections: string[];     // IDs of connected nodes
  config?: Record<string, any>; // Configuration values
  sourceDetails?: {          // For source nodes only
    name: string;
    source: string;
    type: string;
  };
}
```

### Pipeline

The complete pipeline structure:

```typescript
interface Pipeline {
  id: string;               // Unique pipeline ID
  name: string;             // Pipeline name
  nodes: PipelineNode[];    // Component instances
}
```

## Connection Logic

Connections between components follow specific rules to ensure valid pipelines:

### Connection Validation

The `isValidConnection` function determines if a connection is valid:

```typescript
const isValidConnection = (sourceComponent, targetComponent) => {
  // Only allow connection if source has outputs and target has inputs
  if (!sourceComponent.outputs || !targetComponent.inputs) {
    return false;
  }
  
  // Check if any output of source matches any input of target
  const hasMatchingIO = sourceComponent.outputs.some(output => 
    targetComponent.inputs?.includes(output)
  );
  
  // Special cases for geometry components
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
```

### Connection Creation

Connections are created by:
1. Clicking the connection button on a source node
2. Dragging to a valid target node
3. Releasing to create the connection

The system provides visual feedback during this process:
- Possible target nodes are highlighted
- Invalid targets are dimmed
- Connection lines show the path of data flow

## Component Categories

The pipeline builder includes six categories of components:

### 1. Source
- Generates image data from camera or file
- Example: `Camera Feed`
- Inputs: None
- Outputs: `image`

### 2. Detector
- Identifies objects or features in images
- Examples: `Object Detector`, `Face Detector`, `Motion Detector`
- Inputs: `image`
- Outputs: `detections`, `faces`, `motion_regions`, etc.

### 3. Tracker
- Tracks detected objects across frames
- Examples: `Object Tracker`, `Face Tracker`
- Inputs: `image`, `detections`/`faces`
- Outputs: `tracked_objects`, `tracked_faces`

### 4. Classifier
- Categorizes detected objects
- Examples: `Object Classifier`, `Face Recognition`
- Inputs: `image`, `detections`/`faces`
- Outputs: `classified_objects`, `recognized_faces`

### 5. Geometry
- Manages spatial regions and operations
- Examples: `Polygon Drawer`, `Line Crossing`
- Inputs: Various (`image`, `detections`, etc.)
- Outputs: `polygons`, `crossing_events`

### 6. Sink
- Outputs or stores processing results
- Examples: `Telemetry Output`, `Annotated Video`
- Inputs: Various (from previous components)
- Outputs: None (terminal components)

## API Integration

The Vision Pipeline Builder is designed to integrate with backend APIs for saving and loading pipelines.

### Saving Pipelines

The `onSave` callback receives the complete pipeline structure:

```typescript
const handleSavePipeline = async (pipeline) => {
  try {
    // Example API call
    const response = await fetch('/api/streams/{streamId}/pipelines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save pipeline');
    }
    
    const savedPipeline = await response.json();
    return savedPipeline;
  } catch (error) {
    console.error('Error saving pipeline:', error);
    throw error;
  }
};
```

### Loading Pipelines

To load an existing pipeline:

```typescript
const loadPipeline = async (streamId, pipelineId) => {
  try {
    const response = await fetch(`/api/streams/${streamId}/pipelines/${pipelineId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load pipeline');
    }
    
    const pipeline = await response.json();
    setPipeline(pipeline);
  } catch (error) {
    console.error('Error loading pipeline:', error);
    throw error;
  }
};
```

### API Endpoints

Recommended API endpoints for pipeline management:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/streams/{streamId}/pipelines` | GET | List all pipelines for a stream |
| `/api/streams/{streamId}/pipelines` | POST | Create a new pipeline |
| `/api/streams/{streamId}/pipelines/{pipelineId}` | GET | Get a specific pipeline |
| `/api/streams/{streamId}/pipelines/{pipelineId}` | PUT | Update a pipeline |
| `/api/streams/{streamId}/pipelines/{pipelineId}` | DELETE | Delete a pipeline |
| `/api/streams/{streamId}/pipelines/{pipelineId}/activate` | POST | Activate a pipeline |

## Extending the Builder

The Vision Pipeline Builder is designed to be extensible. Here's how to add new components or features:

### Adding New Components

To add a new vision component:

1. Add a new entry to the `AVAILABLE_COMPONENTS` array:

```typescript
{
  id: 'human_pose_estimator',
  type: 'analyzer',
  name: 'Human Pose Estimator',
  category: 'detector', // or create a new category
  description: 'Estimates human poses in frames',
  inputs: ['image'],
  outputs: ['poses'],
  config: {
    confidence: 0.6,
    model: 'lightweight'
  }
}
```

2. Add any special connection logic if needed
3. Add CSS styling for the new component:

```css
.pipeline-node.analyzer {
  border-top: 4px solid #E91E63;
}
```

### Adding New Categories

To add a new component category:

1. Update the `VisionComponent` interface to include the new category:

```typescript
interface VisionComponent {
  // ...
  category: 'source' | 'detector' | 'tracker' | 'classifier' | 'geometry' | 'sink' | 'analyzer';
  // ...
}
```

2. Add logic to handle the availability of the new category:

```typescript
useEffect(() => {
  let newCategories = ['source'];
  
  if (hasSource) {
    newCategories.push('detector');
  }
  
  if (hasDetector) {
    newCategories.push('tracker', 'classifier', 'geometry', 'sink', 'analyzer');
  }
  
  setAvailableCategories(newCategories);
}, [pipeline.nodes]);
```

3. Add styling for the new category

### Creating Custom Connection Rules

To implement custom connection rules:

1. Modify the `isValidConnection` function:

```typescript
const isValidConnection = (sourceComponent, targetComponent) => {
  // Existing logic...
  
  // Custom rules for new components
  if (sourceComponent.id === 'human_pose_estimator' && targetComponent.category === 'analyzer') {
    return targetComponent.inputs.includes('poses');
  }
  
  return hasMatchingIO || allowGeometryConnection || customRule;
};
```

## UI/UX Design Considerations

The Vision Pipeline Builder follows these UI/UX principles:

### Visual Hierarchy

- Color coding for different component categories
- Clear input/output connection points
- Visual distinction between selected and non-selected nodes

### Feedback Mechanisms

- Highlighting possible connection targets
- Disabling invalid components
- Showing error messages for invalid operations
- Pulse animations for connection targets

### Responsive Design

- Dynamic sizing of components
- Scrollable canvas for large pipelines
- Collapsible component palette
- Resizable property panel

## Pipeline Execution

To execute a pipeline created in the builder:

### Backend Implementation

1. Create a pipeline executor service:

```typescript
class PipelineExecutor {
  execute(pipeline: Pipeline, streamId: string) {
    // 1. Sort nodes by dependency order
    const sortedNodes = this.topologicalSort(pipeline.nodes);
    
    // 2. Create processor instances for each node
    const processors = sortedNodes.map(node => {
      const component = this.getComponentById(node.componentId);
      return this.createProcessor(component, node.config);
    });
    
    // 3. Create stream source
    const streamSource = this.createStreamSource(streamId);
    
    // 4. Connect processors
    this.connectProcessors(processors, sortedNodes);
    
    // 5. Start processing
    streamSource.pipe(processors[0]);
    
    // 6. Return handler for managing the pipeline
    return {
      stop: () => this.stopProcessing(streamSource, processors),
      getOutputs: () => this.getOutputs(processors)
    };
  }
  
  // Implementation details...
}
```

### Data Flow

A typical execution flow:

1. Video frames are read from the stream source
2. Frames pass through detection components
3. Detections pass through tracking/classification components
4. Results pass through geometry processing
5. Final outputs are sent to sink components (UI, storage, etc.)

### Error Handling

Robust pipeline execution requires error handling:

```typescript
try {
  const result = await processor.process(frame);
  return result;
} catch (error) {
  console.error(`Error in processor ${processor.id}:`, error);
  // Continue with empty result or use previous frame result
  return { type: 'empty', data: null };
}
```

## Additional Resources

- [React Drag and Drop Documentation](https://react-dnd.github.io/react-dnd/)
- [OpenCV.js for Computer Vision](https://docs.opencv.org/master/d5/d10/tutorial_js_root.html)
- [TensorFlow.js for ML Models](https://www.tensorflow.org/js)
- [WebRTC for Real-time Streaming](https://webrtc.org/) 