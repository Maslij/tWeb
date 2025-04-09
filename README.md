# tWeb - Video Stream Management Web Interface

## Overview

tWeb is a React-based web interface for the tAPI video stream management system. It provides a user-friendly interface for:

- Creating and managing video streams from cameras, files, or RTSP sources
- Monitoring and controlling streams
- Defining regions of interest with the polygon editor
- Building and managing computer vision pipelines with the Vision Pipeline Builder

## Vision Pipeline Builder

The web interface now includes a powerful Vision Pipeline Builder that allows users to create computer vision processing pipelines through an intuitive, visual drag-and-drop interface. The builder provides the following capabilities:

- Drag-and-drop interface for adding vision components
- Interactive connection creation between components
- Visual feedback for valid connections
- Component configuration through property panels
- Pipeline saving and activation

### Key Components and Files

- `VisionPipelineBuilder.tsx`: Main component for the pipeline builder UI
- `StreamDetails.tsx`: Integration of the pipeline builder into the stream details view
- `api.ts`: API integration functions for pipeline management

### Core Pipeline Builder Features

1. **Component Palette**: 
   - Displays available vision components from the API
   - Components are categorized by type (source, detector, tracker, etc.)
   - Shows which components are available based on current pipeline state

2. **Canvas Workspace**:
   - Interactive area for building pipelines
   - Nodes can be freely positioned and connected
   - Visual connection lines show data flow

3. **Node Properties**:
   - Configuration panel for selected components
   - Displays component-specific settings
   - Shows input and output data types

4. **Pipeline Management**:
   - Save pipelines to the API
   - Activate pipelines for processing
   - Load existing pipelines for editing

### Vision Component Categories

The system supports six categories of components:

1. **Source**: Generates image data from camera or file
2. **Detector**: Identifies objects or features in images
3. **Tracker**: Tracks detected objects across frames
4. **Classifier**: Categorizes detected objects
5. **Geometry**: Manages spatial regions and operations
6. **Sink**: Outputs or stores processing results

## Integration with tAPI

The web interface integrates with the tAPI backend through a set of API endpoints:

1. **Component Discovery**:
   - Fetches available vision components from `/api/vision/components`
   - Dynamically builds the component palette based on available components

2. **Pipeline Management**:
   - Creates pipelines via POST to `/api/streams/{streamId}/pipelines`
   - Updates pipelines via PUT to `/api/streams/{streamId}/pipelines/{pipelineId}`
   - Retrieves pipelines via GET from `/api/streams/{streamId}/pipelines`
   - Activates pipelines via POST to `/api/streams/{streamId}/pipelines/{pipelineId}/activate`

## Development and Customization

### Adding New Components

To add support for new vision components:

1. Add the component definition to the tAPI backend
2. The UI will automatically discover and display the new component
3. No changes needed to the VisionPipelineBuilder component

### Customizing the Builder UI

The pipeline builder UI can be customized by modifying:

- `VisionPipelineBuilder.tsx`: Core builder component
- `VisionPipelineBuilder.css`: Styling for the builder

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5173 and will connect to the tAPI backend at http://localhost:8080.

## Features

- View and manage video streams from cameras, files, or RTSP sources
- Create, start, stop, and delete streams
- Real-time stream viewing with auto-refresh
- Responsive interface for desktop and mobile devices
- Quick setup with sample streams

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Running instance of tAPI server

## Getting Started

1. Make sure the tAPI server is running (default at http://localhost:8080)

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage

1. **Dashboard** - View all available streams
2. **Create Stream** - Add a new stream from camera, file, or RTSP
3. **Stream Details** - View stream details, control and embed streams

### Quick Start with Sample Stream

The dashboard includes a "Create Demo Stream" button that creates a sample stream using the Big Buck Bunny video. Use this to quickly test the application's functionality.

## Configuration

The API base URL can be configured in `src/services/api.ts`:

```typescript
const API_URL = 'http://localhost:8080'; // Change this to match your tAPI server
```

## Technologies Used

- React
- TypeScript
- Vite
- React Router
- Axios

## License

MIT
