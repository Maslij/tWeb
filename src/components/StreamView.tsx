import { useState, useEffect } from 'react';
import apiService, { getStreamAlarms, hasPipelineComponent, isPipelineProcessing, getActivePipeline } from '../services/api';
import AlarmModal from './AlarmModal';
import '../styles/StreamView.css';

interface StreamViewProps {
  streamId: string;
  width?: string | number;
  height?: string | number;
  refreshRate?: number;
}

const StreamView = ({ streamId, width = '100%', height = 'auto', refreshRate = 1000 }: StreamViewProps) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [pipelineProcessing, setPipelineProcessing] = useState<boolean>(false);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);

  // Check if the stream has an EventAlarm component
  useEffect(() => {
    if (!streamId) return;

    let mounted = true;
    
    const checkForAlarmComponent = async () => {
      try {
        const hasComponent = await hasPipelineComponent(streamId, 'EventAlarm');
        if (mounted) {
          setHasAlarmComponent(hasComponent);
        }
      } catch (error) {
        console.error('Error checking for alarm component:', error);
      }
    };
    
    checkForAlarmComponent();
    
    return () => {
      mounted = false;
    };
  }, [streamId]);

  // Check for active pipeline and its processing state
  useEffect(() => {
    if (!streamId) return;

    let mounted = true;
    
    const checkPipelineState = async () => {
      try {
        // Get active pipeline ID
        const activePipeline = await getActivePipeline(streamId);
        if (!mounted) return;
        
        if (activePipeline && activePipeline.active && activePipeline.pipelineId) {
          setActivePipelineId(activePipeline.pipelineId);
          
          // Check if pipeline is processing
          const isProcessing = await isPipelineProcessing(streamId, activePipeline.pipelineId);
          if (mounted) {
            setPipelineProcessing(isProcessing);
          }
        } else {
          setActivePipelineId(null);
          setPipelineProcessing(false);
        }
      } catch (error) {
        console.error('Error checking pipeline state:', error);
        if (mounted) {
          setPipelineProcessing(false);
        }
      }
    };
    
    // Check immediately
    checkPipelineState();
    
    // Set up interval for checking
    const intervalId = setInterval(checkPipelineState, 3000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [streamId]);

  // Check for alarms if the stream has an EventAlarm component
  useEffect(() => {
    if (!streamId || !hasAlarmComponent) return;

    let mounted = true;
    
    const checkForAlarms = async () => {
      try {
        const alarms = await getStreamAlarms(streamId);
        if (mounted) {
          setHasAlarms(alarms.length > 0);
          setAlarmCount(alarms.length);
        }
      } catch (error) {
        console.error('Error checking for alarms:', error);
      }
    };
    
    // Initial check
    checkForAlarms();
    
    // Set up periodic checks
    const intervalId = setInterval(checkForAlarms, 5000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [streamId, hasAlarmComponent]);

  useEffect(() => {
    if (!streamId) {
      setError('Missing stream ID');
      return;
    }

    // Initial image load
    setImageUrl(apiService.getFrameUrlWithTimestamp(streamId));
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      setImageUrl(apiService.getFrameUrlWithTimestamp(streamId));
    }, refreshRate); // Use the refreshRate prop
    
    return () => clearInterval(intervalId);
  }, [streamId, refreshRate]); // Add refreshRate to dependencies

  const handleAlarmClick = () => {
    setShowAlarmModal(true);
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stream-view-container">
      <div className="stream-view" style={{ position: 'relative' }}>
        {/* Add pipeline processing indicator */}
        {pipelineProcessing && (
          <div className="pipeline-processing-indicator">
            <div className="processing-spinner"></div>
            <span>Updating pipeline...</span>
          </div>
        )}
        
        {hasAlarmComponent && hasAlarms && (
          <div 
            className={`alarm-indicator ${alarmCount > 0 ? 'alarm-pulse' : ''}`}
            onClick={handleAlarmClick}
            style={{ 
              top: '20px', 
              right: '20px', 
              width: '30px', 
              height: '30px',
              fontSize: '1.1rem'
            }}
          >
            {alarmCount > 99 ? '99+' : alarmCount}
          </div>
        )}
        
        {imageUrl ? (
          <div className={`stream-image-container ${pipelineProcessing ? 'processing' : ''}`}>
            <img 
              src={imageUrl} 
              alt="Stream view" 
              className="stream-image"
              style={{ width, height, maxHeight: '70vh', objectFit: 'contain' }}
              onError={() => setImageUrl('/placeholder-error.jpg')}
            />
            
            {/* Show processing overlay on the image */}
            {pipelineProcessing && (
              <div className="image-processing-overlay">
                <div className="processing-text">Applying pipeline changes...</div>
              </div>
            )}
          </div>
        ) : (
          <div 
            style={{ 
              backgroundColor: '#eee',
              width,
              height: height === 'auto' ? '70vh' : height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontWeight: 'bold',
              fontSize: '1.5rem'
            }}
          >
            LOADING...
          </div>
        )}
      </div>
      
      {showAlarmModal && (
        <AlarmModal
          streamId={streamId}
          isOpen={showAlarmModal}
          onClose={() => setShowAlarmModal(false)}
        />
      )}
    </div>
  );
};

export default StreamView; 