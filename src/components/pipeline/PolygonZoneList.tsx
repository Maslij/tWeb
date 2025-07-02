import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  Typography,
  Badge
} from '@mui/material';
import AnchorPointsSelector from './AnchorPointsSelector';
import ClassSelector from './ClassSelector';

// Interface for PolygonZone
export interface PolygonZone {
  id: string;
  polygon: { x: number, y: number }[];
  min_crossing_threshold: number;
  triggering_anchors: string[];
  triggering_classes: string[];
  in_count?: number;
  out_count?: number;
  current_count?: number;
}

// Export the ANCHOR_OPTIONS from the shared component
export { ANCHOR_OPTIONS } from './AnchorPointsSelector';

interface PolygonZoneListProps {
  zones: PolygonZone[];
  selectedZoneIndex: number | null;
  onSelectZone: (index: number) => void;
  onDeleteZone: (index: number) => void;
  onUpdateZone: (index: number, field: keyof PolygonZone, value: any) => void;
  onUnsavedChange?: () => void; // New prop to immediately trigger unsaved changes
  disabled?: boolean;
  availableClasses?: string[]; // Available classes from object detector
}

const PolygonZoneList: React.FC<PolygonZoneListProps> = ({ 
  zones, 
  selectedZoneIndex, 
  onSelectZone, 
  onDeleteZone, 
  onUpdateZone,
  onUnsavedChange,
  disabled = false,
  availableClasses
}) => {
  // Local state to manage the editing of zone names
  const [editingZoneId, setEditingZoneId] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>('');
  // Add debounced update refs
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = React.useRef<Map<number, string>>(new Map());

  const handleZoneNameClick = (index: number, currentValue: string) => {
    setEditingZoneId(index);
    setEditingValue(currentValue);
  };

  const handleZoneNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
    // Immediately trigger unsaved changes when user starts typing
    if (onUnsavedChange) {
      onUnsavedChange();
    }
  };

  // Debounced update function to batch API calls
  const debouncedZoneUpdate = React.useCallback((index: number, value: string) => {
    // Store the pending update
    pendingUpdatesRef.current.set(index, value);
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Set new timeout to batch updates
    updateTimeoutRef.current = setTimeout(() => {
      // Process all pending updates
      const updates = new Map(pendingUpdatesRef.current);
      pendingUpdatesRef.current.clear();
      
      // Apply updates in batch
      updates.forEach((updateValue, updateIndex) => {
        onUpdateZone(updateIndex, 'id', updateValue);
      });
      
      updateTimeoutRef.current = null;
    }, 500); // 500ms debounce delay
  }, [onUpdateZone]);

  const handleZoneNameBlur = (index: number) => {
    const trimmedValue = editingValue.trim();
    const finalValue = trimmedValue === '' ? `zone${index + 1}` : trimmedValue;
    
    // Use debounced update instead of immediate update
    debouncedZoneUpdate(index, finalValue);
    
    setEditingZoneId(null);
    setEditingValue('');
  };

  const handleZoneNameKeyPress = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleZoneNameBlur(index);
    } else if (e.key === 'Escape') {
      setEditingZoneId(null);
      setEditingValue('');
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <List sx={{ 
      width: '100%', 
      bgcolor: 'background.paper', 
      borderRadius: 1, 
      border: '1px solid', 
      borderColor: 'divider',
      maxHeight: '500px',
      overflow: 'auto'
    }}>
      {zones.length === 0 ? (
        <ListItem>
          <ListItemText 
            primary="No polygon zones defined" 
            secondary="Draw a polygon on the image to create a zone" 
          />
        </ListItem>
      ) : (
        zones.map((zone, index) => (
          <ListItem
            key={index}
            sx={{
              borderBottom: index < zones.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              bgcolor: selectedZoneIndex === index ? 'action.selected' : 'transparent',
              borderLeft: selectedZoneIndex === index ? '4px solid' : '4px solid transparent',
              borderLeftColor: selectedZoneIndex === index ? 'primary.main' : 'transparent',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: selectedZoneIndex === index ? 'action.selected' : 'action.hover',
                borderLeftColor: selectedZoneIndex === index ? 'primary.main' : 'primary.light'
              },
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => onSelectZone(index)}
          >
            {/* Invisible overlay to capture clicks anywhere in the item */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                cursor: 'pointer'
              }}
              onClick={() => onSelectZone(index)}
            />
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', zIndex: 2 }}>
                  {/* Zone name input with selection indicator */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedZoneIndex === index && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <TextField
                      value={editingZoneId === index ? editingValue : zone.id}
                      size="small"
                      variant="standard"
                      onChange={handleZoneNameChange}
                      onBlur={() => handleZoneNameBlur(index)}
                      onKeyDown={(e) => handleZoneNameKeyPress(e, index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectZone(index); // Also select the zone when clicking the text field
                        if (editingZoneId !== index) {
                          handleZoneNameClick(index, zone.id);
                        }
                      }}
                      onFocus={() => onSelectZone(index)} // Select zone when focusing the text field
                      disabled={disabled}
                      sx={{
                        width: '150px',
                        flexShrink: 0,
                        position: 'relative',
                        zIndex: 3,
                        '& .MuiInput-underline:before': {
                          borderBottomColor: selectedZoneIndex === index ? 'primary.main' : 'divider'
                        }
                      }}
                      placeholder="Zone name"
                    />
                    {selectedZoneIndex === index && (
                      <Chip
                        size="small"
                        label="ACTIVE"
                        color="primary"
                        variant="filled"
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                    )}
                  </Box>
                  
                  {/* Vertex count and detection counts */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {/* Display vertex count */}
                    <Badge 
                      badgeContent={zone.polygon.length} 
                      color="primary"
                    >
                      <Chip 
                        size="small" 
                        label="Vertices" 
                        variant="outlined"
                      />
                    </Badge>
                    
                    {/* Display in/out/current counts if available */}
                    {(zone.in_count !== undefined || zone.out_count !== undefined || zone.current_count !== undefined) && (
                      <>
                        {zone.in_count !== undefined && zone.in_count > 0 && (
                          <Chip
                            size="small"
                            label={`In: ${zone.in_count}`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {zone.out_count !== undefined && zone.out_count > 0 && (
                          <Chip
                            size="small"
                            label={`Out: ${zone.out_count}`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {zone.current_count !== undefined && zone.current_count > 0 && (
                          <Chip
                            size="small"
                            label={`Current: ${zone.current_count}`}
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              }
              secondary={
                <Box component="div" sx={{ mt: 1, position: 'relative', zIndex: 2 }}>
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    Threshold:
                    <TextField
                      type="number"
                      size="small"
                      variant="standard"
                      value={zone.min_crossing_threshold}
                      onChange={(e) => onUpdateZone(index, 'min_crossing_threshold', parseInt(e.target.value) || 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectZone(index); // Also select the zone when clicking the threshold field
                      }}
                      onFocus={() => onSelectZone(index)} // Select zone when focusing the threshold field
                      disabled={disabled}
                      sx={{ width: '60px', mx: 1, position: 'relative', zIndex: 3 }}
                      inputProps={{ min: 1 }}
                    />
                  </Box>
                  
                  {/* Use shared AnchorPointsSelector component with zone selection */}
                  <Box
                    sx={{ position: 'relative', zIndex: 3 }}
                    onClick={(e) => {
                      // If clicking on the anchor points area but not on interactive elements, select the zone
                      if (e.target === e.currentTarget) {
                        onSelectZone(index);
                      }
                    }}
                  >
                    <AnchorPointsSelector
                      triggering_anchors={zone.triggering_anchors || []}
                      onUpdateAnchors={(newAnchors) => {
                        onSelectZone(index); // Select zone when updating anchors
                        onUpdateZone(index, 'triggering_anchors', newAnchors);
                      }}
                      disabled={disabled}
                      index={index}
                    />
                    
                    {/* Class selector for triggering classes */}
                    <ClassSelector
                      triggering_classes={zone.triggering_classes || []}
                      onUpdateClasses={(newClasses) => {
                        onSelectZone(index); // Select zone when updating classes
                        onUpdateZone(index, 'triggering_classes', newClasses);
                      }}
                      disabled={disabled}
                      index={index}
                      availableClasses={availableClasses || []}
                    />
                  </Box>
                </Box>
              }
              sx={{ cursor: 'pointer', userSelect: 'none', position: 'relative', zIndex: 2 }}
              primaryTypographyProps={{ component: 'div' }}
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        ))
      )}
    </List>
  );
};

export default PolygonZoneList; 