# Vision Pipeline Implementation Details

This document provides implementation details for developers working on the vision pipeline system in the tAPI and tWeb projects. It outlines the changes made to integrate the vision pipeline functionality and provides guidance for future development.

## Overview of Changes

### Backend (tAPI) Changes

1. **Created New Data Models**
   - `VisionComponent`: Represents available vision processing components
   - `PipelineNode`: Represents an instance of a component in a pipeline
   - `VisionPipeline`: Represents a complete vision processing pipeline

2. **Added Management Classes**
   - `VisionManager`: Manages available components and pipelines
   - Integrated with the existing `Api` and `Stream` classes

3. **Added API Endpoints**
   - Component discovery endpoints
   - Pipeline management endpoints
   - Pipeline activation endpoints

4. **Implemented Placeholder Vision Components**
   - Added 11 vision components across 6 categories
   - Created foundation for actual implementation of vision processing

### Frontend (tWeb) Changes

1. **Created VisionPipelineBuilder Component**
   - Interactive drag-and-drop UI for building pipelines
   - Component palette based on API-provided components
   - Connection management between components
   - Node property configuration panel

2. **Updated API Service**
   - Added methods to interact with vision pipeline endpoints
   - Implemented error handling for pipeline operations

3. **Integrated Builder into StreamDetails View**
   - Added tab for Pipeline Builder in stream view
   - Added pipeline fetching and management logic

## Key Files and Their Roles

### Backend (tAPI)

- `include/vision_component.h`: Vision component data model
- `src/vision_component.cpp`: Implementation of vision component class
- `include/vision_pipeline.h`: Pipeline and node data models
- `src/vision_pipeline.cpp`: Implementation of pipeline and node classes
- `include/vision_manager.h`: Manager class for components and pipelines
- `src/vision_manager.cpp`: Implementation of the vision manager
- `include/api.h` (updated): Added vision manager integration
- `src/api.cpp` (updated): Added vision pipeline API endpoints

### Frontend (tWeb)

- `src/components/VisionPipelineBuilder.tsx`: Main UI component for pipeline building
- `src/styles/VisionPipelineBuilder.css`: Styling for the pipeline builder
- `src/services/api.ts` (updated): Added API methods for pipeline management
- `src/pages/StreamDetails.tsx` (updated): Integrated pipeline builder

## Implementation Notes

### Vision Component Lifecycle

1. **Registration**: Components are registered in the VisionManager's `initComponents` method
2. **Discovery**: Frontend fetches available components via the API
3. **Instantiation**: User adds components to pipeline via drag-and-drop
4. **Configuration**: User configures component properties
5. **Connection**: User connects components to define data flow
6. **Activation**: User activates pipeline for processing

### Pipeline Saving and Loading

1. **Creation**: New pipelines are created via POST to `/api/streams/{streamId}/pipelines`
2. **Update**: Existing pipelines are updated via PUT to `/api/streams/{streamId}/pipelines/{pipelineId}`
3. **Loading**: Pipelines are loaded from GET requests to `/api/streams/{streamId}/pipelines`
4. **Activation**: Pipelines are activated via POST to `/api/streams/{streamId}/pipelines/{pipelineId}/activate`

### Error Handling

1. **API Errors**: Backend returns appropriate HTTP status codes and error messages
2. **Frontend Handling**: Frontend displays error notifications and retry options
3. **Graceful Degradation**: System continues functioning even if certain operations fail

## Next Development Steps

### Backend (tAPI)

1. **Implement Actual Vision Processing**
   - Add OpenCV processing code to each component
   - Create a pipeline execution engine
   - Implement frame processing through the connected components

2. **Add Pipeline Persistence**
   - Add database storage for pipelines
   - Implement pipeline auto-loading on startup

3. **Implement Component Extensions**
   - Create a plugin system for custom components
   - Add dynamic component loading

### Frontend (tWeb)

1. **Enhance Pipeline Visualization**
   - Add visual indicators for data flowing through the pipeline
   - Improve connection drawing with better routing

2. **Add Pipeline Testing Features**
   - Add ability to test pipeline without activating
   - Show preview results from each component

3. **Improve Pipeline Management**
   - Add pipeline duplication
   - Add pipeline templates/presets

## Common Issues and Solutions

1. **404 Errors for Pipeline API**
   - Ensure the `VisionManager` is properly initialized in the API constructor
   - Check API routes in `setupVisionRoutes` method

2. **Pipeline Not Loading After Refresh**
   - Pipeline loading has been fixed to properly handle:
     - Fetching existing pipelines for a stream
     - Loading the active pipeline
     - Handling 404 responses gracefully

3. **Creating vs. Updating Pipelines**
   - Issue: System tried to update non-existent pipelines
   - Solution: Added logic to check if pipeline exists before deciding to create or update
   - Key logic in `handleSavePipeline` in StreamDetails.tsx

## API Contract Reference

The API endpoints follow this contract:

```
GET /api/vision/components
Returns: Array of vision components

GET /api/streams/{streamId}/pipelines
Returns: Array of pipelines for the specified stream

POST /api/streams/{streamId}/pipelines
Body: Pipeline object without ID
Returns: Created pipeline with server-generated ID

PUT /api/streams/{streamId}/pipelines/{pipelineId}
Body: Pipeline object with ID
Returns: Updated pipeline

POST /api/streams/{streamId}/pipelines/{pipelineId}/activate
Returns: Success indicator

GET /api/streams/{streamId}/pipelines/active
Returns: Active pipeline object or { active: false }
```

## Conclusion

The vision pipeline system provides a foundation for building complex video processing workflows through a visual interface. The current implementation focuses on the pipeline building and management aspects, with placeholders for the actual vision processing functionality. Future development should implement the actual processing components and enhance the pipeline execution engine.

This project demonstrates integration between a C++ backend (tAPI) and React frontend (tWeb) for a complex vision processing application. 