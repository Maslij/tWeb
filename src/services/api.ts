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

export default apiService; 