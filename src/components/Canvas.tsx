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
  onSaveProject?: () => void;
  onOpenProject?: () => void;
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
  onSelectionChange,
  onSaveProject,
  onOpenProject
}, ref) => {
  // Calculate container width based on number of carousel slides
  const containerWidth = isCarouselMode ? width * carouselSlides : width;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [scale, setScale] = useState(1);
  const [internalZoom] = useState(1);
  const [isCropMode, setIsCropMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const clipboardRef = useRef<fabric.Object[]>([]);
  const lastCopyWasInternal = useRef<boolean>(false); // Track if last copy was from canvas
  const lastSystemImageHash = useRef<string>(''); // Hash of last pasted system image
  
  // Undo/Redo state
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);
  
  // Use external zoom if provided, otherwise use internal
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const clearAllObjects = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.setBackgroundColor('#ffffff', fabricCanvasRef.current.requestRenderAll.bind(fabricCanvasRef.current));
    setSelectedObjects([]);
    setShowDeleteButton(false);
  }, []);

  // Save canvas state to history
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current || isUndoRedoRef.current) return;
    
    const json = JSON.stringify(fabricCanvasRef.current.toJSON(['selectable', 'evented', '__imageId']));
    
    // Remove any states after current index (when you make a new change after undo)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history to 50 states to prevent memory issues
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    console.log('State saved, history length:', historyRef.current.length, 'index:', historyIndexRef.current);
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current <= 0) {
      console.log('Cannot undo - at beginning of history');
      return;
    }
    
    historyIndexRef.current--;
    isUndoRedoRef.current = true;
    
    const state = historyRef.current[historyIndexRef.current];
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      isUndoRedoRef.current = false;
      console.log('Undo - now at index:', historyIndexRef.current);
    });
  }, []);

  // Redo
  const handleRedo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) {
      console.log('Cannot redo - at end of history');
      return;
    }
    
    historyIndexRef.current++;
    isUndoRedoRef.current = true;
    
    const state = historyRef.current[historyIndexRef.current];
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      isUndoRedoRef.current = false;
      console.log('Redo - now at index:', historyIndexRef.current);
    });
  }, []);

  // Copy selected objects to clipboard
  const copyObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    // Clone the objects and store in clipboard
    clipboardRef.current = [];
    activeObjects.forEach((obj) => {
      obj.clone((cloned: fabric.Object) => {
        clipboardRef.current.push(cloned);
      }, ['__imageId']); // Preserve custom properties
    });

    // Mark that the last copy was from inside the canvas
    lastCopyWasInternal.current = true;

    console.log(`Copied ${activeObjects.length} object(s) from canvas`);
  }, []);

  // Cut selected objects (copy + delete)
  const cutObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    // First copy
    copyObjects();
    // copyObjects already sets lastCopyWasInternal.current = true

    // Then delete
    activeObjects.forEach((obj) => {
      canvas.remove(obj);
    });

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    console.log(`Cut ${activeObjects.length} object(s) from canvas`);
  }, [copyObjects]);

  // Paste objects from internal clipboard
  const pasteObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || clipboardRef.current.length === 0) {
      console.log('Nothing to paste from internal clipboard');
      return;
    }

    // Clear current selection
    canvas.discardActiveObject();

    const pastedObjects: fabric.Object[] = [];

    // Clone and add each object from internal clipboard
    clipboardRef.current.forEach((obj) => {
      obj.clone((cloned: fabric.Object) => {
        // Offset the pasted object slightly so it's visible
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
          evented: true,
        });

        canvas.add(cloned);
        pastedObjects.push(cloned);

        // If all objects are pasted, select them
        if (pastedObjects.length === clipboardRef.current.length) {
          if (pastedObjects.length === 1) {
            canvas.setActiveObject(pastedObjects[0]);
          } else {
            const selection = new fabric.ActiveSelection(pastedObjects, {
              canvas: canvas,
            });
            canvas.setActiveObject(selection);
          }
          canvas.requestRenderAll();
          console.log(`Pasted ${pastedObjects.length} object(s) from internal clipboard`);
        }
      }, ['__imageId']); // Preserve custom properties
    });
  }, []);

  // Paste from system clipboard (external images)
  const pasteFromSystemClipboard = useCallback(async (e: ClipboardEvent) => {
    console.log('Paste event triggered');
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('Canvas not ready');
      return;
    }

    // Check system clipboard first to see if there's an image
    const items = e.clipboardData?.items;
    if (!items) {
      console.log('No clipboard items');
      
      // No system clipboard, try internal clipboard
      if (clipboardRef.current.length > 0) {
        console.log('Pasting internal canvas objects');
        e.preventDefault();
        pasteObjects();
      }
      return;
    }
    
    console.log(`Clipboard has ${items.length} items`);

    // Check if there's an image in system clipboard and get its "signature"
    let systemImageBlob: Blob | null = null;
    let systemImageHash = '';
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Item ${i}: ${item.type}`);
      
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          systemImageBlob = blob;
          // Create a simple hash based on size and type to detect if it's a new image
          systemImageHash = `${blob.size}-${blob.type}`;
          console.log('Found image in clipboard, hash:', systemImageHash);
          break;
        }
      }
    }

    // Check if system clipboard has a NEW image (different from last pasted)
    const hasNewSystemImage = systemImageBlob && systemImageHash !== lastSystemImageHash.current;
    
    console.log('hasNewSystemImage:', hasNewSystemImage);
    console.log('lastSystemImageHash:', lastSystemImageHash.current);
    console.log('currentSystemImageHash:', systemImageHash);

    // DECISION LOGIC:
    // 1. If system has a NEW image, paste it (takes priority)
    // 2. Otherwise, if we have internal clipboard items, paste those
    // 3. Otherwise, nothing to paste
    
    if (hasNewSystemImage && systemImageBlob) {
      console.log('System clipboard has NEW image - pasting from system clipboard');
      e.preventDefault();
      
      // Update the hash to mark this image as "seen"
      lastSystemImageHash.current = systemImageHash;
      
      // Clear internal clipboard and flag since we're pasting from system
      clipboardRef.current = [];
      lastCopyWasInternal.current = false;

      // Convert blob to data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        if (!imageUrl) return;

        // Load image directly to canvas
        fabric.Image.fromURL(imageUrl, (img) => {
          if (img && canvas) {
            // Scale image to fit canvas while maintaining aspect ratio
            const maxWidth = width * 0.8;
            const maxHeight = height * 0.8;
            
            const scaleX = maxWidth / img.width!;
            const scaleY = maxHeight / img.height!;
            const scale = Math.min(scaleX, scaleY, 1);
            
            img.scale(scale);
              
              // Calculate position - paste at the center of the current slide
              let leftPosition = (width - img.width! * scale) / 2;
              let topPosition = (height - img.height! * scale) / 2;
              
              // Get the scroll container
              const scrollContainer = scrollContainerRef.current;
              
              if (scrollContainer && isCarouselMode && canvasRef.current) {
                const scrollLeft = scrollContainer.scrollLeft;
                const clientWidth = scrollContainer.clientWidth;
                
                // Get the actual scale applied to the canvas (finalScale = scale * zoom)
                const actualScale = scale * zoom;
                
                // Get the canvas element position relative to scroll container
                const canvasElement = canvasRef.current;
                const canvasRect = canvasElement.getBoundingClientRect();
                const scrollRect = scrollContainer.getBoundingClientRect();
                
                // Calculate the offset of the canvas within the scroll container
                const canvasOffsetLeft = canvasRect.left - scrollRect.left + scrollLeft;
                
                console.log('=== PASTE DEBUG ===');
                console.log('scrollLeft:', scrollLeft);
                console.log('clientWidth:', clientWidth);
                console.log('scale:', scale);
                console.log('zoom:', zoom);
                console.log('actualScale (finalScale):', actualScale);
                console.log('canvasOffsetLeft:', canvasOffsetLeft);
                console.log('slide width:', width);
                console.log('slide height:', height);
                
                // Calculate the center of the viewport relative to the canvas left edge
                const viewportCenterRelativeToCanvas = scrollLeft + clientWidth / 2 - canvasOffsetLeft;
                
                console.log('viewportCenterRelativeToCanvas (DOM pixels):', viewportCenterRelativeToCanvas);
                
                // Convert to canvas coordinates by dividing by scale
                const viewportCenterX = viewportCenterRelativeToCanvas / actualScale;
                
                console.log('viewportCenterX (canvas coords):', viewportCenterX);
                
                // Determine which slide the viewport center is on
                const currentSlide = Math.floor(viewportCenterX / width);
                
                console.log('Detected slide index:', currentSlide, '(slide', currentSlide + 1, ')');
                
                // Calculate the exact center of that slide
                const slideCenterX = currentSlide * width + width / 2;
                const slideCenterY = height / 2;
                
                console.log('Slide center X:', slideCenterX, 'Y:', slideCenterY);
                
                // Center the image at the slide center
                leftPosition = slideCenterX - (img.width! * scale) / 2;
                topPosition = slideCenterY - (img.height! * scale) / 2;
                
                console.log('Final image position X:', leftPosition, 'Y:', topPosition);
                console.log('===================');
              } else if (scrollContainer && !isCarouselMode) {
                // For non-carousel mode, use viewport center
                const scrollLeft = scrollContainer.scrollLeft;
                const scrollTop = scrollContainer.scrollTop;
                
                // Get the actual scale applied to the canvas
                const actualScale = scale * zoom;
                
                const viewportCenterX = (scrollLeft + scrollContainer.clientWidth / 2) / actualScale;
                const viewportCenterY = (scrollTop + scrollContainer.clientHeight / 2) / actualScale;
                
                leftPosition = viewportCenterX - (img.width! * scale) / 2;
                topPosition = viewportCenterY - (img.height! * scale) / 2;
                
                console.log(`Pasting at viewport center: (${leftPosition}, ${topPosition})`);
              } else {
                console.log('No scroll container, using default center position');
              }
              
              // Set the image position
              img.set({
                left: leftPosition,
                top: topPosition,
                selectable: true,
                evented: true,
                objectCaching: true,
                statefullCache: true,
                noScaleCache: false,
                strokeUniform: true,
                perPixelTargetFind: false
              });
              
              // Initialize empty filters array
              img.filters = [];
              
              // Assign unique ID to track this image
              (img as any).__imageId = `img-${Date.now()}-${Math.random()}`;
              
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              
            console.log('Pasted NEW image from system clipboard');
          }
        }, { crossOrigin: 'anonymous' });
      };
      
      reader.readAsDataURL(systemImageBlob);
    } else if (clipboardRef.current.length > 0) {
      // No new system image, but we have internal clipboard items
      console.log('No new system image - pasting internal canvas objects');
      e.preventDefault();
      pasteObjects();
    } else {
      // Nothing to paste
      console.log('Nothing to paste - no new system image and no internal objects');
    }
  }, [pasteObjects, width, height, isCarouselMode, zoom]);

  // Zoom in/out at cursor position - smooth and fast
  const handleZoomWithFocus = useCallback((direction: 'in' | 'out' | 'reset') => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let newZoom: number;
    if (direction === 'reset') {
      newZoom = 1;
    } else {
      const zoomStep = 0.25; // Faster zoom step
      newZoom = direction === 'in' 
        ? Math.min(currentZoom + zoomStep, 5) // Increased max zoom to 5x
        : Math.max(currentZoom - zoomStep, 0.1);
    }

    if (newZoom === currentZoom) return;

    // Get the container bounds
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // Use cursor position, or fallback to center if cursor not tracked
    let mouseX = mousePositionRef.current.x - containerRect.left;
    let mouseY = mousePositionRef.current.y - containerRect.top;
    
    // If mouse position is invalid (0,0 or outside viewport), use viewport center
    if (mouseX <= 0 || mouseY <= 0 || 
        mouseX >= scrollContainer.clientWidth || 
        mouseY >= scrollContainer.clientHeight) {
      mouseX = scrollContainer.clientWidth / 2;
      mouseY = scrollContainer.clientHeight / 2;
    }
    
    // Calculate the point in the scroll container that's under the cursor
    const scrollX = scrollContainer.scrollLeft + mouseX;
    const scrollY = scrollContainer.scrollTop + mouseY;
    
    // Calculate the point in the canvas coordinate system
    const canvasX = scrollX / currentZoom;
    const canvasY = scrollY / currentZoom;
    
    // Apply new zoom
    setCurrentZoom(newZoom);
    setScale(newZoom);

    // Calculate new scroll position to keep the same canvas point under the cursor
    requestAnimationFrame(() => {
      const newScrollLeft = canvasX * newZoom - mouseX;
      const newScrollTop = canvasY * newZoom - mouseY;
      
      scrollContainer.scrollLeft = newScrollLeft;
      scrollContainer.scrollTop = newScrollTop;
    });
  }, [currentZoom]);

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
    
    // Temporarily disable caching during filter application for accurate results
    const originalCaching = img.objectCaching;
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
    
    // Re-enable caching for better performance after filters are applied
    img.objectCaching = originalCaching;
    img.dirty = true;
    
    // Force complete re-render
    requestAnimationFrame(() => {
      fabricCanvasRef.current?.requestRenderAll();
    });
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearAll: clearAllObjects,
    discardActiveObject: () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.discardActiveObject();
        fabricCanvasRef.current.requestRenderAll();
      }
    },
    applyFilters: applyFilters,
    getFabricCanvas: () => fabricCanvasRef.current,
    copy: copyObjects,
    cut: cutObjects,
    paste: pasteObjects,
    undo: handleUndo,
    redo: handleRedo
  }), [clearAllObjects, applyFilters, copyObjects, cutObjects, pasteObjects, handleUndo, handleRedo]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: false, // Disable for better performance with large canvas
        renderOnAddRemove: false, // Manual render for better performance
        stateful: true, // Enable stateful canvas for better performance
        skipOffscreen: true // Skip rendering objects outside viewport
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

      // Save initial state for undo/redo
      saveState();

      // Track current selected image ID
      let currentImageId: string | null = null;
      let renderTimeout: NodeJS.Timeout | null = null;

      // Throttled render function for better performance with large canvases
      const throttledRender = () => {
        if (renderTimeout) return;
        renderTimeout = setTimeout(() => {
          canvas.requestRenderAll();
          renderTimeout = null;
        }, 16); // ~60fps
      };

      // Optimize rendering during object movement - use throttled render
      canvas.on('object:moving', () => {
        throttledRender();
      });

      canvas.on('object:scaling', () => {
        throttledRender();
      });

      canvas.on('object:rotating', () => {
        throttledRender();
      });

      // Render immediately when movement stops
      canvas.on('object:modified', () => {
        if (renderTimeout) {
          clearTimeout(renderTimeout);
          renderTimeout = null;
        }
        canvas.requestRenderAll();
        // Save state after modification for undo/redo
        saveState();
      });

      // Save state when objects are added
      canvas.on('object:added', () => {
        saveState();
      });

      // Save state when objects are removed
      canvas.on('object:removed', () => {
        saveState();
      });

      // Add event listeners
      canvas.on('selection:created', (e) => {
        const activeObjects = canvas.getActiveObjects();
        setSelectedObjects(activeObjects);
        setShowDeleteButton(activeObjects.length > 0);
        
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
      });

      canvas.on('selection:updated', (e) => {
        const activeObjects = canvas.getActiveObjects();
        setSelectedObjects(activeObjects);
        setShowDeleteButton(activeObjects.length > 0);
        
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
      });

      canvas.on('selection:cleared', () => {
        setSelectedObjects([]);
        setShowDeleteButton(false);
        currentImageId = null;
        if (onSelectionChange) {
          onSelectionChange(false, undefined);
        }
      });

      // Handle keyboard events
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Check if user is editing text - if so, don't delete the object
          const activeObject = canvas.getActiveObject();
          if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
            const textObject = activeObject as any;
            if (textObject.isEditing) {
              // User is editing text, let them delete characters normally
              return;
            }
          }
          // Not editing text, so delete the selected object
          deleteSelectedObjects();
        } else if (e.key === '[') {
          // Send backward
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.sendBackwards(activeObject);
            canvas.requestRenderAll();
          }
        } else if (e.key === ']') {
          // Bring forward
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.bringForward(activeObject);
            canvas.requestRenderAll();
          }
        } else if (e.key === '{' && e.shiftKey) {
          // Send to back (Shift + [)
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.sendToBack(activeObject);
            canvas.requestRenderAll();
          }
        } else if (e.key === '}' && e.shiftKey) {
          // Bring to front (Shift + ])
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.bringToFront(activeObject);
            canvas.requestRenderAll();
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
  }, [saveState]);

  // Update canvas size when props change
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({
        width: containerWidth,
        height: height
      });
    }
  }, [containerWidth, height]);

  // Calculate scale to fit canvas in the container and center it
  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current && scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const containerHeight = scrollContainer.clientHeight;
        const containerWidth = scrollContainer.clientWidth;
        
        // Leave some padding (e.g., 200px total for UI elements and breathing room)
        const availableHeight = containerHeight - 200;
        const availableWidth = containerWidth - 200;
        
        // Calculate scale to fit both width and height
        const scaleByHeight = availableHeight / height;
        const scaleByWidth = availableWidth / containerWidth;
        const calculatedScale = Math.min(scaleByHeight, scaleByWidth, 1);
        
        setScale(calculatedScale);
        setCurrentZoom(calculatedScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [height, containerWidth]);

  // Center canvas in viewport on initial load (but not when slides are added/removed)
  const hasInitiallyRendered = useRef(false);
  
  useEffect(() => {
    // Only center on first render, not when carousel slides change
    if (hasInitiallyRendered.current && carouselSlides > 1) {
      return; // Don't re-center if we've already rendered and user is working with carousel
    }
    
    const centerCanvas = () => {
      if (scrollContainerRef.current && containerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        
        // Wait for next frame to ensure DOM is updated
        requestAnimationFrame(() => {
          // Calculate center position
          const scrollWidth = scrollContainer.scrollWidth;
          const scrollHeight = scrollContainer.scrollHeight;
          const clientWidth = scrollContainer.clientWidth;
          const clientHeight = scrollContainer.clientHeight;
          
          const centerX = (scrollWidth - clientWidth) / 2;
          const centerY = (scrollHeight - clientHeight) / 2;
          
          // Scroll to center
          scrollContainer.scrollTo({
            left: Math.max(0, centerX),
            top: Math.max(0, centerY),
            behavior: hasInitiallyRendered.current ? 'auto' : 'smooth'
          });
          
          hasInitiallyRendered.current = true;
        });
      }
    };

    // Center after a short delay to ensure scale is applied
    const timer = setTimeout(centerCanvas, 100);
    return () => clearTimeout(timer);
  }, [scale, containerWidth, height, carouselSlides]);

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
            evented: true,
            objectCaching: true, // Enable caching for better performance
            statefullCache: true,
            noScaleCache: false,
            strokeUniform: true,
            perPixelTargetFind: false // Faster hit detection
          });

          fabricCanvasRef.current.add(svg);
          fabricCanvasRef.current.setActiveObject(svg);
          fabricCanvasRef.current.requestRenderAll();
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
              objectCaching: true, // Enable caching for better performance
              statefullCache: true, // Enable stateful caching
              noScaleCache: false,
              strokeUniform: true,
              perPixelTargetFind: false // Faster hit detection on large canvases
            });

            // Initialize empty filters array
            img.filters = [];
            
            // Assign unique ID to track this image
            (img as any).__imageId = `img-${Date.now()}-${Math.random()}`;

            fabricCanvasRef.current!.add(img);
            fabricCanvasRef.current!.setActiveObject(img);
            
            // Render with requestAnimationFrame for smooth performance
            requestAnimationFrame(() => {
              fabricCanvasRef.current!.requestRenderAll();
            });
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
    fabricCanvasRef.current.requestRenderAll();
  }, [width, height]);

  const deleteSelectedObjects = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        fabricCanvasRef.current!.remove(obj);
      });
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.requestRenderAll();
      setSelectedObjects([]);
      setShowDeleteButton(false);
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
    fabricCanvasRef.current.requestRenderAll();

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
        fabricCanvasRef.current.requestRenderAll();
        
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
    
    fabricCanvasRef.current.requestRenderAll();
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

  // Handle space bar for panning (Figma-style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !isPanning) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // Copy, Cut, Paste shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        // Check if user is editing text in canvas
        const canvas = fabricCanvasRef.current;
        const activeObject = canvas?.getActiveObject();
        const isEditingText = activeObject && 
                              (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text') &&
                              (activeObject as any).isEditing;
        
        if (e.code === 'KeyC') {
          // Cmd/Ctrl + C (copy)
          if (!isEditingText) {
            e.preventDefault();
            copyObjects();
          }
          // If editing text, allow normal browser copy behavior
        } else if (e.code === 'KeyX') {
          // Cmd/Ctrl + X (cut)
          if (!isEditingText) {
            e.preventDefault();
            cutObjects();
          }
          // If editing text, allow normal browser cut behavior
        } else if (e.code === 'KeyV') {
          // Cmd/Ctrl + V (paste) - handled by paste event listener
          // Don't prevent default to allow system clipboard paste
        } else if (e.code === 'KeyS') {
          // Cmd/Ctrl + S (save project)
          e.preventDefault();
          if (onSaveProject) {
            onSaveProject();
          }
        } else if (e.code === 'KeyO') {
          // Cmd/Ctrl + O (open project)
          e.preventDefault();
          if (onOpenProject) {
            onOpenProject();
          }
        } else if (e.code === 'KeyZ') {
          // Cmd/Ctrl + Z (undo)
          e.preventDefault();
          handleUndo();
        } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
          // Cmd/Ctrl + 0 (reset zoom)
          e.preventDefault();
          handleZoomWithFocus('reset');
        }
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        // Cmd/Ctrl + Shift combinations
        if (e.code === 'KeyZ') {
          // Cmd/Ctrl + Shift + Z (redo)
          e.preventDefault();
          handleRedo();
        }
      }
      
      // Zoom shortcuts: + and - keys (no modifier needed)
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '+') {
          // + key (zoom in at cursor)
          e.preventDefault();
          handleZoomWithFocus('in');
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-') {
          // - key (zoom out at cursor)
          e.preventDefault();
          handleZoomWithFocus('out');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Don't paste if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      pasteFromSystemClipboard(e);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('paste', handlePaste as EventListener);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [isPanning, handleZoomWithFocus, copyObjects, cutObjects, pasteFromSystemClipboard, onSaveProject, onOpenProject, handleUndo, handleRedo]);

  // Handle mouse panning
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleMouseDown = (e: MouseEvent) => {
      if ((isSpacePressed || e.button === 1) && scrollContainer) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollContainer.scrollLeft,
          scrollTop: scrollContainer.scrollTop
        };
        scrollContainer.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Track mouse position for cursor-based zooming (always update)
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      
      if (isPanning && panStartRef.current && scrollContainer) {
        e.preventDefault();
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        
        scrollContainer.scrollLeft = panStartRef.current.scrollLeft - deltaX;
        scrollContainer.scrollTop = panStartRef.current.scrollTop - deltaY;
      }
    };

    // Also track mouse position when moving over the scroll container
    const handleContainerMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        panStartRef.current = null;
        if (scrollContainer) {
          scrollContainer.style.cursor = isSpacePressed ? 'grab' : 'default';
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Calculate zoom change - smoother and faster
        const delta = e.deltaY * -0.002; // Increased sensitivity for faster zoom
        const newZoom = Math.max(0.1, Math.min(5, currentZoom + delta)); // Max zoom 5x
        
        if (newZoom === currentZoom) return;
        
        // Get mouse position relative to the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        // Always zoom at cursor position
        const scrollX = scrollContainer.scrollLeft + mouseX;
        const scrollY = scrollContainer.scrollTop + mouseY;
        
        // Calculate the point in canvas coordinates
        const canvasX = scrollX / currentZoom;
        const canvasY = scrollY / currentZoom;
        
        // Apply new zoom
        setScale(newZoom);
        setCurrentZoom(newZoom);
        
        // Calculate new scroll position to keep the same point under cursor
        requestAnimationFrame(() => {
          const newScrollLeft = canvasX * newZoom - mouseX;
          const newScrollTop = canvasY * newZoom - mouseY;
          
          scrollContainer.scrollLeft = newScrollLeft;
          scrollContainer.scrollTop = newScrollTop;
        });
      }
    };

    scrollContainer.addEventListener('mousedown', handleMouseDown);
    scrollContainer.addEventListener('mousemove', handleContainerMouseMove);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('mousedown', handleMouseDown);
      scrollContainer.removeEventListener('mousemove', handleContainerMouseMove);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, [isPanning, isSpacePressed, currentZoom]);

  // Center canvas on initial load
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const container = containerRef.current;
    if (!scrollContainer || !container) return;

    // Wait for layout to complete
    const centerCanvas = () => {
      const scrollWidth = scrollContainer.scrollWidth;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientWidth = scrollContainer.clientWidth;
      const clientHeight = scrollContainer.clientHeight;

      // Calculate center position
      const scrollLeft = (scrollWidth - clientWidth) / 2;
      const scrollTop = (scrollHeight - clientHeight) / 2;

      // Center the canvas
      scrollContainer.scrollLeft = scrollLeft;
      scrollContainer.scrollTop = scrollTop;
    };

    // Center after a brief delay to ensure everything is rendered
    const timer = setTimeout(centerCanvas, 100);
    
    return () => clearTimeout(timer);
  }, [containerWidth, height]); // Re-center when canvas size changes

  return (
    <div 
      ref={scrollContainerRef}
      className="w-full h-full overflow-auto bg-gray-900 relative"
      style={{
        cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default',
        scrollbarWidth: 'thin' // Make scrollbars visible but thin
      }}
    >
      <div
        ref={containerRef}
        className="flex items-center justify-center p-20"
        style={{
          transform: `scale(${finalScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
          minWidth: `${containerWidth * finalScale + 320}px`, // Ensure container is wide enough
          minHeight: `${height * finalScale + 320}px`, // Ensure container is tall enough
          width: 'max-content', // Allow container to grow with content
          height: 'max-content'
        }}
      >
        <div
          ref={drop}
          className={`
            relative border-2 border-dashed rounded-lg transition-all duration-200 inline-block
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
      {isCarouselMode && showGuidelines && (
        <>
          {Array.from({ length: carouselSlides - 1 }).map((_, index) => (
            <div 
              key={`separator-${index}`}
              className="absolute top-0 bottom-0 border-r-2 border-dashed border-cta-blue pointer-events-none"
              style={{ 
                left: `${width * (index + 1)}px`,
                opacity: 0.5
              }}
            />
          ))}
        </>
      )}

        </div>
      </div>
      
      {/* Zoom Controls Panel - Bottom Left (Sticky) */}
      <div className="fixed bottom-6 right-6 bg-black bg-opacity-90 backdrop-blur-sm text-white rounded-full z-50 flex items-center gap-2 px-4 py-2 shadow-xl border border-gray-700">
        {/* Eye Icon - Toggle Guidelines */}
        {isCarouselMode && (
          <>
            <button
              onClick={() => setShowGuidelines(!showGuidelines)}
              className={`p-1.5 hover:bg-gray-700 rounded-full transition-colors ${!showGuidelines ? 'text-gray-500' : ''}`}
              title={showGuidelines ? "Hide Guidelines" : "Show Guidelines"}
            >
              {showGuidelines ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
              )}
            </button>
            <div className="w-px h-6 bg-gray-600"></div>
          </>
        )}
        
        {/* Zoom Out */}
        <button
          onClick={() => handleZoomWithFocus('out')}
          className={`p-1.5 rounded-full transition-colors ${
            currentZoom <= 0.1 
              ? 'text-gray-600 cursor-not-allowed' 
              : 'hover:bg-gray-700'
          }`}
          title="Zoom Out ( - )"
          disabled={currentZoom <= 0.1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        
        {/* Zoom Percentage */}
        <button
          onClick={() => handleZoomWithFocus('reset')}
          className="px-3 py-1 hover:bg-gray-700 rounded-full transition-colors text-xs font-semibold min-w-[3.5rem] text-center"
          title="Reset Zoom (Cmd/Ctrl + 0)"
        >
          {Math.round(currentZoom * 100)}%
        </button>
        
        {/* Zoom In */}
        <button
          onClick={() => handleZoomWithFocus('in')}
          className={`p-1.5 rounded-full transition-colors ${
            currentZoom >= 5 
              ? 'text-gray-600 cursor-not-allowed' 
              : 'hover:bg-gray-700'
          }`}
          title="Zoom In ( + )"
          disabled={currentZoom >= 5}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
