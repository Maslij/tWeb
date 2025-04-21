import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService, { 
  Stream, 
  getVisionComponents, 
  getPipelinesForStream, 
  getActivePipeline,
  createPipeline,
  updatePipeline,
  activatePipeline
} from '../services/api';
import StreamView from '../components/StreamView';
import StreamViewWS from '../components/StreamViewWS';
import VisionPipelineBuilder from '../components/VisionPipelineBuilder';
import Modal from '../components/Modal';
import '../styles/VisionPipelineBuilder.css';

interface Pipeline {
  id: string;
  name: string;
  nodes: PipelineNode[];
  active?: boolean;
}

interface PipelineNode {
  id: string;
  componentId: string;
  position: { x: number; y: number };
  connections: string[];
  config?: Record<string, any>;
  sourceDetails?: {
    name: string;
    source: string;
    type: string;
  };
}

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
  model_classes?: Record<string, string[]>;
  available_models?: string[];
}

// Helper function to get connection point position
const getConnectionPointPosition = (element: HTMLElement, isInput: boolean) => {
  const rect = element.getBoundingClientRect();
  return {
    x: isInput ? 0 : rect.width,
    y: rect.height / 2
  };
};

const StreamDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [useWebSocket, setUseWebSocket] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(15);
  const [viewMode, setViewMode] = useState<'pipeline'>('pipeline');
  const [visionComponents, setVisionComponents] = useState<VisionComponent[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [loadingVisionData, setLoadingVisionData] = useState<boolean>(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [componentsList, setComponentsList] = useState<VisionComponent[]>([]);
  const [isDrawingConnection, setIsDrawingConnection] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<{nodeId: string, x: number, y: number} | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{x: number, y: number} | null>(null);
  const [possibleConnectionTargets, setPossibleConnectionTargets] = useState<string[]>([]);

  const fetchStream = async (silentUpdate = false) => {
    if (!id) {
      setError("No stream ID provided");
      setLoading(false);
      return;
    }
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      if (!silentUpdate) {
        setLoading(true);
      }
      
      // Set the polling flag to avoid multiple concurrent requests
      if (isPollingRef.current && silentUpdate) {
        return;
      }
      isPollingRef.current = true;
      
      const data = await apiService.getStreamById(id);
      
      // Validate stream data
      if (!data || !data.id) {
        setError("Invalid stream data received");
        setStream(null);
      } else {
        // Only update the stream if data has actually changed
        // to prevent unnecessary rerenders
        setStream(prevStream => {
          // Skip update if nothing has changed
          if (prevStream && 
              prevStream.id === data.id && 
              prevStream.status === data.status) {
            return prevStream;
          }
          return data;
        });
        setError(null);
      }
    } catch (err) {
      // Don't set error during silent updates to avoid flickering
      if (!silentUpdate) {
        setError('Failed to load stream details. The stream may not exist or the API server might be down.');
        console.error('Error fetching stream:', err);
      }
    } finally {
      if (!silentUpdate) {
        setLoading(false);
      }
      isPollingRef.current = false;
    }
  };

  // Fetch vision components
  const fetchVisionComponents = async () => {
    if (!id) return;
    
    try {
      setLoadingVisionData(true);
      console.log("Fetching vision components...");
      const components = await getVisionComponents();
      console.log("Received components:", components);
      
      // Explicitly check and log model classes if available
      const hasModelClasses = components.some(c => c.model_classes || c.available_models);
      if (hasModelClasses) {
        console.log("Found model classes in component data");
      } else {
        console.warn("No model classes found in component data - adding defaults");
      }
      
      // Check if we have detector components and ensure they have model_classes
      const enhancedComponents = components.map(component => {
        // Ensure detector components have model_classes
        if (component.category === 'detector' && !component.model_classes) {
          console.log(`Adding default model_classes to ${component.id}`);
          return {
            ...component,
            model_classes: {
              "yolov4": ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"],
              "yolov8": ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"]
            }
          };
        }
        return component;
      });
      
      setVisionComponents(enhancedComponents);
    } catch (err) {
      console.error('Error fetching vision components:', err);
      setError(`Error loading vision components: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Even on error, provide some default components
      const defaultComponents: VisionComponent[] = [
        {
          id: 'camera_feed',
          name: 'Camera Feed',
          category: 'source' as 'source',
          type: 'source',
          description: 'Stream video input',
          inputs: [],
          outputs: ['image']
        },
        {
          id: 'object_detector',
          name: 'Object Detector',
          category: 'detector' as 'detector',
          type: 'detector',
          description: 'Detects objects in video frames',
          inputs: ['image'],
          outputs: ['detections'],
          model_classes: {
            "yolov4": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat"]
          }
        },
        {
          id: 'annotated_stream',
          name: 'Annotated Stream',
          category: 'sink' as 'sink',
          type: 'sink',
          description: 'Displays annotated video stream',
          inputs: ['image', 'detections'],
          outputs: []
        }
      ];
      setVisionComponents(defaultComponents);
      
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    } finally {
      setLoadingVisionData(false);
    }
  };

  // Fetch pipelines for the stream
  const fetchPipelines = async () => {
    if (!id) return;
    
    try {
      setLoadingVisionData(true);
      console.log("Fetching pipelines for stream:", id);
      
      try {
        const pipelineData = await getPipelinesForStream(id);
        console.log("Received pipelines:", pipelineData);
        
        // Check that pipelines have connections
        if (pipelineData.length > 0) {
          pipelineData.forEach((pipeline: any) => {
            console.log(`Pipeline ${pipeline.id} has ${pipeline.nodes.length} nodes`);
            
            // Log all connections for debugging
            pipeline.nodes.forEach((node: any) => {
              if (node.connections && node.connections.length > 0) {
                console.log(`Node ${node.id} (${node.componentId}) connects to:`, node.connections);
              } else {
                console.log(`Node ${node.id} (${node.componentId}) has NO connections`);
              }
            });
          });
        }
        
        setPipelines(pipelineData);
        
        // If there are pipelines and no active pipeline is set yet, use the first one
        if (pipelineData.length > 0 && !activePipeline) {
          console.log("Setting initial pipeline from list:", pipelineData[0]);
          setActivePipeline(pipelineData[0]);
        }
      } catch (err) {
        console.error('Error fetching pipelines list:', err);
        // Continue with empty pipelines list
        setPipelines([]);
      }
      
      // Also get the active pipeline
      console.log("Fetching active pipeline...");
      try {
        const activePipelineData = await getActivePipeline(id);
        console.log("Received active pipeline data:", activePipelineData);
        
        // Only update active pipeline if one was returned as active
        if (activePipelineData.active && activePipelineData.pipeline) {
          console.log("Setting active pipeline from API:", activePipelineData.pipeline);
          
          // Check that pipeline has connections
          const pipeline = activePipelineData.pipeline;
          pipeline.nodes.forEach((node: any) => {
            if (node.connections && node.connections.length > 0) {
              console.log(`Node ${node.id} (${node.componentId}) connects to:`, node.connections);
            } else {
              console.log(`Node ${node.id} (${node.componentId}) has NO connections`);
            }
          });
          
          setActivePipeline(activePipelineData.pipeline);
        } else if (pipelines.length > 0 && !activePipeline) {
          // If no active pipeline but we have pipelines, use the first one
          console.log("No active pipeline returned, using first from list:", pipelines[0]);
          setActivePipeline(pipelines[0]);
        }
      } catch (err) {
        console.error('Error fetching active pipeline:', err);
        // If we have pipelines but no active pipeline, use the first one
        if (pipelines.length > 0 && !activePipeline) {
          console.log("Error getting active pipeline, using first from list:", pipelines[0]);
          setActivePipeline(pipelines[0]);
        }
      }
      
    } catch (err) {
      console.error('Error in pipeline fetching process:', err);
      // Show a temporary error notification but don't block the UI
      setError(`Error loading pipelines: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    } finally {
      setLoadingVisionData(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStream();
    
    // Refresh stream details every 5 seconds
    const intervalId = window.setInterval(() => {
      fetchStream(true); // Silent update
    }, 5000);
    
    // Store the interval ID in the ref for cleanup
    pollIntervalRef.current = intervalId;
    
    return () => {
      // Clear polling interval on unmount
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  // Effect to fetch vision data when loading the page if stream is running
  useEffect(() => {
    if (stream?.status === 'running') {
      fetchVisionComponents();
      fetchPipelines();
    }
  }, [stream?.status, id]);

  // Added effect to update model classes in the active pipeline when components are loaded
  useEffect(() => {
    // If we have both components and an active pipeline, enhance the pipeline with model classes
    if (visionComponents.length > 0 && activePipeline) {
      console.log("Enhancing active pipeline with model classes from components");
      
      // Create a map of component IDs to model_classes
      const componentModelClasses: Record<string, any> = {};
      visionComponents.forEach(component => {
        if (component.model_classes) {
          componentModelClasses[component.id] = component.model_classes;
        }
      });
      
      // Deep clone the active pipeline
      const enhancedPipeline = JSON.parse(JSON.stringify(activePipeline));
      let needsUpdate = false;
      
      // Update each node in the pipeline that's a detector
      enhancedPipeline.nodes.forEach((node: any) => {
        const component = visionComponents.find(c => c.id === node.componentId);
        if (component?.category === 'detector' && componentModelClasses[node.componentId]) {
          if (!node.config) {
            node.config = {};
          }
          
          // Only update if the node doesn't already have model_classes
          if (!node.config.model_classes) {
            console.log(`Adding model_classes to node ${node.id} (${node.componentId})`);
            node.config.model_classes = componentModelClasses[node.componentId];
            needsUpdate = true;
            
            // If node has a model but no classes, set default classes
            if (node.config.model && !node.config.classes) {
              const model = node.config.model;
              const classes = node.config.model_classes[model];
              if (classes && classes.length > 0) {
                console.log(`Setting default classes for model ${model} in node ${node.id}`);
                node.config.classes = classes.slice(0, 5); // Take first 5 classes as default
                needsUpdate = true;
              }
            }
          }
        }
      });
      
      // Only update if changes were made
      if (needsUpdate) {
        console.log("Updating active pipeline with enhanced model classes");
        setActivePipeline(enhancedPipeline);
      }
    }
  }, [visionComponents, activePipeline]);

  const handleStartStream = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await apiService.startStream(id);
      fetchStream();
    } catch (err) {
      setError('Failed to start stream. Please try again.');
      console.error('Error starting stream:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopStream = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await apiService.stopStream(id);
      fetchStream();
    } catch (err) {
      setError('Failed to stop stream. Please try again.');
      console.error('Error stopping stream:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStream = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this stream?')) {
      try {
        setActionLoading(true);
        await apiService.deleteStream(id);
        navigate('/');
      } catch (err) {
        setError('Failed to delete stream. Please try again.');
        console.error('Error deleting stream:', err);
        setActionLoading(false);
      }
    }
  };

  const handleSavePipeline = async (pipeline: Pipeline) => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      
      let savedPipeline;
      
      console.log("Saving pipeline:", pipeline);
      console.log("Checking connections before save:");
      pipeline.nodes.forEach((node: any) => {
        if (node.connections && node.connections.length > 0) {
          console.log(`Node ${node.id} (${node.componentId}) connects to:`, node.connections);
        } else {
          console.log(`Node ${node.id} (${node.componentId}) has NO connections`);
        }
      });
      
      // Check if this pipeline already exists in our known pipelines list
      const existingPipeline = pipelines.find(p => p.id === pipeline.id);
      
      console.log("Existing pipelines:", pipelines);
      console.log("Is existing pipeline:", !!existingPipeline);
      
      // Make a deep copy of the pipeline to avoid reference issues
      const pipelineToSave = JSON.parse(JSON.stringify(pipeline));
      
      if (existingPipeline) {
        // Update existing pipeline
        console.log("Updating existing pipeline:", pipeline.id);
        savedPipeline = await updatePipeline(id, pipeline.id, pipelineToSave);
      } else {
        // Create new pipeline - don't use the client-generated ID
        console.log("Creating new pipeline");
        const { id: generatedId, ...pipelineWithoutId } = pipelineToSave;
        savedPipeline = await createPipeline(id, pipelineWithoutId);
      }
      
      console.log('Pipeline saved:', savedPipeline);
      
      // If the pipeline should be activated
      if (pipeline.active) {
        await activatePipeline(id, savedPipeline.id);
      }
      
      // Explicitly force complete refresh of all pipeline data
      // First fetching the list, then setting the active pipeline directly
      const updatedPipelines = await getPipelinesForStream(id);
      
      // Check connections in the updated pipelines
      if (updatedPipelines.length > 0) {
        console.log("Checking connections in updated pipelines:");
        updatedPipelines.forEach((pipeline: any) => {
          console.log(`Pipeline ${pipeline.id} has ${pipeline.nodes.length} nodes`);
          pipeline.nodes.forEach((node: any) => {
            if (node.connections && node.connections.length > 0) {
              console.log(`Node ${node.id} (${node.componentId}) connects to:`, node.connections);
            } else {
              console.log(`Node ${node.id} (${node.componentId}) has NO connections`);
            }
          });
        });
      }
      
      setPipelines(updatedPipelines);
      
      // If we successfully activated this pipeline, update the activePipeline state
      // with the complete data from the API
      if (pipeline.active) {
        const matchingPipeline = updatedPipelines.find(p => p.id === savedPipeline.id);
        if (matchingPipeline) {
          console.log("Setting active pipeline after save:", matchingPipeline);
          
          // Check connections in active pipeline
          console.log("Checking connections in active pipeline:");
          matchingPipeline.nodes.forEach((node: any) => {
            if (node.connections && node.connections.length > 0) {
              console.log(`Node ${node.id} (${node.componentId}) connects to:`, node.connections);
            } else {
              console.log(`Node ${node.id} (${node.componentId}) has NO connections`);
            }
          });
          
          setActivePipeline(matchingPipeline);
        }
      }
      
    } catch (err) {
      console.error('Error saving pipeline:', err);
      // The error message is now handled by the VisionPipelineBuilder component
    } finally {
      setActionLoading(false);
    }
  };

  // This function will be passed to VisionPipelineBuilder to enable showing the stream view
  const renderCameraFeedPreview = () => {
    if (!id || stream?.status !== 'running') {
      return (
        <div className="camera-feed-preview-placeholder">
          Stream is not running
        </div>
      );
    }

    return (
      <div className="camera-feed-preview">
        <StreamView 
          streamId={id} 
          refreshRate={1000} 
          width="100%" 
          height="auto"
        />
        <button 
          className="preview-enlarge-btn" 
          onClick={() => setIsStreamModalOpen(true)}
        >
          Enlarge Stream View
        </button>
      </div>
    );
  };

  useEffect(() => {
    // Make componentsList accessible to the VisionPipelineBuilder
    setComponentsList(visionComponents);
    console.log("Updated componentsList with fetched components:", visionComponents);
    
    // Add a debug log to check the model_classes
    const detectorsWithClasses = visionComponents.filter(c => 
      c.category === 'detector' && c.model_classes
    );
    
    if (detectorsWithClasses.length > 0) {
      console.log("Detectors with model classes:", 
        detectorsWithClasses.map(d => ({
          id: d.id,
          models: Object.keys(d.model_classes || {})
        }))
      );
    }
  }, [visionComponents]);

  if (loading) {
    return <div className="loading">Loading stream details...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button 
          className="btn" 
          style={{ marginTop: '10px' }}
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="card">
        <div className="error">Stream not found or invalid data received</div>
        <button 
          className="btn" 
          style={{ marginTop: '10px' }}
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="stream-details-container">
      <header className="details-header">
        <h1>{stream.name || 'Unnamed Stream'}</h1>
        <button className="btn" onClick={() => fetchStream()}>
          Refresh
        </button>
      </header>

      <div className="card" style={{ margin: '20px 0' }}>
        {loadingVisionData ? (
          <div className="loading-indicator">Loading vision components...</div>
        ) : error ? (
          <div className="error" style={{ marginBottom: '15px', padding: '10px' }}>
            {error}
            <button 
              className="btn btn-small" 
              style={{ marginLeft: '10px' }}
              onClick={() => {
                setError(null);
                fetchVisionComponents();
                fetchPipelines();
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <VisionPipelineBuilder 
            streamId={stream.id}
            streamName={stream.name || 'Unnamed Stream'}
            streamSource={stream.source}
            streamType={(stream.type as 'camera' | 'file' | 'rtsp') || 'camera'}
            streamStatus={stream.status}
            streamResolution={stream.width && stream.height ? `${stream.width}x${stream.height}` : undefined}
            streamFps={stream.fps}
            onSave={handleSavePipeline}
            onStartStream={handleStartStream}
            onStopStream={handleStopStream}
            onDeleteStream={handleDeleteStream}
            actionLoading={actionLoading}
            availableComponents={visionComponents}
            initialPipeline={activePipeline}
            renderCameraFeedPreview={renderCameraFeedPreview}
            key={`pipeline-builder-${visionComponents.length > 0 ? 'loaded' : 'loading'}`}
          />
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          className="btn" 
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Modal for enlarged stream view */}
      <Modal 
        isOpen={isStreamModalOpen} 
        onClose={() => setIsStreamModalOpen(false)}
      >
        <div className="stream-modal-content">
          <h3>Stream View</h3>
          <div className="stream-modal-settings">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={useWebSocket} 
                  onChange={(e) => setUseWebSocket(e.target.checked)} 
                  style={{ marginRight: '5px' }}
                />
                Use WebSocket (Experimental)
              </label>
            </div>
          </div>
          
          <div className="stream-view-container">
            {useWebSocket ? (
              <StreamViewWS 
                key={`ws-modal-${stream.id}`}
                streamId={stream.id} 
                fps={fps} 
                width="100%" 
                height="100%"
              />
            ) : (
              <StreamView 
                key={`http-modal-${stream.id}-${Date.now()}`} 
                streamId={stream.id} 
                refreshRate={1000} 
                width="100%"
                height="100%"
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StreamDetails; 