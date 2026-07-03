import { useState } from 'react';
import { LessonItem } from '../types';
import { Search, Image, Volume2, CheckCircle, Clock, Eye, Edit2, Play, ChevronLeft } from 'lucide-react';

interface LessonListProps {
  lessons: LessonItem[];
  onSelectLesson: (lesson: LessonItem) => void;
}

export default function LessonList({ lessons = [], onSelectLesson }: LessonListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'corrected'>('all');

  const filtered = (lessons || []).filter(item => {
    if (!item) return false;
    const studentIdStr = String(item.studentId || '').trim();
    const studentNameStr = String(item.studentName || '').trim();
    const lessonNumberStr = String(item.lessonNumber ?? '').trim();

    // Search filter
    const matchesSearch = 
      studentIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentNameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lessonNumberStr.toLowerCase().includes(searchTerm.toLowerCase());

    // Tab filter
    if (filterMode === 'pending') {
      return matchesSearch && !item.isSaved;
    }
    if (filterMode === 'corrected') {
      return matchesSearch && item.isSaved;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6" id="lesson-list-container">
      {/* Filters and Search Bar */}
      <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث برقم الطالب، اسم الطالب، أو رقم الدرس..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#d4a017]/60 text-zinc-200 text-sm rounded-xl py-3 pr-11 pl-4 outline-none transition-all text-right"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 w-full md:w-auto" dir="rtl">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-zinc-800 text-[#d4a017] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            الكل ({lessons.length})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-zinc-800 text-amber-500 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            قيد الانتظار ({lessons.filter(l => !l.isSaved).length})
          </button>
          <button
            onClick={() => setFilterMode('corrected')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'corrected'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            المصححة ({lessons.filter(l => l.isSaved).length})
          </button>
        </div>
      </div>

      {/* Student List Render */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-800 text-zinc-500">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-sm text-zinc-400 font-sans">لم يتم العثور على أي واجبات تطابق شروط البحث الفلترة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4" dir="rtl">
          {filtered.map((lesson) => {
            const hasImage = !!lesson.imageFileId;
            const hasAudio = !!lesson.audioFileId;

            return (
              <div
                key={`${lesson.studentId}-${lesson.lessonNumber}-${lesson.row}`}
                className={`bg-zinc-900/40 hover:bg-zinc-900/80 border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 relative group ${
                  lesson.isSaved
                    ? 'border-emerald-500/10 hover:border-emerald-500/20 shadow-emerald-950/5'
                    : 'border-zinc-800 hover:border-[#d4a017]/20 shadow-lg'
                }`}
              >
                {/* Save Status Colored Accent Bar */}
                <div className={`absolute top-0 right-0 bottom-0 w-1 rounded-r-2xl ${
                  lesson.isSaved ? 'bg-emerald-500/60' : 'bg-[#d4a017]/60'
                }`} />

                {/* Left side: Student Core Info */}
                <div className="flex items-center gap-4 pr-3">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-sans font-bold ${
                    lesson.isSaved
                      ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 group-hover:text-[#d4a017]'
                  }`}>
                    <span className="text-[10px] leading-none opacity-60">رقم</span>
                    <span className="text-sm leading-none mt-1">{lesson.studentId}</span>
                  </div>

                  <div className="text-right space-y-1">
                    <h3 className="text-sm md:text-base font-bold text-zinc-200 font-sans group-hover:text-zinc-100 transition-colors">
                      {lesson.studentName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 font-sans font-light">
                      <span className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md text-[#d4a017] font-normal text-[11px]">
                        {lesson.additionalU || 'الخط العام'}
                      </span>
                      <span>الدرس: <strong className="text-zinc-300 font-medium">{lesson.lessonNumber}</strong></span>
                      {lesson.additionalV && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span className="text-zinc-400 line-clamp-1">{lesson.additionalV}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Lesson Types details */}
                <div className="flex flex-wrap items-center gap-3 pr-3 md:pr-0">
                  {/* Image Lesson Flag */}
                  {hasImage && (
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300" title="يحتوي على صورة">
                      <Image className="w-3.5 h-3.5 text-emerald-400" />
                      <span>صورة الواجب ({lesson.imageSubmissionCount} إرسال)</span>
                    </div>
                  )}

                  {/* Audio Lesson Flag */}
                  {hasAudio && (
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300" title="يحتوي على تسجيل صوتي">
                      <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>تسجيل صوتي ({lesson.audioSubmissionCount} إرسال)</span>
                    </div>
                  )}

                  {/* Custom columns metadata preview */}
                  {lesson.additionalT && (
                    <div className="bg-zinc-950 px-2.5 py-1.5 rounded-xl border border-zinc-800/60 text-[10px] text-zinc-500 font-mono">
                      {lesson.additionalT}
                    </div>
                  )}
                </div>

                {/* Right side: Status and Core actions */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-zinc-800/50 md:border-t-0 pt-3 md:pt-0">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 pr-3 md:pr-0">
                    {lesson.isSaved ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        تم الحفظ والمصادقة
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-900/30 text-amber-500 rounded-full text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        قيد التدقيق والتصحيح
                      </span>
                    )}
                  </div>

                  {/* Open action button */}
                  <button
                    onClick={() => onSelectLesson(lesson)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                      lesson.isSaved
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700'
                        : 'bg-[#d4a017] hover:bg-amber-600 text-zinc-950 shadow-md shadow-[#d4a017]/10'
                    }`}
                  >
                    {lesson.isSaved ? (
                      <>
                        <Edit2 className="w-3.5 h-3.5" />
                        تعديل التصحيح
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        بدء التصحيح الفوري
                      </>
                    )}
                    <ChevronLeft className="w-4 h-4 mr-0.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
