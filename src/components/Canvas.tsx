import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDrop } from 'react-dnd';
import { fabric } from 'fabric';
import { MediaItem } from '../types';

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
  hue: number;
}

interface CanvasProps {
  width: number;
  height: number;
  mediaItems: MediaItem[];
  selectedMedia: string | null;
  activeTool: string;
  isCarouselMode?: boolean;
  carouselSlides?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomChange?: (zoom: number) => void;
  zoom?: number;
  onClearAll?: () => void;
  showSeparatorLine?: boolean;
  onToolChange?: (tool: string) => void;
  onSelectionChange?: (hasSelection: boolean, imageId?: string) => void;
}

const Canvas = forwardRef<any, CanvasProps>(({
  width,
  height,
  mediaItems,
  selectedMedia,
  activeTool,
  isCarouselMode = false,
  carouselSlides = 1,
  onUndo,
  onRedo,
  onZoomChange,
  zoom: externalZoom,
  onClearAll,
  showSeparatorLine = true,
  onToolChange,
  onSelectionChange
}, ref) => {
  // Calculate container width based on number of carousel slides
  const containerWidth = isCarouselMode ? width * carouselSlides : width;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [internalZoom, setInternalZoom] = useState(1);
  const [isCropMode, setIsCropMode] = useState(false);
  
  // Use external zoom if provided, otherwise use internal
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const clearAllObjects = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.setBackgroundColor('#ffffff', fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
  }, []);

  const applyFilters = useCallback((filters: ImageFilters) => {
    if (!fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject) {
      return;
    }

    // Check if it's an image
    if (activeObject.type !== 'image') {
      return;
    }

    const img = activeObject as fabric.Image;
    
    // Disable caching during filter application
    img.objectCaching = false;
    
    // Clear existing filters first
    img.filters = [];
    
    // Apply filters only if they have non-default values
    // Brightness: -1 to 1 range
    if (filters.brightness !== 0) {
      img.filters.push(new fabric.Image.filters.Brightness({ 
        brightness: filters.brightness 
      }));
    }
    
    // Contrast: -1 to 1 range
    if (filters.contrast !== 0) {
      img.filters.push(new fabric.Image.filters.Contrast({ 
        contrast: filters.contrast 
      }));
    }
    
    // Saturation: -1 to 1 range
    if (filters.saturation !== 0) {
      img.filters.push(new fabric.Image.filters.Saturation({ 
        saturation: filters.saturation 
      }));
    }
    
    // Hue rotation: -180 to 180 degrees
    if (filters.hue !== 0) {
      img.filters.push(new fabric.Image.filters.HueRotation({ 
        rotation: filters.hue / 360 
      }));
    }
    
    // Blur: 0 to 1 range
    if (filters.blur > 0) {
      img.filters.push(new fabric.Image.filters.Blur({ 
        blur: filters.blur 
      }));
    }
    
    // Grayscale
    if (filters.grayscale) {
      img.filters.push(new fabric.Image.filters.Grayscale());
    }
    
    // Sepia
    if (filters.sepia) {
      img.filters.push(new fabric.Image.filters.Sepia());
    }
    
    // Invert
    if (filters.invert) {
      img.filters.push(new fabric.Image.filters.Invert());
    }

    // Apply all filters
    img.applyFilters();
    
    // Force complete re-render
    fabricCanvasRef.current.renderAll();
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearAll: clearAllObjects,
    discardActiveObject: () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.discardActiveObject();
        fabricCanvasRef.current.renderAll();
      }
    },
    applyFilters: applyFilters,
    getFabricCanvas: () => fabricCanvasRef.current
  }), [clearAllObjects, applyFilters]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        renderOnAddRemove: true
      });

      // Enable WebGL for better filter performance on high-res images
      try {
        const fabricAny = fabric as any;
        if (fabricAny.initFilterBackend) {
          fabric.filterBackend = fabricAny.initFilterBackend();
        }
      } catch (e) {
        console.log('WebGL filter backend not available, using 2D canvas');
      }

      fabricCanvasRef.current = canvas;

      // Track current selected image ID
      let currentImageId: string | null = null;

      // Add event listeners
      canvas.on('selection:created', (e) => {
        const activeObjects = canvas.getActiveObjects();
        
        // Check if any selected object is an image
        const hasImage = activeObjects.some(obj => obj.type === 'image' || obj.type === 'group');
        
        // Get the ID of the selected image
        const selectedImage = activeObjects.find(obj => obj.type === 'image');
        const newImageId = selectedImage ? (selectedImage as any).__imageId : null;
        
        // Notify parent with image ID
        if (newImageId && newImageId !== currentImageId) {
          currentImageId = newImageId;
          if (onSelectionChange) {
            onSelectionChange(hasImage, newImageId);
          }
        } else if (onSelectionChange) {
          onSelectionChange(hasImage, newImageId || undefined);
        }
        
        console.log('Object selected:', activeObjects.length, 'Image ID:', newImageId);
      });

      canvas.on('selection:updated', (e) => {
        const activeObjects = canvas.getActiveObjects();
        
        // Check if any selected object is an image
        const hasImage = activeObjects.some(obj => obj.type === 'image' || obj.type === 'group');
        
        // Get the ID of the selected image
        const selectedImage = activeObjects.find(obj => obj.type === 'image');
        const newImageId = selectedImage ? (selectedImage as any).__imageId : null;
        
        // Notify parent with image ID
        if (newImageId && newImageId !== currentImageId) {
          currentImageId = newImageId;
          if (onSelectionChange) {
            onSelectionChange(hasImage, newImageId);
          }
        } else if (onSelectionChange) {
          onSelectionChange(hasImage, newImageId || undefined);
        }
        
        console.log('Selection updated:', activeObjects.length, 'Image ID:', newImageId);
      });

      canvas.on('selection:cleared', () => {
        currentImageId = null;
        if (onSelectionChange) {
          onSelectionChange(false, undefined);
        }
        console.log('Selection cleared');
      });

      // Handle keyboard events
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteSelectedObjects();
        } else if (e.key === '[') {
          // Send backward
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.sendBackwards(activeObject);
            canvas.renderAll();
          }
        } else if (e.key === ']') {
          // Bring forward
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.bringForward(activeObject);
            canvas.renderAll();
          }
        } else if (e.key === '{' && e.shiftKey) {
          // Send to back (Shift + [)
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.sendToBack(activeObject);
            canvas.renderAll();
          }
        } else if (e.key === '}' && e.shiftKey) {
          // Bring to front (Shift + ])
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.bringToFront(activeObject);
            canvas.renderAll();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update canvas size when props change
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({
        width: containerWidth,
        height: height
      });
    }
  }, [containerWidth, height]);

  // Calculate scale to fit canvas by height in the container
  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.parentElement?.clientHeight || window.innerHeight;
        // Leave some padding (e.g., 100px for UI elements)
        const availableHeight = containerHeight - 100;
        const calculatedScale = Math.min(availableHeight / height, 1);
        setScale(calculatedScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [height]);

  // Combined scale (fit scale * user zoom)
  const finalScale = scale * zoom;

  // Handle tool changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      switch (activeTool) {
        case 'select':
          fabricCanvasRef.current.isDrawingMode = false;
          fabricCanvasRef.current.selection = true;
          setIsCropMode(false);
          break;
        case 'brush':
          fabricCanvasRef.current.isDrawingMode = true;
          fabricCanvasRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricCanvasRef.current);
          setIsCropMode(false);
          break;
        case 'text':
          addTextObject();
          setIsCropMode(false);
          break;
        case 'crop':
          fabricCanvasRef.current.isDrawingMode = false;
          fabricCanvasRef.current.selection = true;
          setIsCropMode(true);
          enableCropMode();
          break;
        default:
          fabricCanvasRef.current.isDrawingMode = false;
          fabricCanvasRef.current.selection = true;
          setIsCropMode(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Drag and drop for media items
  const [{ isOver }, drop] = useDrop({
    accept: 'media',
    drop: (item: { mediaId: string }, monitor) => {
      const mediaItem = mediaItems.find(m => m.id === item.mediaId);
      if (mediaItem && fabricCanvasRef.current && canvasRef.current) {
        // Get the drop position relative to the canvas
        const offset = monitor.getClientOffset();
        if (offset) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const x = (offset.x - canvasRect.left) / finalScale;
          const y = (offset.y - canvasRect.top) / finalScale;
          addImageToCanvas(mediaItem, x, y);
        } else {
          addImageToCanvas(mediaItem);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const addImageToCanvas = useCallback((mediaItem: MediaItem, dropX?: number, dropY?: number) => {
    if (!fabricCanvasRef.current) return;

    // Check if the file is SVG
    const isSVG = mediaItem.url.toLowerCase().includes('.svg') || mediaItem.name.toLowerCase().endsWith('.svg');

    if (isSVG) {
      // Load SVG using fabric.loadSVGFromURL
      fabric.loadSVGFromURL(mediaItem.url, (objects, options) => {
        const svg = fabric.util.groupSVGElements(objects, options);
        if (svg && fabricCanvasRef.current) {
          // Scale SVG to fit canvas while maintaining aspect ratio
          const maxWidth = width * 0.8;
          const maxHeight = height * 0.8;
          
          const scaleX = maxWidth / svg.width!;
          const scaleY = maxHeight / svg.height!;
          const scale = Math.min(scaleX, scaleY, 1);
          
          svg.scale(scale);
          
          // If drop coordinates are provided, use them; otherwise center the image
          const left = dropX !== undefined ? dropX - (svg.width! * scale) / 2 : (width - svg.width! * scale) / 2;
          const top = dropY !== undefined ? dropY - (svg.height! * scale) / 2 : (height - svg.height! * scale) / 2;
          
          svg.set({
            left: left,
            top: top,
            selectable: true,
            evented: true
          });

          fabricCanvasRef.current.add(svg);
          fabricCanvasRef.current.setActiveObject(svg);
          fabricCanvasRef.current.renderAll();
        }
      });
    } else {
      // Load regular images (PNG, JPG, etc.)
      // First, load the image to check its dimensions
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      
      imgElement.onload = () => {
        const originalWidth = imgElement.width;
        const originalHeight = imgElement.height;
        
        // Define max dimensions for filter processing (prevents white areas on high-res images)
        const MAX_FILTER_DIMENSION = 2048;
        
        let imageUrl = mediaItem.url;
        
        // If image is too large, downsample it first
        if (originalWidth > MAX_FILTER_DIMENSION || originalHeight > MAX_FILTER_DIMENSION) {
          const tempCanvas = document.createElement('canvas');
          const ctx = tempCanvas.getContext('2d');
          
          if (ctx) {
            // Calculate new dimensions while maintaining aspect ratio
            let newWidth = originalWidth;
            let newHeight = originalHeight;
            
            const ratio = Math.max(newWidth / MAX_FILTER_DIMENSION, newHeight / MAX_FILTER_DIMENSION);
            newWidth = Math.floor(newWidth / ratio);
            newHeight = Math.floor(newHeight / ratio);
            
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            
            // Draw the resized image
            ctx.drawImage(imgElement, 0, 0, newWidth, newHeight);
            
            // Convert to data URL with high quality
            imageUrl = tempCanvas.toDataURL('image/png', 1.0);
          }
        }
        
        // Now load into Fabric.js
        fabric.Image.fromURL(imageUrl, (img) => {
          if (img) {
            // Scale image to fit canvas while maintaining aspect ratio
            const maxWidth = width * 0.8;
            const maxHeight = height * 0.8;
            
            const scaleX = maxWidth / img.width!;
            const scaleY = maxHeight / img.height!;
            const scale = Math.min(scaleX, scaleY, 1);
            
            img.scale(scale);
            
            // If drop coordinates are provided, use them; otherwise center the image
            const left = dropX !== undefined ? dropX - (img.width! * scale) / 2 : (width - img.width! * scale) / 2;
            const top = dropY !== undefined ? dropY - (img.height! * scale) / 2 : (height - img.height! * scale) / 2;
            
            img.set({
              left: left,
              top: top,
              selectable: true,
              evented: true,
              objectCaching: false // Disable caching for filters
            });

            // Initialize empty filters array
            img.filters = [];
            
            // Assign unique ID to track this image
            (img as any).__imageId = `img-${Date.now()}-${Math.random()}`;

            fabricCanvasRef.current!.add(img);
            fabricCanvasRef.current!.setActiveObject(img);
            fabricCanvasRef.current!.renderAll();
          }
        }, { crossOrigin: 'anonymous' });
      };
      
      imgElement.onerror = () => {
        console.error('Failed to load image:', mediaItem.url);
      };
      
      imgElement.src = mediaItem.url;
    }
  }, [width, height]);

  const addTextObject = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.Textbox('Double click to edit', {
      left: width / 2,
      top: height / 2,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
      textAlign: 'center',
      selectable: true,
      evented: true
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  }, [width, height]);

  const deleteSelectedObjects = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        fabricCanvasRef.current!.remove(obj);
      });
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  const enableCropMode = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject || (activeObject.type !== 'image' && activeObject.type !== 'group')) {
      alert('Please select an image to crop');
      return;
    }

    // Make the image non-selectable during crop
    activeObject.set({
      selectable: false,
      evented: false
    });

    // Create a crop rectangle overlay
    const imgBounds = activeObject.getBoundingRect();
    const cropWidth = Math.min(imgBounds.width * 0.6, 300);
    const cropHeight = Math.min(imgBounds.height * 0.6, 300);
    
    const cropRect = new fabric.Rect({
      left: imgBounds.left + (imgBounds.width - cropWidth) / 2,
      top: imgBounds.top + (imgBounds.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      fill: 'rgba(0, 0, 0, 0.3)',
      stroke: '#00A3FF',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      hasControls: true,
      lockRotation: true,
      cornerColor: '#00A3FF',
      cornerSize: 12,
      transparentCorners: false,
      cornerStyle: 'circle'
    });

    fabricCanvasRef.current.add(cropRect);
    fabricCanvasRef.current.setActiveObject(cropRect);
    fabricCanvasRef.current.renderAll();

    // Store the crop rect and original image for later
    (fabricCanvasRef.current as any)._cropRect = cropRect;
    (fabricCanvasRef.current as any)._cropImage = activeObject;
  }, []);

  const applyCrop = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const cropRect = (fabricCanvasRef.current as any)._cropRect;
    const originalImage = (fabricCanvasRef.current as any)._cropImage;
    
    if (!cropRect || !originalImage) return;

    // Get crop rectangle bounds
    const cropBounds = cropRect.getBoundingRect();
    const imgBounds = originalImage.getBoundingRect();

    // Calculate crop area relative to the image
    const relativeLeft = cropBounds.left - imgBounds.left;
    const relativeTop = cropBounds.top - imgBounds.top;
    
    // Get the original image element
    const img = originalImage as fabric.Image;
    const imgElement = img.getElement();
    
    // Create a temporary canvas to crop the image
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx || !imgElement) return;
    
    // Set canvas size to crop rectangle size
    tempCanvas.width = cropBounds.width;
    tempCanvas.height = cropBounds.height;
    
    // Calculate scale factors
    const scaleX = img.scaleX || 1;
    const scaleY = img.scaleY || 1;
    
    // Draw the cropped portion
    ctx.drawImage(
      imgElement,
      relativeLeft / scaleX,
      relativeTop / scaleY,
      cropBounds.width / scaleX,
      cropBounds.height / scaleY,
      0,
      0,
      cropBounds.width,
      cropBounds.height
    );
    
    // Create new image from cropped canvas
    fabric.Image.fromURL(tempCanvas.toDataURL(), (croppedImg) => {
      if (croppedImg && fabricCanvasRef.current) {
        croppedImg.set({
          left: cropBounds.left,
          top: cropBounds.top,
          selectable: true,
          evented: true
        });
        
        // Remove original image and crop rectangle
        fabricCanvasRef.current.remove(originalImage);
        fabricCanvasRef.current.remove(cropRect);
        
        // Add cropped image
        fabricCanvasRef.current.add(croppedImg);
        fabricCanvasRef.current.setActiveObject(croppedImg);
        fabricCanvasRef.current.renderAll();
        
        // Clean up references
        delete (fabricCanvasRef.current as any)._cropRect;
        delete (fabricCanvasRef.current as any)._cropImage;
        
        setIsCropMode(false);
        
        // Switch back to select tool
        if (onToolChange) {
          onToolChange('select');
        }
      }
    });
  }, [onToolChange]);

  const cancelCrop = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const cropRect = (fabricCanvasRef.current as any)._cropRect;
    const originalImage = (fabricCanvasRef.current as any)._cropImage;
    
    // Remove crop rectangle
    if (cropRect) {
      fabricCanvasRef.current.remove(cropRect);
    }
    
    // Re-enable the original image
    if (originalImage) {
      originalImage.set({
        selectable: true,
        evented: true
      });
    }
    
    // Clean up references
    delete (fabricCanvasRef.current as any)._cropRect;
    delete (fabricCanvasRef.current as any)._cropImage;
    
    fabricCanvasRef.current.renderAll();
    setIsCropMode(false);
  }, []);

  // Add selected media to canvas when selected
  useEffect(() => {
    if (selectedMedia && fabricCanvasRef.current) {
      const mediaItem = mediaItems.find(m => m.id === selectedMedia);
      if (mediaItem) {
        addImageToCanvas(mediaItem);
      }
    }
  }, [selectedMedia, mediaItems, addImageToCanvas]);

  return (
    <div
      ref={containerRef}
      style={{
        transform: `scale(${finalScale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease-out'
      }}
    >
      <div
        ref={drop}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${isOver ? 'border-cta-blue bg-blue-50' : 'border-gray-600'}
        `}
        style={{ 
          width: containerWidth, 
          height: height
        }}
      >
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-lg"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      
      
      {/* Crop Mode Overlay */}
      {isCropMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-10">
          <span className="text-sm">Drag and resize the blue rectangle to select crop area</span>
          <button
            onClick={applyCrop}
            className="px-3 py-1 bg-cta-blue rounded hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Apply Crop
          </button>
          <button
            onClick={cancelCrop}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}



      {/* Carousel Separator Lines */}
      {isCarouselMode && showSeparatorLine && (
        <>
          {Array.from({ length: carouselSlides - 1 }).map((_, index) => (
            <div 
              key={`separator-${index}`}
              className="absolute top-0 bottom-0 border-r-2 border-dashed border-cta-blue pointer-events-none"
              style={{ 
                left: `${width * (index + 1)}px`,
                opacity: 0.5
              }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -right-3 bg-cta-blue text-white text-xs px-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </>
      )}

      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
