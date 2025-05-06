import React from 'react';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import MemoryIcon from '@mui/icons-material/Memory';
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';

// Component type mapping interfaces
export interface ComponentTypeInfo {
  name: string;
  description: string;
  icon?: React.ReactNode;
}

export interface ComponentTypeMapping {
  [key: string]: ComponentTypeInfo;
}

// Human-readable component type mappings
export const sourceTypeMapping: ComponentTypeMapping = {
  "rtsp": {
    name: "RTSP Camera Stream",
    description: "Connect to an IP camera using the RTSP protocol",
    icon: React.createElement(VideoSettingsIcon)
  },
  "file": {
    name: "Video File",
    description: "Process a pre-recorded video file",
    icon: React.createElement(VideoSettingsIcon)
  }
};

export const processorTypeMapping: ComponentTypeMapping = {
  "object_detection": {
    name: "Object Detection",
    description: "Detect objects in the video using deep learning models",
    icon: React.createElement(MemoryIcon)
  },
  "object_tracking": {
    name: "Object Tracking",
    description: "Track detected objects across video frames",
    icon: React.createElement(MemoryIcon)
  },
  "line_zone_manager": {
    name: "Line Crossing Detection",
    description: "Count objects crossing defined line zones",
    icon: React.createElement(MemoryIcon)
  },
  "polygon_zone_manager": {
    name: "Polygon Zone Detection",
    description: "Define polygon zones for object counting and event detection",
    icon: React.createElement(MemoryIcon)
  },
  "object_classification": {
    name: "Image Classification",
    description: "Classify the entire scene with image recognition",
    icon: React.createElement(MemoryIcon)
  },
  "age_gender_detection": {
    name: "Age & Gender Detection",
    description: "Detect faces and analyze age and gender attributes",
    icon: React.createElement(MemoryIcon)
  }
};

export const sinkTypeMapping: ComponentTypeMapping = {
  "file": {
    name: "Video File Output",
    description: "Save processed video to a file",
    icon: React.createElement(SaveIcon)
  },
  "database": {
    name: "Database Storage",
    description: "Store telemetry data in a SQLite database",
    icon: React.createElement(StorageIcon)
  }
};

// Helper function to get human-readable name for a component type
export const getComponentTypeName = (type: string, componentCategory: 'source' | 'processor' | 'sink'): string => {
  const mapping = componentCategory === 'source' 
    ? sourceTypeMapping 
    : componentCategory === 'processor' 
      ? processorTypeMapping 
      : sinkTypeMapping;
  
  return mapping[type]?.name || type;
};

// Helper function to get description for a component type
export const getComponentTypeDescription = (type: string, componentCategory: 'source' | 'processor' | 'sink'): string => {
  const mapping = componentCategory === 'source' 
    ? sourceTypeMapping 
    : componentCategory === 'processor' 
      ? processorTypeMapping 
      : sinkTypeMapping;
  
  return mapping[type]?.description || '';
}; 