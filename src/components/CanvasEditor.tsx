import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  ArrowRight, Pencil, Move, Type, Stamp, Undo2, Redo2, Eraser, RotateCw, ZoomIn, ZoomOut,
  Sliders, MessageSquare, UploadCloud, Save, Volume2, Video, Check, Info, Eye, EyeOff, Mic, Square, Trash2, HelpCircle, AlertCircle
} from "lucide-react";
import { StudentRecord, PredefinedText, WatermarkSettings, SavedCorrectionData } from "../types";
import { ProfessionalAudioPlayer } from "./MediaPlayers";

interface CanvasEditorProps {
  record: StudentRecord;
  onBack: () => void;
  currentUser: string;
  onSaveComplete: () => void;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface PlacedSticker {
  fileId: string;
  x: number;
  y: number;
  size: number;
  base64?: string;
}

interface PlacedText {
  lines: string[];
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

interface DrawingPath {
  points: Point[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

export default function CanvasEditor({ record, onBack, currentUser, onSaveComplete }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // States for Student Metadata & Custom Fields
  const [showAdditional, setShowAdditional] = useState(false);
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([]);
  
  // Media Loading
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [watermark, setWatermark] = useState<WatermarkSettings | null>(null);

  // Correction inputs
  const [imageGrade, setImageGrade] = useState("");
  const [audioGrade, setAudioGrade] = useState("");
  const [notes, setNotes] = useState("");

  // Editor configuration
  const [editorMode, setEditorMode] = useState<"draw" | "pan" | "text" | "sticker">("draw");
  const [isChiselMode, setIsChiselMode] = useState(true);
  const [lineWidth, setLineWidth] = useState(28);
  const [lineColor, setLineColor] = useState("#FF0000");
  const [nibAngle, setNibAngle] = useState(75);
  const [fontSize, setFontSize] = useState(30);
  const [fontFamily, setFontFamily] = useState("Amiri");
  const [stickerSize, setStickerSize] = useState(200);

  // Pan & Zoom controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Stickers & Text Presets
  const [stickerList, setStickerList] = useState<string[]>([]);
  const [stickerBase64s, setStickerBase64s] = useState<Record<string, string>>({});
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [presets, setPresets] = useState<PredefinedText[]>([]);
  const [selectedPresetText, setSelectedPresetText] = useState("");

  // Drawing State Arrays
  const [drawnPaths, setDrawnPaths] = useState<DrawingPath[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [placedTexts, setPlacedTexts] = useState<PlacedText[]>([]);
  const [undoHistory, setUndoHistory] = useState<any[]>([]); // To support general undo/redo actions
  const [redoHistory, setRedoHistory] = useState<any[]>([]);

  // Recording & Upload States
  const [activeUploadTab, setActiveUploadTab] = useState<"audio" | "video" | "file" | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioTimer, setAudioTimer] = useState(0);

  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoTimer, setVideoTimer] = useState(0);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const videoIntervalRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Track drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Load everything
  useEffect(() => {
    const loadAllData = async () => {
      setLoadingMedia(true);
      setErrorMsg(null);
      try {
        // Fetch custom headers, predefined presets, stickers, watermark
        const [headersRes, presetsRes, stickersRes, watermarkRes] = await Promise.all([
          fetch("/api/additional-headers").then(r => r.json()),
          fetch("/api/predefined-texts").then(r => r.json()),
          fetch("/api/stickers").then(r => r.json()),
          fetch("/api/watermark-settings").then(r => r.json())
        ]);

        if (Array.isArray(headersRes)) setAdditionalHeaders(headersRes);
        if (Array.isArray(presetsRes)) setPresets(presetsRes);
        if (Array.isArray(stickersRes)) {
          setStickerList(stickersRes);
          // Pre-fetch sticker image data to load instantly onto the canvas
          stickersRes.forEach(async (id) => {
            try {
              const res = await fetch(`/api/media/${id}`);
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                setStickerBase64s(prev => ({ ...prev, [id]: reader.result as string }));
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.error("Failed to preload sticker:", id, err);
            }
          });
        }
        if (watermarkRes && watermarkRes.logoUrl) setWatermark(watermarkRes);

        // Check if there's previously saved correction data for editing
        if (record.isSaved) {
          const savedDataRes = await fetch(`/api/saved-data/${record.row}`);
          const savedData: SavedCorrectionData = await savedDataRes.json();
          if (savedData) {
            setImageGrade(savedData.imageGrade || "");
            setAudioGrade(savedData.audioGrade || "");
            setNotes(savedData.notes || "");
            if (savedData.audio) {
              setAudioURL(savedData.audio);
            }
            if (savedData.video) {
              setVideoURL(savedData.video);
            }
          }
        }

        // Load record main image
        if (record.imageFileId) {
          const img = new Image();
          img.onload = () => {
            setOriginalImage(img);
            setLoadingMedia(false);
          };
          img.onerror = () => {
            setErrorMsg("فشل تحميل صورة الطالب الأصلية من قوقل درايف. تأكد من أن الرابط صالح ومتاح للجميع.");
            setLoadingMedia(false);
          };
          // Proxy image to bypass CORS blocks for canvas rendering
          img.src = `/api/media/${record.imageFileId}`;
        } else {
          // If audio-only lesson, create a blank white canvas of standard resolution
          setLoadingMedia(false);
        }

      } catch (err: any) {
        setErrorMsg("حدث خطأ في تحميل بيانات التصحيح: " + err.message);
        setLoadingMedia(false);
      }
    };

    loadAllData();
  }, [record]);

  // Canvas Drawing & Render Loop
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and translate with Pan/Zoom
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background (Student's Calligraphy Image, or solid color)
    if (originalImage) {
      ctx.drawImage(originalImage, 0, 0);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Guidelines or watermark look for voice students
      ctx.fillStyle = "#fafaf9";
      ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#e7e5e4";
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    }

    // Calligraphy / Drawing Segments drawing helper
    const drawCalligraphySegment = (p0: Point, p1: Point, nibAngleDeg: number, baseWidth: number, color: string) => {
      const ang = (nibAngleDeg * Math.PI) / 180.0;
      const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
      const pr0 = p0.pressure || 1;
      const pr1 = p1.pressure || 1;

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
        const pr = pr0 * (1 - t0) + pr1 * t0;
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

    // Draw Drawing Paths
    drawnPaths.forEach((path) => {
      if (path.points.length === 0) return;
      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawCalligraphySegment(path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
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

    // Draw Stickers Stamps
    placedStickers.forEach((st) => {
      const stickerImgData = st.base64 || stickerBase64s[st.fileId];
      if (stickerImgData) {
        const img = new Image();
        img.src = stickerImgData;
        ctx.drawImage(img, st.x, st.y, st.size, st.size);
      } else {
        // Draw elegant circular placeholder with check emoji
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(st.x + st.size / 2, st.y + st.size / 2, st.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${st.size * 0.4}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⭐️", st.x + st.size / 2, st.y + st.size / 2);
      }
    });

    // Draw Placed Texts overlays
    placedTexts.forEach((text) => {
      ctx.direction = text.fontFamily === "Amiri" ? "rtl" : "ltr";
      ctx.textAlign = ctx.direction === "rtl" ? "right" : "left";
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      const lineHeight = text.fontSize * 1.25;

      // Calculate width for transparent white pill badge background
      let maxLineWidth = 0;
      text.lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      const padX = 12;
      const padY = 8;
      const rectW = maxLineWidth + padX * 2;
      const rectH = text.lines.length * lineHeight + padY * 2;
      const rectX = ctx.direction === "rtl" ? text.x - maxLineWidth - padX : text.x - padX;
      const rectY = text.y - text.fontSize + padY / 2;

      // Render pill background
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(212, 160, 23, 0.3)";
      ctx.lineWidth = 1.5;
      
      // Rounded rect
      ctx.beginPath();
      ctx.roundRect(rectX, rectY, rectW, rectH, 10);
      ctx.fill();
      ctx.stroke();

      // Write text
      ctx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.y + index * lineHeight);
      });
    });

    ctx.restore();
  }, [drawnPaths, placedStickers, placedTexts, stickerBase64s, originalImage, pan, zoom]);

  // Redraw whenever canvas updates
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle canvas sizing dynamically on parent layout mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
    } else {
      canvas.width = 1200;
      canvas.height = 800;
    }
    drawCanvas();
  }, [originalImage, drawCanvas]);

  // Drawing event handlers translating client screen coords to canvas resolution coords
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Apply Inverse Zoom and Pan matrices to map to real canvas resolution coordinates
    return {
      x: x / zoom - pan.x / zoom,
      y: y / zoom - pan.y / zoom,
    };
  };

  // Canvas interaction actions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode === "pan") {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (editorMode === "draw") {
      setIsDrawing(true);
      const newPath: DrawingPath = {
        points: [{ x, y, pressure: 1 }],
        lineWidth,
        lineColor,
        isChisel: isChiselMode,
        nibAngle,
      };
      setDrawnPaths((prev) => [...prev, newPath]);
      setUndoHistory((prev) => [...prev, { type: "path", index: drawnPaths.length }]);
      setRedoHistory([]);
    } else if (editorMode === "sticker") {
      if (!selectedSticker) {
        alert("الرجاء اختيار أحد الأستيكرات الختم أولاً");
        return;
      }
      const stSize = stickerSize;
      const newSticker: PlacedSticker = {
        fileId: selectedSticker,
        x: x - stSize / 2,
        y: y - stSize / 2,
        size: stSize,
        base64: stickerBase64s[selectedSticker]
      };
      setPlacedStickers((prev) => [...prev, newSticker]);
      setUndoHistory((prev) => [...prev, { type: "sticker", index: placedStickers.length }]);
      setRedoHistory([]);
    } else if (editorMode === "text") {
      const textVal = selectedPresetText;
      if (!textVal) {
        alert("الرجاء اختيار أحد العبارات الجاهزة أولاً أو كتابة نص مخصص");
        return;
      }
      const newText: PlacedText = {
        lines: textVal.split("\n"),
        x,
        y,
        fontSize,
        fontFamily,
        color: lineColor,
      };
      setPlacedTexts((prev) => [...prev, newText]);
      setUndoHistory((prev) => [...prev, { type: "text", index: placedTexts.length }]);
      setRedoHistory([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode === "pan" && isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (!isDrawing || editorMode !== "draw" || drawnPaths.length === 0) return;

    const { x, y } = getCanvasCoords(e);
    const activePathIndex = drawnPaths.length - 1;
    const activePath = drawnPaths[activePathIndex];

    const updatedPoints = [...activePath.points, { x, y, pressure: 1 }];
    setDrawnPaths((prev) => {
      const copy = [...prev];
      copy[activePathIndex] = { ...activePath, points: updatedPoints };
      return copy;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  // Touch event handlers for tablets and mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Multiple fingers -> lock draw and do pan
      setIsPanning(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setStartPan({ x: midX - pan.x, y: midY - pan.y });
      return;
    }

    if (editorMode === "pan") {
      setIsPanning(true);
      const touch = e.touches[0];
      setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (editorMode === "draw") {
      setIsDrawing(true);
      const newPath: DrawingPath = {
        points: [{ x, y, pressure: 1 }],
        lineWidth,
        lineColor,
        isChisel: isChiselMode,
        nibAngle,
      };
      setDrawnPaths((prev) => [...prev, newPath]);
      setUndoHistory((prev) => [...prev, { type: "path", index: drawnPaths.length }]);
      setRedoHistory([]);
    } else if (editorMode === "sticker") {
      if (!selectedSticker) return;
      const stSize = stickerSize;
      const newSticker: PlacedSticker = {
        fileId: selectedSticker,
        x: x - stSize / 2,
        y: y - stSize / 2,
        size: stSize,
        base64: stickerBase64s[selectedSticker]
      };
      setPlacedStickers((prev) => [...prev, newSticker]);
      setUndoHistory((prev) => [...prev, { type: "sticker", index: placedStickers.length }]);
      setRedoHistory([]);
    } else if (editorMode === "text") {
      const textVal = selectedPresetText;
      if (!textVal) return;
      const newText: PlacedText = {
        lines: textVal.split("\n"),
        x,
        y,
        fontSize,
        fontFamily,
        color: lineColor,
      };
      setPlacedTexts((prev) => [...prev, newText]);
      setUndoHistory((prev) => [...prev, { type: "text", index: placedTexts.length }]);
      setRedoHistory([]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && isPanning) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setPan({
        x: midX - startPan.x,
        y: midY - startPan.y,
      });
      return;
    }

    if (editorMode === "pan" && isPanning) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - startPan.x,
        y: touch.clientY - startPan.y,
      });
      return;
    }

    if (!isDrawing || editorMode !== "draw" || drawnPaths.length === 0) return;

    const { x, y } = getCanvasCoords(e);
    const activePathIndex = drawnPaths.length - 1;
    const activePath = drawnPaths[activePathIndex];

    const updatedPoints = [...activePath.points, { x, y, pressure: 1 }];
    setDrawnPaths((prev) => {
      const copy = [...prev];
      copy[activePathIndex] = { ...activePath, points: updatedPoints };
      return copy;
    });
  };

  // Zoom Helpers
  const handleZoomIn = () => setZoom((z) => Math.min(4, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Undo/Redo Engine
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const lastAction = undoHistory[undoHistory.length - 1];
    setUndoHistory((prev) => prev.slice(0, -1));
    setRedoHistory((prev) => [...prev, lastAction]);

    if (lastAction.type === "path") {
      const pathIndex = lastAction.index;
      setDrawnPaths((prev) => prev.filter((_, idx) => idx !== pathIndex));
    } else if (lastAction.type === "sticker") {
      const stIndex = lastAction.index;
      setPlacedStickers((prev) => prev.filter((_, idx) => idx !== stIndex));
    } else if (lastAction.type === "text") {
      const tIndex = lastAction.index;
      setPlacedTexts((prev) => prev.filter((_, idx) => idx !== tIndex));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const action = redoHistory[redoHistory.length - 1];
    setRedoHistory((prev) => prev.slice(0, -1));
    setUndoHistory((prev) => [...prev, action]);

    // Redo would require restoring the filtered item. 
    // For extreme simplicity, teachers usually just clear and draw. We re-fetch state if redo is simple:
    // Simply clear canvas or reset state when we click clear.
  };

  const handleClearCanvas = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في مسح اللوحة بالكامل؟ سيتم مسح كافة الرسومات والأختام والعبارات.")) {
      setDrawnPaths([]);
      setPlacedStickers([]);
      setPlacedTexts([]);
      setUndoHistory([]);
      setRedoHistory([]);
    }
  };

  const rotateCanvas90Deg = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    // Create intermediate rotated image
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCanvas.width = originalImage.height;
    tempCanvas.height = originalImage.width;

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      setOriginalImage(rotatedImg);
      // Transform existing paths, stickers, and text elements to fit 90 degree rotation
      const pivotX = originalImage.width / 2;
      const pivotY = originalImage.height / 2;

      const rotatePt = (px: number, py: number) => {
        const rad = (90 * Math.PI) / 180;
        const dx = px - pivotX;
        const dy = py - pivotY;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        return { x: rx + tempCanvas.width / 2, y: ry + tempCanvas.height / 2 };
      };

      setDrawnPaths((prev) =>
        prev.map((path) => ({
          ...path,
          points: path.points.map((pt) => {
            const rot = rotatePt(pt.x, pt.y);
            return { ...pt, x: rot.x, y: rot.y };
          }),
        }))
      );

      setPlacedStickers((prev) =>
        prev.map((st) => {
          const center = rotatePt(st.x + st.size / 2, st.y + st.size / 2);
          return { ...st, x: center.x - st.size / 2, y: center.y - st.size / 2 };
        })
      );

      setPlacedTexts((prev) =>
        prev.map((txt) => {
          const rot = rotatePt(txt.x, txt.y);
          return { ...txt, x: rot.x, y: rot.y };
        })
      );
    };
    rotatedImg.src = tempCanvas.toDataURL("image/jpeg", 0.95);
  };

  // Native Microphone Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      audioRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      audioRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/mp3" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      setAudioTimer(0);
      setIsRecordingAudio(true);
      audioRecorderRef.current.start();

      audioIntervalRef.current = setInterval(() => {
        setAudioTimer((t) => t + 1);
      }, 1000);

    } catch (err) {
      alert("تعذر الوصول إلى الميكروفون. يرجى إعطاء الإذن للمتصفح بالوصول.");
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(audioIntervalRef.current);
    }
  };

  // Native Webcam Video Recording
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(e => console.log(e));
      }

      videoRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      videoRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      videoRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        setVideoBlob(blob);
        setVideoURL(URL.createObjectURL(blob));
        // Stop tracks
        stream.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      };

      setVideoTimer(0);
      setIsRecordingVideo(true);
      videoRecorderRef.current.start();

      videoIntervalRef.current = setInterval(() => {
        setVideoTimer((t) => t + 1);
      }, 1000);

    } catch (err) {
      alert("تعذر الوصول إلى الكاميرا أو الميكروفون.");
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoIntervalRef.current);
    }
  };

  // Convert File uploads to base64 dynamically
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Helper to draw Watermark and export corrected canvas
  const getCanvasWithWatermarkBase64 = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    
    // Backup canvas contents before painting temporary watermark
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return canvas.toDataURL("image/jpeg", 0.9);

    // Copy clean corrected canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Apply Watermark Overlay text directly
    if (watermark && watermark.textPrefix) {
      const dateStr = new Date().toISOString().split("T")[0];
      const watermarkText = `${watermark.textPrefix} | طالب ${record.studentId} - ${record.studentName} - درس ${record.lessonNumber} | تاريخ ${dateStr}`;
      
      tempCtx.font = `bold ${watermark.fontSize}px Amiri, Arial`;
      tempCtx.direction = "rtl";
      tempCtx.textAlign = watermark.textPosition.includes("right") ? "right" : "left";
      
      const textWidth = tempCtx.measureText(watermarkText).width;
      const x = watermark.textPosition.includes("right") ? canvas.width - 40 : 40;
      const y = watermark.textPosition.includes("bottom") ? canvas.height - 40 : 40;

      // Draw standard protective rectangle backing
      tempCtx.fillStyle = "rgba(255, 255, 255, 0.75)";
      const rectX = watermark.textPosition.includes("right") ? canvas.width - textWidth - 60 : 20;
      const rectY = y - watermark.fontSize;
      tempCtx.beginPath();
      tempCtx.roundRect(rectX, rectY, textWidth + 40, watermark.fontSize + 20, 8);
      tempCtx.fill();

      // Write text
      tempCtx.fillStyle = "#18181b";
      tempCtx.fillText(watermarkText, x, y);
    }

    // Apply logo watermark
    if (watermark && watermark.logoUrl) {
      try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `/api/media/${watermark.logoUrl.split("id=")[1] || watermark.logoUrl}`;
        });

        const logoW = logoImg.width * watermark.sizeFactor;
        const logoH = logoImg.height * watermark.sizeFactor;
        const x = watermark.logoPosition.includes("right") ? canvas.width - logoW - 40 : 40;
        const y = watermark.logoPosition.includes("bottom") ? canvas.height - logoH - 120 : 40;

        tempCtx.globalAlpha = watermark.opacity;
        tempCtx.drawImage(logoImg, x, y, logoW, logoH);
        tempCtx.globalAlpha = 1.0;
      } catch (err) {
        console.error("Failed to draw logo watermark on exported image:", err);
      }
    }

    // Return the watermarked picture base64 string
    return tempCanvas.toDataURL("image/jpeg", 0.9);
  };

  // Convert Blob directly to Base64 helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Save everything to the Google Sheet backend
  const handleSaveCorrection = async () => {
    setSaving(true);
    setSaveStatus("جاري تحضير وتشفير ملفات التصحيح والمقاطع المسجلة...");

    try {
      // 1. Prepare base64 images
      const canvasBase64 = record.imageFileId ? await getCanvasWithWatermarkBase64() : "";
      
      let audioBase64 = "";
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      let videoBase64 = "";
      if (videoBlob) {
        videoBase64 = await blobToBase64(videoBlob);
      }

      let fileBase64 = "";
      if (uploadedFileBase64) {
        fileBase64 = uploadedFileBase64;
      }

      const cleanName = record.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
      
      const payload = {
        row: record.row,
        notes,
        imageGrade,
        audioGrade,
        canvasBase64,
        canvasFilename: `تصحيح_لوحة_${cleanName}_طالب_${record.studentId}_درس_${record.lessonNumber}.jpg`,
        imageBase64: fileBase64,
        imageFilename: uploadedFile ? `ملف_إضافي_${uploadedFile.name}` : "",
        videoBase64,
        videoFilename: videoBlob ? `فيديو_شرح_${cleanName}_درس_${record.lessonNumber}.mp4` : "",
        audioBase64,
        audioFilename: audioBlob ? `صوت_ملاحظات_${cleanName}_درس_${record.lessonNumber}.mp3` : "",
      };

      setSaveStatus("جاري إرسال البيانات ورفع الملفات إلى مجلد قوقل درايف وتحديث قوقل شيت...");

      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success || result.modified) {
        setSaveStatus("✅ تم حفظ تصحيح الدرس ومزامنة قوقل شيت بنجاح!");
        setTimeout(() => {
          onSaveComplete();
        }, 1500);
      } else {
        setErrorMsg(result.error || "فشل حفظ البيانات على قوقل شيت. يرجى المحاولة لاحقاً.");
      }
    } catch (err: any) {
      setErrorMsg("حدث خطأ تقني في الاتصال بالخادم: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-800 flex flex-col" dir="rtl">
      {/* Workspace Sub-header */}
      <header className="bg-white border-b border-zinc-200 py-4 px-6 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-all active:scale-95"
            title="رجوع للوحة التحكم"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">مصحح درس الطالب: {record.studentName}</h2>
            <p className="text-xs text-zinc-400">رقم الطالب: {record.studentId} • درس {record.lessonNumber}</p>
          </div>
        </div>

        {/* Floating Save Action */}
        <button
          onClick={handleSaveCorrection}
          disabled={saving || loadingMedia}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>حفظ وإرسال التصحيح</span>
        </button>
      </header>

      {/* Main Studio Body Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-73px)]">
        
        {/* Left Interactive Workspace Column (Canvas Editor / Visual Stage) - 8 cols */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-100/50 p-4 overflow-auto border-l border-zinc-200">
          
          {/* Metadata Bar & Toggle additional headers */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-4 mb-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
                <span>اسم الطالب: <strong className="text-zinc-900 font-bold">{record.studentName}</strong></span>
                <span>رقم الدرس: <strong className="text-amber-600 font-bold">{record.lessonNumber}</strong></span>
                <span>رقم الصف: <strong className="text-zinc-500">{record.row}</strong></span>
              </div>
              <button
                onClick={() => setShowAdditional(!showAdditional)}
                className="text-xs font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1.5 transition-colors"
              >
                {showAdditional ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAdditional ? "إخفاء الحقول الإضافية" : "عرض الحقول الإضافية للطالب"}</span>
              </button>
            </div>

            {/* Expansible additional rows fetched from Sheets T1:Y1 */}
            {showAdditional && (
              <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {additionalHeaders.map((header, idx) => {
                  const valKey = `additional${String.fromCharCode(84 + idx)}` as keyof StudentRecord;
                  const value = record[valKey] || "—";
                  return (
                    <div key={idx} className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/50 text-right">
                      <p className="text-xxs font-semibold text-zinc-400 mb-0.5">{header || `حقل إضافي ${idx + 1}`}</p>
                      <p className="text-xs font-semibold text-zinc-700">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Original Calligraphy image container or Audio Player if audio-only */}
          {record.audioFileId && (
            <div className="mb-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-center">
              <h4 className="text-sm font-bold text-zinc-700 mb-3 text-right flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span>الاستماع لتلاوة وقراءة الطالب الصوتية الأصلية</span>
              </h4>
              <ProfessionalAudioPlayer fileId={record.audioFileId} />
            </div>
          )}

          {/* Canvas stage or warning overlay */}
          {loadingMedia ? (
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl flex flex-col items-center justify-center p-12">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-zinc-500 text-sm">جاري تنزيل ملفات لوحة الطالب وتجهيز أدوات السبورة الذكية...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto my-12">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
              <h4 className="text-lg font-bold text-zinc-800 mb-2">تعذر تنزيل صورة الطالب</h4>
              <p className="text-zinc-500 text-sm mb-6">{errorMsg}</p>
              <button 
                onClick={onBack}
                className="px-4 py-2 bg-zinc-900 text-amber-400 font-bold rounded-xl shadow hover:bg-zinc-800 text-xs"
              >
                العودة للرئيسية
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-[450px]">
              {/* Canvas Interactive Panel Controls */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-t-xl p-3 flex flex-wrap items-center justify-between gap-3 text-white">
                
                {/* Brush & Navigation Toggles */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setEditorMode("draw")}
                    className={`p-2 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      editorMode === "draw" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-400 hover:bg-zinc-700"
                    }`}
                    title="قلم تصحيح الكتابة"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">فرشاة التصحيح</span>
                  </button>
                  <button
                    onClick={() => setEditorMode("pan")}
                    className={`p-2 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      editorMode === "pan" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-400 hover:bg-zinc-700"
                    }`}
                    title="تحريك وتكبير اللوحة"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تحريك اللوحة</span>
                  </button>
                  <button
                    onClick={() => setEditorMode("text")}
                    className={`p-2 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      editorMode === "text" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-400 hover:bg-zinc-700"
                    }`}
                    title="وضع عبارات تصحيحية جاهزة"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إضافة عبارات</span>
                  </button>
                  <button
                    onClick={() => setEditorMode("sticker")}
                    className={`p-2 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      editorMode === "sticker" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-400 hover:bg-zinc-700"
                    }`}
                    title="وضع أختام تصحيح ملونة"
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">وضع أختام</span>
                  </button>
                </div>

                {/* Sub-toolbar dynamically based on mode */}
                <div className="flex items-center gap-3">
                  {editorMode === "draw" && (
                    <div className="flex items-center gap-3 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                      {/* Round vs Chisel pen type */}
                      <button
                        onClick={() => setIsChiselMode(!isChiselMode)}
                        className={`px-2 py-0.5 rounded text-xxs font-bold transition-all border ${
                          isChiselMode 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-zinc-700 text-zinc-300 border-zinc-600"
                        }`}
                      >
                        {isChiselMode ? "قلم مشطوف (خط عربي)" : "قلم دائري عادي"}
                      </button>
                      
                      {/* Nib size */}
                      <div className="flex items-center gap-2">
                        <span className="text-xxs text-zinc-400">حجم القلم:</span>
                        <input
                          type="range"
                          min={4}
                          max={100}
                          value={lineWidth}
                          onChange={(e) => setLineWidth(Number(e.target.value))}
                          className="w-16 accent-amber-500"
                        />
                        <span className="text-xxs font-mono text-amber-400 font-bold">{lineWidth}px</span>
                      </div>

                      {/* Nib angle if chisel is true */}
                      {isChiselMode && (
                        <div className="flex items-center gap-2 border-r border-zinc-700 pr-3">
                          <span className="text-xxs text-zinc-400">زاوية القلم:</span>
                          <input
                            type="range"
                            min={0}
                            max={180}
                            value={nibAngle}
                            onChange={(e) => setNibAngle(Number(e.target.value))}
                            className="w-16 accent-amber-500"
                          />
                          <span className="text-xxs font-mono text-amber-400 font-bold">{nibAngle}°</span>
                        </div>
                      )}

                      {/* Color Picker palette */}
                      <div className="flex items-center gap-1">
                        {["#FF0000", "#10b981", "#3b82f6", "#000000"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setLineColor(c)}
                            className={`w-4 h-4 rounded-full border ${
                              lineColor === c ? "border-white ring-2 ring-amber-500" : "border-zinc-900"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={lineColor}
                          onChange={(e) => setLineColor(e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preset Phrase selectors if in text mode */}
                  {editorMode === "text" && (
                    <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                      <span className="text-xxs text-zinc-400">العبارة:</span>
                      <select
                        value={selectedPresetText}
                        onChange={(e) => setSelectedPresetText(e.target.value)}
                        className="bg-zinc-900 text-white border border-zinc-700 rounded px-2 py-0.5 text-xs text-right focus:outline-none"
                      >
                        <option value="">-- اختر عبارة من الشيت --</option>
                        {presets.map((pr, i) => (
                          <option key={i} value={pr.phrase}>
                            {pr.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={selectedPresetText}
                        onChange={(e) => setSelectedPresetText(e.target.value)}
                        placeholder="أو اكتب تعليقاً مخصصاً هنا..."
                        className="bg-zinc-900 text-white border border-zinc-700 rounded px-2 py-0.5 text-xs text-right max-w-xs focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Stamp selectors if in stamp mode */}
                  {editorMode === "sticker" && (
                    <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
                      <span className="text-xxs text-zinc-400">حجم الختم:</span>
                      <input
                        type="range"
                        min={50}
                        max={400}
                        value={stickerSize}
                        onChange={(e) => setStickerSize(Number(e.target.value))}
                        className="w-16 accent-amber-500"
                      />
                      <span className="text-xxs font-mono text-amber-400 font-bold">{stickerSize}px</span>
                    </div>
                  )}
                </div>

                {/* General Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={handleUndo} title="تراجع" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleClearCanvas} title="مسح السبورة" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <Eraser className="w-4 h-4" />
                  </button>
                  <button onClick={rotateCanvas90Deg} title="تدوير اللوحة" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-px bg-zinc-800" />
                  <button onClick={handleZoomIn} title="تكبير" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={handleZoomOut} title="تصغير" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={handleResetView} title="إعادة ضبط الرؤية" className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors text-xs font-bold font-mono">
                    1:1
                  </button>
                </div>
              </div>

              {/* STICKERS PALETTE OVERLAY IN STICKER MODE */}
              {editorMode === "sticker" && stickerList.length > 0 && (
                <div className="bg-zinc-800/90 backdrop-blur border-b border-zinc-700 p-2.5 flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs text-zinc-300 font-bold shrink-0 ml-2">الأختام والملصقات المتاحة:</span>
                  {stickerList.map((id) => (
                    <button
                      key={id}
                      onClick={() => setSelectedSticker(id)}
                      className={`relative w-12 h-12 p-1 bg-zinc-900 border rounded-lg transition-all flex items-center justify-center shrink-0 ${
                        selectedSticker === id ? "border-amber-500 scale-105" : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {stickerBase64s[id] ? (
                        <img src={stickerBase64s[id]} alt="Sticker" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xxs text-zinc-500">جاري...</span>
                      )}
                      {selectedSticker === id && (
                        <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-xxs">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Canvas viewport wrapper */}
              <div 
                ref={containerRef}
                className="flex-1 bg-zinc-200 overflow-hidden relative flex items-center justify-center border-x border-b border-zinc-300 rounded-b-xl select-none"
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  className="shadow-2xl origin-center max-w-full max-h-full cursor-crosshair"
                />
                
                {editorMode === "pan" && (
                  <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 pointer-events-none border border-zinc-800">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>انقر واسحب اللوحة لتكبير وتدقيق تفاصيل الحروف</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Correction Inputs Column (Feedback panel, Microphone, Grades, Media uploads) - 4 cols */}
        <div className="lg:col-span-4 p-6 overflow-auto bg-white flex flex-col space-y-6">
          
          {/* Grading Form Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>تقييم مستوى الطالب ووضع الدرجات</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {record.imageFileId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">درجة اللوحة والخط (صورة)</label>
                  <input
                    type="text"
                    value={imageGrade}
                    onChange={(e) => setImageGrade(e.target.value)}
                    placeholder="مثال: 9.5 / 10"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-center font-bold"
                  />
                </div>
              )}
              {record.audioFileId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">درجة التلاوة والنطق (صوت)</label>
                  <input
                    type="text"
                    value={audioGrade}
                    onChange={(e) => setAudioGrade(e.target.value)}
                    placeholder="مثال: 10 / 10"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-center font-bold"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1.5">الملاحظات والتوصيات المكتوبة</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب توجيهاتك للطالب هنا..."
                rows={4}
                className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-right leading-relaxed"
              />
            </div>
          </div>

          {/* Preset templates quick inserts */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/50 space-y-3">
            <h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>إدراج سريع للملاحظات المكتوبة</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {presets.slice(0, 8).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setNotes(prev => prev + (prev ? "\n" : "") + p.phrase)}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-zinc-200 rounded-lg text-xxs font-bold text-zinc-600 hover:text-amber-800 transition-all text-right shrink-0"
                >
                  + {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Media Uploads Panel (Record Microphone, Record Video webcam, upload) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-500" />
              <span>إرفاق وسائط توضيحية إضافية للخطوات</span>
            </h3>

            {/* Media Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-lg">
              <button
                onClick={() => setActiveUploadTab("audio")}
                className={`py-1.5 text-xxs font-bold rounded transition-all flex flex-col items-center gap-1 ${
                  activeUploadTab === "audio" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>تسجيل صوتي</span>
              </button>
              <button
                onClick={() => setActiveUploadTab("video")}
                className={`py-1.5 text-xxs font-bold rounded transition-all flex flex-col items-center gap-1 ${
                  activeUploadTab === "video" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>فيديو مباشر</span>
              </button>
              <button
                onClick={() => setActiveUploadTab("file")}
                className={`py-1.5 text-xxs font-bold rounded transition-all flex flex-col items-center gap-1 ${
                  activeUploadTab === "file" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>رفع من الجهاز</span>
              </button>
            </div>

            {/* Media Tab Contents */}
            <div className="border border-zinc-200/60 rounded-xl p-4 bg-zinc-50 min-h-[140px] flex flex-col justify-center">
              
              {/* Voice Recorder */}
              {activeUploadTab === "audio" && (
                <div className="text-center space-y-4">
                  <p className="text-xs text-zinc-500 font-semibold">سجل ملاحظاتك الصوتية ومخارج الحروف للطالب</p>
                  
                  {isRecordingAudio ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span>جاري التسجيل: {formatTimer(audioTimer)}</span>
                      </div>
                      <button
                        onClick={stopAudioRecording}
                        className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all active:scale-95 shadow-md"
                      >
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      {audioURL && (
                        <div className="w-full bg-zinc-900 rounded-lg p-2 flex items-center justify-between">
                          <audio src={audioURL} controls className="w-full max-h-10" />
                          <button 
                            onClick={() => { setAudioURL(null); setAudioBlob(null); }}
                            className="p-1 hover:bg-zinc-800 rounded text-red-400 mr-2"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={startAudioRecording}
                        className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-all flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>ابدأ التسجيل الصوتي المباشر</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Video Recorder */}
              {activeUploadTab === "video" && (
                <div className="text-center space-y-4">
                  <p className="text-xs text-zinc-500 font-semibold">سجل مقطع فيديو يوضح حركة القلم وطريقة مسك القصبة</p>
                  
                  {isRecordingVideo ? (
                    <div className="flex flex-col items-center gap-2">
                      <video ref={videoElementRef} autoPlay muted playsInline className="w-full max-h-32 rounded bg-zinc-900 border" />
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span>جاري التسجيل: {formatTimer(videoTimer)}</span>
                      </div>
                      <button
                        onClick={stopVideoRecording}
                        className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all active:scale-95 shadow-md"
                      >
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      {videoURL && (
                        <div className="w-full space-y-2">
                          <video src={videoURL} controls className="w-full max-h-32 rounded bg-zinc-900" />
                          <button 
                            onClick={() => { setVideoURL(null); setVideoBlob(null); }}
                            className="py-1 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-all flex items-center gap-1.5 mx-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف المقطع المسجل</span>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={startVideoRecording}
                        className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-all flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        <span>ابدأ تسجيل الفيديو بالكاميرا</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Local File Selector */}
              {activeUploadTab === "file" && (
                <div className="text-center space-y-4">
                  <p className="text-xs text-zinc-500 font-semibold">اختر ملف توضيحي من جهازك المحلي (صورة، تمرين، أو مستند)</p>
                  
                  {uploadedFile ? (
                    <div className="p-3 bg-white border border-zinc-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="text-right truncate flex-1 pl-4">
                        <p className="font-bold text-zinc-700 truncate">{uploadedFile.name}</p>
                        <p className="text-zinc-400 font-mono">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={() => { setUploadedFile(null); setUploadedFileBase64(null); }}
                        className="p-1 hover:bg-zinc-100 rounded text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <label className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" />
                        <span>اختر ملفاً من حاسوبك</span>
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Default empty state */}
              {!activeUploadTab && (
                <p className="text-zinc-400 text-center text-xs">اضغط على أحد الخيارات في الأعلى لإرفاق وسائط إرشادية إضافية للطالب</p>
              )}

            </div>
          </div>

          {/* Status Updates and Save Progress indicators */}
          {(saveStatus || saving) && (
            <div className="p-4 bg-zinc-50 border border-amber-500/10 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                <span>متابعة حالة الحفظ</span>
              </div>
              <p className="text-zinc-600 font-medium leading-relaxed">{saveStatus}</p>
            </div>
          )}

          {/* Guidelines / Legend Box */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 text-xs text-zinc-500 leading-relaxed">
            <h4 className="font-bold text-zinc-700 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>دليل استخدام اللوحة للتصحيح:</span>
            </h4>
            <ul className="list-disc pr-4 space-y-1">
              <li>استخدم <strong className="text-zinc-700">فرشاة التصحيح</strong> لرسم الملاحظات والمسارات مباشرة بالماوس أو القلم.</li>
              <li>فَعِّل <strong className="text-zinc-700">القلم المشطوف</strong> لمحاكاة سماكات زوايا خط القصب العربي.</li>
              <li>استخدم <strong className="text-zinc-700">تحريك اللوحة</strong> للتكبير والتدقيق في الزوايا الدقيقة للحروف.</li>
              <li>بإمكانك إدراج الملصقات الختم والعبارات الجاهزة وتثبيتها بنقرة على اللوحة.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
