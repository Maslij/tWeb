import React from 'react';
import {
  Paper,
  Divider,
  Alert,
  Stack,
  Box,
  AlertTitle,
  Tooltip
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import ComponentCard from './ComponentCard';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import MemoryIcon from '@mui/icons-material/Memory';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Camera, Component } from '../../services/api';

interface PipelineConfigTabProps {
  sourceComponent: Component | null;
  processorComponents: Component[];
  sinkComponents: Component[];
  openCreateDialog: (type: 'source' | 'processor' | 'sink') => void;
  openEditDialog: (component: Component, type: 'source' | 'processor' | 'sink') => void;
  handleDeleteComponent: (component: Component, type: 'source' | 'processor' | 'sink') => void;
  isDeletingComponent: string | null;
  camera: Camera;
  areAllComponentTypesUsed: (category: 'processor' | 'sink') => boolean;
  openTemplateDialog: () => void;
  inferenceServerAvailable: boolean;
}

const PipelineConfigTab: React.FC<PipelineConfigTabProps> = ({
  sourceComponent,
  processorComponents,
  sinkComponents,
  openCreateDialog,
  openEditDialog,
  handleDeleteComponent,
  isDeletingComponent,
  camera,
  areAllComponentTypesUsed,
  openTemplateDialog,
  inferenceServerAvailable
}) => {
  // Helper function to get tooltip text for disabled buttons
  const getTooltipText = (type: 'source' | 'processor' | 'sink', isTemplate: boolean = false): string => {
    if (camera.running) {
      return "Stop the pipeline to access configuration";
    }
    
    if (type === 'source' && sourceComponent) {
      return "Source component already exists";
    }
    
    if (!sourceComponent && (type === 'processor' || type === 'sink')) {
      return "Add a source component first";
    }
    
    if (isTemplate && !inferenceServerAvailable) {
      return "AI server unavailable - templates require AI models";
    }
    
    if (areAllComponentTypesUsed(type as 'processor' | 'sink')) {
      return `All available ${type} types have been added`;
    }
    
    return "";
  };

  // Render component card
  const renderComponentCard = (component: Component, type: 'source' | 'processor' | 'sink') => {
    return (
      <ComponentCard
        key={component.id}
        component={component}
        type={type}
        onEdit={openEditDialog}
        onDelete={handleDeleteComponent}
        isDeletingComponent={isDeletingComponent}
        pipelineRunning={!!camera?.running}
      />
    );
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Inference Server Status Alert */}
      {!inferenceServerAvailable && (
        <Alert severity="warning" sx={{ mb: 0 }}>
          <AlertTitle>AI Server Unavailable</AlertTitle>
          The AI model server is currently offline or not responding. AI-dependent components 
          and templates requiring object detection, classification, or other AI features will not be available until 
          the server is back online.
        </Alert>
      )}
      
      {/* Source Card */}
      <Paper elevation={2} sx={{ p: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VideoSettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Source</Typography>
          </Box>
          <Tooltip title={getTooltipText('source')} arrow>
            <span>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => openCreateDialog('source')}
                disabled={!!sourceComponent || camera.running}
                size="small"
              >
                Add Source
              </Button>
            </span>
          </Tooltip>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ minHeight: sourceComponent ? 'auto' : '200px' }}>
          {sourceComponent ? (
            renderComponentCard(sourceComponent, 'source')
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <VideoSettingsIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No source component added yet. Add a source to start building your pipeline.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Processors Card */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MemoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Processors</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={getTooltipText('processor', true)} arrow>
              <span>
                <Button
                  variant="outlined"
                  color="secondary"
                  icon={<AutoFixHighIcon />}
                  onClick={openTemplateDialog}
                  disabled={!sourceComponent || camera.running || !inferenceServerAvailable}
                  size="small"
                >
                  Use Template
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={getTooltipText('processor')} arrow>
              <span>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => openCreateDialog('processor')}
                  disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('processor')}
                  size="small"
                >
                  Add Processor
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {areAllComponentTypesUsed('processor') && sourceComponent && !camera.running && (
          <Alert severity="info" sx={{ mb: 2 }}>
            All available processor types have been added. Each processor type can only be added once.
          </Alert>
        )}
        
        <Box sx={{ minHeight: processorComponents.length > 0 ? 'auto' : '200px' }}>
          {processorComponents.length > 0 ? (
            <Stack spacing={2}>
              {processorComponents.map(processor => (
                <Box key={processor.id}>
                  {renderComponentCard(processor, 'processor')}
                </Box>
              ))}
            </Stack>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <MemoryIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {!sourceComponent ? 
                  "Add a source component first before adding processors." :
                  "No processor components added yet. Add processors to process the video stream."
                }
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Sinks Card */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SaveIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Sinks</Typography>
          </Box>
          <Tooltip title={getTooltipText('sink')} arrow>
            <span>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => openCreateDialog('sink')}
                disabled={!sourceComponent || camera.running || areAllComponentTypesUsed('sink')}
                size="small"
              >
                Add Sink
              </Button>
            </span>
          </Tooltip>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {areAllComponentTypesUsed('sink') && sourceComponent && !camera.running && (
          <Alert severity="info" sx={{ mb: 2 }}>
            All available sink types have been added. Each sink type can only be added once.
          </Alert>
        )}
        
        <Box sx={{ minHeight: sinkComponents.length > 0 ? 'auto' : '200px' }}>
          {sinkComponents.length > 0 ? (
            <Stack spacing={2}>
              {sinkComponents.map(sink => (
                <Box key={sink.id}>
                  {renderComponentCard(sink, 'sink')}
                </Box>
              ))}
            </Stack>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <SaveIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {!sourceComponent ? 
                  "Add a source component first before adding sinks." :
                  "No sink components added yet. Add sinks to save or stream the processed video."
                }
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default PipelineConfigTab; 