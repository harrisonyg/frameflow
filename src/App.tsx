import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { fabric } from 'fabric';
import { ChevronDown, ChevronUp } from 'lucide-react';
import MediaPanel from './components/MediaPanel';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SizePresets from './components/SizePresets';
import ExportModal from './components/ExportModal';
import FilterControls, { ImageFilters } from './components/FilterControls';
import { MediaItem, ProjectData } from './types';
import logo from './assets/logow.png';

const App: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 });
  const [activeTool, setActiveTool] = useState<string>('select');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState(1);
  const [carouselSlideSize, setCarouselSlideSize] = useState({ width: 1080, height: 1080 });
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [selectionKey, setSelectionKey] = useState(0); // Track selection changes
  const [currentImageId, setCurrentImageId] = useState<string | null>(null); // Track current image
  const [imageFilters, setImageFilters] = useState<Record<string, ImageFilters>>({}); // Store filters per image
  const [isSizePanelOpen, setIsSizePanelOpen] = useState(false); // Canvas size panel state
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
    // Also update carousel slide size if in carousel mode
    if (isCarouselMode) {
      setCarouselSlideSize({ width, height });
    }
  }, [isCarouselMode]);

  const handleCarouselSlideSizeChange = useCallback((width: number, height: number) => {
    setCarouselSlideSize({ width, height });
  }, []);

  const handleSaveProject = useCallback(() => {
    // Get canvas state from Fabric.js
    const fabricCanvas = canvasRef.current?.getFabricCanvas?.();
    if (!fabricCanvas) {
      alert('Canvas not ready to save');
      return;
    }

    // Create project data - Fabric.js toJSON includes all objects
    const projectData: ProjectData = {
      version: '3.0', // Version 3.0 for Fabric.js with cursor zoom
      createdAt: new Date().toISOString(),
      canvasSize: canvasSize,
      isCarouselMode: isCarouselMode,
      carouselSlides: carouselSlides,
      carouselSlideSize: carouselSlideSize,
      canvasState: JSON.stringify(fabricCanvas.toJSON(['selectable', 'evented', '__imageId'])),
      imageFilters: imageFilters
    };

    // Convert to JSON and create blob
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Download file
    const link = document.createElement('a');
    link.download = `FrameFlow-project-${Date.now()}.flo`;
    link.href = url;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
    
    alert('Project saved successfully!');
  }, [canvasSize, isCarouselMode, carouselSlides, carouselSlideSize, imageFilters]);

  const handleOpenProject = useCallback(() => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.flo';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Read file
        const text = await file.text();
        const projectData: ProjectData = JSON.parse(text);

        // Validate project data
        if (!projectData.version || !projectData.canvasState) {
          alert('Invalid project file');
          return;
        }

        // Get Fabric.js canvas
        const fabricCanvas = canvasRef.current?.getFabricCanvas?.();
        if (!fabricCanvas) {
          alert('Canvas not ready');
          return;
        }

        // Restore canvas size
        if (projectData.canvasSize) {
          setCanvasSize(projectData.canvasSize);
        }

        // Restore carousel mode
        if (projectData.isCarouselMode !== undefined) {
          setIsCarouselMode(projectData.isCarouselMode);
        }
        if (projectData.carouselSlides !== undefined) {
          setCarouselSlides(projectData.carouselSlides);
        }

        // Restore carousel slide size (use canvasSize as default if not present)
        if (projectData.carouselSlideSize) {
          setCarouselSlideSize(projectData.carouselSlideSize);
        } else if (projectData.canvasSize) {
          setCarouselSlideSize(projectData.canvasSize);
        }

        // Restore filters
        setImageFilters(projectData.imageFilters || {});

        // Load canvas state from JSON
        const canvasState = JSON.parse(projectData.canvasState);
        
        // Clear current canvas
        fabricCanvas.clear();
        
        // Load the saved state
        fabricCanvas.loadFromJSON(canvasState, () => {
          // After loading, restore filters to images
          fabricCanvas.getObjects().forEach((obj: any) => {
            if (obj.type === 'image' && obj.__imageId) {
              const filters = projectData.imageFilters?.[obj.__imageId];
              if (filters) {
                // Re-apply filters if they exist
                canvasRef.current?.applyFilters?.(filters);
              }
            }
          });
          
          fabricCanvas.requestRenderAll();
          console.log('Project loaded successfully');
          // alert('Project loaded successfully!');
        });

      } catch (error) {
        console.error('Failed to open project:', error);
        alert('Failed to open project file. Please make sure it is a valid .flo file.');
      }
    };

    input.click();
  }, []);

  const handleQuickExport = useCallback(() => {
    // Quick export without modal - export as PNG at 100% quality
    const fabricCanvas = canvasRef.current?.getFabricCanvas?.();
    if (fabricCanvas) {
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1
      });
      const link = document.createElement('a');
      link.download = `frameflow-export-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
      console.log('Quick export successful');
    }
  }, []);

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    if (tool === 'export') {
      setShowExportModal(true);
    } else if (tool === 'carousel') {
      // Toggle carousel mode
      setIsCarouselMode(prev => !prev);
    } else if (tool === 'save') {
      // Trigger save/download
      handleQuickExport();
    } else if (tool === 'saveProject') {
      // Save project as .flo file
      handleSaveProject();
    } else if (tool === 'openProject') {
      // Open .flo file
      handleOpenProject();
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
  }, [handleQuickExport, handleSaveProject, handleOpenProject]);


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
    console.log('Exporting:', { format, quality, size });
    
    // Deselect all objects before export
    if (canvasRef.current && canvasRef.current.discardActiveObject) {
      canvasRef.current.discardActiveObject();
    }
    
    // Small delay to ensure deselection is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the Fabric.js canvas
    const fabricCanvas = canvasRef.current?.getFabricCanvas?.();
    if (!fabricCanvas) {
      alert('Canvas not ready for export');
      return;
    }

    console.log('Canvas dimensions:', fabricCanvas.width, 'x', fabricCanvas.height);

    try {
      // Determine the file extension and format
      let extension = 'png';
      let exportFormat: 'png' | 'jpeg' | 'jpg' = 'png';
      
      switch (format) {
        case 'jpg':
          extension = 'jpg';
          exportFormat = 'jpeg';
          break;
        case 'webp':
          extension = 'webp';
          exportFormat = 'png'; // Fabric.js doesn't support webp, fallback to png
          break;
        case 'png':
        default:
          extension = 'png';
          exportFormat = 'png';
          break;
      }

      // Export carousel slides
      if (isCarouselMode && carouselSlides > 1) {
        console.log(`Exporting ${carouselSlides} carousel slides`);
        
        const slideWidth = isCarouselMode ? carouselSlideSize.width : canvasSize.width;
        
        // Export each slide
        for (let i = 0; i < carouselSlides; i++) {
          const slideLeft = i * slideWidth;
          const slideRight = (i + 1) * slideWidth;
          
          console.log(`Exporting slide ${i + 1}: left=${slideLeft}, width=${slideWidth}`);
          
          // Create a temporary canvas for this slide
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = slideWidth;
          tempCanvas.height = fabricCanvas.height || carouselSlideSize.height;
          const tempContext = tempCanvas.getContext('2d');
          
          if (!tempContext) continue;
          
          // Fill with white background
          tempContext.fillStyle = '#ffffff';
          tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Get all objects on this slide
          const objects = fabricCanvas.getObjects();
          objects.forEach((obj: any) => {
            const objLeft = obj.left || 0;
            const objRight = objLeft + (obj.width || 0) * (obj.scaleX || 1);
            
            // Check if object is on this slide
            if (objRight > slideLeft && objLeft < slideRight) {
              // Clone and render this object
              obj.clone((cloned: any) => {
                // Adjust position for this slide
                cloned.set({
                  left: (cloned.left || 0) - slideLeft
                });
                
                // Create temp Fabric canvas
                const tempFabric = new fabric.Canvas(tempCanvas);
                tempFabric.add(cloned);
                tempFabric.renderAll();
                tempFabric.dispose();
              });
            }
          });
          
          // Export the slide
          const dataURL = tempCanvas.toDataURL(
            exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
            quality
          );
          
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
        // Single canvas export using Fabric.js
        const dataURL = fabricCanvas.toDataURL({
          format: exportFormat,
          quality: quality,
          multiplier: 1
        });
        
        const link = document.createElement('a');
        link.download = `frameflow-export-${Date.now()}.${extension}`;
        link.href = dataURL;
        link.click();
        
        console.log('Single canvas export successful');
        alert('Exported successfully!');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    
    setShowExportModal(false);
  }, [isCarouselMode, carouselSlides, carouselSlideSize, canvasSize]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-800 text-white">
        {/* Media Panel - Side Panel */}
        <div className="w-80 panel flex flex-col">
          {/* Logo and Media Panel */}
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
          
          {/* Canvas Size - Collapsible Dropdown */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => setIsSizePanelOpen(!isSizePanelOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Canvas Size</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {canvasSize.width} × {canvasSize.height}
                </span>
              </div>
              <div className={`transition-transform duration-200 ${isSizePanelOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </div>
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isSizePanelOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: '24rem' }}>
                <SizePresets
                  currentSize={canvasSize}
                  onSizeChange={handleSizeChange}
                />
              </div>
            </div>
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
          <div className="h-16 bg-panel-gray border-b border-gray-700 flex items-center px-4 overflow-x-auto justify-between">
            <Toolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              carouselSlides={carouselSlides}
              onCarouselSlidesChange={setCarouselSlides}
              isCarouselMode={isCarouselMode}
              carouselSlideSize={carouselSlideSize}
              onCarouselSlideSizeChange={handleCarouselSlideSizeChange}
            />
          </div>

          {/* Canvas with Artboards */}
          <div className="flex-1 relative overflow-hidden">
            <Canvas
              ref={canvasRef}
              width={isCarouselMode ? carouselSlideSize.width : canvasSize.width}
              height={isCarouselMode ? carouselSlideSize.height : canvasSize.height}
              mediaItems={mediaItems}
              selectedMedia={selectedMedia}
              activeTool={activeTool}
              isCarouselMode={isCarouselMode}
              carouselSlides={carouselSlides}
              showSeparatorLine={true}
              onToolChange={handleToolChange}
              onSaveProject={handleSaveProject}
              onOpenProject={handleOpenProject}
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
