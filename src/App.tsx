import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CanvasEditor from "./components/CanvasEditor";
import { StudentRecord } from "./types";
import { Loader2, Sparkles, Youtube, Facebook, Instagram, Hash } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<{
    name: string;
    logoUrl: string;
    description: string;
    social: { facebook: string; instagram: string; youtube: string; line: string };
  }>({
    name: "أكاديمية الخط العربي",
    logoUrl: "",
    description: "بوابة تصحيح الدروس والمتابعة الفنية",
    social: { facebook: "", instagram: "", youtube: "", line: "" }
  });

  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial configuration load & Session Verification
  useEffect(() => {
    // Check local session
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    // Fetch Profile configurations (logo, title, contact details)
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          const profileRows = data.profile;
          const contactRows = data.contact || [];

          setSchoolProfile({
            name: profileRows[0]?.[1] || "أكاديمية تصحيح الخط العربي",
            logoUrl: profileRows[0]?.[2] || "",
            description: profileRows[1]?.[1] || "بوابة التصحيح والمتابعة الاحترافية للدروس",
            social: {
              facebook: contactRows[0]?.[0] || "",
              instagram: contactRows[0]?.[1] || "",
              youtube: contactRows[0]?.[2] || "",
              line: contactRows[0]?.[3] || ""
            }
          });
        }
        setLoadingProfile(false);
      })
      .catch((err) => {
        console.error("Failed to load school profile from Sheet:", err);
        setLoadingProfile(false);
      });
  }, []);

  // 2. Load Student roster from Google Sheets whenever user is logged in
  const fetchRecords = () => {
    setLoadingRecords(true);
    setError(null);
    fetch("/api/table-data")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecords(data);
        } else if (data && data.error) {
          setError(data.error);
        } else {
          setError("تنسيق غير متوافق للبيانات المستلمة من شيت");
        }
        setLoadingRecords(false);
      })
      .catch((err: any) => {
        setError("فشل الاتصال بالخادم وقراءة بيانات الشيت: " + err.message);
        setLoadingRecords(false);
      });
  };

  useEffect(() => {
    if (currentUser) {
      fetchRecords();
    }
  }, [currentUser]);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) {
      localStorage.removeItem("loggedInUser");
      setCurrentUser(null);
      setRecords([]);
      setSelectedRecord(null);
    }
  };

  const handleSaveComplete = () => {
    // Re-fetch sheet database after correction saves successfully
    fetchRecords();
    setSelectedRecord(null);
  };

  // Loading Screen for initial profile configurations bootup
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-amber-400">تحميل واجهة الأكاديمية...</h3>
        <p className="text-zinc-500 text-xs mt-2">جاري التزامن مع ملفات قوقل شيت وجلب الهوية الفنية</p>
      </div>
    );
  }

  // Not logged in -> Show login card
  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess}
        schoolName={schoolProfile.name}
        logoUrl={schoolProfile.logoUrl}
      />
    );
  }

  // Active correction studio session
  if (selectedRecord) {
    return (
      <CanvasEditor 
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        currentUser={currentUser}
        onSaveComplete={handleSaveComplete}
      />
    );
  }

  // Otherwise -> Show Main Workspace Dashboard
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans">
      <Dashboard 
        records={records}
        onSelectRecord={setSelectedRecord}
        onLogout={handleLogout}
        currentUser={currentUser}
        loading={loadingRecords}
        onRefresh={fetchRecords}
        schoolName={schoolProfile.name}
      />

      {/* Global Error Alert Bar */}
      {error && (
        <div className="bg-red-50 text-red-800 text-center text-xs py-3.5 px-6 border-t border-b border-red-100 flex items-center justify-center gap-2">
          <span className="font-bold">تنبيه فني:</span>
          <span>{error}</span>
          <button 
            onClick={fetchRecords} 
            className="underline hover:text-red-950 font-semibold ml-4 bg-red-100 px-2 py-0.5 rounded"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Footer social contacts dynamically loaded from Google Sheet Contact */}
      <footer className="mt-auto py-8 bg-zinc-900 text-zinc-400 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <h4 className="text-sm font-bold text-amber-400">{schoolProfile.name}</h4>
            <p className="text-xs text-zinc-500 mt-1">{schoolProfile.description}</p>
          </div>

          {/* Social Links Row */}
          <div className="flex items-center gap-4">
            {schoolProfile.social.facebook && (
              <a 
                href={schoolProfile.social.facebook} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all text-zinc-300"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {schoolProfile.social.instagram && (
              <a 
                href={schoolProfile.social.instagram} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all text-zinc-300"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {schoolProfile.social.youtube && (
              <a 
                href={schoolProfile.social.youtube} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all text-zinc-300"
                title="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            )}
            {schoolProfile.social.line && (
              <a 
                href={schoolProfile.social.line} 
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all text-zinc-300 font-bold text-xs"
                title="Line"
              >
                L
              </a>
            )}
          </div>

          <div className="text-center md:text-left text-xxs text-zinc-600">
            حقوق الطبع والنشر محفوظة © الأكاديمية خط تصحيح • {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}
