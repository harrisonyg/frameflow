import React from 'react';
import { 
  MousePointer, 
  Move, 
  RotateCcw, 
  Type, 
  Palette,
  Filter,
  Crop,
  Download,
  Undo,
  Redo,
  ImageIcon,
  Plus,
  Minus
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  carouselSlides?: number;
  onCarouselSlidesChange?: (slides: number) => void;
  isCarouselMode?: boolean;
}

const tools = [
  { id: 'select', name: 'Select', icon: MousePointer },
  { id: 'move', name: 'Move', icon: Move },
  { id: 'crop', name: 'Crop', icon: Crop },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'brush', name: 'Brush', icon: Palette },
];

const actions = [
  { id: 'undo', name: 'Undo', icon: Undo },
  { id: 'redo', name: 'Redo', icon: Redo },
  { id: 'export', name: 'Export', icon: Download }
];

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  onToolChange, 
  carouselSlides = 1, 
  onCarouselSlidesChange,
  isCarouselMode = false 
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

      {/* Carousel Mode Toggle */}
      <div className="w-px h-8 bg-gray-600"></div>
      
      <button
        className={`
          tool-button flex items-center gap-1 px-2 py-2
          ${activeTool === 'carousel' ? 'active' : ''}
        `}
        onClick={() => onToolChange('carousel')}
        title="Carousel Mode"
      >
        <ImageIcon size={18} />
        <span className="hidden lg:inline text-xs">Carousel</span>
      </button>

      {/* Carousel Slide Counter */}
      {isCarouselMode && onCarouselSlidesChange && (
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
          <button
            onClick={() => onCarouselSlidesChange(Math.max(1, carouselSlides - 1))}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title="Decrease slides"
            disabled={carouselSlides <= 1}
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            value={carouselSlides}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              onCarouselSlidesChange(Math.max(1, Math.min(10, value)));
            }}
            className="w-12 bg-gray-800 text-center text-xs py-1 rounded border border-gray-600"
            min="1"
            max="10"
          />
          <button
            onClick={() => onCarouselSlidesChange(Math.min(10, carouselSlides + 1))}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title="Increase slides"
            disabled={carouselSlides >= 10}
          >
            <Plus size={14} />
          </button>
          <span className="text-xs text-gray-400 ml-1">slides</span>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
