import React from 'react';
import { 
  MousePointer, 
  Type, 
  Palette,
  Crop,
  Download,
  Undo,
  Redo,
  Save,
  FolderOpen,
  Plus,
  Minus,
  Columns,
  SquareStack
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  carouselSlides?: number;
  onCarouselSlidesChange?: (slides: number) => void;
  isCarouselMode?: boolean;
  carouselSlideSize?: { width: number; height: number };
  onCarouselSlideSizeChange?: (width: number, height: number) => void;
}

const tools = [
  { id: 'select', name: 'Select', icon: MousePointer },
  { id: 'crop', name: 'Crop', icon: Crop },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'brush', name: 'Brush', icon: Palette },
];

const actions = [
  { id: 'undo', name: 'Undo', icon: Undo },
  { id: 'redo', name: 'Redo', icon: Redo },
  { id: 'saveProject', name: 'Save Project', icon: Save },
  { id: 'openProject', name: 'Open Project', icon: FolderOpen },
  { id: 'export', name: 'Export', icon: Download }
];

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  onToolChange, 
  carouselSlides = 1, 
  onCarouselSlidesChange,
  isCarouselMode = false,
  carouselSlideSize = { width: 1080, height: 1080 },
  onCarouselSlideSizeChange
}) => {
  return (
    <div className="flex items-center gap-2 flex-nowrap min-w-max">
      {/* Main Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                tool-button flex items-center gap-1 px-2 py-2
                ${activeTool === tool.id ? 'active' : ''}
              `}
              title={tool.name}
            >
              <Icon size={18} />
              <span className="hidden lg:inline text-xs">{tool.name}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600"></div>

      {/* Carousel Mode Toggle */}
      <button
        onClick={() => onToolChange('carousel')}
        className={`
          tool-button flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
          ${isCarouselMode ? 'bg-cta-blue text-white' : 'bg-gray-700 hover:bg-gray-600'}
        `}
        title={isCarouselMode ? "Carousel Mode Active - Click to disable" : "Enable Carousel Mode"}
      >
        {isCarouselMode ? (
          <Columns size={18} />
        ) : (
          <SquareStack size={18} />
        )}
        <span className="text-xs font-medium">
          {isCarouselMode ? 'Carousel ON' : 'Carousel OFF'}
        </span>
      </button>

      {/* Carousel Slide Controls - Only show when carousel mode is active */}
      {isCarouselMode && (
        <>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
            <button
              onClick={() => onCarouselSlidesChange?.(Math.max(1, carouselSlides - 1))}
              disabled={carouselSlides <= 1}
              className={`
                p-1 rounded transition-colors
                ${carouselSlides <= 1 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-white hover:bg-gray-700'}
              `}
              title="Remove slide"
            >
              <Minus size={16} />
            </button>
            <span className="text-xs text-white font-medium px-2 min-w-[3rem] text-center">
              {carouselSlides} {carouselSlides === 1 ? 'Slide' : 'Slides'}
            </span>
            <button
              onClick={() => onCarouselSlidesChange?.(carouselSlides + 1)}
              className="p-1 rounded text-white hover:bg-gray-700 transition-colors"
              title="Add slide"
            >
              <Plus size={16} />
            </button>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600"></div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onToolChange(action.id)}
              className="tool-button flex items-center gap-1 px-2 py-2"
              title={action.name}
            >
              <Icon size={18} />
              <span className="hidden lg:inline text-xs">{action.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default Toolbar;
