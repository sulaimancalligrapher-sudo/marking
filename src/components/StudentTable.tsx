import React, { useState } from 'react';
import { 
  Search, Eye, EyeOff, FileImage, FileAudio, CheckCircle, Clock,
  Filter, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';
import { StudentRow } from '../types';

interface StudentTableProps {
  data: StudentRow[];
  onCorrect: (row: StudentRow) => void;
  onEdit: (row: StudentRow) => void;
}

export default function StudentTable({ data, onCorrect, onEdit }: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState<boolean | null>(null); // null = all, true = saved, false = pending

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter and search logic
  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      item.studentId.toString().toLowerCase().includes(term) ||
      item.studentName.toLowerCase().includes(term) ||
      item.lessonNumber.toString().toLowerCase().includes(term);

    if (showSavedOnly === true) {
      return matchesSearch && item.isSaved;
    } else if (showSavedOnly === false) {
      return matchesSearch && !item.isSaved;
    }
    return matchesSearch;
  });

  // Pages
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Search & Filters Row */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        
        {/* Dynamic Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ابحث برقم الطالب، اسم الطالب، أو رقم الدرس..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-4 pr-10 py-2.5 bg-white text-slate-800 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
          />
        </div>

        {/* Filter State Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1.5 ml-2">
            <Filter className="w-3.5 h-3.5" />
            تصفية الحالة:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => { setShowSavedOnly(null); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                showSavedOnly === null 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الكل ({data.length})
            </button>
            <button
              onClick={() => { setShowSavedOnly(false); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                showSavedOnly === false 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              بانتظار التصحيح ({data.filter(d => !d.isSaved).length})
            </button>
            <button
              onClick={() => { setShowSavedOnly(true); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                showSavedOnly === true 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              المصححة ({data.filter(d => d.isSaved).length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
              <th className="py-4 px-6">رقم الطالب</th>
              <th className="py-4 px-6">اسم الطالب</th>
              <th className="py-4 px-6 text-center">رقم الدرس</th>
              <th className="py-4 px-6 text-center">نوع الملف</th>
              <th className="py-4 px-6 text-center">مرات الإرسال</th>
              <th className="py-4 px-6 text-center">حالة الحفظ</th>
              <th className="py-4 px-6 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                const isAudio = item.audioFileId && !item.imageFileId;
                return (
                  <tr 
                    key={item.row} 
                    className={`hover:bg-slate-50/50 transition-all ${
                      item.isSaved ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    {/* Student ID */}
                    <td className="py-4 px-6 font-semibold text-slate-900 font-mono">
                      #{item.studentId}
                    </td>
                    
                    {/* Student Name */}
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {item.studentName}
                    </td>
                    
                    {/* Lesson Number */}
                    <td className="py-4 px-6 text-center font-semibold text-slate-900 font-mono">
                      {item.lessonNumber}
                    </td>

                    {/* File Type Badge */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isAudio 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {isAudio ? (
                          <>
                            <FileAudio className="w-3.5 h-3.5" />
                            صوت طالب
                          </>
                        ) : (
                          <>
                            <FileImage className="w-3.5 h-3.5" />
                            صورة خطاط
                          </>
                        )}
                      </span>
                    </td>

                    {/* Submissions count */}
                    <td className="py-4 px-6 text-center font-mono">
                      {isAudio ? item.audioSubmissionCount : item.imageSubmissionCount}
                    </td>

                    {/* Is Saved Status Badge */}
                    <td className="py-4 px-6 text-center">
                      {item.isSaved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          تم التصحيح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                          <Clock className="w-3 h-3" />
                          بانتظار التدقيق
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-6 text-center">
                      {item.isSaved ? (
                        <button
                          onClick={() => onEdit(item)}
                          className="px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition shadow-sm"
                        >
                          تعديل التصحيح
                        </button>
                      ) : (
                        <button
                          onClick={() => onCorrect(item)}
                          className="px-4 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-xl transition shadow-sm shadow-emerald-500/10"
                        >
                          ابدأ التصحيح الآن
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  لا يوجد بيانات تطابق معايير البحث الحالية
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-500">
            عرض صفحة <span className="font-semibold text-slate-700">{currentPage}</span> من <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-45 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-45 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
