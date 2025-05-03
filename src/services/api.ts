import axios from 'axios';

// DEPRECATED: Use getFullUrl() instead of API_URL directly
// This remains empty for backwards compatibility
const API_URL = '';

// Helper function to ensure response is an array
const ensureArray = (data: any): any[] => {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
};

// Get the full URL with the actual origin for embedded images
const getFullUrl = (path: string): string => {
  // For development with the proxy, we use relative URLs
  if (window.location.hostname === 'localhost') {
    // When using Vite's built-in proxy, we should use relative URLs
    // The proxy in vite.config.ts will forward /api requests to the backend
    // If proxy is not working, connect directly to the API server
    const apiServer = import.meta.env.VITE_TAPI_SERVER || 'localhost:8090';
    return `http://${apiServer}${path}`;
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
  key: string;
  tier?: string;
  tier_id?: number;
  owner?: string;
  email?: string;
  expiration?: number;
  message?: string;
}

// License update interface
export interface LicenseUpdate {
  license_key: string;
  owner?: string;
  email?: string;
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

// Add the missing interfaces and database API methods to the file.
// First, let's add interfaces for database records

export interface FrameRecord {
  id: number;
  timestamp: number;
  thumbnail?: string;
  created_at: number;
}

export interface EventRecord {
  id: number;
  frame_id: number;
  type: number;
  source_id: string;
  camera_id: string;
  timestamp: number;
  properties: string;
  created_at: number;
}

export interface DatabaseRecordsResponse {
  events: EventRecord[];
  total_events: number;
  total_frames: number;
}

// Update interfaces for telemetry data
export interface ZoneLineCount {
  timestamp: number;
  zone_id: string;
  direction: string;
  count: number;
}

export interface ZoneLineCountsResponse {
  zone_line_counts: ZoneLineCount[];
  success?: boolean;
  has_data?: boolean;
  error?: string;
}

export interface ClassHeatmapPoint {
  x: number;
  y: number;
  value: number;
  class: string;
}

export interface ClassHeatmapResponse {
  class_heatmap_data: ClassHeatmapPoint[];
  success?: boolean;
  has_data?: boolean;
  error?: string;
}

// Add Task interfaces
export interface Task {
  id: string;
  type: string;
  target_id: string;
  state: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  created_at: number;
  updated_at: number;
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
        // Throw the error so it can be caught by components to redirect to the license page
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
        return null;
      }
    },

    // Set license key
    setLicense: async (licenseData: LicenseUpdate): Promise<LicenseStatus | null> => {
      try {
        const response = await axios.post(getFullUrl('/api/v1/license'), licenseData);
        return response.data;
      } catch (error) {
        console.error('Error setting license key:', error);
        return null;
      }
    },
    
    // Update existing license information
    updateLicense: async (licenseData: Partial<LicenseUpdate>): Promise<LicenseStatus | null> => {
      try {
        const response = await axios.put(getFullUrl('/api/v1/license'), licenseData);
        return response.data;
      } catch (error) {
        console.error('Error updating license information:', error);
        return null;
      }
    },
    
    // Delete license
    deleteLicense: async (): Promise<boolean> => {
      try {
        const response = await axios.delete(getFullUrl('/api/v1/license'));
        return response.data?.success === true;
      } catch (error) {
        console.error('Error deleting license:', error);
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
        return ensureArray(response.data);
      } catch (error) {
        console.error('Error fetching cameras:', error);
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
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
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
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
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
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
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
        return null;
      }
    },

    // Delete a camera
    delete: async (id: string, async: boolean = true): Promise<{success: boolean, databaseCleaned?: boolean, task_id?: string}> => {
      try {
        const response = await axios.delete(getFullUrl(`/api/v1/cameras/${id}${async ? '?async=true' : ''}`));
        return {
          success: true,
          databaseCleaned: response.data.database_cleaned,
          task_id: response.data.task_id
        };
      } catch (error) {
        console.error(`Error deleting camera ${id}:`, error);
        return { success: false };
      }
    },

    // Start a camera (convenience method)
    start: async (id: string): Promise<Camera | null> => {
      try {
        const response = await axios.put(getFullUrl(`/api/v1/cameras/${id}`), { running: true });
        return response.data;
      } catch (error) {
        console.error(`Error starting camera ${id}:`, error);
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
        return null;
      }
    },

    // Stop a camera (convenience method)
    stop: async (id: string): Promise<Camera | null> => {
      try {
        const response = await axios.put(getFullUrl(`/api/v1/cameras/${id}`), { running: false });
        return response.data;
      } catch (error) {
        console.error(`Error stopping camera ${id}:`, error);
        // Propagate 401 errors
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          throw error;
        }
        return null;
      }
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
  },

  // Add database service
  database: {
    /**
     * Get database records for a specific camera
     */
    async getRecords(cameraId: string, page: number = 0, limit: number = 10): Promise<DatabaseRecordsResponse | null> {
      try {
        const url = getFullUrl(`/api/v1/cameras/${cameraId}/database/events?page=${page}&limit=${limit}`);

        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Database API error response:", response.status, errorText);
          throw new Error(`Failed to fetch database records: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching database records:', error);
        return null;
      }
    },

    /**
     * Delete all database records for a specific camera
     */
    async deleteRecords(cameraId: string): Promise<boolean> {
      try {
        const url = getFullUrl(`/api/v1/cameras/${cameraId}/database/events`);

        const response = await fetch(url, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Database delete API error response:", response.status, errorText);
        }
        
        return response.ok;
      } catch (error) {
        console.error('Error deleting database records:', error);
        return false;
      }
    },

    /**
     * Get zone line counts for a specific camera with optional time range
     */
    async getZoneLineCounts(cameraId: string, timeRange?: {start: number, end: number}): Promise<ZoneLineCountsResponse | null> {
      try {
        let url = getFullUrl(`/api/v1/cameras/${cameraId}/database/zone-line-counts`);
        
        // Add time range parameters if they're set
        if (timeRange && timeRange.start > 0) {
          url += `?start_time=${timeRange.start}`;
          if (timeRange.end > 0) {
            url += `&end_time=${timeRange.end}`;
          }
        }
        
        const response = await fetch(url);
        
        // Handle 204 No Content response
        if (response.status === 204) {
          return {
            zone_line_counts: [],
            success: false,
            has_data: false,
            error: 'No zone line count data available'
          };
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch zone line counts: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching zone line counts:', error);
        return null;
      }
    },

    /**
     * Get class heatmap data for a specific camera
     */
    async getClassHeatmapData(cameraId: string): Promise<ClassHeatmapResponse | null> {
      try {
        const url = getFullUrl(`/api/v1/cameras/${cameraId}/database/class-heatmap`);
        
        const response = await fetch(url);
        
        // Handle 204 No Content response
        if (response.status === 204) {
          return {
            class_heatmap_data: [],
            success: false,
            has_data: false,
            error: 'No class heatmap data available'
          };
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch class heatmap data: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching class heatmap data:', error);
        return null;
      }
    },

    /**
     * Get heatmap image URL for a specific camera
     */
    getHeatmapImage(cameraId: string, params?: {
      anchor?: string;
      quality?: number;
      classes?: string[];
    }): string {
      // Start with base URL
      let url = getFullUrl(`/api/v1/cameras/${cameraId}/database/heatmap-image`);
      
      // Add query parameters if provided
      if (params) {
        const queryParams = new URLSearchParams();
        
        if (params.anchor) {
          queryParams.append('anchor', params.anchor);
        }
        
        if (params.quality !== undefined) {
          queryParams.append('quality', params.quality.toString());
        }
        
        if (params.classes && params.classes.length > 0) {
          queryParams.append('class', params.classes.join(','));
        }
        
        // Add timestamp for cache busting to force a fresh image every time
        queryParams.append('t', Date.now().toString());
        
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      } else {
        // Even with no other params, add a timestamp
        url += `?t=${Date.now()}`;
      }
      
      // Return the URL directly, as it will be used in an <img> tag
      return url;
    }
  },

  // Add tasks API
  tasks: {
    // Get all tasks
    getAll: async (): Promise<Task[]> => {
      try {
        const response = await axios.get(getFullUrl('/api/v1/tasks'));
        return response.data.tasks || [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },

    // Get a specific task
    getById: async (id: string): Promise<Task | null> => {
      try {
        const response = await axios.get(getFullUrl(`/api/v1/tasks/${id}`));
        return response.data;
      } catch (error) {
        console.error(`Error fetching task ${id}:`, error);
        return null;
      }
    },

    // Poll a task until it completes or fails
    pollUntilComplete: async (
      id: string, 
      onProgress?: (task: Task) => void, 
      intervalMs: number = 1000,
      timeoutMs: number = 300000 // 5 minutes default timeout
    ): Promise<Task | null> => {
      const startTime = Date.now();
      let task: Task | null = null;
      
      while (Date.now() - startTime < timeoutMs) {
        task = await apiService.tasks.getById(id);
        
        if (!task) {
          return null;
        }
        
        if (onProgress) {
          onProgress(task);
        }
        
        if (task.state === 'completed' || task.state === 'failed') {
          return task;
        }
        
        // Wait for the specified interval
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
      
      return task; // Return the last known state if timeout occurs
    }
  }
};

export default apiService;