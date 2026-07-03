import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Database, Link, AlertCircle, Save, CheckCircle2, RefreshCw } from 'lucide-react';

interface SheetsConfigProps {
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onClose: () => void;
}

export default function SheetsConfig({ config, onSaveConfig, onClose }: SheetsConfigProps) {
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl);
  const [useLiveConnection, setUseLiveConnection] = useState(config.useLiveConnection);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      webAppUrl: webAppUrl.trim(),
      useLiveConnection: useLiveConnection && webAppUrl.trim() !== '',
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="sheets-config-modal">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-right" dir="rtl">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#d4a017]/20 to-amber-600/10 p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#d4a017]/10 rounded-xl border border-[#d4a017]/20">
              <Database className="w-6 h-6 text-[#d4a017]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 font-sans">إعداد ربط قوقل شيت (Google Sheets)</h2>
              <p className="text-xs text-zinc-400 mt-1">تعديل مصدر البيانات والاتصال المباشر بقاعدة بيانات الشيت المجانية</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Connection Mode Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">وضع العمل المختار</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUseLiveConnection(false)}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  !useLiveConnection
                    ? 'bg-[#d4a017]/10 border-[#d4a017] text-[#d4a017]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-bold mb-1">محاكي محلي (ذاتي)</div>
                <div className="text-[10px] opacity-70">تشغيل أوفلاين فوري مع حفظ التغييرات محلياً</div>
              </button>

              <button
                type="button"
                onClick={() => setUseLiveConnection(true)}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  useLiveConnection
                    ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-bold mb-1">اتصال حقيقي بالشيت</div>
                <div className="text-[10px] opacity-70">ربط مباشر مع قوقل شيت المرفق</div>
              </button>
            </div>
          </div>

          {/* Web App URL Input */}
          {useLiveConnection && (
            <div className="space-y-2 animate-slide-up">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                <Link className="w-4 h-4 text-[#d4a017]" />
                رابط تطبيق الويب (Google Web App URL):
              </label>
              <input
                type="url"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                required={useLiveConnection}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-[#d4a017]/60 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none transition-all ltr text-left"
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                * ستحصل على هذا الرابط عند نشر سكريبت Google Apps Script المرفق في الشيت الخاص بك كـ "تطبيق ويب" (Web App) وإتاحة الوصول لـ "الجميع" (Anyone).
              </p>
            </div>
          )}

          {/* Guide Section */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-[#d4a017] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              كيفية الربط المجاني الكامل والرفع على Vercel / GitHub:
            </h3>
            <ul className="text-[10.5px] text-zinc-400 space-y-1.5 list-decimal pr-4">
              <li>افتح الشيت الخاص بك في قوقل درايف.</li>
              <li>انقر على <b>امتدادات (Extensions)</b> ثم <b>Apps Script</b>.</li>
              <li>انسخ ملف <b>Code.gs</b> المرفق في الكود والصقه في المحرر.</li>
              <li>انقر على <b>نشر (Deploy)</b> ثم <b>نشر جديد (New Deployment)</b> واختر النوع <b>تطبيق ويب (Web App)</b>.</li>
              <li>اجعل خيار الوصول: <b>الجميع (Anyone)</b> ثم انسخ الرابط والصقه هنا.</li>
              <li>ارفع تطبيق الويب الحالي على مستودع GitHub المجاني الخاص بك، واربطه مع <b>Vercel</b> بضغطة زر واحدة مجانًا بدون أي تكاليف مادية نهائياً!</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#d4a017] hover:bg-amber-600 text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#d4a017]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4.5 h-4.5" />
                  تم الحفظ بنجاح!
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  حفظ الإعدادات وتطبيق التغيير
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-medium text-sm transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
