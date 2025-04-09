import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const CreateStream = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    type: 'file',
    autoStart: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.source.trim()) {
      setError('Name and Source are required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.createStream({
        name: formData.name,
        source: formData.source,
        type: formData.type as 'camera' | 'file' | 'rtsp',
        autoStart: formData.autoStart
      });
      
      navigate(`/streams/${response.id}`);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('Failed to create stream. Please check your inputs and try again.');
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: { name: string; source: string; type: string }) => {
    setFormData({
      ...formData,
      name: template.name,
      source: template.source,
      type: template.type as 'camera' | 'file' | 'rtsp'
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Create New Stream</h1>
        <button className="btn" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>

      <div className="card">
        <h3>Stream Templates</h3>
        <p>Quick start with a template:</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            className="btn"
            onClick={() => handleSelectTemplate({
              name: 'Webcam',
              source: '0',
              type: 'camera'
            })}
          >
            Webcam
          </button>
          
          <button
            className="btn"
            onClick={() => handleSelectTemplate({
              name: 'Big Buck Bunny',
              source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              type: 'file'
            })}
          >
            Sample Video
          </button>
          
          <button
            className="btn"
            onClick={() => handleSelectTemplate({
              name: 'RTSP Stream',
              source: 'rtsp://example.com/stream',
              type: 'rtsp'
            })}
          >
            RTSP Stream
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Stream Details</h3>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Stream Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Stream"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="source">Source:</label>
            <input
              type="text"
              id="source"
              name="source"
              className="form-control"
              value={formData.source}
              onChange={handleChange}
              placeholder="Camera index, file path, or RTSP URL"
            />
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              Use "0" for default webcam, a file path, or an RTSP URL
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              name="type"
              className="form-control"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="camera">Camera</option>
              <option value="file">File</option>
              <option value="rtsp">RTSP</option>
            </select>
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="autoStart"
              name="autoStart"
              checked={formData.autoStart}
              onChange={handleChange}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="autoStart">Auto-start stream after creation</label>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStream; 