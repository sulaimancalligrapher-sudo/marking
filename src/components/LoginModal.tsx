import React, { useState, useEffect } from 'react';
import { INITIAL_USERS } from '../mockData';
import { User, Lock, MapPin, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (username: string) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveUsers, setLiveUsers] = useState<{ username: string; password?: string; status: string }[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState('');

  useEffect(() => {
    // Request geolocation early to prevent user waiting
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Location access declined by user');
        }
      );
    }

    // Load sheets config to check if live
    const savedConfig = localStorage.getItem('calligraphy_sheets_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.useLiveConnection && parsed.webAppUrl) {
          setIsLive(true);
          setWebAppUrl(parsed.webAppUrl);
          // Fetch live users
          fetch(`/api/sheets?url=${encodeURIComponent(parsed.webAppUrl)}&action=getUsers`)
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data)) {
                setLiveUsers(data);
              }
            })
            .catch((err) => console.error('Failed to fetch live users:', err));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    // Generate unique device ID if not exists
    let devId = localStorage.getItem('deviceId');
    if (!devId) {
      devId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', devId);
    }

    if (username === 'سليمان الخطاط' && password === '123456') {
      // Master override for testing ease
      proceedSuccess('سليمان الخطاط');
      return;
    }

    const currentUsersList = isLive && liveUsers.length > 0 ? liveUsers : INITIAL_USERS;
    const match = currentUsersList.find(
      (u) => u.username.trim() === username.trim()
    );

    if (!match) {
      setErrorMessage('المستخدم غير مسجل بالنظام، يرجى التحقق من لوحة شيت Settings!');
      setLoading(false);
      return;
    }

    // Check password
    if (match.password && match.password.toString().trim() !== password.trim()) {
      setErrorMessage('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
      setLoading(false);
      return;
    }

    if (match.status === 'لا') {
      setErrorMessage('تم تجميد حساب هذا المصحح ومحظور حالياً من الوصول اللوحي.');
      setLoading(false);
      return;
    }

    // If connected to Live Sheets, send device ID & Location registration to Sheet
    if (isLive && webAppUrl) {
      try {
        const response = await fetch(`/api/sheets?url=${encodeURIComponent(webAppUrl)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'loginUser',
            username: username.trim(),
            deviceId: devId,
            lat: coords?.lat || null,
            lng: coords?.lng || null
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.success === false) {
            setErrorMessage(resData.message || 'خطأ في التحقق من الجهاز المسموح به.');
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to log device location on Sheet:', err);
        // Continue to login anyway to keep UX smooth
      }
    }

    proceedSuccess(username);
  };

  const proceedSuccess = (loggedInUser: string) => {
    // Save to local storage
    localStorage.setItem('loggedInUser', loggedInUser);
    onLoginSuccess(loggedInUser);
    setLoading(false);
  };

  const activeUsersList = isLive && liveUsers.length > 0 ? liveUsers : INITIAL_USERS;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="login-modal-overlay">
      <div className="bg-zinc-900 border border-[#d4a017]/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-[#d4a017]/5 text-right" dir="rtl">
        
        {/* Visual Calligraphy Header Banner */}
        <div className="bg-gradient-to-b from-[#d4a017]/20 via-zinc-900 to-zinc-900 p-8 text-center border-b border-zinc-800 relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-[#d4a017] to-amber-500" />
          <div className="w-16 h-16 rounded-full bg-zinc-950 border border-[#d4a017] flex items-center justify-center mx-auto mb-4 shadow-xl">
            <ShieldCheck className="w-8 h-8 text-[#d4a017]" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 font-sans">تسجيل الدخول للنظام السحابي</h2>
          <p className="text-xs text-zinc-400 mt-1.5">لوحة تصحيح كراسات الطلاب المعتمدة للخط العربي</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Geolocation visual tracker */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex items-center gap-2 text-zinc-400">
            <MapPin className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <div className="text-[10px] leading-relaxed flex-1">
              {coords ? (
                <span>تم التحقق من إحداثيات جهازك تلقائياً للتوثيق الجغرافي: <strong className="text-emerald-400">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</strong></span>
              ) : (
                <span>جاري استرداد موقعك الحالي لتسجيله في عمود التوثيق بالأجهزة بالشيت...</span>
              )}
            </div>
          </div>

          {/* Username selection or manual input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#d4a017]" />
              اسم المستخدم (أو اختر من المسجلين بالشيت):
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اكتب اسم المستخدم المسجل..."
                className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-[#d4a017]/60 rounded-xl py-3 pr-4 pl-12 text-sm text-zinc-200 outline-none text-right"
              />
              <select
                onChange={(e) => setUsername(e.target.value)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-[#d4a017] cursor-pointer"
              >
                <option value="">سجل المدرسين</option>
                {activeUsersList.map((u) => (
                  <option key={u.username} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#d4a017]" />
              كلمة المرور:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-[#d4a017]/60 rounded-xl py-3 px-4 text-sm text-zinc-200 outline-none text-right font-mono"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#d4a017] hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:pointer-events-none text-zinc-950 font-bold rounded-xl text-sm shadow-xl shadow-[#d4a017]/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? (
              <>
                <div className="w-4.5 h-4.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                جاري المصادقة والتحقق من الأجهزة المسموحة...
              </>
            ) : (
              'تسجيل الدخول الآمن للسبورة'
            )}
          </button>

          {/* Credentials hint */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850/60 text-[10px] text-zinc-500 flex items-start gap-1.5 leading-relaxed">
            <HelpCircle className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
            <span>للتجربة الفورية السريعة، استخدم اسم المعلم: <strong className="text-zinc-300">سليمان الخطاط</strong> مع كلمة المرور: <strong className="text-zinc-300">123456</strong>. سيقوم النظام بتوثيق جهازك الجغرافي وحفظ تصحيحاتك.</span>
          </div>

        </form>
      </div>
    </div>
  );
}
