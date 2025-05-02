import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip
} from '@mui/material';
import { IconButton } from '../../components/ui/IconButton';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LineZoneList, { Zone } from './LineZoneList';

interface LineZoneEditorProps {
  zones: Zone[];
  onZonesChange: (zones: Zone[]) => void;
  imageUrl: string;
  disabled?: boolean;
}

const LineZoneEditor: React.FC<LineZoneEditorProps> = ({ zones, onZonesChange, imageUrl, disabled = false }) => {
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
  // Add this line - create a ref to track active dragging that's accessible outside the component
  const isActivelyDraggingRef = useRef<boolean>(false);
  
  // Throttling mechanism for zone updates
  const throttledZoneUpdate = (updatedZones: Zone[]) => {
    const now = Date.now();
    // Only send updates every 50ms during dragging to prevent too many rerenders
    if (now - lastUpdateTimeRef.current > 50) {
      onZonesChange(updatedZones);
      lastUpdateTimeRef.current = now;
      pendingZonesUpdateRef.current = null;
    } else {
      // Store the latest update to apply later
      pendingZonesUpdateRef.current = updatedZones;
    }
  };
  
  // Apply any pending updates when dragging ends
  useEffect(() => {
    if (!draggingPoint && pendingZonesUpdateRef.current) {
      onZonesChange(pendingZonesUpdateRef.current);
      pendingZonesUpdateRef.current = null;
    }
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
  }, [zones, selectedZone, hoveredPoint, currentImageUrl]);
  
  // Draw the canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image if available
    if (nextImageRef.current && currentImageUrl) {
      // Stretch image to fill entire canvas (since we're using normalized coordinates)
      ctx.drawImage(nextImageRef.current, 0, 0, canvas.width, canvas.height);
      
      // Draw zones
      zones.forEach((zone, index) => {
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
        
        // Draw direction arrow
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 15;
        const arrowWidth = 8;
        
        // Draw the arrow at 75% along the line
        const arrowX = startX + (endX - startX) * 0.75;
        const arrowY = startY + (endY - startY) * 0.75;
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
          arrowY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
        );
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
          arrowY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
        );
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#2196f3' : '#64b5f6';
        ctx.fill();
        
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
      });
    } else if (!nextImageRef.current) {
      // Display message if no image is available
      ctx.font = '16px Roboto';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No image available. Start the pipeline to see the camera feed.', canvas.width / 2, canvas.height / 2);
    }
  };

  // Convert canvas coordinates to normalized coordinates
  const canvasToNormalizedCoords = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Simply normalize based on canvas size since we're stretching the image
    const normalizedX = Math.max(0, Math.min(1, x / canvas.width));
    const normalizedY = Math.max(0, Math.min(1, y / canvas.height));
    
    return { x: normalizedX, y: normalizedY };
  };

  // Handle mouse move for hover effects
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If in drawing mode and currently drawing
    if (drawMode && isDrawing && drawStartPos) {
      // Redraw the canvas
      drawCanvas();
      
      // Get the canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw the new line
      ctx.beginPath();
      ctx.moveTo(drawStartPos.x, drawStartPos.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff9800';
      ctx.stroke();
      
      // Draw the start point
      ctx.beginPath();
      ctx.arc(drawStartPos.x, drawStartPos.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4caf50';
      ctx.fill();
      
      // Draw the end point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f44336';
      ctx.fill();
      
      return;
    }
    
    // If dragging a control point
    if (selectedZone !== null && draggingPoint !== null) {
      const normalized = canvasToNormalizedCoords(x, y);
      
      const updatedZones = [...zones];
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
      
      // Use the throttled update function instead of direct callback
      throttledZoneUpdate(updatedZones);
      return;
    }

    // Check if hovering over any control points or lines
    let foundHover = false;
    
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      
      // Convert normalized coordinates to canvas coordinates
      const startX = zone.start_x * canvas.width;
      const startY = zone.start_y * canvas.height;
      const endX = zone.end_x * canvas.width;
      const endY = zone.end_y * canvas.height;
      
      // Check distance to start point
      const distToStart = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
      if (distToStart < 10) {
        setHoveredPoint({ zoneIndex: i, point: 'start' });
        canvas.style.cursor = 'pointer';
        foundHover = true;
        break;
      }
      
      // Check distance to end point
      const distToEnd = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2);
      if (distToEnd < 10) {
        setHoveredPoint({ zoneIndex: i, point: 'end' });
        canvas.style.cursor = 'pointer';
        foundHover = true;
        break;
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
        setHoveredPoint({ zoneIndex: i, point: 'line' });
        canvas.style.cursor = 'pointer';
        foundHover = true;
        break;
      }
    }
    
    if (!foundHover) {
      setHoveredPoint(null);
      canvas.style.cursor = drawMode ? 'crosshair' : 'default';
    }
  };

  // Handle mouse down event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If in draw mode, start drawing
    if (drawMode) {
      setIsDrawing(true);
      setDrawStartPos({ x, y });
      setSelectedZone(null);
      return;
    }
    
    // Check if clicking on any control points
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      
      // Convert normalized coordinates to canvas coordinates
      const startX = zone.start_x * canvas.width;
      const startY = zone.start_y * canvas.height;
      const endX = zone.end_x * canvas.width;
      const endY = zone.end_y * canvas.height;
      
      // Check distance to start point
      const distToStart = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
      if (distToStart < 10) {
        setSelectedZone(i);
        setDraggingPoint('start');
        isActivelyDraggingRef.current = true; // Set active dragging flag
        return;
      }
      
      // Check distance to end point
      const distToEnd = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2);
      if (distToEnd < 10) {
        setSelectedZone(i);
        setDraggingPoint('end');
        isActivelyDraggingRef.current = true; // Set active dragging flag
        return;
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
        setSelectedZone(i);
        return;
      }
    }
    
    // If not clicking on any control points, deselect
    setSelectedZone(null);
    setDraggingPoint(null);
  };

  // Handle mouse up event
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
        // Create a new zone
        const newZone: Zone = {
          id: `zone${zones.length + 1}`,
          start_x: startNormalized.x,
          start_y: startNormalized.y,
          end_x: endNormalized.x,
          end_y: endNormalized.y,
          min_crossing_threshold: 1,
          triggering_anchors: ["BOTTOM_CENTER", "CENTER"]
        };
        
        onZonesChange([...zones, newZone]);
        setSelectedZone(zones.length);
      }
      
      setIsDrawing(false);
      setDrawStartPos(null);
      setDrawMode(false);
      return;
    }
    
    isActivelyDraggingRef.current = false; // Clear active dragging flag
    setDraggingPoint(null);
  };

  const handleDeleteSelectedZone = () => {
    if (selectedZone === null) return;
    
    const updatedZones = zones.filter((_, i) => i !== selectedZone);
    onZonesChange(updatedZones);
    setSelectedZone(null);
  };

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
          <Tooltip title="Draw lines by clicking and dragging. Click on lines or endpoints to select and edit them.">
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: 'calc(100% - 50px)' }}>
        <Box 
          data-line-zone-editor="true"
          sx={{ 
            position: 'relative',
            flex: 1,
            height: { xs: '300px', md: '100%' },
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: '#f5f5f5'
          }}
          // Fix the ref callback to properly type the element
          ref={(el: HTMLDivElement | null) => {
            containerRef.current = el;
            if (el) {
              (el as any).__isActivelyDragging = isActivelyDraggingRef.current;
            }
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setDraggingPoint(null);
              setHoveredPoint(null);
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
              disabled={disabled}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LineZoneEditor; 