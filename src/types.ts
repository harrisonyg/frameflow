export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  file?: File; // Optional for pasted images from clipboard
  url: string;
  thumbnail: string;
}

export interface CanvasObject {
  id: string;
  type: 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  data?: any;
}

export interface InstagramSize {
  name: string;
  width: number;
  height: number;
  description: string;
}

export interface Filter {
  name: string;
  type: string;
  value: number;
}

export interface CollageLayout {
  name: string;
  rows: number;
  cols: number;
  cells: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  objects: any[]; // Canvas objects within this artboard
}

export interface ProjectData {
  version: string;
  createdAt: string;
  canvasSize?: {
    width: number;
    height: number;
  };
  isCarouselMode?: boolean;
  carouselSlides?: number;
  carouselSlideSize?: {
    width: number;
    height: number;
  };
  artboards?: Artboard[]; // New artboard system (v3.0+)
  canvasState?: string; // Legacy - JSON string from Konva/Fabric.js
  imageFilters?: Record<string, any>; // Filters per image
  canvasZoom?: number;
  canvasPan?: { x: number; y: number };
}

