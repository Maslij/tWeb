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
  const [visionComponents, setVisionComponents] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [activePipeline, setActivePipeline] = useState<any>(null);
  const [loadingVisionData, setLoadingVisionData] = useState<boolean>(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

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
      setVisionComponents(components);
    } catch (err) {
      console.error('Error fetching vision components:', err);
      // Show a temporary error notification but don't block the UI
      setError(`Error loading vision components: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  // Fetch vision data when loading the page if stream is running
  useEffect(() => {
    if (stream?.status === 'running') {
      fetchVisionComponents();
      fetchPipelines();
    }
  }, [stream?.status, id]);

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

  const handleSavePipeline = async (pipeline: any) => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      
      let savedPipeline;
      
      // Check if this pipeline already exists in our known pipelines list
      const existingPipeline = pipelines.find(p => p.id === pipeline.id);
      
      console.log("Saving pipeline:", pipeline);
      console.log("Existing pipelines:", pipelines);
      console.log("Is existing pipeline:", !!existingPipeline);
      
      if (existingPipeline) {
        // Update existing pipeline
        console.log("Updating existing pipeline:", pipeline.id);
        savedPipeline = await updatePipeline(id, pipeline.id, pipeline);
      } else {
        // Create new pipeline - don't use the client-generated ID
        console.log("Creating new pipeline");
        const { id: generatedId, ...pipelineWithoutId } = pipeline;
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
      setPipelines(updatedPipelines);
      
      // If we successfully activated this pipeline, update the activePipeline state
      // with the complete data from the API
      if (pipeline.active) {
        const matchingPipeline = updatedPipelines.find(p => p.id === savedPipeline.id);
        if (matchingPipeline) {
          console.log("Setting active pipeline after save:", matchingPipeline);
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