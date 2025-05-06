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
import { IconButton } from '../../components/ui/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

// Interface for PolygonZone
export interface PolygonZone {
  id: string;
  polygon: { x: number, y: number }[];
  min_crossing_threshold: number;
  triggering_anchors: string[];
  in_count?: number;
  out_count?: number;
  current_count?: number;
}

// Anchor options for polygon zones (same as line zones)
export const ANCHOR_OPTIONS = [
  "BOTTOM_LEFT", 
  "BOTTOM_RIGHT", 
  "CENTER", 
  "TOP_LEFT", 
  "TOP_RIGHT", 
  "BOTTOM_CENTER"
];

interface PolygonZoneListProps {
  zones: PolygonZone[];
  selectedZoneIndex: number | null;
  onSelectZone: (index: number) => void;
  onDeleteZone: (index: number) => void;
  onUpdateZone: (index: number, field: keyof PolygonZone, value: any) => void;
  disabled?: boolean;
}

const PolygonZoneList: React.FC<PolygonZoneListProps> = ({ 
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
              bgcolor: selectedZoneIndex === index ? 'action.selected' : 'transparent'
            }}
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="delete" 
                onClick={() => onDeleteZone(index)}
                disabled={disabled}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
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
                  {/* Display vertex count */}
                  <Badge 
                    badgeContent={zone.polygon.length} 
                    color="primary"
                    sx={{ ml: 1 }}
                  >
                    <Chip 
                      size="small" 
                      label="Vertices" 
                      variant="outlined"
                    />
                  </Badge>
                  
                  {/* Display in/out/current counts if available */}
                  {(zone.in_count !== undefined || zone.out_count !== undefined || zone.current_count !== undefined) && (
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
                      {zone.current_count !== undefined && (
                        <Chip
                          size="small"
                          label={`Current: ${zone.current_count}`}
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                </Box>
              }
              secondary={
                <Box component="div" sx={{ mt: 1 }}>
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    Threshold: 
                    <TextField
                      type="number"
                      size="small"
                      variant="standard"
                      value={zone.min_crossing_threshold}
                      onChange={(e) => onUpdateZone(index, 'min_crossing_threshold', parseInt(e.target.value) || 1)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={disabled}
                      sx={{ width: '60px', mx: 1 }}
                      inputProps={{ min: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                    Triggering Anchors:
                  </Typography>
                  <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {ANCHOR_OPTIONS.map((anchor) => (
                      <Chip
                        key={anchor}
                        label={anchor.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...(zone.triggering_anchors || [])];
                            if (currentAnchors.includes(anchor)) {
                              onUpdateZone(
                                index, 
                                'triggering_anchors', 
                                currentAnchors.filter(a => a !== anchor)
                              );
                            } else {
                              onUpdateZone(
                                index, 
                                'triggering_anchors', 
                                [...currentAnchors, anchor]
                              );
                            }
                          }
                        }}
                        color={(zone.triggering_anchors || []).includes(anchor) ? "primary" : "default"}
                        variant={(zone.triggering_anchors || []).includes(anchor) ? "filled" : "outlined"}
                        disabled={disabled}
                        sx={{ mt: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              }
              onClick={() => onSelectZone(index)}
              sx={{ cursor: 'pointer' }}
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