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
import PolygonZoneList, { PolygonZone } from './PolygonZoneList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface PolygonZoneEditorProps {
  zones: PolygonZone[];
  onZonesChange: (zones: PolygonZone[]) => void;
  imageUrl: string;
  disabled?: boolean;
}

const PolygonZoneEditor: React.FC<PolygonZoneEditorProps> = ({ zones, onZonesChange, imageUrl, disabled = false }) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [draggingVertex, setDraggingVertex] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<{x: number, y: number}[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number, height: number } | null>(null);
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [hoveredElement, setHoveredElement] = useState<{ zoneIndex: number, vertexIndex?: number, isPolygon?: boolean } | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const nextImageRef = useRef<HTMLImageElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingZonesUpdateRef = useRef<PolygonZone[] | null>(null);
  const isActivelyDraggingRef = useRef<boolean>(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const localZonesRef = useRef<PolygonZone[]>(zones);
  
  // Color and style constants
  const vertexRadius = 6;
  const selectedVertexRadius = 8;
  const polygonStrokeWidth = 2;
  const selectedPolygonStrokeWidth = 4;
  const vertexFillColor = '#4caf50'; // Green
  const vertexStrokeColor = '#ffffff';
  const selectedVertexFillColor = '#ff9800'; // Orange
  const polygonStrokeColor = '#64b5f6'; // Light blue
  const selectedPolygonStrokeColor = '#2196f3'; // Darker blue
  const polygonFillColor = 'rgba(33, 150, 243, 0.2)'; // Semi-transparent blue
  const selectedPolygonFillColor = 'rgba(33, 150, 243, 0.3)'; // Slightly more opaque blue
  const drawingPolygonStrokeColor = '#ff9800'; // Orange
  const drawingPolygonFillColor = 'rgba(255, 152, 0, 0.2)'; // Semi-transparent orange
  
  // Update local reference when zones prop changes
  useEffect(() => {
    localZonesRef.current = zones;
  }, [zones]);
  
  // Improved throttling mechanism for zone updates with better performance
  const throttledZoneUpdate = useCallback((updatedZones: PolygonZone[]) => {
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
    if (!draggingVertex && pendingZonesUpdateRef.current) {
      onZonesChange(pendingZonesUpdateRef.current);
      pendingZonesUpdateRef.current = null;
    }
    
    // Clean up any pending RAF on unmount
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [draggingVertex, onZonesChange]);
  
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
  }, [selectedZone, selectedVertex, hoveredElement, currentImageUrl, isDrawing, currentPolygon]);
  
  // Convert canvas coordinates to normalized coordinates (0-1 range)
  const canvasToNormalizedCoords = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Simply normalize based on canvas size since we're stretching the image
    const normalizedX = Math.max(0, Math.min(1, x / canvas.width));
    const normalizedY = Math.max(0, Math.min(1, y / canvas.height));
    
    return { x: normalizedX, y: normalizedY };
  }, []);
  
  // Convert normalized coordinates (0-1 range) to canvas coordinates
  const normalizedToCanvasCoords = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Convert normalized coordinates to canvas pixels
    const canvasX = x * canvas.width;
    const canvasY = y * canvas.height;
    
    return { x: canvasX, y: canvasY };
  }, []);
  
  // Helper function to draw a polygon
  const drawPolygon = useCallback((
    ctx: CanvasRenderingContext2D, 
    points: {x: number, y: number}[], 
    isSelected: boolean = false,
    isHovered: boolean = false,
    isDrawing: boolean = false
  ) => {
    if (points.length < 2) return;
    
    // Map normalized coordinates to canvas coordinates
    const canvasPoints = points.map(point => normalizedToCanvasCoords(point.x, point.y));
    
    // Draw filled polygon
    ctx.beginPath();
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
    for (let i = 1; i < canvasPoints.length; i++) {
      ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
    }
    
    // Close the path if we're not in drawing mode or if we have at least 3 points
    if (!isDrawing || canvasPoints.length >= 3) {
      ctx.closePath();
    }
    
    // Fill with semi-transparent color
    ctx.fillStyle = isDrawing 
      ? drawingPolygonFillColor 
      : isSelected 
        ? selectedPolygonFillColor 
        : polygonFillColor;
    ctx.fill();
    
    // Draw outline
    ctx.strokeStyle = isDrawing 
      ? drawingPolygonStrokeColor 
      : isSelected 
        ? selectedPolygonStrokeColor 
        : polygonStrokeColor;
    ctx.lineWidth = isSelected ? selectedPolygonStrokeWidth : polygonStrokeWidth;
    ctx.stroke();
    
    // Draw vertices
    canvasPoints.forEach((point, idx) => {
      const isVertexSelected = isSelected && selectedVertex === idx;
      const isVertexHovered = isHovered && hoveredElement?.vertexIndex === idx;
      
      // Draw a glow effect for selected/hovered vertices
      if (isVertexSelected || isVertexHovered) {
        ctx.beginPath();
        ctx.arc(
          point.x, 
          point.y, 
          (isVertexSelected ? selectedVertexRadius : vertexRadius) + 4, 
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 152, 0, 0.3)'; // Semi-transparent orange glow
        ctx.fill();
      }
      
      // Draw the vertex
      ctx.beginPath();
      ctx.arc(
        point.x, 
        point.y, 
        isVertexSelected || isVertexHovered ? selectedVertexRadius : vertexRadius, 
        0, 
        Math.PI * 2
      );
      ctx.fillStyle = isVertexSelected ? selectedVertexFillColor : vertexFillColor;
      ctx.fill();
      ctx.strokeStyle = vertexStrokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
  }, [normalizedToCanvasCoords, selectedVertex, hoveredElement]);
  
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
      
      // Draw all zones
      currentZones.forEach((zone, index) => {
        const isSelected = index === selectedZone;
        const isHovered = hoveredElement?.zoneIndex === index && hoveredElement?.isPolygon;
        
        drawPolygon(
          ctx, 
          zone.polygon, 
          isSelected,
          isHovered
        );
        
        // Draw zone ID
        if (zone.polygon.length > 0) {
          // Calculate centroid of the polygon
          let centroidX = 0;
          let centroidY = 0;
          
          zone.polygon.forEach(point => {
            const canvasPoint = normalizedToCanvasCoords(point.x, point.y);
            centroidX += canvasPoint.x;
            centroidY += canvasPoint.y;
          });
          
          centroidX /= zone.polygon.length;
          centroidY /= zone.polygon.length;
          
          // Draw a background for the text
          ctx.font = isSelected ? 'bold 14px Roboto' : '14px Roboto';
          const textMetrics = ctx.measureText(zone.id);
          const textWidth = textMetrics.width;
          const textHeight = 20;
          
          ctx.fillStyle = isSelected ? 'rgba(33, 150, 243, 0.8)' : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(centroidX - textWidth / 2 - 5, centroidY - textHeight / 2, textWidth + 10, textHeight);
          
          // Draw the text
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(zone.id, centroidX, centroidY);
        }
      });
      
      // Draw the polygon currently being created
      if (isDrawing && currentPolygon.length > 0) {
        drawPolygon(ctx, currentPolygon, true, false, true);
        
        // Draw a temporary line from the last point to the mouse position
        if (currentPolygon.length > 0 && hoveredElement) {
          const lastPoint = normalizedToCanvasCoords(
            currentPolygon[currentPolygon.length - 1].x,
            currentPolygon[currentPolygon.length - 1].y
          );
          
          // Get the current mouse position from hoveredElement
          const canvas = canvasRef.current;
          if (canvas) {
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(hoveredElement.zoneIndex, hoveredElement.vertexIndex || 0);
            ctx.strokeStyle = drawingPolygonStrokeColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line
          }
        }
        
        // Draw helping text when user is creating a polygon
        const instructions = currentPolygon.length === 0 
          ? "Click to add the first point" 
          : currentPolygon.length < 3 
            ? "Click to add more points (min 3)" 
            : "Click to add more points, click first point to close polygon";
        
        ctx.font = '14px Roboto';
        ctx.fillStyle = theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 40, ctx.measureText(instructions).width + 20, 30);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(instructions, 20, canvas.height - 25);
      }
    } else if (!nextImageRef.current) {
      // Display message if no image is available
      ctx.font = '16px Roboto';
      ctx.fillStyle = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No image available. Start the pipeline to see the camera feed.', canvas.width / 2, canvas.height / 2);
    }
  }, [drawPolygon, normalizedToCanvasCoords, selectedZone, selectedVertex, hoveredElement, currentImageUrl, isDrawing, currentPolygon, theme.palette.mode]);
  
  // Optimized hover detection for better performance
  const checkHoverStatus = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const currentZones = localZonesRef.current;
    
    // Only run hover detection if we're not actively dragging to save performance
    if (isActivelyDraggingRef.current) {
      return hoveredElement;
    }
    
    // If we're in drawing mode, just return the mouse coordinates for the temporary line
    if (isDrawing) {
      return { zoneIndex: x, vertexIndex: y };
    }
    
    // Check if hovering over any vertices first (higher priority)
    for (let zIdx = 0; zIdx < currentZones.length; zIdx++) {
      const zone = currentZones[zIdx];
      
      for (let vIdx = 0; vIdx < zone.polygon.length; vIdx++) {
        const { x: canvasX, y: canvasY } = normalizedToCanvasCoords(
          zone.polygon[vIdx].x,
          zone.polygon[vIdx].y
        );
        
        const distance = Math.sqrt(Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2));
        
        if (distance <= 10) { // 10px hit radius for vertices
          canvas.style.cursor = 'pointer';
          return { zoneIndex: zIdx, vertexIndex: vIdx };
        }
      }
      
      // Then check if hovering over the polygon itself
      if (isPointInPolygon(x, y, zone.polygon.map(p => normalizedToCanvasCoords(p.x, p.y)))) {
        canvas.style.cursor = 'move';
        return { zoneIndex: zIdx, isPolygon: true };
      }
    }
    
    // Not hovering over anything
    canvas.style.cursor = drawMode ? 'crosshair' : 'default';
    return null;
  }, [drawMode, hoveredElement, isDrawing, normalizedToCanvasCoords]);
  
  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = useCallback((x: number, y: number, polygon: {x: number, y: number}[]) => {
    if (polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) && 
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
      if (intersect) inside = !inside;
    }
    
    return inside;
  }, []);
  
  // Optimized mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If dragging a vertex, update its position
    if (selectedZone !== null && selectedVertex !== null && draggingVertex) {
      const normalized = canvasToNormalizedCoords(x, y);
      
      // Create a shallow copy of the zones array
      const updatedZones = [...localZonesRef.current];
      
      // Update the vertex position
      updatedZones[selectedZone] = {
        ...updatedZones[selectedZone],
        polygon: [
          ...updatedZones[selectedZone].polygon.slice(0, selectedVertex),
          { x: normalized.x, y: normalized.y },
          ...updatedZones[selectedZone].polygon.slice(selectedVertex + 1)
        ]
      };
      
      // Use the throttled update function
      throttledZoneUpdate(updatedZones);
      return;
    }
    
    // For hover effects, use debouncing to avoid excessive checks
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    hoverTimeoutRef.current = setTimeout(() => {
      const newHoverState = checkHoverStatus(x, y);
      
      // Only update state if the hover status has changed
      if (JSON.stringify(newHoverState) !== JSON.stringify(hoveredElement)) {
        setHoveredElement(newHoverState);
      }
      
      hoverTimeoutRef.current = null;
    }, 50); // Debounce time of 50ms for hover detection
  }, [disabled, selectedZone, selectedVertex, draggingVertex, canvasToNormalizedCoords, throttledZoneUpdate, checkHoverStatus, hoveredElement]);
  
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
    
    // If in draw mode, handle polygon creation
    if (drawMode) {
      if (!isDrawing) {
        // Start drawing a new polygon
        setIsDrawing(true);
        const normalized = canvasToNormalizedCoords(x, y);
        setCurrentPolygon([{ x: normalized.x, y: normalized.y }]);
      } else {
        // Add another point to the polygon
        const normalized = canvasToNormalizedCoords(x, y);
        
        // Check if clicking near the first point to close the polygon
        if (currentPolygon.length >= 3) {
          const firstPoint = normalizedToCanvasCoords(currentPolygon[0].x, currentPolygon[0].y);
          const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
          
          if (distance <= 15) { // 15px radius to close polygon
            // Create the final polygon
            const newZone: PolygonZone = {
              id: `zone${localZonesRef.current.length + 1}`,
              polygon: currentPolygon,
              min_crossing_threshold: 1,
              triggering_anchors: ["BOTTOM_CENTER", "CENTER"]
            };
            
            onZonesChange([...localZonesRef.current, newZone]);
            setSelectedZone(localZonesRef.current.length);
            
            // Reset drawing state
            setIsDrawing(false);
            setCurrentPolygon([]);
            setDrawMode(false);
            return;
          }
        }
        
        // Add a new point to the polygon
        setCurrentPolygon([...currentPolygon, { x: normalized.x, y: normalized.y }]);
      }
      return;
    }
    
    // Get current hover state instead of checking again
    const hoverState = checkHoverStatus(x, y);
    
    if (hoverState) {
      setSelectedZone(hoverState.zoneIndex);
      
      if (hoverState.vertexIndex !== undefined) {
        setSelectedVertex(hoverState.vertexIndex);
        setDraggingVertex(true);
        isActivelyDraggingRef.current = true;
      } else {
        setSelectedVertex(null);
      }
      
      return;
    }
    
    // If not clicking on any zones, deselect
    setSelectedZone(null);
    setSelectedVertex(null);
    setDraggingVertex(false);
  }, [disabled, drawMode, isDrawing, currentPolygon, checkHoverStatus, canvasToNormalizedCoords, normalizedToCanvasCoords, onZonesChange]);
  
  // Handle mouse up event
  const handleMouseUp = useCallback(() => {
    if (disabled) return;
    
    isActivelyDraggingRef.current = false;
    
    // If we were dragging, make sure final state is synchronized
    if (draggingVertex && pendingZonesUpdateRef.current) {
      onZonesChange(pendingZonesUpdateRef.current);
      pendingZonesUpdateRef.current = null;
    }
    
    setDraggingVertex(false);
  }, [disabled, draggingVertex, onZonesChange]);
  
  // Handle cancel polygon drawing
  const handleCancelDraw = useCallback(() => {
    setIsDrawing(false);
    setCurrentPolygon([]);
    setDrawMode(false);
  }, []);
  
  // Handle completing the polygon with current points
  const handleCompleteDraw = useCallback(() => {
    // Only complete if we have at least 3 points
    if (currentPolygon.length >= 3) {
      const newZone: PolygonZone = {
        id: `zone${localZonesRef.current.length + 1}`,
        polygon: currentPolygon,
        min_crossing_threshold: 1,
        triggering_anchors: ["BOTTOM_CENTER", "CENTER"]
      };
      
      onZonesChange([...localZonesRef.current, newZone]);
      setSelectedZone(localZonesRef.current.length);
      
      // Reset drawing state
      setIsDrawing(false);
      setCurrentPolygon([]);
      setDrawMode(false);
    }
  }, [currentPolygon, onZonesChange]);
  
  const handleDeleteSelectedZone = useCallback(() => {
    if (selectedZone === null) return;
    
    const updatedZones = localZonesRef.current.filter((_, i) => i !== selectedZone);
    onZonesChange(updatedZones);
    setSelectedZone(null);
  }, [selectedZone, onZonesChange]);
  
  // Handle delete vertex
  const handleDeleteVertex = useCallback(() => {
    if (selectedZone === null || selectedVertex === null) return;
    
    const zone = localZonesRef.current[selectedZone];
    
    // Only allow deleting if at least 4 vertices (to keep minimum 3)
    if (zone.polygon.length > 3) {
      const updatedZones = [...localZonesRef.current];
      
      // Remove the selected vertex
      updatedZones[selectedZone] = {
        ...updatedZones[selectedZone],
        polygon: [
          ...updatedZones[selectedZone].polygon.slice(0, selectedVertex),
          ...updatedZones[selectedZone].polygon.slice(selectedVertex + 1)
        ]
      };
      
      onZonesChange(updatedZones);
      setSelectedVertex(null);
    }
  }, [selectedZone, selectedVertex, onZonesChange]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1">Polygon Zone Editor</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isDrawing ? (
            <>
              <Button
                variant={drawMode ? "contained" : "outlined"}
                color="primary"
                startIcon={<CreateIcon />}
                onClick={() => setDrawMode(true)}
                disabled={disabled}
                size="small"
              >
                Draw Polygon
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelectedZone}
                disabled={selectedZone === null || disabled}
                size="small"
              >
                Delete Zone
              </Button>
              {selectedVertex !== null && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteVertex}
                  disabled={selectedZone === null || selectedVertex === null || disabled}
                  size="small"
                >
                  Delete Vertex
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleCompleteDraw}
                disabled={currentPolygon.length < 3 || disabled}
                size="small"
              >
                Complete Polygon
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleCancelDraw}
                disabled={disabled}
                size="small"
              >
                Cancel
              </Button>
            </>
          )}
          <Tooltip title="Draw polygons by clicking on the image. Click vertices to select and drag them. At least 3 points are required to create a valid polygon zone.">
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, flex: 1, minHeight: 0 }}>
        <Box 
          data-polygon-zone-editor="true"
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
              setDraggingVertex(false);
              isActivelyDraggingRef.current = false;
              setHoveredElement(null);
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
            <PolygonZoneList 
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

export default PolygonZoneEditor; 