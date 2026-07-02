import React, { useState } from 'react';
import { Search, Image as ImageIcon, Volume2, CheckCircle2, Circle, Edit2 } from 'lucide-react';
import { StudentLesson } from '../types';

interface LessonTableProps {
  lessons: StudentLesson[];
  onSelectLesson: (lesson: StudentLesson, isNewCorrection: boolean) => void;
  loading: boolean;
}

export default function LessonTable({ lessons, onSelectLesson, loading }: LessonTableProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSaved, setShowSaved] = useState<boolean>(false);

  // Filter lessons based on search query & saved status
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch =
      lesson.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.lessonNumber.toString().toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = showSaved ? true : !lesson.isSaved;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col gap-4" dir="rtl">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="ابحث برقم الطالب، الاسم، أو رقم الدرس..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition"
          />
          <div className="absolute left-3 top-3.5 text-slate-500">
            <Search size={18} />
          </div>
        </div>

        {/* Saved status toggle button */}
        <button
          onClick={() => setShowSaved(!showSaved)}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 w-full sm:w-auto ${
            showSaved
              ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-300'
          }`}
        >
          {showSaved ? 'إخفاء الصفوف المصححة' : 'إظهار جميع الصفوف'}
        </button>

      </div>

      {/* Main Lessons Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">جاري تحميل قائمة الدروس من قوقل شيت...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center p-16 text-slate-500">
            <p className="text-lg font-medium">لا توجد دروس تطابق خيارات البحث الحالية.</p>
            <p className="text-sm mt-1 text-slate-600">تأكد من ضبط خيارات البحث والفلترة أعلاه.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold tracking-wider">
                  <th className="px-6 py-4">رقم الطالب</th>
                  <th className="px-6 py-4">اسم الطالب</th>
                  <th className="px-6 py-4">رقم الدرس</th>
                  <th className="px-6 py-4 text-center">عدد الإرسالات</th>
                  <th className="px-6 py-4 text-center">نوع الملف</th>
                  <th className="px-6 py-4 text-center">حالة التصحيح</th>
                  <th className="px-6 py-4 text-center">تعديل التصحيح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLessons.map((lesson) => {
                  const mediaType = lesson.imageFileId ? 'image' : 'audio';
                  const submissionCount = lesson.imageFileId ? lesson.imageSubmissionCount : lesson.audioSubmissionCount;

                  return (
                    <tr
                      key={lesson.row}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        lesson.isSaved ? 'bg-emerald-950/15 text-slate-200' : 'text-slate-300'
                      }`}
                    >
                      {/* Student ID */}
                      <td className="px-6 py-4.5 font-semibold font-mono text-slate-400">{lesson.studentId}</td>
                      
                      {/* Name */}
                      <td className="px-6 py-4.5 font-medium">{lesson.studentName}</td>
                      
                      {/* Lesson number */}
                      <td className="px-6 py-4.5 font-bold text-slate-300">الدرس {lesson.lessonNumber}</td>
                      
                      {/* Submission count */}
                      <td className="px-6 py-4.5 text-center font-bold">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 text-xs">
                          {submissionCount} مرات
                        </span>
                      </td>
                      
                      {/* File type with load button */}
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => onSelectLesson(lesson, true)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer border ${
                            mediaType === 'image'
                              ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
                              : 'bg-sky-600/20 border-sky-500/30 text-sky-300 hover:bg-sky-600/30'
                          }`}
                        >
                          {mediaType === 'image' ? <ImageIcon size={14} /> : <Volume2 size={14} />}
                          <span>{mediaType === 'image' ? 'فتح السبورة' : 'استماع وتسجيل'}</span>
                        </button>
                      </td>

                      {/* Status flag */}
                      <td className="px-6 py-4.5 text-center">
                        {lesson.isSaved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            <span>مكتمل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                            <Circle size={12} className="animate-pulse" />
                            <span>قيد الانتظار</span>
                          </span>
                        )}
                      </td>

                      {/* Edit Button */}
                      <td className="px-6 py-4.5 text-center">
                        {lesson.isSaved ? (
                          <button
                            onClick={() => onSelectLesson(lesson, false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span>تعديل</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
