import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { fabric } from 'fabric';
import { ChevronLeft, ChevronRight, Plus, Trash2, Eye, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MediaItem } from '../types';

interface CarouselCanvasProps {
  width: number;
  height: number;
  mediaItems: MediaItem[];
  selectedMedia: string | null;
  activeTool: string;
}

interface CarouselSlide {
  id: string;
  canvas: fabric.Canvas;
  objects: fabric.Object[];
  thumbnail: string;
}

const CarouselCanvas: React.FC<CarouselCanvasProps> = ({
  width,
  height,
  mediaItems,
  selectedMedia,
  activeTool
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [zoom, setZoom] = useState(0.7); // 70% default zoom

  const updateSlideThumbnail = useCallback((slideId: string) => {
    setSlides(prev => {
      const slide = prev.find(s => s.id === slideId);
      if (slide) {
        const thumbnail = slide.canvas.toDataURL({
          format: 'png',
          quality: 0.3,
          multiplier: 0.2
        });
        
        return prev.map(s => 
          s.id === slideId ? { ...s, thumbnail } : s
        );
      }
      return prev;
    });
  }, []);

  const addNewSlide = useCallback(() => {
    const slideId = `slide-${Date.now()}`;
    const canvasElement = document.createElement('canvas');
    canvasElement.width = width;
    canvasElement.height = height;
    
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true
    });

    // Add event listeners for this slide
    fabricCanvas.on('object:added', () => {
      updateSlideThumbnail(slideId);
    });

    fabricCanvas.on('object:removed', () => {
      updateSlideThumbnail(slideId);
    });

    fabricCanvas.on('object:modified', () => {
      updateSlideThumbnail(slideId);
    });

    const newSlide: CarouselSlide = {
      id: slideId,
      canvas: fabricCanvas,
      objects: [],
      thumbnail: ''
    };

    setSlides(prev => {
      const newSlides = [...prev, newSlide];
      if (prev.length === 0) {
        setCurrentSlide(0);
      } else {
        setCurrentSlide(newSlides.length - 1);
      }
      return newSlides;
    });
  }, [width, height, updateSlideThumbnail]);

  // Initialize first slide
  useEffect(() => {
    if (slides.length === 0) {
      addNewSlide();
    }
  }, [addNewSlide]);

  const deleteSlide = useCallback((slideId: string) => {
    setSlides(prev => {
      const newSlides = prev.filter(s => s.id !== slideId);
      if (newSlides.length === 0) {
        addNewSlide();
        return [newSlides[0] || createEmptySlide()];
      }
      setCurrentSlide(prev => Math.max(0, prev - 1));
      return newSlides;
    });
  }, []);

  const createEmptySlide = useCallback(() => {
    const slideId = `slide-${Date.now()}`;
    const canvasElement = document.createElement('canvas');
    canvasElement.width = width;
    canvasElement.height = height;
    
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true
    });

    return {
      id: slideId,
      canvas: fabricCanvas,
      objects: [],
      thumbnail: ''
    };
  }, [width, height]);

  const addImageToCurrentSlide = useCallback((mediaItem: MediaItem) => {
    if (slides.length === 0) return;
    
    const currentSlideData = slides[currentSlide];
    if (!currentSlideData) return;

    fabric.Image.fromURL(mediaItem.url, (img) => {
      if (img && currentSlideData.canvas) {
        // Scale image to fit canvas while maintaining aspect ratio
        const maxWidth = width * 0.8;
        const maxHeight = height * 0.8;
        
        const scaleX = maxWidth / img.width!;
        const scaleY = maxHeight / img.height!;
        const scale = Math.min(scaleX, scaleY, 1);
        
        img.scale(scale);
        img.set({
          left: (width - img.width! * scale) / 2,
          top: (height - img.height! * scale) / 2,
          selectable: true,
          evented: true
        });

        currentSlideData.canvas.add(img);
        currentSlideData.canvas.setActiveObject(img);
        currentSlideData.canvas.renderAll();
        updateSlideThumbnail(currentSlideData.id);
      }
    });
  }, [slides, currentSlide, width, height, updateSlideThumbnail]);

  // Add selected media to current slide
  useEffect(() => {
    if (selectedMedia && slides.length > 0) {
      const mediaItem = mediaItems.find(m => m.id === selectedMedia);
      if (mediaItem) {
        addImageToCurrentSlide(mediaItem);
      }
    }
  }, [selectedMedia, mediaItems, addImageToCurrentSlide]);

  // Recalculate canvas offsets when zoom changes
  useEffect(() => {
    slides.forEach(slide => {
      if (slide.canvas) {
        slide.canvas.calcOffset();
      }
    });
  }, [zoom, slides]);

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2)); // Max 200%
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.3)); // Min 30%
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(0.7); // Reset to 70%
  }, []);

  const exportCarousel = useCallback(() => {
    if (slides.length === 0) return;
    
    slides.forEach((slide, index) => {
      const dataURL = slide.canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `carousel-slide-${index + 1}.png`;
      link.href = dataURL;
      link.click();
    });
  }, [slides]);

  const [{ isOver }, drop] = useDrop({
    accept: 'media',
    drop: (item: { mediaId: string }) => {
      const mediaItem = mediaItems.find(m => m.id === item.mediaId);
      if (mediaItem && slides.length > 0) {
        addImageToCurrentSlide(mediaItem);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing carousel...</p>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];
  
  if (!currentSlideData || !currentSlideData.canvas) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading slide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Top Controls */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Carousel Slides</h3>
          <button
            onClick={addNewSlide}
            className="bg-cta-blue hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
            title="Add New Slide"
          >
            <Plus size={16} />
          </button>
          <span className="text-sm text-gray-400">
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={slides.length <= 1}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-sm font-medium px-2">
            {currentSlide + 1} / {slides.length}
          </span>
          
          <button
            onClick={nextSlide}
            disabled={slides.length <= 1}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Slide"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={exportCarousel}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            title="Export All Slides"
          >
            <Download size={16} />
            Export All
          </button>

          <div className="w-px h-8 bg-gray-600 mx-2"></div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium px-2 min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Reset Zoom (70%)"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Row Layout with Hidden Scroll */}
      <div
        ref={drop}
        className={`
          carousel-container flex-1 flex items-center gap-6 p-6 overflow-x-auto overflow-y-hidden bg-gray-900
          ${isOver ? 'bg-blue-50' : ''}
        `}
        style={{ 
          height: 'calc(100vh - 16rem)',
          maxHeight: 'calc(100vh - 16rem)'
        }}
      >
        
        {slides.map((slide, index) => {
          const displayWidth = width * zoom;
          const displayHeight = height * zoom;
          
          return (
          <div
            key={`${slide.id}-${zoom}`}
            className={`
              flex-shrink-0 transition-all duration-200
              ${currentSlide === index ? 'ring-4 ring-cta-blue rounded-lg' : ''}
            `}
          >
            {/* Slide Label */}
            <div className="mb-3 text-center">
              <h4 className="text-lg font-medium text-white">
                carousel {index + 1}
              </h4>
            </div>

            {/* Canvas Container */}
            <div
              onClick={() => setCurrentSlide(index)}
              className={`
                relative border-2 border-dashed rounded-lg transition-all duration-200 bg-gray-800
                ${currentSlide === index 
                  ? 'border-cta-blue bg-blue-50' 
                  : 'border-gray-600 hover:border-gray-500'
                }
              `}
              style={{ 
                width: `${displayWidth}px`, 
                height: `${displayHeight}px`,
                maxWidth: '90vw',
                maxHeight: '70vh'
              }}
            >
              <div
                key={`canvas-${slide.id}-${zoom}`}
                ref={(el) => {
                  if (el && slide && slide.canvas) {
                    // Only append if not already a child
                    const canvasElement = slide.canvas.getElement();
                    if (canvasElement && canvasElement.parentElement !== el) {
                      el.innerHTML = '';
                      // Apply zoom scale to canvas
                      canvasElement.style.transform = `scale(${zoom})`;
                      canvasElement.style.transformOrigin = 'top left';
                      canvasElement.style.pointerEvents = 'auto';
                      canvasElement.style.cursor = 'move';
                      canvasElement.style.touchAction = 'none';
                      el.appendChild(canvasElement);
                      
                      // Ensure canvas is properly sized and interactive
                      slide.canvas.calcOffset();
                    }
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(index);
                }}
                className="rounded-lg shadow-lg"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  pointerEvents: 'auto',
                  position: 'relative'
                }}
              />
              
              {/* Slide Controls */}
              <div className="absolute top-2 right-2 flex gap-2">
                {/* Delete Button */}
                {slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(slide.id);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                    title="Delete Slide"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Export Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const dataURL = slide.canvas.toDataURL({
                      format: 'png',
                      quality: 1,
                      multiplier: 1
                    });
                    const link = document.createElement('a');
                    link.download = `carousel-slide-${index + 1}.png`;
                    link.href = dataURL;
                    link.click();
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded transition-colors"
                  title="Export This Slide"
                >
                  <Download size={14} />
                </button>
              </div>

              {/* Canvas Info */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {width} × {height} ({Math.round(zoom * 100)}%)
              </div>
            </div>
          </div>
        );
        })}

        {/* Add New Slide Button */}
        <div className="flex-shrink-0">
          <button
            onClick={addNewSlide}
            className="w-48 h-48 border-2 border-dashed border-gray-600 hover:border-cta-blue rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-cta-blue transition-colors"
            title="Add New Slide"
          >
            <Plus size={32} />
            <span className="text-sm mt-2">Add New Carousel Slide</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarouselCanvas;
