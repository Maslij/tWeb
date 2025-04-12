import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';

const CreateStream = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    type: 'file' as 'camera' | 'file' | 'rtsp',
    autoStart: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [formValid, setFormValid] = useState(false);

  useEffect(() => {
    // Validate form to enable/disable submit button
    const isValid = formData.name.trim() !== '' && formData.source.trim() !== '';
    setFormValid(isValid);
  }, [formData]);

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
    
    if (!formValid) {
      setError('Name and Source are required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.createStream({
        name: formData.name,
        source: formData.source,
        type: formData.type,
        autoStart: formData.autoStart
      });
      
      navigate(`/streams/${response.id}`);
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('Failed to create stream. Please check your inputs and try again.');
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: { id: string; name: string; source: string; type: 'camera' | 'file' | 'rtsp'; description: string }) => {
    setFormData({
      ...formData,
      name: template.name,
      source: template.source,
      type: template.type
    });
    setActiveTemplate(template.id);
  };

  const templates = [
    {
      id: 'webcam',
      name: 'Webcam',
      source: '0',
      type: 'camera' as const,
      description: 'Use your default camera as input',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 10L19.5528 7.72361C19.8343 7.58281 20 7.29176 20 6.97631V17.0237C20 17.3392 19.8343 17.6302 19.5528 17.771L15 15.5V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      id: 'sample',
      name: 'Big Buck Bunny',
      source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'file' as const,
      description: 'Start with a sample video file',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.5 14H17.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.5 9.5L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.5 10H8.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 16.0022C21 16.5527 20.5523 17 20 17H4C3.44772 17 3 16.5527 3 16.0022V7.99782C3 7.44733 3.44772 7 4 7H20C20.5523 7 21 7.44733 21 7.99782V16.0022Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      id: 'rtsp',
      name: 'RTSP Stream',
      source: 'rtsp://example.com/stream',
      type: 'rtsp' as const,
      description: 'Connect to an RTSP video stream',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 8.5C14 8.5 15.5 9.5 15.5 12C15.5 14.5 14 15.5 14 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 6C17 6 20 8 20 12C20 16 17 18 17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 8.5C10 8.5 8.5 9.5 8.5 12C8.5 14.5 10 15.5 10 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 6C7 6 4 8 4 12C4 16 7 18 7 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <div className="create-stream">
      <style>
        {`
          .create-stream {
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            position: sticky;
            top: 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            background-color: rgba(255, 255, 255, 0.85);
            z-index: 100;
            padding: 1rem 0;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary, #1d1d1f);
            margin: 0;
            letter-spacing: -0.5px;
          }
          
          .actions {
            display: flex;
            gap: 0.75rem;
          }
          
          .btn {
            padding: 0.75rem 1.25rem;
            border-radius: 980px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .btn svg {
            width: 16px;
            height: 16px;
          }
          
          .btn-primary {
            background: var(--accent-color, #0071e3);
            color: white;
          }
          
          .btn-primary:hover:not(:disabled) {
            background: var(--accent-hover, #0077ed);
            transform: scale(1.02);
          }
          
          .btn-primary:disabled {
            background: var(--accent-disabled, #76b6ee);
            cursor: not-allowed;
            opacity: 0.7;
          }
          
          .btn-secondary {
            background: var(--hover-bg, rgba(0, 0, 0, 0.05));
            color: var(--text-primary, #1d1d1f);
          }
          
          .btn-secondary:hover {
            background: var(--button-hover, rgba(0, 0, 0, 0.1));
          }

          .card {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
            margin-bottom: 2rem;
            transition: box-shadow 0.3s ease;
          }

          .card h3 {
            color: var(--text-primary, #1d1d1f);
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
            letter-spacing: -0.3px;
          }

          .card p {
            color: var(--text-secondary, #86868b);
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
          }

          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
          }

          .template-card {
            background: var(--background-secondary, #f5f5f7);
            border-radius: 16px;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            position: relative;
            border: 2px solid transparent;
          }

          .template-card:hover {
            background: var(--background-hover, #e5e5ea);
          }
          
          .template-card.active {
            border-color: var(--accent-color, #0071e3);
            background: rgba(0, 113, 227, 0.05);
          }
          
          .template-card.active::after {
            content: '';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--accent-color, #0071e3);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
            background-size: 10px;
            background-position: center;
            background-repeat: no-repeat;
          }
          
          .template-icon {
            width: 40px;
            height: 40px;
            color: var(--accent-color, #0071e3);
            margin-bottom: 1rem;
          }

          .template-card h4 {
            color: var(--text-primary, #1d1d1f);
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
          }

          .template-card p {
            color: var(--text-secondary, #86868b);
            font-size: 0.9rem;
            margin: 0;
          }

          .form-section {
            margin-bottom: 2rem;
          }
          
          .form-heading {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary, #1d1d1f);
            margin: 0 0 1.5rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-group label {
            display: block;
            font-weight: 500;
            color: var(--text-primary, #1d1d1f);
            margin-bottom: 0.5rem;
          }

          .form-control {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border-color, #d2d2d7);
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }

          .form-control:focus {
            outline: none;
            border-color: var(--accent-color, #0071e3);
            box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
          }
          
          .form-control::placeholder {
            color: var(--text-tertiary, #aaa);
          }

          .error-message {
            background: rgba(255, 59, 48, 0.08);
            color: #ff3b30;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          
          .error-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .checkbox-wrapper {
            position: relative;
            width: 24px;
            height: 24px;
          }
          
          .checkbox-wrapper input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
          }
          
          .custom-checkbox {
            position: absolute;
            top: 0;
            left: 0;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            border: 1px solid var(--border-color, #d2d2d7);
            background: white;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .checkbox-wrapper input[type="checkbox"]:checked + .custom-checkbox {
            background: var(--accent-color, #0071e3);
            border-color: var(--accent-color, #0071e3);
          }
          
          .checkbox-wrapper input[type="checkbox"]:checked + .custom-checkbox svg {
            opacity: 1;
          }
          
          .checkbox-wrapper input[type="checkbox"]:focus + .custom-checkbox {
            box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
          }
          
          .custom-checkbox svg {
            width: 14px;
            height: 14px;
            color: white;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .help-text {
            color: var(--text-secondary, #86868b);
            font-size: 0.85rem;
            margin-top: 0.5rem;
            line-height: 1.4;
          }
          
          .form-footer {
            margin-top: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .loading-indicator {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .source-examples {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.75rem;
          }
          
          .source-example {
            font-size: 0.8rem;
            padding: 0.3rem 0.75rem;
            background: var(--background-secondary, #f5f5f7);
            border-radius: 980px;
            color: var(--text-secondary, #86868b);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .source-example:hover {
            background: var(--accent-color, #0071e3);
            color: white;
          }
        `}
      </style>

      <header className="header">
        <h1 className="title">Create Stream</h1>
        <div className="actions">
          <Link to="/" className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="card">
        <h3>Select a Template</h3>
        <p>Choose a preset configuration or customize your own video stream</p>
        
        <div className="template-grid">
          {templates.map(template => (
            <div 
              key={template.id}
              className={`template-card ${activeTemplate === template.id ? 'active' : ''}`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="template-icon">
                {template.icon}
              </div>
              <h4>{template.name}</h4>
              <p>{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Stream Configuration</h3>
        
        {error && (
          <div className="error-message">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 16.01L12.01 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4 className="form-heading">Basic Information</h4>
            
            <div className="form-group">
              <label htmlFor="name">Stream Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Front Door Camera"
                autoFocus
              />
            </div>
          </div>
          
          <div className="form-section">
            <h4 className="form-heading">Source Configuration</h4>
            
            <div className="form-group">
              <label htmlFor="type">Stream Type</label>
              <select
                id="type"
                name="type"
                className="form-control"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="camera">Camera Device</option>
                <option value="file">Video File</option>
                <option value="rtsp">RTSP Stream</option>
              </select>
              <p className="help-text">
                {formData.type === 'camera' ? 
                  'Connect to a local camera device like a webcam' : 
                  formData.type === 'file' ? 
                  'Use a video file (local or remote URL)' : 
                  'Connect to an IP camera or network video stream'}
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="source">Source Address</label>
              <input
                type="text"
                id="source"
                name="source"
                className="form-control"
                value={formData.source}
                onChange={handleChange}
                placeholder={
                  formData.type === 'camera' ? 
                    'Camera index (e.g., 0)' : 
                    formData.type === 'file' ? 
                    'File path or URL' : 
                    'RTSP URL (e.g., rtsp://example.com/stream)'
                }
              />
              
              {formData.type === 'camera' && (
                <div className="source-examples">
                  <span className="source-example" onClick={() => setFormData({...formData, source: '0'})}>
                    0 (default)
                  </span>
                  <span className="source-example" onClick={() => setFormData({...formData, source: '1'})}>
                    1 (external)
                  </span>
                </div>
              )}
              
              {formData.type === 'file' && (
                <div className="source-examples">
                  <span className="source-example" onClick={() => setFormData({...formData, source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'})}>
                    Sample Video
                  </span>
                </div>
              )}
              
              {formData.type === 'rtsp' && (
                <div className="source-examples">
                  <span className="source-example" onClick={() => setFormData({...formData, source: 'rtsp://example.com/stream'})}>
                    Example Format
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-section">
            <h4 className="form-heading">Options</h4>
            
            <div className="form-group checkbox-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="autoStart"
                  name="autoStart"
                  checked={formData.autoStart}
                  onChange={handleChange}
                />
                <div className="custom-checkbox">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <label htmlFor="autoStart">Auto-start stream after creation</label>
            </div>
            <p className="help-text">
              If enabled, the stream will automatically start processing after creation.
              Otherwise, you'll need to start it manually from the stream details page.
            </p>
          </div>
          
          <div className="form-footer">
            <Link to="/" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!formValid || loading}
            >
              {loading ? (
                <>
                  <span className="loading-indicator"></span>
                  Creating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Create Stream
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStream; 