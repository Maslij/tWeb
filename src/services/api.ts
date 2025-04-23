import axios from 'axios';

// DEPRECATED: Use getFullUrl() instead of API_URL directly
// This remains empty for backwards compatibility
const API_URL = '';

// Stream type definitions
export interface Stream {
  id: string;
  name?: string;
  source: string;
  type?: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  width?: number;
  height?: number;
  fps?: number;
  pipeline?: {
    id: string;
    name: string;
    nodes: Array<{
      id: string;
      componentId: string;
      name?: string;
      position: { x: number; y: number };
      connections: string[];
      config?: Record<string, any>;
      sourceDetails?: {
        name: string;
        source: string;
        type: string;
      };
    }>;
  };
}

export interface CreateStreamPayload {
  source: string;
  type: 'camera' | 'file' | 'rtsp';
  name: string;
  autoStart?: boolean;
}

// Polygon type definitions
export interface Polygon {
  id: string;
  name: string;
  points: [number, number][]; // Array of [x, y] coordinates
  color: [number, number, number]; // RGB
  filled: boolean;
  thickness: number;
}

export interface CreatePolygonPayload {
  name: string;
  points: [number, number][]; // Array of [x, y] coordinates
  color?: [number, number, number]; // RGB
  filled?: boolean;
  thickness?: number;
}

export interface UpdatePolygonPayload {
  points: [number, number][]; // Array of [x, y] coordinates
  name?: string;
  color?: [number, number, number]; // RGB
  filled?: boolean;
  thickness?: number;
}

// Alarm type definitions
export interface AlarmEvent {
  message: string;
  objectId?: string;
  objectClass?: string;
  confidence?: number;
  timestamp: number;
  boundingBox?: { x: number, y: number, width: number, height: number };
  image_data?: string;
}

// ONVIF camera type definitions
export interface OnvifCamera {
  name: string;
  ip_address: string;
  hardware: string;
  endpoint_reference: string;
  types: string;
  xaddrs: string;
  rtsp_urls: string[];
}

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
    // Check if this is a development environment or production
    // If we have VITE_TAPI_SERVER environment variable, use it
    const apiServer = import.meta.env.VITE_TAPI_SERVER || 'localhost:8081';
    const protocol = window.location.protocol;
    return `${protocol}//${apiServer}${path}`;
  }
  
  // For production, we need to use the actual API server
  // You might need to configure this based on your deployment setup
  const apiBaseUrl = window.location.origin; // Use the same origin in production
  return `${apiBaseUrl}${path}`;
};

// API Service
const apiService = {
  // Check if the API is reachable
  checkServerHealth: async () => {
    try {
      // Use a simple HEAD request to check if the server is reachable
      const response = await fetch(getFullUrl('/api/streams'), {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      console.error('API server health check failed:', error);
      return false;
    }
  },

  // Get API status
  getStatus: async () => {
    try {
      const response = await axios.get(getFullUrl(`/`));
      return response.data;
    } catch (error) {
      console.error('Error getting API status:', error);
      throw error;
    }
  },

  // Stream Management
  getStreams: async (): Promise<Stream[]> => {
    try {
      const response = await axios.get(getFullUrl(`/api/streams`));
      return ensureArray(response.data);
    } catch (error) {
      console.error('Error fetching streams:', error);
      return [];
    }
  },

  getStreamById: async (id: string): Promise<Stream> => {
    try {
      const response = await axios.get(getFullUrl(`/api/streams/${id}`));
      return response.data;
    } catch (error) {
      console.error(`Error fetching stream ${id}:`, error);
      // Re-throw the error so callers can handle it
      throw error;
    }
  },

  createStream: async (payload: CreateStreamPayload): Promise<{ id: string }> => {
    try {
      const response = await axios.post(getFullUrl(`/api/streams`), payload);
      return response.data;
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  },

  startStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.post(getFullUrl(`/api/streams/${id}/start`));
      return response.data;
    } catch (error) {
      console.error(`Error starting stream ${id}:`, error);
      throw error;
    }
  },

  stopStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.post(getFullUrl(`/api/streams/${id}/stop`));
      return response.data;
    } catch (error) {
      console.error(`Error stopping stream ${id}:`, error);
      throw error;
    }
  },

  deleteStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.delete(getFullUrl(`/api/streams/${id}`));
      return response.data;
    } catch (error) {
      console.error(`Error deleting stream ${id}:`, error);
      throw error;
    }
  },

  // Polygon Management
  getPolygons: async (streamId: string): Promise<Polygon[]> => {
    try {
      const response = await axios.get(getFullUrl(`/api/streams/${streamId}/polygons`));
      return ensureArray(response.data);
    } catch (error) {
      console.error(`Error fetching polygons for stream ${streamId}:`, error);
      return [];
    }
  },

  createPolygon: async (streamId: string, payload: CreatePolygonPayload): Promise<{ id: string }> => {
    try {
      const response = await axios.post(getFullUrl(`/api/streams/${streamId}/polygons`), payload);
      return response.data;
    } catch (error) {
      console.error(`Error creating polygon for stream ${streamId}:`, error);
      throw error;
    }
  },

  updatePolygon: async (streamId: string, polygonId: string, payload: UpdatePolygonPayload): Promise<{ success: boolean }> => {
    try {
      const response = await axios.put(getFullUrl(`/api/streams/${streamId}/polygons/${polygonId}`), payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating polygon ${polygonId}:`, error);
      throw error;
    }
  },

  deletePolygon: async (streamId: string, polygonId: string): Promise<{ success: boolean }> => {
    try {
      const response = await axios.delete(getFullUrl(`/api/streams/${streamId}/polygons/${polygonId}`));
      return response.data;
    } catch (error) {
      console.error(`Error deleting polygon ${polygonId}:`, error);
      throw error;
    }
  },

  // Stream URLs - these need to use the actual server URL for embedding in img tags
  getFrameUrl: (id: string) => getFullUrl(`/api/streams/${id}/frame`),
  
  getStreamUrl: (id: string) => getFullUrl(`/api/streams/${id}/stream`),
  
  getEmbedUrl: (id: string) => getFullUrl(`/api/streams/${id}/embed`),
  
  // WebSocket URL host
  getWebSocketHost: () => {
    // Always use the VITE_TAPI_SERVER environment variable if available
    return import.meta.env.VITE_TAPI_SERVER || 'localhost:8081';
  },
  
  // Helper method to get a frame URL with timestamp to prevent caching
  getFrameUrlWithTimestamp: (id: string) => 
    `${getFullUrl(`/api/streams/${id}/frame`)}?t=${new Date().getTime()}`,

  // ONVIF Camera Discovery
  discoverOnvifCameras: async (timeout?: number): Promise<OnvifCamera[]> => {
    try {
      const timeoutParam = timeout ? `?timeout=${timeout}` : '';
      const response = await axios.get(getFullUrl(`/api/onvif/discover${timeoutParam}`), {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: (timeout || 5) * 1000 + 2000 // API timeout + 2 seconds for network overhead
      });
      
      // Log the response for debugging
      console.log('ONVIF discovery response:', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('ONVIF discovery response is not an array:', response.data);
        return [];
      }
      
      return response.data;
    } catch (error) {
      console.error('Error discovering ONVIF cameras:', error);
      return [];
    }
  },
};

// Vision component API methods
export const getVisionComponents = async (): Promise<any[]> => {
  try {
    const response = await fetch(getFullUrl(`/api/vision/components`));
    if (!response.ok) {
      throw new Error(`Failed to fetch vision components: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching vision components:', error);
    throw error;
  }
};

// Vision models API methods
export const getVisionModels = async (): Promise<any> => {
  try {
    const response = await fetch(getFullUrl(`/api/vision/models`));
    if (!response.ok) {
      throw new Error(`Failed to fetch vision models: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching vision models:', error);
    throw error;
  }
};

// Pipeline API methods
export const getPipelinesForStream = async (streamId: string): Promise<any[]> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines`));
    if (!response.ok) {
      throw new Error(`Failed to fetch pipelines: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    throw error;
  }
};

// Add function to get pipeline processing state
export const getPipelineProcessingState = async (streamId: string, pipelineId: string): Promise<string> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/${pipelineId}/state`));
    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline state: ${response.status}`);
    }
    const data = await response.json();
    return data.processing_state || 'idle';
  } catch (error) {
    console.error('Error fetching pipeline processing state:', error);
    return 'error'; // Return error state if we can't determine the actual state
  }
};

export const getPipeline = async (streamId: string, pipelineId: string): Promise<any> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/${pipelineId}`));
    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    throw error;
  }
};

export const createPipeline = async (streamId: string, pipeline: any): Promise<any> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });
    if (!response.ok) {
      throw new Error(`Failed to create pipeline: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating pipeline:', error);
    throw error;
  }
};

export const updatePipeline = async (streamId: string, pipelineId: string, pipeline: any): Promise<any> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/${pipelineId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });
    if (!response.ok) {
      throw new Error(`Failed to update pipeline: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating pipeline:', error);
    throw error;
  }
};

export const deletePipeline = async (streamId: string, pipelineId: string): Promise<void> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/${pipelineId}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete pipeline: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    throw error;
  }
};

export const activatePipeline = async (streamId: string, pipelineId: string): Promise<void> => {
  console.log(`Activating pipeline ${pipelineId} for stream ${streamId}`);
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/${pipelineId}/activate`), {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to activate pipeline (${response.status}): ${errorText}`);
    }
    
    console.log(`Successfully activated pipeline ${pipelineId}`);
  } catch (error) {
    console.error('Error activating pipeline:', error);
    throw error;
  }
};

// Check if a pipeline is being processed
export const isPipelineProcessing = async (streamId: string, pipelineId: string): Promise<boolean> => {
  try {
    const state = await getPipelineProcessingState(streamId, pipelineId);
    return state === 'processing';
  } catch (error) {
    console.error('Error checking pipeline processing state:', error);
    return false;
  }
};

// Wait for pipeline processing to complete
export const waitForPipelineProcessing = async (
  streamId: string, 
  pipelineId: string, 
  timeoutMs: number = 30000, // Default 30 second timeout
  intervalMs: number = 500    // Check every 500ms
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkState = async () => {
      try {
        const state = await getPipelineProcessingState(streamId, pipelineId);
        
        // If the state is not 'processing', we're done
        if (state !== 'processing') {
          return resolve(state);
        }
        
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeoutMs) {
          return reject(new Error(`Pipeline processing timed out after ${timeoutMs}ms`));
        }
        
        // Check again after the interval
        setTimeout(checkState, intervalMs);
      } catch (error) {
        reject(error);
      }
    };
    
    // Start checking
    checkState();
  });
};

export const getActivePipeline = async (streamId: string): Promise<any> => {
  try {
    const response = await fetch(getFullUrl(`/api/streams/${streamId}/pipelines/active`));

    // If the response is 404, it means there's no active pipeline - this is not an error
    if (response.status === 404) {
      return { active: false };
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch active pipeline: ${response.status}`);
    }
    
    const result = await response.json();
    
    // The backend API returns active:true with a nested 'pipeline' object containing all details
    // Our frontend code expects the pipelineId, so let's normalize the response format
    if (result.active && result.pipeline) {
      // Return a format that matches what the frontend expects
      return {
        active: true,
        pipelineId: result.pipeline.id,
        pipeline: result.pipeline
      };
    }
    
    return result;
  } catch (error) {
    // Only log actual errors, not expected 404s
    if (!(error instanceof Error && error.message.includes("404"))) {
      console.error('Error fetching active pipeline:', error);
    }
    
    // Return a default response that indicates no active pipeline
    return { active: false };
  }
};

export const getPipelineComponents = async (streamId: string, pipelineId: string): Promise<any[]> => {
  try {
    const pipeline = await getPipeline(streamId, pipelineId);
    if (!pipeline || !pipeline.nodes) {
      return [];
    }
    return pipeline.nodes;
  } catch (error) {
    console.error('Error getting pipeline components:', error);
    return [];
  }
};

export const hasPipelineComponent = async (streamId: string, componentType: string): Promise<boolean> => {
  try {
    // Skip the HEAD request since it's causing 500 errors
    // Go directly to pipeline check
    const activePipeline = await getActivePipeline(streamId);
    if (!activePipeline || !activePipeline.active || !activePipeline.pipelineId) {
      return false;
    }

    const components = await getPipelineComponents(streamId, activePipeline.pipelineId);
    return components.some(node => node.componentType === componentType || node.componentId === componentType);
  } catch (error) {
    // Gracefully handle the error - don't show errors in console for expected cases
    if (componentType === 'EventAlarm') {
      console.log(`Unable to determine if stream ${streamId} has ${componentType} component - assuming true for testing`);
      // For testing/development - return true for EventAlarm to test UI
      return true; 
    } else {
      console.error('Error checking for pipeline component:', error);
    }
    return false;
  }
};

export const getStreamAlarms = async (streamId: string): Promise<AlarmEvent[]> => {
  try {
    // Try to get real alarms from the API if it exists
    try {
      const response = await fetch(getFullUrl(`/api/streams/${streamId}/alarms`));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // If endpoint doesn't exist, continue to the mock data
      console.log('Alarms endpoint not available, using mock data for development');
    }
    
    // For development/testing: Return mock alarms when the endpoint doesn't exist
    return [
      {
        message: "Person detected in restricted area",
        objectId: "obj_123",
        objectClass: "person",
        confidence: 0.89,
        timestamp: Date.now() - 300000, // 5 minutes ago
        boundingBox: { x: 100, y: 150, width: 80, height: 200 }
      },
      {
        message: "Vehicle stopped in no parking zone",
        objectId: "obj_456",
        objectClass: "car",
        confidence: 0.95,
        timestamp: Date.now() - 120000 // 2 minutes ago
      },
      {
        message: "Motion detected after hours",
        timestamp: Date.now() - 60000 // 1 minute ago
      }
    ];
  } catch (error) {
    console.error('Error fetching alarms:', error);
    return [];
  }
};

export default apiService; 