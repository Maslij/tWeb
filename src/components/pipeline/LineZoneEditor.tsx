import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip,
  useTheme
} from '@mui/material';
import { IconButton } from '../../components/ui/IconButton';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LineZoneList, { Zone } from './LineZoneList';

interface LineZoneEditorProps {
  zones: Zone[];
  onZonesChange: (zones: Zone[]) => void;
  onUnsavedChange?: () => void; // New prop to immediately trigger unsaved changes
  imageUrl: string;
  disabled?: boolean;
  availableClasses?: string[]; // Available classes from object detector
}

const LineZoneEditor: React.FC<LineZoneEditorProps> = ({ zones, onZonesChange, onUnsavedChange, imageUrl, disabled = false, availableClasses = [] }) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<'start' | 'end' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number, y: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number, height: number } | null>(null);
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ zoneIndex: number, point: 'start' | 'end' | 'line' } | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const nextImageRef = useRef<HTMLImageElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingZonesUpdateRef = useRef<Zone[] | null>(null);
  const isActivelyDraggingRef = useRef<boolean>(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const localZonesRef = useRef<Zone[]>(zones);
  
  // Update local reference when zones prop changes
  useEffect(() => {
    localZonesRef.current = zones;
  }, [zones]);
  
  // Improved throttling mechanism for zone updates with better performance
  const throttledZoneUpdate = useCallback((updatedZones: Zone[]) => {
    const now = Date.now();
    
    // Increased throttle time to reduce render frequency during drag operations
    // Only update parent component at most every 100ms during active dragging
    if (now - lastUpdateTimeRef.current > 100) {
      pendingZonesUpdateRef.current = null;
      lastUpdateTimeRef.current = now;
      
      // Use requestAnimationFrame for smoother updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onZonesChange(updatedZones);
        rafRef.current = null;
      });
    } else {
      // Store the latest update to apply later, but don't trigger a render yet
      pendingZonesUpdateRef.current = updatedZones;
      
      // Update our local reference for immediate visual updates without parent re-render
      localZonesRef.current = updatedZones;
      drawCanvas();
    }
  }, [onZonesChange]);
  
  // Apply any pending updates when dragging ends
  useEffect(() => {
    if (!draggingPoint && pendingZonesUpdateRef.current) {
      onZonesChange(pendingZonesUpdateRef.current);
      pendingZonesUpdateRef.current = null;
    }
    
    // Clean up any pending RAF on unmount
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [draggingPoint, onZonesChange]);
  
  // Preload image to prevent flickering
  useEffect(() => {
    if (!imageUrl || imageUrl === "") return;
    
    // Only update if the URL has changed
    if (imageUrl === currentImageUrl) return;
    
    // Create a new image element for preloading
    const newImg = new Image();
    
    newImg.onload = () => {
      // Store the image size for accurate calculations
      setImageSize({ width: newImg.width, height: newImg.height });
      
      // Store the loaded image reference and URL
      nextImageRef.current = newImg;
      setCurrentImageUrl(imageUrl);
      
      // Draw the canvas with the new image
      drawCanvas();
    };
    
    newImg.src = imageUrl;
  }, [imageUrl]);
  
  // Initialize canvas on mount
  useEffect(() => {
    // Initialize canvas size
    const container = containerRef.current;
    if (container) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawCanvas();
      }
    }
    
    // Add window resize handler
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Redraw canvas when zones, selectedZone, or hover state changes
  useEffect(() => {
    drawCanvas();
  }, [selectedZone, hoveredPoint, currentImageUrl]);
  
  // Optimized drawCanvas function that uses the local zones reference for faster drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Get the current zones from local reference for faster updates during dragging
    const currentZones = localZonesRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image if available
    if (nextImageRef.current && currentImageUrl) {
      // Stretch image to fill entire canvas (since we're using normalized coordinates)
      ctx.drawImage(nextImageRef.current, 0, 0, canvas.width, canvas.height);
      
      // Draw zones
      currentZones.forEach((zone, index) => {
        // Convert normalized coordinates to canvas coordinates
        const startX = zone.start_x * canvas.width;
        const startY = zone.start_y * canvas.height;
        const endX = zone.end_x * canvas.width;
        const endY = zone.end_y * canvas.height;
        
        // Define styles based on selection state
        const isSelected = index === selectedZone;
        const isHovered = hoveredPoint && hoveredPoint.zoneIndex === index;
        
        // Draw line with different style if selected or hovered
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = isSelected ? 4 : isHovered && hoveredPoint?.point === 'line' ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#2196f3' : isHovered ? '#42a5f5' : '#64b5f6';
        ctx.stroke();
        
        // Add a subtle glow effect for selected lines
        if (isSelected) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = 8;
          ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)';
          ctx.stroke();
        }
        
        // Draw crossing direction indicators
        const angle = Math.atan2(endY - startY, endX - startX);
        
        // Calculate perpendicular direction (90 degrees counter-clockwise from line direction)
        // This represents the "IN" direction for crossing detection
        const perpAngle = angle + Math.PI / 2;
        const perpX = Math.cos(perpAngle);
        const perpY = Math.sin(perpAngle);
        
        // Draw direction arrows at multiple points along the line
        const arrowPositions = [0.3, 0.7];
        const directionArrowLength = 18;
        const directionArrowWidth = 5;
        
        arrowPositions.forEach(position => {
          const posX = startX + (endX - startX) * position;
          const posY = startY + (endY - startY) * position;
          
          // Draw "IN" arrow (perpendicular to line, pointing to right side)
          const inArrowEndX = posX - perpX * directionArrowLength;
          const inArrowEndY = posY - perpY * directionArrowLength;
          
          // Arrow shaft
          ctx.beginPath();
          ctx.moveTo(posX, posY);
          ctx.lineTo(inArrowEndX, inArrowEndY);
          ctx.strokeStyle = isSelected ? '#4caf50' : 'rgba(76, 175, 80, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Arrow head (pointing in the corrected direction)
          const correctedPerpAngle = perpAngle + Math.PI; // Reverse the angle since we flipped the direction
          ctx.beginPath();
          ctx.moveTo(inArrowEndX, inArrowEndY);
          ctx.lineTo(
            inArrowEndX - directionArrowWidth * Math.cos(correctedPerpAngle) + directionArrowWidth * Math.sin(correctedPerpAngle),
            inArrowEndY - directionArrowWidth * Math.sin(correctedPerpAngle) - directionArrowWidth * Math.cos(correctedPerpAngle)
          );
          ctx.lineTo(
            inArrowEndX - directionArrowWidth * Math.cos(correctedPerpAngle) - directionArrowWidth * Math.sin(correctedPerpAngle),
            inArrowEndY - directionArrowWidth * Math.sin(correctedPerpAngle) + directionArrowWidth * Math.cos(correctedPerpAngle)
          );
          ctx.closePath();
          ctx.fillStyle = isSelected ? '#4caf50' : 'rgba(76, 175, 80, 0.8)';
          ctx.fill();
        });
        
        // Draw points with different colors and sizes based on state
        const startPointIsHovered = isHovered && hoveredPoint?.point === 'start';
        const endPointIsHovered = isHovered && hoveredPoint?.point === 'end';
        
        // Increase point size for selection and hover
        const startPointRadius = isSelected || startPointIsHovered ? 8 : 6;
        const endPointRadius = isSelected || endPointIsHovered ? 8 : 6;
        
        // Start point with glow effect
        if (isSelected || startPointIsHovered) {
          ctx.beginPath();
          ctx.arc(startX, startY, startPointRadius + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
          ctx.fill();
        }
        
        // Start point
        ctx.beginPath();
        ctx.arc(startX, startY, startPointRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#4caf50'; // Green
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // End point with glow effect
        if (isSelected || endPointIsHovered) {
          ctx.beginPath();
          ctx.arc(endX, endY, endPointRadius + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
          ctx.fill();
        }
        
        // End point
        ctx.beginPath();
        ctx.arc(endX, endY, endPointRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#f44336'; // Red
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw zone ID
        ctx.font = isSelected ? 'bold 14px Roboto' : '14px Roboto';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate the middle point of the line
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Draw a background for the text
        const textMetrics = ctx.measureText(zone.id);
        const textWidth = textMetrics.width;
        const textHeight = 20;
        
        ctx.fillStyle = isSelected ? 'rgba(33, 150, 243, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(midX - textWidth / 2 - 5, midY - textHeight / 2 - 15, textWidth + 10, textHeight);
        
        // Draw the text
        ctx.fillStyle = 'white';
        ctx.fillText(zone.id, midX, midY - 15);
        
        // Draw side labels to show IN/OUT directions
        const labelDistance = 25;
        const labelPositionAlongLine = 0.5; // Middle of the line
        const labelX = startX + (endX - startX) * labelPositionAlongLine;
        const labelY = startY + (endY - startY) * labelPositionAlongLine;
        
        // "IN" label (right side of line - matches C++ crossProductLine < 0 logic)
        const inLabelX = labelX - perpX * labelDistance;
        const inLabelY = labelY - perpY * labelDistance;
        
        ctx.font = 'bold 11px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Background for IN label
        const inLabelWidth = ctx.measureText('IN').width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(inLabelX - inLabelWidth/2 - 3, inLabelY - 7, inLabelWidth + 6, 14);
        ctx.fillStyle = isSelected ? '#4caf50' : 'rgba(76, 175, 80, 0.9)';
        ctx.fillText('IN', inLabelX, inLabelY);
        
        // "OUT" label (left side of line)
        const outLabelX = labelX + perpX * labelDistance;
        const outLabelY = labelY + perpY * labelDistance;
        
        // Background for OUT label
        const outLabelWidth = ctx.measureText('OUT').width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(outLabelX - outLabelWidth/2 - 3, outLabelY - 7, outLabelWidth + 6, 14);
        ctx.fillStyle = isSelected ? '#f44336' : 'rgba(244, 67, 54, 0.8)';
        ctx.fillText('OUT', outLabelX, outLabelY);
      });
    }
  }, [selectedZone, hoveredPoint, currentImageUrl, theme.palette.mode]);

  // Convert canvas coordinates to normalized coordinates
  const canvasToNormalizedCoords = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Simply normalize based on canvas size since we're stretching the image
    const normalizedX = Math.max(0, Math.min(1, x / canvas.width));
    const normalizedY = Math.max(0, Math.min(1, y / canvas.height));
    
    return { x: normalizedX, y: normalizedY };
  }, []);

  // Optimized hover detection for better performance
  const checkHoverStatus = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const currentZones = localZonesRef.current;
    
    // Only run hover detection if we're not actively dragging to save performance
    if (isActivelyDraggingRef.current) {
      return hoveredPoint;
    }
    
    // Check if hovering over any control points or lines
    for (let i = 0; i < currentZones.length; i++) {
      const zone = currentZones[i];
      
      // Convert normalized coordinates to canvas coordinates
      const startX = zone.start_x * canvas.width;
      const startY = zone.start_y * canvas.height;
      const endX = zone.end_x * canvas.width;
      const endY = zone.end_y * canvas.height;
      
      // Check distance to start point
      const distToStart = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
      if (distToStart < 10) {
        canvas.style.cursor = 'pointer';
        return { zoneIndex: i, point: 'start' as const };
      }
      
      // Check distance to end point
      const distToEnd = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2);
      if (distToEnd < 10) {
        canvas.style.cursor = 'pointer';
        return { zoneIndex: i, point: 'end' as const };
      }
      
      // Check distance to line
      const lineLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      if (lineLength === 0) continue;
      
      const dot = ((x - startX) * (endX - startX) + (y - startY) * (endY - startY)) / (lineLength ** 2);
      
      if (dot < 0 || dot > 1) continue;
      
      const closestX = startX + dot * (endX - startX);
      const closestY = startY + dot * (endY - startY);
      
      const distToLine = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
      
      if (distToLine < 10) {
        canvas.style.cursor = 'pointer';
        return { zoneIndex: i, point: 'line' as const };
      }
    }
    
    canvas.style.cursor = drawMode ? 'crosshair' : 'default';
    return null;
  }, [drawMode, hoveredPoint]);

  // Optimized mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle drawing visualization
    if (drawMode && isDrawing && drawStartPos) {
      requestAnimationFrame(() => drawCanvas());
      return;
    }
    
    // Handle dragging of control points
    if (draggingPoint !== null && selectedZone !== null) {
      const normalized = canvasToNormalizedCoords(x, y);
      
      // Clone the zones to avoid direct mutation
      const updatedZones = [...localZonesRef.current];
      
      if (draggingPoint === 'start') {
        updatedZones[selectedZone] = {
          ...updatedZones[selectedZone],
          start_x: normalized.x,
          start_y: normalized.y
        };
      } else if (draggingPoint === 'end') {
        updatedZones[selectedZone] = {
          ...updatedZones[selectedZone],
          end_x: normalized.x,
          end_y: normalized.y
        };
      }
      
      // Use the throttled update mechanism for better performance
      throttledZoneUpdate(updatedZones);
      return;
    }
    
    // For hover effects, use debouncing to avoid excessive checks
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      // Track what's under the cursor using the helper function
      const hoverStatus = checkHoverStatus(x, y);
      
      // Only update if there's a change in hover state to reduce rerenders
      if (JSON.stringify(hoveredPoint) !== JSON.stringify(hoverStatus)) {
        setHoveredPoint(hoverStatus);
        requestAnimationFrame(() => drawCanvas());
      }
      
      hoverTimeoutRef.current = null;
    }, 50); // Debounce time of 50ms for hover detection
  }, [disabled, drawMode, isDrawing, drawStartPos, draggingPoint, selectedZone, canvasToNormalizedCoords, throttledZoneUpdate, checkHoverStatus, drawCanvas, hoveredPoint]);

  // Handle mouse down event
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Clear any pending hover updates
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // If in draw mode, start drawing
    if (drawMode) {
      setIsDrawing(true);
      setDrawStartPos({ x, y });
      setSelectedZone(null);
      return;
    }
    
    // Get current hover state instead of checking again
    const hoverState = checkHoverStatus(x, y);
    
    if (hoverState) {
      setSelectedZone(hoverState.zoneIndex);
      
      if (hoverState.point === 'start' || hoverState.point === 'end') {
        setDraggingPoint(hoverState.point);
        isActivelyDraggingRef.current = true;
      }
      
      return;
    }
    
    // If not clicking on any control points, deselect
    setSelectedZone(null);
    setDraggingPoint(null);
  }, [disabled, drawMode, checkHoverStatus]);

  // Handle mouse up event
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If in drawing mode and finishing a line
    if (drawMode && isDrawing && drawStartPos) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const startNormalized = canvasToNormalizedCoords(drawStartPos.x, drawStartPos.y);
      const endNormalized = canvasToNormalizedCoords(x, y);
      
      // Check if line is long enough
      const dx = x - drawStartPos.x;
      const dy = y - drawStartPos.y;
      const lineLength = Math.sqrt(dx * dx + dy * dy);
      
      if (lineLength > 20) {
        // Get existing zone IDs to find next available number
        const existingIds = localZonesRef.current.map(zone => zone.id);
        let nextIndex = 1;
        
        // Find the next available zone number
        while (existingIds.includes(`zone${nextIndex}`)) {
          nextIndex++;
        }
        
        // Create a new zone with simple sequential ID
        const newZone: Zone = {
          id: `zone${nextIndex}`,
          start_x: startNormalized.x,
          start_y: startNormalized.y,
          end_x: endNormalized.x,
          end_y: endNormalized.y,
          min_crossing_threshold: 1,
          // Always ensure at least one anchor point is selected by default
          triggering_anchors: ["BOTTOM_CENTER", "CENTER"],
          triggering_classes: []
        };
        
        onZonesChange([...localZonesRef.current, newZone]);
        setSelectedZone(localZonesRef.current.length);
      }
      
      setIsDrawing(false);
      setDrawStartPos(null);
      setDrawMode(false);
      return;
    }
    
    isActivelyDraggingRef.current = false;
    
    // If we were dragging, make sure final state is synchronized
    if (draggingPoint !== null && pendingZonesUpdateRef.current) {
      onZonesChange(pendingZonesUpdateRef.current);
      pendingZonesUpdateRef.current = null;
    }
    
    setDraggingPoint(null);
  }, [disabled, drawMode, isDrawing, drawStartPos, canvasToNormalizedCoords, onZonesChange, draggingPoint, availableClasses]);

  const handleDeleteSelectedZone = useCallback(() => {
    if (selectedZone === null) return;
    
    // Create a completely new array without the selected zone
    const updatedZones = localZonesRef.current.filter((_, i) => i !== selectedZone);
    
    // Immediately update the parent component with the new zones array
    onZonesChange(updatedZones);
    
    // Reset selection
    setSelectedZone(null);
  }, [selectedZone, onZonesChange]);

  const handleFlipLineDirection = useCallback(() => {
    if (selectedZone === null) return;
    
    const updatedZones = [...localZonesRef.current];
    const zone = updatedZones[selectedZone];
    
    // Swap start and end points to flip the line direction
    updatedZones[selectedZone] = {
      ...zone,
      start_x: zone.end_x,
      start_y: zone.end_y,
      end_x: zone.start_x,
      end_y: zone.start_y
    };
    
    onZonesChange(updatedZones);
  }, [selectedZone, onZonesChange]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1">Line Zone Editor</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={drawMode ? "contained" : "outlined"}
            color="primary"
            startIcon={<CreateIcon />}
            onClick={() => setDrawMode(true)}
            disabled={disabled}
            size="small"
          >
            Draw Line
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteSelectedZone}
            disabled={selectedZone === null || disabled}
            size="small"
          >
            Delete Selected
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SwapHorizIcon />}
            onClick={handleFlipLineDirection}
            disabled={selectedZone === null || disabled}
            size="small"
          >
            Flip Direction
          </Button>
          <Tooltip title={
            <div>
              <div><strong>Line Zone Crossing Detection:</strong></div>
              <br />
              <div>• Draw lines by clicking and dragging</div>
              <div>• Green arrows point toward the "IN" side of the line</div>
              <div>• Objects crossing from OUT → IN side are counted as "in"</div>
              <div>• Objects crossing from IN → OUT side are counted as "out"</div>
              <br />
              <div>• Green dot = line start, Red dot = line end</div>
              <div>• Use "Flip Direction" to reverse IN/OUT sides</div>
              <div>• Click lines or endpoints to select and edit</div>
            </div>
          }>
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, flex: 1, minHeight: 0 }}>
        <Box 
          data-line-zone-editor="true"
          sx={{ 
            position: 'relative',
            flex: 1,
            width: '100%',
            height: '100%',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'background.paper'
          }}
          ref={(el: HTMLDivElement | null) => {
            containerRef.current = el;
            if (el) {
              (el as any).__isActivelyDragging = isActivelyDraggingRef.current;
            }
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setDraggingPoint(null);
              isActivelyDraggingRef.current = false;
              setHoveredPoint(null);
              
              // Clear any pending hover debouncing
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              
              // Make sure any pending updates are applied
              if (pendingZonesUpdateRef.current) {
                onZonesChange(pendingZonesUpdateRef.current);
                pendingZonesUpdateRef.current = null;
              }
            }}
          />
          
          {!currentImageUrl && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column'
              }}
            >
              <Typography variant="body1" color="text.secondary">
                No image available. Start the pipeline to see the camera feed.
              </Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: '300px' }, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" gutterBottom>
            Zones
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <LineZoneList 
              zones={zones}
              selectedZoneIndex={selectedZone}
              onSelectZone={(index) => setSelectedZone(index)}
              onDeleteZone={(index) => {
                const updatedZones = zones.filter((_, i) => i !== index);
                onZonesChange(updatedZones);
                if (selectedZone === index) {
                  setSelectedZone(null);
                } else if (selectedZone !== null && selectedZone > index) {
                  setSelectedZone(selectedZone - 1);
                }
              }}
              onUpdateZone={(index, field, value) => {
                const updatedZones = [...zones];
                updatedZones[index] = {
                  ...updatedZones[index],
                  [field]: value
                };
                onZonesChange(updatedZones);
              }}
              onUnsavedChange={onUnsavedChange}
              disabled={disabled}
              availableClasses={availableClasses}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LineZoneEditor; 