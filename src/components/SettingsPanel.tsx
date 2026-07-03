import React, { useState } from 'react';
import { 
  Settings, Key, CheckCircle, XCircle, Info, Copy, 
  ExternalLink, FileSpreadsheet, Eye, EyeOff
} from 'lucide-react';
import { APPS_SCRIPT_CODE } from '../AppsScriptCode';

interface SettingsPanelProps {
  webAppUrl: string;
  onSaveUrl: (url: string) => void;
  onTestConnection: () => Promise<boolean>;
  isTesting: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'untested';
}

export default function SettingsPanel({
  webAppUrl,
  onSaveUrl,
  onTestConnection,
  isTesting,
  connectionStatus
}: SettingsPanelProps) {
  const [inputUrl, setInputUrl] = useState(webAppUrl);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = inputUrl.trim();
    onSaveUrl(trimmed);
    setTestResult(null);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runTest = async () => {
    setTestResult('جاري فحص الاتصال وتأكيد الرد من الخادم...');
    const ok = await onTestConnection();
    if (ok) {
      setTestResult('🎉 اتصلت المنصة بنجاح! تم التحقق من قراءة البيانات من جوجل شيت بنجاح.');
    } else {
      setTestResult('❌ فشل الاتصال! تأكد من نسخ رابط الـ Web App بشكل كامل وصحيح، وتفعيل تصفية (Anyone) عند النشر.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 flex flex-col gap-6 font-sans text-right" dir="rtl" id="settings-panel">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Settings className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-sans">إعدادات الاتصال بقاعدة البيانات (Google Sheets)</h2>
          <p className="text-xs text-slate-500 font-sans">قم بربط المنصة بملف الشيت الخاص بك مجاناً بالكامل دون أي تعقيد أو تكاليف مادية</p>
        </div>
      </div>

      {/* Input Group */}
      <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 font-sans">
          <Key className="w-4 h-4 text-emerald-600" />
          رابط تطبيق ويب جوجل (Google Apps Script Web App URL)
        </label>
        
        <div className="flex flex-col md:flex-row gap-2">
          <input 
            type="text" 
            placeholder="https://script.google.com/macros/s/.../exec"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full md:flex-1 text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-inner font-mono text-left focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 bg-slate-800 text-white font-semibold text-xs rounded-xl hover:bg-slate-700 active:scale-95 transition-all whitespace-nowrap"
          >
            حفظ الرابط
          </button>
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5 pt-2 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">حالة الاتصال بالخادم:</span>
            {connectionStatus === 'connected' ? (
              <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                متصل وجاهز للعمل
              </span>
            ) : connectionStatus === 'disconnected' ? (
              <span className="text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                غير متصل / خطأ بالربط
              </span>
            ) : (
              <span className="text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full font-bold">
                لم يتم الفحص بعد
              </span>
            )}
          </div>

          {webAppUrl && (
            <button
              type="button"
              disabled={isTesting}
              onClick={runTest}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              {isTesting ? 'جاري الفحص...' : 'فحص وتجربة الاتصال المباشر'}
            </button>
          )}
        </div>

        {testResult && (
          <div className="mt-2 text-xs bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 font-sans leading-relaxed">
            {testResult}
          </div>
        )}
      </div>

      {/* Guide instructions */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 font-sans">
          <Info className="w-4.5 h-4.5 text-indigo-500" />
          خطوات الإعداد والربط المجاني (خلال ٣ دقائق فقط):
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed font-sans">
          <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">١</span>
            <p>
              افتح جدول بيانات قوقل (Google Sheets) الخاص بك، ومن القائمة العلوية اضغط على 
              <strong className="text-slate-800"> (Extensions / الإضافات) </strong> ثم 
              <strong className="text-slate-800"> (Apps Script)</strong>.
            </p>
          </div>

          <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">٢</span>
            <p>
              امسح أي كود موجود في الصفحة، ثم انسخ الكود المتاح بالأسفل بالكامل والصقه داخل محرر الأكواد في قوقل.
            </p>
          </div>

          <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">٣</span>
            <p>
              اضغط على زر <strong className="text-slate-800">(Deploy / نشر)</strong> في أعلى اليمين ثم اختر 
              <strong className="text-slate-800"> (New Deployment / نشر جديد)</strong>. اختر نوع النشر 
              <strong className="text-slate-800"> (Web App)</strong>.
            </p>
          </div>

          <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex gap-2">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">٤</span>
            <p>
              غيّر إعدادات الوصول: اجعل التطبيق ينفذ بصفة حسابك (Execute as: Me) واجعل صلاحية الدخول للجميع 
              <strong className="text-emerald-700"> (Who has access: Anyone)</strong> لضمان عمل المنصة بشكل صحيح، ثم انقر Deploy وانسخ الرابط الناتج وضعه في الحقل أعلاه!
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer accordion */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-all text-slate-800 font-semibold text-xs"
        >
          <span className="flex items-center gap-1.5 font-sans">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            الكود البرمجي لـ Google Apps Script (انقر لعرض ونسخ الكود)
          </span>
          {showCode ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
        </button>

        {showCode && (
          <div className="p-4 bg-slate-900 text-slate-300 relative font-mono text-[11px] leading-relaxed max-h-[350px] overflow-y-auto" dir="ltr">
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-sans font-bold shadow-sm transition-all flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'تم النسخ!' : 'نسخ الكود كاملاً'}
              </button>
            </div>
            <pre className="p-2 pt-8 text-emerald-400 select-all">{APPS_SCRIPT_CODE}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
