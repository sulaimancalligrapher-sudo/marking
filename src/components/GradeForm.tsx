import React, { useState, useRef } from 'react';
import { Save, FileText, Camera, Video, Mic, Upload, Eye, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GradeFormProps {
  studentName: string;
  studentId: string;
  lessonNumber: number;
  mediaType: 'image' | 'audio';
  originalFileId: string | null;
  onOpenOriginalMedia: () => void;
  onSaveCorrection: (data: {
    notes: string;
    imageGrade: string;
    audioGrade: string;
    additionalImage: string;
    additionalVideo: string;
    additionalAudio: string;
  }) => Promise<void>;
  onBack: () => void;
}

export default function GradeForm({
  studentName,
  studentId,
  lessonNumber,
  mediaType,
  originalFileId,
  onOpenOriginalMedia,
  onSaveCorrection,
  onBack
}: GradeFormProps) {
  // Inputs
  const [imageGrade, setImageGrade] = useState('');
  const [audioGrade, setAudioGrade] = useState('');
  const [notes, setNotes] = useState('');

  // Media attachments
  const [additionalImage, setAdditionalImage] = useState<string>('');
  const [additionalVideo, setAdditionalVideo] = useState<string>('');
  const [additionalAudio, setAdditionalAudio] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // HTML Capture inputs refs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Capture State managers
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // File to base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'image') setAdditionalImage(base64);
      if (type === 'video') setAdditionalVideo(base64);
      if (type === 'audio') setAdditionalAudio(base64);
    };
    reader.readAsDataURL(file);
  };

  // Browser Audio Recording (Mic)
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onload = () => {
          setAdditionalAudio(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      alert('خطأ في تشغيل الميكروفون: ' + err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Browser Video Recording (Cam)
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;
      audioChunksRef.current = [];

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(audioChunksRef.current, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onload = () => {
          setAdditionalVideo(reader.result as string);
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach(track => track.stop());
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = null;
        }
      };

      recorder.start();
      setIsRecordingVideo(true);
    } catch (err) {
      alert('خطأ في تشغيل الكاميرا والميكروفون: ' + err);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCorrection({
        notes,
        imageGrade,
        audioGrade,
        additionalImage,
        additionalVideo,
        additionalAudio,
      });

      // Show celebration confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onBack();
      }, 2000);
    } catch (e) {
      alert('فشل حفظ التصحيح: ' + e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 text-right" dir="rtl" id="grading-form-container">
      
      {/* Form Title & Student quick facts */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-100 font-sans">اعتماد الدرجات والملاحظات الإضافية</h2>
          <p className="text-xs text-zinc-400">
            أنت تقوم بتصحيح درس الطالب: <span className="text-[#d4a017] font-semibold">{studentName} ({studentId})</span> - الدرس رقم: <span className="text-[#d4a017] font-semibold">{lessonNumber}</span>
          </p>
        </div>

        {/* Play Original File button */}
        {originalFileId && (
          <button
            onClick={onOpenOriginalMedia}
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-850 text-[#d4a017] border border-[#d4a017]/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            فتح ومعاينة الملف الأصلي الكبير
          </button>
        )}
      </div>

      {/* Grid Inputs for grades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mediaType === 'image' ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block">درجة لوحة الصورة (الخط):</label>
            <input
              type="text"
              value={imageGrade}
              onChange={(e) => setImageGrade(e.target.value)}
              placeholder="مثال: 9.5 / 10 أو ممتاز جداً"
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-[#d4a017] text-sm text-zinc-200 rounded-xl px-4 py-3 outline-none transition-all text-right"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block">درجة الأداء والتسميع الصوتي:</label>
            <input
              type="text"
              value={audioGrade}
              onChange={(e) => setAudioGrade(e.target.value)}
              placeholder="مثال: 10 / 10 أو ممتاز"
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-[#d4a017] text-sm text-zinc-200 rounded-xl px-4 py-3 outline-none transition-all text-right"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 block">رقم التصحيح الحالي للشيت:</label>
          <div className="bg-zinc-950 border border-zinc-850 px-4 py-3 rounded-xl text-sm text-zinc-400 font-mono">
            حفظ جديد وسيتم التوثيق تلقائياً
          </div>
        </div>
      </div>

      {/* Feedback notes Textarea */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-400 block">توجيهات وملاحظات المعلم التفصيلية:</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="اكتب التقييم والملاحظات الفنية للخطاط هنا لمساعدته في تحسين أسلوبه مستقبلاً..."
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-[#d4a017] text-sm text-zinc-200 rounded-xl px-4 py-3 outline-none transition-all text-right"
        />
      </div>

      {/* Upload Additional Media Attachments Section */}
      <div className="space-y-3 bg-zinc-950 p-5 rounded-2xl border border-zinc-850">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">مرفقات تفاعلية اختيارية</span>
          <h3 className="text-xs font-bold text-zinc-300">إضافة مرفقات تصحيح إضافية للطالب (فيديو/صوت/صورة)</h3>
        </div>

        {/* Capture Tools Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Picture capturing */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-emerald-950/40 rounded-lg text-emerald-400 border border-emerald-900/30">
                <Camera className="w-4 h-4" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-bold text-zinc-200">صورة إضافية</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">رفع كراسة أو لوحة مرجعية</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex-1 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Upload className="w-3 h-3" />
                اختر من الجهاز
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'image')}
                className="hidden"
              />
            </div>
          </div>

          {/* Video Recording */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-950/40 rounded-lg text-blue-400 border border-blue-900/30">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-bold text-zinc-200">تصوير فيديو لشرح الحركة</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">شرح سحب القلم وتوزيع الحبر</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isRecordingVideo
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                {isRecordingVideo ? 'إيقاف وتسجيل الكاميرا' : 'تسجيل فيديو حي'}
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-2.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg cursor-pointer"
                title="تحميل ملف فيديو"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
                className="hidden"
              />
            </div>
          </div>

          {/* Audio Recording (Mouthpiece) */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-amber-950/40 rounded-lg text-amber-500 border border-amber-900/30">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-bold text-zinc-200">تسجيل نطق وملاحظة صوتية</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">تعليم تلاوة أو شرح شفهي</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isRecordingAudio
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isRecordingAudio ? 'توقف وحفظ الصوت' : 'تسجيل ميكروفون'}
              </button>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="px-2.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg cursor-pointer"
                title="تحميل ملف صوتي"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e, 'audio')}
                className="hidden"
              />
            </div>
          </div>

        </div>

        {/* Live video capture feed element */}
        {isRecordingVideo && (
          <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video max-w-sm mx-auto">
            <video ref={videoElementRef} muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              تسجيل كاميرا مباشر
            </div>
          </div>
        )}

        {/* Previews Grid for newly added items */}
        {(additionalImage || additionalVideo || additionalAudio) && (
          <div className="pt-4 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Image Preview */}
            {additionalImage && (
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-2 group">
                <img src={additionalImage} alt="Preview" className="w-full h-24 object-contain rounded" />
                <button
                  type="button"
                  onClick={() => setAdditionalImage('')}
                  className="absolute top-3 right-3 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="حذف المرفق"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] text-zinc-500 text-center mt-1">كراسة إضافية مرفقة</div>
              </div>
            )}

            {/* Video Preview */}
            {additionalVideo && (
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-2 group">
                <video src={additionalVideo} controls className="w-full h-24 object-contain rounded" />
                <button
                  type="button"
                  onClick={() => setAdditionalVideo('')}
                  className="absolute top-3 right-3 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="حذف المرفق"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] text-zinc-500 text-center mt-1">فيديو شرح مرفق</div>
              </div>
            )}

            {/* Audio Preview */}
            {additionalAudio && (
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-2 group flex flex-col justify-between min-h-[96px]">
                <audio src={additionalAudio} controls className="w-full h-8 mt-4 rounded" />
                <button
                  type="button"
                  onClick={() => setAdditionalAudio('')}
                  className="absolute top-3 right-3 p-1 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="حذف المرفق"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] text-zinc-500 text-center mt-1">ملاحظة صوتية مرفقة</div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Form Submission Actions buttons */}
      <div className="flex flex-col md:flex-row gap-3 pt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-4 bg-[#d4a017] hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:pointer-events-none text-zinc-950 font-bold rounded-xl text-base shadow-xl shadow-[#d4a017]/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
              جاري فك الترميز وحفظ البيانات في قوقل شيت...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              تم تصحيح الدرس وإرساله بنجاح!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              حفظ وإرسال تصحيح الدرس بشكل نهائي
            </>
          )}
        </button>

        <button
          onClick={onBack}
          className="px-6 py-4 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للجدول
        </button>
      </div>

    </div>
  );
}
