import React, { useRef, useState, useEffect } from 'react';
import { 
  Undo2, Redo2, RotateCw, Trash2, Maximize, ZoomIn, ZoomOut, 
  Type, Smile, Brush, Palette, Sparkles, Check, CheckCircle
} from 'lucide-react';
import { PredefinedText } from '../types';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Path {
  points: Point[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

interface Sticker {
  x: number;
  y: number;
  base64: string;
  size: number;
}

interface TextOverlay {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  backgroundEnabled: boolean;
  backgroundColor: string;
}

interface DrawingBoardProps {
  imageSrc: string | null;
  onSave: (canvasDataUrl: string) => void;
  predefinedTexts: PredefinedText[];
  stickersList: string[]; // List of base64 stickers
}

export default function DrawingBoard({ imageSrc, onSave, predefinedTexts, stickersList }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [painting, setPainting] = useState(false);
  const [currentMode, setCurrentMode] = useState<'draw' | 'sticker' | 'text'>('draw');
  const [isChiselMode, setIsChiselMode] = useState(false);
  
  // Transform states
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  
  // Brush & Text config
  const [lineWidth, setLineWidth] = useState(12);
  const [nibAngle, setNibAngle] = useState(75);
  const [lineColor, setLineColor] = useState('#EF4444'); // Default red
  const [fontSize, setFontSize] = useState(30);
  const [fontFamily, setFontFamily] = useState('Amiri');
  const [selectedText, setSelectedText] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [stickerSize, setStickerSize] = useState(120);

  // History & Actions
  const [drawnPaths, setDrawnPaths] = useState<Path[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [history, setHistory] = useState<Array<{ type: 'path' | 'sticker' | 'text'; index: number }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ type: 'path' | 'sticker' | 'text'; data: any }>>([]);

  const [showStickersMenu, setShowStickersMenu] = useState(false);
  
  // Touch panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  // Load original image
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setOriginalImage(img);
        resetTransform(img);
        // Clear previous state on new image load
        setDrawnPaths([]);
        setStickers([]);
        setTexts([]);
        setHistory([]);
        setRedoHistory([]);
      };
      img.src = imageSrc;
    } else {
      setOriginalImage(null);
      // Setup blank white board
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [imageSrc]);

  // Adjust canvas bounds when original image updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      redrawCanvas();
    }
  }, [originalImage, drawnPaths, stickers, texts, scale, offsetX, offsetY]);

  const resetTransform = (img: HTMLImageElement) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || 500;
    
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    const newScale = Math.min(scaleX, scaleY, 1) * 0.95; // fit with margin
    
    setScale(newScale);
    setOffsetX((containerWidth - img.width * newScale) / 2);
    setOffsetY((containerHeight - img.height * newScale) / 2);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (originalImage) {
      ctx.drawImage(originalImage, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw all paths
    drawnPaths.forEach(path => {
      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((point, idx) => {
          if (idx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });

    // Draw stickers
    stickers.forEach(sticker => {
      const img = new Image();
      img.src = sticker.base64;
      if (img.complete) {
        ctx.drawImage(img, sticker.x, sticker.y, sticker.size, sticker.size);
      } else {
        img.onload = () => {
          ctx.drawImage(img, sticker.x, sticker.y, sticker.size, sticker.size);
        };
      }
    });

    // Draw texts
    texts.forEach(text => {
      ctx.direction = (text.fontFamily === 'Amiri') ? 'rtl' : 'ltr';
      ctx.textAlign = (ctx.direction === 'rtl') ? 'right' : 'left';
      ctx.font = `bold ${text.fontSize}px ${text.fontFamily}, Tajawal, sans-serif`;
      
      const lineHeight = text.fontSize * 1.3;
      
      // Calculate background rect
      let maxLineWidth = 0;
      text.lines.forEach(line => {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
      });

      const padding = 12;
      const rectWidth = maxLineWidth + padding * 2;
      const rectHeight = text.lines.length * lineHeight + padding;
      
      const rectX = (ctx.direction === 'rtl') ? text.x - maxLineWidth - padding : text.x - padding;
      const rectY = text.y - (text.fontSize * 0.9);

      if (text.backgroundEnabled) {
        ctx.fillStyle = text.backgroundColor;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect?.(rectX, rectY, rectWidth, rectHeight, 8);
        ctx.fill();
        // Reset shadow
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
  };

  // Chisel brush simulation (Arabic calligraphy pen)
  const drawChiselSegment = (
    ctx: CanvasRenderingContext2D, 
    p0: Point, 
    p1: Point, 
    angleDeg: number, 
    baseWidth: number, 
    color: string
  ) => {
    const angleRad = (angleDeg * Math.PI) / 180.0;
    const nibU = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Draw step-by-step for smooth strokes
    const steps = Math.max(1, Math.floor(dist / 1.5));
    ctx.fillStyle = color;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p0.x + dx * t;
      const y = p0.y + dy * t;
      const pr = p0.pressure * (1 - t) + p1.pressure * t;
      const w = baseWidth * pr;
      const half = w / 2;

      // Draw thin rectangle at the specified nib angle
      const lx = x + nibU.x * half;
      const ly = y + nibU.y * half;
      const rx = x - nibU.x * half;
      const ry = y - nibU.y * half;

      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 1, ly + 1);
      ctx.lineTo(rx + 1, ry + 1);
      ctx.lineTo(rx, ry);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Convert client coordinate to canvas coordinate
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Position within the viewport element
    const xInViewport = clientX - rect.left;
    const yInViewport = clientY - rect.top;

    // Convert from CSS pixels to actual canvas coordinates based on the current transform
    const x = (xInViewport / rect.width) * canvas.width;
    const y = (yInViewport / rect.height) * canvas.height;
    
    return { x, y };
  };

  // Handle pointer down (Mouse/Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click / single touch
    
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (currentMode === 'draw') {
      canvasRef.current?.setPointerCapture(e.pointerId);
      setPainting(true);
      
      const newPath: Path = {
        points: [{ x, y, pressure: e.pressure || 0.8 }],
        lineWidth,
        lineColor,
        isChisel: isChiselMode,
        nibAngle
      };
      
      setDrawnPaths(prev => [...prev, newPath]);
      setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
      setRedoHistory([]);
    } else if (currentMode === 'sticker' && selectedSticker) {
      const newSticker: Sticker = {
        x: x - stickerSize / 2,
        y: y - stickerSize / 2,
        base64: selectedSticker,
        size: stickerSize
      };
      setStickers(prev => [...prev, newSticker]);
      setHistory(prev => [...prev, { type: 'sticker', index: stickers.length }]);
      setRedoHistory([]);
      redrawCanvas();
    } else if (currentMode === 'text' && selectedText) {
      const lines = selectedText.split('\\n');
      const newText: TextOverlay = {
        lines,
        x,
        y,
        color: lineColor,
        fontSize,
        fontFamily,
        backgroundEnabled: true,
        backgroundColor: '#FFFFFF'
      };
      setTexts(prev => [...prev, newText]);
      setHistory(prev => [...prev, { type: 'text', index: texts.length }]);
      setRedoHistory([]);
      redrawCanvas();
    }
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting || currentMode !== 'draw') return;
    
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure || 0.8;

    setDrawnPaths(prev => {
      const next = [...prev];
      if (next.length > 0) {
        next[next.length - 1].points.push({ x, y, pressure });
      }
      return next;
    });
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (painting) {
      setPainting(false);
      canvasRef.current?.releasePointerCapture(e.pointerId);
      redrawCanvas();
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    if (lastAction.type === 'path') {
      const undone = drawnPaths[drawnPaths.length - 1];
      setDrawnPaths(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'path', data: undone }]);
    } else if (lastAction.type === 'sticker') {
      const undone = stickers[stickers.length - 1];
      setStickers(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'sticker', data: undone }]);
    } else if (lastAction.type === 'text') {
      const undone = texts[texts.length - 1];
      setTexts(prev => prev.slice(0, -1));
      setRedoHistory(prev => [...prev, { type: 'text', data: undone }]);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    
    const lastRedone = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));

    if (lastRedone.type === 'path') {
      setDrawnPaths(prev => [...prev, lastRedone.data]);
      setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
    } else if (lastRedone.type === 'sticker') {
      setStickers(prev => [...prev, lastRedone.data]);
      setHistory(prev => [...prev, { type: 'sticker', index: stickers.length }]);
    } else if (lastRedone.type === 'text') {
      setTexts(prev => [...prev, lastRedone.data]);
      setHistory(prev => [...prev, { type: 'text', index: texts.length }]);
    }
  };

  // Clear canvas
  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع التصحيحات على السبورة؟')) {
      setDrawnPaths([]);
      setStickers([]);
      setTexts([]);
      setHistory([]);
      setRedoHistory([]);
    }
  };

  // Rotate canvas 90 degrees
  const handleRotate = () => {
    if (!originalImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = originalImage.height;
    canvas.height = originalImage.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      // Map existing annotations to rotated space
      const oldWidth = originalImage.width;
      const oldHeight = originalImage.height;
      const centerX = oldWidth / 2;
      const centerY = oldHeight / 2;

      const rotatePoint = (pt: Point): Point => {
        const radians = (90 * Math.PI) / 180;
        const dx = pt.x - centerX;
        const dy = pt.y - centerY;
        const rx = dx * Math.cos(radians) - dy * Math.sin(radians);
        const ry = dx * Math.sin(radians) + dy * Math.cos(radians);
        // Center shift to new dimensions
        return { 
          x: rx + oldHeight / 2, 
          y: ry + oldWidth / 2, 
          pressure: pt.pressure 
        };
      };

      setDrawnPaths(prev => prev.map(p => ({
        ...p,
        points: p.points.map(rotatePoint)
      })));

      setStickers(prev => prev.map(s => {
        const pt = rotatePoint({ x: s.x + s.size / 2, y: s.y + s.size / 2, pressure: 1 });
        return {
          ...s,
          x: pt.x - s.size / 2,
          y: pt.y - s.size / 2
        };
      }));

      setTexts(prev => prev.map(t => {
        const pt = rotatePoint({ x: t.x, y: t.y, pressure: 1 });
        return {
          ...t,
          x: pt.x,
          y: pt.y
        };
      }));

      setOriginalImage(rotatedImg);
    };
    rotatedImg.src = canvas.toDataURL('image/jpeg');
  };

  // Trigger onSave callback with final canvas data
  const triggerSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3));

  // Academic stickers helper
  const defaultStickers = [
    'https://img.icons8.com/color/96/excellent.png',
    'https://img.icons8.com/color/96/checked-checkbox.png',
    'https://img.icons8.com/color/96/star.png',
    'https://img.icons8.com/emoji/96/sparkles-emoji.png',
    'https://img.icons8.com/emoji/96/red-heart.png',
    'https://img.icons8.com/fluency/96/crown.png',
  ];

  const actualStickers = stickersList.length > 0 ? stickersList : defaultStickers;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Controls Bar */}
      <div className="bg-slate-950 p-3 md:p-4 border-b border-slate-800 flex flex-wrap gap-2 md:gap-4 items-center justify-between">
        
        {/* Brush Modes & Colors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Draw Button */}
          <button
            onClick={() => { setCurrentMode('draw'); setShowStickersMenu(false); }}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
              currentMode === 'draw' && !isChiselMode
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Brush className="w-4 h-4" />
            <span>قلم عادي</span>
          </button>

          {/* Chisel Pen (Calligraphy Pen) */}
          <button
            onClick={() => { setCurrentMode('draw'); setIsChiselMode(true); setShowStickersMenu(false); }}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
              currentMode === 'draw' && isChiselMode
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>قلم خط حاد</span>
          </button>

          {/* Texts Overlays */}
          <button
            onClick={() => { setCurrentMode('text'); setShowStickersMenu(false); }}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 ${
              currentMode === 'text'
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>عبارة تصحيح</span>
          </button>

          {/* Stamps / Stickers */}
          <button
            onClick={() => { setCurrentMode('sticker'); setShowStickersMenu(!showStickersMenu); }}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-2 relative ${
              currentMode === 'sticker'
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>ملصق تقدير</span>
          </button>
        </div>

        {/* Undo/Redo & Utility Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
            title="تراجع"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoHistory.length === 0}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
            title="إعادة"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition"
            title="تدوير الصورة 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-slate-900 text-red-400 hover:bg-red-500/20 transition"
            title="مسح كل شيء"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-800 mx-1"></div>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => originalImage && resetTransform(originalImage)}
            className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition"
            title="ملء الشاشة"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Sub-menus */}
      {currentMode === 'draw' && (
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>اللون:</span>
            <div className="flex items-center gap-1.5">
              {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'].map(c => (
                <button
                  key={c}
                  onClick={() => setLineColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    lineColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={lineColor}
                onChange={e => setLineColor(e.target.value)}
                className="w-6 h-6 bg-transparent border-0 cursor-pointer p-0 rounded"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span>سمك الخط:</span>
            <input
              type="range"
              min="4"
              max="60"
              value={lineWidth}
              onChange={e => setLineWidth(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="font-mono text-white text-xs w-6">{lineWidth}px</span>
          </div>

          {isChiselMode && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span>زاوية القلم:</span>
              <input
                type="range"
                min="0"
                max="180"
                value={nibAngle}
                onChange={e => setNibAngle(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono text-white text-xs w-8">{nibAngle}°</span>
            </div>
          )}
        </div>
      )}

      {currentMode === 'text' && (
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <select
            value={selectedText}
            onChange={e => setSelectedText(e.target.value)}
            className="bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- اختر عبارة جاهزة لتضعها بنقرة على السبورة --</option>
            {predefinedTexts.map((pt, i) => (
              <option key={i} value={pt.phrase}>{pt.title}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">حجم الخط:</span>
            <select
              value={fontSize}
              onChange={e => setFontSize(parseInt(e.target.value))}
              className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-800 focus:outline-none"
            >
              <option value="20">صغير (20px)</option>
              <option value="30">متوسط (30px)</option>
              <option value="40">كبير (40px)</option>
              <option value="60">ضخم (60px)</option>
              <option value="100">عملاق (100px)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">الخط:</span>
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-800 focus:outline-none"
            >
              <option value="Amiri">الأميري (Amiri)</option>
              <option value="Tajawal">تاجويل (Tajawal)</option>
              <option value="Noto Serif Thai">التايلاندي (Thai)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400">لون النص:</span>
            {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => setLineColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  lineColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stickers Panel Overlay */}
      {showStickersMenu && (
        <div className="bg-slate-950/95 backdrop-blur px-4 py-3 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-300 font-medium">الملصقات المتاحة (اختر ملصقاً ثم انقر في أي مكان على السبورة لطباعته):</span>
          <div className="flex flex-wrap gap-3 max-h-24 overflow-y-auto">
            {actualStickers.map((src, i) => (
              <button
                key={i}
                onClick={() => setSelectedSticker(src)}
                className={`p-1.5 rounded-lg border-2 hover:scale-110 transition bg-slate-900 ${
                  selectedSticker === src ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800'
                }`}
              >
                <img src={src} alt="sticker" className="w-10 h-10 object-contain" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">حجم الملصق:</span>
            <select
              value={stickerSize}
              onChange={e => setStickerSize(parseInt(e.target.value))}
              className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-800 focus:outline-none"
            >
              <option value="60">صغير جداً (60px)</option>
              <option value="120">متوسط (120px)</option>
              <option value="200">كبير (200px)</option>
              <option value="400">كبير جداً (400px)</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Canvas Workspace Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto bg-slate-950 flex items-center justify-center cursor-crosshair touch-none"
        onWheel={(e) => {
          // Pinch to zoom or scroll zoom
          if (e.ctrlKey) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            setScale(prev => Math.min(Math.max(prev * factor, 0.2), 6));
          }
        }}
      >
        <div
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: painting ? 'none' : 'transform 0.1s ease-out'
          }}
          className="absolute top-0 left-0"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="shadow-2xl select-none"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>

      {/* Save Trigger / Export Panel */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center">
        <p className="text-xs text-slate-500 hidden sm:block">
          * اسحب بإصبعين لتحريك الصورة على الجوال، أو استخدم عجلة الماوس مع زر Ctrl للتكبير والتصغير.
        </p>
        <button
          onClick={triggerSave}
          className="mr-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-emerald-500/10 flex items-center gap-2 transition"
        >
          <CheckCircle className="w-4 h-4" />
          <span>تطبيق وحفظ التعديلات للسبورة</span>
        </button>
      </div>
    </div>
  );
}
