import { ProfileData } from '../types';
import { PenTool, LogOut, ShieldCheck, User, BarChart2, BookOpen, CheckCircle } from 'lucide-react';

interface HeaderProps {
  profile: ProfileData;
  currentUser: string | null;
  onLogout: () => void;
  onOpenConfig: () => void;
  stats: {
    total: number;
    corrected: number;
    pending: number;
  };
}

export default function Header({ profile, currentUser, onLogout, onOpenConfig, stats }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-[#d4a017]/30 text-white py-6 px-4 md:px-8 shadow-2xl relative overflow-hidden" id="app-header">
      {/* Decorative Golden Pattern Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a017]/5 rounded-full filter blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#d4a017]/3 rounded-full filter blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* Profile Info */}
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#d4a017] to-amber-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-300" />
            <img 
              src={profile.logoUrl} 
              alt="شعار المدرسة" 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-[#d4a017]/80 shadow-lg relative"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <PenTool className="w-6 h-6 text-[#d4a017]" />
              <h1 className="text-xl md:text-2xl font-bold tracking-wide text-zinc-100 font-sans">
                {profile.title}
              </h1>
            </div>
            <p className="text-zinc-400 text-sm md:text-base font-light">
              {profile.subtitle}
            </p>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800/80 rounded-xl px-5 py-3 flex gap-6 text-center text-zinc-300 text-xs md:text-sm">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>إجمالي الدروس</span>
            </div>
            <span className="text-lg font-bold text-zinc-100">{stats.total}</span>
          </div>
          <div className="w-[1px] bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>تم تصحيحها</span>
            </div>
            <span className="text-lg font-bold text-emerald-400">{stats.corrected}</span>
          </div>
          <div className="w-[1px] bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
              <span>قيد الانتظار</span>
            </div>
            <span className="text-lg font-bold text-amber-500">{stats.pending}</span>
          </div>
        </div>

        {/* User Actions */}
        {currentUser && (
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900/80 border border-[#d4a017]/20 rounded-lg px-4 py-2 flex items-center gap-2 shadow">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-zinc-500">المصحح الحالي</span>
                <span className="text-xs font-bold text-[#d4a017] flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {currentUser}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenConfig}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#d4a017] border border-zinc-800 hover:border-[#d4a017]/30 rounded-lg transition-all text-xs font-medium cursor-pointer"
              title="إعدادات الاتصال بشيت"
            >
              قاعدة البيانات
            </button>

            <button
              onClick={onLogout}
              className="p-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg transition-all cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
