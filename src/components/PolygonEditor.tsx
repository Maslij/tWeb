import React, { useState, useRef, useEffect } from 'react';
import apiService, { Polygon, CreatePolygonPayload, UpdatePolygonPayload } from '../services/api';

interface PolygonEditorProps {
  streamId: string;
  width?: number;
  height?: number;
  onPolygonCreated?: (polygon: Polygon) => void;
  onPolygonUpdated?: (polygon: Polygon) => void;
  onPolygonDeleted?: (polygonId: string) => void;
}

// Default colors to cycle through when creating new polygons
const DEFAULT_COLORS: [number, number, number][] = [
  [255, 69, 0],    // Orange-Red
  [70, 130, 180],  // Steel Blue
  [255, 215, 0],   // Gold
  [199, 21, 133],  // Medium Violet Red
  [32, 178, 170],  // Light Sea Green
  [148, 0, 211],   // Dark Violet
];

const PolygonEditor: React.FC<PolygonEditorProps> = ({
  streamId,
  width = 640,
  height = 480,
  onPolygonCreated,
  onPolygonUpdated,
  onPolygonDeleted
}) => {
  // States
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState<Polygon | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number, polygonId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polygonName, setPolygonName] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [pointBeingDragged, setPointBeingDragged] = useState<{ index: number, polygonId: string } | null>(null);

  // Hardcoded values (previously configurable)
  const isFilled = false;
  const thickness = 2;

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStreamId = useRef<string>(streamId);
  
  // Constants
  const POINT_RADIUS = 5;
  const CLICK_PROXIMITY = 10;

  // Load polygons when stream ID changes
  useEffect(() => {
    if (streamId !== currentStreamId.current) {
      currentStreamId.current = streamId;
      // Reset state for new stream
      setCurrentPolygon([]);
      setIsDrawing(false);
      setSelectedPolygon(null);
      setSelectedPoint(null);
    }
    
    loadPolygons();
  }, [streamId]);

  // Update canvas when stream frame changes
  useEffect(() => {
    // Load initial image
    if (imageRef.current) {
      imageRef.current.src = apiService.getFrameUrlWithTimestamp(streamId);
    }
    
    // Set up image refresh interval
    const intervalId = setInterval(() => {
      if (imageRef.current) {
        imageRef.current.src = apiService.getFrameUrlWithTimestamp(streamId);
      }
    }, 1000); // Update frame every second
    
    return () => {
      clearInterval(intervalId);
    };
  }, [streamId]);

  // Redraw canvas when relevant state changes
  useEffect(() => {
    drawCanvas();
  }, [polygons, currentPolygon, selectedPolygon, selectedPoint, createMode]);

  // Load polygons from API
  const loadPolygons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getPolygons(streamId);
      setPolygons(data);
    } catch (err) {
      console.error('Error loading polygons:', err);
      setError('Failed to load polygons');
    } finally {
      setLoading(false);
    }
  };

  // Draw the canvas with image and polygons
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !image.complete) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image if loaded
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw existing polygons
    polygons.forEach(polygon => {
      const isSelected = selectedPolygon?.id === polygon.id;
      
      // Set polygon style
      ctx.strokeStyle = `rgb(${polygon.color[0]}, ${polygon.color[1]}, ${polygon.color[2]})`;
      ctx.fillStyle = `rgba(${polygon.color[0]}, ${polygon.color[1]}, ${polygon.color[2]}, 0.3)`;
      ctx.lineWidth = polygon.thickness;
      
      // Draw polygon
      if (polygon.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(polygon.points[0][0], polygon.points[0][1]);
        for (let i = 1; i < polygon.points.length; i++) {
          ctx.lineTo(polygon.points[i][0], polygon.points[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Only fill if specifically set to filled (now disabled by default)
        if (polygon.filled) {
          ctx.fill();
        }
        
        // Draw polygon name
        if (polygon.name) {
          ctx.fillStyle = `rgb(${polygon.color[0]}, ${polygon.color[1]}, ${polygon.color[2]})`;
          ctx.font = '14px Arial';
          ctx.fillText(polygon.name, polygon.points[0][0], polygon.points[0][1] - 10);
        }
      }
      
      // Draw points for selected polygon
      if (isSelected) {
        polygon.points.forEach((point, index) => {
          const isSelectedPoint = selectedPoint?.polygonId === polygon.id && selectedPoint?.index === index;
          
          // Draw point
          ctx.fillStyle = isSelectedPoint ? 'yellow' : 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          ctx.arc(point[0], point[1], POINT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
    
    // Draw current polygon being created
    if (currentPolygon.length > 0) {
      const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
      
      ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
      ctx.lineWidth = thickness;
      
      // Draw lines
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0][0], currentPolygon[0][1]);
      for (let i = 1; i < currentPolygon.length; i++) {
        ctx.lineTo(currentPolygon[i][0], currentPolygon[i][1]);
      }
      
      // Close the polygon if we have at least 3 points
      if (currentPolygon.length > 2) {
        ctx.closePath();
      }
      
      ctx.stroke();
      
      if (isFilled && currentPolygon.length > 2) {
        ctx.fill();
      }
      
      // Draw points
      currentPolygon.forEach((point, index) => {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(point[0], point[1], POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  };

  // Get the canvas position relative to the client
  const getCanvasCoordinates = (clientX: number, clientY: number): [number, number] => {
    if (!canvasRef.current) return [0, 0];
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return [
      (clientX - rect.left) * scaleX,
      (clientY - rect.top) * scaleY
    ];
  };

  // Find if a point is near the click position
  const findPointAt = (x: number, y: number): { index: number, polygonId: string } | null => {
    // First check selected polygon (if any)
    if (selectedPolygon) {
      for (let i = 0; i < selectedPolygon.points.length; i++) {
        const point = selectedPolygon.points[i];
        const distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
        
        if (distance <= CLICK_PROXIMITY) {
          return { index: i, polygonId: selectedPolygon.id };
        }
      }
    }
    
    // Then check other polygons
    for (const polygon of polygons) {
      if (selectedPolygon && polygon.id === selectedPolygon.id) continue;
      
      for (let i = 0; i < polygon.points.length; i++) {
        const point = polygon.points[i];
        const distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
        
        if (distance <= CLICK_PROXIMITY) {
          return { index: i, polygonId: polygon.id };
        }
      }
    }
    
    return null;
  };

  // Find if a polygon contains the click position
  const findPolygonAt = (x: number, y: number): Polygon | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Check each polygon
    for (const polygon of polygons) {
      if (polygon.points.length < 3) continue;
      
      // Create a path for hit testing
      ctx.beginPath();
      ctx.moveTo(polygon.points[0][0], polygon.points[0][1]);
      for (let i = 1; i < polygon.points.length; i++) {
        ctx.lineTo(polygon.points[i][0], polygon.points[i][1]);
      }
      ctx.closePath();
      
      // Check if point is inside polygon
      if (ctx.isPointInPath(x, y)) {
        return polygon;
      }
    }
    
    return null;
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
    // If we just finished dragging, don't add a new point or select something else
    if (pointBeingDragged) {
      setPointBeingDragged(null);
      return;
    }
    
    // Check if clicked on a point (even in create mode)
    const point = findPointAt(x, y);
    if (point) {
      setSelectedPoint(point);
      const polygon = polygons.find(p => p.id === point.polygonId);
      if (polygon) {
        setSelectedPolygon(polygon);
        // Set this for edit mode
        setPolygonName(polygon.name);
      }
      return;
    }
    
    // If in create mode and not clicking on an existing point, add a new point
    if (createMode) {
      // Check if clicked on one of the points in the current polygon being created
      for (let i = 0; i < currentPolygon.length; i++) {
        const point = currentPolygon[i];
        const distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
        
        if (distance <= CLICK_PROXIMITY) {
          // If clicked on an existing point in the current polygon, set up for dragging
          setSelectedPoint({ index: i, polygonId: 'current' });
          setIsDragging(true);
          setPointBeingDragged({ index: i, polygonId: 'current' });
          return;
        }
      }
      
      // If not clicking on an existing point, add a new point
      setCurrentPolygon(prev => [...prev, [x, y]]);
      return;
    }
    
    // In edit mode, check if clicked on a polygon
    const polygon = findPolygonAt(x, y);
    if (polygon) {
      setSelectedPolygon(polygon);
      setSelectedPoint(null);
      // Set this for edit mode
      setPolygonName(polygon.name);
      return;
    }
    
    // If no point or polygon was clicked, deselect
    setSelectedPolygon(null);
    setSelectedPoint(null);
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If we just clicked after dragging, don't start a new drag
    if (pointBeingDragged) {
      return;
    }
    
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
    // First check if clicked on a point in current polygon being created
    if (createMode && currentPolygon.length > 0) {
      for (let i = 0; i < currentPolygon.length; i++) {
        const point = currentPolygon[i];
        const distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
        
        if (distance <= CLICK_PROXIMITY) {
          setSelectedPoint({ index: i, polygonId: 'current' });
          setIsDragging(true);
          setPointBeingDragged({ index: i, polygonId: 'current' });
          return;
        }
      }
    }
    
    // Check if clicked on a point in existing polygons
    const point = findPointAt(x, y);
    if (point) {
      setSelectedPoint(point);
      setIsDragging(true);
      setPointBeingDragged(point);
      
      const polygon = polygons.find(p => p.id === point.polygonId);
      if (polygon) {
        setSelectedPolygon(polygon);
      }
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedPoint) return;
    
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
    // If dragging a point in the current polygon being created
    if (createMode && selectedPoint.polygonId === 'current') {
      const newCurrentPolygon = [...currentPolygon];
      newCurrentPolygon[selectedPoint.index] = [x, y];
      setCurrentPolygon(newCurrentPolygon);
      return;
    }
    
    // If dragging a point in an existing polygon
    if (selectedPolygon) {
      // Update the point position in the selected polygon
      const updatedPolygons = polygons.map(polygon => {
        if (polygon.id === selectedPolygon.id) {
          const newPoints = [...polygon.points];
          newPoints[selectedPoint.index] = [x, y];
          return { ...polygon, points: newPoints };
        }
        return polygon;
      });
      
      setPolygons(updatedPolygons);
    }
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    if (!isDragging || !selectedPoint) return;
    
    // Record that we're ending a drag - this point should still be considered "being dragged"
    // until the next click, which will clear this state
    if (!pointBeingDragged) {
      setPointBeingDragged(selectedPoint);
    }
    
    // End the actual dragging
    setIsDragging(false);
  };

  // Start creating a new polygon
  const handleCreatePolygon = () => {
    setCreateMode(true);
    setCurrentPolygon([]);
    setSelectedPolygon(null);
    setSelectedPoint(null);
    setPolygonName('');
  };

  // Save a newly created polygon
  const handleSaveNewPolygon = async () => {
    if (currentPolygon.length < 3) {
      setError('A polygon must have at least 3 points');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
      
      const payload: CreatePolygonPayload = {
        name: polygonName || `Polygon ${polygons.length + 1}`,
        points: currentPolygon,
        color: color,
        filled: isFilled,
        thickness: thickness
      };
      
      const result = await apiService.createPolygon(streamId, payload);
      
      // Add the new polygon to our list with proper typing
      const newPolygon: Polygon = {
        id: result.id,
        name: payload.name,
        points: payload.points,
        color: payload.color || [0, 255, 0], // Ensure color is not undefined
        filled: payload.filled || false,
        thickness: payload.thickness || 2
      };
      
      setPolygons(prev => [...prev, newPolygon]);
      setCurrentPolygon([]);
      setPolygonName('');
      setColorIndex(prev => prev + 1); // Cycle to next color
      setCreateMode(false);
      
      if (onPolygonCreated) {
        onPolygonCreated(newPolygon);
      }
    } catch (err) {
      console.error('Error creating polygon:', err);
      setError('Failed to create polygon');
    } finally {
      setLoading(false);
    }
  };

  // Cancel polygon creation
  const handleCancelCreate = () => {
    setCurrentPolygon([]);
    setCreateMode(false);
  };

  // Update an existing polygon
  const savePolygonChanges = async () => {
    if (!selectedPolygon) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedPolygon = polygons.find(p => p.id === selectedPolygon.id);
      if (!updatedPolygon) return;
      
      const payload: UpdatePolygonPayload = {
        points: updatedPolygon.points,
        name: polygonName || updatedPolygon.name,
      };
      
      await apiService.updatePolygon(streamId, selectedPolygon.id, payload);
      
      // Update the local state
      const newPolygons = polygons.map(p => {
        if (p.id === selectedPolygon.id) {
          return {
            ...p,
            name: polygonName || p.name,
            points: updatedPolygon.points
          };
        }
        return p;
      });
      
      setPolygons(newPolygons);
      
      if (onPolygonUpdated) {
        const updated = newPolygons.find(p => p.id === selectedPolygon.id);
        if (updated) onPolygonUpdated(updated);
      }
      
      setSelectedPolygon(null);
      setSelectedPoint(null);
      setPolygonName('');
    } catch (err) {
      console.error('Error updating polygon:', err);
      setError('Failed to update polygon');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setSelectedPolygon(null);
    setSelectedPoint(null);
    setPolygonName('');
    loadPolygons(); // Reload polygons to revert changes
  };

  // Delete a polygon
  const deletePolygon = async (polygonId: string) => {
    if (!confirm('Are you sure you want to delete this polygon?')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await apiService.deletePolygon(streamId, polygonId);
      
      setPolygons(prev => prev.filter(p => p.id !== polygonId));
      
      if (selectedPolygon?.id === polygonId) {
        setSelectedPolygon(null);
        setSelectedPoint(null);
        setPolygonName('');
      }
      
      if (onPolygonDeleted) {
        onPolygonDeleted(polygonId);
      }
    } catch (err) {
      console.error('Error deleting polygon:', err);
      setError('Failed to delete polygon');
    } finally {
      setLoading(false);
    }
  };

  // Edit a polygon from the list
  const handleEditPolygon = (polygon: Polygon) => {
    setSelectedPolygon(polygon);
    setPolygonName(polygon.name);
    setSelectedPoint(null);
  };

  // Handle right click to delete a point
  const handleRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent the browser's context menu from appearing
    e.preventDefault();
    
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
    // Check if right-clicked on a point in the current polygon being created
    if (createMode && currentPolygon.length > 0) {
      for (let i = 0; i < currentPolygon.length; i++) {
        const point = currentPolygon[i];
        const distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
        
        if (distance <= CLICK_PROXIMITY) {
          // Remove the point from the current polygon
          const newPolygon = [...currentPolygon];
          newPolygon.splice(i, 1);
          setCurrentPolygon(newPolygon);
          
          // Make sure we clear any selected points to avoid crashes
          setSelectedPoint(null);
          setPointBeingDragged(null);
          return;
        }
      }
    }
    
    // Check if right-clicked on a point in an existing polygon
    const point = findPointAt(x, y);
    if (point) {
      // Find the polygon
      const polygon = polygons.find(p => p.id === point.polygonId);
      if (polygon && polygon.points.length > 3) { // Ensure we keep at least 3 points
        // Create a copy of the polygon with the point removed
        const newPoints = [...polygon.points];
        newPoints.splice(point.index, 1);
        
        // Update the polygons array
        const updatedPolygons = polygons.map(p => {
          if (p.id === polygon.id) {
            return { ...p, points: newPoints };
          }
          return p;
        });
        
        setPolygons(updatedPolygons);
        
        // If this was a selected point, deselect it
        if (selectedPoint && selectedPoint.polygonId === point.polygonId) {
          // If we're deleting the selected point or a point before it, 
          // we need to clear selection to avoid index issues
          if (selectedPoint.index === point.index || selectedPoint.index > point.index) {
            setSelectedPoint(null);
            setPointBeingDragged(null);
          } else {
            // If the selected point is after the deleted one, adjust its index
            setSelectedPoint({
              ...selectedPoint,
              index: selectedPoint.index - 1
            });
            
            if (pointBeingDragged && pointBeingDragged.polygonId === point.polygonId && pointBeingDragged.index > point.index) {
              setPointBeingDragged({
                ...pointBeingDragged,
                index: pointBeingDragged.index - 1
              });
            }
          }
        }
      } else if (polygon) {
        // Show error if trying to remove a point that would make the polygon have less than 3 points
        setError('Polygon must have at least 3 points');
        setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
      }
    }
  };

  // Get the closest line segment in a polygon to a point
  const findClosestLineSegment = (
    polygon: [number, number][], 
    x: number, 
    y: number
  ): { index: number, distance: number } | null => {
    if (polygon.length < 2) return null;
    
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    // Check each line segment
    for (let i = 0; i < polygon.length; i++) {
      const pointA = polygon[i];
      const pointB = polygon[(i + 1) % polygon.length]; // Loop back to first point
      
      // Calculate the distance from point to line segment
      const distance = distanceToLineSegment(pointA, pointB, [x, y]);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex !== -1 ? { index: closestIndex, distance: closestDistance } : null;
  };
  
  // Calculate distance from a point to a line segment
  const distanceToLineSegment = (
    pointA: [number, number], 
    pointB: [number, number], 
    point: [number, number]
  ): number => {
    const [x, y] = point;
    const [x1, y1] = pointA;
    const [x2, y2] = pointB;
    
    // If line segment is a point, return distance to that point
    if (x1 === x2 && y1 === y2) {
      return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
    }
    
    // Calculate the projection of the point onto the line
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    
    // If the projection is outside the segment, return distance to nearest endpoint
    if (t < 0) {
      return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
    }
    if (t > 1) {
      return Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2));
    }
    
    // Calculate the point on the line
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    // Return the distance to the projected point
    return Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
  };

  // Handle double click to add a point to a polygon
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
    // Allow double-click in create mode if we have at least 3 points already
    if (createMode && currentPolygon.length >= 3) {
      // Find closest line segment in the current polygon
      const result = findClosestLineSegment(currentPolygon, x, y);
      
      // Increased proximity buffer for easier double-clicking
      if (result && result.distance <= CLICK_PROXIMITY * 4) {
        // Insert new point after the first point of the segment
        const newPolygon = [...currentPolygon];
        newPolygon.splice(result.index + 1, 0, [x, y]);
        setCurrentPolygon(newPolygon);
        return;
      }
      
      return;
    }
    
    // Double-click functionality for existing polygons in edit mode
    // Find if double-clicked on or near a polygon
    const polygon = findPolygonAt(x, y);
    
    if (polygon) {
      // Find the closest line segment to insert the new point
      const result = findClosestLineSegment(polygon.points, x, y);
      
      // Increased proximity buffer for easier double-clicking
      if (result && result.distance <= CLICK_PROXIMITY * 4) {
        // Insert new point after the first point of the segment
        const newPoints = [...polygon.points];
        newPoints.splice(result.index + 1, 0, [x, y]);
        
        // Update the polygons array
        const updatedPolygons = polygons.map(p => {
          if (p.id === polygon.id) {
            return { ...p, points: newPoints };
          }
          return p;
        });
        
        setPolygons(updatedPolygons);
        
        // Select the polygon and the new point
        setSelectedPolygon(polygon);
        setSelectedPoint({ index: result.index + 1, polygonId: polygon.id });
        setPolygonName(polygon.name);
      }
    }
  };

  return (
    <div className="polygon-editor" ref={containerRef}>
      <div className="polygon-toolbar">
        {!createMode && !selectedPolygon ? (
          <button 
            className="btn btn-primary"
            onClick={handleCreatePolygon}
            disabled={loading}
          >
            Create Polygon
          </button>
        ) : (
          <div className="input-group" style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Polygon name"
              value={polygonName}
              onChange={(e) => setPolygonName(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <div style={{ display: 'flex', marginLeft: '10px' }}>
              {createMode ? (
                <>
                  <button 
                    className="btn btn-danger"
                    onClick={handleCancelCreate}
                    disabled={loading}
                    style={{ marginRight: '5px' }}
                  >
                    ✕
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={handleSaveNewPolygon}
                    disabled={currentPolygon.length < 3 || loading}
                  >
                    Add
                  </button>
                </>
              ) : selectedPolygon ? (
                <>
                  <button 
                    className="btn btn-danger"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    style={{ marginRight: '5px' }}
                  >
                    ✕
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={savePolygonChanges}
                    disabled={loading}
                  >
                    Save
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div className="canvas-container" style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleRightClick}
          onDoubleClick={handleDoubleClick}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, cursor: isDragging ? 'grabbing' : 'default' }}
        ></canvas>
        <img
          ref={imageRef}
          alt="Stream"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: `${width}px`, 
            height: `${height}px`,
            zIndex: 0,
            display: 'none' // Hidden but used for drawing
          }}
          onLoad={() => drawCanvas()}
        />
      </div>
      
      {polygons.length > 0 && (
        <div className="polygon-list">
          <h4>Polygons ({polygons.length})</h4>
          <ul>
            {polygons.map(polygon => (
              <li 
                key={polygon.id}
                className={selectedPolygon?.id === polygon.id ? 'selected' : ''}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div 
                    className="color-swatch" 
                    style={{ 
                      backgroundColor: `rgb(${polygon.color[0]}, ${polygon.color[1]}, ${polygon.color[2]})`,
                      width: '15px',
                      height: '15px',
                      marginRight: '8px',
                      borderRadius: '3px'
                    }}
                  ></div>
                  <span>{polygon.name}</span>
                </div>
                <div className="polygon-actions" style={{ display: 'flex' }}>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditPolygon(polygon)}
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => deletePolygon(polygon.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PolygonEditor; 