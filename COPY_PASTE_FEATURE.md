# ✅ Copy, Cut & Paste Images and Objects!

## 🎯 Feature: Standard Copy/Paste Functionality

You can now **copy, cut, and paste** images and objects on the canvas using standard keyboard shortcuts!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd/Ctrl + C** | Copy | Copies selected object(s) to clipboard |
| **Cmd/Ctrl + X** | Cut | Copies and removes selected object(s) |
| **Cmd/Ctrl + V** | Paste | Pastes object(s) from clipboard |

## 🎨 How It Works

### **Copy (Cmd/Ctrl + C)**
```
1. Select one or more objects (images, text, etc.)
2. Press Cmd/Ctrl + C
3. ✅ Objects copied to internal clipboard
4. Console shows: "Copied 1 object(s)"
```

### **Cut (Cmd/Ctrl + X)**
```
1. Select one or more objects
2. Press Cmd/Ctrl + X
3. ✅ Objects copied to clipboard
4. ✅ Original objects removed from canvas
5. Console shows: "Cut 1 object(s)"
```

### **Paste (Cmd/Ctrl + V)**
```
1. After copying or cutting
2. Press Cmd/Ctrl + V
3. ✅ Objects pasted at offset position (+20px right, +20px down)
4. ✅ New objects automatically selected
5. Console shows: "Pasted 1 object(s)"
```

## 🔧 Technical Implementation

### **1. Clipboard Reference**
```javascript
const clipboardRef = useRef<fabric.Object[]>([]);
```
- Stores copied/cut objects in memory
- Persists across copy/paste operations
- Not tied to system clipboard (app-specific)

### **2. Copy Function**
```javascript
const copyObjects = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length === 0) return;

  // Clone the objects and store in clipboard
  clipboardRef.current = [];
  activeObjects.forEach((obj) => {
    obj.clone((cloned: fabric.Object) => {
      clipboardRef.current.push(cloned);
    }, ['__imageId']); // Preserve custom properties
  });

  console.log(`Copied ${activeObjects.length} object(s)`);
}, []);
```

**Key Features:**
- Uses Fabric.js's `clone()` method for deep copy
- Preserves custom properties like `__imageId` (for filter tracking)
- Stores clones in clipboard ref
- Works with single or multiple objects

### **3. Cut Function**
```javascript
const cutObjects = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length === 0) return;

  // First copy
  copyObjects();

  // Then delete
  activeObjects.forEach((obj) => {
    canvas.remove(obj);
  });

  canvas.discardActiveObject();
  canvas.requestRenderAll();
  console.log(`Cut ${activeObjects.length} object(s)`);
}, [copyObjects]);
```

**Key Features:**
- Calls `copyObjects()` first
- Removes original objects from canvas
- Clears selection
- Re-renders canvas

### **4. Paste Function**
```javascript
const pasteObjects = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || clipboardRef.current.length === 0) return;

  // Clear current selection
  canvas.discardActiveObject();

  const pastedObjects: fabric.Object[] = [];

  // Clone and add each object from clipboard
  clipboardRef.current.forEach((obj, index) => {
    obj.clone((cloned: fabric.Object) => {
      // Offset the pasted object slightly so it's visible
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        evented: true,
      });

      canvas.add(cloned);
      pastedObjects.push(cloned);

      // If all objects are pasted, select them
      if (pastedObjects.length === clipboardRef.current.length) {
        if (pastedObjects.length === 1) {
          canvas.setActiveObject(pastedObjects[0]);
        } else {
          const selection = new fabric.ActiveSelection(pastedObjects, {
            canvas: canvas,
          });
          canvas.setActiveObject(selection);
        }
        canvas.requestRenderAll();
        console.log(`Pasted ${pastedObjects.length} object(s)`);
      }
    }, ['__imageId']); // Preserve custom properties
  });
}, []);
```

**Key Features:**
- Clones objects from clipboard (not move)
- Offsets by +20px to make it visible
- Automatically selects pasted objects
- Handles single or multiple objects
- Creates `ActiveSelection` for multiple objects

### **5. Keyboard Integration**
```javascript
const handleKeyDown = (e: KeyboardEvent) => {
  // Copy, Cut, Paste shortcuts
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
    if (e.code === 'KeyC') {
      e.preventDefault();
      copyObjects();
    } else if (e.code === 'KeyX') {
      e.preventDefault();
      cutObjects();
    } else if (e.code === 'KeyV') {
      e.preventDefault();
      pasteObjects();
    }
  }
};
```

**Key Features:**
- Checks for Cmd (Mac) or Ctrl (Windows/Linux)
- Prevents default browser behavior
- Works with standard key codes

### **6. Exposed via Ref**
```javascript
useImperativeHandle(ref, () => ({
  clearAll: clearAllObjects,
  discardActiveObject: () => { ... },
  applyFilters: applyFilters,
  getFabricCanvas: () => fabricCanvasRef.current,
  copy: copyObjects,
  cut: cutObjects,
  paste: pasteObjects
}), [clearAllObjects, applyFilters, copyObjects, cutObjects, pasteObjects]);
```

**Allows programmatic access:**
```javascript
// From parent component
canvasRef.current?.copy();
canvasRef.current?.paste();
```

## 📊 Use Cases

### **1. Duplicate an Image**
```
1. Place an image on canvas
2. Apply filters (brightness, contrast, etc.)
3. Select the image
4. Press Cmd/Ctrl + C (copy)
5. Press Cmd/Ctrl + V (paste)
6. ✅ Exact duplicate created with same filters!
7. Move it to different position
```

### **2. Create Pattern**
```
1. Create/place an object
2. Copy (Cmd/Ctrl + C)
3. Paste (Cmd/Ctrl + V)
4. Move slightly
5. Paste again (Cmd/Ctrl + V)
6. Move slightly
7. Repeat to create pattern
8. ✅ Quick pattern creation!
```

### **3. Multi-Object Duplication**
```
1. Select multiple images (Shift + Click)
2. Copy (Cmd/Ctrl + C)
3. Paste (Cmd/Ctrl + V)
4. ✅ All objects duplicated together
5. ✅ Relative positions maintained
```

### **4. Move Between Slides**
```
Carousel Mode:
1. Select image on slide 1
2. Cut (Cmd/Ctrl + X)
3. Scroll to slide 2
4. Paste (Cmd/Ctrl + V)
5. ✅ Image moved to slide 2!
```

### **5. Replace Object**
```
1. Select old object
2. Cut (Cmd/Ctrl + X) - removes it
3. Place new object
4. If needed, paste old one (Cmd/Ctrl + V) to compare
```

## ✨ Features

### **Smart Offset**
- Pasted objects appear +20px right and down
- Makes it obvious that paste occurred
- Prevents exact overlap (can't see duplicate)
- Easy to adjust position after paste

### **Preserve Properties**
```javascript
obj.clone((cloned) => { ... }, ['__imageId']);
```
- Custom properties preserved
- `__imageId` preserved for filter tracking
- All Fabric.js properties maintained
- Filters remain applied

### **Multiple Selection**
- Copy/paste works with multiple objects
- Relative positions maintained
- All objects selected after paste
- Easy to move as group

### **Clipboard Persistence**
- Clipboard persists until new copy/cut
- Can paste same objects multiple times
- Works across canvas operations
- Independent of browser clipboard

## 🎯 Workflow Examples

### **Example 1: Quick Duplication**
```
Before:
  Canvas with 1 image

Workflow:
  1. Select image
  2. Cmd/Ctrl + C
  3. Cmd/Ctrl + V
  4. Cmd/Ctrl + V
  5. Cmd/Ctrl + V

Result:
  Canvas with 4 copies of same image
  Each offset by 20px
  All with same filters/properties
```

### **Example 2: Template Creation**
```
Before:
  Empty canvas

Workflow:
  1. Add logo image (top-left)
  2. Add text "Title" (center)
  3. Select both (Shift+Click)
  4. Cmd/Ctrl + C (copy template)
  5. Enable Carousel Mode
  6. Add 4 slides
  7. On each slide: Cmd/Ctrl + V (paste template)

Result:
  5 slides with same logo/title
  Ready to add unique content
```

### **Example 3: Comparison**
```
Before:
  Image with filters applied

Workflow:
  1. Select image
  2. Cmd/Ctrl + C (copy)
  3. Cmd/Ctrl + V (paste)
  4. Move copy next to original
  5. Modify filters on copy
  6. Compare side-by-side

Result:
  Original and modified version visible
  Easy to see filter effects
```

## 🔄 Comparison to System Clipboard

### **System Clipboard** (Cmd/Ctrl + C in browser):
- Copies text or external content
- Limited to supported formats
- Can copy out of app

### **FrameFlow Clipboard** (Our implementation):
✅ **Canvas-specific**: Copies entire Fabric.js objects
✅ **Property preservation**: Keeps all filters, positions, rotations
✅ **Fast**: No serialization overhead
✅ **Reliable**: Works consistently
❌ **App-only**: Can't paste to other apps
❌ **Not persistent**: Lost on page refresh

## ⚠️ Limitations

### **Not Saved:**
- Clipboard cleared on page refresh
- Not persisted in .flo files
- Can't copy between browser tabs

### **App-Specific:**
- Can't copy from/to other applications
- Can't copy from/to system clipboard
- Internal to FrameFlow only

### **Performance:**
- Large objects (hi-res images) may take a moment to clone
- Multiple objects (10+) may have slight delay
- Cloning is asynchronous (Fabric.js limitation)

## 🚀 Future Enhancements

### **Planned:**
- **Duplicate button**: UI button for copy+paste
- **Paste in place**: Paste at exact same position
- **Paste special**: Options like "paste without filters"
- **Clipboard preview**: Show what's in clipboard
- **Copy across tabs**: Share clipboard between tabs
- **Persistent clipboard**: Save clipboard in localStorage

### **Advanced:**
- **Copy as image**: Export to system clipboard as image
- **Paste from external**: Paste images from system clipboard
- **Batch operations**: Copy all objects, paste on each slide
- **Smart paste**: Paste in grid pattern automatically
- **History**: See clipboard history (last 10 copies)

## 🎨 Tips & Tricks

### **Tip 1: Rapid Duplication**
```
Select → Cmd/Ctrl + C → Cmd/Ctrl + V + V + V + V
= 5 copies instantly!
```

### **Tip 2: Safety Net**
```
Before deleting: Cmd/Ctrl + C (copy as backup)
If mistake: Cmd/Ctrl + V (restore)
```

### **Tip 3: Template Workflow**
```
1. Create template design
2. Cmd/Ctrl + C
3. On each new slide: Cmd/Ctrl + V
4. Customize each
```

### **Tip 4: Undo Alternative**
```
Don't have undo? Use copy as snapshot:
1. Before major change: Cmd/Ctrl + C
2. Make change
3. Don't like it? Delete and Cmd/Ctrl + V
```

## 📋 Summary

| Feature | Status | Shortcut |
|---------|--------|----------|
| **Copy** | ✅ Working | Cmd/Ctrl + C |
| **Cut** | ✅ Working | Cmd/Ctrl + X |
| **Paste** | ✅ Working | Cmd/Ctrl + V |
| **Multi-object** | ✅ Yes | Works with selection |
| **Preserve filters** | ✅ Yes | All properties kept |
| **Smart offset** | ✅ Yes | +20px offset |
| **Auto-select** | ✅ Yes | Pasted objects selected |
| **Console feedback** | ✅ Yes | Shows operation result |

## 🎉 Result

**You can now duplicate and move objects with standard keyboard shortcuts!**

✅ **Intuitive**: Standard Cmd/Ctrl + C/X/V shortcuts
✅ **Fast**: Instant duplication
✅ **Reliable**: Preserves all properties
✅ **Flexible**: Works with any object type
✅ **Professional**: Industry-standard behavior

**Try it now: Select an image and press Cmd/Ctrl + C, then Cmd/Ctrl + V!** 🎨✨

