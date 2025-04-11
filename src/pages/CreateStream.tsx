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
    <div className="create-stream">
      <style>
        {`
          .create-stream {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0;
          }
          
          .actions {
            display: flex;
            gap: 1rem;
          }
          
          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 980px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
          }
          
          .btn-primary {
            background: #0071e3;
            color: white;
          }
          
          .btn-primary:hover {
            background: #0077ed;
          }
          
          .btn-secondary {
            background: rgba(0, 0, 0, 0.05);
            color: #1d1d1f;
          }
          
          .btn-secondary:hover {
            background: rgba(0, 0, 0, 0.1);
          }

          .card {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
            margin-bottom: 2rem;
          }

          .card h3 {
            color: #1d1d1f;
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
          }

          .card p {
            color: #86868b;
            margin: 0 0 1.5rem 0;
          }

          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
          }

          .template-card {
            background: #f5f5f7;
            border-radius: 12px;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .template-card:hover {
            background: #e5e5ea;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-group label {
            display: block;
            font-weight: 500;
            color: #1d1d1f;
            margin-bottom: 0.5rem;
          }

          .form-control {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #d2d2d7;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s;
          }

          .form-control:focus {
            outline: none;
            border-color: #0071e3;
            box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
          }

          .error {
            background: #fff2f2;
            color: #ff3b30;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .checkbox-group input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 6px;
            border: 1px solid #d2d2d7;
            cursor: pointer;
          }

          .help-text {
            color: #86868b;
            font-size: 0.9rem;
            margin-top: 0.5rem;
          }
        `}
      </style>

      <header className="header">
        <h1 className="title">Create New Stream</h1>
        <div className="actions">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="card">
        <h3>Stream Templates</h3>
        <p>Quick start with a template to create your vision stream</p>
        
        <div className="template-grid">
          <div 
            className="template-card"
            onClick={() => handleSelectTemplate({
              name: 'Webcam',
              source: '0',
              type: 'camera'
            })}
          >
            <h4>Webcam</h4>
            <p>Use your default camera as input</p>
          </div>
          
          <div 
            className="template-card"
            onClick={() => handleSelectTemplate({
              name: 'Big Buck Bunny',
              source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              type: 'file'
            })}
          >
            <h4>Sample Video</h4>
            <p>Start with a sample video file</p>
          </div>
          
          <div 
            className="template-card"
            onClick={() => handleSelectTemplate({
              name: 'RTSP Stream',
              source: 'rtsp://example.com/stream',
              type: 'rtsp'
            })}
          >
            <h4>RTSP Stream</h4>
            <p>Connect to an RTSP video stream</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Stream Details</h3>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Stream Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Vision Stream"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="source">Source</label>
            <input
              type="text"
              id="source"
              name="source"
              className="form-control"
              value={formData.source}
              onChange={handleChange}
              placeholder="Camera index, file path, or RTSP URL"
            />
            <p className="help-text">
              Use "0" for default webcam, a file path, or an RTSP URL
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Type</label>
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
          
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="autoStart"
              name="autoStart"
              checked={formData.autoStart}
              onChange={handleChange}
            />
            <label htmlFor="autoStart">Auto-start stream after creation</label>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating Stream...' : 'Create Stream'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateStream; 