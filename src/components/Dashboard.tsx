import React, { useState } from "react";
import { Search, LogOut, CheckCircle, Clock, BookOpen, AlertCircle, RefreshCw, FileImage, Volume2, UserCheck, Eye, Sparkles } from "lucide-react";
import { StudentRecord } from "../types";

interface DashboardProps {
  records: StudentRecord[];
  onSelectRecord: (record: StudentRecord) => void;
  onLogout: () => void;
  currentUser: string;
  loading: boolean;
  onRefresh: () => void;
  schoolName: string;
}

export default function Dashboard({ 
  records, 
  onSelectRecord, 
  onLogout, 
  currentUser, 
  loading, 
  onRefresh,
  schoolName
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "corrected">("pending");

  // Filter records
  const filteredRecords = records.filter((rec) => {
    // 1. Search filter
    const matchesSearch = 
      rec.studentId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.lessonNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Tab filter
    if (activeTab === "pending") return !rec.isSaved;
    if (activeTab === "corrected") return rec.isSaved;
    return true; // all
  });

  // KPI Calculations
  const totalCount = records.length;
  const correctedCount = records.filter((rec) => rec.isSaved).length;
  const pendingCount = totalCount - correctedCount;
  const imageCount = records.filter((rec) => rec.imageFileId).length;
  const audioCount = records.filter((rec) => rec.audioFileId).length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-800" dir="rtl">
      {/* Top Premium Navbar */}
      <header className="bg-zinc-900 text-white border-b border-zinc-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-xl shadow-lg border border-amber-400">
              ✒️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400">{schoolName || "أكاديمية الخط العربي"}</h1>
              <p className="text-xs text-zinc-400">بوابة المتابعة والتصحيح الاحترافي للدروس</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl text-sm">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-zinc-200">أهلاً بك، {currentUser}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-zinc-800 hover:bg-red-950 hover:text-red-300 border border-zinc-700 hover:border-red-900 rounded-xl text-zinc-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm font-semibold"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Bento Grid Stats Card Panel */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">إجمالي المهام</p>
              <h3 className="text-3xl font-bold text-zinc-800 font-mono">{totalCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">بانتظار تصحيحك</p>
              <h3 className="text-3xl font-bold text-amber-600 font-mono">{pendingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">المهام المصححة</p>
              <h3 className="text-3xl font-bold text-emerald-600 font-mono">{correctedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">توزيع الدرس</p>
              <div className="flex gap-4 mt-1.5 text-zinc-700">
                <span className="text-sm font-semibold flex items-center gap-1 font-mono">
                  <FileImage className="w-4 h-4 text-emerald-600" /> {imageCount} صورة
                </span>
                <span className="text-sm font-semibold flex items-center gap-1 font-mono">
                  <Volume2 className="w-4 h-4 text-blue-600" /> {audioCount} صوت
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </section>

        {/* Filters and Search Workspace Container */}
        <section className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          
          {/* Header Action Row */}
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم الطالب، اسم الطالب، أو رقم الدرس..."
                className="w-full pl-4 pr-11 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 text-zinc-400" />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl self-start md:self-auto">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "pending"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
                }`}
              >
                بانتظار المراجعة ({pendingCount})
              </button>
              <button
                onClick={() => setActiveTab("corrected")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "corrected"
                    ? "bg-zinc-900 text-amber-400 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
                }`}
              >
                المهام المنجزة ({correctedCount})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "all"
                    ? "bg-zinc-200 text-zinc-800 shadow-sm font-semibold"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50"
                }`}
              >
                عرض الكل ({totalCount})
              </button>
            </div>

            {/* Refresh/Sync Data */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 self-start md:self-auto shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث البيانات من شيت</span>
            </button>
          </div>

          {/* List/Table content */}
          {loading ? (
            <div className="p-16 text-center space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
              <p className="text-zinc-500 text-sm">جاري جلب ومزامنة آخر الدروس المرسلة من قوقل شيت...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto" />
              <h4 className="text-lg font-bold text-zinc-700">لا توجد مهام مطابقة للبحث</h4>
              <p className="text-zinc-400 text-xs">حاول تغيير خيارات التصفية أو التأكد من إدخال كلمات بحث صحيحة.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 text-xs font-bold uppercase bg-zinc-50/50">
                    <th className="py-4 px-6 font-semibold">رقم الطالب</th>
                    <th className="py-4 px-6 font-semibold">اسم الطالب</th>
                    <th className="py-4 px-6 font-semibold">رقم الدرس</th>
                    <th className="py-4 px-6 font-semibold text-center">نوع الملف</th>
                    <th className="py-4 px-6 font-semibold text-center">مرات الإرسال</th>
                    <th className="py-4 px-6 font-semibold text-center">حالة الحفظ</th>
                    <th className="py-4 px-6 font-semibold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredRecords.map((rec) => {
                    const isImage = !!rec.imageFileId;
                    const isAudio = !!rec.audioFileId;
                    
                    return (
                      <tr key={rec.row} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-zinc-900">{rec.studentId}</td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-zinc-800">{rec.studentName}</div>
                          <div className="text-zinc-400 text-xxs mt-0.5">صف الشيت: {rec.row}</div>
                        </td>
                        <td className="py-4 px-6 font-mono text-zinc-600">درس {rec.lessonNumber}</td>
                        <td className="py-4 px-6 text-center">
                          {isImage && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <FileImage className="w-3.5 h-3.5" />
                              صورة
                            </span>
                          )}
                          {isAudio && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <Volume2 className="w-3.5 h-3.5" />
                              صوت وقراءة
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-zinc-500 font-mono">
                          {isImage ? rec.imageSubmissionCount : rec.audioSubmissionCount}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {rec.isSaved ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-bold">
                              تم تصحيحه وحفظه
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full text-xs font-bold">
                              بانتظار تصحيحك
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => onSelectRecord(rec)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 mx-auto ${
                              rec.isSaved
                                ? "bg-zinc-800 text-amber-400 hover:bg-zinc-700 shadow-sm"
                                : "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow shadow-amber-500/20"
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            <span>{rec.isSaved ? "مراجعة وتعديل" : "بدء التصحيح"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer of the panel */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 px-6">
            <span>إجمالي الصفوف المطابقة للفلاتر الحالية: {filteredRecords.length} صف طالب</span>
            <span>الأكاديمية متصلة بقاعدة البيانات بشكل حي ومباشر</span>
          </div>
        </section>
      </main>
    </div>
  );
}
