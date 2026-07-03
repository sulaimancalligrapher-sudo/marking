import React, { useState, useEffect } from 'react';
import { 
  Users, Settings as SettingsIcon, LogOut, CheckCircle, AlertCircle, 
  HelpCircle, ChevronLeft, Save, Plus, ArrowRight, FileAudio, FileImage, 
  FolderOpen, Mic, Camera, Upload, Trash2, ShieldCheck, Database, Sliders,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentRow, AppSettings, User, PredefinedText } from './types';
import { 
  initialMockStudents, initialMockTexts, initialMockUsers, 
  mockImages, mockAudios 
} from './mockData';

// Subcomponents
import StudentTable from './components/StudentTable';
import DrawingBoard from './components/DrawingBoard';
import AudioPlayer from './components/AudioPlayer';
import SettingsPanel from './components/SettingsPanel';
import LoginModal from './components/LoginModal';

const DEFAULT_SETTINGS: AppSettings = {
  googleAppsScriptUrl: '',
  profileName: 'الأستاذ سليمان',
  profileSub: 'معلم ومصحح الخط العربي والتلاوة',
  profileLogo: 'https://img.icons8.com/color/144/calligraphy.png',
  watermark: {
    logoUrl: '',
    opacity: 0.7,
    sizeFactor: 1.2,
    logoPosition: 'bottom-right',
    textPrefix: 'تم تصحيح واجب الخط للأستاذ سليمان',
    fontSize: 22,
    textPosition: 'bottom-left'
  },
  predefinedTexts: initialMockTexts,
  users: initialMockUsers
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'students' | 'settings'>('students');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentRow[]>(initialMockStudents);
  
  // Login flow
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Correction Workspace
  const [activeLesson, setActiveLesson] = useState<StudentRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  
  // Input fields
  const [notes, setNotes] = useState('');
  const [imageGrade, setImageGrade] = useState('');
  const [audioGrade, setAudioGrade] = useState('');
  const [playOriginalMediaUrl, setPlayOriginalMediaUrl] = useState<string | null>(null);

  // Additional attachments captures
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedAudio, setCapturedAudio] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isCapturingWebcam, setIsCapturingWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  // Status & Notification
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'loading'; msg: string } | null>(null);
  const [isDatabaseMocked, setIsDatabaseMocked] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Settings from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        if (parsed.googleAppsScriptUrl) {
          setIsDatabaseMocked(false);
          // Auto fetch live data from Google Sheets via backend proxy
          fetchLiveDatabase(parsed.googleAppsScriptUrl);
        }
      } catch (e) {
        console.error('Failed parsing saved settings:', e);
      }
    }

    const sessionUser = localStorage.getItem('loggedInUser');
    if (sessionUser) {
      setCurrentUser(sessionUser);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchLiveDatabase = async (url: string) => {
    if (!url) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: url })
      });
      const responseData = await res.json();
      if (responseData.success && responseData.data) {
        const payload = responseData.data;
        if (Array.isArray(payload)) {
          setStudents(payload);
          setIsDatabaseMocked(false);
        } else if (typeof payload === 'object') {
          // It's the upgraded Code.gs configuration bundle
          if (Array.isArray(payload.students)) {
            setStudents(payload.students);
          }
          
          setSettings(prev => {
            const nextSettings = {
              ...prev,
              googleAppsScriptUrl: url,
              predefinedTexts: Array.isArray(payload.predefinedTexts) && payload.predefinedTexts.length > 0 
                ? payload.predefinedTexts 
                : prev.predefinedTexts,
              users: Array.isArray(payload.users) && payload.users.length > 0 
                ? payload.users 
                : prev.users,
              watermark: payload.watermark 
                ? { ...prev.watermark, ...payload.watermark } 
                : prev.watermark,
              profileName: payload.watermark?.textPrefix 
                ? payload.watermark.textPrefix.replace('تم تصحيح واجب الخط للأستاذ ', 'الأستاذ ')
                : prev.profileName
            };
            localStorage.setItem('appSettings', JSON.stringify(nextSettings));
            return nextSettings;
          });
          setIsDatabaseMocked(false);
        } else {
          console.warn('Could not parse Google Sheets response format. Falling back to offline simulator.');
        }
      } else {
        console.warn('Could not parse Google Sheets response. Falling back to offline simulator.');
      }
    } catch (e) {
      console.error('Failed fetching live sheet data:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = (updated: AppSettings) => {
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));
    if (updated.googleAppsScriptUrl) {
      setIsDatabaseMocked(false);
      fetchLiveDatabase(updated.googleAppsScriptUrl);
    } else {
      setIsDatabaseMocked(true);
      setStudents(initialMockStudents);
    }
  };

  const handleLogin = (user: string) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  // Select a student row for correction
  const handleSelectLesson = (row: StudentRow, editMode = false) => {
    setActiveLesson(row);
    setIsEditing(editMode);
    
    // Set default grades & notes
    setNotes(row.isSaved ? "تم التصحيح والمراجعة بنجاح.\nيرجى الاهتمام بمسار خط الأساس." : "");
    setImageGrade(row.isSaved ? "8.5 / 10" : "");
    setAudioGrade(row.isSaved ? "9 / 10" : "");
    setCapturedImage(null);
    setCapturedAudio(null);
    setSaveStatus(null);

    // Load appropriate preview/canvas images
    if (row.audioFileId && !row.imageFileId) {
      // It's an audio-only assignment
      setCanvasImage(null);
      setPlayOriginalMediaUrl(mockAudios.makharijSample);
    } else {
      // It's an image calligraphy assignment
      // Select appropriate beautiful sample mock images based on row
      const imgKey = row.row % 3 === 0 ? mockImages.ruqahSample : (row.row % 2 === 0 ? mockImages.naskhSample : mockImages.diwaniSample);
      setCanvasImage(imgKey);
      setPlayOriginalMediaUrl(imgKey);
    }
  };

  // DrawingBoard updates saving
  const handleCanvasSaved = (dataUrl: string) => {
    setCanvasImage(dataUrl);
    setSaveStatus({ type: 'success', msg: 'تم حفظ وتوثيق لوحة الرسم مؤقتاً!' });
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Direct Audio microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setAudioChunks([]);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedAudio(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (e) {
      alert('الرجاء منح صلاحية الميكروفون للتسجيل المباشر.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
    }
  };

  // Direct Webcam Capture
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setWebcamStream(stream);
      setIsCapturingWebcam(true);
    } catch (e) {
      alert('الرجاء منح صلاحية الكاميرا للتصوير المباشر.');
    }
  };

  const capturePhoto = () => {
    const video = document.getElementById('webcam-video') as HTMLVideoElement;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Auto-compress to jpeg
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(compressedDataUrl);
      
      // Stop webcam stream
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      setIsCapturingWebcam(false);
      setWebcamStream(null);
    }
  };

  // Handle local file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedAudio(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit complete correction save
  const handleSaveCorrection = async () => {
    if (!activeLesson) return;

    setSaveStatus({ type: 'loading', msg: 'جاري رفع الملفات وتحديث الجدول وقاعدة البيانات...' });

    // Format final dates
    const dateStr = new Date().toLocaleString('ar-EG', { timeZone: 'GMT' });

    if (isDatabaseMocked) {
      // Simulate locally
      setTimeout(() => {
        setStudents(prev => prev.map(item => {
          if (item.row === activeLesson.row) {
            return {
              ...item,
              isSaved: true,
              imageSubmissionCount: item.imageSubmissionCount + 1,
              additionalT: "تم التدقيق والمراجعة",
              additionalY: "مسجل"
            };
          }
          return item;
        }));
        setSaveStatus({ type: 'success', msg: '✅ تم التصحيح والرفع محلياً بنجاح! (تم تحديث سجل المحاكاة الافتراضية)' });
        setTimeout(() => {
          setActiveLesson(null);
          setSaveStatus(null);
        }, 1500);
      }, 1500);
    } else {
      // Real communication with Google Apps Script Web App
      try {
        const bodyData = {
          appsScriptUrl: settings.googleAppsScriptUrl,
          row: activeLesson.row,
          notes,
          imageGrade,
          audioGrade,
          canvasBase64: canvasImage,
          canvasFilename: `صورة-معدلة-${activeLesson.studentName}-${activeLesson.studentId}.jpg`,
          imageBase64: capturedImage,
          imageFilename: `مرفق-إضافي-${activeLesson.studentName}-${activeLesson.studentId}.jpg`,
          audioBase64: capturedAudio,
          audioFilename: `صوت-إضافي-${activeLesson.studentName}-${activeLesson.studentId}.mp3`
        };

        const res = await fetch('/api/sheets/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const result = await res.json();
        
        if (result.success) {
          setSaveStatus({ type: 'success', msg: '✅ تم إرسال التصحيح، ورفع الصورة المعدلة لـ Google Drive، وتحديث الـ Google Sheet بالكامل!' });
          // Fetch fresh list
          fetchLiveDatabase(settings.googleAppsScriptUrl);
          setTimeout(() => {
            setActiveLesson(null);
            setSaveStatus(null);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', msg: `فشل الحفظ: ${result.message || 'حدث خطأ في الرفع'}` });
        }
      } catch (e: any) {
        setSaveStatus({ type: 'error', msg: `عفواً، فشل الاتصال بخادم جوجل: ${e.message}` });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased" dir="rtl">
      
      {/* Required Authorization Barrier */}
      {!isLoggedIn && (
        <LoginModal 
          onLoginSuccess={handleLogin} 
          usersList={settings.users} 
        />
      )}

      {/* Modern High-End Top Navigation Header */}
      <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo & Brand title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <img src={settings.profileLogo} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="text-right">
              <h1 className="font-black text-base tracking-tight">{settings.profileName}</h1>
              <p className="text-[10px] text-emerald-400 font-medium">{settings.profileSub}</p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800">
            {isDatabaseMocked ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <Database className="w-3.5 h-3.5 animate-pulse" />
                المحاكاة الافتراضية (بدون ربط)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                متصل بـ Google Sheets مباشر
              </span>
            )}
          </div>

          {/* User Account Controls */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hidden sm:block">
                مرحباً بك: {currentUser}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-850 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 transition-all cursor-pointer"
              title="خروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Tab select bar */}
      {isLoggedIn && !activeLesson && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-6 -mb-px">
              <button
                onClick={() => setActiveTab('students')}
                className={`py-4 px-2 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'students' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>قائمة الطلاب والدروس المرسلة</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-2 text-xs md:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>لوحة التحكم وإعدادات الربط</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          {isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              
              {/* Correction Workspace Panel */}
              {activeLesson ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  
                  {/* Left Column: Drawing board/Audio player */}
                  <div className="xl:col-span-2 space-y-6 flex flex-col h-[700px] xl:h-[780px]">
                    
                    {/* Header back bar */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveLesson(null)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span>العودة لجدول الدروس</span>
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        {activeLesson.imageFileId ? 'سبورة الرسم الذكية للتصحيح' : 'مستمع تلاوة الصوتيات'}
                      </span>
                    </div>

                    {/* Interactive Canvas / Audio container */}
                    <div className="flex-1 min-h-0">
                      {activeLesson.imageFileId ? (
                        <DrawingBoard
                          imageSrc={canvasImage}
                          onSave={handleCanvasSaved}
                          predefinedTexts={settings.predefinedTexts}
                          stickersList={[]}
                        />
                      ) : (
                        <div className="h-full flex flex-col justify-center">
                          <AudioPlayer
                            audioSrc={playOriginalMediaUrl}
                            studentName={activeLesson.studentName}
                            lessonNumber={activeLesson.lessonNumber}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Submission Form, Grades & Custom Attachment Uploads */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                      
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-lg text-slate-900">تقييم وتسجيل الدرجة للدرس</h3>
                        <p className="text-xs text-slate-500">سيتم حفظ الدرجات وتعديل حالة الصف بالكامل في Google Sheet</p>
                      </div>

                      {/* Display Grades Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeLesson.imageFileId && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">درجة الصورة (من 10):</label>
                            <input
                              type="text"
                              value={imageGrade}
                              onChange={e => setImageGrade(e.target.value)}
                              placeholder="مثال: 9.5 / 10"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-mono"
                            />
                          </div>
                        )}
                        {activeLesson.audioFileId && (
                          <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-700">درجة التلاوة/الصوت (من 10):</label>
                            <input
                              type="text"
                              value={audioGrade}
                              onChange={e => audioGrade(e.target.value)}
                              placeholder="مثال: 9 / 10"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Written teacher notes */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">الملاحظات والتوجيهات المكتوبة:</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="اكتب التوجيهات والملاحظات للطالب هنا بالتفصيل ليرسل في عمود الملاحظات..."
                          rows={4}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs"
                        />
                      </div>

                      {/* Custom media camera/microphone capture section */}
                      <div className="space-y-4 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <Plus className="w-4 h-4 text-emerald-500" />
                          <span>إضافة توثيق إضافي (مرفقات اختيارية للرفع):</span>
                        </div>

                        {/* Webcam capture area */}
                        {isCapturingWebcam && (
                          <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-2.5">
                            <video id="webcam-video" autoplay playsinline className="w-full h-40 object-cover rounded-lg bg-black" />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition"
                              >
                                التقاط الصورة الآن
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (webcamStream) webcamStream.getTracks().forEach(track => track.stop());
                                  setIsCapturingWebcam(false);
                                }}
                                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Control buttons bar for capture */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={startWebcam}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-600 transition cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-bold">التقاط كاميرا</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={isRecordingAudio ? stopRecording : startRecording}
                            className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition cursor-pointer ${
                              isRecordingAudio 
                                ? 'bg-red-50 border-red-200 text-red-600' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <Mic className={`w-4 h-4 ${isRecordingAudio ? 'animate-pulse text-red-500' : 'text-emerald-500'}`} />
                            <span className="text-[10px] font-bold">
                              {isRecordingAudio ? 'إيقاف التسجيل' : 'تسجيل صوت'}
                            </span>
                          </button>

                          <label className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-600 transition cursor-pointer">
                            <Upload className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-bold">رفع ملف</span>
                            <input
                              type="file"
                              accept="image/*,audio/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.type.startsWith('image/')) {
                                    handleImageUpload(e);
                                  } else {
                                    handleAudioUpload(e);
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Attachments preview thumbnails */}
                        <div className="flex flex-wrap gap-3">
                          {capturedImage && (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/30">
                              <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setCapturedImage(null)}
                                className="absolute top-1 left-1 p-0.5 bg-red-500 text-white rounded-full hover:scale-110 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {capturedAudio && (
                            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2.5 text-xs">
                              <FileAudio className="w-4 h-4 text-emerald-500" />
                              <span className="font-semibold text-slate-700">تسجيل ميكروفون جاهز</span>
                              <button
                                type="button"
                                onClick={() => setCapturedAudio(null)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Display Submit & Action status messages */}
                      {saveStatus && (
                        <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                          saveStatus.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : saveStatus.type === 'error' 
                            ? 'bg-red-50 border-red-100 text-red-700'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-800'
                        }`}>
                          {saveStatus.type === 'loading' && (
                            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          )}
                          <span>{saveStatus.msg}</span>
                        </div>
                      )}

                      {/* Submit action */}
                      <button
                        onClick={handleSaveCorrection}
                        disabled={saveStatus?.type === 'loading'}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-5 h-5" />
                        <span>حفظ وإرسال جميع البيانات شيت جوجل</span>
                      </button>

                    </div>
                  </div>

                </div>
              ) : (
                // Dashboard Tables View
                <div className="space-y-8">
                  {/* Sync status alert if using actual backend */}
                  {!isDatabaseMocked && isSyncing && (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        جاري مزامنة وسحب أحدث تلاوات ودروس الطلاب المسجلة في شيت جوجل...
                      </span>
                    </div>
                  )}

                  {activeTab === 'students' ? (
                    <StudentTable
                      data={students}
                      onCorrect={(row) => handleSelectLesson(row, false)}
                      onEdit={(row) => handleSelectLesson(row, true)}
                    />
                  ) : (
                    <SettingsPanel
                      settings={settings}
                      onSaveSettings={handleSaveSettings}
                      onRefreshFromGoogle={() => fetchLiveDatabase(settings.googleAppsScriptUrl)}
                      isLoading={isSyncing}
                    />
                  )}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
