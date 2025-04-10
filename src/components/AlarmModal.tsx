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
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content alarm-modal">
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
            <div className="alarm-list">
              {alarms.map((alarm, index) => (
                <div key={`${alarm.timestamp}-${index}`} className={`alarm-item ${alarm.objectClass === 'person' ? 'alarm-item-person' : 'alarm-item-object'}`}>
                  <div className="alarm-header">
                    <span className="alarm-time">
                      <i className="fas fa-clock"></i> {formatTimestamp(alarm.timestamp)}
                    </span>
                  </div>
                  
                  <div className="alarm-content">
                    <div className="alarm-message">
                      <i className="fas fa-bell"></i> {alarm.message}
                    </div>
                    
                    {alarm.objectImageBase64 && (
                      <div className="alarm-image-container">
                        <img 
                          src={`data:image/jpeg;base64,${alarm.objectImageBase64}`} 
                          alt={`Object: ${alarm.objectClass || 'unknown'}`}
                          onError={(e) => {
                            console.error('Failed to load image', e);
                            e.currentTarget.src = '';
                            e.currentTarget.classList.add('image-error');
                            e.currentTarget.parentElement?.setAttribute('data-error', 'Image failed to load');
                          }}
                        />
                        {alarm.objectClass && (
                          <div className="alarm-detection-info">
                            <span className="detection-label">{alarm.objectClass}</span>
                            {alarm.confidence !== undefined && (
                              <span className="detection-confidence">
                                {Math.round(alarm.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlarmModal; 