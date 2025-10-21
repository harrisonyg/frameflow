import React, { useState, useCallback, useEffect } from 'react';

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

interface FilterControlsProps {
  onFilterChange: (filters: ImageFilters) => void;
  hasSelectedImage: boolean;
  selectionKey: number; // Changes when a different image is selected
  currentFilters?: ImageFilters; // Stored filters for current image
}

const presets = [
  { name: 'None', filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false, sepia: false, invert: false, hue: 0 } },
  { name: 'Grayscale', filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: true, sepia: false, invert: false, hue: 0 } },
  { name: 'Sepia', filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false, sepia: true, invert: false, hue: 0 } },
  { name: 'Vintage', filters: { brightness: -0.1, contrast: 0.1, saturation: -0.2, blur: 0, grayscale: false, sepia: true, invert: false, hue: 0 } },
  { name: 'Bright', filters: { brightness: 0.3, contrast: 0.1, saturation: 0.2, blur: 0, grayscale: false, sepia: false, invert: false, hue: 0 } },
  { name: 'Cool', filters: { brightness: 0, contrast: 0, saturation: 0.1, blur: 0, grayscale: false, sepia: false, invert: false, hue: -20 } },
  { name: 'Warm', filters: { brightness: 0.1, contrast: 0, saturation: 0.1, blur: 0, grayscale: false, sepia: false, invert: false, hue: 20 } },
];

const FilterControls: React.FC<FilterControlsProps> = ({ onFilterChange, hasSelectedImage, selectionKey, currentFilters }) => {
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    grayscale: false,
    sepia: false,
    invert: false,
    hue: 0
  });

  // Load stored filters when selectionKey changes (different image selected)
  useEffect(() => {
    if (hasSelectedImage) {
      if (currentFilters) {
        // Restore saved filters for this image
        setFilters(currentFilters);
      } else {
        // No saved filters, reset to defaults
        setFilters({
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          grayscale: false,
          sepia: false,
          invert: false,
          hue: 0
        });
      }
    }
  }, [selectionKey, hasSelectedImage, currentFilters]);

  // Call onFilterChange whenever filters change (with debounce for performance)
  useEffect(() => {
    if (hasSelectedImage) {
      const timeoutId = setTimeout(() => {
        onFilterChange(filters);
      }, 100); // Debounce to prevent too many rapid updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters, hasSelectedImage]); // Removed onFilterChange from deps to prevent infinite loop

  const handleSliderChange = useCallback((key: keyof ImageFilters, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleToggle = useCallback((key: keyof ImageFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePresetClick = useCallback((preset: typeof presets[0]) => {
    setFilters(preset.filters);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      hue: 0
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Info message */}
      {!hasSelectedImage && (
        <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
          Select an image to apply filters
        </div>
      )}

      {/* Presets */}
      <div>
        <h4 className="text-xs font-medium text-gray-300 mb-2">Presets</h4>
        <div className="grid grid-cols-2 gap-1">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              disabled={!hasSelectedImage}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs rounded transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-300">Adjustments</h4>
          <button
            onClick={handleReset}
            disabled={!hasSelectedImage}
            className="text-xs text-cta-blue hover:text-blue-400 disabled:text-gray-600 transition-colors"
          >
            Reset
          </button>
        </div>
        
        {/* Brightness */}
        <div>
          <label className="text-xs text-gray-400 flex justify-between mb-1">
            <span>Brightness</span>
            <span className="text-cta-blue">{Math.round(filters.brightness * 100)}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={filters.brightness}
            onChange={(e) => handleSliderChange('brightness', parseFloat(e.target.value))}
            disabled={!hasSelectedImage}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Contrast */}
        <div>
          <label className="text-xs text-gray-400 flex justify-between mb-1">
            <span>Contrast</span>
            <span className="text-cta-blue">{Math.round(filters.contrast * 100)}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={filters.contrast}
            onChange={(e) => handleSliderChange('contrast', parseFloat(e.target.value))}
            disabled={!hasSelectedImage}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Saturation */}
        <div>
          <label className="text-xs text-gray-400 flex justify-between mb-1">
            <span>Saturation</span>
            <span className="text-cta-blue">{Math.round(filters.saturation * 100)}</span>
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={filters.saturation}
            onChange={(e) => handleSliderChange('saturation', parseFloat(e.target.value))}
            disabled={!hasSelectedImage}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Hue */}
        <div>
          <label className="text-xs text-gray-400 flex justify-between mb-1">
            <span>Hue</span>
            <span className="text-cta-blue">{Math.round(filters.hue)}°</span>
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={filters.hue}
            onChange={(e) => handleSliderChange('hue', parseFloat(e.target.value))}
            disabled={!hasSelectedImage}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Blur */}
        <div>
          <label className="text-xs text-gray-400 flex justify-between mb-1">
            <span>Blur</span>
            <span className="text-cta-blue">{filters.blur.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={filters.blur}
            onChange={(e) => handleSliderChange('blur', parseFloat(e.target.value))}
            disabled={!hasSelectedImage}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Effects */}
      <div>
        <h4 className="text-xs font-medium text-gray-300 mb-2">Effects</h4>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleToggle('grayscale')}
            disabled={!hasSelectedImage}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filters.grayscale 
                ? 'bg-cta-blue text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600'
            }`}
          >
            Grayscale
          </button>
          <button
            onClick={() => handleToggle('sepia')}
            disabled={!hasSelectedImage}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filters.sepia 
                ? 'bg-cta-blue text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600'
            }`}
          >
            Sepia
          </button>
          <button
            onClick={() => handleToggle('invert')}
            disabled={!hasSelectedImage}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filters.invert 
                ? 'bg-cta-blue text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600'
            }`}
          >
            Invert
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;

