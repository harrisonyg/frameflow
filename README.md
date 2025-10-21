# FrameFLow Editor



## Features


### 🎯 Media Management
- **Top-left media panel** for easy access
- **Drag and drop** file upload
- **Image and video support**
- **Thumbnail previews**
- **Media organization**

### 🛠️ Professional Tools
- **Text editing** with custom fonts and styling in future
- **Shape tools** (rectangles, circles, triangles)
- **Brush tools** for freehand drawing
- **Layer management**
- **Undo/Redo functionality**

### 📤 Export Options
- **Multiple formats** (PNG, JPEG, WebP, PDF)
- **Quality settings** (60% to 100%)
- **Custom export sizes**
- **Batch export** capabilities

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd instagram-image-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3001`

### Building for Production

```bash
npm run build
```

## Usage


##shortcuts

1.delete key to delete selected images
2.`[` for layer image 
3.`]` for bring image
4.shift `[`
5.shift  `]`

### Adding Media
1. **Drag and drop** images/videos into the media panel (top-left)
2. **Click to browse** files from your computer
3. **Select media** from the panel to add to canvas

### Editing Images
1. **Select tools** from the toolbar (crop, text, shapes, etc.)
2. **Click on canvas** to apply tools
3. **Use handles** to resize and position elements
4. **Layer management** for complex compositions

### Exporting
1. **Click the "Export" button** in the toolbar
2. **Choose format** (PNG, JPEG, WebP, PDF)
3. **Set quality** and size options
4. **Download** your finished image

## Technology Stack

- **React 18** with TypeScript
- **Fabric.js** for canvas manipulation
- **React DnD** for drag and drop
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Project Structure

```
src/
├── components/
│   ├── Canvas.tsx          # Main editing canvas
│   ├── MediaPanel.tsx       # Media management panel
│   ├── Toolbar.tsx          # Editing tools
│   ├── SizePresets.tsx      # Instagram size presets
│   ├── CollageMaker.tsx     # Collage layout selector
│   └── ExportModal.tsx      # Export options
├── types.ts                 # TypeScript definitions
├── App.tsx                  # Main application
└── index.tsx               # Entry point
```



