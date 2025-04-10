# Alarm Functionality Implementation

This document explains how the alarm visibility feature has been implemented in tWeb to show alarms triggered by the tAPI's EventAlarm component.

## Overview

The implementation allows users to:

1. See alarm indicators on stream thumbnails when alarms are active
2. View alarm details by clicking on the indicator to open a modal
3. Only see alarms when the stream's pipeline contains the EventAlarm component

## Components Added/Modified

### New Components

- **AlarmModal.tsx**: Displays a list of alarm events for a stream, including:
  - Timestamp
  - Object class and confidence (if available)
  - Alarm message
  - Object image (if available)

### Modified Components

- **StreamCard.tsx**: Added alarm indicator to thumbnails
- **StreamView.tsx**: Added alarm indicator to detailed stream view
- **StreamViewWS.tsx**: Added alarm indicator to WebSocket stream view

### New Styles

- **AlarmStyles.css**: Added styles for alarm indicators, animation effects, and modal

### API Service Updates

- Added new alarm-related interfaces and functions to `api.ts`:
  - `AlarmEvent` interface for alarm data structure
  - `getStreamAlarms` function to fetch alarms for a stream
  - `hasPipelineComponent` function to check if a pipeline has a specific component type
  - `getPipelineComponents` helper function to get components from a pipeline

## Backend API Requirements

The implementation assumes the tAPI provides the following endpoints:

- `GET /api/streams/{streamId}/alarms` - Returns a list of alarms for a stream
- `GET /api/streams/{streamId}/pipelines/active` - Returns the active pipeline for a stream
- `GET /api/streams/{streamId}/pipelines/{pipelineId}` - Returns details of a specific pipeline

## Development & Testing

For development and testing before the backend API endpoints are fully implemented:

1. The code includes mock alarm data when the `/api/streams/{streamId}/alarms` endpoint is not available
2. The `hasPipelineComponent` function assumes all streams have the EventAlarm component to allow testing the UI
3. This enables developers to see and test the alarm UI without having to implement the backend first

To switch back to production mode, remove the mock data and conditional logic in:
- `getStreamAlarms` function
- `hasPipelineComponent` function
- Revert the simplified logic in the `StreamCard.tsx` component

## Alarm Data Structure

The expected alarm data structure from the API:

```typescript
interface AlarmEvent {
  message: string;               // The alarm message
  objectId?: string;             // ID of the object that triggered the alarm (optional)
  objectClass?: string;          // Class name of the detected object (optional)
  confidence?: number;           // Confidence score (0.0-1.0) (optional)
  timestamp: number;             // Unix timestamp when the alarm was triggered
  boundingBox?: {                // Bounding box of the object (optional)
    x: number,
    y: number,
    width: number,
    height: number
  };
  objectImageBase64?: string;    // Base64 encoded image of the object (optional)
}
```

## How It Works

1. When a stream card is rendered, it checks if the stream's active pipeline contains an EventAlarm component
2. If the EventAlarm component is present, it polls for alarms periodically
3. If alarms exist, an indicator is shown on the thumbnail with the number of alarms
4. Clicking the indicator opens a modal showing detailed alarm information
5. The alarm indicator has a pulsing animation to draw attention

## Implementation Details

### Checking for Alarm Component

```typescript
const checkForAlarmComponent = async () => {
  try {
    const hasComponent = await hasPipelineComponent(stream.id, 'EventAlarm');
    if (mounted) {
      setHasAlarmComponent(hasComponent);
    }
  } catch (error) {
    console.error('Error checking for alarm component:', error);
  }
};
```

### Fetching Alarms

```typescript
const checkForAlarms = async () => {
  try {
    const alarms = await getStreamAlarms(stream.id);
    if (mounted) {
      setHasAlarms(alarms.length > 0);
      setAlarmCount(alarms.length);
    }
  } catch (error) {
    console.error('Error checking for alarms:', error);
  }
};
```

### Displaying Alarm Indicator

```tsx
{hasAlarmComponent && hasAlarms && (
  <div 
    className={`alarm-indicator ${alarmCount > 0 ? 'alarm-pulse' : ''}`}
    onClick={handleAlarmClick}
  >
    {alarmCount > 99 ? '99+' : alarmCount}
  </div>
)}
```

## Troubleshooting

### Missing Alarm Indicators

If alarm indicators aren't showing up on stream thumbnails, check the following:

1. **Backend API Endpoints**: Make sure the tAPI has implemented the `/api/streams/{streamId}/alarms` endpoint.

2. **Proxy Configuration**: If you're seeing 404 errors in the console for API requests, check that your development proxy in Vite is correctly configured to forward API requests to your backend server.

3. **EventAlarm Component**: Ensure that your vision pipeline includes the EventAlarm component. The alarm indicator will only show up if:
   - The stream has an active pipeline
   - The pipeline contains an EventAlarm component
   - There are actual alarms triggered

4. **Direct Alarm Detection**: The implementation has a fallback mechanism that will check directly for alarms via the `/alarms` endpoint even if pipeline detection fails. If alarms exist, indicators should show.

### API Errors

The most common errors are:

- **404 Not Found** for `/api/streams/{streamId}/pipelines/active`: Usually means the API endpoint isn't available or the proxy is misconfigured
- **404 Not Found** for `/api/streams/{streamId}/alarms`: Usually means the alarms endpoint isn't implemented yet

## Future Improvements

Potential future improvements to the alarm functionality:

1. Add alarm filtering options (by date, object type, etc.)
2. Implement alarm acknowledgment to mark alarms as reviewed
3. Add ability to export/download alarm data
4. Implement alarm push notifications
5. Add alarm history visualization with timeline view 