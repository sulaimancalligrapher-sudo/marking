/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentLesson {
  row: number;
  studentId: string;
  studentName: string;
  lessonNumber: string;
  submissionCount: number;
  mediaType: 'image' | 'audio';
  mediaUrl: string; // Original image or audio URL
  isSaved: boolean;
  notes?: string;
  imageGrade?: string;
  audioGrade?: string;
  modifiedImage?: string; // Corrected board dataURL
  additionalImage?: string;
  video?: string;
  audio?: string;
  saveDate?: string;
  // Extra custom columns from T to Y
  extraData: { [key: string]: string };
}

export interface PredefinedText {
  title: string;
  phrase: string;
}

export interface WatermarkSettings {
  logoUrl: string;
  opacity: number;
  sizeFactor: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  textPrefix: string;
  fontSize: number;
  textPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

// Dynamically generate beautiful, high-quality handwritten Arabic SVG papers
// to make the Mock Mode completely self-contained, beautiful, and offline-friendly!
const generateHandwrittenSVG = (title: string, textLines: string[]): string => {
  const linesHtml = textLines.map((line, i) => {
    const y = 140 + i * 55;
    return `
      <!-- Handwriting rule line -->
      <line x1="50" y1="${y + 10}" x2="750" y2="${y + 10}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="5,5" />
      <!-- Lined page margin line -->
      <text x="730" y="${y}" font-family="'Amiri', 'Cairo', serif" font-size="28" fill="#1e293b" text-anchor="end" font-weight="bold">${line}</text>
    `;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
      <!-- Notebook paper background -->
      <rect width="800" height="1000" fill="#fcfcf9" />
      <rect x="15" y="15" width="770" height="970" fill="none" stroke="#e2e8f0" stroke-width="3" rx="10" />
      
      <!-- Blue notebook margins -->
      <line x1="80" y1="0" x2="80" y2="1000" stroke="#fca5a5" stroke-width="2" />
      <line x1="740" y1="0" x2="740" y2="1000" stroke="#93c5fd" stroke-width="1.5" />
      
      <!-- Top header area -->
      <rect x="80" y="30" width="660" height="70" fill="#f8fafc" rx="5" stroke="#e2e8f0" />
      <text x="400" y="72" font-family="'Cairo', sans-serif" font-size="24" fill="#0d5c3a" text-anchor="middle" font-weight="bold">${title}</text>
      
      <!-- Lined notebook rows -->
      ${linesHtml}

      <!-- Aesthetic student details on paper -->
      <rect x="95" y="900" width="610" height="60" fill="#f1f5f9" rx="5" />
      <text x="680" y="936" font-family="'Cairo', sans-serif" font-size="16" fill="#64748b" text-anchor="end">واجب الطالب المنزلي - يرجى التصحيح بعناية</text>
      <circle cx="120" cy="930" r="12" fill="#22c55e" opacity="0.7" />
      <text x="145" y="935" font-family="'Cairo', sans-serif" font-size="14" fill="#475569" font-weight="bold">مكتمل</text>
    </svg>
  `;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

// Interactive realistic offline Arabic student mock database
const mockStudentLessons: StudentLesson[] = [
  {
    row: 2,
    studentId: '1001',
    studentName: 'أحمد بن عبد الرحمن القحطاني',
    lessonNumber: 'سورة النبأ (1 - 15)',
    submissionCount: 1,
    mediaType: 'audio',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Premium sample audio
    isSaved: false,
    extraData: {
      'حلقة الحفظ': 'حلقة الأوزاعي',
      'اسم المعلم': 'الشيخ عبد الله القرني',
      'مستوى الطالب': 'ممتاز',
      'تاريخ الاستلام': '2026-07-01',
      'الملاحظة السابقة': 'مخارج الحروف جيدة جداً، يحتاج لضبط الغنة في الميم المشددة',
      'التقدير التراكمي': 'أ'
    }
  },
  {
    row: 3,
    studentId: '1002',
    studentName: 'عمر بن خالد الحارثي',
    lessonNumber: 'واجب كتابة سورة الملك (1-5)',
    submissionCount: 2,
    mediaType: 'image',
    mediaUrl: generateHandwrittenSVG('واجب سورة الملك - الطالب عمر الحارثي', [
      'بسم الله الرحمن الرحيم',
      'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا',
      'وَهُوَ الْعَزِيزُ الْغَفُورُ',
      'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ',
      'الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ'
    ]),
    isSaved: false,
    extraData: {
      'حلقة الحفظ': 'حلقة الإمام الشاطبي',
      'اسم المعلم': 'الشيخ رائد المالكي',
      'مستوى الطالب': 'متوسط',
      'تاريخ الاستلام': '2026-07-01',
      'الملاحظة السابقة': 'الخط يحتاج إلى تحسين التناسق على السطر والاعتناء بالتشكيل',
      'التقدير التراكمي': 'ب+'
    }
  },
  {
    row: 4,
    studentId: '1003',
    studentName: 'سارة بنت فيصل العتيبي',
    lessonNumber: 'تسميع سورة الرحمن (1 - 20)',
    submissionCount: 1,
    mediaType: 'audio',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isSaved: true,
    notes: 'قراءة رائعة جداً وصوت ندي ما شاء الله! مخارج الحروف ممتازة والتزام تام بالأحكام.',
    audioGrade: '100/100',
    saveDate: '2026-07-01 14:35:10',
    extraData: {
      'حلقة الحفظ': 'حلقة أمهات المؤمنين',
      'اسم المعلم': 'أ. فاطمة الحربي',
      'مستوى الطالب': 'ممتاز',
      'تاريخ الاستلام': '2026-07-01',
      'الملاحظة السابقة': 'متميزة دائماً تبارك الرحمن',
      'التقدير التراكمي': 'أ+'
    }
  },
  {
    row: 5,
    studentId: '1004',
    studentName: 'يوسف بن المطيري الخالدي',
    lessonNumber: 'تمرين خط الرقعة (الدرس الثالث)',
    submissionCount: 3,
    mediaType: 'image',
    mediaUrl: generateHandwrittenSVG('خط الرقعة - الطالب يوسف المطيري', [
      'الخط العربي هو هندسة روحية صاغتها أنامل بشرية',
      'جمال الخط في حسن تناسق الحروف وتوازن المد والرفع',
      'ن والقلم وما يسطرون',
      'تعلموا حسن الخط فإنه من مفاتيح الرزق الوفير'
    ]),
    isSaved: false,
    extraData: {
      'حلقة الحفظ': 'دورة الخط والقرآن',
      'اسم المعلم': 'أ. محمد الخطاط',
      'مستوى الطالب': 'مبتدئ',
      'تاريخ الاستلام': '2026-06-30',
      'الملاحظة السابقة': 'يرجى التركيز على عدم نزول حرف الميم والسين عن السطر في الرقعة',
      'التقدير التراكمي': 'ج+'
    }
  },
  {
    row: 6,
    studentId: '1005',
    studentName: 'ريم بنت مساعد الدوسري',
    lessonNumber: 'تسميع سورة يس (1 - 12)',
    submissionCount: 1,
    mediaType: 'audio',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    isSaved: false,
    extraData: {
      'حلقة الحفظ': 'حلقة عائشة رضي الله عنها',
      'اسم المعلم': 'أ. نورة القحطاني',
      'مستوى الطالب': 'متوسط مرتفع',
      'تاريخ الاستلام': '2026-07-01',
      'الملاحظة السابقة': 'التأكيد على مد المنفصل حركتين أو أربع حركات بالتناسق',
      'التقدير التراكمي': 'أ-'
    }
  }
];

const mockPredefinedTexts: PredefinedText[] = [
  { title: 'تشجيع متميز جداً', phrase: 'أداء متميز وتلاوة خاشعة تبارك الرحمن! بارك الله فيك ونفع بك الإسلام والمسلمين يا بني.' },
  { title: 'تشجيع للخطوط والصور', phrase: 'خط جميل ومرتب والتزام رائع بالكتابة على السطر. استمر في هذا العطاء والتميز!' },
  { title: 'ملاحظة الغنة والإخفاء', phrase: 'قراءتك ممتازة، لكن انتبه لزمن الغنة في حكم الإخفاء والادغام، أعطها حركتين كاملتين.' },
  { title: 'ملاحظة مخارج الحروف', phrase: 'يرجى الانتباه لمخارج الحروف اللثوية (الذال، الثاء، الظاء)، أخرج طرف لسانك قليلاً.' },
  { title: 'خطأ إملائي يحتاج تعديل', phrase: 'هناك خطأ إملائي بسيط قمت بالإشارة إليه باللون الأحمر على السبورة، يرجى إعادة كتابة الكلمة وتصحيحها.' },
  { title: 'إعادة تلاوة واجبة', phrase: 'توجد أخطاء في تشكيل بعض الكلمات مما يغير المعنى. يرجى الاستماع للتصحيح وإعادة تسجيل التلاوة.' }
];

const mockWatermarkSettings: WatermarkSettings = {
  logoUrl: '',
  opacity: 0.45,
  sizeFactor: 0.8,
  logoPosition: 'top-left',
  textPrefix: 'مدرسة القرآن الكريم الرقمية - تصحيح المعلم',
  fontSize: 22,
  textPosition: 'bottom-left'
};

const mockStickers = [
  { id: 'st1', name: 'ممتاز', text: '🌟 ممتاز جداً 🌟' },
  { id: 'st2', name: 'رائع', text: '👏 بطل رائع 👏' },
  { id: 'st3', name: 'أحسنت', text: '👍 أحسنت التلاوة 👍' },
  { id: 'st4', name: 'مكتمل', text: '✅ تم التصحيح ✅' },
  { id: 'st5', name: 'راجع مجدداً', text: '📝 يحتاج مراجعة 📝' }
];

// Load settings from LocalStorage
export const getSheetsConfig = (): { webAppUrl: string; spreadsheetId: string } => {
  const webAppUrl = localStorage.getItem('SHEETS_WEBAPP_URL') || '';
  const spreadsheetId = localStorage.getItem('SPREADSHEET_ID') || '';
  return { webAppUrl, spreadsheetId };
};

export const saveSheetsConfig = (webAppUrl: string, spreadsheetId: string) => {
  localStorage.setItem('SHEETS_WEBAPP_URL', webAppUrl.trim());
  localStorage.setItem('SPREADSHEET_ID', spreadsheetId.trim());
};

// Test Google Sheets Connection using unified fetch helper (with fallback for Vercel/production)
export const testSheetsConnection = async (webAppUrl: string, spreadsheetId: string): Promise<boolean> => {
  // Save first, because fetchFromSheetsApi reads from local storage configuration
  saveSheetsConfig(webAppUrl, spreadsheetId);
  const result = await fetchFromSheetsApi('getTableData');
  if (result && result.success) {
    return true;
  }
  throw new Error(result?.error || 'السكربت لم يرجع استجابة ناجحة');
};

// Check if live integration is enabled
export const isLiveMode = (): boolean => {
  const { webAppUrl } = getSheetsConfig();
  return webAppUrl.length > 0;
};

// Helper to wrap Google Drive URLs or pure IDs inside a CORS/Tainted Canvas proxy
export const getProxyUrl = (urlOrId: string): string => {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Extract file ID if it is a Google Drive URL or pure ID
  let fileId = '';
  if (/^[a-zA-Z0-9-_]{25,50}$/.test(trimmed)) {
    fileId = trimmed;
  } else if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const match = trimmed.match(/(?:id=|\/d\/|folders\/)([a-zA-Z0-9-_]{25,})[/\?]?/);
    if (match && match[1]) {
      fileId = match[1];
    }
  }

  // If it's not a Google Drive link, return it directly
  if (!fileId && !trimmed.includes('drive.google.com') && !trimmed.includes('docs.google.com')) {
    return trimmed;
  }

  // Google's direct static usercontent endpoint which has built-in CORS support and bypasses virus/cookie barriers!
  const directDriveUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : trimmed;

  // Check if we are running in development or AI Studio preview container (where backend proxy is active)
  const isLocalOrDev = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('127.0.0.1') || 
                       window.location.hostname.includes('ais-dev-') || 
                       window.location.hostname.includes('asia-southeast1.run.app');

  if (isLocalOrDev) {
    if (fileId) {
      return `/api/drive-proxy?id=${fileId}`;
    }
    return `/api/drive-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  // For static production deployments (like Vercel or GitHub Pages) where there is no Express backend:
  // We use Google's own public global image proxy to securely bypass CORS issues on the board canvas
  return `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(directDriveUrl)}`;
};

// Unified fetch helper that handles local Express proxy AND direct client-side Vercel/production fallback
const fetchFromSheetsApi = async (action: string, dataPayload: any = {}): Promise<any> => {
  const { webAppUrl, spreadsheetId } = getSheetsConfig();
  if (!webAppUrl) {
    throw new Error('لم يتم تكوين رابط السكربت. يرجى إدخال الرابط أولاً في الإعدادات.');
  }

  const requestBody = {
    action,
    spreadsheetId,
    ...dataPayload
  };

  // Attempt 1: Call via Express backend proxy (great for preview containers/CORS)
  try {
    const response = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webAppUrl,
        method: 'POST',
        data: requestBody
      })
    });

    if (response.ok) {
      const text = await response.text();
      // Check if the response is actually an HTML error page (like Vercel 404 or index fallback)
      if (text.trim().startsWith('<') || text.trim().startsWith('The page')) {
        console.warn(`Sheets proxy returned HTML instead of JSON. Falling back to direct browser fetch for action: ${action}`);
      } else {
        try {
          const json = JSON.parse(text);
          return json;
        } catch {
          console.warn(`Sheets proxy returned invalid JSON. Falling back to direct browser fetch for action: ${action}`);
        }
      }
    } else {
      console.warn(`Proxy responded with status ${response.status}. Falling back to direct browser fetch...`);
    }
  } catch (proxyError) {
    console.warn(`Failed to connect to backend sheets proxy:`, proxyError);
  }

  // Attempt 2: Fallback to direct client-to-GoogleAppsScript POST.
  // We use 'text/plain;charset=utf-8' as Content-Type to avoid CORS preflight (OPTIONS) triggers.
  // Google Apps Script accepts doPost with text/plain, read via e.postData.contents.
  try {
    const directResponse = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!directResponse.ok) {
      throw new Error(`تعذر الاتصال المباشر بالسكربت، رمز الاستجابة: ${directResponse.status}`);
    }

    const text = await directResponse.text();
    if (text.trim().startsWith('<')) {
      throw new Error('أعاد السكربت صفحة HTML بدلاً من JSON. تأكد من نشر السكربت كـ Web App مع إتاحة الوصول للجميع (Anyone).');
    }
    
    return JSON.parse(text);
  } catch (directError: any) {
    console.error(`Direct fetch to Apps Script failed for action ${action}:`, directError);
    throw new Error(`فشل الاتصال بـ Google Apps Script: ${directError.message || directError}`);
  }
};

// Main fetch function that routes to Server Proxy or local mock
export const fetchStudentLessons = async (): Promise<StudentLesson[]> => {
  const { webAppUrl } = getSheetsConfig();

  if (!webAppUrl) {
    // Return Mock Data from localStorage if it has modifications, else default mock
    const localSaved = localStorage.getItem('MOCK_STUDENT_DATA');
    if (localSaved) {
      return JSON.parse(localSaved);
    }
    localStorage.setItem('MOCK_STUDENT_DATA', JSON.stringify(mockStudentLessons));
    return mockStudentLessons;
  }

  try {
    const result = await fetchFromSheetsApi('getTableData');
    if (result.success && Array.isArray(result.data)) {
      // Convert GAS array objects to StudentLesson type
      return result.data.map((item: any) => ({
        row: item.row,
        studentId: item.studentId || '',
        studentName: item.studentName || '',
        lessonNumber: item.lessonNumber || '',
        submissionCount: item.imageSubmissionCount || item.audioSubmissionCount || 1,
        mediaType: item.imageFileId ? 'image' : 'audio',
        mediaUrl: getProxyUrl(item.imageFileId || item.audioFileId || ''),
        isSaved: item.isSaved || false,
        notes: item.notes || '',
        imageGrade: item.imageGrade || '',
        audioGrade: item.audioGrade || '',
        modifiedImage: getProxyUrl(item.modifiedImage || ''),
        additionalImage: getProxyUrl(item.additionalImage || ''),
        video: getProxyUrl(item.video || ''),
        audio: getProxyUrl(item.audio || ''),
        saveDate: item.saveDate || '',
        extraData: {
          'T': item.additionalT || '',
          'U': item.additionalU || '',
          'V': item.additionalV || '',
          'W': item.additionalW || '',
          'X': item.additionalX || '',
          'Y': item.additionalY || '',
        }
      }));
    }
    throw new Error(result.error || 'فشلت عملية جلب البيانات من السكربت');
  } catch (err: any) {
    console.error('Error in fetchStudentLessons:', err);
    throw err;
  }
};

export const fetchPredefinedTexts = async (): Promise<PredefinedText[]> => {
  const { webAppUrl } = getSheetsConfig();
  if (!webAppUrl) return mockPredefinedTexts;

  try {
    const result = await fetchFromSheetsApi('getPredefinedTexts');
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return mockPredefinedTexts;
  } catch {
    return mockPredefinedTexts;
  }
};

export const fetchWatermarkSettings = async (): Promise<WatermarkSettings> => {
  const { webAppUrl } = getSheetsConfig();
  if (!webAppUrl) return mockWatermarkSettings;

  try {
    const result = await fetchFromSheetsApi('getWatermarkSettings');
    if (result.success && result.data) {
      return {
        logoUrl: result.data.logoUrl || '',
        opacity: Number(result.data.opacity) || 0.5,
        sizeFactor: Number(result.data.sizeFactor) || 1,
        logoPosition: result.data.logoPosition || 'bottom-right',
        textPrefix: result.data.textPrefix || '',
        fontSize: Number(result.data.fontSize) || 20,
        textPosition: result.data.textPosition || 'bottom-left'
      };
    }
    return mockWatermarkSettings;
  } catch {
    return mockWatermarkSettings;
  }
};

export const fetchStickers = async (): Promise<typeof mockStickers> => {
  return mockStickers;
};

// Save corrections back
export const saveLessonCorrection = async (payload: {
  row: number;
  notes: string;
  imageGrade?: string;
  audioGrade?: string;
  modifiedImage?: string; // Corrected board data URL (compressed JPG base64)
  additionalImage?: string; // Additional uploads base64
  video?: string;
  audio?: string; // Corrective voice note recorded by teacher
}): Promise<{ success: boolean; urls?: any }> => {
  const { webAppUrl } = getSheetsConfig();

  if (!webAppUrl) {
    // Mock Mode Save: Update local database inside localStorage
    const localData = await fetchStudentLessons();
    const updated = localData.map(item => {
      if (item.row === payload.row) {
        return {
          ...item,
          isSaved: true,
          notes: payload.notes,
          imageGrade: payload.imageGrade || item.imageGrade,
          audioGrade: payload.audioGrade || item.audioGrade,
          modifiedImage: payload.modifiedImage,
          additionalImage: payload.additionalImage,
          video: payload.video,
          audio: payload.audio,
          saveDate: new Date().toLocaleString('ar-SA')
        };
      }
      return item;
    });
    localStorage.setItem('MOCK_STUDENT_DATA', JSON.stringify(updated));
    return { success: true };
  }

  try {
    // Generate filenames matching the student context
    const cleanDate = new Date().toISOString().replace(/[:.]/g, '-');
    const canvasFilename = `صورة_مصححة_صف_${payload.row}_تاريخ_${cleanDate}.jpg`;
    const imageFilename = `صورة_إضافية_صف_${payload.row}_تاريخ_${cleanDate}.jpg`;
    const videoFilename = `فيديو_مصحح_صف_${payload.row}_تاريخ_${cleanDate}.mp4`;
    const audioFilename = `صوت_مصحح_صف_${payload.row}_تاريخ_${cleanDate}.mp3`;

    const result = await fetchFromSheetsApi('saveAllMedia', {
      params: [
        payload.modifiedImage || '', // canvasBase64
        canvasFilename,
        payload.additionalImage || '', // imageBase64
        imageFilename,
        payload.video || '', // videoBase64
        videoFilename,
        payload.audio || '', // audioBase64
        audioFilename,
        payload.row,
        payload.notes,
        payload.imageGrade || '',
        payload.audioGrade || ''
      ]
    });

    if (result.success) {
      return { success: true, urls: result.data };
    }
    throw new Error(result.error || 'فشل حفظ التصحيح في السكربت');
  } catch (err: any) {
    console.error('Error saving correction:', err);
    throw err;
  }
};
