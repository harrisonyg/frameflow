import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDrag } from 'react-dnd';
import { Upload, Image, Video, X } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaPanelProps {
  mediaItems: MediaItem[];
  selectedMedia: string | null;
  onMediaAdd: (files: File[]) => void;
  onMediaSelect: (mediaId: string) => void;
  onMediaRemove: (mediaId: string) => void;
}

interface DraggableMediaItemProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const DraggableMediaItem: React.FC<DraggableMediaItemProps> = ({ item, isSelected, onSelect, onRemove }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'media',
    item: { mediaId: item.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`
        media-item relative group cursor-move
        ${isSelected ? 'selected' : ''}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
      onClick={() => onSelect(item.id)}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-700">
        {item.type === 'image' ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="text-gray-400" size={24} />
          </div>
        )}
      </div>
      
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
        >
          <X size={12} />
        </button>
      </div>
      
      <div className="mt-1">
        <p className="text-xs text-gray-300 truncate">{item.name}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {item.type === 'image' ? (
            <Image size={12} />
          ) : (
            <Video size={12} />
          )}
          {item.type}
        </div>
      </div>
    </div>
  );
};

const MediaPanel: React.FC<MediaPanelProps> = ({
  mediaItems,
  selectedMedia,
  onMediaAdd,
  onMediaSelect,
  onMediaRemove
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onMediaAdd(acceptedFiles);
  }, [onMediaAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    multiple: true
  });

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'drag-over' : 'border-gray-600 hover:border-cta-blue'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
        <p className="text-sm text-gray-400">
          {isDragActive
            ? 'Drop files here...'
            : 'Drag & drop images/videos or click to browse'
          }
        </p>
      </div>

      {/* Media Grid */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Media Files</h4>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {mediaItems.map((item) => (
                    <DraggableMediaItem
                      key={item.id}
                      item={item}
                      isSelected={selectedMedia === item.id}
                      onSelect={onMediaSelect}
                      onRemove={onMediaRemove}
                    />
          ))}
        </div>
      </div>

      {mediaItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Image className="mx-auto mb-2" size={32} />
          <p className="text-sm">No media files added yet</p>
        </div>
      )}
    </div>
  );
};

export default MediaPanel;

