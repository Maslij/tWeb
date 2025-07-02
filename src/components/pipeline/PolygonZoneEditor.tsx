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
import AddIcon from '@mui/icons-material/Add';
import PolygonZoneList, { PolygonZone } from './PolygonZoneList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface PolygonZoneEditorProps {
  zones: PolygonZone[];
  onZonesChange: (zones: PolygonZone[]) => void;
  onUnsavedChange?: () => void; // New prop to immediately trigger unsaved changes
  imageUrl: string;
  disabled?: boolean;
  availableClasses?: string[]; // Available classes from object detector
}

const PolygonZoneEditor: React.FC<PolygonZoneEditorProps> = ({ zones, onZonesChange, onUnsavedChange, imageUrl, disabled = false, availableClasses = [] }) => {
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
  const [hoveredElement, setHoveredElement] = useState<{ zoneIndex: number, vertexIndex?: number, isPolygon?: boolean, edgeIndex?: number } | null>(null);
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
  const frontPolygonStrokeWidth = 3; // Intermediate width for front polygon
  const vertexFillColor = '#4caf50'; // Green
  const vertexStrokeColor = '#ffffff';
  const selectedVertexFillColor = '#ff9800'; // Orange
  const frontVertexFillColor = '#2196f3'; // Blue for front polygon vertices
  const polygonStrokeColor = '#64b5f6'; // Light blue
  const selectedPolygonStrokeColor = '#2196f3'; // Darker blue
  const frontPolygonStrokeColor = '#1976d2'; // Even darker blue for front polygon
  const polygonFillColor = 'rgba(33, 150, 243, 0.2)'; // Semi-transparent blue
  const selectedPolygonFillColor = 'rgba(33, 150, 243, 0.4)'; // More opaque blue
  const frontPolygonFillColor = 'rgba(33, 150, 243, 0.3)'; // Front polygon fill
  const backgroundPolygonFillColor = 'rgba(33, 150, 243, 0.1)'; // Very transparent for background polygons
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
    isDrawing: boolean = false,
    isFront: boolean = false,
    isBackground: boolean = false
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
    
    // Fill with semi-transparent color - different opacity based on state
    ctx.fillStyle = isDrawing
      ? drawingPolygonFillColor
      : isSelected
        ? selectedPolygonFillColor
        : isFront
          ? frontPolygonFillColor
          : isBackground
            ? backgroundPolygonFillColor
            : polygonFillColor;
    ctx.fill();
    
    // Draw outline with different styles based on state
    ctx.strokeStyle = isDrawing
      ? drawingPolygonStrokeColor
      : isSelected
        ? selectedPolygonStrokeColor
        : isFront
          ? frontPolygonStrokeColor
          : polygonStrokeColor;
    ctx.lineWidth = isSelected
      ? selectedPolygonStrokeWidth
      : isFront
        ? frontPolygonStrokeWidth
        : polygonStrokeWidth;
    ctx.stroke();
    
    // Draw vertices - only show vertices for selected, front, or hovered polygons
    if (isSelected || isFront || isHovered || isDrawing) {
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
        
        // Draw the vertex with different colors based on state
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          isVertexSelected || isVertexHovered ? selectedVertexRadius : vertexRadius,
          0,
          Math.PI * 2
        );
        
        // Choose vertex color based on polygon state
        ctx.fillStyle = isVertexSelected
          ? selectedVertexFillColor
          : isFront
            ? frontVertexFillColor
            : vertexFillColor;
        ctx.fill();
        ctx.strokeStyle = vertexStrokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    
  }, [normalizedToCanvasCoords, selectedVertex, hoveredElement]);
  
  
  // Helper function to draw zone labels
  const drawZoneLabel = useCallback((
    ctx: CanvasRenderingContext2D,
    zone: PolygonZone,
    index: number,
    isSelected: boolean,
    isFront: boolean
  ) => {
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
    ctx.font = isSelected ? 'bold 14px Roboto' : isFront ? 'bold 12px Roboto' : '12px Roboto';
    const textMetrics = ctx.measureText(zone.id);
    const textWidth = textMetrics.width;
    const textHeight = isSelected ? 20 : 18;
    
    // Different background colors based on state
    ctx.fillStyle = isSelected
      ? 'rgba(33, 150, 243, 0.9)'
      : isFront
        ? 'rgba(25, 118, 210, 0.8)'
        : theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.6)'
          : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(centroidX - textWidth / 2 - 5, centroidY - textHeight / 2, textWidth + 10, textHeight);
    
    // Draw the text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.id, centroidX, centroidY);
  }, [normalizedToCanvasCoords, theme.palette.mode]);
  
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
      
      // Draw zones in layers: background polygons first, then selected polygon
      const backgroundZones: number[] = [];
      const frontZone: number | null = selectedZone;
      
      // Collect background zones (all except selected)
      currentZones.forEach((_, index) => {
        if (index !== selectedZone) {
          backgroundZones.push(index);
        }
      });
      
      // Draw background polygons first (with reduced opacity)
      backgroundZones.forEach((index) => {
        const zone = currentZones[index];
        const isHovered = hoveredElement?.zoneIndex === index && hoveredElement?.isPolygon;
        
        drawPolygon(
          ctx,
          zone.polygon,
          false, // not selected
          isHovered,
          false, // not drawing
          false, // not front
          true   // is background
        );
        
        // Draw zone ID for background polygons
        if (zone.polygon.length > 0) {
          drawZoneLabel(ctx, zone, index, false, false);
        }
      });
      
      // Draw the selected polygon on top (if exists)
      if (frontZone !== null && currentZones[frontZone]) {
        const zone = currentZones[frontZone];
        const isHovered = hoveredElement?.zoneIndex === frontZone && hoveredElement?.isPolygon;
        
        drawPolygon(
          ctx,
          zone.polygon,
          true,  // is selected
          isHovered,
          false, // not drawing
          true,  // is front
          false  // not background
        );
        
        // Draw zone ID for selected polygon
        if (zone.polygon.length > 0) {
          drawZoneLabel(ctx, zone, frontZone, true, true);
        }
      }
      
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
  }, [drawPolygon, drawZoneLabel, normalizedToCanvasCoords, selectedZone, selectedVertex, hoveredElement, currentImageUrl, isDrawing, currentPolygon, theme.palette.mode]);
  
  // Helper function to check if a point is near a line segment
  const isPointNearLineSegment = useCallback((
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
    threshold: number = 8
  ) => {
    // Calculate the distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) <= threshold;
    
    let param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }, []);

  // Optimized hover detection with priority for selected polygon
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
    
    // Create priority order: selected zone first, then others
    const zoneIndices = [];
    if (selectedZone !== null && selectedZone < currentZones.length) {
      zoneIndices.push(selectedZone);
    }
    for (let i = 0; i < currentZones.length; i++) {
      if (i !== selectedZone) {
        zoneIndices.push(i);
      }
    }
    
    // Check vertices first (highest priority) - prioritize selected zone
    for (const zIdx of zoneIndices) {
      const zone = currentZones[zIdx];
      
      for (let vIdx = 0; vIdx < zone.polygon.length; vIdx++) {
        const { x: canvasX, y: canvasY } = normalizedToCanvasCoords(
          zone.polygon[vIdx].x,
          zone.polygon[vIdx].y
        );
        
        const distance = Math.sqrt(Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2));
        
        // Larger hit radius for selected zone vertices
        const hitRadius = zIdx === selectedZone ? 12 : 10;
        
        if (distance <= hitRadius) {
          canvas.style.cursor = 'pointer';
          return { zoneIndex: zIdx, vertexIndex: vIdx };
        }
      }
    }
    
    // Check edges second (for adding vertices) - prioritize selected zone
    for (const zIdx of zoneIndices) {
      const zone = currentZones[zIdx];
      
      for (let eIdx = 0; eIdx < zone.polygon.length; eIdx++) {
        const currentVertex = zone.polygon[eIdx];
        const nextVertex = zone.polygon[(eIdx + 1) % zone.polygon.length];
        
        const { x: x1, y: y1 } = normalizedToCanvasCoords(currentVertex.x, currentVertex.y);
        const { x: x2, y: y2 } = normalizedToCanvasCoords(nextVertex.x, nextVertex.y);
        
        // Larger hit radius for selected zone edges
        const hitRadius = zIdx === selectedZone ? 10 : 8;
        
        if (isPointNearLineSegment(x, y, x1, y1, x2, y2, hitRadius)) {
          canvas.style.cursor = 'copy';
          return { zoneIndex: zIdx, edgeIndex: eIdx };
        }
      }
    }
    
    // Check polygon areas last - prioritize selected zone
    for (const zIdx of zoneIndices) {
      const zone = currentZones[zIdx];
      
      if (isPointInPolygon(x, y, zone.polygon.map(p => normalizedToCanvasCoords(p.x, p.y)))) {
        canvas.style.cursor = 'move';
        return { zoneIndex: zIdx, isPolygon: true };
      }
    }
    
    // Not hovering over anything
    canvas.style.cursor = drawMode ? 'crosshair' : 'default';
    return null;
  }, [drawMode, hoveredElement, isDrawing, normalizedToCanvasCoords, isPointNearLineSegment, selectedZone]);
  
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
              triggering_anchors: ["BOTTOM_CENTER", "CENTER"],
              triggering_classes: []
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
      } else if (hoverState.edgeIndex !== undefined) {
        // Handle clicking on an edge to add a vertex
        const normalized = canvasToNormalizedCoords(x, y);
        const zone = localZonesRef.current[hoverState.zoneIndex];
        
        // Create updated polygon with the new vertex inserted after the edge start vertex
        const updatedPolygon = [
          ...zone.polygon.slice(0, hoverState.edgeIndex + 1),
          { x: normalized.x, y: normalized.y },
          ...zone.polygon.slice(hoverState.edgeIndex + 1)
        ];
        
        // Update the zone with the new polygon
        const updatedZones = [...localZonesRef.current];
        updatedZones[hoverState.zoneIndex] = {
          ...updatedZones[hoverState.zoneIndex],
          polygon: updatedPolygon
        };
        
        onZonesChange(updatedZones);
        
        // Select the new vertex
        setSelectedVertex(hoverState.edgeIndex + 1);
        return;
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
        triggering_anchors: ["BOTTOM_CENTER", "CENTER"],
        triggering_classes: []
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
  
  // Handle adding a new vertex - context-aware based on selected vertex
  const handleAddVertex = useCallback(() => {
    if (selectedZone === null) return;
    
    const zone = localZonesRef.current[selectedZone];
    const polygon = zone.polygon;
    
    if (polygon.length < 3) return; // Need at least 3 vertices to have a valid polygon
    
    let insertIndex: number;
    let newVertex: { x: number, y: number };
    
    if (selectedVertex !== null) {
      // If a vertex is selected, add the new vertex between it and the next vertex
      insertIndex = selectedVertex + 1;
      const currentVertex = polygon[selectedVertex];
      const nextVertex = polygon[(selectedVertex + 1) % polygon.length];
      
      // Calculate the midpoint between the selected vertex and the next vertex
      newVertex = {
        x: (currentVertex.x + nextVertex.x) / 2,
        y: (currentVertex.y + nextVertex.y) / 2
      };
    } else {
      // If no vertex is selected, add between the last and first vertices (original behavior)
      insertIndex = polygon.length;
      const firstVertex = polygon[0];
      const lastVertex = polygon[polygon.length - 1];
      
      // Calculate the midpoint between the last and first vertices
      newVertex = {
        x: (lastVertex.x + firstVertex.x) / 2,
        y: (lastVertex.y + firstVertex.y) / 2
      };
    }
    
    // Create updated polygon with the new vertex inserted at the appropriate position
    const updatedPolygon = [
      ...polygon.slice(0, insertIndex),
      newVertex,
      ...polygon.slice(insertIndex)
    ];
    
    // Update the zone with the new polygon
    const updatedZones = [...localZonesRef.current];
    updatedZones[selectedZone] = {
      ...updatedZones[selectedZone],
      polygon: updatedPolygon
    };
    
    onZonesChange(updatedZones);
    
    // Select the new vertex
    setSelectedVertex(insertIndex);
  }, [selectedZone, selectedVertex, onZonesChange]);
  
  // Handle keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isDrawing) return;
      
      // Don't handle shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedZone !== null) {
            if (selectedVertex !== null) {
              handleDeleteVertex();
            } else {
              handleDeleteSelectedZone();
            }
            e.preventDefault();
          }
          break;
        case 'Escape':
          if (isDrawing) {
            handleCancelDraw();
          } else {
            setSelectedZone(null);
            setSelectedVertex(null);
          }
          e.preventDefault();
          break;
        case 'Tab':
          // Cycle through zones
          if (localZonesRef.current.length > 0) {
            const currentIndex = selectedZone ?? -1;
            const nextIndex = (currentIndex + 1) % localZonesRef.current.length;
            setSelectedZone(nextIndex);
            setSelectedVertex(null);
            e.preventDefault();
          }
          break;
        case 'Enter':
          if (isDrawing && currentPolygon.length >= 3) {
            handleCompleteDraw();
            e.preventDefault();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isDrawing, selectedZone, selectedVertex, currentPolygon.length, handleDeleteVertex, handleDeleteSelectedZone, handleCancelDraw, handleCompleteDraw]);

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
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddVertex}
                disabled={selectedZone === null || disabled}
                size="small"
              >
                Add Vertex
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
          <Tooltip title={
            <div>
              <div><strong>Polygon Zone Detection:</strong></div>
              <br />
              <div>• Draw polygons by clicking points on the image</div>
              <div>• Click first point again or use "Complete Polygon" to finish</div>
              <div>• Objects entering the polygon area trigger "in" events</div>
              <div>• Objects leaving the polygon area trigger "out" events</div>
              <br />
              <div><strong>Interaction:</strong></div>
              <div>• Click zone in list to select and bring to front</div>
              <div>• Selected polygon shows vertices and has priority for clicks</div>
              <div>• Green/Blue dots = vertices (drag to move)</div>
              <div>• Click on polygon edges to add vertices</div>
              <br />
              <div><strong>Keyboard Shortcuts:</strong></div>
              <div>• Delete/Backspace: Delete selected zone or vertex</div>
              <div>• Tab: Cycle through zones</div>
              <div>• Escape: Cancel drawing or deselect</div>
              <div>• Enter: Complete polygon when drawing</div>
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

export default PolygonZoneEditor; 