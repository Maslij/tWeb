import axios from 'axios';

// DEPRECATED: Use getFullUrl() instead of API_URL directly
// This remains empty for backwards compatibility
const API_URL = '';

// Helper function to ensure response is an array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object') {
    // If it's an object, try to extract array values
    const possibleArray = Object.values(data);
    if (possibleArray.length > 0) {
      return possibleArray;
    }
  }
  return []; // Return empty array as fallback
};

// Get the full URL with the actual origin for embedded images
const getFullUrl = (path: string): string => {
  // For development with the proxy, we use relative URLs
  if (window.location.hostname === 'localhost') {
    // When using Vite's built-in proxy, we should use relative URLs
    // The proxy in vite.config.ts will forward /api requests to the backend
    return path;
  }
  
  // For production, we need to use the actual API server
  // You might need to configure this based on your deployment setup
  const apiBaseUrl = window.location.origin; // Use the same origin in production
  return `${apiBaseUrl}${path}`;
};

// Camera interface to match the API response
export interface Camera {
  id: string;
  name: string;
  running: boolean;
  components?: {
    source: number;
    processors: number;
    sinks: number;
  };
}

// Camera creation/update interface
export interface CameraInput {
  id?: string;
  name?: string;
  running?: boolean;
}

// License status interface
export interface LicenseStatus {
  valid: boolean;
  has_license: boolean;
}

// Component types interface
export interface ComponentTypes {
  sources: string[];
  processors: string[];
  sinks: string[];
  dependencies?: {
    [key: string]: string[];
  };
  dependency_rules?: string[];
}

// Generic component interface
export interface Component {
  id: string;
  type: string | number;
  type_name?: string;
  running: boolean;
  config: any;
  
  // Properties that might be directly on the component object rather than in config
  // Source component properties
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  target_fps?: number;
  hardware_acceleration?: string;
  adaptive_timing?: string;
  rtsp_transport?: string;
  latency?: number;
  
  // Processor component properties
  model_id?: string;
  server_url?: string;
  confidence_threshold?: number;
  draw_bounding_boxes?: boolean;
  use_shared_memory?: boolean;
  classes?: string[];
  processed_frames?: number;
  detection_count?: number;
  label_font_scale?: number;
  
  // Object tracking properties
  frame_rate?: number;
  track_buffer?: number;
  track_thresh?: number;
  high_thresh?: number;
  match_thresh?: number;
  draw_tracking?: boolean;
  draw_track_id?: boolean;
  draw_track_trajectory?: boolean;
  draw_semi_transparent_boxes?: boolean;
  
  // Line zone properties
  draw_zones?: boolean;
  line_color?: number[];
  line_thickness?: number;
  draw_counts?: boolean;
  text_color?: number[];
  text_scale?: number;
  text_thickness?: number;
  zones?: any[];
  
  // Sink component properties
  file_path?: string;
  path?: string;
  fourcc?: string;
  resolution?: {
    width: number;
    height: number;
  };
}

// Component input interface
export interface ComponentInput {
  id?: string;
  type: string;
  config: any;
}

// API Service
const apiService = {
  // License related API calls
  license: {
    // Get license status
    getStatus: async (): Promise<LicenseStatus | null> => {
      try {
        const response = await axios.get(getFullUrl('/api/v1/license'));
        return response.data;
      } catch (error) {
        console.error('Error checking license status:', error);
        return null;
      }
    },

    // Set license key
    setLicense: async (licenseKey: string): Promise<boolean> => {
      try {
        const response = await axios.post(getFullUrl('/api/v1/license'), {
          license_key: licenseKey
        });
        return response.data?.valid === true;
      } catch (error) {
        console.error('Error setting license key:', error);
        return false;
      }
    }
  },

  // Camera related API calls
  cameras: {
    // Get all cameras
    getAll: async (): Promise<Camera[]> => {
      try {
        const response = await axios.get(getFullUrl('/api/v1/cameras'));
        console.log('API response:', response.data);
        return ensureArray(response.data);
      } catch (error) {
        console.error('Error fetching cameras:', error);
        return [];
      }
    },

    // Get a specific camera by ID
    getById: async (id: string): Promise<Camera | null> => {
      try {
        const response = await axios.get(getFullUrl(`/api/v1/cameras/${id}`));
        return response.data;
      } catch (error) {
        console.error(`Error fetching camera ${id}:`, error);
        return null;
      }
    },

    // Create a new camera
    create: async (cameraData: CameraInput): Promise<Camera | null> => {
      try {
        const response = await axios.post(getFullUrl('/api/v1/cameras'), cameraData);
        return response.data;
      } catch (error) {
        console.error('Error creating camera:', error);
        return null;
      }
    },

    // Update an existing camera
    update: async (id: string, cameraData: CameraInput): Promise<Camera | null> => {
      try {
        const response = await axios.put(getFullUrl(`/api/v1/cameras/${id}`), cameraData);
        return response.data;
      } catch (error) {
        console.error(`Error updating camera ${id}:`, error);
        return null;
      }
    },

    // Delete a camera
    delete: async (id: string): Promise<boolean> => {
      try {
        await axios.delete(getFullUrl(`/api/v1/cameras/${id}`));
        return true;
      } catch (error) {
        console.error(`Error deleting camera ${id}:`, error);
        return false;
      }
    },

    // Start a camera (convenience method)
    start: async (id: string): Promise<Camera | null> => {
      return apiService.cameras.update(id, { running: true });
    },

    // Stop a camera (convenience method)
    stop: async (id: string): Promise<Camera | null> => {
      return apiService.cameras.update(id, { running: false });
    },

    // Get the latest frame from a camera
    getFrame: (cameraId: string, quality: number = 90): string => {
      // For frames, we need to use the direct URL even in development
      // because the img src tag doesn't go through the proxy
      if (window.location.hostname === 'localhost') {
        const apiServer = import.meta.env.VITE_TAPI_SERVER || 'localhost:8090';
        const protocol = window.location.protocol;
        return `${protocol}//${apiServer}/api/v1/cameras/${cameraId}/frame?quality=${quality}`;
      }
      return getFullUrl(`/api/v1/cameras/${cameraId}/frame?quality=${quality}`);
    }
  },

  // Component related API calls
  components: {
    // Get all available component types
    getTypes: async (): Promise<ComponentTypes | null> => {
      try {
        const response = await axios.get(getFullUrl('/api/v1/component-types'));
        return response.data;
      } catch (error) {
        console.error('Error fetching component types:', error);
        return null;
      }
    },

    // Get all components for a camera
    getAll: async (cameraId: string): Promise<{ source: Component | null, processors: Component[], sinks: Component[] } | null> => {
      try {
        const response = await axios.get(getFullUrl(`/api/v1/cameras/${cameraId}/components`));
        return response.data;
      } catch (error) {
        console.error(`Error fetching components for camera ${cameraId}:`, error);
        return null;
      }
    },

    // Source component operations
    source: {
      // Create a source component
      create: async (cameraId: string, componentData: ComponentInput): Promise<Component | null> => {
        try {
          const response = await axios.post(getFullUrl(`/api/v1/cameras/${cameraId}/source`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error creating source for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Update a source component
      update: async (cameraId: string, componentData: Partial<ComponentInput>): Promise<Component | null> => {
        try {
          const response = await axios.put(getFullUrl(`/api/v1/cameras/${cameraId}/source`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error updating source for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Delete a source component
      delete: async (cameraId: string): Promise<boolean> => {
        try {
          await axios.delete(getFullUrl(`/api/v1/cameras/${cameraId}/source`));
          return true;
        } catch (error) {
          console.error(`Error deleting source for camera ${cameraId}:`, error);
          return false;
        }
      },
    },

    // Processor component operations
    processors: {
      // Create a processor component
      create: async (cameraId: string, componentData: ComponentInput): Promise<Component | null> => {
        try {
          const response = await axios.post(getFullUrl(`/api/v1/cameras/${cameraId}/processors`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error creating processor for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Get a specific processor component
      getById: async (cameraId: string, processorId: string): Promise<Component | null> => {
        try {
          const response = await axios.get(getFullUrl(`/api/v1/cameras/${cameraId}/processors/${processorId}`));
          return response.data;
        } catch (error) {
          console.error(`Error fetching processor ${processorId} for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Update a processor component
      update: async (cameraId: string, processorId: string, componentData: { config: any }): Promise<Component | null> => {
        try {
          const response = await axios.put(getFullUrl(`/api/v1/cameras/${cameraId}/processors/${processorId}`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error updating processor ${processorId} for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Delete a processor component
      delete: async (cameraId: string, processorId: string): Promise<boolean> => {
        try {
          await axios.delete(getFullUrl(`/api/v1/cameras/${cameraId}/processors/${processorId}`));
          return true;
        } catch (error) {
          console.error(`Error deleting processor ${processorId} for camera ${cameraId}:`, error);
          return false;
        }
      },
    },

    // Sink component operations
    sinks: {
      // Create a sink component
      create: async (cameraId: string, componentData: ComponentInput): Promise<Component | null> => {
        try {
          const response = await axios.post(getFullUrl(`/api/v1/cameras/${cameraId}/sinks`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error creating sink for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Get a specific sink component
      getById: async (cameraId: string, sinkId: string): Promise<Component | null> => {
        try {
          const response = await axios.get(getFullUrl(`/api/v1/cameras/${cameraId}/sinks/${sinkId}`));
          return response.data;
        } catch (error) {
          console.error(`Error fetching sink ${sinkId} for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Update a sink component
      update: async (cameraId: string, sinkId: string, componentData: { config: any }): Promise<Component | null> => {
        try {
          const response = await axios.put(getFullUrl(`/api/v1/cameras/${cameraId}/sinks/${sinkId}`), componentData);
          return response.data;
        } catch (error) {
          console.error(`Error updating sink ${sinkId} for camera ${cameraId}:`, error);
          return null;
        }
      },

      // Delete a sink component
      delete: async (cameraId: string, sinkId: string): Promise<boolean> => {
        try {
          await axios.delete(getFullUrl(`/api/v1/cameras/${cameraId}/sinks/${sinkId}`));
          return true;
        } catch (error) {
          console.error(`Error deleting sink ${sinkId} for camera ${cameraId}:`, error);
          return false;
        }
      },
    },
  },

  // Object detection models
  models: {
    // Get available object detection models
    getObjectDetectionModels: async (): Promise<any> => {
      try {
        const response = await axios.get(getFullUrl('/api/v1/models/object-detection'));
        return response.data;
      } catch (error) {
        console.error('Error fetching object detection models:', error);
        return null;
      }
    },
  }
};

export default apiService; 