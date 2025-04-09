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
  [0, 255, 0],   // Green
  [255, 0, 0],   // Red
  [0, 0, 255],   // Blue
  [255, 255, 0], // Yellow
  [255, 0, 255], // Magenta
  [0, 255, 255], // Cyan
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
  const [editMode, setEditMode] = useState<'draw' | 'edit' | 'delete'>('draw');
  const [selectedPolygon, setSelectedPolygon] = useState<Polygon | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number, polygonId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polygonName, setPolygonName] = useState('');
  const [isFilled, setIsFilled] = useState(false);
  const [thickness, setThickness] = useState(2);
  const [colorIndex, setColorIndex] = useState(0);

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
  }, [polygons, currentPolygon, selectedPolygon, selectedPoint, editMode]);

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
      
      // Draw points for selected polygon or in edit mode
      if (isSelected || editMode === 'edit') {
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
      
      // If we're drawing, connect to mouse position
      if (isDrawing && currentPolygon.length > 0) {
        // Draw line to cursor position (would need mouse move handler to implement)
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
    for (const polygon of polygons) {
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
    
    // Different behavior based on edit mode
    switch (editMode) {
      case 'draw': {
        // Add point to current polygon
        setCurrentPolygon(prev => [...prev, [x, y]]);
        break;
      }
      case 'edit': {
        // Check if clicked on a point
        const point = findPointAt(x, y);
        if (point) {
          setSelectedPoint(point);
          const polygon = polygons.find(p => p.id === point.polygonId);
          if (polygon) {
            setSelectedPolygon(polygon);
          }
        } else {
          // Check if clicked on a polygon
          const polygon = findPolygonAt(x, y);
          if (polygon) {
            setSelectedPolygon(polygon);
            setSelectedPoint(null);
          } else {
            setSelectedPolygon(null);
            setSelectedPoint(null);
          }
        }
        break;
      }
      case 'delete': {
        // Check if clicked on a polygon
        const polygon = findPolygonAt(x, y);
        if (polygon) {
          deletePolygon(polygon.id);
        }
        break;
      }
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'edit' || !selectedPoint || !selectedPolygon) return;
    
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    
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
  };

  // Handle completing a polygon
  const handleCompletePolygon = async () => {
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

  // Handle canceling polygon creation
  const handleCancelPolygon = () => {
    setCurrentPolygon([]);
  };

  // Save changes to a polygon
  const savePolygonChanges = async () => {
    if (!selectedPolygon) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedPolygon = polygons.find(p => p.id === selectedPolygon.id);
      if (!updatedPolygon) return;
      
      const payload: UpdatePolygonPayload = {
        points: updatedPolygon.points,
      };
      
      await apiService.updatePolygon(streamId, selectedPolygon.id, payload);
      
      if (onPolygonUpdated) {
        onPolygonUpdated(updatedPolygon);
      }
      
      setSelectedPolygon(null);
      setSelectedPoint(null);
    } catch (err) {
      console.error('Error updating polygon:', err);
      setError('Failed to update polygon');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="polygon-editor" ref={containerRef}>
      <div className="polygon-toolbar">
        <div className="mode-selector">
          <button 
            className={`btn ${editMode === 'draw' ? 'btn-primary' : ''}`}
            onClick={() => setEditMode('draw')}
          >
            Draw
          </button>
          <button 
            className={`btn ${editMode === 'edit' ? 'btn-primary' : ''}`}
            onClick={() => setEditMode('edit')}
          >
            Edit
          </button>
          <button 
            className={`btn ${editMode === 'delete' ? 'btn-primary' : ''}`}
            onClick={() => setEditMode('delete')}
          >
            Delete
          </button>
        </div>
        
        {editMode === 'draw' && (
          <div className="draw-controls">
            <input
              type="text"
              placeholder="Polygon name"
              value={polygonName}
              onChange={(e) => setPolygonName(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={isFilled}
                onChange={(e) => setIsFilled(e.target.checked)}
              />
              Filled
            </label>
            <label>
              Thickness:
              <input
                type="range"
                min="1"
                max="10"
                value={thickness}
                onChange={(e) => setThickness(parseInt(e.target.value))}
              />
              {thickness}
            </label>
            
            {currentPolygon.length > 0 && (
              <>
                <button 
                  className="btn btn-primary"
                  onClick={handleCompletePolygon}
                  disabled={currentPolygon.length < 3 || loading}
                >
                  Complete Polygon
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleCancelPolygon}
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
        
        {editMode === 'edit' && selectedPolygon && (
          <div className="edit-controls">
            <button 
              className="btn btn-primary"
              onClick={savePolygonChanges}
              disabled={loading}
            >
              Save Changes
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSelectedPolygon(null);
                setSelectedPoint(null);
                loadPolygons(); // Reload original polygons
              }}
              disabled={loading}
            >
              Cancel
            </button>
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
          onMouseMove={handleMouseMove}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
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
                onClick={() => {
                  if (editMode === 'edit') {
                    setSelectedPolygon(polygon);
                    setSelectedPoint(null);
                  } else if (editMode === 'delete') {
                    deletePolygon(polygon.id);
                  }
                }}
              >
                <div 
                  className="color-swatch" 
                  style={{ 
                    backgroundColor: `rgb(${polygon.color[0]}, ${polygon.color[1]}, ${polygon.color[2]})` 
                  }}
                ></div>
                <span>{polygon.name}</span>
                <button 
                  className="delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePolygon(polygon.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PolygonEditor; 