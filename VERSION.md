# Version Management in Vision Dashboard

This document explains how version management is implemented in the Vision Dashboard application.

## Overview

The application uses a combination of semantic versioning from `package.json` and Git commit hashes to create a unique identifier for each build. This approach provides:

1. **Semantic understanding** of the software version (MAJOR.MINOR.PATCH)
2. **Precise build identification** through Git commit hashes
3. **Traceability** back to the exact source code used for a specific build

## How It Works

### Version Format

The version is displayed in the format: `v{version}-{buildId}`

For example: `v1.0.0-a1b2c3d`

Where:
- `1.0.0` is the semantic version from package.json
- `a1b2c3d` is the short Git commit hash of the build

### Implementation Details

1. **In Vite Configuration** (`vite.config.ts`):
   - Reads the version from `package.json`
   - Uses Git command to get the current commit hash
   - Exposes these as environment variables to the application

2. **Utility Module** (`src/utils/version.ts`):
   - Provides functions to access version information consistently
   - Exports helper functions for formatting the version string

3. **UI Integration**:
   - The version is displayed in the Navbar component
   - Also shown on the application loading screen

## Usage in Code

To use the version information in any component:

```tsx
import { getVersionString, getVersionInfo } from '../utils/version';

// Simple version string (e.g., "v1.0.0-a1b2c3d")
const versionString = getVersionString();

// Or get detailed version info
const versionInfo = getVersionInfo();
console.log(versionInfo.version);    // "1.0.0"
console.log(versionInfo.buildId);    // "a1b2c3d"
console.log(versionInfo.fullVersion); // "v1.0.0-a1b2c3d"
```

## Updating the Version

To update the application version:

1. Update the `version` field in `package.json`
2. The build process will automatically include the current Git commit hash

This approach ensures that each build has a unique identifier, while maintaining semantic versioning principles. 