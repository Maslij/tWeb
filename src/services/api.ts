import axios from 'axios';

// Use relative URLs to work with the Vite proxy
const API_URL = '';

// Stream type definitions
export interface Stream {
  id: string;
  name: string;
  source: string;
  type: 'camera' | 'file' | 'rtsp';
  status: 'created' | 'running' | 'stopped' | 'error';
  width?: number;
  height?: number;
  fps?: number;
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
    return path;
  }
  
  // For production, we need to use the actual API server
  // You might need to configure this based on your deployment setup
  const apiBaseUrl = 'http://localhost:8080'; // Default for development without proxy
  return `${apiBaseUrl}${path}`;
};

// API Service
const apiService = {
  // Get API status
  getStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting API status:', error);
      throw error;
    }
  },

  // Stream Management
  getStreams: async (): Promise<Stream[]> => {
    try {
      const response = await axios.get(`${API_URL}/api/streams`);
      return ensureArray(response.data);
    } catch (error) {
      console.error('Error fetching streams:', error);
      return [];
    }
  },

  getStreamById: async (id: string): Promise<Stream> => {
    try {
      const response = await axios.get(`${API_URL}/api/streams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stream ${id}:`, error);
      // Re-throw the error so callers can handle it
      throw error;
    }
  },

  createStream: async (payload: CreateStreamPayload): Promise<{ id: string }> => {
    try {
      const response = await axios.post(`${API_URL}/api/streams`, payload);
      return response.data;
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  },

  startStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.post(`${API_URL}/api/streams/${id}/start`);
      return response.data;
    } catch (error) {
      console.error(`Error starting stream ${id}:`, error);
      throw error;
    }
  },

  stopStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.post(`${API_URL}/api/streams/${id}/stop`);
      return response.data;
    } catch (error) {
      console.error(`Error stopping stream ${id}:`, error);
      throw error;
    }
  },

  deleteStream: async (id: string): Promise<{ success: boolean; id: string }> => {
    try {
      const response = await axios.delete(`${API_URL}/api/streams/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting stream ${id}:`, error);
      throw error;
    }
  },

  // Polygon Management
  getPolygons: async (streamId: string): Promise<Polygon[]> => {
    try {
      const response = await axios.get(`${API_URL}/api/streams/${streamId}/polygons`);
      return ensureArray(response.data);
    } catch (error) {
      console.error(`Error fetching polygons for stream ${streamId}:`, error);
      return [];
    }
  },

  createPolygon: async (streamId: string, payload: CreatePolygonPayload): Promise<{ id: string }> => {
    try {
      const response = await axios.post(`${API_URL}/api/streams/${streamId}/polygons`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error creating polygon for stream ${streamId}:`, error);
      throw error;
    }
  },

  updatePolygon: async (streamId: string, polygonId: string, payload: UpdatePolygonPayload): Promise<{ success: boolean }> => {
    try {
      const response = await axios.put(`${API_URL}/api/streams/${streamId}/polygons/${polygonId}`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating polygon ${polygonId}:`, error);
      throw error;
    }
  },

  deletePolygon: async (streamId: string, polygonId: string): Promise<{ success: boolean }> => {
    try {
      const response = await axios.delete(`${API_URL}/api/streams/${streamId}/polygons/${polygonId}`);
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
    // For development with the proxy, we need to use the actual API server
    // since WebSocket connections cannot be proxied by the dev server
    return 'localhost:8080'; // Always use the direct API server for WebSockets
  },
  
  // Helper method to get a frame URL with timestamp to prevent caching
  getFrameUrlWithTimestamp: (id: string) => 
    `${getFullUrl(`/api/streams/${id}/frame`)}?t=${new Date().getTime()}`
};

// Vision component API methods
export const getVisionComponents = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vision/components`);
    if (!response.ok) {
      throw new Error(`Failed to fetch vision components: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching vision components:', error);
    throw error;
  }
};

// Pipeline API methods
export const getPipelinesForStream = async (streamId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pipelines: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    throw error;
  }
};

export const getPipeline = async (streamId: string, pipelineId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/${pipelineId}`);
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
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines`, {
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
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/${pipelineId}`, {
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
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/${pipelineId}`, {
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
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/${pipelineId}/activate`, {
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

export const deactivatePipeline = async (streamId: string, pipelineId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/${pipelineId}/deactivate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to deactivate pipeline: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deactivating pipeline:', error);
    throw error;
  }
};

export const getActivePipeline = async (streamId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/api/streams/${streamId}/pipelines/active`);
    
    // If the response is 404, it means there's no active pipeline - this is not an error
    if (response.status === 404) {
      return { active: false };
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch active pipeline: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Only log actual errors, not expected 404s
    if (!(error instanceof Error && error.message.includes("404"))) {
      console.error('Error fetching active pipeline:', error);
    }
    
    // Return a default response that indicates no active pipeline
    return { active: false };
  }
};

export default apiService; 