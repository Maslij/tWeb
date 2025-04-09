# tWeb

A lightweight React web application for interfacing with tAPI video streaming service.

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
