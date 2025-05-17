import React, { useState } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  Paper,
  Divider,
  Collapse,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Anchor options with more descriptive grouping
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

interface AnchorPointsSelectorProps {
  triggering_anchors: string[];
  onUpdateAnchors: (newAnchors: string[]) => void;
  disabled?: boolean;
  index?: number; // Used for expandedCustomAnchors state
}

const AnchorPointsSelector: React.FC<AnchorPointsSelectorProps> = ({
  triggering_anchors,
  onUpdateAnchors,
  disabled = false,
  index = 0
}) => {
  // State to track which zones have expanded custom anchor selection
  const [expandedCustomAnchors, setExpandedCustomAnchors] = useState<{[key: number]: boolean}>({});

  // Toggle custom anchor selection expand/collapse
  const toggleCustomAnchors = (idx: number) => {
    setExpandedCustomAnchors(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Apply a preset to a zone
  const applyPreset = (presetName: string) => {
    if (disabled) return;
    
    const presetAnchors = ANCHOR_PRESETS[presetName as keyof typeof ANCHOR_PRESETS];
    if (!presetAnchors) return;
    
    onUpdateAnchors([...presetAnchors]);
  };

  return (
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
                  applyPreset(presetName);
                }
              }}
              color={JSON.stringify(triggering_anchors.sort()) === 
                     JSON.stringify(ANCHOR_PRESETS[presetName as keyof typeof ANCHOR_PRESETS].sort()) 
                    ? "primary" : "default"}
              variant={JSON.stringify(triggering_anchors.sort()) === 
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
          Selected Anchors ({triggering_anchors.length}):
        </Typography>
        {triggering_anchors.length > 0 ? (
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
                backgroundColor: triggering_anchors.includes('TOP_LEFT')
                  ? '#ff5722'
                  : 'rgba(255,87,34,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('TOP_LEFT')
                      ? '0 0 0 3px rgba(255,87,34,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('TOP_LEFT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'TOP_LEFT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'TOP_LEFT']);
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
                backgroundColor: triggering_anchors.includes('TOP_CENTER')
                  ? '#ff5722'
                  : 'rgba(255,87,34,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('TOP_CENTER')
                      ? '0 0 0 3px rgba(255,87,34,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('TOP_CENTER')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'TOP_CENTER'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'TOP_CENTER']);
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
                backgroundColor: triggering_anchors.includes('TOP_RIGHT')
                  ? '#ff5722'
                  : 'rgba(255,87,34,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('TOP_RIGHT')
                      ? '0 0 0 3px rgba(255,87,34,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('TOP_RIGHT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'TOP_RIGHT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'TOP_RIGHT']);
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
                backgroundColor: triggering_anchors.includes('CENTER_LEFT')
                  ? '#2196f3'
                  : 'rgba(33,150,243,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('CENTER_LEFT')
                      ? '0 0 0 3px rgba(33,150,243,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('CENTER_LEFT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'CENTER_LEFT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'CENTER_LEFT']);
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
                backgroundColor: triggering_anchors.includes('CENTER')
                  ? '#2196f3'
                  : 'rgba(33,150,243,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('CENTER')
                      ? '0 0 0 3px rgba(33,150,243,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('CENTER')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'CENTER'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'CENTER']);
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
                backgroundColor: triggering_anchors.includes('CENTER_RIGHT')
                  ? '#2196f3'
                  : 'rgba(33,150,243,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('CENTER_RIGHT')
                      ? '0 0 0 3px rgba(33,150,243,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('CENTER_RIGHT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'CENTER_RIGHT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'CENTER_RIGHT']);
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
                backgroundColor: triggering_anchors.includes('BOTTOM_LEFT')
                  ? '#4caf50'
                  : 'rgba(76,175,80,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('BOTTOM_LEFT')
                      ? '0 0 0 3px rgba(76,175,80,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('BOTTOM_LEFT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'BOTTOM_LEFT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'BOTTOM_LEFT']);
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
                backgroundColor: triggering_anchors.includes('BOTTOM_CENTER')
                  ? '#4caf50'
                  : 'rgba(76,175,80,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('BOTTOM_CENTER')
                      ? '0 0 0 3px rgba(76,175,80,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('BOTTOM_CENTER')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'BOTTOM_CENTER'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'BOTTOM_CENTER']);
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
                backgroundColor: triggering_anchors.includes('BOTTOM_RIGHT')
                  ? '#4caf50'
                  : 'rgba(76,175,80,0.2)',
                borderRadius: '50%',
                cursor: !disabled ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow:
                    !disabled && !triggering_anchors.includes('BOTTOM_RIGHT')
                      ? '0 0 0 3px rgba(76,175,80,0.3)'
                      : 'none'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const currentAnchors = [...triggering_anchors];
                  if (currentAnchors.includes('BOTTOM_RIGHT')) {
                    onUpdateAnchors(currentAnchors.filter((a) => a !== 'BOTTOM_RIGHT'));
                  } else {
                    onUpdateAnchors([...currentAnchors, 'BOTTOM_RIGHT']);
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
                        const currentAnchors = [...(triggering_anchors || [])];
                        if (currentAnchors.includes(anchor)) {
                          onUpdateAnchors(currentAnchors.filter(a => a !== anchor));
                        } else {
                          onUpdateAnchors([...currentAnchors, anchor]);
                        }
                      }
                    }}
                    color={(triggering_anchors || []).includes(anchor) ? "primary" : "default"}
                    variant={(triggering_anchors || []).includes(anchor) ? "filled" : "outlined"}
                    disabled={disabled}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default AnchorPointsSelector; 