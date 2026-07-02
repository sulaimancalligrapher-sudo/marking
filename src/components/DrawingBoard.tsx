import React, { useRef, useState, useEffect } from 'react';
import { Undo2, Redo2, RotateCw, RefreshCw, ZoomIn, ZoomOut, Move, Edit3, Type, Smile } from 'lucide-react';
import { DrawingPath, PlacedSticker, PlacedText, HistoryAction, WatermarkSettings } from '../types';
import { extractFileId } from '../lib/googleApi';

interface DrawingBoardProps {
  imageUrl: string | null;
  stickers: string[]; // File IDs
  predefinedTexts: { title: string; phrase: string; }[];
  watermarkSettings: WatermarkSettings | null;
  token: string | null;
  onSave: (base64: string) => void;
  onStatusChange: (status: string) => void;
}

export default function DrawingBoard({
  imageUrl,
  stickers,
  predefinedTexts,
  watermarkSettings,
  token,
  onSave,
  onStatusChange,
}: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Tools state
  const [currentMode, setCurrentMode] = useState<'draw' | 'chisel' | 'sticker' | 'text'>('draw');
  const [lineWidth, setLineWidth] = useState<number>(28);
  const [nibAngle, setNibAngle] = useState<number>(75);
  const [lineColor, setLineColor] = useState<string>('#FF0000');
  const [fontSize, setFontSize] = useState<number>(30);
  const [fontFamily, setFontFamily] = useState<string>('Amiri');
  const [stickerSize, setStickerSize] = useState<number>(500);

  // Selection states
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Loaded stickers image elements mapping (base64/ObjectURLs)
  const [stickerImages, setStickerImages] = useState<Record<string, string>>({});

  // Navigation (Zoom & Pan)
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing elements
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryAction[]>([]);

  // Local drawing session state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Dynamic dimension of the canvas
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // Load stickers base64 on mount / update
  useEffect(() => {
    if (stickers.length > 0 && token) {
      stickers.forEach(async (fileId) => {
        if (!stickerImages[fileId]) {
          try {
            const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
              const blob = await response.blob();
              const objectUrl = URL.createObjectURL(blob);
              setStickerImages(prev => ({ ...prev, [fileId]: objectUrl }));
            }
          } catch (e) {
            console.error('Error loading sticker:', e);
          }
        }
      });
    }
  }, [stickers, token]);

  // Load main background image
  useEffect(() => {
    if (!imageUrl) {
      // Create empty white canvas
      setOriginalImage(null);
      setCanvasDimensions({ width: 800, height: 600 });
      return;
    }

    setLoading(true);
    onStatusChange('جاري تحميل الصورة الأصلية...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setCanvasDimensions({ width: img.width, height: img.height });
      setPaths([]);
      setPlacedStickers([]);
      setPlacedTexts([]);
      setHistory([]);
      setRedoHistory([]);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
      setLoading(false);
      onStatusChange('');
    };
    img.onerror = () => {
      // If direct crossOrigin fails, we can fetch via drive media blob (which works beautifully!)
      console.warn('Direct image load failed, trying drive fetch...');
      fetchAndLoadImage();
    };
    img.src = imageUrl;

    async function fetchAndLoadImage() {
      try {
        // Find file ID if it is a Drive link
        const fileId = imageUrl.includes('drive.google.com') ? imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] : null;
        if (fileId && token) {
          const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
          const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (response.ok) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            img.src = objectUrl;
            return;
          }
        }
        setLoading(false);
        onStatusChange('فشل تحميل الصورة المباشرة');
      } catch (err) {
        console.error(err);
        setLoading(false);
        onStatusChange('خطأ في تحميل الصورة');
      }
    }
  }, [imageUrl, token]);

  // Redraw Canvas on any changes
  useEffect(() => {
    drawAll();
  }, [paths, placedStickers, placedTexts, scale, offsetX, offsetY, canvasDimensions, originalImage, stickerImages]);

  // Helper vectors for chisel brush
  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    p0: { x: number; y: number; pressure?: number },
    p1: { x: number; y: number; pressure?: number },
    nibAngleDeg: number,
    baseWidth: number,
    color: string
  ) => {
    const ang = (nibAngleDeg * Math.PI) / 180.0;
    const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
    const pressure0 = p0.pressure || 1;
    const pressure1 = p1.pressure || 1;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 2));

    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const x0 = p0.x + dx * t0;
      const y0 = p0.y + dy * t0;
      const x1 = p0.x + dx * t1;
      const y1 = p0.y + dy * t1;
      const pr = pressure0 * (1 - t0) + pressure1 * t0;
      const w = baseWidth * pr;
      const half = w / 2;

      const left0 = { x: x0 + nibU.x * half, y: y0 + nibU.y * half };
      const right0 = { x: x0 - nibU.x * half, y: y0 - nibU.y * half };
      const left1 = { x: x1 + nibU.x * half, y: y1 + nibU.y * half };
      const right1 = { x: x1 - nibU.x * half, y: y1 - nibU.y * half };

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(left0.x, left0.y);
      ctx.lineTo(left1.x, left1.y);
      ctx.lineTo(right1.x, right1.y);
      ctx.lineTo(right0.x, right0.y);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawAll = (overrideCtx?: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = overrideCtx || canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Only apply scale/pan if we are not rendering for export
    if (!overrideCtx) {
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
    }

    // Draw background
    if (originalImage) {
      ctx.drawImage(originalImage, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Paths
    paths.forEach(path => {
      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });

    // Draw Stickers
    placedStickers.forEach(st => {
      const img = new Image();
      img.src = st.base64;
      if (img.complete) {
        ctx.drawImage(img, st.x, st.y, st.size, st.size);
      } else {
        img.onload = () => {
          // Trigger redraw once loaded
          drawAll();
        };
      }
    });

    // Draw Texts
    placedTexts.forEach(text => {
      ctx.direction = text.fontFamily === 'Amiri' ? 'rtl' : 'ltr';
      ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
      ctx.font = `medium ${text.fontSize}px ${text.fontFamily}`;
      const lineHeight = text.fontSize * 1.3;
      
      // Calculate background bounding box
      let maxWidth = 0;
      text.lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
      });

      const padding = 12;
      if (text.background?.enabled) {
        const rectWidth = maxWidth + padding * 2;
        const rectX = ctx.direction === 'rtl' ? text.x - maxWidth - padding : text.x - padding;
        const rectY = text.y - text.fontSize * 0.9 - padding;
        const rectHeight = text.lines.length * lineHeight + padding * 1.5;

        // White card background with subtle shadow
        ctx.fillStyle = text.background.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        // Round rect fallback
        ctx.rect(rectX, rectY, rectWidth, rectHeight);
        ctx.fill();
        // Reset shadow for drawing text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.y + index * lineHeight);
      });
    });

    ctx.restore();
  };

  // Coordinates Converter (Page coordinates to Canvas model coordinates)
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Canvas coordinate relative to viewport
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Convert with active pan and zoom
    const modelX = x / scale - offsetX / scale;
    const modelY = y / scale - offsetY / scale;

    return { x: modelX, y: modelY };
  };

  // Start Action
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (currentMode === 'sticker') {
      placeSticker(e);
      return;
    }
    if (currentMode === 'text') {
      placeText(e);
      return;
    }

    // Draw Modes
    setIsDrawing(true);
    const coords = getCanvasCoords(e.nativeEvent);
    if (coords) {
      const newPath: DrawingPath = {
        points: [{ x: coords.x, y: coords.y, pressure: 1 }],
        lineWidth,
        lineColor,
        isChisel: currentMode === 'chisel',
        nibAngle,
      };
      setPaths(prev => [...prev, newPath]);
      setLastPoint(coords);
    }
  };

  // Draw or Pan
  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setOffsetX(clientX - panStart.x);
      setOffsetY(clientY - panStart.y);
      return;
    }

    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCanvasCoords(e.nativeEvent);
    if (coords && lastPoint) {
      setPaths(prev => {
        const next = [...prev];
        const lastPath = next[next.length - 1];
        if (lastPath) {
          lastPath.points.push({ x: coords.x, y: coords.y, pressure: 1 });
        }
        return next;
      });
      setLastPoint(coords);
    }
  };

  // Stop Action
  const handleEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      
      // Save to undo history
      const lastPathIndex = paths.length - 1;
      if (lastPathIndex >= 0) {
        const action: HistoryAction = {
          type: 'path',
          data: paths[lastPathIndex],
          index: lastPathIndex
        };
        setHistory(prev => [...prev, action]);
        setRedoHistory([]);
      }
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Handle placing a sticker
  const placeSticker = (e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedSticker) {
      onStatusChange('الرجاء اختيار ملصق من شريط الأدوات أولاً');
      setTimeout(() => onStatusChange(''), 3000);
      return;
    }

    const objectUrl = stickerImages[selectedSticker];
    if (!objectUrl) return;

    const coords = getCanvasCoords(e.nativeEvent);
    if (coords) {
      const stSize = stickerSize;
      const newSticker: PlacedSticker = {
        x: coords.x - stSize / 2,
        y: coords.y - stSize / 2,
        base64: objectUrl,
        size: stSize,
      };

      setPlacedStickers(prev => [...prev, newSticker]);
      const action: HistoryAction = {
        type: 'sticker',
        data: newSticker,
        index: placedStickers.length,
      };
      setHistory(prev => [...prev, action]);
      setRedoHistory([]);
    }
  };

  // Handle placing text
  const placeText = (e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedText) {
      onStatusChange('الرجاء اختيار عبارة تصحيح أولاً');
      setTimeout(() => onStatusChange(''), 3000);
      return;
    }

    const coords = getCanvasCoords(e.nativeEvent);
    if (coords) {
      const lines = selectedText.split('\n');
      const newText: PlacedText = {
        lines,
        x: coords.x,
        y: coords.y,
        color: lineColor,
        fontSize,
        fontFamily,
        background: { enabled: true, color: '#FFFFFF' },
      };

      setPlacedTexts(prev => [...prev, newText]);
      const action: HistoryAction = {
        type: 'text',
        data: newText,
        index: placedTexts.length,
      };
      setHistory(prev => [...prev, action]);
      setRedoHistory([]);
    }
  };

  // Zoom Operations
  const handleZoom = (factor: number) => {
    const newScale = Math.min(Math.max(scale * factor, 0.4), 5);
    setScale(newScale);
  };

  // Reset zoom
  const handleResetZoom = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Rotation 90 deg
  const handleRotate = () => {
    if (!originalImage) return;
    onStatusChange('جاري تدوير اللوحة...');

    // Rotate background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = originalImage.height;
    tempCanvas.height = originalImage.width;

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      // Coordinate conversions for placed elements
      const oldWidth = originalImage.width;
      const oldHeight = originalImage.height;
      const cx = oldWidth / 2;
      const cy = oldHeight / 2;

      const rotatePoint = (x: number, y: number) => {
        const dx = x - cx;
        const dy = y - cy;
        const rotatedX = -dy + cy; // Transposed rotation coords
        const rotatedY = dx + cx;
        return { x: rotatedX, y: rotatedY };
      };

      // Map paths
      const newPaths = paths.map(path => ({
        ...path,
        points: path.points.map(pt => ({
          ...pt,
          ...rotatePoint(pt.x, pt.y)
        }))
      }));

      // Map stickers
      const newStickers = placedStickers.map(st => {
        const scx = st.x + st.size / 2;
        const scy = st.y + st.size / 2;
        const rotatedC = rotatePoint(scx, scy);
        return {
          ...st,
          x: rotatedC.x - st.size / 2,
          y: rotatedC.y - st.size / 2
        };
      });

      // Map texts
      const newTexts = placedTexts.map(text => {
        const rotated = rotatePoint(text.x, text.y);
        return {
          ...text,
          x: rotated.x,
          y: rotated.y
        };
      });

      setPaths(newPaths);
      setPlacedStickers(newStickers);
      setPlacedTexts(newTexts);
      setOriginalImage(rotatedImg);
      setCanvasDimensions({ width: rotatedImg.width, height: rotatedImg.height });
      onStatusChange('');
    };
    rotatedImg.src = tempCanvas.toDataURL('image/jpeg');
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const action = history[history.length - 1];

    if (action.type === 'path') {
      setPaths(prev => prev.slice(0, -1));
    } else if (action.type === 'sticker') {
      setPlacedStickers(prev => prev.slice(0, -1));
    } else if (action.type === 'text') {
      setPlacedTexts(prev => prev.slice(0, -1));
    }

    setRedoHistory(prev => [...prev, action]);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const action = redoHistory[redoHistory.length - 1];

    if (action.type === 'path') {
      setPaths(prev => [...prev, action.data]);
    } else if (action.type === 'sticker') {
      setPlacedStickers(prev => [...prev, action.data]);
    } else if (action.type === 'text') {
      setPlacedTexts(prev => [...prev, action.data]);
    }

    setHistory(prev => [...prev, action]);
    setRedoHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع التعديلات؟')) {
      setPaths([]);
      setPlacedStickers([]);
      setPlacedTexts([]);
      setHistory([]);
      setRedoHistory([]);
    }
  };

  // Start panning image
  const startPan = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 1 && currentMode !== 'text' && currentMode !== 'sticker' && !e.shiftKey) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  // Add Watermark & Export Final Image
  const triggerSave = async () => {
    onStatusChange('جاري دمج الصورة وإضافة العلامة المائية...');
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasDimensions.width;
    exportCanvas.height = canvasDimensions.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Redraw everything natively at 1:1 scale
    drawAll(exportCtx);

    // Render Watermark text
    if (watermarkSettings && watermarkSettings.textPrefix) {
      const today = new Date().toISOString().split('T')[0];
      const wmText = `${watermarkSettings.textPrefix} - ${today}`;
      exportCtx.font = `bold ${watermarkSettings.fontSize || 24}px Arial`;
      exportCtx.direction = 'rtl';
      const textWidth = exportCtx.measureText(wmText).width;
      const height = watermarkSettings.fontSize || 24;

      let x = 20;
      let y = exportCanvas.height - 30;

      if (watermarkSettings.textPosition === 'top-right') {
        x = exportCanvas.width - textWidth - 20;
        y = 30 + height;
      } else if (watermarkSettings.textPosition === 'top-left') {
        x = 20;
        y = 30 + height;
      } else if (watermarkSettings.textPosition === 'bottom-right') {
        x = exportCanvas.width - textWidth - 20;
        y = exportCanvas.height - 30;
      } else if (watermarkSettings.textPosition === 'center') {
        x = (exportCanvas.width - textWidth) / 2;
        y = exportCanvas.height / 2;
      }

      // Draw background card for text
      exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      exportCtx.beginPath();
      exportCtx.rect(x - 10, y - height, textWidth + 20, height + 15);
      exportCtx.fill();

      // Draw text
      exportCtx.fillStyle = '#000000';
      exportCtx.fillText(wmText, x, y);
    }

    // Render Watermark Logo
    if (watermarkSettings && watermarkSettings.logoUrl) {
      const logoId = extractFileId(watermarkSettings.logoUrl);
      if (logoId && token) {
        try {
          const logoUrl = `https://www.googleapis.com/drive/v3/files/${logoId}?alt=media`;
          const response = await fetch(logoUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (response.ok) {
            const blob = await response.blob();
            const logoObjectUrl = URL.createObjectURL(blob);
            
            await new Promise<void>((resolve) => {
              const logoImg = new Image();
              logoImg.onload = () => {
                const w = logoImg.width * (watermarkSettings.sizeFactor || 1);
                const h = logoImg.height * (watermarkSettings.sizeFactor || 1);
                let lx = 20;
                let ly = exportCanvas.height - h - 20;

                if (watermarkSettings.logoPosition === 'top-right') {
                  lx = exportCanvas.width - w - 20;
                  ly = 20;
                } else if (watermarkSettings.logoPosition === 'top-left') {
                  lx = 20;
                  ly = 20;
                } else if (watermarkSettings.logoPosition === 'bottom-right') {
                  lx = exportCanvas.width - w - 20;
                  ly = exportCanvas.height - h - 20;
                } else if (watermarkSettings.logoPosition === 'center') {
                  lx = (exportCanvas.width - w) / 2;
                  ly = (exportCanvas.height - h) / 2;
                }

                exportCtx.globalAlpha = watermarkSettings.opacity || 1;
                exportCtx.drawImage(logoImg, lx, ly, w, h);
                exportCtx.globalAlpha = 1;
                resolve();
              };
              logoImg.src = logoObjectUrl;
            });
          }
        } catch (err) {
          console.error('Failed to render watermark logo:', err);
        }
      }
    }

    // Export Base64 image
    const outputBase64 = exportCanvas.toDataURL('image/jpeg', 0.9);
    onSave(outputBase64);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl" dir="rtl">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 border-b border-slate-700/60 backdrop-blur-md">
        
        {/* Drawing tools selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentMode('draw')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentMode === 'draw'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Edit3 size={16} />
            <span>قلم عادي</span>
          </button>
          
          <button
            onClick={() => setCurrentMode('chisel')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentMode === 'chisel'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Edit3 className="rotate-45" size={16} />
            <span>قلم خطاط (شطف)</span>
          </button>

          <button
            onClick={() => {
              setCurrentMode('text');
              if (predefinedTexts.length > 0 && !selectedText) {
                setSelectedText(predefinedTexts[0].phrase);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentMode === 'text'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Type size={16} />
            <span>إضافة عبارة</span>
          </button>

          <button
            onClick={() => {
              setCurrentMode('sticker');
              if (stickers.length > 0 && !selectedSticker) {
                setSelectedSticker(stickers[0]);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentMode === 'sticker'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Smile size={16} />
            <span>ملصق (ستيكر)</span>
          </button>
        </div>

        {/* View Controls & Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(1.2)}
            title="تكبير"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="تصغير"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleResetZoom}
            title="إعادة ضبط القياس"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleRotate}
            title="تدوير الصورة 90 درجة"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            <RotateCw size={18} />
          </button>

          <span className="h-6 w-px bg-slate-700 mx-1"></span>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="تراجع"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 transition"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoHistory.length === 0}
            title="إعادة"
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 transition"
          >
            <Redo2 size={18} />
          </button>
          <button
            onClick={handleClear}
            title="مسح الكل"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 transition"
          >
            مسح اللوحة
          </button>
        </div>
      </div>

      {/* Settings bar depending on selected mode */}
      <div className="flex flex-wrap gap-4 items-center px-4 py-3 bg-slate-850 border-b border-slate-800 text-sm">
        
        {/* Universal Line Settings */}
        {(currentMode === 'draw' || currentMode === 'chisel' || currentMode === 'text') && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400">لون الخط:</span>
            <input
              type="color"
              value={lineColor}
              onChange={(e) => setLineColor(e.target.value)}
              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 cursor-pointer bg-transparent"
            />
          </div>
        )}

        {/* Dynamic configurations */}
        {(currentMode === 'draw' || currentMode === 'chisel') && (
          <>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-slate-400 whitespace-nowrap">العرض ({lineWidth}px):</span>
              <input
                type="range"
                min="4"
                max="120"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {currentMode === 'chisel' && (
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <span className="text-slate-400 whitespace-nowrap">الزاوية ({nibAngle}°):</span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={nibAngle}
                  onChange={(e) => setNibAngle(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
          </>
        )}

        {/* Text Options */}
        {currentMode === 'text' && (
          <>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-slate-400 whitespace-nowrap">حجم الخط:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded"
              >
                <option value="20">20px</option>
                <option value="30">30px</option>
                <option value="40">40px</option>
                <option value="50">50px</option>
                <option value="80">80px</option>
                <option value="120">120px</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-slate-400 whitespace-nowrap">نوع الخط:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded"
              >
                <option value="Amiri">Amiri (عربي)</option>
                <option value="Inter">Inter (English)</option>
                <option value="JetBrains Mono">Fira Mono</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-slate-400 whitespace-nowrap">العبارة:</span>
              <select
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1 rounded w-full max-w-[300px]"
              >
                <option value="" disabled>اختر العبارة</option>
                {predefinedTexts.map((text, i) => (
                  <option key={i} value={text.phrase}>
                    {text.title}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Sticker Size selection */}
        {currentMode === 'sticker' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">حجم الملصق:</span>
              <select
                value={stickerSize}
                onChange={(e) => setStickerSize(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1 rounded"
              >
                <option value="200">صغير جداً</option>
                <option value="350">صغير</option>
                <option value="500">متوسط</option>
                <option value="800">كبير</option>
                <option value="1200">كبير جداً</option>
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[400px]">
              <span className="text-slate-400 whitespace-nowrap">الملصق:</span>
              {stickers.length === 0 ? (
                <span className="text-slate-500 text-xs">جاري تحميل الملصقات...</span>
              ) : (
                <div className="flex gap-2">
                  {stickers.map((fileId, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSticker(fileId)}
                      className={`p-1 rounded border-2 transition ${
                        selectedSticker === fileId
                          ? 'border-emerald-500 bg-slate-750'
                          : 'border-transparent bg-slate-800 hover:bg-slate-750'
                      }`}
                    >
                      {stickerImages[fileId] ? (
                        <img src={stickerImages[fileId]} alt="Sticker" className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-700 animate-pulse rounded" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Canvas Drawing Stage */}
      <div 
        ref={containerRef}
        onMouseDown={startPan}
        onMouseMove={(e) => {
          if (isPanning) {
            setOffsetX(e.clientX - panStart.x);
            setOffsetY(e.clientY - panStart.y);
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        className="flex-1 overflow-hidden relative bg-slate-950 flex items-center justify-center cursor-crosshair select-none"
      >
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 text-white">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold">جاري تهيئة لوحة التصحيح...</p>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="max-w-none shadow-2xl transition-transform duration-75"
            style={{
              width: `${canvasDimensions.width}px`,
              height: `${canvasDimensions.height}px`,
            }}
          />
        </div>

        {/* Float action labels */}
        <div className="absolute bottom-4 left-4 p-2 bg-slate-900/90 rounded-lg text-xs text-slate-400 flex items-center gap-2 border border-slate-800">
          <Move size={14} />
          <span>اسحب اللوحة بالزر الأوسط للماوس أو مع الضغط على Shift للتنقل</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 bg-slate-850 border-t border-slate-800 flex justify-end">
        <button
          onClick={triggerSave}
          className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
        >
          حفظ وتطبيق التعديلات على الصورة
        </button>
      </div>
    </div>
  );
}
