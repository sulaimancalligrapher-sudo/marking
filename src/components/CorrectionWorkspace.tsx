import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, BookOpen, Star, FileText, Upload, Image as ImageIcon, Video, Volume2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Play, Copy } from 'lucide-react';
import { StudentLesson, WatermarkSettings, PredefinedText } from '../types';
import DrawingBoard from './DrawingBoard';
import AudioPlayer from './AudioPlayer';
import { fetchDriveFileAsUrl, uploadFileToDrive, saveCorrectionToSheet } from '../lib/googleApi';

interface CorrectionWorkspaceProps {
  lesson: StudentLesson;
  isNewCorrection: boolean;
  spreadsheetId: string;
  folderId: string;
  token: string;
  stickers: string[];
  predefinedTexts: PredefinedText[];
  watermarkSettings: WatermarkSettings | null;
  additionalHeaders: string[];
  onBack: () => void;
  onRefresh: () => void;
  googleUserEmail?: string;
}

export default function CorrectionWorkspace({
  lesson,
  isNewCorrection,
  spreadsheetId,
  folderId,
  token,
  stickers,
  predefinedTexts,
  watermarkSettings,
  additionalHeaders,
  onBack,
  onRefresh,
  googleUserEmail = 'artist.unseenbeauty@gmail.com',
}: CorrectionWorkspaceProps) {
  const mediaType = lesson.imageFileId ? 'image' : 'audio';

  // UI state
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lesson original media URL
  const [originalMediaUrl, setOriginalMediaUrl] = useState<string>('');
  const [originalMediaLoading, setOriginalMediaLoading] = useState<boolean>(false);

  // Input fields state
  const [notes, setNotes] = useState<string>('');
  const [imageGrade, setImageGrade] = useState<string>('');
  const [audioGrade, setAudioGrade] = useState<string>('');

  // Additional uploads base64 state
  const [additionalImgBase64, setAdditionalImgBase64] = useState<string | null>(null);
  const [additionalVidBase64, setAdditionalVidBase64] = useState<string | null>(null);
  const [additionalAudBase64, setAdditionalAudBase64] = useState<string | null>(null);

  // Loaded saved edit data state (if editing corrected lesson)
  useEffect(() => {
    // Reset inputs
    setNotes(lesson.isSaved ? lesson.notes : '');
    setImageGrade(lesson.isSaved ? lesson.imageGrade : '');
    setAudioGrade(lesson.isSaved ? lesson.audioGrade : '');
    setAdditionalImgBase64(lesson.isSaved ? lesson.additionalImageUrl : null);
    setAdditionalVidBase64(lesson.isSaved ? lesson.videoUrl : null);
    setAdditionalAudBase64(lesson.isSaved ? lesson.audioUrl : null);

    // Fetch original media blob URL from Drive
    const fileId = mediaType === 'image' ? lesson.imageFileId : lesson.audioFileId;
    if (fileId) {
      setOriginalMediaLoading(true);
      fetchDriveFileAsUrl(fileId, token)
        .then(url => {
          setOriginalMediaUrl(url);
          setOriginalMediaLoading(false);
        })
        .catch(err => {
          console.error(err);
          setStatusMessage('فشل تحميل الملف الأصلي من قوقل درايف. تأكد من توفر صلاحية الوصول.');
          setStatusType('error');
          setOriginalMediaLoading(false);
        });
    }
  }, [lesson, token]);

  // Handle uploading and saving everything
  const handleSaveCorrection = async (modifiedImageBase64?: string) => {
    setLoading(true);
    setStatusMessage('جاري معالجة ورفع الملفات الإضافية...');
    setStatusType('info');

    try {
      const studentNameSafe = lesson.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const suffix = `${studentNameSafe}-${lesson.studentId}-درس-${lesson.lessonNumber}-إرسال-${lesson.isSaved ? lesson.correctionCounter : (lesson.correctionCounter || 0) + 1}`;

      let finalModifiedUrl = lesson.modifiedImageUrl;
      let finalAdditionalImgUrl = lesson.additionalImageUrl;
      let finalVideoUrl = lesson.videoUrl;
      let finalAudioUrl = lesson.audioUrl;

      // 1. Upload Drawing canvas image if provided
      if (modifiedImageBase64) {
        setStatusMessage('جاري رفع الصورة المعدلة والمصححة إلى قوقل درايف...');
        const filename = `صورة-مصححة-${suffix}.jpg`;
        finalModifiedUrl = await uploadFileToDrive(token, folderId, filename, 'image/jpeg', modifiedImageBase64);
      }

      // 2. Upload additional image if new base64 exists
      if (additionalImgBase64 && additionalImgBase64.startsWith('data:image/')) {
        setStatusMessage('جاري رفع الصورة الإضافية...');
        const filename = `صورة-إضافية-${suffix}.jpg`;
        finalAdditionalImgUrl = await uploadFileToDrive(token, folderId, filename, 'image/jpeg', additionalImgBase64);
      }

      // 3. Upload video if new base64 exists
      if (additionalVidBase64 && additionalVidBase64.startsWith('data:video/')) {
        setStatusMessage('جاري رفع الفيديو الإضافي...');
        const mimeType = additionalVidBase64.match(/^data:(video\/\w+);base64,/)?.[1] || 'video/mp4';
        const ext = mimeType.split('/')[1] || 'mp4';
        const filename = `فيديو-${suffix}.${ext}`;
        finalVideoUrl = await uploadFileToDrive(token, folderId, filename, mimeType, additionalVidBase64);
      }

      // 4. Upload audio if new base64 exists
      if (additionalAudBase64 && additionalAudBase64.startsWith('data:audio/')) {
        setStatusMessage('جاري رفع الملف الصوتي الإضافي...');
        const mimeType = additionalAudBase64.match(/^data:(audio\/\w+);base64,/)?.[1] || 'audio/mpeg';
        const ext = mimeType.split('/')[1] || 'mp3';
        const filename = `صوت-${suffix}.${ext}`;
        finalAudioUrl = await uploadFileToDrive(token, folderId, filename, mimeType, additionalAudBase64);
      }

      // 5. Update Sheet row
      setStatusMessage('جاري حفظ الدرجات والتفاصيل في شيت قوقل...');
      await saveCorrectionToSheet(spreadsheetId, token, lesson, {
        notes,
        imageGrade,
        audioGrade,
        modifiedUrl: finalModifiedUrl,
        additionalImageUrl: finalAdditionalImgUrl,
        videoUrl: finalVideoUrl,
        audioUrl: finalAudioUrl,
        isNewCorrection,
      });

      setStatusMessage('تم حفظ وتوثيق التصحيح والدرجات بنجاح في ورقة قوقل!');
      setStatusType('success');
      setTimeout(() => {
        onRefresh();
        onBack();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setStatusMessage(`فشل الحفظ: ${err.message || err}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  // Base64 converter for files
  const convertFileToBase64 = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full flex flex-col gap-6" dir="rtl">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white transition cursor-pointer"
            title="رجوع للقائمة"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>تصحيح واجب الطالب:</span>
              <span className="text-emerald-400">{lesson.studentName}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">الصف رقم {lesson.row} في جدول البيانات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lesson.isSaved && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              <span>تم تصحيحه مسبقاً</span>
            </span>
          )}
          <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700/60 text-xs font-semibold rounded-lg">
            الدرس {lesson.lessonNumber}
          </span>
        </div>
      </div>

      {/* Main Grid: Student Bento Info & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Panel: Student Info Card & Grades Input Form */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Student Profile Bento Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">{lesson.studentName}</h3>
                <p className="text-xs text-slate-500 font-mono">رقم الطالب: {lesson.studentId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400">
              <div className="flex flex-col gap-1">
                <span>اسم الواجب</span>
                <span className="text-slate-200 text-sm font-bold flex items-center gap-1">
                  <BookOpen size={14} className="text-slate-500" />
                  الدرس {lesson.lessonNumber}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span>عدد الإرسالات</span>
                <span className="text-slate-200 text-sm font-bold">
                  {mediaType === 'image' ? lesson.imageSubmissionCount : lesson.audioSubmissionCount} مرات
                </span>
              </div>
            </div>

            {/* Custom spreadsheet metadata headers (T to Y) */}
            {additionalHeaders.length > 0 && (
              <div className="border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 font-bold hover:text-slate-300 transition"
                >
                  <span>تفاصيل الطالب الإضافية</span>
                  {showMetadata ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showMetadata && (
                  <div className="flex flex-col gap-2 mt-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs">
                    {[
                      { h: additionalHeaders[0], v: lesson.additionalT },
                      { h: additionalHeaders[1], v: lesson.additionalU },
                      { h: additionalHeaders[2], v: lesson.additionalV },
                      { h: additionalHeaders[3], v: lesson.additionalW },
                      { h: additionalHeaders[4], v: lesson.additionalX },
                      { h: additionalHeaders[5], v: lesson.additionalY },
                    ].map((item, i) => item.h ? (
                      <div key={i} className="flex justify-between items-center py-1 border-b border-slate-850 last:border-0">
                        <span className="text-slate-500">{item.h}</span>
                        <span className="text-slate-300 font-bold">{item.v || '-'}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grades and Notes Input Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-5">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Star size={16} className="text-amber-500" />
              <span>تقييم الواجب والدرجات</span>
            </h3>

            {/* Grade Fields depending on submission types */}
            <div className="flex flex-col gap-4">
              {mediaType === 'image' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">درجة الصورة</label>
                  <input
                    type="text"
                    value={imageGrade}
                    onChange={(e) => setImageGrade(e.target.value)}
                    placeholder="مثال: 10/10 أو ممتاز"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>
              )}

              {mediaType === 'audio' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">درجة التلاوة الصوتية</label>
                  <input
                    type="text"
                    value={audioGrade}
                    onChange={(e) => setAudioGrade(e.target.value)}
                    placeholder="مثال: 10/10 أو ممتاز"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>
              )}

              {/* Feedback Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">الملاحظات والتوجيهات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب ملاحظاتك وتوجيهاتك للطالب هنا..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Native Uploads & Media Recorders Block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Upload size={16} className="text-emerald-500" />
              <span>إرفاق ملفات تصحيح إضافية</span>
            </h3>

            {/* Custom Native Actions Grid */}
            <div className="grid grid-cols-3 gap-2">
              
              {/* Image Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-850 transition cursor-pointer text-slate-400 hover:text-slate-200">
                <ImageIcon size={20} className="mb-1 text-indigo-500" />
                <span className="text-[10px] font-bold">صورة إضافية</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) convertFileToBase64(file, setAdditionalImgBase64);
                  }}
                  className="hidden"
                />
              </label>

              {/* Video Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-850 transition cursor-pointer text-slate-400 hover:text-slate-200">
                <Video size={20} className="mb-1 text-rose-500" />
                <span className="text-[10px] font-bold">فيديو توضيحي</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) convertFileToBase64(file, setAdditionalVidBase64);
                  }}
                  className="hidden"
                />
              </label>

              {/* Audio Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-850 transition cursor-pointer text-slate-400 hover:text-slate-200">
                <Volume2 size={20} className="mb-1 text-sky-500" />
                <span className="text-[10px] font-bold">صوت إضافي</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) convertFileToBase64(file, setAdditionalAudBase64);
                  }}
                  className="hidden"
                />
              </label>

            </div>

            {/* Preview Areas for Uploaded items */}
            <div className="flex flex-col gap-3 mt-2 divide-y divide-slate-850">
              
              {/* Additional image thumbnail */}
              {additionalImgBase64 && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs text-slate-500 font-semibold">الصورة الإضافية المرفقة:</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-36">
                    <img src={additionalImgBase64} alt="Preview" className="w-full object-cover max-h-36" />
                    <button
                      onClick={() => setAdditionalImgBase64(null)}
                      className="absolute top-2 right-2 p-1 rounded bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold transition"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              )}

              {/* Video preview player */}
              {additionalVidBase64 && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs text-slate-500 font-semibold">الفيديو المرفق:</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-800">
                    <video src={additionalVidBase64} controls className="w-full max-h-40 bg-black" />
                    <button
                      onClick={() => setAdditionalVidBase64(null)}
                      className="absolute top-2 right-2 p-1 rounded bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold transition z-10"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              )}

              {/* Audio preview player */}
              {additionalAudBase64 && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs text-slate-500 font-semibold">الملف الصوتي المرفق:</span>
                  <div className="relative flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <audio src={additionalAudBase64} controls className="max-w-[200px]" />
                    <button
                      onClick={() => setAdditionalAudBase64(null)}
                      className="p-1 px-2.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Final Submit Trigger Card */}
          {mediaType === 'audio' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <button
                onClick={() => handleSaveCorrection()}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition active:scale-[0.98] shadow-lg shadow-emerald-600/10 cursor-pointer"
              >
                {loading ? 'جاري الحفظ والتثبيت...' : 'حفظ وإنهاء تصحيح الدرس الصوتي'}
              </button>
            </div>
          )}

        </div>

        {/* Left Panel: Primary corrections workspace (Board or Audio Player) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Status logs bar */}
          {statusMessage && (
            <div className="flex flex-col gap-4">
              <div className={`p-4 rounded-2xl flex items-center gap-3 border text-sm font-semibold animate-pulse ${
                statusType === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : statusType === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
              }`}>
                <AlertCircle size={18} className="shrink-0" />
                <span>{statusMessage}</span>
              </div>

              {/* Advanced Google Auth / 403 Permission Troubleshooting Card */}
              {statusType === 'error' && (statusMessage.includes('403') || statusMessage.toLowerCase().includes('permission') || statusMessage.toLowerCase().includes('parent')) && (
                <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 flex flex-col gap-4 text-right shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">تحليل وتوجيه لحل مشكلة الصلاحيات (خطأ 403)</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        بما أنك قمت بتسجيل الدخول بالحساب <span className="text-emerald-400 font-mono font-semibold">{googleUserEmail}</span>، بينما ملف الشيت والمجلد يقعان في <strong>حسابك الآخر</strong>، فإن النظام يحتاج إلى منح هذا الحساب الصلاحيات الكافية كـ <strong>محرر (Editor)</strong> للتعديل والرفع.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {/* Box 1: Sheet Write Permission 403 */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col gap-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <FileText size={14} className="shrink-0" />
                        <span>1. حل مشكلة تحديث درجات الطالب:</span>
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        إذا ظهر خطأ <code>PERMISSION_DENIED</code> عند حفظ الدرجات، فهذا يعني أن ملف الشيت (Google Sheet) لم يتم مشاركته مع الحساب الحالي بصلاحية التعديل.
                      </p>
                      <div className="text-[11px] text-slate-500 space-y-1 mt-1">
                        <p><strong>خطوات الحل:</strong></p>
                        <p>1. افتح ملف الشيت من حسابك الآخر (المالك للملف).</p>
                        <p>2. اضغط على زر <strong>مشاركة (Share)</strong> في الأعلى.</p>
                        <p>3. أضف البريد أدناه وتأكد من تعيين الصلاحية إلى <strong>محرر (Editor)</strong> وليس عارض.</p>
                      </div>
                    </div>

                    {/* Box 2: Drive Folder Permission 403 */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col gap-2">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Upload size={14} className="shrink-0" />
                        <span>2. حل مشكلة رفع صور التصحيح:</span>
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        إذا ظهر خطأ <code>Insufficient permissions for parent</code>، فهذا يعني أن مجلد الطلاب بقوقل درايف لم يُشارك مع الحساب الحالي.
                      </p>
                      <div className="text-[11px] text-slate-500 space-y-1 mt-1">
                        <p><strong>خطوات الحل:</strong></p>
                        <p>1. افتح قوقل درايف (Google Drive) بحسابك الآخر.</p>
                        <p>2. اذهب إلى المجلد المخصص لحفظ واجبات الطلاب (Folder ID).</p>
                        <p>3. اضغط عليه بالزر الأيمن للفأرة واشتركه مع الإيميل أدناه بصفة <strong>محرر (Editor)</strong>.</p>
                      </div>
                    </div>
                  </div>

                  {/* Copy Email Helper */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl mt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">البريد الإلكتروني المطلوب منحه الصلاحيات:</span>
                      <span className="font-mono text-emerald-400 select-all font-semibold">{googleUserEmail}</span>
                    </div>
                    <button
                      onClick={() => handleCopyEmail(googleUserEmail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'تم نسخ الإيميل' : 'نسخ الإيميل المطلوب'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive media stage */}
          <div className="flex-1 min-h-[500px]">
            {originalMediaLoading ? (
              <div className="h-[500px] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm font-semibold">جاري تحميل ملف الطالب من قوقل درايف...</p>
              </div>
            ) : mediaType === 'image' ? (
              <div className="h-[650px]">
                <DrawingBoard
                  imageUrl={originalMediaUrl}
                  stickers={stickers}
                  predefinedTexts={predefinedTexts}
                  watermarkSettings={watermarkSettings}
                  token={token}
                  onSave={handleSaveCorrection}
                  onStatusChange={(msg) => {
                    setStatusMessage(msg);
                    setStatusType('info');
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <h3 className="font-bold text-slate-200 mb-2">استماع لواجب الطالب الصوتي:</h3>
                  {originalMediaUrl ? (
                    <AudioPlayer audioUrl={originalMediaUrl} />
                  ) : (
                    <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                      ملف الصوت غير جاهز أو غير موجود.
                    </div>
                  )}
                </div>

                {/* Display previous corrected image if available */}
                {lesson.isSaved && lesson.modifiedImageUrl && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <h3 className="font-bold text-slate-200 mb-2">الصورة المعدلة المصححة سابقاً:</h3>
                    <a
                      href={lesson.modifiedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-xl overflow-hidden border border-slate-800 max-w-[200px]"
                    >
                      <img src={lesson.modifiedImageUrl} alt="Correction" className="w-full object-cover max-h-48" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
