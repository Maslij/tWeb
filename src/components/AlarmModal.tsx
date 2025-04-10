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
    
    // Set up polling for fresh alarm data
    const intervalId = setInterval(fetchAlarms, 5000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
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
          {loading && <div className="loading">Loading alarm data...</div>}
          
          {error && <div className="error">{error}</div>}
          
          {!loading && !error && alarms.length === 0 && (
            <div className="no-alarms">No alarms recorded for this stream.</div>
          )}
          
          {!loading && !error && alarms.length > 0 && (
            <div className="alarm-list">
              {alarms.map((alarm, index) => (
                <div key={`${alarm.timestamp}-${index}`} className="alarm-item">
                  <div className="alarm-header">
                    <span className="alarm-time">{formatTimestamp(alarm.timestamp)}</span>
                    {alarm.objectClass && (
                      <span className="alarm-class">
                        {alarm.objectClass}
                        {alarm.confidence !== undefined && (
                          <span className="alarm-confidence">
                            {Math.round(alarm.confidence * 100)}%
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="alarm-message">{alarm.message}</div>
                  
                  {alarm.objectImageBase64 && (
                    <div className="alarm-bbox">
                      <h4>Detected Object</h4>
                      <div className="bbox-info">
                        <div className="bbox-values">
                          <div>X: {alarm.boundingBox?.x || 'N/A'}</div>
                          <div>Y: {alarm.boundingBox?.y || 'N/A'}</div>
                          <div>Width: {alarm.boundingBox?.width || 'N/A'}</div>
                          <div>Height: {alarm.boundingBox?.height || 'N/A'}</div>
                        </div>
                        <div className="bbox-preview">
                          <div className="object-image">
                            <img 
                              src={`data:image/jpeg;base64,${alarm.objectImageBase64}`} 
                              alt={`Object: ${alarm.objectClass || 'unknown'}`}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100px',
                                border: `2px solid ${alarm.objectClass === 'person' ? '#ff0000' : '#00ff00'}`
                              }}
                              onError={(e) => {
                                console.error('Failed to load image', e);
                                // If image fails to load, remove the src to prevent fallback icon
                                e.currentTarget.src = '';
                                // Add error class to show something is wrong
                                e.currentTarget.classList.add('image-error');
                                // Add error text
                                e.currentTarget.parentElement?.setAttribute('data-error', 'Image failed to load');
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {alarm.boundingBox && !alarm.objectImageBase64 && (
                    <div className="alarm-bbox">
                      <h4>Detected Object (Bounding Box Only)</h4>
                      <div className="bbox-info">
                        <div className="bbox-values">
                          <div>X: {alarm.boundingBox.x}</div>
                          <div>Y: {alarm.boundingBox.y}</div>
                          <div>Width: {alarm.boundingBox.width}</div>
                          <div>Height: {alarm.boundingBox.height}</div>
                        </div>
                        <div className="bbox-preview">
                          <div 
                            className="bbox-visual" 
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '100px',
                              backgroundColor: '#f0f0f0',
                              border: '1px solid #ccc',
                              overflow: 'hidden'
                            }}
                          >
                            <div 
                              style={{
                                position: 'absolute',
                                border: `2px solid ${alarm.objectClass === 'person' ? '#ff0000' : '#00ff00'}`,
                                background: `${alarm.objectClass === 'person' ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)'}`,
                                left: '25%',
                                top: '25%',
                                width: '50%',
                                height: '50%'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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