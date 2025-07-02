import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  Tooltip,
  Typography
} from '@mui/material';
import { IconButton } from '../../components/ui/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AnchorPointsSelector from './AnchorPointsSelector';
import ClassSelector from './ClassSelector';

// Interface for Zone
export interface Zone {
  id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  min_crossing_threshold: number;
  triggering_anchors: string[];
  triggering_classes: string[];
  in_count?: number;
  out_count?: number;
}

// Export the ANCHOR_OPTIONS and other anchor related constants from the shared component
export { 
  ANCHOR_OPTIONS, 
  ANCHOR_GROUPS, 
  ANCHOR_PRESETS 
} from './AnchorPointsSelector';

// Utility function to sanitize zone data for backend updates
// Removes runtime properties that should be maintained by the backend
const sanitizeZoneForUpdate = (zone: Zone): Omit<Zone, 'in_count' | 'out_count'> => {
  const { in_count, out_count, ...sanitizedZone } = zone;
  return sanitizedZone;
};

interface LineZoneListProps {
  zones: Zone[];
  selectedZoneIndex: number | null;
  onSelectZone: (index: number) => void;
  onDeleteZone: (index: number) => void;
  onUpdateZone: (index: number, field: keyof Zone, value: any) => void;
  onUnsavedChange?: () => void; // New prop to immediately trigger unsaved changes
  disabled?: boolean;
  availableClasses?: string[]; // Available classes from object detector
}

const LineZoneList: React.FC<LineZoneListProps> = ({ 
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
            primary="No zones defined" 
            secondary="Draw a line on the image to create a zone" 
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
              flexDirection: 'column', 
              alignItems: 'stretch'
            }}
          >
            <Box sx={{ display: 'flex', width: '100%', mb: 1 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                    sx={{ width: '130px' }}
                  />
                  {/* Display in/out counts if available */}
                  {(zone.in_count !== undefined || zone.out_count !== undefined) && (
                    <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
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
                    </Box>
                  )}
                </Box>
              }
                onClick={() => onSelectZone(index)}
                sx={{ cursor: 'pointer' }}
                primaryTypographyProps={{ component: 'div' }}
              />
              <IconButton 
                edge="end" 
                aria-label="delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteZone(index);
                }}
                disabled={disabled}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            
            <Box component="div" sx={{ width: '100%' }}>
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <Tooltip title="Minimum number of frames required for an object to be counted as crossing the line. Higher values reduce false positives but may miss quick movements. Valid range: 1-10." arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Threshold <HelpOutlineIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.secondary' }} />:
                  </Box>
                </Tooltip>
                <TextField
                  type="number"
                  size="small"
                  variant="standard"
                  value={zone.min_crossing_threshold}
                  onChange={(e) => {
                    // Convert to number, ensure it's at least 1 and at most 10
                    const value = e.target.value === '' ? 1 : Math.min(Math.max(parseInt(e.target.value) || 1, 1), 10);
                    onSelectZone(index); // Select zone when updating threshold
                    onUpdateZone(index, 'min_crossing_threshold', value);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectZone(index); // Also select the zone when clicking the threshold field
                  }}
                  onFocus={() => onSelectZone(index)} // Select zone when focusing the threshold field
                  disabled={disabled}
                  sx={{ width: '60px', mx: 1 }}
                  inputProps={{ 
                    min: 1, 
                    max: 10,
                    step: 1
                  }}
                />
              </Box>
              
              {/* Use shared AnchorPointsSelector component */}
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
          </ListItem>
        ))
      )}
    </List>
  );
};

export default LineZoneList; 