import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  Tooltip,
  Typography,
  Paper,
  Button,
  Collapse,
  Divider
} from '@mui/material';
import { IconButton } from '../../components/ui/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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

// Anchor options for line zones with more descriptive grouping
export const ANCHOR_GROUPS = {
  "Top Points": ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"],
  "Center Points": ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"],
  "Bottom Points": ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"]
};

// Predefined anchor presets for quick selection
export const ANCHOR_PRESETS = {
  "Border Points": ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"],
  "Center Line": ["CENTER_LEFT", "CENTER", "CENTER_RIGHT"],
  "Bottom Line": ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"],
  "People Counting": ["BOTTOM_CENTER", "CENTER"],
  "Vehicle Counting": ["CENTER", "CENTER_LEFT", "CENTER_RIGHT"],
  "All Points": [
    "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", 
    "CENTER_LEFT", "CENTER", "CENTER_RIGHT", 
    "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"
  ],
};

// Flat list for backward compatibility
export const ANCHOR_OPTIONS = [
  "BOTTOM_LEFT", 
  "BOTTOM_RIGHT", 
  "CENTER", 
  "TOP_LEFT", 
  "TOP_RIGHT", 
  "BOTTOM_CENTER",
  "TOP_CENTER",
  "CENTER_LEFT",
  "CENTER_RIGHT"
];

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
  // State to track which zones have expanded custom anchor selection
  const [expandedCustomAnchors, setExpandedCustomAnchors] = useState<{[key: number]: boolean}>({});

  // Toggle custom anchor selection expand/collapse
  const toggleCustomAnchors = (index: number) => {
    setExpandedCustomAnchors(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Apply a preset to a zone
  const applyPreset = (index: number, presetName: string) => {
    if (disabled) return;
    
    const presetAnchors = ANCHOR_PRESETS[presetName as keyof typeof ANCHOR_PRESETS];
    if (!presetAnchors) return;
    
    onUpdateZone(index, 'triggering_anchors', [...presetAnchors]);
  };

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
                onClick={() => onDeleteZone(index)}
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
              
              <Paper 
                elevation={0} 
                sx={{ 
                  mt: 2, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Anchor Points
                    </Typography>
                    <Tooltip 
                      title={
                        <React.Fragment>
                          <Typography variant="body2" component="p" sx={{ mb: 1 }}>
                            Anchor points determine which parts of an object are tracked when crossing the line.
                          </Typography>
                          
                          {/* Visual representation of anchor points */}
                          <Box sx={{ 
                            width: '180px', 
                            height: '120px', 
                            border: '2px solid #666',
                            borderRadius: '2px',
                            position: 'relative',
                            mb: 2,
                            mx: 'auto',
                            backgroundColor: 'rgba(255,255,255,0.1)'
                          }}>
                            {/* Top points */}
                            <Box sx={{ position: 'absolute', top: '0px', left: '0px', width: '8px', height: '8px', backgroundColor: '#ff5722', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '-2px', left: '-20px', color: 'white' }}>TL</Typography>
                            
                            <Box sx={{ position: 'absolute', top: '0px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', backgroundColor: '#ff5722', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', color: 'white' }}>TC</Typography>
                            
                            <Box sx={{ position: 'absolute', top: '0px', right: '0px', width: '8px', height: '8px', backgroundColor: '#ff5722', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '-2px', right: '-20px', color: 'white' }}>TR</Typography>
                            
                            {/* Center points */}
                            <Box sx={{ position: 'absolute', top: '50%', left: '0px', transform: 'translateY(-50%)', width: '8px', height: '8px', backgroundColor: '#2196f3', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '50%', left: '-25px', transform: 'translateY(-50%)', color: 'white' }}>CL</Typography>
                            
                            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', backgroundColor: '#2196f3', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', px: 0.5, borderRadius: '2px' }}>C</Typography>
                            
                            <Box sx={{ position: 'absolute', top: '50%', right: '0px', transform: 'translateY(-50%)', width: '8px', height: '8px', backgroundColor: '#2196f3', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', top: '50%', right: '-25px', transform: 'translateY(-50%)', color: 'white' }}>CR</Typography>
                            
                            {/* Bottom points */}
                            <Box sx={{ position: 'absolute', bottom: '0px', left: '0px', width: '8px', height: '8px', backgroundColor: '#4caf50', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', bottom: '-2px', left: '-20px', color: 'white' }}>BL</Typography>
                            
                            <Box sx={{ position: 'absolute', bottom: '0px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', backgroundColor: '#4caf50', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)', color: 'white' }}>BC</Typography>
                            
                            <Box sx={{ position: 'absolute', bottom: '0px', right: '0px', width: '8px', height: '8px', backgroundColor: '#4caf50', borderRadius: '50%' }} />
                            <Typography variant="caption" sx={{ position: 'absolute', bottom: '-2px', right: '-20px', color: 'white' }}>BR</Typography>
                          </Box>
                          
                          <Typography variant="body2" component="p" sx={{ mb: 1 }}>
                            At least one anchor point must be selected for tracking to work properly.
                          </Typography>
                        </React.Fragment>
                      } 
                      arrow
                      placement="top"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.secondary' }} />
                    </Tooltip>
                  </Box>
                  <Box onClick={(e) => {
                    e.stopPropagation();
                    toggleCustomAnchors(index);
                  }}>
                    <IconButton size="small">
                      {expandedCustomAnchors[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>
                
                <Divider />
                
                {/* Predefined anchor presets */}
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Quick Presets:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.keys(ANCHOR_PRESETS).map((presetName) => (
                      <Chip
                        key={presetName}
                        label={presetName}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            applyPreset(index, presetName);
                          }
                        }}
                        color={JSON.stringify(zone.triggering_anchors.sort()) === 
                               JSON.stringify(ANCHOR_PRESETS[presetName as keyof typeof ANCHOR_PRESETS].sort()) 
                              ? "primary" : "default"}
                        variant={JSON.stringify(zone.triggering_anchors.sort()) === 
                                 JSON.stringify(ANCHOR_PRESETS[presetName as keyof typeof ANCHOR_PRESETS].sort())
                                ? "filled" : "outlined"}
                        disabled={disabled}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Currently selected anchors */}
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Selected Anchors ({zone.triggering_anchors.length}):
                  </Typography>
                  {zone.triggering_anchors.length > 0 ? (
                    <Box
                      sx={{
                        width: '180px',
                        height: '120px',
                        border: '2px solid #666',
                        borderRadius: '2px',
                        position: 'relative',
                        mx: 'auto',
                        backgroundColor: 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {/* Top points */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '0px',
                          left: '0px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('TOP_LEFT')
                            ? '#ff5722'
                            : 'rgba(255,87,34,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('TOP_LEFT')
                                ? '0 0 0 3px rgba(255,87,34,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('TOP_LEFT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'TOP_LEFT')
                              );
                            } else {
                              onUpdateZone(index, 'triggering_anchors', [...currentAnchors, 'TOP_LEFT']);
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: '-2px',
                          left: '-20px',
                          color: 'text.secondary'
                        }}
                      >
                        TL
                      </Typography>

                      <Box
                        sx={{
                          position: 'absolute',
                          top: '0px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('TOP_CENTER')
                            ? '#ff5722'
                            : 'rgba(255,87,34,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('TOP_CENTER')
                                ? '0 0 0 3px rgba(255,87,34,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('TOP_CENTER')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'TOP_CENTER')
                              );
                            } else {
                              onUpdateZone(index, 'triggering_anchors', [...currentAnchors, 'TOP_CENTER']);
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: '-15px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          color: 'text.secondary'
                        }}
                      >
                        TC
                      </Typography>

                      <Box
                        sx={{
                          position: 'absolute',
                          top: '0px',
                          right: '0px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('TOP_RIGHT')
                            ? '#ff5722'
                            : 'rgba(255,87,34,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('TOP_RIGHT')
                                ? '0 0 0 3px rgba(255,87,34,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('TOP_RIGHT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'TOP_RIGHT')
                              );
                            } else {
                              onUpdateZone(index, 'triggering_anchors', [...currentAnchors, 'TOP_RIGHT']);
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-20px',
                          color: 'text.secondary'
                        }}
                      >
                        TR
                      </Typography>

                      {/* Center points */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '0px',
                          transform: 'translateY(-50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('CENTER_LEFT')
                            ? '#2196f3'
                            : 'rgba(33,150,243,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('CENTER_LEFT')
                                ? '0 0 0 3px rgba(33,150,243,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('CENTER_LEFT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'CENTER_LEFT')
                              );
                            } else {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                [...currentAnchors, 'CENTER_LEFT']
                              );
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '-25px',
                          transform: 'translateY(-50%)',
                          color: 'text.secondary'
                        }}
                      >
                        CL
                      </Typography>

                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('CENTER')
                            ? '#2196f3'
                            : 'rgba(33,150,243,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('CENTER')
                                ? '0 0 0 3px rgba(33,150,243,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('CENTER')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'CENTER')
                              );
                            } else {
                              onUpdateZone(index, 'triggering_anchors', [...currentAnchors, 'CENTER']);
                            }
                          }
                        }}
                      />

                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          right: '0px',
                          transform: 'translateY(-50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('CENTER_RIGHT')
                            ? '#2196f3'
                            : 'rgba(33,150,243,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('CENTER_RIGHT')
                                ? '0 0 0 3px rgba(33,150,243,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('CENTER_RIGHT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'CENTER_RIGHT')
                              );
                            } else {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                [...currentAnchors, 'CENTER_RIGHT']
                              );
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          right: '-25px',
                          transform: 'translateY(-50%)',
                          color: 'text.secondary'
                        }}
                      >
                        CR
                      </Typography>

                      {/* Bottom points */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: '0px',
                          left: '0px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('BOTTOM_LEFT')
                            ? '#4caf50'
                            : 'rgba(76,175,80,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('BOTTOM_LEFT')
                                ? '0 0 0 3px rgba(76,175,80,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('BOTTOM_LEFT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'BOTTOM_LEFT')
                              );
                            } else {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                [...currentAnchors, 'BOTTOM_LEFT']
                              );
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: '-20px',
                          color: 'text.secondary'
                        }}
                      >
                        BL
                      </Typography>

                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: '0px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('BOTTOM_CENTER')
                            ? '#4caf50'
                            : 'rgba(76,175,80,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('BOTTOM_CENTER')
                                ? '0 0 0 3px rgba(76,175,80,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('BOTTOM_CENTER')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'BOTTOM_CENTER')
                              );
                            } else {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                [...currentAnchors, 'BOTTOM_CENTER']
                              );
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: '-15px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          color: 'text.secondary'
                        }}
                      >
                        BC
                      </Typography>

                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: '0px',
                          right: '0px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: zone.triggering_anchors.includes('BOTTOM_RIGHT')
                            ? '#4caf50'
                            : 'rgba(76,175,80,0.2)',
                          borderRadius: '50%',
                          cursor: !disabled ? 'pointer' : 'default',
                          '&:hover': {
                            boxShadow:
                              !disabled && !zone.triggering_anchors.includes('BOTTOM_RIGHT')
                                ? '0 0 0 3px rgba(76,175,80,0.3)'
                                : 'none'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            const currentAnchors = [...zone.triggering_anchors];
                            if (currentAnchors.includes('BOTTOM_RIGHT')) {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                currentAnchors.filter((a) => a !== 'BOTTOM_RIGHT')
                              );
                            } else {
                              onUpdateZone(
                                index,
                                'triggering_anchors',
                                [...currentAnchors, 'BOTTOM_RIGHT']
                              );
                            }
                          }
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-20px',
                          color: 'text.secondary'
                        }}
                      >
                        BR
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="error">
                      No anchors selected - please select at least one
                    </Typography>
                  )}
                </Box>
                
                {/* Custom anchor selection (expandable) */}
                <Collapse in={expandedCustomAnchors[index]}>
                  <Divider />
                  <Box sx={{ p: 1.5, bgcolor: 'background.default' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Custom Selection:
                    </Typography>
                    
                    {Object.entries(ANCHOR_GROUPS).map(([groupName, anchors]) => (
                      <Box key={groupName} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {groupName}:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {anchors.map((anchor) => (
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
                      />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Paper>
                </Box>
          </ListItem>
        ))
      )}
    </List>
  );
};

export default LineZoneList; 