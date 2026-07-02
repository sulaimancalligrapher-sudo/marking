import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout } from './lib/firebase';
import { fetchSpreadsheetData } from './lib/googleApi';
import { StudentLesson, PredefinedText, WatermarkSettings, ProfileInfo, ContactInfo, SheetUser } from './types';
import LessonTable from './components/LessonTable';
import CorrectionWorkspace from './components/CorrectionWorkspace';
import { LogOut, Settings as SettingsIcon, LogIn, Mail, Lock, User as UserIcon, HelpCircle, Save, CheckCircle, Copy, Check, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  // Spreadsheet credentials
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('spreadsheet_id') || '1F3hDUfjgBEkUAIOaF66634EWQQ8XZSdyKjlTzrVA25k';
  });

  // Authorization token from Firebase Google Auth
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);

  // Sheet users state (loaded from Settings!Z2:AB)
  const [sheetUsers, setSheetUsers] = useState<any[]>([]);
  const [selectedSheetUser, setSelectedSheetUser] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isSheetAuthenticated, setIsSheetAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sheet_authenticated') === 'true';
  });
  const [authenticatedUsername, setAuthenticatedUsername] = useState<string>(() => {
    return localStorage.getItem('authenticated_username') || '';
  });

  // App settings & profile (loaded dynamically from Sheet)
  const [profile, setProfile] = useState<ProfileInfo>({
    logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071',
    name: 'تصحيح الدروس',
    description: 'منصة تصحيح الدروس والواجبات التفاعلية',
  });
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [folderId, setFolderId] = useState<string>('');
  const [stickers, setStickers] = useState<string[]>([]);
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings | null>(null);

  // Table Data
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([]);
  
  // Selected lesson row for corrections
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null);
  const [isNewCorrection, setIsNewCorrection] = useState<boolean>(true);

  // App views state
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState<string>(spreadsheetId);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch sheet details when Google Token or Spreadsheet ID changes
  useEffect(() => {
    if (googleToken && spreadsheetId) {
      loadSheetData();
    }
  }, [googleToken, spreadsheetId]);

  const loadSheetData = async () => {
    if (!googleToken) return;
    setDataLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchSpreadsheetData(spreadsheetId, googleToken);
      setLessons(data.studentLessons);
      setAdditionalHeaders(data.additionalHeaders);
      setProfile(data.profile);
      setContact(data.contact);
      setFolderId(data.folderId);
      setStickers(data.stickers);
      setPredefinedTexts(data.predefinedTexts);
      setWatermarkSettings(data.watermarkSettings);
      setSheetUsers(data.sheetUsers);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'فشل تحميل البيانات من ورقة قوقل. الرجاء التحقق من معرّف الورقة وصلاحيات الحساب.');
    } finally {
      setDataLoading(false);
    }
  };

  // Google Sign-In trigger
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      let errMsg = 'فشل تسجيل الدخول باستخدام حساب Google.';
      
      if (err.code === 'auth/unauthorized-domain') {
        errMsg = `خطأ (Unauthorized Domain): نطاق هذا الموقع غير مصرّح به في مشروع Firebase الخاص بك. لحل هذه المشكلة، يرجى نسخ هذا النطاق (${window.location.hostname}) وإضافته إلى قائمة "النطاقات المصرح بها" (Authorized Domains) في وحدة تحكم Firebase (Authentication -> Settings -> Authorized Domains).`;
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'خطأ (Popup Blocked): تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى تفعيل السماح بالنوافذ المنبثقة لهذا الموقع في متصفحك والمحاولة مجدداً.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'تم إغلاق نافذة تسجيل الدخول بواسطة المستخدم قبل إتمام عملية الدخول.';
      } else if (err.message) {
        errMsg = `فشل تسجيل الدخول: ${err.message}`;
      }
      setErrorMessage(errMsg);
    }
  };

  // Sign out
  const handleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setGoogleToken(null);
    setIsSheetAuthenticated(false);
    setAuthenticatedUsername('');
    localStorage.removeItem('sheet_authenticated');
    localStorage.removeItem('authenticated_username');
  };

  // Spreadsheet password check
  const handleSheetLogin = () => {
    setErrorMessage('');
    const user = sheetUsers.find(u => u.username === selectedSheetUser);
    if (!user) {
      setErrorMessage('الرجاء اختيار اسم المعلم من القائمة.');
      return;
    }
    if (user.password !== passwordInput) {
      setErrorMessage('رمز المرور المدخل غير صحيح.');
      return;
    }
    if (user.status === 'لا') {
      setErrorMessage('هذا الحساب تم إيقافه حالياً.');
      return;
    }

    setIsSheetAuthenticated(true);
    setAuthenticatedUsername(user.username);
    localStorage.setItem('sheet_authenticated', 'true');
    localStorage.setItem('authenticated_username', user.username);
  };

  // Update dynamic spreadsheet ID
  const handleSaveSpreadsheetId = () => {
    localStorage.setItem('spreadsheet_id', tempSpreadsheetId);
    setSpreadsheetId(tempSpreadsheetId);
    setShowSettingsModal(false);
    // Force reload
    setSelectedLesson(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      
      {/* Header Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={profile.logoUrl}
            alt="Logo"
            className="w-12 h-12 rounded-xl object-cover border border-slate-700/50 shadow-md"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100">{profile.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{profile.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {googleUser && isSheetAuthenticated && (
            <div className="flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-300">المعلم: {authenticatedUsername}</span>
            </div>
          )}

          {googleUser && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="إعدادات ورقة قوقل"
            >
              <SettingsIcon size={18} />
            </button>
          )}

          {googleUser && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-start">
        
        {/* State 1: Global Loading */}
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-semibold">جاري التحقق من حالة تسجيل الدخول...</p>
          </div>
        ) : !googleUser ? (
          
          /* State 2: Request Google Sign-In first */
          <div className="max-w-md w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mx-auto">
              <LogIn size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-100">تسجيل الدخول للمنصة</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                لربط جدول تصحيح الدروس وحفظ الملاحظات والصوتيات، يرجى تسجيل الدخول باستخدام حساب Google المالك أو المخوّل للوصول إلى Spreadsheet وقوقل درايف.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-3 py-3 px-6 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-98 transition cursor-pointer"
            >
              <Mail size={18} />
              <span>تسجيل الدخول باستخدام قوقل</span>
            </button>

            {/* Google Sandbox & 403 access_denied bypass tip */}
            <div className="mt-1 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-right flex flex-col gap-2">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                <span>تنبيه هام لحل مشكلة تسجيل الدخول وتفادي خطأ 403:</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تطبيقات Google قيد التطوير تفرض قيوداً تمنع الحسابات الخارجية غير المسجلة من الدخول مباشرة (مما يسبب خطأ 403: access_denied). الحساب المعتمد الوحيد حالياً هو:
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="font-mono text-[11px] text-emerald-400 select-all">artist.unseenbeauty@gmail.com</span>
                <button
                  onClick={() => handleCopyEmail('artist.unseenbeauty@gmail.com')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 transition text-[10px] cursor-pointer"
                >
                  {copied ? <CheckCircle size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                <strong>الحل الفعّال والسريع:</strong>
                <br />
                1. قم بفتح ملف الشيت (Google Sheet) في حسابك الآخر.
                <br />
                2. اضغط على زر <strong>مشاركة (Share)</strong> في الأعلى.
                <br />
                3. أضف البريد أعلاه <span className="text-emerald-400 font-mono font-semibold">artist.unseenbeauty@gmail.com</span> بصفة <strong>محرر (Editor)</strong>.
                <br />
                4. سجل الدخول هنا بهذا البريد المعتمد وسيفتح لك النظام لوحة التحكم فوراً وسيقوم بقراءة وحفظ بيانات الشيت الخاص بك بكل سلاسة وأمان!
              </p>
            </div>
          </div>

        ) : !isSheetAuthenticated ? (

          /* State 3: Enter Sheet credentials or show connection trouble if it failed */
          sheetUsers.length === 0 && !dataLoading ? (
            /* Troubleshooting block when loading failed */
            <div className="max-w-xl w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-slate-100">فشل الاتصال بملف قوقل شيت</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  الحساب الحالي <span className="font-semibold text-emerald-400 font-mono">{googleUser?.email}</span> قد لا يمتلك صلاحية للوصول للملف المحدد، أو معرّف الورقة غير صحيح.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-mono text-center">
                  {errorMessage}
                </div>
              )}

              {/* Troubleshooting Solutions Accordion/Steps */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200">حلول مقترحة لحل المشكلة:</h3>
                
                {/* Solution 1: Share sheet with current active google user */}
                <div className="border-b border-slate-800 pb-4">
                  <span className="inline-block bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded mb-2">الحل الأول الأسهل: مشاركة الملف</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إذا كان الشيت متواجداً في حساب Google آخر خاص بك، يمكنك فتح الشيت في ذلك الحساب والضغط على <strong>مشاركة (Share)</strong> ثم إضافة هذا البريد الإلكتروني الحالي ليكون <strong>محرر (Editor)</strong>:
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs">
                    <span className="font-mono text-slate-200 select-all">{googleUser?.email}</span>
                    <button
                      onClick={() => handleCopyEmail(googleUser?.email || '')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'تم النسخ' : 'نسخ الإيميل'}</span>
                    </button>
                  </div>
                </div>

                {/* Solution 2: Change Sheet ID to a spreadsheet owned by current user */}
                <div className="border-b border-slate-800 pb-4">
                  <span className="inline-block bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded mb-2">الحل الثاني: تغيير معرّف الشيت (Spreadsheet ID)</span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    إذا أردت ربط شيت آخر تملكه في حسابك الحالي، يرجى كتابة معرّف الورقة الجديد هنا:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempSpreadsheetId}
                      onChange={(e) => setTempSpreadsheetId(e.target.value)}
                      placeholder="أدخل معرّف قوقل شيت الجديد..."
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-850 text-slate-205 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('spreadsheet_id', tempSpreadsheetId);
                        setSpreadsheetId(tempSpreadsheetId);
                        // Refresh data
                        setTimeout(() => loadSheetData(), 100);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      حفظ وتحديث
                    </button>
                  </div>
                </div>

                {/* Solution 3: Re-login with different Google Account */}
                <div>
                  <span className="inline-block bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded mb-2">الحل الثالث: تبديل حساب Google</span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    إذا أردت تسجيل الدخول باستخدام حساب Google المالك للورقة مباشرة، اضغط على الزر أدناه لاختيار الحساب الصحيح:
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-200 transition cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>تبديل حساب Google الحالي</span>
                  </button>
                </div>

              </div>

              {/* Back to google login / Logout entirely option */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-xs">
                <button
                  onClick={loadSheetData}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
                >
                  <RefreshCw size={12} />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="text-rose-400 hover:text-rose-300 transition font-bold"
                >
                  تسجيل خروج بالكامل
                </button>
              </div>
            </div>
          ) : (
            /* Normal Teacher login selection */
            <div className="max-w-md w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Lock size={32} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-slate-100">اختيار اسم المعلم</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  تم ربط حساب قوقل بنجاح. يرجى اختيار اسم المعلم وإدخال رمز المرور المسجل في شيت قوقل.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {dataLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500">جاري جلب حسابات المعلمين من الشيت...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Username select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">اسم المعلم</label>
                    <div className="relative">
                      <select
                        value={selectedSheetUser}
                        onChange={(e) => setSelectedSheetUser(e.target.value)}
                        className="w-full px-10 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition"
                      >
                        <option value="" disabled>اختر اسمك</option>
                        {sheetUsers.map((user, i) => (
                          <option key={i} value={user.username}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-3 text-slate-500">
                        <UserIcon size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400">رمز المرور (كود الحساب)</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="أدخل الرمز الخاص بك..."
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition"
                      />
                      <div className="absolute right-3.5 top-3 text-slate-500">
                        <Lock size={16} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSheetLogin}
                    className="w-full py-3.5 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-98 transition cursor-pointer"
                  >
                    تأكيد الدخول واللوحة
                  </button>

                  {/* Switch Google account helper at normal login as well */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>الحساب الحالي: <span className="text-slate-300 font-semibold font-mono">{googleUser?.email}</span></span>
                      <button
                        onClick={handleLogout}
                        className="text-rose-400 hover:text-rose-300 transition font-bold"
                      >
                        خروج
                      </button>
                    </div>
                    <button
                      onClick={handleGoogleSignIn}
                      className="text-indigo-400 hover:text-indigo-300 transition text-right font-semibold"
                    >
                      هل تريد تسجيل الدخول بحساب Google آخر؟
                    </button>
                  </div>
                </div>
              )}
            </div>
          )

        ) : selectedLesson ? (

          /* State 4: Correction Workspace View */
          <CorrectionWorkspace
            lesson={selectedLesson}
            isNewCorrection={isNewCorrection}
            spreadsheetId={spreadsheetId}
            folderId={folderId}
            token={googleToken!}
            stickers={stickers}
            predefinedTexts={predefinedTexts}
            watermarkSettings={watermarkSettings}
            additionalHeaders={additionalHeaders}
            onBack={() => setSelectedLesson(null)}
            onRefresh={loadSheetData}
            googleUserEmail={googleUser?.email || 'artist.unseenbeauty@gmail.com'}
          />

        ) : (

          /* State 5: Main Dashboard List View */
          <div className="flex flex-col gap-6">
            
            {/* Header / Stats row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
                  <span>جدول تصحيح الدروس</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">اضغط على أي من واجبات الطلاب في القائمة أدناه لبدء عملية التصحيح والتلوين.</p>
              </div>

              <div className="flex gap-4">
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2 text-center shadow-sm">
                  <span className="text-slate-500 text-[10px] font-bold block">الدروس قيد التصحيح</span>
                  <span className="text-lg font-extrabold text-amber-500">{lessons.filter(l => !l.isSaved).length}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2 text-center shadow-sm">
                  <span className="text-slate-500 text-[10px] font-bold block">المكتملة اليوم</span>
                  <span className="text-lg font-extrabold text-emerald-400">{lessons.filter(l => l.isSaved).length}</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <HelpCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Student list Table */}
            <LessonTable
              lessons={lessons}
              loading={dataLoading}
              onSelectLesson={(lesson, isNew) => {
                setSelectedLesson(lesson);
                setIsNewCorrection(isNew);
              }}
            />
          </div>
        )}

      </main>

      {/* Settings Modal (Configurable Spreadsheet ID) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <SettingsIcon size={18} className="text-emerald-500" />
                <span>إعدادات الاتصال بشيت قوقل</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">تعديل معرّف جدول البيانات (Spreadsheet ID) النشط في الجلسة.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">معرّف جدول البيانات (Spreadsheet ID)</label>
              <input
                type="text"
                value={tempSpreadsheetId}
                onChange={(e) => setTempSpreadsheetId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-600 transition"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setTempSpreadsheetId(spreadsheetId);
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveSpreadsheetId}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
              >
                حفظ وإعادة تحميل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="mt-auto py-6 border-t border-slate-900/60 text-center text-slate-600 text-xs font-semibold tracking-wider bg-slate-950">
        جميع الحقوق محفوظة © {new Date().getFullYear()} – لوحة تصحيح الدروس التفاعلية
      </footer>
    </div>
  );
}
