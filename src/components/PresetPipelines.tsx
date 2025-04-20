import React, { useRef, useState, useEffect } from 'react';
import '../styles/PresetPipelines.css';

// Define the type for a preset pipeline
export interface PipelinePreset {
  id: string;
  name: string;
  description: string;
  icon: string; // Path to icon or emoji
  difficulty: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  nodes: any[]; // Simplified pipeline nodes
}

// Define some preset pipelines
export const presetPipelines: PipelinePreset[] = [
  {
    id: 'basic_object_detection',
    name: 'Basic Object Detection',
    description: 'Detect objects in your video stream with bounding boxes',
    icon: '🔍',
    difficulty: 'basic',
    tags: ['detection', 'objects'],
    nodes: [
      {
        componentId: 'camera_feed',
        id: 'camera_feed',
        connections: ['object_detector_1'],
        config: {},
      },
      {
        componentId: 'object_detector',
        id: 'object_detector_1',
        connections: ['annotated_stream_1'],
        config: {
          model: 'yolov4',
          confidence: 0.6,
          classes: ['person', 'car', 'dog', 'cat'],
          model_classes: {
            "yolov4": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"],
            "yolov8": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"]
          }
        },
      },
      {
        componentId: 'annotated_stream',
        id: 'annotated_stream_1',
        connections: [],
        config: {
          show_labels: true,
          show_bounding_boxes: true,
          show_tracks: false,
          show_title: true,
          show_timestamp: true,
        },
      },
    ],
  },
  {
    id: 'people_counting',
    name: 'People Counting',
    description: 'Count people crossing a line in your video',
    icon: '👥',
    difficulty: 'intermediate',
    tags: ['counting', 'people'],
    nodes: [
      {
        componentId: 'camera_feed',
        id: 'camera_feed',
        connections: ['object_detector_1'],
        config: {},
      },
      {
        componentId: 'object_detector',
        id: 'object_detector_1',
        connections: ['object_tracker_1'],
        config: {
          model: 'yolov4',
          confidence: 0.6,
          classes: ['person'],
          model_classes: {
            "yolov4": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"],
            "yolov8": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"]
          }
        },
      },
      {
        componentId: 'object_tracker',
        id: 'object_tracker_1',
        connections: ['line_zone_manager_1'],
        config: {},
      },
      {
        componentId: 'line_zone_manager',
        id: 'line_zone_manager_1',
        connections: ['annotated_stream_1'],
        config: {
          lines: [
            {
              id: 'line_1',
              start_x: 50,
              start_y: 300,
              end_x: 1000,
              end_y: 300,
              in_count: 0,
              out_count: 0,
            },
          ],
        },
      },
      {
        componentId: 'annotated_stream',
        id: 'annotated_stream_1',
        connections: [],
        config: {
          show_labels: true,
          show_bounding_boxes: true,
          show_tracks: true,
          show_line_zones: true,
          show_title: true,
          show_timestamp: true,
        },
      },
    ],
  },
  {
    id: 'security_monitoring',
    name: 'Security Monitoring',
    description: 'Get alerts when people enter restricted areas',
    icon: '🔒',
    difficulty: 'intermediate',
    tags: ['security', 'alerts'],
    nodes: [
      {
        componentId: 'camera_feed',
        id: 'camera_feed',
        connections: ['object_detector_1'],
        config: {},
      },
      {
        componentId: 'object_detector',
        id: 'object_detector_1',
        connections: ['object_tracker_1'],
        config: {
          model: 'yolov4',
          confidence: 0.6,
          classes: ['person'],
          model_classes: {
            "yolov4": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"],
            "yolov8": ["person", "bicycle", "car", "motorcycle", "bus", "truck", "dog", "cat", "bird", "horse", "sheep", "cow"]
          }
        },
      },
      {
        componentId: 'object_tracker',
        id: 'object_tracker_1',
        connections: ['event_alarm_1', 'annotated_stream_1'],
        config: {},
      },
      {
        componentId: 'event_alarm',
        id: 'event_alarm_1',
        connections: [],
        config: {
          min_confidence: 0.7,
          trigger_delay: 3,
          cool_down_period: 30,
          notify_on_alarm: true,
          allowed_classes: ['person'],
        },
      },
      {
        componentId: 'annotated_stream',
        id: 'annotated_stream_1',
        connections: [],
        config: {
          show_labels: true,
          show_bounding_boxes: true,
          show_tracks: true,
          show_title: true,
          show_timestamp: true,
        },
      },
    ],
  },
  {
    id: 'vehicle_monitoring',
    name: 'Vehicle Monitoring',
    description: 'Track and count vehicles on the road',
    icon: '🚗',
    difficulty: 'advanced',
    tags: ['vehicles', 'counting'],
    nodes: [
      {
        componentId: 'camera_feed',
        id: 'camera_feed',
        connections: ['object_detector_1'],
        config: {},
      },
      {
        componentId: 'object_detector',
        id: 'object_detector_1',
        connections: ['object_tracker_1'],
        config: {
          model: 'yolov4',
          confidence: 0.6,
          classes: ['car', 'truck', 'bus', 'motorcycle'],
          model_classes: {
            "yolov4": ["person", "bicycle", "car", "motorcycle", "bus", "train", "truck", "boat", "traffic light", "fire hydrant"],
            "yolov8": ["person", "bicycle", "car", "motorcycle", "bus", "train", "truck", "boat", "traffic light", "fire hydrant"]
          }
        },
      },
      {
        componentId: 'object_tracker',
        id: 'object_tracker_1',
        connections: ['line_zone_manager_1'],
        config: {},
      },
      {
        componentId: 'line_zone_manager',
        id: 'line_zone_manager_1',
        connections: ['annotated_stream_1', 'event_logger_1'],
        config: {
          lines: [
            {
              id: 'line_1',
              start_x: 50,
              start_y: 400,
              end_x: 1000,
              end_y: 400,
              in_count: 0,
              out_count: 0,
            },
          ],
        },
      },
      {
        componentId: 'event_logger',
        id: 'event_logger_1',
        connections: [],
        config: {
          log_level: 'info',
          include_images: true,
          retention_days: 7,
        },
      },
      {
        componentId: 'annotated_stream',
        id: 'annotated_stream_1',
        connections: [],
        config: {
          show_labels: true,
          show_bounding_boxes: true,
          show_tracks: true,
          show_line_zones: true,
          show_title: true,
          show_timestamp: true,
        },
      },
    ],
  },
];

// Component to display preset pipelines
const PresetPipelines: React.FC<{
  onSelectPreset: (preset: PipelinePreset) => void;
}> = ({ onSelectPreset }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth > 768);

  // Check if the grid is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      const currentRef = scrollRef.current;
      if (currentRef) {
        setIsScrollable(currentRef.scrollWidth > currentRef.clientWidth);
        setIsWideScreen(window.innerWidth > 768);
      }
    };

    // Check on initial load and window resize
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    
    return () => {
      window.removeEventListener('resize', checkScrollable);
    };
  }, []);

  // Handle scroll to update active indicator
  const handleScroll = () => {
    const currentRef = scrollRef.current;
    if (!currentRef || !isScrollable || !isWideScreen) return;

    const scrollLeft = currentRef.scrollLeft;
    const cardWidth = 280 + 20; // card width + gap
    const newIndex = Math.round(scrollLeft / cardWidth);
    
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Scroll to specific preset
  const scrollToPreset = (index: number) => {
    const currentRef = scrollRef.current;
    if (!currentRef || !isScrollable || !isWideScreen) return;

    const cardWidth = 280 + 20; // card width + gap
    currentRef.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  };

  // Scroll left or right
  const scrollDirection = (direction: 'left' | 'right') => {
    const currentRef = scrollRef.current;
    if (!currentRef || !isScrollable || !isWideScreen) return;

    const cardWidth = 280 + 20; // card width + gap
    const newIndex = direction === 'left' 
      ? Math.max(0, activeIndex - 1) 
      : Math.min(presetPipelines.length - 1, activeIndex + 1);
    
    currentRef.scrollTo({
      left: newIndex * cardWidth,
      behavior: 'smooth'
    });
    setActiveIndex(newIndex);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrollable && isWideScreen) {
        if (e.key === 'ArrowLeft') {
          scrollDirection('left');
        } else if (e.key === 'ArrowRight') {
          scrollDirection('right');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, isScrollable, isWideScreen]);

  return (
    <div className="preset-pipelines-container">
      <h3>Choose a Preset Pipeline</h3>
      <p className="preset-description">
        Start with a ready-made pipeline for common use cases
      </p>
      
      <div 
        className="preset-grid" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {presetPipelines.map((preset) => (
          <div
            key={preset.id}
            className={`preset-card difficulty-${preset.difficulty}`}
            onClick={() => onSelectPreset(preset)}
          >
            <div className="preset-icon">{preset.icon}</div>
            <h4>{preset.name}</h4>
            <p>{preset.description}</p>
            <div className="preset-difficulty">
              {preset.difficulty.charAt(0).toUpperCase() + preset.difficulty.slice(1)}
            </div>
            <div className="preset-tags">
              {preset.tags.map((tag) => (
                <span key={tag} className="preset-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {isScrollable && isWideScreen && (
        <>
          <div className="preset-scroll-nav">
            <button 
              className="scroll-btn"
              onClick={() => scrollDirection('left')}
              disabled={activeIndex === 0}
              aria-label="Scroll left"
            >
              ←
            </button>
            <button 
              className="scroll-btn"
              onClick={() => scrollDirection('right')}
              disabled={activeIndex === presetPipelines.length - 1}
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
          
          <div className="scroll-indicators">
            {presetPipelines.map((_, index) => (
              <div 
                key={index}
                className={`scroll-dot ${activeIndex === index ? 'active' : ''}`}
                onClick={() => scrollToPreset(index)}
                aria-label={`Go to preset ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PresetPipelines; 