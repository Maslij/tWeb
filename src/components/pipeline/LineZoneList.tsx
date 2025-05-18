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

// Interface for Zone
export interface Zone {
  id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  min_crossing_threshold: number;
  triggering_anchors: string[];
  in_count?: number;
  out_count?: number;
}

// Export the ANCHOR_OPTIONS and other anchor related constants from the shared component
export { 
  ANCHOR_OPTIONS, 
  ANCHOR_GROUPS, 
  ANCHOR_PRESETS 
} from './AnchorPointsSelector';

interface LineZoneListProps {
  zones: Zone[];
  selectedZoneIndex: number | null;
  onSelectZone: (index: number) => void;
  onDeleteZone: (index: number) => void;
  onUpdateZone: (index: number, field: keyof Zone, value: any) => void;
  disabled?: boolean;
}

const LineZoneList: React.FC<LineZoneListProps> = ({ 
  zones, 
  selectedZoneIndex, 
  onSelectZone, 
  onDeleteZone, 
  onUpdateZone,
  disabled = false
}) => {
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
            key={zone.id || index}
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
                    value={zone.id}
                    size="small"
                    variant="standard"
                    onChange={(e) => onUpdateZone(index, 'id', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                    sx={{ width: '130px' }}
                  />
                  {/* Display in/out counts if available */}
                  {(zone.in_count !== undefined || zone.out_count !== undefined) && (
                    <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
                      <Chip
                        size="small"
                        label={`In: ${zone.in_count || 0}`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Out: ${zone.out_count || 0}`}
                        color="primary"
                        variant="outlined"
                      />
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
                    onUpdateZone(index, 'min_crossing_threshold', value);
                  }}
                  onClick={(e) => e.stopPropagation()}
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
                onUpdateAnchors={(newAnchors) => onUpdateZone(index, 'triggering_anchors', newAnchors)}
                disabled={disabled}
                index={index}
              />
            </Box>
          </ListItem>
        ))
      )}
    </List>
  );
};

export default LineZoneList; 