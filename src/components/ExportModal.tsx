import React, { useState, useCallback } from 'react';
import { Download, Image, Settings } from 'lucide-react';

interface ExportModalProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (format: string, quality: number, size: { width: number; height: number }) => void;
  currentSize: { width: number; height: number };
}

const exportFormats = [
  { id: 'png', name: 'PNG', description: 'High quality, supports transparency', icon: Image },
  { id: 'jpg', name: 'JPEG', description: 'Smaller file size, no transparency', icon: Image },
  { id: 'webp', name: 'WebP', description: 'Modern format, excellent compression', icon: Image },
  // { id: 'pdf', name: 'PDF', description: 'Vector format, scalable', icon: FileText }
];

const qualityOptions = [
  { value: 1, label: 'Maximum Quality (100%)' },
  { value: 0.9, label: 'High Quality (90%)' },
  { value: 0.8, label: 'Good Quality (80%)' },
  { value: 0.7, label: 'Medium Quality (70%)' },
  { value: 0.6, label: 'Low Quality (60%)' }
];

const ExportModal: React.FC<ExportModalProps> = ({
  isVisible,
  onClose,
  onExport,
  currentSize
}) => {
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [quality, setQuality] = useState(0.9);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, quality, currentSize);
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsExporting(false);
      onClose();
    }
  }, [selectedFormat, quality, currentSize, onExport, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Download size={24} />
            Export Image
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 text-left
                      ${selectedFormat === format.id
                        ? 'border-cta-blue bg-blue-50 text-blue-900'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800 text-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} />
                      <span className="font-medium">{format.name}</span>
                    </div>
                    <p className="text-xs opacity-75">{format.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Quality</h3>
            <select
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-sm"
            >
              {qualityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size Settings */}
          {/* <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Export Size</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Width</label>
                <input
                  type="number"
                  value={exportSize.width}
                  onChange={(e) => setExportSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1080 }))}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  min="100"
                  max="4000"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Height</label>
                <input
                  type="number"
                  value={exportSize.height}
                  onChange={(e) => setExportSize(prev => ({ ...prev, height: parseInt(e.target.value) || 1080 }))}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  min="100"
                  max="4000"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setExportSize(currentSize)}
                className="text-xs text-cta-blue hover:text-blue-400"
              >
                Use Canvas Size
              </button>
              <button
                onClick={() => setExportSize({ width: 1080, height: 1080 })}
                className="text-xs text-cta-blue hover:text-blue-400"
              >
                Instagram Square
              </button>
            </div>
          </div> */}

          {/* Export Info */}
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings size={16} />
              <span className="text-sm font-medium">Export Summary</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <div>Format: {exportFormats.find(f => f.id === selectedFormat)?.name}</div>
              <div>Quality: {Math.round(quality * 100)}%</div>
              <div>Size: {currentSize.width} × {currentSize.height}px</div>
              <div>Estimated file size: ~{Math.round((currentSize.width * currentSize.height * 3 * quality) / 1024 / 1024)}MB</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cta-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Image
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

