import React from 'react';
import { Instagram, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { InstagramSize } from '../types';

interface SizePresetsProps {
  currentSize: { width: number; height: number };
  onSizeChange: (width: number, height: number) => void;
}

const instagramSizes: InstagramSize[] = [
  {
    name: 'Square Post',
    width: 1080,
    height: 1080,
    description: '1:1 ratio'
  },
  {
    name: 'Portrait Post',
    width: 1080,
    height: 1350,
    description: '4:5 ratio'
  },
  {
    name: 'Landscape Post',
    width: 1080,
    height: 566,
    description: '1.91:1 ratio'
  },
  {
    name: 'Story',
    width: 1080,
    height: 1920,
    description: '9:16 ratio'
  },
  {
    name: 'Reels',
    width: 1080,
    height: 1920,
    description: '9:16 ratio'
  },
  {
    name: 'IGTV Cover',
    width: 420,
    height: 654,
    description: '1:1.55 ratio'
  },
  {
    name: 'Carousel',
    width: 1080,
    height: 1080,
    description: '1:1 ratio'
  }
];

const SizePresets: React.FC<SizePresetsProps> = ({ currentSize, onSizeChange }) => {
  const getIcon = (size: InstagramSize) => {
    const ratio = size.width / size.height;
    if (ratio === 1) return <Square size={16} />;
    if (ratio > 1) return <RectangleHorizontal size={16} />;
    return <RectangleVertical size={16} />;
  };

  const isActive = (size: InstagramSize) => {
    return currentSize.width === size.width && currentSize.height === size.height;
  };

  return (
    <div className="space-y-2">
      
      <div className="space-y-1">
        {instagramSizes.map((size) => (
          <button
            key={size.name}
            onClick={() => onSizeChange(size.width, size.height)}
            className={`
              w-full flex items-center justify-between p-2 rounded-lg text-left transition-all duration-200
              ${isActive(size) 
                ? 'bg-cta-blue text-white' 
                : 'hover:bg-gray-700 text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {getIcon(size)}
              <div>
                <div className="text-sm font-medium">{size.name}</div>
                <div className="text-xs opacity-75">{size.description}</div>
              </div>
            </div>
            <div className="text-xs opacity-75">
              {size.width}×{size.height}
            </div>
          </button>
        ))}
      </div>

      {/* Custom Size Input */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm font-medium text-gray-300 mb-2">Custom Size</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Width</label>
            <input
              type="number"
              value={currentSize.width}
              onChange={(e) => onSizeChange(parseInt(e.target.value) || 1080, currentSize.height)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              min="100"
              max="4000"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Height</label>
            <input
              type="number"
              value={currentSize.height}
              onChange={(e) => onSizeChange(currentSize.width, parseInt(e.target.value) || 1080)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              min="100"
              max="4000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizePresets;

