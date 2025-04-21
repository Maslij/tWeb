import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService, { OnvifCamera } from '../services/api';

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
  
  // Camera scanning state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discoveredCameras, setDiscoveredCameras] = useState<OnvifCamera[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

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
    
    // Open the scan modal if the scan template is selected
    if (template.id === 'scan') {
      setShowScanModal(true);
    }
  };

  const scanForCameras = async () => {
    try {
      setScanning(true);
      setScanError(null);
      setDiscoveredCameras([]);
      
      // Call the API to discover cameras (with 10-second timeout)
      const cameras = await apiService.discoverOnvifCameras(10);
      
      setDiscoveredCameras(cameras);
      
      if (cameras.length === 0) {
        setScanError('No cameras found on your network. Make sure your cameras are powered on and connected to the same network.');
      }
    } catch (err) {
      console.error('Error scanning for cameras:', err);
      setScanError('Failed to scan for cameras. Please check your network connection and try again.');
    } finally {
      setScanning(false);
    }
  };
  
  const handleSelectCamera = (camera: OnvifCamera, rtspUrl: string) => {
    setFormData({
      ...formData,
      name: camera.name,
      source: rtspUrl,
      type: 'rtsp'
    });
    setShowScanModal(false);
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
      id: 'scan',
      name: 'Network Camera',
      source: '',
      type: 'rtsp' as const,
      description: 'Scan for ONVIF cameras on your network',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.5 4.5L21 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M19 9L22 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M5 9L2 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M5.5 4.5L3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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

  // Camera Scan Modal component - needs to be inside the main component to access functions
  const CameraScanModal = () => {
    return (
      <div className={`modal-overlay ${showScanModal ? 'visible' : ''}`}>
        <div className="modal-container">
          <div className="modal-header">
            <h3>Scan for Network Cameras</h3>
            <button className="btn-close" onClick={() => setShowScanModal(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="modal-content">
            {scanError && (
              <div className="error-message">
                <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 16.01L12.01 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {scanError}
              </div>
            )}
            
            {!scanning && discoveredCameras.length === 0 && (
              <div className="scan-start-container">
                <div className="scan-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 5L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M5 5L3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 19L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M5 19L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Discover ONVIF Cameras</h4>
                <p className="scan-description">Scan your local network for ONVIF-compatible IP cameras to easily connect to their streams.</p>
                <div className="scan-action">
                  <button 
                    className="btn btn-primary scan-btn" 
                    onClick={() => scanForCameras()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M3 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 16V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 3V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Start Network Scan
                  </button>
                </div>
                <div className="scan-note">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 7.01L12.01 6.99889" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>Cameras must be on the same network as this device and support the ONVIF protocol.</p>
                </div>
              </div>
            )}
            
            {scanning && (
              <div className="scanning-indicator">
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
                <h4>Scanning Network...</h4>
                <p className="scan-progress">Looking for ONVIF cameras on your local network</p>
                <div className="scan-status">This may take up to 10 seconds</div>
              </div>
            )}
            
            {!scanning && discoveredCameras.length > 0 && (
              <div className="cameras-found-container">
                <div className="cameras-header">
                  <h4>
                    <span className="cameras-count">{discoveredCameras.length}</span> 
                    Camera{discoveredCameras.length !== 1 ? 's' : ''} Found
                  </h4>
                  <button 
                    className="btn btn-text-icon" 
                    onClick={() => scanForCameras()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 4V8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 20V16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 8V4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 16V20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17.1583 6.84404C19.3134 9.00189 19.3134 12.4981 17.1583 14.656C14.9976 16.8195 11.499 16.8195 9.34169 14.656C7.18663 12.5036 7.18663 9.00189 9.34169 6.84404C11.5023 4.68053 14.9976 4.68053 17.1583 6.84404" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Scan Again
                  </button>
                </div>
                
                <div className="cameras-list">
                  {discoveredCameras.map((camera, cIndex) => (
                    <div key={camera.ip_address + cIndex} className="camera-card">
                      <div className="camera-card-header">
                        <div className="camera-icon">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 10L19.5528 7.72361C19.8343 7.58281 20 7.29176 20 6.97631V17.0237C20 17.3392 19.8343 17.6302 19.5528 17.771L15 15.5V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </div>
                        <div className="camera-info">
                          <div className="camera-name">{camera.name}</div>
                          <div className="camera-meta">
                            <span className="camera-ip">{camera.ip_address}</span>
                            {camera.hardware && (
                              <>
                                <span className="meta-separator">•</span>
                                <span className="camera-hardware">{camera.hardware}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="camera-card-content">
                        <div className="stream-select-label">Available Streams:</div>
                        <div className="stream-options">
                          {camera.rtsp_urls && camera.rtsp_urls.map((url, index) => (
                            <button 
                              key={index} 
                              className="stream-select-btn"
                              onClick={() => handleSelectCamera(camera, url)}
                              title={url}
                            >
                              Stream {index + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowScanModal(false)}
            >
              Cancel
            </button>
            
            {!scanning && discoveredCameras.length === 0 && (
              <button 
                className="btn btn-primary" 
                onClick={() => scanForCameras()}
              >
                Start Scan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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

          :root[data-theme="dark"] .header {
            background-color: transparent;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary);
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
            background: var(--accent-color);
            color: white;
          }
          
          .btn-primary:hover:not(:disabled) {
            background: var(--accent-hover);
            transform: scale(1.02);
          }
          
          .btn-primary:disabled {
            background: var(--accent-disabled);
            cursor: not-allowed;
            opacity: 0.7;
          }
          
          .btn-secondary {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
          
          .btn-secondary:hover {
            background: var(--button-hover);
          }

          .card {
            background: var(--background-primary);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 4px 24px var(--shadow-color);
            margin-bottom: 2rem;
            transition: box-shadow 0.3s ease;
          }

          .card h3 {
            color: var(--text-primary);
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
            letter-spacing: -0.3px;
          }

          .card p {
            color: var(--text-secondary);
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
            background: var(--background-secondary);
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
            background: var(--background-hover);
          }
          
          .template-card.active {
            border-color: var(--accent-color);
            background: var(--accent-bg);
          }
          
          .template-card.active::after {
            content: '';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--accent-color);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
            background-size: 10px;
            background-position: center;
            background-repeat: no-repeat;
          }
          
          .template-icon {
            width: 40px;
            height: 40px;
            color: var(--accent-color);
            margin-bottom: 1rem;
          }

          .template-card h4 {
            color: var(--text-primary);
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
          }

          .template-card p {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin: 0;
          }

          .form-section {
            margin-bottom: 2rem;
          }
          
          .form-heading {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 1.5rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-group label {
            display: block;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
          }

          .form-control {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: var(--input-bg);
            color: var(--text-primary);
          }

          .form-control:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 4px var(--accent-shadow);
          }
          
          .form-control::placeholder {
            color: var(--text-tertiary);
          }

          .error-message {
            background: var(--error-bg);
            color: var(--error-color);
            padding: 16px;
            border-radius: 12px;
            margin: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            width: calc(100% - 48px);
            box-sizing: border-box;
          }
          
          .error-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            margin-top: 2px;
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
            border: 1px solid var(--border-color);
            background: var(--input-bg);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .checkbox-wrapper input[type="checkbox"]:checked + .custom-checkbox {
            background: var(--accent-color);
            border-color: var(--accent-color);
          }
          
          .checkbox-wrapper input[type="checkbox"]:checked + .custom-checkbox svg {
            opacity: 1;
          }
          
          .checkbox-wrapper input[type="checkbox"]:focus + .custom-checkbox {
            box-shadow: 0 0 0 4px var(--accent-shadow);
          }
          
          .custom-checkbox svg {
            width: 14px;
            height: 14px;
            color: white;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .help-text {
            color: var(--text-secondary);
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
            background: var(--background-secondary);
            border-radius: 980px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .source-example:hover {
            background: var(--accent-color);
            color: white;
          }
          
          /* Camera Scan Modal Styles - Redesigned */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
          }
          
          .modal-overlay.visible {
            opacity: 1;
            visibility: visible;
          }
          
          .modal-container {
            background: var(--background-primary);
            border-radius: 16px;
            width: 100%;
            max-width: 750px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 1px solid var(--border-color);
          }
          
          .modal-overlay.visible .modal-container {
            transform: translateY(0);
          }
          
          .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .modal-header h3 {
            font-size: 18px;
            margin: 0;
            font-weight: 600;
            color: var(--text-primary);
            letter-spacing: -0.2px;
          }
          
          .btn-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
          }
          
          .btn-close:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
          
          .btn-close svg {
            width: 18px;
            height: 18px;
          }
          
          .modal-content {
            padding: 0;
            overflow-y: auto;
            max-height: calc(90vh - 130px);
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: stretch;
          }
          
          .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          
          /* Empty state - Start scanning */
          .scan-start-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 40px 24px;
            width: 100%;
          }
          
          .scan-icon {
            width: 64px;
            height: 64px;
            color: var(--accent-color);
            margin-bottom: 16px;
          }
          
          .scan-start-container h4 {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 12px 0;
            letter-spacing: -0.3px;
          }
          
          .scan-description {
            color: var(--text-secondary);
            font-size: 16px;
            max-width: 420px;
            margin: 0 0 28px 0;
            line-height: 1.5;
          }
          
          .scan-action {
            margin-bottom: 32px;
          }
          
          .scan-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
          }
          
          .scan-btn svg {
            width: 20px;
            height: 20px;
          }
          
          .scan-note {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            max-width: 400px;
            background: var(--background-secondary);
            padding: 16px;
            border-radius: 12px;
          }
          
          .scan-note svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            color: var(--text-secondary);
            margin-top: 2px;
          }
          
          .scan-note p {
            color: var(--text-secondary);
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
            text-align: left;
          }
          
          /* Scanning state */
          .scanning-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            text-align: center;
            width: 100%;
          }
          
          .spinner-container {
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            position: relative;
          }
          
          .spinner-container::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: var(--accent-bg);
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid transparent;
            border-top-color: var(--accent-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          .scanning-indicator h4 {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 12px 0;
          }
          
          .scan-progress {
            color: var(--text-secondary);
            font-size: 16px;
            margin: 0 0 28px 0;
          }
          
          .scan-status {
            color: var(--text-tertiary);
            font-size: 14px;
            padding: 8px 16px;
            background: var(--background-secondary);
            border-radius: 16px;
          }
          
          /* Cameras found state */
          .cameras-found-container {
            padding: 24px;
            width: 100%;
          }
          
          .cameras-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .cameras-header h4 {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .cameras-count {
            background: var(--accent-color);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }
          
          .btn-text-icon {
            background: var(--background-secondary);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .btn-text-icon:hover {
            background: var(--hover-bg);
          }
          
          .btn-text-icon svg {
            width: 16px;
            height: 16px;
          }
          
          .cameras-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          @media (min-width: 768px) {
            .cameras-list {
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            }
          }
          
          .camera-card {
            background: var(--background-secondary);
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 1px solid var(--border-color);
          }
          
          .camera-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          
          .camera-card-header {
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid var(--border-color);
          }
          
          .camera-icon {
            width: 40px;
            height: 40px;
            background: var(--accent-bg);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-color);
            flex-shrink: 0;
          }
          
          .camera-icon svg {
            width: 24px;
            height: 24px;
          }
          
          .camera-info {
            overflow: hidden;
          }
          
          .camera-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .camera-meta {
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .meta-separator {
            color: var(--text-tertiary);
          }
          
          .camera-card-content {
            padding: 16px;
          }
          
          .stream-select-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 12px;
          }
          
          .stream-options {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .stream-select-btn {
            background: var(--background-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 8px 14px;
            font-size: 13px;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .stream-select-btn:hover {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
          }
          
          /* Dark mode specific adjustments */
          :root[data-theme="dark"] .modal-container {
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          }
          
          :root[data-theme="dark"] .camera-card:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }
          
          :root[data-theme="dark"] .spinner-container::before {
            background: rgba(10, 132, 255, 0.15);
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

      <CameraScanModal />
    </div>
  );
};

export default CreateStream; 