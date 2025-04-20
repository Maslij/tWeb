import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api';
import Modal from './Modal';
import '../styles/LineZoneConfigModal.css';

interface Point {
  x: number;
  y: number;
}

interface Line {
  id: string;
  name?: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  in_count: number;
  out_count: number;
  minimum_crossing_threshold: number;
  triggering_anchors: string[];
}

interface LineZoneConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  lines: Line[];
  onSave: (lines: Line[]) => void;
}

const LineZoneConfigModal: React.FC<LineZoneConfigModalProps> = ({
  isOpen,
  onClose,
  streamId,
  lines: initialLines,
  onSave,
}) => {
  // State for storing lines with proper coordinates
  const [lines, setLines] = useState<Line[]>(initialLines);

  // State for tracking the currently selected line and point
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<'start' | 'end' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLineName, setEditingLineName] = useState('');
  
  // Reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // Canvas dimensions state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Store the natural (original) image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load the image and set up the canvas
  useEffect(() => {
    if (!isOpen || !streamId) return;
    
    // Get the latest image URL with a timestamp to prevent caching
    setImageUrl(apiService.getFrameUrlWithTimestamp(streamId));
    
    // Set up refresh interval for the image
    const intervalId = setInterval(() => {
      setImageUrl(apiService.getFrameUrlWithTimestamp(streamId));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isOpen, streamId]);

  // When the image loads, update the canvas dimensions and store image dimensions
  useEffect(() => {
    if (!imageRef.current || !imageLoaded) return;
    
    const img = imageRef.current;
    
    // Store the displayed dimensions
    setCanvasDimensions({
      width: img.width,
      height: img.height
    });
    
    // Store the image (original) dimensions
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    
    if (canvasRef.current) {
      canvasRef.current.width = img.width;
      canvasRef.current.height = img.height;
      drawLines();
    }
  }, [imageLoaded, lines, selectedLineId, selectedPoint]);

  // Draw lines on the canvas
  const drawLines = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale factor for display (canvas might be scaled for display)
    const scaleX = canvas.width / imageDimensions.width;
    const scaleY = canvas.height / imageDimensions.height;
    
    // Draw all lines
    lines.forEach(line => {
      const isSelected = line.id === selectedLineId;
      
      // Scale coordinates for display
      const startX = line.start_x * scaleX;
      const startY = line.start_y * scaleY;
      const endX = line.end_x * scaleX;
      const endY = line.end_y * scaleY;
      
      // Line style
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#00ff00' : '#ffffff';
      
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw endpoints (circles)
      const startPointSelected = isSelected && selectedPoint === 'start';
      const endPointSelected = isSelected && selectedPoint === 'end';
      
      // Start point
      ctx.beginPath();
      ctx.arc(startX, startY, startPointSelected ? 8 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = startPointSelected ? '#00ff00' : '#ffffff';
      ctx.fill();
      
      // End point
      ctx.beginPath();
      ctx.arc(endX, endY, endPointSelected ? 8 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = endPointSelected ? '#00ff00' : '#ffffff';
      ctx.fill();
      
      // Draw line name if available
      if (line.name) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        ctx.font = isSelected ? 'bold 14px Arial' : '12px Arial';
        ctx.fillStyle = isSelected ? '#00ff00' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line.name, midX, midY - 15);
      }
    });
  };

  // Add a new line at a random position
  const addLine = () => {
    // Get dimensions to place line within visible area
    const width = imageDimensions.width || 1920;
    const height = imageDimensions.height || 1080;
    
    // Create a horizontal line at a random y position
    const randomY = Math.floor(Math.random() * 0.8 * height + 0.1 * height); // 10% to 90% of height
    
    const newLine: Line = {
      id: `line_${Date.now()}`,
      name: `Line ${lines.length + 1}`,
      // Set pixel coordinates directly
      start_x: Math.floor(0.2 * width),
      start_y: randomY,
      end_x: Math.floor(0.8 * width),
      end_y: randomY,
      in_count: 0,
      out_count: 0,
      minimum_crossing_threshold: 1,
      triggering_anchors: ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"]
    };
    
    setLines([...lines, newLine]);
    setSelectedLineId(newLine.id);
    setSelectedPoint(null);
  };

  // Delete a line
  const deleteLine = (lineId: string) => {
    setLines(lines.filter(line => line.id !== lineId));
    if (selectedLineId === lineId) {
      setSelectedLineId(null);
      setSelectedPoint(null);
    }
  };

  // Select a line for editing
  const selectLine = (lineId: string) => {
    setSelectedLineId(lineId);
    setSelectedPoint(null);
    
    // If user is selecting a line for editing, get its name
    const line = lines.find(l => l.id === lineId);
    if (line) {
      setEditingLineName(line.name || '');
    }
  };

  // Start editing a line name
  const startEditing = (lineId: string) => {
    selectLine(lineId);
    setIsEditing(true);
  };

  // Save the edited line name
  const saveLineName = () => {
    if (!selectedLineId) return;
    
    setLines(lines.map(line => {
      if (line.id === selectedLineId) {
        return { ...line, name: editingLineName };
      }
      return line;
    }));
    
    setIsEditing(false);
  };

  // Handle canvas mouse down to select lines and points
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale factor for converting display coordinates to image coordinates
    const scaleX = imageDimensions.width / canvas.width;
    const scaleY = imageDimensions.height / canvas.height;
    
    // Check if the user clicked on a point of the selected line
    if (selectedLineId) {
      const selectedLine = lines.find(line => line.id === selectedLineId);
      if (selectedLine) {
        // Scale coordinates for display
        const startX = selectedLine.start_x / scaleX;
        const startY = selectedLine.start_y / scaleY;
        const endX = selectedLine.end_x / scaleX;
        const endY = selectedLine.end_y / scaleY;
        
        // Check if clicked on start point
        const startDistance = Math.sqrt(
          Math.pow(startX - x, 2) + 
          Math.pow(startY - y, 2)
        );
        
        // Check if clicked on end point
        const endDistance = Math.sqrt(
          Math.pow(endX - x, 2) + 
          Math.pow(endY - y, 2)
        );
        
        // Tolerance for clicking on a point
        const tolerance = 10;
        
        if (startDistance < tolerance) {
          setSelectedPoint('start');
          setIsDragging(true);
          return;
        }
        
        if (endDistance < tolerance) {
          setSelectedPoint('end');
          setIsDragging(true);
          return;
        }
      }
    }
    
    // Check if the user clicked on any line
    for (const line of lines) {
      // Scale coordinates for display
      const startX = line.start_x * (canvas.width / imageDimensions.width);
      const startY = line.start_y * (canvas.height / imageDimensions.height);
      const endX = line.end_x * (canvas.width / imageDimensions.width);
      const endY = line.end_y * (canvas.height / imageDimensions.height);
      
      // Calculate distance from point to line segment
      const lineDistance = distanceToLine(
        x, y, 
        startX, startY, 
        endX, endY
      );
      
      // If clicked close enough to a line, select it
      if (lineDistance < 10) {
        selectLine(line.id);
        return;
      }
    }
    
    // If no line or point was clicked, deselect
    setSelectedLineId(null);
    setSelectedPoint(null);
  };

  // Handle canvas mouse move for dragging points
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLineId || !selectedPoint || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale factor to convert from display to image coordinates
    const scaleX = imageDimensions.width / canvas.width;
    const scaleY = imageDimensions.height / canvas.height;
    
    // Convert to actual image coordinates
    const imageX = Math.round(x * scaleX);
    const imageY = Math.round(y * scaleY);
    
    // Update the position of the selected point
    setLines(lines.map(line => {
      if (line.id === selectedLineId) {
        if (selectedPoint === 'start') {
          return { 
            ...line, 
            start_x: imageX,
            start_y: imageY
          };
        } else if (selectedPoint === 'end') {
          return { 
            ...line, 
            end_x: imageX,
            end_y: imageY
          };
        }
      }
      return line;
    }));
  };

  // Handle canvas mouse up to end dragging
  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setSelectedPoint(null);
    }
  };

  // Calculate distance from a point to a line segment
  const distanceToLine = (
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
      param = dot / len_sq;
    }
    
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
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Apply and save changes, using pixel coordinates directly
  const handleApply = () => {
    // Save the lines as they are (with actual pixel coordinates)
    onSave(lines);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="line-zone-config-modal">
        <h2>Line Zone Configuration</h2>
        
        <div className="line-zone-config-container" ref={containerRef}>
          <div className="camera-view-container">
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Camera Feed"
              className="camera-feed-image"
              onLoad={() => setImageLoaded(true)}
            />
            <canvas
              ref={canvasRef}
              className="line-zone-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>
          
          <div className="config-controls">
            <button className="add-line-button" onClick={addLine}>
              + Add New Line
            </button>
            <div className="image-dimensions-info">
              Image: {imageDimensions.width}×{imageDimensions.height}px 
            </div>
          </div>
          
          <div className="line-list-container">
            <h3>Line Zones</h3>
            {lines.length === 0 ? (
              <div className="no-lines-message">
                No lines defined. Click "Add New Line" to create one.
              </div>
            ) : (
              <div className="line-list">
                {lines.map(line => (
                  <div 
                    key={line.id} 
                    className={`line-item ${selectedLineId === line.id ? 'selected' : ''}`}
                    onClick={() => selectLine(line.id)}
                  >
                    <div className="line-info">
                      {isEditing && selectedLineId === line.id ? (
                        <div className="line-name-edit">
                          <input
                            type="text"
                            value={editingLineName}
                            onChange={(e) => setEditingLineName(e.target.value)}
                            autoFocus
                          />
                          <button onClick={saveLineName}>Save</button>
                        </div>
                      ) : (
                        <span className="line-name">{line.name || `Line ${line.id}`}</span>
                      )}
                      <span className="line-counts">
                        In: {line.in_count}, Out: {line.out_count}
                      </span>
                      <span className="line-coords-info">
                        Coords: ({line.start_x}, {line.start_y}) → ({line.end_x}, {line.end_y})
                      </span>
                    </div>
                    <div className="line-actions">
                      <button 
                        className="edit-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(line.id);
                        }}
                        title="Edit line name"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLine(line.id);
                        }}
                        title="Delete line"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button className="apply-button" onClick={handleApply}>Apply Changes</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LineZoneConfigModal; 