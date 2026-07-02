/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import {
  BookOpen,
  Volume2,
  Image as ImageIcon,
  AudioLines,
  Search,
  Settings,
  CheckCircle,
  Clock,
  ArrowLeft,
  Pencil,
  Undo,
  Redo,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Contrast,
  Stamp,
  Type,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Minus,
  Save,
  FileText,
  Check,
  Loader2,
  Mic,
  Play,
  Pause,
  FastForward,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Info,
  Layers,
  ChevronLeft,
  Sliders,
  Highlighter
} from 'lucide-react';
import {
  fetchStudentLessons,
  fetchPredefinedTexts,
  fetchWatermarkSettings,
  saveSheetsConfig,
  getSheetsConfig,
  isLiveMode,
  saveLessonCorrection,
  testSheetsConnection,
  StudentLesson,
  PredefinedText,
  WatermarkSettings
} from './googleSheetsApi';

export default function App() {
  // Application Views
  type View = 'list' | 'image-editor' | 'audio-reviewer' | 'settings';
  const [currentView, setCurrentView] = useState<View>('list');

  // Configuration States
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');

  // Student Lessons State
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'corrected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'audio'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active Lesson Context
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null);
  const [notes, setNotes] = useState('');
  const [grade, setGrade] = useState('');
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [watermark, setWatermark] = useState<WatermarkSettings | null>(null);

  // Image Blackboard Canvas Canvas Ref & Configurations
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Drawing Tools
  type DrawMode = 'draw' | 'highlighter' | 'shape-line' | 'shape-arrow' | 'shape-circle' | 'shape-rect' | 'stamp' | 'text' | 'pan';
  const [drawMode, setDrawMode] = useState<DrawMode>('draw');
  const [lineWidth, setLineWidth] = useState(12);
  const [lineColor, setLineColor] = useState('#ef4444'); // Standard correction red
  const [isChiselMode, setIsChiselMode] = useState(false);
  const [chiselAngle, setChiselAngle] = useState(45);
  const [textSize, setTextSize] = useState(24);
  const [textFont, setTextFont] = useState('Amiri');
  const [textCaption, setTextCaption] = useState('');
  const [textBgEnabled, setTextBgEnabled] = useState(true);

  // Selected Stamp
  const [selectedStamp, setSelectedStamp] = useState('ممتاز');
  const stampsList = [
    { text: 'ممتاز 🌟', label: 'ممتاز' },
    { text: 'رائع 👏', label: 'رائع' },
    { text: 'أحسنت 👍', label: 'أحسنت' },
    { text: 'تم التصحيح ✅', label: 'مكتمل' },
    { text: 'يحتاج مراجعة 📝', label: 'راجع' }
  ];

  // Image Adjustment Filters (Brightness, Contrast, Rotation)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [imgRotation, setImgRotation] = useState(0); // 0, 90, 180, 270

  // History Stack (Undo / Redo)
  interface DrawingAction {
    id: string;
    type: DrawMode;
    points: { x: number; y: number; pressure?: number }[];
    color: string;
    width: number;
    chisel?: boolean;
    chiselAngle?: number;
    text?: string;
    font?: string;
    textSize?: number;
    bgEnabled?: boolean;
    stampText?: string;
  }
  const [actionsHistory, setActionsHistory] = useState<DrawingAction[]>([]);
  const [redoHistory, setRedoHistory] = useState<DrawingAction[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>([]);

  // Audio Reviewer State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Microphone Teacher Voice Recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingAudioLevel, setRecordingAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form Uploading States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [additionalImg, setAdditionalImg] = useState<string | null>(null);
  const [showPredefinedModal, setShowPredefinedModal] = useState(false);

  // Copyable GAS Script Code Block
  const gasCodeSnippet = `/**
 * سكربت Google Apps Script المتكامل لمدرسة القرآن الكريم الرقمية
 * قم بنسخ هذا الكود بالكامل واستبدال أي كود سابق في مشروع Apps Script الخاص بك (Code.gs)
 * تأكد من إعادة نشر المشروع كـ Web App مع منح الصلاحية لـ "Anyone" للوصول.
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var spreadsheetId = payload.spreadsheetId;
    var params = payload.params || [];
    
    // فتح جدول البيانات بناءً على المعرف المرسل أو المفتوح حالياً
    var ss;
    if (spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(spreadsheetId);
      } catch (err) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) {
      throw new Error("لم يتم العثور على ملف جدول البيانات. يرجى مراجعة معرف جدول البيانات (Spreadsheet ID) والتأكد من إذن الوصول.");
    }

    var result;
    
    if (action === 'getTableData') {
      result = getTableData(ss);
    } else if (action === 'getPredefinedTexts') {
      result = getPredefinedTexts(ss);
    } else if (action === 'getWatermarkSettings') {
      result = getWatermarkSettings(ss);
    } else if (action === 'saveAllMedia') {
      // تمرير جدول البيانات كأول معلمة
      var allParams = [ss].concat(params);
      result = saveAllMedia.apply(null, allParams);
    } else {
      throw new Error('الإجراء غير مدعوم: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة جلب بيانات الطلاب مع ميزة الإصلاح التلقائي إذا كانت الصفحة فارغة
function getTableData(ss) {
  var sheet = ss.getSheetByName('A1');
  
  // إذا لم تكن الصفحة 'A1' موجودة، نقوم بإنشائها وتهيئتها بالبيانات الافتراضية
  if (!sheet) {
    sheet = ss.insertSheet('A1');
    initializeSheetWithMockData(sheet);
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    initializeSheetWithMockData(sheet);
    lastRow = sheet.getLastRow();
  }
  
  var dataRange = sheet.getRange(2, 1, lastRow - 1, 25).getValues();
  var result = [];
  
  for (var i = 0; i < dataRange.length; i++) {
    var rowData = dataRange[i];
    if (!rowData[1]) continue; // تخطي السطور التي ليس بها اسم طالب
    
    var imageVal = String(rowData[4] || '');
    var imageFileId = extractFileId(imageVal);
    
    var audioVal = String(rowData[6] || '');
    var audioFileId = extractFileId(audioVal);
    
    result.push({
      row: i + 2, // رقم السطر الفعلي في الشيت للمرجع عند التعديل
      studentId: String(rowData[0] || ''),
      studentName: String(rowData[1] || ''),
      lessonNumber: String(rowData[2] || ''),
      imageSubmissionCount: Number(rowData[3]) || 0,
      imageFileId: imageFileId || imageVal,
      audioSubmissionCount: Number(rowData[5]) || 0,
      audioFileId: audioFileId || audioVal,
      isSaved: rowData[7] === 'تم' || rowData[7] === 'نعم' || rowData[7] === true,
      notes: String(rowData[8] || ''),
      imageGrade: String(rowData[9] || ''),
      modifiedImage: String(rowData[10] || ''),
      audioGrade: String(rowData[11] || ''),
      additionalImage: String(rowData[12] || ''),
      video: String(rowData[13] || ''),
      audio: String(rowData[14] || ''),
      saveDate: String(rowData[15] || ''),
      cumulativeCount: Number(rowData[16]) || 0,
      additionalT: String(rowData[19] || ''),
      additionalU: String(rowData[20] || ''),
      additionalV: String(rowData[21] || ''),
      additionalW: String(rowData[22] || ''),
      additionalX: String(rowData[23] || ''),
      additionalY: String(rowData[24] || '')
    });
  }
  
  return result;
}

// دالة جلب عبارات التصحيح السريعة
function getPredefinedTexts(ss) {
  var sheet = ss.getSheetByName('PredefinedTexts');
  if (!sheet) {
    sheet = ss.insertSheet('PredefinedTexts');
    sheet.appendRow(["العنوان", "العبارة"]);
    var defaultTexts = [
      ["تشجيع متميز جداً", "أداء متميز وتلاوة خاشعة تبارك الرحمن! بارك الله فيك ونفع بك الإسلام والمسلمين يا بني."],
      ["تشجيع للخطوط والصور", "خط جميل ومرتب والتزام رائع بالكتابة على السطر. استمر في هذا العطاء والتميز!"],
      ["ملاحظة الغنة والإخفاء", "قراءتك ممتازة، لكن انتبه لزمن الغنة في حكم الإخفاء والادغام، أعطها حركتين كاملتين."],
      ["ملاحظة مخارج الحروف", "يرجى الانتباه لمخارج الحروف اللثوية (الذال، الثاء، الظاء)، أخرج طرف لسانك قليلاً."],
      ["خطأ إملائي يحتاج تعديل", "هناك خطأ إملائي بسيط قمت بالإشارة إليه باللون الأحمر على السبورة، يرجى إعادة كتابة الكلمة وتصحيحها."],
      ["إعادة تلاوة واجبة", "توجد أخطاء في تشكيل بعض الكلمات مما يغير المعنى. يرجى الاستماع للتصحيح وإعادة تسجيل التلاوة."]
    ];
    sheet.getRange(2, 1, defaultTexts.length, 2).setValues(defaultTexts);
  }
  
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      result.push({
        title: String(data[i][0]),
        phrase: String(data[i][1] || '')
      });
    }
  }
  return result;
}

// دالة جلب إعدادات العلامة المائية للشهادات والصور
function getWatermarkSettings(ss) {
  var sheet = ss.getSheetByName('WatermarkSettings');
  if (!sheet) {
    sheet = ss.insertSheet('WatermarkSettings');
    sheet.appendRow(["المفتاح", "القيمة"]);
    var defaultSettings = [
      ["logoUrl", ""],
      ["opacity", "0.45"],
      ["sizeFactor", "0.8"],
      ["logoPosition", "top-left"],
      ["textPrefix", "مدرسة القرآن الكريم الرقمية - تصحيح المعلم"],
      ["fontSize", "22"],
      ["textPosition", "bottom-left"]
    ];
    sheet.getRange(2, 1, defaultSettings.length, 2).setValues(defaultSettings);
  }
  
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      settings[data[i][0]] = data[i][1];
    }
  }
  return settings;
}

// تنسيق التاريخ والوقت
function formatDateTime(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear(),
      hours = '' + d.getHours(),
      minutes = '' + d.getMinutes(),
      seconds = '' + d.getSeconds();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  if (hours.length < 2) hours = '0' + hours;
  if (minutes.length < 2) minutes = '0' + minutes;
  if (seconds.length < 2) seconds = '0' + seconds;

  return [year, month, day].join('-') + ' ' + [hours, minutes, seconds].join(':');
}

// دالة مساعدة لاستخراج معرف الملف من روابط جوجل درايف
function extractFileId(url) {
  if (!url) return "";
  var match = String(url).match(/(?:id=|\\/d\\/|folders\\/)([a-zA-Z0-9-_]{25,})[\\/\\?]?/);
  return match ? match[1] : "";
}

// دالة تهيئة الشيت بالبيانات الافتراضية للطلاب
function initializeSheetWithMockData(sheet) {
  sheet.clear();
  var headers = [
    "رقم الطالب", "اسم الطالب", "رقم الدرس", "عدد مرات إرسال الصورة", 
    "رابط الصورة", "عدد مرات إرسال الصوت", "رابط الصوت", "حالة الحفظ / الفحص", 
    "الملاحظات", "درجات الصورة", "الصورة المعدلة", "درجات الصوت", 
    "الصورة الإضافية", "الفيديو", "الصوت", "تاريخ التصحيح", "رقم التصحيح التراكمي"
  ];
  sheet.appendRow(headers);
  
  var mockRows = [
    [
      "1001", "عبدالرحمن بن فيصل السديري", "10", 2, 
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800", 0, "", 
      "", "", "", "", "", "", "", "", "", 0
    ],
    [
      "1002", "سارة بنت خالد ال سعود", "12", 1, 
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800", 0, "", 
      "", "", "", "", "", "", "", "", "", 0
    ],
    [
      "1003", "عمر بن سليمان الحربي", "5", 0, 
      "", 1, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
      "", "", "", "", "", "", "", "", "", 0
    ],
    [
      "1004", "يوسف بن المطيري الخالدي", "14", 3, 
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800", 0, "", 
      "", "", "", "", "", "", "", "", "", 0
    ],
    [
      "1005", "ريم بنت مساعد الدوسري", "2", 0, 
      "", 1, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 
      "", "", "", "", "", "", "", "", "", 0
    ]
  ];
  
  sheet.getRange(2, 1, mockRows.length, headers.length).setValues(mockRows);
  
  // وضع العناوين الإضافية المخصصة في العمود T إلى Y
  sheet.getRange("T1:Y1").setValues([["حلقة الحفظ", "اسم المعلم", "مستوى الطالب", "تاريخ الاستلام", "الملاحظة السابقة", "التقدير التراكمي"]]);
  
  var extraRows = [
    ["حلقة الأوزاعي", "الشيخ عبد الله القرني", "ممتاز", "2026-07-01", "مخارج الحروف جيدة جداً", "أ"],
    ["حلقة الأوزاعي", "الشيخ عبد الله القرني", "جيد جداً", "2026-07-01", "انتبه لمخارج الصاد والضاد", "ب"],
    ["حلقة ابن كثير", "الشيخ عمر الفاروق", "ممتاز", "2026-07-01", "ترتيل هادئ وجميل", "أ"],
    ["حلقة ابن كثير", "الشيخ عمر الفاروق", "مقبول", "2026-07-01", "يحتاج لتدريب أكثر على الغنة", "ج"],
    ["حلقة حفص", "الشيخ ياسر الدوسري", "ممتاز", "2026-07-01", "قراءة خاشعة وصوت رائع", "أ"]
  ];
  sheet.getRange(2, 20, extraRows.length, 6).setValues(extraRows);
}

// دالة حفظ جميع الوسائط المرفوعة كملفات في Google Drive وتعديل جدول البيانات
function saveAllMedia(ss, canvasBase64, canvasFilename, imageBase64, imageFilename, videoBase64, videoFilename, audioBase64, audioFilename, row, notes, imageGrade, audioGrade) {
  var folderName = "تصحيحات مدرسة القرآن";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  var canvasUrl = "";
  var imageUrl = "";
  var videoUrl = "";
  var audioUrl = "";
  
  // حفظ السبورة المصححة
  if (canvasBase64 && canvasBase64.indexOf("base64,") !== -1) {
    canvasUrl = saveBase64ToFile(folder, canvasBase64, canvasFilename);
  }
  
  // حفظ الصورة الإضافية
  if (imageBase64 && imageBase64.indexOf("base64,") !== -1) {
    imageUrl = saveBase64ToFile(folder, imageBase64, imageFilename);
  }
  
  // حفظ الفيديو
  if (videoBase64 && videoBase64.indexOf("base64,") !== -1) {
    videoUrl = saveBase64ToFile(folder, videoBase64, videoFilename);
  }
  
  // حفظ التسجيل الصوتي للمعلم
  if (audioBase64 && audioBase64.indexOf("base64,") !== -1) {
    audioUrl = saveBase64ToFile(folder, audioBase64, audioFilename);
  }
  
  // تحديث جدول البيانات في السطر المحدد بناءً على الأعمدة الهيكلية الجديدة
  var sheet = ss.getSheetByName('A1');
  if (sheet) {
    var targetRow = Number(row);
    if (targetRow > 1) {
      sheet.getRange(targetRow, 8).setValue("تم"); // حالة الحفظ / الفحص (العمود H)
      sheet.getRange(targetRow, 9).setValue(notes); // الملاحظات (العمود I)
      sheet.getRange(targetRow, 10).setValue(imageGrade); // درجات الصورة (العمود J)
      if (canvasUrl) sheet.getRange(targetRow, 11).setValue(canvasUrl); // الصورة المعدلة (العمود K)
      sheet.getRange(targetRow, 12).setValue(audioGrade); // درجات الصوت (العمود L)
      if (imageUrl) sheet.getRange(targetRow, 13).setValue(imageUrl); // الصورة الإضافية (العمود M)
      if (videoUrl) sheet.getRange(targetRow, 14).setValue(videoUrl); // الفيديو (العمود N)
      if (audioUrl) sheet.getRange(targetRow, 15).setValue(audioUrl); // الصوت (العمود O)
      
      // تاريخ التصحيح (العمود P)
      sheet.getRange(targetRow, 16).setValue(formatDateTime(new Date()));
      
      // زيادة رقم التصحيح التراكمي بمقدار 1 (العمود Q)
      var currentCount = Number(sheet.getRange(targetRow, 17).getValue()) || 0;
      sheet.getRange(targetRow, 17).setValue(currentCount + 1);
    }
  }
  
  return {
    canvasUrl: canvasUrl,
    imageUrl: imageUrl,
    videoUrl: videoUrl,
    audioUrl: audioUrl
  };
}

// دالة مساعدة لتحويل base64 وحفظه في جوجل درايف مع صلاحيات عرض عامة للرابط المباشر
function saveBase64ToFile(folder, base64Data, filename) {
  try {
    var parts = base64Data.split("base64,");
    var contentType = parts[0].split(":")[1].split(";")[0];
    var decoded = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decoded, contentType, filename);
    var file = folder.createFile(blob);
    
    // جعل الملف متاحاً لكل من لديه الرابط لرؤيته وتضمينه في التطبيق
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // تحويل الرابط إلى رابط مباشر وقابل للتضمين
    var fileId = file.getId();
    return "https://docs.google.com/uc?export=view&id=" + fileId;
  } catch (err) {
    return "error: " + err.message;
  }
}
`;

  // Initial Load & Configurations
  useEffect(() => {
    const config = getSheetsConfig();
    setWebAppUrl(config.webAppUrl);
    setSpreadsheetId(config.spreadsheetId);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const studentData = await fetchStudentLessons();
      setLessons(studentData);
      const textData = await fetchPredefinedTexts();
      setPredefinedTexts(textData);
      const wmSettings = await fetchWatermarkSettings();
      setWatermark(wmSettings);
    } catch (err: any) {
      console.error('Failed to fetch:', err);
      setErrorMsg('خطأ في جلب البيانات من شيت جوجل. تم تحميل وضع التجربة الافتراضي للاستعراض.');
      // Force mock loaded anyway
      const studentData = await fetchStudentLessons();
      setLessons(studentData);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // Filtered Lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const matchSearch =
        lesson.studentId.includes(searchQuery) ||
        lesson.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.lessonNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'corrected'
          ? lesson.isSaved
          : !lesson.isSaved;

      const matchType =
        typeFilter === 'all'
          ? true
          : typeFilter === 'image'
          ? lesson.mediaType === 'image'
          : lesson.mediaType === 'audio';

      return matchSearch && matchStatus && matchType;
    });
  }, [lessons, searchQuery, statusFilter, typeFilter]);

  // Statistics Summary
  const statistics = useMemo(() => {
    const total = lessons.length;
    const corrected = lessons.filter(l => l.isSaved).length;
    const pending = total - corrected;
    const grades = lessons
      .filter(l => l.isSaved && (l.imageGrade || l.audioGrade))
      .map(l => {
        const gradeStr = l.imageGrade || l.audioGrade || '0';
        const num = parseInt(gradeStr.match(/\d+/)?.[0] || '0');
        return num > 0 ? num : null;
      })
      .filter((g): g is number => g !== null);
    
    const avgGrade = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : 0;
    return { total, corrected, pending, avgGrade };
  }, [lessons]);

  // Google Sheets integration configuration save & test
  const handleSaveConfig = async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    try {
      // Use the smart testing helper which runs on local dev AND supports production static environments (like Vercel)
      await testSheetsConnection(webAppUrl, spreadsheetId);
      setConnectionStatus('success');
      await loadAllData();
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setConnectionStatus('error');
      setConnectionError(err.message || 'فشل الاتصال برابط السكربت. يرجى التأكد من النشر ومطابقة الصلاحيات.');
    }
  };

  const handleDisconnect = () => {
    saveSheetsConfig('', '');
    setWebAppUrl('');
    setSpreadsheetId('');
    setConnectionStatus('idle');
    localStorage.removeItem('MOCK_STUDENT_DATA');
    loadAllData();
  };

  // Launch Active Lesson Correction View
  const handleStartCorrection = (lesson: StudentLesson) => {
    setSelectedLesson(lesson);
    setNotes(lesson.notes || '');
    setGrade(lesson.imageGrade || lesson.audioGrade || '');
    setAdditionalImg(lesson.additionalImage || null);
    setActionsHistory([]);
    setRedoHistory([]);
    setImgRotation(0);
    setBrightness(100);
    setContrast(100);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);

    if (lesson.mediaType === 'image') {
      setCurrentView('image-editor');
      // Load Canvas Image with CORS protection and automatic error recovery fallback
      const img = new window.Image();
      img.crossOrigin = 'anonymous'; // Avoid "Tainted Canvas" security exception on save
      img.onload = () => {
        setCanvasImage(img);
        setZoomScale(1.0);
        setCanvasOffset({ x: 0, y: 0 });
        setTimeout(() => redrawBoard(), 100);
      };
      img.onerror = () => {
        console.warn('CORS loading failed for image. Retrying without CORS restriction...');
        // Fallback: If CORS load fails, retry without anonymous to ensure the image displays!
        const retryImg = new window.Image();
        retryImg.onload = () => {
          setCanvasImage(retryImg);
          setZoomScale(1.0);
          setCanvasOffset({ x: 0, y: 0 });
          setTimeout(() => redrawBoard(), 100);
        };
        retryImg.onerror = (err) => {
          console.error('All image loading attempts failed:', err);
          alert('عذراً، تعذر تحميل الصورة على السبورة. يرجى التأكد من أن الرابط مباشر وملف الصورة مشارك للجميع (Anyone with the link can view) على Google Drive.');
        };
        retryImg.src = lesson.mediaUrl;
      };
      img.src = lesson.mediaUrl;
    } else {
      setCurrentView('audio-reviewer');
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
    }
  };

  // Predefined Phrases Quick Selection
  const selectQuickNote = (phrase: string) => {
    setNotes(prev => (prev ? prev + '\n' + phrase : phrase));
    setShowPredefinedModal(false);
  };

  // Redraw Canvas including all student drawings, calligraphy paths, vector seals, and text comments
  const redrawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions based on image size to avoid distortions
    if (canvas.width !== canvasImage.width || canvas.height !== canvasImage.height) {
      canvas.width = canvasImage.width;
      canvas.height = canvasImage.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save state for transformations
    ctx.save();
    
    // Position/Zoom transformation matrix
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(zoomScale, zoomScale);

    // Apply rotation around center of image
    if (imgRotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((imgRotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Apply Real-time Restoration Image Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(canvasImage, 0, 0);
    ctx.filter = 'none'; // reset filter for annotations

    // Render Actions History Stack
    actionsHistory.forEach(action => {
      drawAction(ctx, action);
    });

    // Draw active drawing shape preview
    if (tempPoints.length > 0 && startPoint) {
      const activePreviewAction: DrawingAction = {
        id: 'preview',
        type: drawMode,
        points: [startPoint, ...tempPoints],
        color: lineColor,
        width: lineWidth,
        chisel: isChiselMode,
        chiselAngle: chiselAngle,
        text: textCaption,
        font: textFont,
        textSize: textSize,
        bgEnabled: textBgEnabled,
        stampText: selectedStamp
      };
      drawAction(ctx, activePreviewAction);
    }

    ctx.restore();
  };

  // Draw any action (Paths, Highlighters, Geometric Shapes, Arabic Calligraphy, Seals)
  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawingAction) => {
    if (action.points.length === 0) return;

    if (action.type === 'draw' || action.type === 'highlighter') {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.type === 'highlighter') {
        ctx.strokeStyle = convertHexToRGBA(action.color, 0.4);
        ctx.lineWidth = action.width * 2;
      } else {
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.width;
      }

      if (action.chisel) {
        // Arabic Calligraphy Pen (Chisel angle carving)
        const ang = (action.chiselAngle || 45) * Math.PI / 180;
        const nibU = { x: Math.cos(ang), y: Math.sin(ang) };

        for (let i = 0; i < action.points.length - 1; i++) {
          const p0 = action.points[i];
          const p1 = action.points[i + 1];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.floor(dist / 1.5));

          ctx.fillStyle = action.color;
          for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = p0.x + dx * t;
            const y = p0.y + dy * t;
            const half = action.width / 2;

            ctx.beginPath();
            ctx.moveTo(x + nibU.x * half, y + nibU.y * half);
            ctx.lineTo(x - nibU.x * half, y - nibU.y * half);
            ctx.lineWidth = 1;
            ctx.strokeStyle = action.color;
            ctx.stroke();
          }
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (action.type === 'shape-line') {
      const p0 = action.points[0];
      const p1 = action.points[action.points.length - 1];
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    } else if (action.type === 'shape-arrow') {
      const p0 = action.points[0];
      const p1 = action.points[action.points.length - 1];
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.width;
      ctx.lineCap = 'round';
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Draw arrowhead
      const arrowSize = Math.max(16, action.width * 2.5);
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      ctx.fillStyle = action.color;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x - arrowSize * Math.cos(angle - Math.PI / 6), p1.y - arrowSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(p1.x - arrowSize * Math.cos(angle + Math.PI / 6), p1.y - arrowSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (action.type === 'shape-circle') {
      const p0 = action.points[0];
      const p1 = action.points[action.points.length - 1];
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.width;
      const rx = Math.abs(p1.x - p0.x) / 2;
      const ry = Math.abs(p1.y - p0.y) / 2;
      const cx = p0.x + (p1.x - p0.x) / 2;
      const cy = p0.y + (p1.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx > 0 ? rx : 1, ry > 0 ? ry : 1, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    } else if (action.type === 'shape-rect') {
      const p0 = action.points[0];
      const p1 = action.points[action.points.length - 1];
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.width;
      ctx.beginPath();
      ctx.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
      ctx.stroke();
      ctx.restore();
    } else if (action.type === 'stamp') {
      const pt = action.points[0];
      drawInkSeal(ctx, action.stampText || 'ممتاز', pt.x, pt.y, action.width * 8, action.color);
    } else if (action.type === 'text') {
      const pt = action.points[0];
      const lines = (action.text || '').split('\n');
      const fontName = action.font || 'Amiri';
      const fSize = action.textSize || 24;
      
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = `bold ${fSize}px ${fontName}`;
      
      // Calculate bounding box for background
      let maxWidth = 0;
      lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
      });
      
      const padding = 12;
      const rectWidth = maxWidth + padding * 2;
      const rectHeight = lines.length * (fSize * 1.3) + padding * 2;
      const rx = pt.x - rectWidth;
      const ry = pt.y;

      if (action.bgEnabled) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = action.color;
        ctx.lineWidth = 2;
        // Rounded Rect Box
        ctx.beginPath();
        ctx.roundRect(rx, ry, rectWidth, rectHeight, 8);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = action.color;
      lines.forEach((line, index) => {
        ctx.fillText(line, pt.x - padding, pt.y + padding + index * (fSize * 1.3));
      });
      ctx.restore();
    }
  };

  // Convert Hex to RGBA easily
  const convertHexToRGBA = (hex: string, alpha: number) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Vectorized realistic teacher evaluation rubber seal
  const drawInkSeal = (ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    // Slight randomized rotation to emulate handmade stamp ink press
    ctx.rotate(-0.08);

    // Double circle boundary
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
    ctx.lineWidth = size * 0.04;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, size / 2 - size * 0.07, 0, 2 * Math.PI);
    ctx.lineWidth = size * 0.015;
    ctx.stroke();

    // Side star highlights
    ctx.font = `${size * 0.12}px Amiri`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', -size * 0.28, 0);
    ctx.fillText('★', size * 0.28, 0);

    // Stamp Text centered
    ctx.font = `bold ${size * 0.17}px Amiri`;
    ctx.fillText(text, 0, 0);

    ctx.restore();
  };

  // Canvas Mouse / Touch events coordinates mapping
  const getRelativeCoords = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    // Coordinates mapping back to image coordinates
    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

    // Translate coordinates with Panning and Zoom Scale offsets
    const x = (canvasX - canvasOffset.x) / zoomScale;
    const y = (canvasY - canvasOffset.y) / zoomScale;

    return { x, y, clientX, clientY };
  };

  // Handle Event: Canvas Touch/Mouse Down
  const handleCanvasStart = (e: any) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (drawMode === 'pan') {
      setIsDrawing(true);
      setDragStart({ x: coords.clientX, y: coords.clientY });
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x: coords.x, y: coords.y });
    setTempPoints([{ x: coords.x, y: coords.y }]);
  };

  // Handle Event: Canvas Touch/Mouse Move
  const handleCanvasMove = (e: any) => {
    if (!isDrawing) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (drawMode === 'pan' && dragStart) {
      const dx = coords.clientX - dragStart.x;
      const dy = coords.clientY - dragStart.y;
      setCanvasOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: coords.clientX, y: coords.clientY });
      setTimeout(() => redrawBoard(), 0);
      return;
    }

    if (!startPoint) return;

    if (drawMode === 'draw' || drawMode === 'highlighter') {
      setTempPoints(prev => [...prev, { x: coords.x, y: coords.y }]);
    } else {
      // Shape tools (commit start and current mouse end to emmulate sizing)
      setTempPoints([{ x: coords.x, y: coords.y }]);
    }

    setTimeout(() => redrawBoard(), 0);
  };

  // Handle Event: Canvas Touch/Mouse Up
  const handleCanvasEnd = () => {
    setIsDrawing(false);
    setDragStart(null);

    if (drawMode === 'pan') return;
    if (!startPoint || tempPoints.length === 0) return;

    // Create New Action Log
    const newAction: DrawingAction = {
      id: Math.random().toString(36).substring(2, 9),
      type: drawMode,
      points: drawMode === 'draw' || drawMode === 'highlighter' 
        ? [startPoint, ...tempPoints]
        : [startPoint, tempPoints[tempPoints.length - 1]],
      color: lineColor,
      width: lineWidth,
      chisel: isChiselMode,
      chiselAngle: chiselAngle,
      text: textCaption,
      font: textFont,
      textSize: textSize,
      bgEnabled: textBgEnabled,
      stampText: selectedStamp
    };

    setActionsHistory(prev => [...prev, newAction]);
    setRedoHistory([]); // Reset redo stack
    setStartPoint(null);
    setTempPoints([]);

    // Trigger canvas repaint
    setTimeout(() => redrawBoard(), 20);
  };

  // Redraw canvas whenever drawing states or image filter adjustments change
  useEffect(() => {
    if (currentView === 'image-editor' && canvasImage) {
      redrawBoard();
    }
  }, [actionsHistory, tempPoints, drawMode, zoomScale, canvasOffset, brightness, contrast, imgRotation, isChiselMode, chiselAngle, selectedStamp, textCaption, lineColor, lineWidth, textBgEnabled]);

  // Undo Drawing Action
  const handleUndo = () => {
    if (actionsHistory.length === 0) return;
    const removed = actionsHistory[actionsHistory.length - 1];
    setActionsHistory(prev => prev.slice(0, -1));
    setRedoHistory(prev => [...prev, removed]);
  };

  // Redo Drawing Action
  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const recovered = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setActionsHistory(prev => [...prev, recovered]);
  };

  // Clear Canvas Drawing Board
  const handleClearCanvas = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح جميع الرسومات والملاحظات فوق السبورة؟')) {
      setActionsHistory([]);
      setRedoHistory([]);
    }
  };

  // Reset Zoom Position
  const handleResetZoom = () => {
    setZoomScale(1.0);
    setCanvasOffset({ x: 0, y: 0 });
  };

  // Rotate Student Paper clockwise
  const handleRotateImage = () => {
    setImgRotation(prev => (prev + 90) % 360);
  };

  // Audio Control Timeline Update
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Audio Slider scrub
  const handleAudioScrub = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  // Microhpne Teacher Recorder API Integrations
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        setIsRecording(false);
        setRecordingAudioLevel(0);
        if (micIntervalRef.current) clearInterval(micIntervalRef.current);
      };

      // Simulated voice visualizer meter
      let count = 0;
      micIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        setRecordingAudioLevel(Math.floor(Math.random() * 80) + 20); // Dynamic CSS levels
      }, 100);

      setRecordingDuration(0);
      setIsRecording(true);
      mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('لم نتمكن من الوصول للميكروفون، يرجى تفعيل الصلاحية من المتصفح.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop mic stream track
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const deleteRecordedAudio = () => {
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
  };

  // Image Additional File upload base64 converter
  const handleAdditionalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAdditionalImg(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Master Save Action Submission (Image Blackboard Compressions & Audio updates)
  const handleSaveCorrectionSubmit = async () => {
    if (!selectedLesson) return;
    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      let finalCanvasBase64 = undefined;
      let finalAudioBase64 = undefined;

      // 1. Bake and Compress Canvas image if it is an image editor
      if (selectedLesson.mediaType === 'image' && canvasRef.current) {
        // Build a static baked canvas to export high resolution JPG
        const rawBase64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
        finalCanvasBase64 = rawBase64;
      }

      // 2. Convert recorded voice note to base64
      if (recordedAudioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        });
        reader.readAsDataURL(recordedAudioBlob);
        finalAudioBase64 = await base64Promise;
      }

      // Save to Sheet or Local Database
      const result = await saveLessonCorrection({
        row: selectedLesson.row,
        notes: notes,
        imageGrade: selectedLesson.mediaType === 'image' ? grade : undefined,
        audioGrade: selectedLesson.mediaType === 'audio' ? grade : undefined,
        modifiedImage: finalCanvasBase64,
        additionalImage: additionalImg || undefined,
        audio: finalAudioBase64 || undefined
      });

      if (result.success) {
        setSaveSuccessMsg('تم حفظ تصحيح الدرس وإرسال التقييم إلى قوقل شيت بنجاح! 🎉');
        await loadAllData();
        setTimeout(() => {
          setSaveSuccessMsg('');
          setCurrentView('list');
          setSelectedLesson(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to save correction:', err);
      alert('حدث خطأ أثناء حفظ التصحيح: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans" dir="rtl">
      
      {/* Dynamic Saving Screen Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-4" />
          <p className="text-xl font-bold mb-2">جاري ضغط وحفظ التصحيحات والملفات...</p>
          <p className="text-slate-400 text-sm">يتم رفع التحديثات مباشرة إلى جدول قوقل شيت وجوجل درايف</p>
        </div>
      )}

      {/* Top Application Navigation Bar */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white shadow-md py-4 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2.5 rounded-lg border border-amber-500/40">
            <BookOpen className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">السبورة الذكية لتصحيح الدروس</h1>
            <p className="text-xs text-emerald-300">نظام ذكي متكامل لمعلمي ومحفظي الحلقات القرآنية والتعليمية</p>
          </div>
        </div>

        {/* Global Connection Badging Controls */}
        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isLiveMode() 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveMode() ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
            {isLiveMode() ? 'متصل بجوجل شيت مباشر' : 'وضع التجربة المحلي (Mock Mode)'}
          </div>

          <button
            onClick={() => setCurrentView(currentView === 'settings' ? 'list' : 'settings')}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              currentView === 'settings'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
            }`}
            title="إعدادات الربط بقوقل شيت"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container View Controller */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col">
        
        {/* VIEW 1: Settings Sheet Link Manager */}
        {currentView === 'settings' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto w-full animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Settings className="w-6 h-6 text-emerald-600" />
                إعدادات ربط الجدول (Google Sheets)
              </h2>
              <button 
                onClick={() => setCurrentView('list')}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              هذا البرنامج مجاني تماماً بنسبة 100% ولا يتطلب أي قواعد بيانات مدفوعة. يتصل النظام مباشرة بورقة عمل جوجل شيت الخاصة بك ويدعم رفع ملفات الصوت والصورة المصححة إلى مجلدات جوجل درايف الخاصة بك مباشرة عبر إضافة كود برمجي بسيط (Google Apps Script).
            </p>

            {/* Connection Status Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                حالة الاتصال الحالية:
              </h3>
              
              {isLiveMode() ? (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-300 text-emerald-800 rounded-lg p-3 text-sm flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">برنامج التصحيح متصل بنجاح بقوقل شيت!</p>
                      <p className="text-xs text-emerald-700 font-mono overflow-x-auto select-all mt-1">{webAppUrl}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    قطع الاتصال والعودة لوضع التجربة
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-300 text-amber-800 rounded-lg p-3 text-sm flex items-center gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">يعمل البرنامج حالياً في وضع الاستعراض المحلي</p>
                    <p className="text-xs text-amber-700 mt-1">يتم استخدام بيانات طلاب افتراضية تفاعلية. لربط جدولك الحقيقي اتبع التعليمات أدناه.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Steps & Config Fields */}
            <div className="space-y-6">
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">رابط الربط بقوقل شيت (Web App URL)</h3>
                
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-500">رابط تطبيق الويب المنتشر من Google Apps Script:</label>
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full text-left p-3 border border-slate-300 rounded-lg text-sm font-mono placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-500">رقم تعريف جدول الشيت Spreadsheet ID (اختياري):</label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="1F3hDUfjgBEkUAIO..."
                    className="w-full text-left p-3 border border-slate-300 rounded-lg text-sm font-mono placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                </div>

                {connectionError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{connectionError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setCurrentView('list')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={connectionStatus === 'testing' || !webAppUrl}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-1.5"
                  >
                    {connectionStatus === 'testing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري اختبار الاتصال...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ واختبار الاتصال
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Steps Guide for Google Sheets Link */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Info className="w-5 h-5 text-emerald-600" />
                  خطوات ربط جدول قوقل شيت الخاص بك (مجاناً 100%):
                </h4>
                
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-3 leading-relaxed pr-2">
                  <li>افتح ملف جدول قوقل شيت (Google Sheet) الخاص بك.</li>
                  <li>من القائمة العلوية اختر <b>Extensions</b> ثم اضغط على <b>Apps Script</b>.</li>
                  <li>امسح أي كود موجود في المحرر هناك، والصق الكود الذي قدمته لك أدناه لتسهيل عمليات التعديل والتلقي:</li>
                  <div className="relative mt-2">
                    <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[10px] font-mono overflow-x-auto text-left max-h-48" dir="ltr">
                      {gasCodeSnippet}
                    </pre>
                  </div>
                  <li>اضغط على زر <b>Save</b> (أيقونة القرص).</li>
                  <li>من الزاوية العلوية اليمنى، اضغط على <b>Deploy</b> ثم اختر <b>New deployment</b>.</li>
                  <li>اضغط على الترس واختر <b>Web app</b>.</li>
                  <li>اجعل الإعدادات كالتالي:
                    <ul className="list-disc list-inside mr-4 mt-1 space-y-1">
                      <li><b>Execute as:</b> Me (حسابك الشخصي)</li>
                      <li><b>Who has access:</b> Anyone (متاح للجميع)</li>
                    </ul>
                  </li>
                  <li>اضغط على <b>Deploy</b>، قم بنسخ الرابط الذي سينتج (ينتهي بـ <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">/exec</code>) والصقه في خانة الربط العلوية هنا في البرنامج!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Student Directory list */}
        {currentView === 'list' && (
          <div className="space-y-6 flex-1 flex flex-col animate-fade-in">
            
            {/* Elegant Desk stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3.5 rounded-xl text-emerald-700">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">إجمالي دروس الطلاب</p>
                  <p className="text-2xl font-bold text-slate-800">{statistics.total}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-blue-500/10 p-3.5 rounded-xl text-blue-700">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">بانتظار تصحيحك</p>
                  <p className="text-2xl font-bold text-slate-800">{statistics.pending}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-amber-500/10 p-3.5 rounded-xl text-amber-700">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">تم تصحيحها وحفظها</p>
                  <p className="text-2xl font-bold text-slate-800">{statistics.corrected}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-indigo-500/10 p-3.5 rounded-xl text-indigo-700">
                  <AudioLines className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">متوسط الدرجات %</p>
                  <p className="text-2xl font-bold text-slate-800">{statistics.avgGrade || '100'}%</p>
                </div>
              </div>
            </div>

            {/* List Controls & Search bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
              
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم المعرف، اسم الطالب، أو رقم السورة والدرس..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filters Toggle Group */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/60 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      statusFilter === 'all' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    كل الدروس
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      statusFilter === 'pending' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    غير مصحح
                  </button>
                  <button
                    onClick={() => setStatusFilter('corrected')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      statusFilter === 'corrected' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    تم تصحيحه
                  </button>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/60 text-xs">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      typeFilter === 'all' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    كل الوسائط
                  </button>
                  <button
                    onClick={() => setTypeFilter('image')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      typeFilter === 'image' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    صور 📷
                  </button>
                  <button
                    onClick={() => setTypeFilter('audio')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      typeFilter === 'audio' ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    صوت 🎙️
                  </button>
                </div>
              </div>
            </div>

            {/* Grid directory */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <Loader2 className="w-12 h-12 text-emerald-700 animate-spin mb-3" />
                <p className="text-slate-500 text-sm">جاري جلب قائمة دروس الطلاب وتحديثات الجدول...</p>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-base font-bold">لم يتم العثور على أي دروس تطابق فلاتر البحث الحالية</p>
                <button
                  onClick={resetFilters}
                  className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLessons.map((lesson) => (
                  <div
                    key={lesson.row}
                    className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                      lesson.isSaved 
                        ? 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/5' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    
                    {/* Top Type Indicator */}
                    <div className="absolute top-4 left-4">
                      {lesson.mediaType === 'image' ? (
                        <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          واجب صورة
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          تلاوة صوتية
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 space-y-4">
                      <div className="space-y-1 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">رقم المعرف: #{lesson.studentId}</span>
                        <h3 className="text-base font-bold text-slate-800 leading-snug line-clamp-1">{lesson.studentName}</h3>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">الدرس المطلوب:</span>
                          <span className="font-bold text-slate-700">{lesson.lessonNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">مرات الإرسال:</span>
                          <span className="font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">{lesson.submissionCount} محاولات</span>
                        </div>
                        {lesson.isSaved && (
                          <>
                            <div className="flex justify-between border-t border-slate-200/50 pt-2 mt-1">
                              <span className="text-slate-400">تاريخ الحفظ:</span>
                              <span className="text-slate-500">{lesson.saveDate?.split(' ')?.[0] || 'تم الحفظ'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">التقييم المرصود:</span>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{lesson.imageGrade || lesson.audioGrade || 'مكتمل'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Start Action Panel */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        {lesson.isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            مصحح وجاهز
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                            بانتظار تقييمك
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => handleStartCorrection(lesson)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:-translate-y-0.5 ${
                          lesson.isSaved
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/10'
                            : lesson.mediaType === 'image'
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-blue-700 hover:bg-blue-800 text-white'
                        }`}
                      >
                        {lesson.isSaved ? 'تعديل التصحيح' : 'ابدأ التصحيح الآن'}
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Smart Correction Blackboard for image files */}
        {currentView === 'image-editor' && selectedLesson && (
          <div className="flex flex-col xl:flex-row gap-6 flex-1 h-full min-h-[500px] animate-fade-in">
            
            {/* Right: Board controls bar */}
            <div className="w-full xl:w-80 shrink-0 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 space-y-5 flex flex-col justify-between max-h-none xl:max-h-[calc(100vh-160px)] overflow-y-auto">
              
              {/* Back Btn & Student Metadata */}
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentView('list')}
                  className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-emerald-700 self-start py-1 px-2 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  رجوع لقائمة الطلاب
                </button>

                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">طالب الصورة: {selectedLesson.studentName.split(' ')[0]}</span>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5 leading-snug">{selectedLesson.studentName}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedLesson.lessonNumber}</p>
                </div>
              </div>

              {/* DRAWING BOARD MODES TOOLBOX */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1 tracking-wide uppercase">أدوات السبورة والتحرير</h4>
                
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setDrawMode('draw')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'draw' 
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="قلم حبر جاف"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-[9px] font-bold">قلم</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('highlighter')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'highlighter'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="قلم تظليل فسفوري"
                  >
                    <Highlighter className="w-4 h-4" />
                    <span className="text-[9px] font-bold">تظليل</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('stamp')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'stamp'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="أختام التقييم المطاطية"
                  >
                    <Stamp className="w-4 h-4" />
                    <span className="text-[9px] font-bold">أختام</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('text')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'text'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="ملاحظة نصية مخصصة"
                  >
                    <Type className="w-4 h-4" />
                    <span className="text-[9px] font-bold">كتابة</span>
                  </button>

                  {/* Shapes row */}
                  <button
                    onClick={() => setDrawMode('shape-arrow')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'shape-arrow'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="رسم سهم تأشير الخطأ"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-[9px] font-bold">سهم</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('shape-circle')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'shape-circle'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="رسم دائرة"
                  >
                    <CircleIcon className="w-4 h-4" />
                    <span className="text-[9px] font-bold">دائرة</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('shape-rect')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'shape-rect'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="رسم مستطيل"
                  >
                    <Square className="w-4 h-4" />
                    <span className="text-[9px] font-bold">مربع</span>
                  </button>

                  <button
                    onClick={() => setDrawMode('pan')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      drawMode === 'pan'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-700/25'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="تحريك وتكبير الصورة"
                  >
                    <Sliders className="w-4 h-4" />
                    <span className="text-[9px] font-bold">تحريك</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-Tools Customizer Panel */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-3.5">
                
                {/* 1. If Mode is Stamp Seal */}
                {drawMode === 'stamp' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">اختر ختم التقييم المطاطي:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {stampsList.map((st) => (
                        <button
                          key={st.label}
                          onClick={() => setSelectedStamp(st.label)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold text-center border transition-all ${
                            selectedStamp === st.label
                              ? 'bg-amber-500 text-slate-900 border-amber-400 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. If Mode is Textcaptions */}
                {drawMode === 'text' && (
                  <div className="space-y-2 text-xs">
                    <label className="font-bold text-slate-500">النص المراد كتابته فوق الصورة:</label>
                    <textarea
                      value={textCaption}
                      onChange={(e) => setTextCaption(e.target.value)}
                      placeholder="اكتب الملاحظة هنا..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white h-16 focus:ring-1 focus:ring-emerald-500"
                    />
                    
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">نوع الخط العربي:</label>
                        <select
                          value={textFont}
                          onChange={(e) => setTextFont(e.target.value)}
                          className="w-full p-1 border rounded bg-white text-xs"
                        >
                          <option value="Amiri">الأميري (نسخ)</option>
                          <option value="Cairo">القاهرة</option>
                          <option value="Tajawal">تاجول</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">حجم الخط (px):</label>
                        <input
                          type="number"
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          className="w-full p-1 border rounded bg-white text-xs"
                          min="12"
                          max="120"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={textBgEnabled}
                        onChange={(e) => setTextBgEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span className="text-[10px] text-slate-500">إضافة خلفية بيضاء للقراءة الواضحة</span>
                    </label>
                  </div>
                )}

                {/* 3. Global Pen Brush customization */}
                {drawMode !== 'pan' && drawMode !== 'text' && drawMode !== 'stamp' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-500">سمك القلم: <b className="text-slate-800">{lineWidth}px</b></label>
                      <input
                        type="range"
                        min="2"
                        max="80"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="w-28 accent-emerald-600"
                      />
                    </div>

                    {/* Arabic Calligraphy Chisel Mode toggles */}
                    <div className="border-t border-slate-200/60 pt-2 space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-semibold text-slate-500 text-[11px] flex items-center gap-1">
                          🖋️ قلم خط عربي احترافي (مشطوف)
                        </span>
                        <input
                          type="checkbox"
                          checked={isChiselMode}
                          onChange={(e) => setIsChiselMode(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600"
                        />
                      </label>

                      {isChiselMode && (
                        <div className="flex justify-between items-center pl-2">
                          <span className="text-[10px] text-slate-400">زاوية الشطف: <b>{chiselAngle}°</b></span>
                          <input
                            type="range"
                            min="0"
                            max="180"
                            value={chiselAngle}
                            onChange={(e) => setChiselAngle(Number(e.target.value))}
                            className="w-24 accent-emerald-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Color swatches */}
                {drawMode !== 'pan' && (
                  <div className="space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-500">اختر لون الحبر:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={lineColor}
                        onChange={(e) => setLineColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <div className="flex flex-wrap gap-1">
                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#000000', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setLineColor(color)}
                            className="w-5 h-5 rounded-full border border-slate-200 transition-transform hover:scale-110 shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Undo / Redo & Board adjustments */}
              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                <span className="font-bold text-slate-400 tracking-wide uppercase">تعديلات سريعة</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={actionsHistory.length === 0}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg flex items-center justify-center gap-1 font-bold"
                  >
                    <Undo className="w-4.5 h-4.5" />
                    تراجع
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoHistory.length === 0}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg flex items-center justify-center gap-1 font-bold"
                  >
                    <Redo className="w-4.5 h-4.5" />
                    إعادة
                  </button>
                  <button
                    onClick={handleClearCanvas}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg flex items-center justify-center gap-1 font-bold"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    مسح السبورة
                  </button>
                  <button
                    onClick={handleRotateImage}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-1 font-bold"
                  >
                    <RotateCw className="w-4.5 h-4.5" />
                    تدوير الورقة
                  </button>
                </div>
              </div>

              {/* IMAGE ADJUSTMENTS FILTERS (Brightness / Contrast) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-3 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  مصحح الصور الاحترافي (لتحسين وضوح الصورة):
                </span>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-0.5"><Sun className="w-3 h-3" /> زيادة السطوع:</span>
                    <span className="font-semibold text-slate-700">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-1.5"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-0.5"><Contrast className="w-3 h-3" /> زيادة التباين:</span>
                    <span className="font-semibold text-slate-700">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-1.5"
                  />
                </div>
              </div>

            </div>

            {/* Middle Blackboard area */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              
              {/* Actual Drawing Board Canvas */}
              <div className="flex-1 min-h-[400px] bg-slate-900 border border-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-lg group">
                
                {/* Floating zoom buttons */}
                <div className="absolute top-4 left-4 z-10 bg-slate-800/85 backdrop-blur border border-slate-700/80 rounded-xl p-1.5 flex gap-1.5 shadow-md">
                  <button
                    onClick={() => setZoomScale(prev => Math.min(prev + 0.1, 3))}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-white"
                    title="تكبير"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomScale(prev => Math.max(prev - 0.1, 0.4))}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-white"
                    title="تصغير"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 text-[10px] hover:bg-slate-700 rounded-lg text-white font-semibold"
                    title="إعادة تعيين الحجم والموضع"
                  >
                    افتراضي
                  </button>
                </div>

                {/* Overlay guides */}
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-slate-800/50 backdrop-blur rounded px-2.5 py-1 text-[10px] text-slate-300">
                  مستوى التقريب: {Math.round(zoomScale * 100)}% | لوحة التصحيح التفاعلية
                </div>

                {/* The actual HTML5 drawing canvas */}
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasStart}
                    onMouseMove={handleCanvasMove}
                    onMouseUp={handleCanvasEnd}
                    onTouchStart={handleCanvasStart}
                    onTouchMove={handleCanvasMove}
                    onTouchEnd={handleCanvasEnd}
                    className="border border-slate-800 rounded shadow-2xl bg-white max-w-full max-h-full cursor-crosshair cursor-grab canvas-container"
                    style={{
                      cursor: drawMode === 'pan' ? 'grab' : 'crosshair',
                    }}
                  />
                </div>
              </div>

              {/* Bottom Evaluation submission panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                
                {/* Grades & notes row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  
                  {/* General Grade */}
                  <div className="space-y-1 md:col-span-1 text-xs">
                    <label className="font-bold text-slate-600 block">درجة الطالب المرصودة:</label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="مثال: 95/100"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 text-sm"
                    />
                  </div>

                  {/* Comments Notes */}
                  <div className="space-y-1 md:col-span-2 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-600">تعليق وتوجيه المعلم:</label>
                      <button
                        onClick={() => setShowPredefinedModal(true)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                      >
                        ⚡ إدراج توجيه جاهز سريع
                      </button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="اكتب التوجيه والملاحظات التي ستصل لولي الأمر..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl h-[42px] focus:ring-2 focus:ring-emerald-500 text-xs text-slate-700"
                      rows={1}
                    />
                  </div>

                  {/* Add Image file */}
                  <div className="space-y-1 md:col-span-1 text-xs">
                    <label className="font-bold text-slate-600 block">رفع ورقة إضافية:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdditionalImageUpload}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                </div>

                {/* Final save button row */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-4">
                  <div className="text-slate-400 text-xs">
                    يرجى مراجعة الملاحظات قبل الضغط على حفظ. سيتم تحديث جدول الشيت مباشرة.
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentView('list')}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      إلغاء التعديل
                    </button>
                    
                    <button
                      onClick={handleSaveCorrectionSubmit}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-700/10"
                    >
                      <Save className="w-4 h-4" />
                      حفظ وإنهاء تصحيح الصورة
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 4: Audio review suite with speed slider & microphone correction */}
        {currentView === 'audio-reviewer' && selectedLesson && (
          <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
            
            {/* Back header button */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <button
                onClick={() => setCurrentView('list')}
                className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-emerald-700 py-1.5 px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                رجوع لقائمة الدروس
              </button>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">🎙️ مراجعة تلاوة صوتية</span>
            </div>

            {/* Main Audio Platform Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              
              {/* Student Header details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">اسم الطالب ومعرّف الحلقة:</span>
                  <h3 className="text-lg font-bold text-slate-800">{selectedLesson.studentName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">الدرس المطلوب تسميعه: <b className="text-emerald-700">{selectedLesson.lessonNumber}</b></p>
                </div>
                
                <div className="text-xs space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/50">
                  <div className="flex gap-2">
                    <span className="text-slate-400">مرات الإرسال:</span>
                    <span className="font-bold text-slate-700">{selectedLesson.submissionCount}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400">الحالة:</span>
                    <span className={`font-bold ${selectedLesson.isSaved ? 'text-emerald-600' : 'text-amber-500'}`}>{selectedLesson.isSaved ? 'مصحح ومحفوظ' : 'معلق بحاجة لتقييم'}</span>
                  </div>
                </div>
              </div>

              {/* 1. Student Original Audio Recitation Track Player */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-900 text-white space-y-4">
                <div className="flex items-center gap-2">
                  <AudioLines className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-bold tracking-wide">الملف الصوتي الأصلي المرسل من الطالب:</h4>
                </div>

                {/* HTML5 Audio engine */}
                <audio
                  ref={audioRef}
                  src={selectedLesson.mediaUrl}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                  onEnded={() => setIsPlayingAudio(false)}
                />

                {/* Visualizer animation waves */}
                <div className="h-16 flex items-center justify-center gap-1 bg-slate-950/60 rounded-xl px-4 border border-slate-800">
                  {isPlayingAudio ? (
                    // Animated waves
                    Array.from({ length: 24 }).map((_, i) => {
                      const heights = ['h-2', 'h-8', 'h-12', 'h-6', 'h-14', 'h-10', 'h-4', 'h-7'];
                      const randomHeight = heights[Math.floor(Math.random() * heights.length)];
                      return (
                        <span 
                          key={i} 
                          className={`w-1.5 ${randomHeight} bg-blue-500 rounded-full animate-pulse`} 
                          style={{ animationDelay: `${i * 40}ms` }}
                        />
                      );
                    })
                  ) : (
                    // Flat Wave bars
                    Array.from({ length: 24 }).map((_, i) => (
                      <span key={i} className="w-1.5 h-3 bg-slate-700 rounded-full" />
                    ))
                  )}
                </div>

                {/* Player dashboard controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs">
                  
                  {/* Play controller */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAudioPlay}
                      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md shadow-blue-600/10"
                    >
                      {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-0.5" />}
                    </button>

                    <div className="text-slate-300 font-mono">
                      {Math.floor(audioCurrentTime / 60)}:{(Math.floor(audioCurrentTime % 60)).toString().padStart(2, '0')} / {Math.floor(audioDuration / 60)}:{(Math.floor(audioDuration % 60)).toString().padStart(2, '0')}
                    </div>
                  </div>

                  {/* Playback speed controller (Crucial Arabic Teacher speed control) */}
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 px-2 flex items-center gap-0.5"><FastForward className="w-3.5 h-3.5" /> سرعة التلاوة:</span>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                          audioSpeed === speed
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                </div>

                {/* Scrubbing slider bar */}
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 100}
                  value={audioCurrentTime}
                  onChange={(e) => handleAudioScrub(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1 cursor-pointer bg-slate-800 rounded-lg"
                />

              </div>

              {/* 2. Microhpne embedded Teacher Voice Correction panel */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-emerald-700 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-800">تسجيل تعقيب أو تصحيح صوتي للمعلم (اختياري):</h4>
                  </div>
                  
                  {isRecording && (
                    <span className="text-xs text-red-600 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                      جاري تسجيل صوتك حالياً... {(recordingDuration / 10).toFixed(1)} ثانية
                    </span>
                  )}
                </div>

                <p className="text-slate-500 text-xs">
                  يمكنك تسجيل آية تلاوة صحيحة بصوتك لإظهار مخارج الحروف الصحيحة للطالب والتعقيب عليه، وسيقوم النظام برفعها إلى جوجل درايف للوصول السهل.
                </p>

                <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  
                  {/* Record Control Switch */}
                  {!isRecording && !recordedAudioUrl ? (
                    <button
                      onClick={startRecording}
                      className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform hover:scale-102"
                    >
                      <Mic className="w-4 h-4" />
                      ابدأ تسجيل صوتي جديد
                    </button>
                  ) : isRecording ? (
                    <div className="flex items-center gap-3 w-full justify-between">
                      {/* Live audio bars meter */}
                      <div className="flex-1 h-8 flex items-center gap-1 border border-red-100 bg-red-50/20 px-3 rounded-lg">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <span 
                            key={i} 
                            className="w-1 bg-red-500 rounded-full transition-all"
                            style={{ height: `${Math.max(4, Math.min(28, recordingAudioLevel * (Math.random() + 0.2)))}px` }}
                          />
                        ))}
                      </div>
                      
                      <button
                        onClick={stopRecording}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <X className="w-4 h-4" />
                        إيقاف وإنهاء التسجيل
                      </button>
                    </div>
                  ) : (
                    // Recorded output audio preview
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="font-bold text-slate-700">تم تسجيل الرد الصوتي بنجاح!</span>
                        <audio src={recordedAudioUrl || ''} controls className="h-9 accent-emerald-600" />
                      </div>

                      <button
                        onClick={deleteRecordedAudio}
                        className="px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف وإعادة التسجيل
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Evaluation Metrics, Grades, and predefined text list */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">تفاصيل رصد درجات تلاوة الصوت:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  
                  {/* Audio Grade */}
                  <div className="space-y-1 md:col-span-1 text-xs">
                    <label className="font-bold text-slate-600">درجة التسميع والأحكام:</label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="مثال: 100/100"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 bg-white"
                    />
                  </div>

                  {/* General comment */}
                  <div className="space-y-1 md:col-span-3 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-600">توجيه التجويد وملاحظات المدرس:</label>
                      <button
                        onClick={() => setShowPredefinedModal(true)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                      >
                        ⚡ إدراج تعليق جاهز
                      </button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثال: قراءة خاشعة وصحيحة، انتبه فقط لأزمنة الحروف والمدود في سورة يس..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white h-[42px] text-xs text-slate-700"
                      rows={1}
                    />
                  </div>

                </div>
              </div>

              {/* Save trigger buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400">سيتم حفظ البيانات وربطها بالصف رقم #{selectedLesson.row} في الشيت.</span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentView('list')}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveCorrectionSubmit}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-700/10"
                  >
                    <Save className="w-4 h-4" />
                    حفظ وإنهاء تصحيح التلاوة
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* QUICK PREDEFINED PHRASES MODAL */}
      {showPredefinedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <FastForward className="w-5 h-5 text-amber-400" />
                توجيهات المعلم السريعة والجاهزة (Settings)
              </h3>
              <button 
                onClick={() => setShowPredefinedModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                اضغط على أي من العبارات التوجيهية الجاهزة أدناه ليتم دمجها وإدراجها تلقائياً بداخل مربع ملاحظات المعلم لتوفير وقت الكتابة:
              </p>

              <div className="space-y-2.5">
                {predefinedTexts.map((txt, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectQuickNote(txt.phrase)}
                    className="w-full text-right p-3.5 border border-slate-200 rounded-xl hover:bg-emerald-50/40 hover:border-emerald-300 transition-all duration-200 flex flex-col gap-1 text-xs"
                  >
                    <span className="font-bold text-emerald-800">{txt.title}</span>
                    <span className="text-slate-600 font-serif text-sm leading-relaxed">{txt.phrase}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setShowPredefinedModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200/80 text-center py-4 text-xs text-slate-400 shrink-0">
        تم التطوير للعمل كموقع ويب احترافي مجاني متصل بـ Google Sheets عبر GitHub و Vercel.
      </footer>

    </div>
  );
}
