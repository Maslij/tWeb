import React, { useState } from 'react';
import '../styles/ConfigurableProperties.css';

// Determine if a property is "basic" or "advanced"
const isBasicProperty = (key: string, componentType: string): boolean => {
  // Basic properties for all components
  const globalBasicProps = [
    'model', 
    'confidence', 
    'classes',
    'show_labels',
    'show_bounding_boxes',
    'show_tracks', 
    'show_title', 
    'show_timestamp'
  ];
  
  // Add component-specific basic properties
  if (componentType === 'event_alarm') {
    return globalBasicProps.includes(key) || 
           ['min_confidence', 'notify_on_alarm', 'allowed_classes'].includes(key);
  }
  
  if (componentType === 'line_zone' || componentType === 'line_zone_manager') {
    return globalBasicProps.includes(key) || key === 'lines';
  }
  
  if (componentType === 'annotated_stream' || componentType === 'annotated_video_sink') {
    return globalBasicProps.includes(key) || 
           ['show_line_zones', 'label_font_scale'].includes(key);
  }
  
  // Default to basic for common properties, advanced for others
  return globalBasicProps.includes(key);
};

interface ConfigurablePropertiesProps {
  nodeId: string;
  componentType: string;
  properties: [string, any][];
  renderPropertyControl: (key: string, value: any) => React.ReactNode;
}

const ConfigurableProperties: React.FC<ConfigurablePropertiesProps> = ({
  nodeId,
  componentType,
  properties,
  renderPropertyControl
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Separate basic and advanced properties
  const basicProperties = properties.filter(([key]) => 
    isBasicProperty(key, componentType)
  );
  
  const advancedProperties = properties.filter(([key]) => 
    !isBasicProperty(key, componentType)
  );
  
  return (
    <div className="configurable-properties">
      {/* Render basic properties */}
      {basicProperties.length > 0 && (
        <div className="basic-properties">
          {basicProperties.map(([key, value]) => (
            <div key={key} className="property-item">
              {renderPropertyControl(key, value)}
            </div>
          ))}
        </div>
      )}
      
      {/* Toggle for advanced properties */}
      {advancedProperties.length > 0 && (
        <div className="advanced-toggle">
          <button 
            className={`toggle-button ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            <span className="toggle-icon">{showAdvanced ? '▲' : '▼'}</span>
          </button>
        </div>
      )}
      
      {/* Render advanced properties if toggled */}
      {showAdvanced && advancedProperties.length > 0 && (
        <div className="advanced-properties">
          <div className="advanced-header">Advanced Options</div>
          {advancedProperties.map(([key, value]) => (
            <div key={key} className="property-item">
              {renderPropertyControl(key, value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfigurableProperties; 