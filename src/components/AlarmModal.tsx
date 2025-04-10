import { useState, useEffect } from 'react';
import { AlarmEvent, getStreamAlarms } from '../services/api';

interface AlarmModalProps {
  streamId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AlarmModal = ({ streamId, isOpen, onClose }: AlarmModalProps) => {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAlarms = async () => {
      if (!isOpen || !streamId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getStreamAlarms(streamId);
        if (mounted) {
          setAlarms(data);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load alarm data');
          console.error('Error fetching alarms:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAlarms();
    
    return () => {
      mounted = false;
    };
  }, [streamId, isOpen]);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString() + ' ' + new Date(timestamp).toLocaleDateString();
  };

  const handleBackdropClick = () => {
    setEnlargedImage(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content alarm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Stream Alarms</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <div>Loading alarm data...</div>
            </div>
          )}
          
          {error && <div className="error">{error}</div>}
          
          {!loading && !error && alarms.length === 0 && (
            <div className="no-alarms">
              <div className="no-alarms-icon">🔔</div>
              <div>No alarms recorded for this stream.</div>
            </div>
          )}
          
          {!loading && !error && alarms.length > 0 && (
            <div className="alarm-table">
              <div className="alarm-table-header">
                <div className="alarm-col timestamp">Time</div>
                <div className="alarm-col detection">Detection</div>
                <div className="alarm-col image">Image</div>
              </div>
              <div className="alarm-table-body">
                {alarms.map((alarm, index) => (
                  <div key={`${alarm.timestamp}-${index}`} className="alarm-row">
                    <div className="alarm-col timestamp">
                      {formatTimestamp(alarm.timestamp)}
                    </div>
                    <div className="alarm-col detection">
                      {alarm.objectClass && (
                        <div className={`detection-pill ${alarm.objectClass.toLowerCase()}`}>
                          <span className="object-class">{alarm.objectClass}</span>
                          {alarm.confidence !== undefined && (
                            <span className="confidence">
                              {Math.round(alarm.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="alarm-col image">
                      {alarm.objectImageBase64 && (
                        <div 
                          className="thumbnail-container"
                          onMouseEnter={() => setEnlargedImage(`data:image/jpeg;base64,${alarm.objectImageBase64}`)}
                          onMouseLeave={() => setEnlargedImage(null)}
                        >
                          <img 
                            src={`data:image/jpeg;base64,${alarm.objectImageBase64}`} 
                            alt={`Object: ${alarm.objectClass || 'unknown'}`}
                            className="thumbnail"
                            onError={(e) => {
                              console.error('Failed to load image', e);
                              e.currentTarget.src = '';
                              e.currentTarget.classList.add('image-error');
                              e.currentTarget.parentElement?.setAttribute('data-error', 'Image failed to load');
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {enlargedImage && (
        <div className="enlarged-image-container">
          <img src={enlargedImage} alt="Enlarged view" />
        </div>
      )}
    </div>
  );
};

export default AlarmModal; 