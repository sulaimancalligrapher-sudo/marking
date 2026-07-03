import React, { useState, useEffect } from "react";
import { Lock, User, MapPin, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { UserAccount } from "../types";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
  schoolName: string;
  logoUrl: string;
}

export default function Login({ onLoginSuccess, schoolName, logoUrl }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);

  // Pre-fetch users list on load to check status and passwords locally if possible
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);

    // Get location
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (locErr) {
      console.log("Geolocation not allowed or timed out. Logging in without location details.");
    }

    const deviceId = getOrCreateDeviceId();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim(), deviceId, lat, lng })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem("loggedInUser", username.trim());
        onLoginSuccess(username.trim());
      } else {
        setError(result.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء محاولة تسجيل الدخول. يرجى التأكد من تشغيل الخادم والاتصال بالإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#d4a017_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.05] pointer-events-none" />
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden relative z-10">
        <div className="p-8 pb-6 text-center border-b border-zinc-100 bg-zinc-900 text-white relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/20 to-zinc-900 pointer-events-none" />
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-20 h-20 mx-auto object-cover rounded-full border-2 border-amber-400 shadow-lg mb-4 bg-zinc-800"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 mx-auto bg-amber-500 rounded-full flex items-center justify-center text-zinc-900 text-3xl font-bold mb-4 shadow-lg border-2 border-amber-400">
              ✒️
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-amber-400">{schoolName || "أكاديمية تصحيح الخط العربي"}</h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-light">بوابة المصححين والأساتذة المعتمدين</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 text-right">
                اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="rtl"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-zinc-800 text-right pr-11 transition-all"
                  placeholder="أدخل اسم المستخدم"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="rtl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-zinc-800 text-right pr-11 transition-all"
                  placeholder="أدخل كلمة المرور"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>تسجيل الموقع الجغرافي نشط تلقائياً</span>
            </div>
            <div className="flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
              <span>بصمة الجهاز نشطة</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق والمصادقة...</span>
              </>
            ) : (
              <span>تسجيل الدخول الآمن</span>
            )}
          </button>
        </form>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center text-xs text-zinc-400">
          هذا النظام محمي ومعتمد للاستخدام التعليمي فقط
        </div>
      </div>
    </div>
  );
}
