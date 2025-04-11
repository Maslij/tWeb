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
            font-size: 1.5rem;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0 0 1rem 0;
          }
          
          .card p {
            color: #86868b;
            margin: 0 0 1.5rem 0;
          }
          
          .template-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
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
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s;
          }
          
          .form-control:focus {
            outline: none;
            border-color: #0071e3;
            box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2);
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
            width: 18px;
            height: 18px;
            border-radius: 4px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            cursor: pointer;
          }
          
          .form-help {
            font-size: 0.9rem;
            color: #86868b;
            margin-top: 0.5rem;
          }
        `}
      </style>

      <header className="header">
        <h1 className="title">Create New Stream</h1>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          Back to Dashboard
        </button>
      </header>

      <div className="card">
        <h3>Stream Templates</h3>
        <p>Quick start with a template:</p>
        
        <div className="template-buttons">
          <button
            className="btn btn-secondary"
            onClick={() => handleSelectTemplate({
              name: 'Webcam',
              source: '0',
              type: 'camera'
            })}
          >
            Webcam
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => handleSelectTemplate({
              name: 'Big Buck Bunny',
              source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              type: 'file'
            })}
          >
            Sample Video
          </button>
          
          <button
            className="btn btn-secondary"
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
              placeholder="My Stream"
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
            <div className="form-help">
              Use "0" for default webcam, a file path, or an RTSP URL
            </div>
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
          >
            {loading ? 'Creating...' : 'Create Stream'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateStream; 