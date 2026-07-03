import React, { useState } from 'react';
import { 
  Save, Sliders, Settings, Link2, Plus, Trash, Image, Type, 
  HelpCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { AppSettings, PredefinedText } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshFromGoogle: () => void;
  isLoading: boolean;
}

export default function SettingsPanel({ settings, onSaveSettings, onRefreshFromGoogle, isLoading }: SettingsPanelProps) {
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.googleAppsScriptUrl);
  const [profileName, setProfileName] = useState(settings.profileName);
  const [profileSub, setProfileSub] = useState(settings.profileSub);
  const [profileLogo, setProfileLogo] = useState(settings.profileLogo);

  // Watermark state
  const [watermarkLogo, setWatermarkLogo] = useState(settings.watermark.logoUrl);
  const [watermarkOpacity, setWatermarkOpacity] = useState(settings.watermark.opacity);
  const [watermarkSize, setWatermarkSize] = useState(settings.watermark.sizeFactor);
  const [logoPos, setLogoPos] = useState(settings.watermark.logoPosition);
  const [textPrefix, setTextPrefix] = useState(settings.watermark.textPrefix);
  const [textFontSize, setTextFontSize] = useState(settings.watermark.fontSize);
  const [textPos, setTextPos] = useState(settings.watermark.textPosition);

  // Predefined Texts
  const [predefined, setPredefined] = useState<PredefinedText[]>(settings.predefinedTexts);
  const [newTitle, setNewTitle] = useState('');
  const [newPhrase, setNewPhrase] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddText = () => {
    if (newTitle.trim() && newPhrase.trim()) {
      setPredefined([...predefined, { title: newTitle.trim(), phrase: newPhrase.trim() }]);
      setNewTitle('');
      setNewPhrase('');
    }
  };

  const handleRemoveText = (idx: number) => {
    setPredefined(predefined.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: AppSettings = {
      googleAppsScriptUrl: appsScriptUrl,
      profileName,
      profileSub,
      profileLogo,
      watermark: {
        logoUrl: watermarkLogo,
        opacity: watermarkOpacity,
        sizeFactor: watermarkSize,
        logoPosition: logoPos,
        textPrefix,
        fontSize: textFontSize,
        textPosition: textPos
      },
      predefinedTexts: predefined,
      users: settings.users
    };
    onSaveSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-right text-slate-800">
      
      {/* Alert Success */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">تم حفظ جميع الإعدادات والربط وقائمة التصحيح بنجاح!</span>
        </div>
      )}

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 1: Connect to Google Sheets & Apps Script */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">ربط قاعدة البيانات (Google Sheets)</h3>
              <p className="text-xs text-slate-500">تحويل جدول جوجل الخاص بك إلى نظام تصحيح متطور</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                كيف تحصل على رابط الربط السهل؟
              </h4>
              <p>1. افتح جدول البيانات الخاص بك (Google Sheet) في المتصفح.</p>
              <p>2. اضغط على <strong>امتدادات (Extensions)</strong> ثم <strong>Apps Script</strong>.</p>
              <p>3. ألصق كود Google Apps Script الخاص بك (`Code.gs`) واضغط حفظ.</p>
              <p>4. اضغط على <strong>نشر (Deploy)</strong> ثم <strong>نشر جديد (New Deployment)</strong>.</p>
              <p>5. اختر <strong>تطبيق ويب (Web App)</strong> واجعل الصلاحيات: <strong>Me</strong> والوصول: <strong>Anyone</strong>.</p>
              <p>6. انسخ رابط تطبيق الويب الناتج وضعه في المربع أدناه.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">رابط تطبيق الويب Google Apps Script URL:</label>
              <input
                type="url"
                value={appsScriptUrl}
                onChange={e => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onRefreshFromGoogle}
                disabled={isLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>مزامنة وجلب البيانات من جوجل شيت</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Teacher Profile Settings */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">الملف التعريفي للأستاذ</h3>
              <p className="text-xs text-slate-500">العناوين التي تظهر في ترويسة الصفحة الرئيسية</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-bold text-slate-700">الاسم الأول أو العنوان الرئيسي:</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="الأستاذ سليمان"
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-bold text-slate-700">الوصف الفرعي:</label>
                <input
                  type="text"
                  value={profileSub}
                  onChange={e => setProfileSub(e.target.value)}
                  placeholder="مصحح ومعلم الخط العربي الاحترافي"
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <label className="block text-xs font-bold text-slate-700">شعار الأستاذ (رابط صورة):</label>
              <input
                type="url"
                value={profileLogo}
                onChange={e => setProfileLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Watermark Settings */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">إعدادات الشعار والختم (الـ Watermark)</h3>
              <p className="text-xs text-slate-500">إضافة حماية لعملك وتوثيق تصحيحاتك التلقائية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Logo details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">الشعار والرمز</h4>
              
              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">رابط الشعار أو الختم:</label>
                <input
                  type="url"
                  value={watermarkLogo}
                  onChange={e => setWatermarkLogo(e.target.value)}
                  placeholder="رابط مباشر للصورة من جوجل درايف"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">الشفافية:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={watermarkOpacity}
                    onChange={e => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <span className="text-xs font-mono text-slate-500">{Math.round(watermarkOpacity * 100)}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">حجم الشعار:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={watermarkSize}
                    onChange={e => setWatermarkSize(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <span className="text-xs font-mono text-slate-500">{watermarkSize}x</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">موقع الشعار:</label>
                <select
                  value={logoPos}
                  onChange={e => setLogoPos(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                >
                  <option value="top-left">أعلى اليسار</option>
                  <option value="top-right">أعلى اليمين</option>
                  <option value="bottom-left">أسفل اليسار</option>
                  <option value="bottom-right">أسفل اليمين</option>
                  <option value="center">في المنتصف</option>
                </select>
              </div>
            </div>

            {/* Text watermarks details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">النص المكتوب المرافق</h4>
              
              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">صيغة ترويسة التصحيح المكتوبة:</label>
                <input
                  type="text"
                  value={textPrefix}
                  onChange={e => setTextPrefix(e.target.value)}
                  placeholder="تصحيح الأستاذ سليمان"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">حجم خط النص:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={12}
                    max={48}
                    value={textFontSize}
                    onChange={e => setTextFontSize(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <span className="text-xs font-mono text-slate-500">{textFontSize}px</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <label className="block text-xs font-semibold text-slate-600">موقع النص:</label>
                <select
                  value={textPos}
                  onChange={e => setTextPos(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                >
                  <option value="top-left">أعلى اليسار</option>
                  <option value="top-right">أعلى اليمين</option>
                  <option value="bottom-left">أسفل اليسار</option>
                  <option value="bottom-right">أسفل اليمين</option>
                  <option value="center">في المنتصف</option>
                </select>
              </div>
            </div>

            {/* Simulated Watermark Preview card */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 relative flex flex-col justify-between h-56">
              <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full">معاينة الختم</span>
              <div className="text-[10px] text-slate-500">تمثيل لربط الـ Watermark التلقائي على الصورة</div>
              
              {/* Text placement mockup */}
              <div className="flex-1 flex flex-col justify-between p-2">
                <div className="flex justify-between items-start h-full">
                  
                  {/* Top-left */}
                  <div className="text-[9px] font-mono leading-none">
                    {textPos === 'top-left' && `${textPrefix} #120`}
                    {logoPos === 'top-left' && <span className="block w-6 h-6 bg-amber-500/30 rounded" />}
                  </div>

                  {/* Top-right */}
                  <div className="text-[9px] font-mono leading-none text-right">
                    {textPos === 'top-right' && `${textPrefix} #120`}
                    {logoPos === 'top-right' && <span className="block w-6 h-6 bg-amber-500/30 rounded" />}
                  </div>

                </div>

                <div className="flex justify-center items-center">
                  {logoPos === 'center' && <span className="block w-8 h-8 bg-amber-500/30 rounded" />}
                  {textPos === 'center' && <span className="text-[10px]">{textPrefix}</span>}
                </div>

                <div className="flex justify-between items-end">
                  {/* Bottom-left */}
                  <div className="text-[9px] font-mono leading-none">
                    {textPos === 'bottom-left' && `${textPrefix} #120`}
                    {logoPos === 'bottom-left' && <span className="block w-6 h-6 bg-amber-500/30 rounded" />}
                  </div>

                  {/* Bottom-right */}
                  <div className="text-[9px] font-mono leading-none text-right">
                    {textPos === 'bottom-right' && `${textPrefix} #120`}
                    {logoPos === 'bottom-right' && <span className="block w-6 h-6 bg-amber-500/30 rounded" />}
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* Section 4: Predefined Texts for Calligraphy board */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">إدارة عبارات التصحيح السريعة الجاهزة</h3>
              <p className="text-xs text-slate-500">العبارات المتاحة لوضعها على لوحة تصحيح الخط بنقرة واحدة</p>
            </div>
          </div>

          {/* Texts Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 text-xs">إضافة عبارة جديدة:</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">عنوان العبارة القصير (يظهر في القائمة):</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="مثال: ممتاز - خط رائع"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">العبارة التي ستطبع بالكامل على اللوحة (تدعم \n للسطور):</label>
                  <textarea
                    value={newPhrase}
                    onChange={e => setNewPhrase(e.target.value)}
                    placeholder="مثال: أحسنت كتابة حرف الصاد\nواصل التدريب وبورك قلمك!"
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddText}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة العبارة للقائمة</span>
                </button>
              </div>
            </div>

            {/* List of current predefined phrases */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              <h4 className="font-semibold text-slate-700 text-xs">العبارات المتاحة حالياً ({predefined.length}):</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                {predefined.map((item, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center text-xs hover:bg-white transition-all">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.phrase}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveText(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="حذف"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Save Settings Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-lg hover:shadow-emerald-500/10 flex items-center gap-2 transition cursor-pointer"
        >
          <Save className="w-5 h-5" />
          <span>حفظ جميع الإعدادات الحالية</span>
        </button>
      </div>

    </form>
  );
}
