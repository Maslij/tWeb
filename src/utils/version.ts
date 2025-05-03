/**
 * Application version utilities
 */

// Get app version and build ID from Vite environment
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev';

/**
 * Returns the full version string in the format v{version}-{buildId}
 */
export const getVersionString = (): string => {
  return `v${APP_VERSION}-${BUILD_ID}`;
};

/**
 * Returns an object with version information
 */
export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    buildId: BUILD_ID,
    fullVersion: getVersionString(),
    buildDate: new Date().toISOString()
  };
};

export default {
  APP_VERSION,
  BUILD_ID,
  getVersionString,
  getVersionInfo
}; 