import React, { useState, useMemo } from 'react';
import { 
  Search, CheckCircle, Clock, Users, Award, HelpCircle, 
  ChevronLeft, Image as ImageIcon, Volume2, ShieldAlert
} from 'lucide-react';
import { StudentSubmission, ProfileInfo } from '../types';

interface DashboardProps {
  submissions: StudentSubmission[];
  profile: ProfileInfo;
  onSelectRow: (row: StudentSubmission, isEditingSaved: boolean) => void;
  isLoading: boolean;
}

export default function Dashboard({
  submissions,
  profile,
  onSelectRow,
  isLoading
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false); // false = uncorrected only by default

  // Calculate high-level statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const corrected = submissions.filter(s => s.isSaved).length;
    const pending = total - corrected;
    const imageCount = submissions.filter(s => s.imageFileId).length;
    const audioCount = submissions.filter(s => s.audioFileId).length;
    
    return {
      total,
      corrected,
      pending,
      imageCount,
      audioCount,
      completionRate: total > 0 ? Math.round((corrected / total) * 100) : 0
    };
  }, [submissions]);

  // Filter and search submissions list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      // 1. Filter by Saved status
      if (!showAll && s.isSaved) return false;

      // 2. Filter by search query
      const query = searchTerm.toLowerCase();
      if (!query) return true;

      return (
        s.studentId.toString().toLowerCase().includes(query) ||
        s.studentName.toLowerCase().includes(query) ||
        s.lessonNumber.toString().toLowerCase().includes(query)
      );
    });
  }, [submissions, showAll, searchTerm]);

  return (
    <div className="flex flex-col gap-6 text-right font-sans" dir="rtl" id="dashboard-section">
      
      {/* 1. Header Hero Panel */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt="Logo" 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-white/10 p-1 shadow-inner" 
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold">
              {profile.title.charAt(0) || 'ص'}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-black text-white font-sans">{profile.title}</h1>
            <p className="text-xs md:text-sm text-slate-300 font-sans font-medium">{profile.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0 bg-white/5 backdrop-blur-xs px-4 py-3 rounded-2xl border border-white/10">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-300 font-sans">معدل الإنجاز الكلي</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{stats.completionRate}%</span>
          </div>
          <div className="w-px h-8 bg-white/20 mx-1"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-300 font-sans">تم تصحيحه</span>
            <span className="text-xl font-bold text-white font-mono">{stats.corrected}</span>
          </div>
        </div>
      </div>

      {/* 2. KPIs Summary Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Uncorrected / Pending */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold font-sans">الدروس قيد الانتظار</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">{stats.pending}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* KPI 2: Corrected */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold font-sans">تم تصحيحها</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">{stats.corrected}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* KPI 3: Total Submissions */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold font-sans">إجمالي الدروس المسجلة</span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono">{stats.total}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Users className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        {/* KPI 4: Types Distribution */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold font-sans">التوزيع (صورة / صوت)</span>
            <span className="text-md font-bold text-slate-700 font-mono">
              📷 {stats.imageCount} / 🔊 {stats.audioCount}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <Award className="w-6 h-6 text-slate-600" />
          </div>
        </div>
      </div>

      {/* 3. Search and Action Filters Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:max-w-md">
          <input 
            type="text" 
            placeholder="ابحث برقم الطالب، الاسم، أو رقم الدرس..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-10 pl-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>

        {/* Filter selection toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${!showAll ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            الدروس الغير مصححة فقط
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${showAll ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            إظهار جميع السجلات
          </button>
        </div>
      </div>

      {/* 4. Submissions Datatable */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-sans">جاري سحب وتحديث كشوفات الطلاب من Google Sheets...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <ShieldAlert className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500 font-sans">لا توجد دروس مطابقة لشروط البحث والتصفية حالياً</p>
            <p className="text-xs text-slate-400 font-sans">تأكد من اختيار "إظهار جميع السجلات" أو تعديل معايير البحث.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-100">
                  <th className="p-4 font-sans">رقم الطالب</th>
                  <th className="p-4 font-sans">اسم الطالب</th>
                  <th className="p-4 font-sans text-center">رقم الدرس</th>
                  <th className="p-4 font-sans text-center">عدد مرات الإرسال</th>
                  <th className="p-4 font-sans text-center">نوع مادة الدرس</th>
                  <th className="p-4 font-sans text-center">حالة الحفظ</th>
                  <th className="p-4 font-sans text-left">التصحيح والدرجات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredSubmissions.map((row) => (
                  <tr 
                    key={row.row} 
                    className={`hover:bg-slate-50/70 transition-all ${row.isSaved ? 'bg-emerald-50/20' : ''}`}
                  >
                    <td className="p-4 font-mono font-bold text-slate-800">#{row.studentId}</td>
                    <td className="p-4 font-semibold text-slate-800">{row.studentName}</td>
                    <td className="p-4 font-mono font-bold text-center text-slate-600">{row.lessonNumber}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-700 font-bold font-mono px-2.5 py-0.5 rounded-full">
                        {row.imageFileId ? row.imageSubmissionCount : row.audioSubmissionCount}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.imageFileId && (
                          <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px]">
                            <ImageIcon className="w-3.5 h-3.5" />
                            صورة
                          </span>
                        )}
                        {row.audioFileId && (
                          <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px]">
                            <Volume2 className="w-3.5 h-3.5" />
                            صوت
                          </span>
                        )}
                        {!row.imageFileId && !row.audioFileId && (
                          <span className="text-slate-400 italic">بدون ملف</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {row.isSaved ? (
                        <span className="text-emerald-700 bg-emerald-100 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          ✓ تم الحفظ
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          ⏳ بانتظار التصحيح
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-left">
                      <div className="inline-flex items-center gap-1.5">
                        {row.isSaved ? (
                          <button
                            type="button"
                            onClick={() => onSelectRow(row, true)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          >
                            تعديل التصحيح السابق
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectRow(row, false)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-4 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs hover:shadow-xs"
                          >
                            ابدأ التصحيح الآن
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
