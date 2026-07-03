import React, { useState, useEffect } from 'react';
import { 
  Settings, Home, LogOut, ChevronRight, Save, Facebook, 
  Instagram, Youtube, MessageCircle, HelpCircle, ShieldAlert,
  Award, CheckCircle, FileSpreadsheet, Eye, User, Lock, AlertCircle
} from 'lucide-react';

import { 
  StudentSubmission, ProfileInfo, ContactInfo, 
  PredefinedText, WatermarkSettings, SavedCorrection 
} from './types';
import Dashboard from './components/Dashboard';
import DrawingBoard from './components/DrawingBoard';
import AudioPlayer from './components/AudioPlayer';
import AudioRecorder from './components/AudioRecorder';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  // Connection states
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem('lesson_correction_web_app_url') || '';
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'untested'>('untested');
  const [isLoading, setIsLoading] = useState(false);

  // Auth / Login states
  const [loggedInUser, setLoggedInUser] = useState<string>(() => {
    return localStorage.getItem('lesson_correction_logged_in_user') || '';
  });
  const [deviceId, setDeviceId] = useState<string>(() => {
    let id = localStorage.getItem('lesson_correction_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('lesson_correction_device_id', id);
    }
    return id;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Data states
  const [profile, setProfile] = useState<ProfileInfo>({
    logoUrl: '',
    title: 'منصة تصحيح الدروس',
    subtitle: 'مرحباً بك في لوحة تحكّم المعلّم التفاعلية'
  });
  const [contact, setContact] = useState<ContactInfo>({
    facebook: '', instagram: '', youtube: '', line: ''
  });
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [stickerUrls, setStickerUrls] = useState<string[]>([]);
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    logoUrl: '', opacity: 0.8, sizeFactor: 1, logoPosition: 'bottom-right',
    textPrefix: '', fontSize: 20, textPosition: 'bottom-left'
  });
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([]);

  // Navigation states
  const [view, setView] = useState<'dashboard' | 'correction' | 'settings'>('dashboard');
  
  // Correction active workspace states
  const [activeSubmission, setActiveSubmission] = useState<StudentSubmission | null>(null);
  const [isSavedEditing, setIsSavedEditing] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  const [activeImageBase64, setActiveImageBase64] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  // Teacher feedback inputs
  const [imageGrade, setImageGrade] = useState('');
  const [audioGrade, setAudioGrade] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  
  // Saved files and recordings
  const [feedbackCanvasBase64, setFeedbackCanvasBase64] = useState<string | null>(null);
  const [feedbackAudioBase64, setFeedbackAudioBase64] = useState<string | null>(null);
  
  // Supplementary uploads (Optional additional image/video)
  const [additionalImageBase64, setAdditionalImageBase64] = useState<string | null>(null);
  const [additionalVideoBase64, setAdditionalVideoBase64] = useState<string | null>(null);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [showAdditionalInputs, setShowAdditionalInputs] = useState(false);

  // Load everything if URL is set on start
  useEffect(() => {
    if (webAppUrl) {
      fetchData();
    }
  }, [webAppUrl]);

  // Fetch all spreadsheet data in a single optimized payload
  const fetchData = async () => {
    if (!webAppUrl) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${webAppUrl}?action=getInitialData`);
      const result = await response.json();
      
      if (result && result.success) {
        setProfile(result.profile);
        setContact(result.contact);
        setSubmissions(result.tableData || []);
        setPredefinedTexts(result.predefinedTexts || []);
        setStickerUrls(result.stickerUrls || []);
        setWatermark(result.watermark);
        setAdditionalHeaders(result.additionalHeaders || []);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
        console.error('Apps Script Error:', result.error);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      console.error('Connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Connection URL
  const testConnection = async (): Promise<boolean> => {
    if (!webAppUrl) return false;
    try {
      const response = await fetch(`${webAppUrl}?action=getInitialData`);
      const result = await response.json();
      if (result && result.success) {
        setConnectionStatus('connected');
        return true;
      }
    } catch (e) {}
    setConnectionStatus('disconnected');
    return false;
  };

  const saveUrlSetting = (url: string) => {
    setWebAppUrl(url);
    localStorage.setItem('lesson_correction_web_app_url', url);
  };

  // Authenticate user with Apps Script
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!webAppUrl) {
      setLoginError('يرجى تهيئة رابط قاعدة البيانات (Google Sheet Web App URL) من قائمة الإعدادات بالأعلى أولاً.');
      return;
    }
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError('يرجى تعبئة اسم المستخدم وكلمة المرور.');
      return;
    }

    setIsLoggingIn(true);

    // Get current location (Optional secure telemetry)
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (e) {
      // ignore geopermission declines
    }

    try {
      const payload = {
        action: 'loginUser',
        username: usernameInput.trim(),
        deviceId,
        lat,
        lng
      };

      const response = await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result && result.success) {
        setLoggedInUser(usernameInput.trim());
        localStorage.setItem('lesson_correction_logged_in_user', usernameInput.trim());
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setLoginError(result.message || 'خطأ في اسم المستخدم أو كلمة المرور، أو تم حظر هذا الجهاز.');
      }
    } catch (err) {
      setLoginError('فشل الاتصال بخادم تسجيل الدخول. يرجى مراجعة رابط الإعدادات.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser('');
    localStorage.removeItem('lesson_correction_logged_in_user');
  };

  // Load homework resources (Images / Audios) for correction
  const handleSelectRowForCorrection = async (row: StudentSubmission, isEditing: boolean) => {
    setActiveSubmission(row);
    setIsSavedEditing(isEditing);
    setView('correction');
    setIsLoadingMedia(true);

    // Reset feedback inputs
    setImageGrade('');
    setAudioGrade('');
    setCorrectionNotes('');
    setFeedbackCanvasBase64(null);
    setFeedbackAudioBase64(null);
    setAdditionalImageBase64(null);
    setAdditionalVideoBase64(null);
    setActiveImageBase64(null);
    setActiveAudioUrl(null);
    setShowAdditionalInputs(false);

    // If editing previously saved work, load historical evaluation values
    if (isEditing) {
      try {
        const response = await fetch(`${webAppUrl}?action=getSavedData&row=${row.row}`);
        const result = await response.json();
        if (result && result.success) {
          setCorrectionNotes(result.notes || '');
          setImageGrade(result.imageGrade || '');
          setAudioGrade(result.audioGrade || '');
          
          if (result.modifiedImageUrl) {
            // Fetch saved annotated image base64
            fetchMediaBase64(extractFileIdFromUrl(result.modifiedImageUrl), (b64) => {
              setActiveImageBase64(b64);
            });
          }
          if (result.audioUrl) {
            fetchMediaBase64(extractFileIdFromUrl(result.audioUrl), (b64) => {
              setActiveAudioUrl(b64);
            });
          }
        }
      } catch (err) {
        console.error('Failed to load past saved values:', err);
      }
    }

    // Load original submission resources (Image)
    if (row.imageFileId) {
      fetchMediaBase64(row.imageFileId, (b64) => {
        // Only set if we aren't editing previously modified artwork
        if (!isEditing) {
          setActiveImageBase64(b64);
        }
      });
    }

    // Load original submission resources (Audio)
    if (row.audioFileId) {
      fetchMediaBase64(row.audioFileId, (b64) => {
        setActiveAudioUrl(b64);
      });
    }

    setIsLoadingMedia(false);
  };

  // Helper utility to proxy Drive files cleanly as local base64
  const fetchMediaBase64 = async (fileId: string, callback: (b64: string) => void) => {
    if (!webAppUrl || !fileId) return;
    try {
      const response = await fetch(`${webAppUrl}?action=getMediaAsBase64&fileId=${fileId}`);
      const result = await response.json();
      if (result && result.success && result.base64) {
        callback(result.base64);
      }
    } catch (e) {
      console.error('Error proxying Drive file:', e);
    }
  };

  const extractFileIdFromUrl = (url: string): string => {
    if (!url) return '';
    const cleanUrl = url.split('?')[0];
    const regex = /\/(?:d|folders|file\/d)\/([a-zA-Z0-9_-]+)/;
    const match = cleanUrl.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    return url;
  };

  // Submit Evaluation and Save files to Sheet
  const handleSubmitCorrection = async () => {
    if (!activeSubmission || !webAppUrl) return;

    setIsSavingCorrection(true);
    try {
      const cleanName = activeSubmission.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const suffix = `${cleanName}-${activeSubmission.studentId}-درس-${activeSubmission.lessonNumber}-إرسال-${activeSubmission.imageSubmissionCount || activeSubmission.audioSubmissionCount}`;
      
      const payload = {
        action: 'saveAllMedia',
        row: activeSubmission.row,
        notes: correctionNotes,
        imageGrade,
        audioGrade,
        canvasBase64: feedbackCanvasBase64,
        canvasFilename: `تصحيح_سبورة_${suffix}.jpg`,
        imageBase64: additionalImageBase64,
        imageFilename: `صورة_مرفقة_${suffix}.jpg`,
        videoBase64: additionalVideoBase64,
        videoFilename: `فيديو_مرفق_${suffix}.mp4`,
        audioBase64: feedbackAudioBase64,
        audioFilename: `ملاحظة_صوتية_${suffix}.mp3`
      };

      const response = await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result && result.success) {
        alert('🎉 تم حفظ وتوثيق درجات وتعديلات الطالب بنجاح في Google Sheet وجارٍ تحديث القوائم!');
        fetchData(); // reload table state
        setView('dashboard');
      } else {
        alert('❌ فشل حفظ التقييم: ' + (result.error || 'خطأ غير معروف'));
      }
    } catch (err) {
      alert('❌ حدث خطأ تقني في الاتصال بالشبكة أثناء الحفظ.');
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // Additional uploads handlers
  const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setAdditionalImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* 1. Header Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="font-black text-slate-800 tracking-tight text-sm md:text-md font-sans">منصة تصحيح الدروس الذكية</span>
            </div>

            {/* Nav controls */}
            <div className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Home className="w-4 h-4" />
                الرئيسية
              </button>

              <button
                type="button"
                onClick={() => setView('settings')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'settings' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Settings className="w-4 h-4" />
                إعدادات الربط
              </button>

              {loggedInUser && (
                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                  <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 text-xs font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>المصحح: {loggedInUser}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="تسجيل خروج"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {!webAppUrl ? (
          /* Empty Database Config State */
          <div className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 text-center shadow-xs flex flex-col items-center max-w-2xl mx-auto gap-4 mt-8">
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <FileSpreadsheet className="w-12 h-12 text-emerald-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">مرحباً بك في منصتك الخاصة لتصحيح الدروس</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              لتتمكن من قراءة ملفات الدروس وتصحيحها مجاناً، يرجى الانتقال إلى قائمة 
              <strong> إعدادات الربط </strong> بالأعلى ووضع رابط كود Google Sheets الخاص بك.
            </p>
            <button
              type="button"
              onClick={() => setView('settings')}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              انتقل لتهيئة وضبط الاتصال الآن
            </button>
          </div>
        ) : !loggedInUser ? (
          /* Secure Login Form Card */
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs max-w-md mx-auto flex flex-col gap-5 mt-12 text-right" dir="rtl">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">تسجيل دخول المعلّم / المصحح</h2>
              <p className="text-xs text-slate-400">يرجى تسجيل الدخول لحماية البيانات وتأكيد هويتك لحفظ الدرجات</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">اسم المستخدم</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسمك المسجل"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
                  />
                  <User className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">كلمة المرور</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="أدخل كلمة مرورك"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
                  />
                  <Lock className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : null}
                تسجيل الدخول للمنصة
              </button>
            </form>

            <div className="border-t border-slate-100 pt-4 text-center">
              <span className="text-[10px] text-slate-400">الرمز التعريفي للجهاز: <span className="font-mono">{deviceId}</span></span>
            </div>
          </div>
        ) : (
          /* Active App Core Views Routing */
          <div>
            {view === 'dashboard' && (
              <Dashboard 
                submissions={submissions}
                profile={profile}
                onSelectRow={handleSelectRowForCorrection}
                isLoading={isLoading}
              />
            )}

            {view === 'settings' && (
              <SettingsPanel 
                webAppUrl={webAppUrl}
                onSaveUrl={saveUrlSetting}
                onTestConnection={testConnection}
                isTesting={isLoading}
                connectionStatus={connectionStatus}
              />
            )}

            {view === 'correction' && activeSubmission && (
              /* Active Evaluation Workspace */
              <div className="flex flex-col gap-6 text-right" dir="rtl">
                
                {/* Workspace Header */}
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setView('dashboard')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl transition-all"
                      title="العودة للقائمة"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                      <span className="text-xs text-slate-400 font-sans">تصحـيـح مـادة درس الطالـب</span>
                      <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                        {activeSubmission.studentName}
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">#{activeSubmission.studentId}</span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl text-slate-600 text-center font-sans">
                      <span className="block text-[9px] text-slate-400">رقم الدرس</span>
                      <strong className="text-slate-800">{activeSubmission.lessonNumber}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-slate-600 text-center font-sans">
                      <span className="block text-[9px] text-slate-400">مرات الإرسال</span>
                      <strong className="text-slate-800">{activeSubmission.imageFileId ? activeSubmission.imageSubmissionCount : activeSubmission.audioSubmissionCount}</strong>
                    </div>
                    {isSavedEditing && (
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-xl font-bold">
                        تعديل تقييم محفوظ سابقاً
                      </span>
                    )}
                  </div>
                </div>

                {/* Additional student details grid (Columns T-Y) */}
                {additionalHeaders.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500 block mb-2">معلومات وبيانات إضافية عن الطالب والدرس:</span>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      {additionalHeaders.map((header, idx) => {
                        let val = '';
                        if (idx === 0) val = activeSubmission.additionalT;
                        if (idx === 1) val = activeSubmission.additionalU;
                        if (idx === 2) val = activeSubmission.additionalV;
                        if (idx === 3) val = activeSubmission.additionalW;
                        if (idx === 4) val = activeSubmission.additionalX;
                        if (idx === 5) val = activeSubmission.additionalY;
                        
                        return (
                          <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                            <span className="block text-[10px] text-slate-400 font-sans">{header || 'عمود إضافي'}</span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5">{val || '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Content: Audio recitation player if exists */}
                {activeSubmission.audioFileId && (
                  <AudioPlayer 
                    audioUrl={activeAudioUrl} 
                    studentName={activeSubmission.studentName}
                    isLoading={isLoadingMedia}
                  />
                )}

                {/* Main Interactive Canvas board if visual representation exists */}
                {activeSubmission.imageFileId && (
                  <DrawingBoard 
                    imageUrl={activeImageBase64}
                    predefinedTexts={predefinedTexts}
                    stickerUrls={stickerUrls}
                    onSaveCanvas={(base64) => setFeedbackCanvasBase64(base64)}
                    isLoadingImage={isLoadingMedia}
                    onFetchBase64={fetchMediaBase64}
                  />
                )}

                {/* Teacher evaluation scores & notes fields */}
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">تفاصيل الدرجات والملاحظات التقييمية</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSubmission.imageFileId && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">درجة الصورة / الأداء البصري</label>
                        <input 
                          type="text" 
                          placeholder="أدخل درجة مادة الصورة (مثال: ١٠/١٠)"
                          value={imageGrade}
                          onChange={(e) => setImageGrade(e.target.value)}
                          className="p-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
                        />
                      </div>
                    )}

                    {activeSubmission.audioFileId && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">درجة التسميع / الأداء الصوتي</label>
                        <input 
                          type="text" 
                          placeholder="أدخل درجة التلاوة أو الإلقاء الصوتي"
                          value={audioGrade}
                          onChange={(e) => setAudioGrade(e.target.value)}
                          className="p-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">الملاحظات والتوجيهات الكتابية للمعلم</label>
                    <textarea 
                      rows={3}
                      placeholder="اكتب التوجيهات بالتفصيل لتظهر مباشرة للطالب في ملف الرد..."
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      className="p-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
                    />
                  </div>

                  {/* Vocal feedback notes recorder */}
                  <AudioRecorder 
                    onSaveRecording={(base64) => setFeedbackAudioBase64(base64)}
                    recordedBase64={feedbackAudioBase64}
                    onClearRecording={() => setFeedbackAudioBase64(null)}
                  />

                  {/* Supplemental assets upload accordion */}
                  <div className="border border-slate-200/60 rounded-xl overflow-hidden mt-2 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setShowAdditionalInputs(!showAdditionalInputs)}
                      className="w-full flex items-center justify-between p-3 text-xs text-slate-600 font-semibold"
                    >
                      <span>📂 هل ترغب في إرفاق ملفات إضافية مساعدة للرد؟ (صورة توضيحية إضافية)</span>
                      <span>{showAdditionalInputs ? 'إخفاء' : 'إظهار خيارات الإرفاق'}</span>
                    </button>

                    {showAdditionalInputs && (
                      <div className="p-3 bg-white border-t border-slate-200/60 flex flex-col gap-3 text-xs">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-slate-600">صورة مرفقة إضافية (أمثلة، توضيحات، لوحة القواعد)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleAdditionalImageUpload}
                            className="p-2 border border-slate-200 rounded-lg text-xs" 
                          />
                          {additionalImageBase64 && (
                            <div className="mt-2 text-emerald-600 flex items-center gap-1 font-semibold">
                              ✓ تم إرفاق الصورة الإضافية وتجهيزها للحفظ.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setView('dashboard')}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                    >
                      إلغاء والعودة للرئيسية
                    </button>

                    <button
                      type="button"
                      disabled={isSavingCorrection}
                      onClick={handleSubmitCorrection}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      {isSavingCorrection ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      حفظ تصحيح مادة الدرس وإرسال التقييم
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Footer Links Area */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12 border-t border-slate-800 text-center font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-sans">
            © {new Date().getFullYear()} جميع الحقوق محفوظة لـ <strong>{profile.title}</strong> — منصة مصممة خصيصاً للمعلّمين.
          </p>

          {/* Social links row */}
          <div className="flex items-center gap-3">
            {contact.facebook && (
              <a href={contact.facebook} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all" title="فيسبوك">
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {contact.instagram && (
              <a href={contact.instagram} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all" title="انستجرام">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {contact.youtube && (
              <a href={contact.youtube} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all" title="يوتيوب">
                <Youtube className="w-4 h-4" />
              </a>
            )}
            {contact.line && (
              <a href={contact.line} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all" title="تواصل لاين">
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
