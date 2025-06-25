import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Divider,
  Box,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Button } from '../../components/ui/Button';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getComponentTypeName, getComponentTypeDescription } from './ComponentTypeMapping';
import { sourceTypeMapping, processorTypeMapping, sinkTypeMapping } from './ComponentTypeMapping';
import { Component } from '../../services/api';

interface ComponentCardProps {
  component: Component;
  type: 'source' | 'processor' | 'sink';
  onEdit: (component: Component, type: 'source' | 'processor' | 'sink') => void;
  onDelete: (component: Component, type: 'source' | 'processor' | 'sink') => void;
  isDeletingComponent: string | null;
  pipelineRunning: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ 
  component, 
  type, 
  onEdit, 
  onDelete, 
  isDeletingComponent,
  pipelineRunning
}) => {
  // Determine display name for component type
  let componentType = component.type_name || component.type;
  if (typeof componentType !== 'string') {
    componentType = `${componentType}`;
  }
  
  const displayName = getComponentTypeName(componentType, type);
  const description = getComponentTypeDescription(componentType, type);
  const mapping = type === 'source' 
    ? sourceTypeMapping 
    : type === 'processor' 
      ? processorTypeMapping 
      : sinkTypeMapping;
  const icon = mapping[componentType]?.icon;
  
  // Helper function to get tooltip text for disabled buttons
  const getEditTooltipText = (): string => {
    if (pipelineRunning) {
      return "Stop the pipeline to edit this component";
    }
    return "";
  };

  const getDeleteTooltipText = (): string => {
    if (pipelineRunning) {
      return "Stop the pipeline to delete this component";
    }
    if (isDeletingComponent !== null) {
      return "Another component is being deleted";
    }
    return "";
  };
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon && (
            <Box sx={{ mr: 2, color: 'primary.main' }}>
              {icon}
            </Box>
          )}
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {displayName}
          </Typography>
        </Box>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {description}
          </Typography>
        )}
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="text.secondary">
          ID: {component.id}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          Status: {component.running ? 
            <Chip size="small" color="success" label="Running" /> : 
            <Chip size="small" color="default" label="Stopped" />
          }
        </Typography>
      </CardContent>
      <CardActions>
        <Tooltip title={getEditTooltipText()} arrow>
          <span>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={() => onEdit(component, type)}
              disabled={pipelineRunning}
            >
              Edit
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={getDeleteTooltipText()} arrow>
          <span>
            <Button 
              size="small" 
              color="error" 
              startIcon={isDeletingComponent === component.id ? <CircularProgress size={16} color="error" /> : <DeleteIcon />}
              onClick={() => onDelete(component, type)}
              disabled={pipelineRunning || isDeletingComponent !== null}
            >
              {isDeletingComponent === component.id ? 'Deleting...' : 'Delete'}
            </Button>
          </span>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default ComponentCard; 