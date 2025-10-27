import React, { useState, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ZoomIn, ZoomOut, Maximize2, Trash2, Eye, EyeOff } from 'lucide-react';
import MediaPanel from './components/MediaPanel';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SizePresets from './components/SizePresets';
import ExportModal from './components/ExportModal';
import FilterControls, { ImageFilters } from './components/FilterControls';
import { MediaItem } from './types';
import logo from './assets/logow.png';

const App: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
  const [activeTool, setActiveTool] = useState<string>('select');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showSeparatorLine, setShowSeparatorLine] = useState(true);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [selectionKey, setSelectionKey] = useState(0); // Track selection changes
  const [currentImageId, setCurrentImageId] = useState<string | null>(null); // Track current image
  const [imageFilters, setImageFilters] = useState<Record<string, ImageFilters>>({}); // Store filters per image
  const canvasRef = useRef<any>(null);

  const handleMediaAdd = useCallback((files: File[]) => {
    const newMediaItems: MediaItem[] = files.map((file, index) => ({
      id: `media-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      file,
      url: URL.createObjectURL(file),
      thumbnail: URL.createObjectURL(file)
    }));
    
    setMediaItems(prev => [...prev, ...newMediaItems]);
  }, []);

  const handleMediaSelect = useCallback((mediaId: string) => {
    setSelectedMedia(mediaId);
  }, []);

  const handleMediaRemove = useCallback((mediaId: string) => {
    // Remove from media items
    setMediaItems(prev => prev.filter(item => item.id !== mediaId));
    
    // Clear selection if the removed item was selected
    if (selectedMedia === mediaId) {
      setSelectedMedia(null);
    }
    
    // Clean up the object URL to prevent memory leaks
    const item = mediaItems.find(m => m.id === mediaId);
    if (item && item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
  }, [selectedMedia, mediaItems]);

  const handleSizeChange = useCallback((width: number, height: number) => {
    setCanvasSize({ width, height });
  }, []);

  const handleQuickExport = useCallback(() => {
    // Deselect all objects before export
    if (canvasRef.current && canvasRef.current.discardActiveObject) {
      canvasRef.current.discardActiveObject();
    }
    
    // Quick export as PNG
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `instagram-design-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  }, []);

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    if (tool === 'export') {
      setShowExportModal(true);
    } else if (tool === 'carousel') {
      setIsCarouselMode(true);
    } else if (tool === 'save') {
      // Trigger save/download
      handleQuickExport();
    } else if (tool === 'undo') {
      // Trigger undo
      if (canvasRef.current && canvasRef.current.undo) {
        canvasRef.current.undo();
      }
    } else if (tool === 'redo') {
      // Trigger redo
      if (canvasRef.current && canvasRef.current.redo) {
        canvasRef.current.redo();
      }
    }
    // Don't change carousel mode for other tools like select, move, text, etc.
  }, [handleQuickExport]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all objects from the canvas?')) {
      // This will be handled by the Canvas component via ref
      if (canvasRef.current && canvasRef.current.clearAll) {
        canvasRef.current.clearAll();
      }
    }
  }, []);

  const handleFilterChange = useCallback((filters: ImageFilters) => {
    if (canvasRef.current && canvasRef.current.applyFilters) {
      canvasRef.current.applyFilters(filters);
    }
    
    // Store filters for current image
    if (currentImageId) {
      setImageFilters(prev => ({
        ...prev,
        [currentImageId]: filters
      }));
    }
  }, [currentImageId]);

  const handleExport = useCallback(async (format: string, quality: number, size: { width: number; height: number }) => {
    console.log('Exporting:', { format, quality, size, isCarouselMode, carouselSlides });
    
    // Deselect all objects before export (via canvas ref)
    if (canvasRef.current && canvasRef.current.discardActiveObject) {
      canvasRef.current.discardActiveObject();
    }
    
    // Small delay to ensure deselection is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the Fabric canvas
    const fabricCanvas = canvasRef.current?.getFabricCanvas?.();
    if (!fabricCanvas) {
      alert('Canvas not ready for export');
      return;
    }

    console.log('Canvas dimensions:', fabricCanvas.width, 'x', fabricCanvas.height);
    console.log('Canvas size state:', canvasSize.width, 'x', canvasSize.height);
    console.log('Carousel slides:', carouselSlides);

    try {
      // Determine the file extension based on format
      let extension = 'png';
      
      switch (format) {
        case 'jpg':
          extension = 'jpg';
          break;
        case 'webp':
          extension = 'webp';
          break;
        case 'png':
        default:
          extension = 'png';
          break;
      }

      // Check if we're in carousel mode
      if (isCarouselMode && carouselSlides > 1) {
        // Export as multiple separate images using Fabric.js
        console.log('Exporting carousel - Canvas actual size:', fabricCanvas.width, 'x', fabricCanvas.height);
        console.log('Expected total width:', canvasSize.width * carouselSlides);
        
        const slideWidth = canvasSize.width;
        const slideHeight = canvasSize.height;

        // Export each slide
        for (let i = 0; i < carouselSlides; i++) {
          const left = slideWidth * i;
          
          console.log(`Exporting slide ${i + 1}: left=${left}, width=${slideWidth}, height=${slideHeight}`);
          
          // Use Fabric.js toDataURL with cropping
          const dataURL = fabricCanvas.toDataURL({
            format: format === 'jpg' ? 'jpeg' : format,
            quality: quality,
            left: left,
            top: 0,
            width: slideWidth,
            height: slideHeight,
            multiplier: 1
          });
          
          const link = document.createElement('a');
          link.download = `carousel-slide-${i + 1}-${Date.now()}.${extension}`;
          link.href = dataURL;
          link.click();

          // Small delay between downloads
          if (i < carouselSlides - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        console.log(`Carousel export successful - ${carouselSlides} slides exported`);
        alert(`Exported ${carouselSlides} carousel slides successfully!`);
      } else {
        // Normal single export using Fabric.js
        const dataURL = fabricCanvas.toDataURL({
          format: format === 'jpg' ? 'jpeg' : format,
          quality: quality,
          multiplier: 1
        });
        const link = document.createElement('a');
        link.download = `FrameFlow-export-${Date.now()}.${extension}`;
        link.href = dataURL;
        link.click();
        
        console.log('Export successful');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [isCarouselMode, canvasSize, carouselSlides]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-800 text-white">
        {/* Media Panel - Top Left */}
        <div className="w-80 panel flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <img src={logo} alt="FrameFlow Logo" className="h-8 w-8" />
              FrameFlow
            </h2>
              <MediaPanel
                mediaItems={mediaItems}
                selectedMedia={selectedMedia}
                onMediaAdd={handleMediaAdd}
                onMediaSelect={handleMediaSelect}
                onMediaRemove={handleMediaRemove}
              />
          </div>
          
          {/* Size Presets */}
          <div className="p-4 border-b border-gray-700 overflow-y-scroll h-52">
            <h3 className="text-lg font-semibold mb-4">Canvas Size</h3>
            <SizePresets
              currentSize={canvasSize}
              onSizeChange={handleSizeChange}
            />
          </div>

          {/* Filter Controls */}
          <div className="p-4 border-b border-gray-700 overflow-y-auto flex-1">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <FilterControls
              onFilterChange={handleFilterChange}
              hasSelectedImage={hasSelectedImage}
              selectionKey={selectionKey}
              currentFilters={currentImageId ? imageFilters[currentImageId] : undefined}
            />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col max-w-[calc(100vw-20rem)]">
          {/* Toolbar */}
          <div className="h-16 bg-panel-gray border-b border-gray-700 flex items-center px-4 overflow-x-auto">
            <Toolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              carouselSlides={carouselSlides}
              onCarouselSlidesChange={setCarouselSlides}
              isCarouselMode={isCarouselMode}
            />
          </div>

          {/* Canvas */}
          <div 
            className={`flex-1 carousel-container overflow-x-auto flex items-center py-4 relative ${isCarouselMode && carouselSlides > 1 ? 'justify-start' : 'justify-center'}`}
            style={{ 
              paddingLeft: '1rem',
              paddingRight: '1rem'
            }}
          >
            <Canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              mediaItems={mediaItems}
              selectedMedia={selectedMedia}
              activeTool={activeTool}
              isCarouselMode={isCarouselMode}
              carouselSlides={carouselSlides}
              zoom={zoom}
              onZoomChange={setZoom}
              onClearAll={handleClearAll}
              showSeparatorLine={showSeparatorLine}
              onToolChange={handleToolChange}
              onSelectionChange={(hasImage, imageId) => {
                setHasSelectedImage(hasImage);
                
                // Update current image ID
                if (imageId && imageId !== currentImageId) {
                  setCurrentImageId(imageId);
                  // Increment selection key to trigger filter update
                  setSelectionKey(prev => prev + 1);
                } else if (!hasImage) {
                  setCurrentImageId(null);
                }
              }}
            />

            {/* Canvas Info - Bottom Right */}
            <div className="fixed bottom-4 right-8 flex flex-col gap-2 items-end z-50">
              {/* Canvas Dimensions */}
              <div className="bg-black bg-opacity-75 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>
                  {isCarouselMode ? canvasSize.width * carouselSlides : canvasSize.width} × {canvasSize.height}
                  {isCarouselMode && <span className="ml-2 text-cta-blue">(Carousel)</span>}
                </span>
                {isCarouselMode && (
                  <button
                    onClick={() => setShowSeparatorLine(!showSeparatorLine)}
                    className="hover:bg-gray-700 p-1 rounded transition-colors"
                    title={showSeparatorLine ? "Hide separator lines" : "Show separator lines"}
                  >
                    {showSeparatorLine ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                )}
              </div>

              {/* Controls Row */}
              <div className="flex gap-2">
                {/* Clear All Button */}
                <button
                  onClick={handleClearAll}
                  className="bg-panel-gray hover:bg-gray-700 text-white p-2 rounded-lg shadow-lg transition-colors flex items-center gap-1.5"
                  title="Clear All"
                >
                  <Trash2 size={16} />
                  <span className="text-xs">Clear All</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex gap-1 items-center bg-panel-gray rounded-lg p-1 shadow-lg">
                  <button
                    onClick={handleZoomOut}
                    className="hover:bg-gray-700 text-white p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom Out"
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut size={16} />
                  </button>
                  <div className="text-white text-xs font-medium min-w-[45px] text-center">
                    {Math.round(zoom * 100)}%
                  </div>
                  <button
                    onClick={handleZoomIn}
                    className="hover:bg-gray-700 text-white p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom In"
                    disabled={zoom >= 3}
                  >
                    <ZoomIn size={16} />
                  </button>
                  <div className="w-px h-4 bg-gray-600" />
                  <button
                    onClick={handleZoomReset}
                    className="hover:bg-gray-700 text-white p-1.5 rounded transition-colors"
                    title="Reset Zoom (100%)"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ExportModal
          isVisible={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          currentSize={canvasSize}
        />
      </div>
    </DndProvider>
  );
};

export default App;
