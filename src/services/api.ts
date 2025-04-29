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
  }
};

export default apiService; 