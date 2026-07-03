import React, { useRef, useState, useEffect } from 'react';
import { 
  Undo2, Redo2, RotateCw, ZoomIn, ZoomOut, Maximize2, 
  Trash2, Type, Star, MousePointer, Paintbrush
} from 'lucide-react';
import { PredefinedText } from '../types';

interface DrawingBoardProps {
  imageUrl: string | null;
  predefinedTexts: PredefinedText[];
  stickerUrls: string[];
  onSaveCanvas: (base64: string) => void;
  isLoadingImage: boolean;
  onFetchBase64: (fileId: string, callback: (base64: string) => void) => void;
}

interface PathPoint {
  x: number;
  y: number;
  pressure?: number;
}

interface DrawnPath {
  points: PathPoint[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

interface PlacedSticker {
  x: number;
  y: number;
  base64: string;
  size: number;
}

interface PlacedText {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
}

interface HistoryItem {
  type: 'path' | 'sticker' | 'text';
  index: number;
}

export default function DrawingBoard({
  imageUrl,
  predefinedTexts,
  stickerUrls,
  onSaveCanvas,
  isLoadingImage,
  onFetchBase64
}: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canvas States
  const [painting, setPainting] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [mode, setMode] = useState<'draw' | 'sticker' | 'text'>('draw');
  const [isChisel, setIsChisel] = useState(false);
  const [lineWidth, setLineWidth] = useState(14);
  const [lineColor, setLineColor] = useState('#EF4444');
  const [nibAngle, setNibAngle] = useState(75);
  const [fontSize, setFontSize] = useState(30);
  const [fontFamily, setFontFamily] = useState('Tajawal');
  const [stickerSize, setStickerSize] = useState(300);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Loaded assets
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [stickerBase64s, setStickerBase64s] = useState<{ [key: string]: string }>({});

  // Drawing elements history
  const [drawnPaths, setDrawnPaths] = useState<DrawnPath[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoHistory, setRedoHistory] = useState<{ type: string; data: any; index: number }[]>([]);

  // Drag states for panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load BG Image
  useEffect(() => {
    if (!imageUrl) {
      setBgImage(null);
      resetCanvasData();
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBgImage(img);
      resetCanvasData();
      setTimeout(() => autoFitImage(img), 100);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Lazy load stickers
  useEffect(() => {
    stickerUrls.forEach(id => {
      if (!stickerBase64s[id]) {
        onFetchBase64(id, (b64) => {
          setStickerBase64s(prev => ({ ...prev, [id]: b64 }));
        });
      }
    });
  }, [stickerUrls]);

  const resetCanvasData = () => {
    setDrawnPaths([]);
    setPlacedStickers([]);
    setPlacedTexts([]);
    setHistory([]);
    setRedoHistory([]);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const autoFitImage = (img: HTMLImageElement) => {
    if (!containerRef.current || !canvasRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = 550; // set a standard height
    
    canvasRef.current.width = img.width || 1200;
    canvasRef.current.height = img.height || 800;

    const scaleX = cw / img.width;
    const scaleY = ch / img.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    
    setScale(fitScale);
    setOffsetX((cw - img.width * fitScale) / 2);
    setOffsetY((ch - img.height * fitScale) / 2);
  };

  // Canvas Redraw Logic
  useEffect(() => {
    drawEverything();
  }, [bgImage, drawnPaths, placedStickers, placedTexts, scale, offsetX, offsetY]);

  const drawEverything = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply transform matrix for zoom & pan
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. Draw Background
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Paths
    drawnPaths.forEach(path => {
      if (path.isChisel) {
        // Draw elegant broad pen strokes (Calligraphy effect)
        const ang = (path.nibAngle * Math.PI) / 180.0;
        const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
        ctx.fillStyle = path.lineColor;

        for (let i = 0; i < path.points.length - 1; i++) {
          const p0 = path.points[i];
          const p1 = path.points[i + 1];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.floor(dist / 2));

          for (let step = 0; step < steps; step++) {
            const t = step / steps;
            const x = p0.x + dx * t;
            const y = p0.y + dy * t;
            const w = path.lineWidth;
            const half = w / 2;

            ctx.beginPath();
            ctx.moveTo(x + nibU.x * half, y + nibU.y * half);
            ctx.lineTo(x - nibU.x * half, y - nibU.y * half);
            ctx.lineTo(x + dx / steps - nibU.x * half, y + dy / steps - nibU.y * half);
            ctx.lineTo(x + dx / steps + nibU.x * half, y + dy / steps + nibU.y * half);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        // Draw regular smooth strokes
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((pt, idx) => {
          if (idx === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        });
        ctx.stroke();
      }
    });

    // 3. Draw Stickers
    placedStickers.forEach(st => {
      const stickerImg = new Image();
      stickerImg.src = st.base64;
      if (stickerImg.complete) {
        ctx.drawImage(stickerImg, st.x, st.y, st.size, st.size);
      } else {
        stickerImg.onload = () => {
          ctx.drawImage(stickerImg, st.x, st.y, st.size, st.size);
        };
      }
    });

    // 4. Draw Texts
    placedTexts.forEach(txt => {
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
      
      const lineHeight = txt.fontSize * 1.3;
      const textWidths = txt.lines.map(line => ctx.measureText(line).width);
      const maxWidth = Math.max(...textWidths, 100);
      const padding = 12;

      // Background rect for readability
      const rectWidth = maxWidth + padding * 2;
      const rectHeight = txt.lines.length * lineHeight + padding;
      const rectX = txt.x - maxWidth - padding;
      const rectY = txt.y - txt.fontSize * 0.9;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

      // Render actual text lines
      ctx.fillStyle = txt.color;
      txt.lines.forEach((line, idx) => {
        ctx.fillText(line, txt.x - padding, txt.y + idx * lineHeight);
      });
    });

    ctx.restore();
  };

  // Convert Canvas coordinate to Image coordinate
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    return {
      x: (canvasX - offsetX) / scale,
      y: (canvasY - offsetY) / scale
    };
  };

  // Pen Painting handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || mode === 'sticker' || mode === 'text') {
      // Middle click or drag-only modes -> Panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
      return;
    }
    setPainting(true);
    const coords = getCoords(e);
    const newPath: DrawnPath = {
      points: [coords],
      lineWidth,
      lineColor,
      isChisel,
      nibAngle
    };
    setDrawnPaths(prev => [...prev, newPath]);
    setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
    setRedoHistory([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setOffsetX(e.clientX - panStart.x);
      setOffsetY(e.clientY - panStart.y);
      return;
    }
    if (!painting) return;
    const coords = getCoords(e);
    
    setDrawnPaths(prev => {
      const updated = [...prev];
      const current = updated[updated.length - 1];
      if (current) {
        current.points.push(coords);
      }
      return updated;
    });
  };

  const handleMouseUp = () => {
    setPainting(false);
    setIsPanning(false);
  };

  // Touch triggers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch pan zoom starts
      setIsPanning(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setPanStart({ x: midX - offsetX, y: midY - offsetY });
      return;
    }
    if (mode !== 'draw') return;
    setPainting(true);
    const coords = getCoords(e);
    const newPath: DrawnPath = {
      points: [coords],
      lineWidth,
      lineColor,
      isChisel,
      nibAngle
    };
    setDrawnPaths(prev => [...prev, newPath]);
    setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
    setRedoHistory([]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setOffsetX(midX - panStart.x);
      setOffsetY(midY - panStart.y);
      return;
    }
    if (!painting || mode !== 'draw') return;
    const coords = getCoords(e);
    setDrawnPaths(prev => {
      const updated = [...prev];
      const current = updated[updated.length - 1];
      if (current) {
        current.points.push(coords);
      }
      return updated;
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const coords = getCoords(e);

    if (mode === 'sticker') {
      if (!selectedSticker || !stickerBase64s[selectedSticker]) return;
      const stObj: PlacedSticker = {
        x: coords.x - stickerSize / 2,
        y: coords.y - stickerSize / 2,
        base64: stickerBase64s[selectedSticker],
        size: stickerSize
      };
      setPlacedStickers(prev => [...prev, stObj]);
      setHistory(prev => [...prev, { type: 'sticker', index: placedStickers.length }]);
      setRedoHistory([]);
    } else if (mode === 'text') {
      if (!selectedText) return;
      const lines = selectedText.split('\\n'); // support newline separator
      const txtObj: PlacedText = {
        lines,
        x: coords.x,
        y: coords.y,
        color: lineColor,
        fontSize,
        fontFamily
      };
      setPlacedTexts(prev => [...prev, txtObj]);
      setHistory(prev => [...prev, { type: 'text', index: placedTexts.length }]);
      setRedoHistory([]);
    }
  };

  // General operations
  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    if (last.type === 'path') {
      const popped = drawnPaths[drawnPaths.length - 1];
      setDrawnPaths(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'path', data: popped, index: last.index }]);
    } else if (last.type === 'sticker') {
      const popped = placedStickers[placedStickers.length - 1];
      setPlacedStickers(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'sticker', data: popped, index: last.index }]);
    } else if (last.type === 'text') {
      const popped = placedTexts[placedTexts.length - 1];
      setPlacedTexts(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'text', data: popped, index: last.index }]);
    }
  };

  const redo = () => {
    if (redoHistory.length === 0) return;
    const last = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));

    if (last.type === 'path') {
      setDrawnPaths(prev => [...prev, last.data]);
      setHistory(prev => [...prev, { type: 'path', index: last.index }]);
    } else if (last.type === 'sticker') {
      setPlacedStickers(prev => [...prev, last.data]);
      setHistory(prev => [...prev, { type: 'sticker', index: last.index }]);
    } else if (last.type === 'text') {
      setPlacedTexts(prev => [...prev, last.data]);
      setHistory(prev => [...prev, { type: 'text', index: last.index }]);
    }
  };

  const rotateBgImage = () => {
    if (!bgImage) return;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = bgImage.height;
    tempCanvas.height = bgImage.width;
    
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(bgImage, -bgImage.width / 2, -bgImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      setBgImage(rotatedImg);
      resetCanvasData();
      setTimeout(() => autoFitImage(rotatedImg), 100);
    };
    rotatedImg.src = tempCanvas.toDataURL('image/jpeg', 0.95);
  };

  // Compile final merged image
  const triggerSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a physical copy representing exact canvas details
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background image directly
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw all paths directly
    drawnPaths.forEach(path => {
      if (path.isChisel) {
        const ang = (path.nibAngle * Math.PI) / 180.0;
        const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
        ctx.fillStyle = path.lineColor;

        for (let i = 0; i < path.points.length - 1; i++) {
          const p0 = path.points[i];
          const p1 = path.points[i + 1];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.floor(dist / 2));

          for (let step = 0; step < steps; step++) {
            const t = step / steps;
            const x = p0.x + dx * t;
            const y = p0.y + dy * t;
            const w = path.lineWidth;
            const half = w / 2;

            ctx.beginPath();
            ctx.moveTo(x + nibU.x * half, y + nibU.y * half);
            ctx.lineTo(x - nibU.x * half, y - nibU.y * half);
            ctx.lineTo(x + dx / steps - nibU.x * half, y + dy / steps - nibU.y * half);
            ctx.lineTo(x + dx / steps + nibU.x * half, y + dy / steps + nibU.y * half);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((pt, idx) => {
          if (idx === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        });
        ctx.stroke();
      }
    });

    // Draw all stickers directly
    placedStickers.forEach(st => {
      const stickerImg = new Image();
      stickerImg.src = st.base64;
      ctx.drawImage(stickerImg, st.x, st.y, st.size, st.size);
    });

    // Draw all texts directly
    placedTexts.forEach(txt => {
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
      const lineHeight = txt.fontSize * 1.3;
      const textWidths = txt.lines.map(line => ctx.measureText(line).width);
      const maxWidth = Math.max(...textWidths, 100);
      const padding = 12;

      const rectWidth = maxWidth + padding * 2;
      const rectHeight = txt.lines.length * lineHeight + padding;
      const rectX = txt.x - maxWidth - padding;
      const rectY = txt.y - txt.fontSize * 0.9;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

      ctx.fillStyle = txt.color;
      txt.lines.forEach((line, idx) => {
        ctx.fillText(line, txt.x - padding, txt.y + idx * lineHeight);
      });
    });

    const outputBase64 = outputCanvas.toDataURL('image/jpeg', 0.92);
    onSaveCanvas(outputBase64);
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100" id="drawing-section">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-emerald-600" />
          سبورة التصحيح التفاعلية
        </h3>
        
        {/* Undo, Redo, Rotate, Zoom controls */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
          <button 
            type="button" 
            onClick={undo} 
            disabled={history.length === 0}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs disabled:opacity-30 transition-all"
            title="تراجع"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={redo} 
            disabled={redoHistory.length === 0}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs disabled:opacity-30 transition-all"
            title="إعادة"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <button 
            type="button" 
            onClick={rotateBgImage}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
            title="تدوير الصورة ٩٠ درجة"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => setScale(prev => Math.min(prev + 0.15, 4))}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => setScale(prev => Math.max(prev - 0.15, 0.3))}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => bgImage && autoFitImage(bgImage)}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
            title="الحجم الافتراضي"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={resetCanvasData}
            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-all"
            title="مسح السبورة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Brush settings */}
        <div className={`p-3 rounded-xl border transition-all ${mode === 'draw' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'draw' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Paintbrush className="w-4 h-4" />
              أداة القلم / الفرشاة
            </button>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isChisel} 
                onChange={(e) => setIsChisel(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
              />
              قلم خط مشطوف
            </label>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">العرض: {lineWidth}px</span>
              <input 
                type="range" 
                min="4" 
                max="80" 
                value={lineWidth} 
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-2/3 accent-emerald-600"
              />
            </div>

            {isChisel && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">الزاوية: {nibAngle}°</span>
                <input 
                  type="range" 
                  min="0" 
                  max="180" 
                  value={nibAngle} 
                  onChange={(e) => setNibAngle(Number(e.target.value))}
                  className="w-2/3 accent-emerald-600"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-slate-500">اللون:</span>
              <div className="flex flex-wrap gap-1">
                {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#000000'].map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => setLineColor(c)}
                    className={`w-5 h-5 rounded-full border border-white transition-all ${lineColor === c ? 'ring-2 ring-slate-800 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input 
                  type="color" 
                  value={lineColor} 
                  onChange={(e) => setLineColor(e.target.value)}
                  className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Text tool presets */}
        <div className={`p-3 rounded-xl border transition-all ${mode === 'text' ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button"
              onClick={() => setMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'text' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Type className="w-4 h-4" />
              أداة النصوص
            </button>
            <select 
              value={fontSize} 
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="text-xs border-slate-200 rounded-lg p-1 bg-white"
            >
              <option value="20">صغير</option>
              <option value="30">متوسط</option>
              <option value="45">كبير</option>
              <option value="60">كبير جداً</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <select
              value={selectedText}
              onChange={(e) => {
                setSelectedText(e.target.value);
                setMode('text');
              }}
              className="w-full text-xs rounded-lg border-slate-200 p-2 bg-white"
            >
              <option value="">-- اختر نصاً جاهزاً للختم --</option>
              {predefinedTexts.map((item, index) => (
                <option key={index} value={item.phrase}>
                  {item.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">انقر على النص الجاهز ثم انقر على السبورة لوضع الختم.</p>
          </div>
        </div>

        {/* 3. Sticker Stamps tool */}
        <div className={`p-3 rounded-xl border transition-all ${mode === 'sticker' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button"
              onClick={() => setMode('sticker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'sticker' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Star className="w-4 h-4" />
              الأختام والملصقات
            </button>
            <select 
              value={stickerSize} 
              onChange={(e) => setStickerSize(Number(e.target.value))}
              className="text-xs border-slate-200 rounded-lg p-1 bg-white"
            >
              <option value="150">حجم صغير</option>
              <option value="300">حجم متوسط</option>
              <option value="500">حجم كبير</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            {stickerUrls.length === 0 ? (
              <p className="text-xs text-slate-400 italic">لا توجد أختام مدرجة بالاعدادات</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto p-1 bg-white rounded-lg border border-slate-100">
                {stickerUrls.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedSticker(id);
                      setMode('sticker');
                    }}
                    className={`w-10 h-10 rounded-md border p-0.5 transition-all flex items-center justify-center bg-slate-50 hover:bg-amber-50 ${selectedSticker === id && mode === 'sticker' ? 'border-amber-500 ring-2 ring-amber-200 scale-105' : 'border-slate-200'}`}
                  >
                    {stickerBase64s[id] ? (
                      <img src={stickerBase64s[id]} alt="sticker" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="w-3 h-3 bg-slate-200 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400">انقر على الختم ثم انقر فوق المكان المراد بالسبورة.</p>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        ref={containerRef}
        className="relative border border-slate-200 rounded-2xl bg-slate-100 overflow-hidden cursor-crosshair flex items-center justify-center min-h-[550px]"
        style={{ direction: 'ltr' }} // keep ltr for standard drawing coordinate math
      >
        {isLoadingImage && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-700 font-sans">جاري تحميل صورة الدرس من قوقل درايف...</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onClick={handleCanvasClick}
          className="max-w-full shadow-lg bg-white rounded-md transition-shadow"
        />

        {/* Floating Controls Overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-xs text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-3 pointer-events-none font-sans">
          <span>الوضع: {mode === 'draw' ? (isChisel ? 'قلم مشطوف' : 'قلم عادي') : mode === 'sticker' ? 'ملصق' : 'ختم نصي'}</span>
          <span className="w-px h-3 bg-slate-600"></span>
          <span>التقريب: {Math.round(scale * 100)}%</span>
          <span className="w-px h-3 bg-slate-600"></span>
          <span className="flex items-center gap-1">
            <MousePointer className="w-3.5 h-3.5" />
            انقر واسحب بالزر الأوسط للتحريك
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <p className="text-xs text-slate-400">تأكد من انتهاء الرسم والتصحيح بالكامل قبل النقر على زر الحفظ النهائي بالأسفل.</p>
        <button
          type="button"
          onClick={triggerSave}
          className="bg-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
        >
          <Paintbrush className="w-4 h-4" />
          تحديث وحفظ تعديلات السبورة
        </button>
      </div>
    </div>
  );
}
