import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LessonItem, ProfileData, ContactData, PredefinedText,
  StickerItem, WatermarkSettings, AppConfig
} from './types';
import {
  INITIAL_PROFILE, INITIAL_CONTACT, INITIAL_PREDEFINED_TEXTS,
  INITIAL_STICKERS, INITIAL_WATERMARK, INITIAL_LESSONS
} from './mockData';

// Custom Components
import Header from './components/Header';
import LessonList from './components/LessonList';
import CanvasBoard from './components/CanvasBoard';
import AudioPlayer from './components/AudioPlayer';
import GradeForm from './components/GradeForm';
import LoginModal from './components/LoginModal';
import SheetsConfig from './components/SheetsConfig';

import { Settings, RefreshCw, AlertCircle, FileText, CheckCircle, Database } from 'lucide-react';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // App Configurations (Google Sheets connector vs Local Simulator)
  const [config, setConfig] = useState<AppConfig>({
    webAppUrl: '',
    useLiveConnection: false
  });
  const [configOpen, setConfigOpen] = useState(false);

  // Active student selection
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [canvasBase64, setCanvasBase64] = useState<string>('');

  // Main data collections
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);
  const [contact, setContact] = useState<ContactData>(INITIAL_CONTACT);
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>(INITIAL_PREDEFINED_TEXTS);
  const [stickers, setStickers] = useState<StickerItem[]>(INITIAL_STICKERS);
  const [watermark, setWatermark] = useState<WatermarkSettings>(INITIAL_WATERMARK);

  // Status indicator
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Original Media Preview Modal
  const [previewOriginalMediaOpen, setPreviewOriginalMediaOpen] = useState(false);

  // Load configuration and data on boot
  useEffect(() => {
    // 1. Restore auth session
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    }

    // 2. Restore Google Sheet Configuration
    const savedConfig = localStorage.getItem('calligraphy_sheets_config');
    let activeConfig: AppConfig = { webAppUrl: '', useLiveConnection: false };
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        activeConfig = parsed;
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to parse sheets configuration', e);
      }
    }

    // 3. Load Lessons & metadata
    loadAllData(activeConfig);
  }, []);

  // Main fetch function that handles Live connection vs Simulator
  const loadAllData = async (activeConfig: AppConfig) => {
    setLoading(true);
    setConnectionError(null);
    setStatusMessage('جاري تحميل وتزامن البيانات من قاعدة البيانات السحابية...');

    if (activeConfig.useLiveConnection && activeConfig.webAppUrl) {
      try {
        // Fetch lessons, predefined texts, stickers, and watermark settings in parallel
        const [resLessons, resTexts, resStickers, resWatermark] = await Promise.all([
          fetch(`/api/sheets?url=${encodeURIComponent(activeConfig.webAppUrl)}&action=getTableData`),
          fetch(`/api/sheets?url=${encodeURIComponent(activeConfig.webAppUrl)}&action=getPredefinedTexts`),
          fetch(`/api/sheets?url=${encodeURIComponent(activeConfig.webAppUrl)}&action=getStickerUrls`),
          fetch(`/api/sheets?url=${encodeURIComponent(activeConfig.webAppUrl)}&action=getWatermarkSettings`)
        ]);

        let parseErrorOccurred = false;
        let isHtmlResponse = false;

        // Process Lessons
        if (resLessons.ok) {
          const text = await resLessons.text();
          if (text.trim().startsWith('<') || text.includes('<html>') || text.includes('<!DOCTYPE')) {
            isHtmlResponse = true;
            parseErrorOccurred = true;
          } else {
            try {
              const lessonsData = JSON.parse(text);
              if (Array.isArray(lessonsData)) {
                setLessons(lessonsData);
              } else {
                parseErrorOccurred = true;
              }
            } catch (e) {
              parseErrorOccurred = true;
            }
          }
        } else {
          parseErrorOccurred = true;
        }

        // Process Predefined Texts
        if (resTexts.ok && !isHtmlResponse) {
          try {
            const text = await resTexts.text();
            if (!text.trim().startsWith('<') && !text.includes('<html>') && !text.includes('<!DOCTYPE')) {
              const textsData = JSON.parse(text);
              if (Array.isArray(textsData)) {
                setPredefinedTexts(textsData);
              }
            }
          } catch (e) {}
        }

        // Process Stickers
        if (resStickers.ok && !isHtmlResponse) {
          try {
            const text = await resStickers.text();
            if (!text.trim().startsWith('<') && !text.includes('<html>') && !text.includes('<!DOCTYPE')) {
              const stickersData = JSON.parse(text);
              if (Array.isArray(stickersData)) {
                const mappedStickers = stickersData.map((fileId: string) => ({
                  fileId: fileId,
                  url: `https://lh3.googleusercontent.com/d/${fileId}`
                }));
                setStickers(mappedStickers);
              }
            }
          } catch (e) {}
        }

        // Process Watermark Settings
        if (resWatermark.ok && !isHtmlResponse) {
          try {
            const text = await resWatermark.text();
            if (!text.trim().startsWith('<') && !text.includes('<html>') && !text.includes('<!DOCTYPE')) {
              const watermarkData = JSON.parse(text);
              if (watermarkData && !watermarkData.error) {
                setWatermark({
                  logoUrl: watermarkData.logoUrl ? `https://lh3.googleusercontent.com/d/${watermarkData.logoUrl}` : '',
                  opacity: watermarkData.opacity ?? 1,
                  sizeFactor: watermarkData.sizeFactor ?? 1,
                  logoPosition: watermarkData.logoPosition ?? 'bottom-right',
                  textPrefix: watermarkData.textPrefix ?? '',
                  fontSize: watermarkData.fontSize ?? 20,
                  textPosition: watermarkData.textPosition ?? 'bottom-left'
                });
              }
            }
          } catch (e) {}
        }

        if (parseErrorOccurred) {
          if (isHtmlResponse) {
            setConnectionError(
              'رابط تطبيق الويب المضاف يرجع صفحة ويب (HTML) بدلاً من بيانات JSON. هذا يعني أنه تم استدعاء دالة doGet الأصلية التي تعرض قالب الصفحة، ولم تقم باستبدالها لتمرير الـ Actions والبيانات البرمجية المطلوبة. يرجى مراجعة الكود بالأسفل.'
            );
          } else {
            setConnectionError(
              'فشل في تحليل البيانات الواردة من قوقل شيت. يرجى التأكد من تسمية الصفحات A1 و Settings بشكل مطابق للشيت.'
            );
          }
          loadFromLocalFallback();
        }

      } catch (err) {
        console.error('Error fetching live Google Sheet data, falling back to simulator:', err);
        setConnectionError('تعذر الاتصال بالرابط المدخل. يرجى التأكد من تفعيل النشر لـ "الجميع (Anyone)" في قوقل شيت.');
        loadFromLocalFallback();
      }
    } else {
      // Load from Local Storage or defaults
      loadFromLocalFallback();
    }
    setLoading(false);
  };

  const loadFromLocalFallback = () => {
    const savedLessons = localStorage.getItem('calligraphy_lessons');
    if (savedLessons) {
      try {
        setLessons(JSON.parse(savedLessons));
      } catch (e) {
        setLessons(INITIAL_LESSONS);
      }
    } else {
      setLessons(INITIAL_LESSONS);
      localStorage.setItem('calligraphy_lessons', JSON.stringify(INITIAL_LESSONS));
    }
  };

  // Intercept lesson selection to fetch previously saved data if any
  const handleSelectLesson = async (lesson: LessonItem) => {
    if (lesson.isSaved && config.useLiveConnection && config.webAppUrl) {
      setLoading(true);
      setStatusMessage('جاري استرداد الملاحظات والدرجات والوسائط المحفوظة من الشيت...');
      try {
        const response = await fetch(`/api/sheets?url=${encodeURIComponent(config.webAppUrl)}&action=getSavedData&row=${lesson.row}`);
        if (response.ok) {
          const savedData = await response.json();
          const detailedLesson: LessonItem = {
            ...lesson,
            notes: savedData.notes || '',
            imageGrade: savedData.imageGrade || '',
            audioGrade: savedData.audioGrade || '',
            modifiedImageUrl: savedData.modifiedImage || lesson.imageUrl || '',
            additionalImageUrl: savedData.additionalImage || '',
            additionalVideoUrl: savedData.video || '',
            additionalAudioUrl: savedData.audio || '',
          };
          setSelectedLesson(detailedLesson);
        } else {
          setSelectedLesson(lesson);
        }
      } catch (err) {
        console.error('Failed to load saved correction data:', err);
        setSelectedLesson(lesson);
      }
      setLoading(false);
    } else {
      setSelectedLesson(lesson);
    }
  };

  // Save new configuration
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('calligraphy_sheets_config', JSON.stringify(newConfig));
    loadAllData(newConfig);
  };

  // Login handler
  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setCurrentUser(null);
  };

  // Save lesson correction handler
  const handleSaveCorrection = async (formData: {
    notes: string;
    imageGrade: string;
    audioGrade: string;
    additionalImage: string;
    additionalVideo: string;
    additionalAudio: string;
  }) => {
    if (!selectedLesson) return;

    // Simulate saving on Local Database (localStorage)
    const updatedLessons = lessons.map((item) => {
      if (item.studentId === selectedLesson.studentId && item.lessonNumber === selectedLesson.lessonNumber && item.row === selectedLesson.row) {
        return {
          ...item,
          isSaved: true,
          notes: formData.notes,
          imageGrade: formData.imageGrade,
          audioGrade: formData.audioGrade,
          modifiedImageUrl: canvasBase64 || item.imageUrl, // Save drawn whiteboard
          additionalImageUrl: formData.additionalImage,
          additionalVideoUrl: formData.additionalVideo,
          additionalAudioUrl: formData.additionalAudio,
          correctionDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          correctionCount: (item.correctionCount || 0) + 1,
        };
      }
      return item;
    });

    setLessons(updatedLessons);
    localStorage.setItem('calligraphy_lessons', JSON.stringify(updatedLessons));

    // If using live connection, send webhook write back to Google Apps Script
    if (config.useLiveConnection && config.webAppUrl) {
      try {
        const payload = {
          action: 'saveAllMedia',
          row: selectedLesson.row,
          notes: formData.notes,
          imageGrade: formData.imageGrade,
          audioGrade: formData.audioGrade,
          canvasBase64: canvasBase64, // Big modified image
          imageBase64: formData.additionalImage,
          videoBase64: formData.additionalVideo,
          audioBase64: formData.additionalAudio,
          studentId: selectedLesson.studentId,
          studentName: selectedLesson.studentName,
          lessonNumber: selectedLesson.lessonNumber,
          submissionCount: selectedLesson.imageSubmissionCount || selectedLesson.audioSubmissionCount,
        };

        // POST to Live Google Apps Script URL via our server-side API proxy (bypasses browser CORS block)
        const response = await fetch(`/api/sheets?url=${encodeURIComponent(config.webAppUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.warn('API returned non-200, but data was preserved locally.');
        }
      } catch (e) {
        console.error('Failed to post live data back to Sheet:', e);
      }
    }

    // Refresh general list data
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  // Calculations for Stats
  const stats = {
    total: lessons.length,
    corrected: lessons.filter((l) => l.isSaved).length,
    pending: lessons.filter((l) => !l.isSaved).length,
  };

  return (
    <div className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col font-sans selection:bg-[#d4a017] selection:text-zinc-950" id="main-app-container">
      
      {/* 1. Header Bar */}
      <Header
        profile={profile}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenConfig={() => setConfigOpen(true)}
        stats={stats}
      />

      {/* 2. Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">

        {/* Global Loading overlay */}
        {loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-center gap-3 animate-pulse text-zinc-300">
            <RefreshCw className="w-5 h-5 text-[#d4a017] animate-spin" />
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Active connection mode banner */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850 px-4 py-3 rounded-2xl text-xs text-zinc-400 text-right" dir="rtl">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#d4a017]" />
              <span>مصدر قاعدة البيانات الحالي: </span>
              <strong className={config.useLiveConnection ? 'text-amber-500' : 'text-zinc-300'}>
                {config.useLiveConnection ? 'متصل حياً بقوقل شيت (Google Sheets API)' : 'المحاكي المحلي النشط (بيانات محفوظة ذاتياً)'}
              </strong>
            </div>
            
            <button
              onClick={() => setConfigOpen(true)}
              className="text-xs text-[#d4a017] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              تغيير إعدادات الاتصال بالشيت
            </button>
          </div>
        )}

        {/* Connection Error Warning Banner */}
        {connectionError && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-200 p-4 rounded-2xl flex items-start gap-3 text-xs md:text-sm text-right" dir="rtl">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 text-right">
              <p className="font-bold text-red-300">تنبيه اتصال بقاعدة البيانات (Google Sheets):</p>
              <p className="opacity-90 leading-relaxed text-zinc-300">{connectionError}</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* USER NOT AUTHENTICATED -> SHOW LOGIN */}
          {!currentUser ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="login"
            >
              <LoginModal onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          ) : selectedLesson ? (
            /* INDIVIDUAL LESSON ACTIVE VIEW WORKSPACE */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key="workspace"
              className="space-y-6"
            >
              {/* Back to List breadcrumb */}
              <div className="flex items-center justify-between" dir="rtl">
                <h2 className="text-base font-bold text-zinc-300">مساحة تصحيح الدرس الفردي</h2>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-xl border border-zinc-800 hover:text-[#d4a017] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  العودة لقائمة الدروس العامة
                </button>
              </div>

              {/* Display Canvas Board if Image lesson OR Audio Player if Audio lesson */}
              {selectedLesson.imageFileId ? (
                <div className="space-y-3">
                  <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl text-right text-xs text-zinc-400" dir="rtl">
                    💡 <b>ملاحظة للسبورة:</b> يمكنك استخدام بكرة الفأرة للتكبير والتصغير أو سحب الصورة لتحريكها بعد تفعيل زر <b>(تحريك وحركة)</b> بالأعلى لمعاينة أدق كراسات الخطوط ذات الجودة العالية.
                  </div>
                  <CanvasBoard
                    imageUrl={selectedLesson.modifiedImageUrl || selectedLesson.imageUrl || ''}
                    predefinedTexts={predefinedTexts}
                    stickers={stickers}
                    watermark={watermark}
                    studentId={selectedLesson.studentId}
                    studentName={selectedLesson.studentName}
                    lessonNumber={selectedLesson.lessonNumber}
                    onSaveCanvasState={(base64) => setCanvasBase64(base64)}
                  />
                </div>
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl space-y-4">
                  <div className="text-right">
                    <h3 className="text-sm font-bold text-zinc-300 mb-1">استماع لدروس تلاوة أو شرح الطالب الشفهي:</h3>
                    <p className="text-xs text-zinc-500">تم تنزيل وتسهيل مشغل الصوت المتطور للتحكم في السرعات بسلاسة تامة.</p>
                  </div>
                  <AudioPlayer src={selectedLesson.audioUrl || ''} title={`تسجيل الطالب: ${selectedLesson.studentName} (الدرس ${selectedLesson.lessonNumber})`} />
                </div>
              )}

              {/* Grading input and feedback form below */}
              <GradeForm
                studentName={selectedLesson.studentName}
                studentId={selectedLesson.studentId}
                lessonNumber={selectedLesson.lessonNumber}
                mediaType={selectedLesson.imageFileId ? 'image' : 'audio'}
                originalFileId={selectedLesson.imageFileId || selectedLesson.audioFileId}
                onOpenOriginalMedia={() => setPreviewOriginalMediaOpen(true)}
                onSaveCorrection={handleSaveCorrection}
                onBack={() => setSelectedLesson(null)}
              />
            </motion.div>
          ) : (
            /* LESSONS LIST VIEW OVERVIEW */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="list"
            >
              <LessonList
                lessons={lessons}
                onSelectLesson={handleSelectLesson}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Database configurations modal */}
        {configOpen && (
          <SheetsConfig
            config={config}
            onSaveConfig={handleSaveConfig}
            onClose={() => setConfigOpen(false)}
          />
        )}

        {/* Large Original Media Lightbox/Preview modal */}
        {previewOriginalMediaOpen && selectedLesson && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur flex items-center justify-center p-4 z-[60] animate-fade-in" id="original-media-lightbox">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="bg-zinc-950 p-4 border-b border-zinc-850 flex items-center justify-between" dir="rtl">
                <span className="text-sm font-bold text-zinc-300">معاينة الملف الأصلي الكبير المرسل من الطالب</span>
                <button
                  onClick={() => setPreviewOriginalMediaOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>

              {/* Content body */}
              <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-zinc-950">
                {selectedLesson.imageFileId ? (
                  <img
                    src={selectedLesson.imageUrl}
                    alt="كراسة الطالب الأصلية"
                    className="max-w-full max-h-[70vh] object-contain rounded border border-zinc-800 shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full max-w-md">
                    <AudioPlayer src={selectedLesson.audioUrl || ''} title="التسجيل الصوتي الأصلي دون أي تعديل" />
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* 3. Footer info */}
      <footer className="py-6 px-4 border-t border-zinc-900/80 bg-zinc-950 text-center text-xs text-zinc-500 font-sans leading-normal">
        <p>جميع الحقوق محفوظة © {new Date().getFullYear()} – أكاديمية تصحيح كراسات ومقاطع الخطاطين والطلاب السحابية</p>
        <p className="mt-1 opacity-60">مبني ومطور بتقنيات الويب السحابية السريعة ومتكامل مع جداول بيانات قوقل الآمنة</p>
      </footer>

    </div>
  );
}
