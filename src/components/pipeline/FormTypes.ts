import { Zone } from "./LineZoneList";

// File Source form interface
export interface FileSourceForm {
  url: string;
  width: number;
  height: number;
  fps: number;
  use_hw_accel: boolean;
  adaptive_timing: boolean;
}

// RTSP source form interface
export interface RtspSourceForm {
  url: string;
  width: number;
  height: number;
  fps: number;
  use_hw_accel: boolean;
  rtsp_transport: string;
  latency: number;
}

// Object Detection form interface
export interface ObjectDetectionForm {
  model_id: string;
  server_url: string;
  confidence_threshold: number;
  draw_bounding_boxes: boolean;
  use_shared_memory: boolean;
  protocol: string;
  label_font_scale: number;
  classes: string[];
  newClass: string;
}

// Object Tracking form interface
export interface ObjectTrackingForm {
  frame_rate: number;
  track_buffer: number;
  track_thresh: number;
  high_thresh: number;
  match_thresh: number;
  draw_tracking: boolean;
  draw_track_trajectory: boolean;
  draw_track_id: boolean;
  draw_semi_transparent_boxes: boolean;
  label_font_scale: number;
}

// Line Zone Manager form interface
export interface LineZoneManagerForm {
  draw_zones: boolean;
  line_color: number[];
  line_thickness: number;
  draw_counts: boolean;
  text_color: number[];
  text_scale: number;
  text_thickness: number;
  zones: {
    id: string;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    min_crossing_threshold: number;
    triggering_anchors: string[];
    triggering_classes: string[];
    in_count?: number;
    out_count?: number;
  }[];
}

// Polygon Zone Manager form interface
export interface PolygonZoneManagerForm {
  draw_zones: boolean;
  fill_color: number[];
  opacity: number;
  outline_color: number[];
  outline_thickness: number;
  draw_labels: boolean;
  text_color: number[];
  text_scale: number;
  text_thickness: number;
  zones: {
    id: string;
    polygon: { x: number; y: number }[];
    min_crossing_threshold: number;
    triggering_anchors: string[];
    triggering_classes: string[];
    in_count?: number;
    out_count?: number;
    current_count?: number;
  }[];
}

// File Sink form interface
export interface FileSinkForm {
  path: string;
  width: number;
  height: number;
  fps: number;
  fourcc: string;
}

// Database Sink form interface
export interface DatabaseSinkForm {
  store_thumbnails: boolean;
  thumbnail_width: number;
  thumbnail_height: number;
  retention_days: number;
  store_detection_events: boolean;
  store_tracking_events: boolean;
  store_counting_events: boolean;
}

// Helper to convert JSON to string with formatting
export const formatJson = (json: any): string => {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return JSON.stringify({});
  }
};

// Helper to parse JSON string safely
export const parseJson = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return {};
  }
}; 