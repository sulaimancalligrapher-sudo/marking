import { useState, useEffect, useRef } from 'react';
import { PredefinedText, StickerItem, WatermarkSettings } from '../types';
import {
  Undo, Redo, Eraser, RotateCw, ZoomIn, ZoomOut, Move,
  Type, Smile, Edit3, Settings, PenTool, Check, Trash2, ArrowUpRight
} from 'lucide-react';

interface CanvasBoardProps {
  imageUrl: string;
  predefinedTexts: PredefinedText[];
  stickers: StickerItem[];
  watermark: WatermarkSettings;
  studentId: string;
  studentName: string;
  lessonNumber: number;
  onSaveCanvasState: (base64: string) => void;
}

interface PathPoint {
  x: number;
  y: number;
  pressure: number;
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
  size: number;
  base64: string;
  url: string;
}

interface PlacedText {
  lines: string[];
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  background: {
    enabled: boolean;
    color: string;
  };
}

interface HistoryItem {
  type: 'path' | 'sticker' | 'text';
  index: number;
  data: any;
}

export default function CanvasBoard({
  imageUrl,
  predefinedTexts,
  stickers,
  watermark,
  studentId,
  studentName,
  lessonNumber,
  onSaveCanvasState
}: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [currentMode, setCurrentMode] = useState<'draw' | 'sticker' | 'text' | 'pan'>('draw');
  const [lineWidth, setLineWidth] = useState(24);
  const [nibAngle, setNibAngle] = useState(75);
  const [isChiselMode, setIsChiselMode] = useState(true);
  const [lineColor, setLineColor] = useState('#EF4444'); // Vivid red

  const [fontSize, setFontSize] = useState(30);
  const [fontFamily, setFontFamily] = useState('Amiri');
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | ''>('');
  const [customText, setCustomText] = useState('');

  const [selectedSticker, setSelectedSticker] = useState<string>('');
  const [stickerSize, setStickerSize] = useState(150);
  const [stickerMenuOpen, setStickerMenuOpen] = useState(false);

  // Zoom / Pan transformation
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Draw states
  const [painting, setPainting] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState<DrawnPath[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);

  // History for Undo/Redo
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryItem[]>([]);

  // Image references
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasRotation, setCanvasRotation] = useState(0); // 0, 90, 180, 270

  // Load Background Image
  useEffect(() => {
    setImageLoaded(false);
    setDrawnPaths([]);
    setPlacedStickers([]);
    setPlacedTexts([]);
    setHistory([]);
    setRedoHistory([]);
    setCanvasRotation(0);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      setImageLoaded(true);
      resetCanvasDimensions(img, 0);
    };
    img.src = imageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAADICAYAAADBXvyWAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABcSURBVHhe7cEBDQAAAMKg909tDjggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAfAK/4AABo3eC9gAAAABJRU5ErkJggg==';
  }, [imageUrl]);

  const resetCanvasDimensions = (img: HTMLImageElement, rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high-res canvas dimensions
    const isRotated90or270 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90or270 ? img.height : img.width;
    canvas.height = isRotated90or270 ? img.width : img.height;

    redrawCanvas();
  };

  // Re-draw canvas on any state update
  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [imageLoaded, scale, offsetX, offsetY, drawnPaths, placedStickers, placedTexts, canvasRotation]);

  // Redraw loop
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply pan and zoom
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Render rotated background
    if (bgImageRef.current) {
      ctx.save();
      if (canvasRotation === 90) {
        ctx.translate(bgImageRef.current.height, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (canvasRotation === 180) {
        ctx.translate(bgImageRef.current.width, bgImageRef.current.height);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (canvasRotation === 270) {
        ctx.translate(0, bgImageRef.current.width);
        ctx.rotate((270 * Math.PI) / 180);
      }
      ctx.drawImage(bgImageRef.current, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw paths
    drawnPaths.forEach((path) => {
      if (path.points.length < 1) return;

      if (path.isChisel) {
        // Draw segment by segment for elegant chisel calligraphy pen
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
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
    placedStickers.forEach((sticker) => {
      const stickerImg = new Image();
      stickerImg.crossOrigin = 'anonymous';
      stickerImg.src = sticker.url;
      // Drawing directly if loaded, otherwise placeholder
      if (stickerImg.complete) {
        ctx.drawImage(stickerImg, sticker.x - sticker.size / 2, sticker.y - sticker.size / 2, sticker.size, sticker.size);
      } else {
        stickerImg.onload = () => {
          redrawCanvas();
        };
        // Draw border box while loading
        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 2;
        ctx.strokeRect(sticker.x - sticker.size / 2, sticker.y - sticker.size / 2, sticker.size, sticker.size);
      }
    });

    // Draw Texts
    placedTexts.forEach((text) => {
      ctx.direction = text.fontFamily === 'Amiri' ? 'rtl' : 'ltr';
      ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
      ctx.font = `${text.fontSize}px ${text.fontFamily}, Arial`;
      const lineHeight = text.fontSize * 1.3;

      // Draw background if enabled
      if (text.background.enabled) {
        const padding = 12;
        const maxLineWidth = Math.max(...text.lines.map((line) => ctx.measureText(line).width));
        const rectWidth = maxLineWidth + padding * 2;
        const rectHeight = text.lines.length * lineHeight + padding;
        const rectX = ctx.direction === 'rtl' ? text.x - maxLineWidth - padding : text.x - padding;
        const rectY = text.y - text.fontSize + 2;

        ctx.fillStyle = text.background.color;
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      }

      ctx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.y + index * lineHeight);
      });
    });

    ctx.restore();

    // Export current canvas frame for save state periodically
    saveFrameData();
  };

  // Helper chisel brush rendering segment
  const drawChiselSegment = (
    ctx: CanvasRenderingContext2D,
    p0: PathPoint,
    p1: PathPoint,
    angleDeg: number,
    baseWidth: number,
    color: string
  ) => {
    const ang = (angleDeg * Math.PI) / 180.0;
    const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
    const p0Pressure = p0.pressure || 1;
    const p1Pressure = p1.pressure || 1;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.max(1, Math.floor(dist / 1.5));
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const pr = p0Pressure * (1 - t0) + p1Pressure * t0;
      const w = baseWidth * pr;
      const half = w / 2;

      const x = p0.x + dx * t0;
      const y = p0.y + dy * t0;

      const left = { x: x + nibU.x * half, y: y + nibU.y * half };
      const right = { x: x - nibU.x * half, y: y - nibU.y * half };

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Canvas Interactions
  const getCanvasCoords = (e: any): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const clickedX = (clientX - rect.left) * scaleX;
    const clickedY = (clientY - rect.top) * scaleY;

    // De-transform coords based on current scale and panning offset
    const finalX = (clickedX - offsetX) / scale;
    const finalY = (clickedY - offsetY) / scale;

    return { x: finalX, y: finalY };
  };

  // Mouse Down
  const handleStartInteraction = (e: any) => {
    if (currentMode === 'pan') {
      setIsDragging(true);
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStart.current = { x: clientX - offsetX, y: clientY - offsetY };
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (currentMode === 'draw') {
      setPainting(true);
      const newPoint = { x, y, pressure: 1 };
      const newPath: DrawnPath = {
        points: [newPoint],
        lineWidth,
        lineColor,
        isChisel: isChiselMode,
        nibAngle
      };
      setDrawnPaths((prev) => [...prev, newPath]);
      setHistory((prev) => [
        ...prev,
        { type: 'path', index: drawnPaths.length, data: newPath }
      ]);
      setRedoHistory([]);
    } else if (currentMode === 'sticker') {
      if (!selectedSticker) return;
      const stickerInfo = stickers.find((s) => s.fileId === selectedSticker);
      if (!stickerInfo) return;

      const newSticker: PlacedSticker = {
        x,
        y,
        size: stickerSize,
        base64: '',
        url: stickerInfo.url
      };
      setPlacedStickers((prev) => [...prev, newSticker]);
      setHistory((prev) => [
        ...prev,
        { type: 'sticker', index: placedStickers.length, data: newSticker }
      ]);
      setRedoHistory([]);
    } else if (currentMode === 'text') {
      const activeText = customText || (selectedTextIndex !== '' ? predefinedTexts[selectedTextIndex].phrase : '');
      if (!activeText) return;

      const lines = activeText.split('\n');
      const newText: PlacedText = {
        lines,
        x,
        y,
        fontSize,
        fontFamily,
        color: lineColor,
        background: { enabled: true, color: 'rgba(255, 255, 255, 0.85)' }
      };

      setPlacedTexts((prev) => [...prev, newText]);
      setHistory((prev) => [
        ...prev,
        { type: 'text', index: placedTexts.length, data: newText }
      ]);
      setRedoHistory([]);
      setCustomText('');
      setSelectedTextIndex('');
    }
  };

  // Mouse Move
  const handleInteraction = (e: any) => {
    if (currentMode === 'pan' && isDragging) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setOffsetX(clientX - dragStart.current.x);
      setOffsetY(clientY - dragStart.current.y);
      return;
    }

    if (currentMode === 'draw' && painting) {
      const { x, y } = getCanvasCoords(e);
      setDrawnPaths((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          const currentPath = updated[updated.length - 1];
          currentPath.points.push({ x, y, pressure: 1 });
        }
        return updated;
      });
    }
  };

  // Mouse Up
  const handleEndInteraction = () => {
    setPainting(false);
    setIsDragging(false);
  };

  // Rotate clockwise
  const handleRotateCanvas = () => {
    const nextRotation = (canvasRotation + 90) % 360;
    setCanvasRotation(nextRotation);
    if (bgImageRef.current) {
      resetCanvasDimensions(bgImageRef.current, nextRotation);
    }
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];

    setHistory((prev) => prev.slice(0, -1));
    setRedoHistory((prev) => [...prev, lastAction]);

    if (lastAction.type === 'path') {
      setDrawnPaths((prev) => prev.slice(0, -1));
    } else if (lastAction.type === 'sticker') {
      setPlacedStickers((prev) => prev.slice(0, -1));
    } else if (lastAction.type === 'text') {
      setPlacedTexts((prev) => prev.slice(0, -1));
    }
  };

  // Redo
  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const lastRedone = redoHistory[redoHistory.length - 1];

    setRedoHistory((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, lastRedone]);

    if (lastRedone.type === 'path') {
      setDrawnPaths((prev) => [...prev, lastRedone.data]);
    } else if (lastRedone.type === 'sticker') {
      setPlacedStickers((prev) => [...prev, lastRedone.data]);
    } else if (lastRedone.type === 'text') {
      setPlacedTexts((prev) => [...prev, lastRedone.data]);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Clear All
  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع الرسومات والنصوص المضافة للسبورة؟')) {
      setDrawnPaths([]);
      setPlacedStickers([]);
      setPlacedTexts([]);
      setHistory([]);
      setRedoHistory([]);
    }
  };

  // Save current frame base64
  const saveFrameData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      onSaveCanvasState(dataUrl);
    } catch (e) {
      console.error('Failed to export canvas frame:', e);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6" id="canvas-workspace">
      
      {/* 1. Left Control Panel */}
      <div className="w-full lg:w-80 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-2xl p-5 space-y-6 text-right order-2 lg:order-1" dir="rtl">
        
        {/* Core Tool Modes Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">الأداة الفعالة</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => { setCurrentMode('draw'); setStickerMenuOpen(false); }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                currentMode === 'draw'
                  ? 'bg-[#d4a017]/10 border-[#d4a017] text-[#d4a017]'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
              }`}
              title="رسم وتصحيح"
            >
              <PenTool className="w-4.5 h-4.5" />
              <span className="text-[10px]">قلم</span>
            </button>

            <button
              onClick={() => { setCurrentMode('text'); setStickerMenuOpen(false); }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                currentMode === 'text'
                  ? 'bg-[#d4a017]/10 border-[#d4a017] text-[#d4a017]'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
              }`}
              title="إضافة ملاحظات نصية"
            >
              <Type className="w-4.5 h-4.5" />
              <span className="text-[10px]">نص عربي</span>
            </button>

            <button
              onClick={() => { setCurrentMode('sticker'); setStickerMenuOpen(true); }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                currentMode === 'sticker'
                  ? 'bg-[#d4a017]/10 border-[#d4a017] text-[#d4a017]'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
              }`}
              title="إضافة أختام وستيكرات تصحيح"
            >
              <Smile className="w-4.5 h-4.5" />
              <span className="text-[10px]">أختام</span>
            </button>

            <button
              onClick={() => { setCurrentMode('pan'); setStickerMenuOpen(false); }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                currentMode === 'pan'
                  ? 'bg-[#d4a017]/10 border-[#d4a017] text-[#d4a017]'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
              }`}
              title="تحريك وتكبير"
            >
              <Move className="w-4.5 h-4.5" />
              <span className="text-[10px]">تكبير وحركة</span>
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected Mode */}

        {/* Draw Controls */}
        {currentMode === 'draw' && (
          <div className="space-y-4 animate-fade-in">
            {/* Ink Color */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">لون الحبر (التصحيح):</label>
              <div className="flex gap-2.5">
                {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#18181B'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setLineColor(color)}
                    className="w-7 h-7 rounded-full border border-white/20 relative cursor-pointer"
                    style={{ backgroundColor: color }}
                  >
                    {lineColor === color && (
                      <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chisel / Calligraphy Pen Checkbox */}
            <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-850">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-zinc-200">الخط العربي (قلم مشطوف)</span>
                <span className="text-[10px] text-zinc-500">تعديل سمك الحروف بقطة القلم</span>
              </div>
              <input
                type="checkbox"
                checked={isChiselMode}
                onChange={(e) => setIsChiselMode(e.target.checked)}
                className="w-4 h-4 accent-[#d4a017] cursor-pointer"
              />
            </div>

            {/* Brush size */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 font-mono">{lineWidth} px</span>
                <span className="text-zinc-300">عرض خط القلم:</span>
              </div>
              <input
                type="range"
                min="4"
                max="80"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-full accent-[#d4a017]"
              />
            </div>

            {/* Angle for Chisel Pen */}
            {isChiselMode && (
              <div className="space-y-1 animate-slide-up">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 font-mono">{nibAngle}°</span>
                  <span className="text-zinc-300">زاوية قطة القلم (الميل):</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={nibAngle}
                  onChange={(e) => setNibAngle(parseInt(e.target.value))}
                  className="w-full accent-[#d4a017]"
                />
              </div>
            )}
          </div>
        )}

        {/* Text Mode controls */}
        {currentMode === 'text' && (
          <div className="space-y-4 animate-fade-in">
            {/* Color */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">لون النص:</label>
              <div className="flex gap-2">
                {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#18181B'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setLineColor(color)}
                    className="w-7 h-7 rounded-full border border-white/20 relative cursor-pointer"
                    style={{ backgroundColor: color }}
                  >
                    {lineColor === color && (
                      <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Predefined selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">اختر عبارة تصحيح جاهزة:</label>
              <select
                value={selectedTextIndex}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTextIndex(val === '' ? '' : parseInt(val));
                }}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-[#d4a017]"
              >
                <option value="">-- اختر عبارة من الشيت --</option>
                {predefinedTexts.map((item, idx) => (
                  <option key={idx} value={idx}>{item.title}</option>
                ))}
              </select>
            </div>

            {/* Predefined text preview */}
            {selectedTextIndex !== '' && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-xs text-zinc-400 leading-relaxed max-h-24 overflow-y-auto">
                {predefinedTexts[selectedTextIndex].phrase}
              </div>
            )}

            {/* Custom text writing */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">أو اكتب نصاً يدوياً مخصصاً:</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="اكتب ملاحظتك للخطاط هنا..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-[#d4a017]"
              />
            </div>

            {/* Text options */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">حجم الخط</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-2 py-2 text-xs text-zinc-300"
                >
                  <option value="20">20px</option>
                  <option value="30">30px</option>
                  <option value="40">40px</option>
                  <option value="50">50px</option>
                  <option value="80">80px</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">نوع الخط</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-2 py-2 text-xs text-zinc-300"
                >
                  <option value="Amiri">Amiri (عربي)</option>
                  <option value="Arial">Arial (عادي)</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 bg-[#d4a017]/5 rounded-xl border border-[#d4a017]/10 text-[10px] text-[#d4a017] leading-relaxed flex items-start gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>بعد اختيار العبارة أو كتابتها، انقر على أي موقع في الصورة لتنزيل النص وتثبيته.</span>
            </div>
          </div>
        )}

        {/* Sticker Mode controls */}
        {currentMode === 'sticker' && (
          <div className="space-y-4 animate-fade-in">
            {/* Sticker Grid picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">أختام التصحيح المتاحة:</label>
              <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 max-h-44 overflow-y-auto">
                {stickers.map((item) => (
                  <button
                    key={item.fileId}
                    type="button"
                    onClick={() => setSelectedSticker(item.fileId)}
                    className={`p-1 border-2 rounded-lg bg-zinc-900 transition-all cursor-pointer relative group ${
                      selectedSticker === item.fileId
                        ? 'border-[#d4a017]'
                        : 'border-transparent hover:border-zinc-700'
                    }`}
                  >
                    <img src={item.url} alt="Sticker" className="w-full h-12 object-contain rounded" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            {/* Size scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 font-mono">{stickerSize} px</span>
                <span className="text-zinc-300">عرض ختم التصحيح:</span>
              </div>
              <input
                type="range"
                min="50"
                max="400"
                value={stickerSize}
                onChange={(e) => setStickerSize(parseInt(e.target.value))}
                className="w-full accent-[#d4a017]"
              />
            </div>

            <p className="text-[10px] text-[#d4a017] bg-[#d4a017]/5 p-2 rounded-lg border border-[#d4a017]/10 leading-relaxed">
              اختر الختم، ثم اضغط على أي مكان باللوحة لوضع الختم بالحجم المطلوب.
            </p>
          </div>
        )}

        {/* Pan Mode controls */}
        {currentMode === 'pan' && (
          <div className="space-y-3 animate-fade-in">
            <span className="text-xs font-semibold text-zinc-400 block">لوحة تحريك الصورة المفرطة:</span>
            <div className="flex gap-2">
              <button
                onClick={handleZoomIn}
                className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
                تكبير
              </button>
              <button
                onClick={handleZoomOut}
                className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
                تصغير
              </button>
            </div>
            <button
              onClick={handleResetZoom}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs rounded-xl cursor-pointer"
            >
              إعادة الحجم الافتراضي
            </button>
          </div>
        )}

        {/* Global actions: Undo, Redo, Rotate, Clear */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">إجراءات عامة على اللوحة</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1"
              title="تراجع"
            >
              <Undo className="w-4.5 h-4.5" />
              <span className="text-[9px]">تراجع</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={redoHistory.length === 0}
              className="p-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1"
              title="إعادة"
            >
              <Redo className="w-4.5 h-4.5" />
              <span className="text-[9px]">إعادة</span>
            </button>

            <button
              onClick={handleRotateCanvas}
              className="p-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1"
              title="تدوير الصورة ٩٠ درجة"
            >
              <RotateCw className="w-4.5 h-4.5" />
              <span className="text-[9px]">تدوير</span>
            </button>

            <button
              onClick={handleClear}
              className="p-2 bg-red-950/20 hover:bg-red-950/50 border border-red-900/20 text-red-400 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1"
              title="مسح الكل"
            >
              <Eraser className="w-4.5 h-4.5" />
              <span className="text-[9px] text-red-400">مسح</span>
            </button>
          </div>
        </div>

        {/* Live Watermark Settings info preview */}
        {watermark.textPrefix && (
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 text-[10px] text-zinc-500 leading-relaxed space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 font-bold">
              <Settings className="w-3 h-3 text-[#d4a017]" />
              <span>القرية المائية النشطة (Watermark)</span>
            </div>
            <p>سيتم تضمين الختم التالي تلقائيًا عند حفظ الصورة:</p>
            <p className="bg-zinc-900 px-2 py-1.5 rounded text-[9.5px] text-[#d4a017] font-mono leading-normal">
              {watermark.textPrefix} - {studentId} - {studentName} - درس {lessonNumber}
            </p>
          </div>
        )}

      </div>

      {/* 2. Main Canvas Screen (Middle) */}
      <div className="flex-1 bg-zinc-950 border border-zinc-850 rounded-2xl p-4 overflow-hidden relative min-h-[500px] lg:min-h-[600px] flex items-center justify-center order-1 lg:order-2 shadow-2xl">
        
        {/* Dynamic Zoom Indicator badge */}
        <div className="absolute top-4 left-4 z-10 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 font-mono flex items-center gap-2">
          <span>التكبير:</span>
          <span className="font-bold text-[#d4a017]">{Math.round(scale * 100)}%</span>
        </div>

        {/* Work Area with canvas & dragging capability */}
        <div
          ref={containerRef}
          onMouseDown={handleStartInteraction}
          onMouseMove={handleInteraction}
          onMouseUp={handleEndInteraction}
          onMouseLeave={handleEndInteraction}
          onTouchStart={handleStartInteraction}
          onTouchMove={handleInteraction}
          onTouchEnd={handleEndInteraction}
          className={`relative max-w-full max-h-full overflow-hidden flex items-center justify-center ${
            currentMode === 'pan' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
          }`}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 z-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#d4a017] border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-400">جاري تحميل لوحة تصحيح الصورة...</p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="border border-zinc-800 rounded-lg bg-white shadow-2xl max-w-full transition-shadow duration-300 relative"
            id="calligraphy-canvas-board"
          />
        </div>

      </div>

    </div>
  );
}
