import { useState, useEffect } from 'react';
import apiService, { getStreamAlarms, hasPipelineComponent } from '../services/api';
import AlarmModal from './AlarmModal';

interface StreamViewProps {
  streamId: string;
}

const StreamView = ({ streamId }: StreamViewProps) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasAlarms, setHasAlarms] = useState<boolean>(false);
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [hasAlarmComponent, setHasAlarmComponent] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);

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
    }, 1000); // Refresh every second
    
    return () => clearInterval(intervalId);
  }, [streamId]);

  const handleAlarmClick = () => {
    setShowAlarmModal(true);
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="stream-view-container">
      <div className="stream-view" style={{ position: 'relative' }}>
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
          <img 
            src={imageUrl} 
            alt="Stream view" 
            className="stream-image"
            style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }}
            onError={() => setImageUrl('/placeholder-error.jpg')}
          />
        ) : (
          <div 
            style={{ 
              backgroundColor: '#eee',
              width: '100%',
              height: '70vh',
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