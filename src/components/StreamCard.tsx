import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stream } from '../services/api';
import apiService from '../services/api';

interface StreamCardProps {
  stream: Stream;
}

const StreamCard = ({ stream }: StreamCardProps) => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string>('');

  // Validate stream has required properties
  const isValidStream = stream && stream.id && stream.status;
  
  // Set a safe status
  const status = isValidStream ? stream.status : 'error';

  useEffect(() => {
    if (isValidStream && status === 'running') {
      // Initial image load
      setImageUrl(apiService.getFrameUrlWithTimestamp(stream.id));
      
      // Set up periodic refresh for running streams
      const intervalId = setInterval(() => {
        setImageUrl(apiService.getFrameUrlWithTimestamp(stream.id));
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [isValidStream, stream.id, status]);

  const handleClick = () => {
    if (isValidStream) {
      navigate(`/streams/${stream.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#27ae60'; // Green
      case 'stopped':
        return '#e74c3c'; // Red
      case 'error':
        return '#e74c3c'; // Red
      default:
        return '#f39c12'; // Orange for 'created'
    }
  };

  if (!isValidStream) {
    return (
      <div className="card stream-card">
        <div className="stream-img" style={{ 
          backgroundColor: '#eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          INVALID STREAM
        </div>
        <h3>Invalid Stream Data</h3>
        <div className="error">This stream has missing or invalid data</div>
      </div>
    );
  }

  return (
    <div className="card stream-card" onClick={handleClick}>
      {status === 'running' ? (
        imageUrl ? (
          <img 
            src={imageUrl} 
            alt={stream.name || 'Unnamed Stream'} 
            className="stream-img"
            onError={() => setImageUrl('/placeholder-error.jpg')}
          />
        ) : (
          <div 
            className="stream-img" 
            style={{ 
              backgroundColor: '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            LOADING...
          </div>
        )
      ) : (
        <div 
          className="stream-img" 
          style={{ 
            backgroundColor: '#eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}
        >
          {status.toUpperCase()}
        </div>
      )}
      
      <h3>{stream.name || 'Unnamed Stream'}</h3>
      
      <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center' }}>
        <div 
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(status),
            marginRight: '8px'
          }}
        />
        <span>{status}</span>
      </div>
      
      <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
        <span>Type: {stream.type || 'unknown'}</span>
        {stream.width && stream.height && (
          <span style={{ marginLeft: '10px' }}>
            {stream.width}x{stream.height}
          </span>
        )}
      </div>
    </div>
  );
};

export default StreamCard; 