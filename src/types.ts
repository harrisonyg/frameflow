export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  file: File;
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

