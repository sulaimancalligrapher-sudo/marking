import { StudentRow, PredefinedText, User } from './types';

export const initialMockStudents: StudentRow[] = [
  {
    studentId: "ST-881",
    studentName: "عبدالرحمن الشمري",
    lessonNumber: 12,
    imageSubmissionCount: 3,
    imageFileId: "mock-image-1",
    imageMimeType: "image/jpeg",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "ديواني جلي",
    additionalU: "الواجب الأول",
    additionalV: "مبتدئ",
    additionalW: "كتابة البسملة",
    additionalX: "سليم",
    additionalY: "أونلاين",
    row: 2,
    isSaved: false
  },
  {
    studentId: "ST-345",
    studentName: "سليمان التايلاندي",
    lessonNumber: 15,
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 2,
    audioFileId: "mock-audio-1",
    audioMimeType: "audio/mpeg",
    additionalT: "تلاوة وتجويد",
    additionalU: "مخارج الحروف",
    additionalV: "متقدم",
    additionalW: "سورة الفاتحة",
    additionalX: "سليم",
    additionalY: "مسائي",
    row: 3,
    isSaved: false
  },
  {
    studentId: "ST-902",
    studentName: "عائشة نور الدين",
    lessonNumber: 9,
    imageSubmissionCount: 1,
    imageFileId: "mock-image-2",
    imageMimeType: "image/png",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "خط النسخ الكلاسيكي",
    additionalU: "الحروف المفردة",
    additionalV: "مبتدئ",
    additionalW: "حرف الصاد والضاد",
    additionalX: "يحتاج تعديل",
    additionalY: "صباحي",
    row: 4,
    isSaved: false
  },
  {
    studentId: "ST-112",
    studentName: "خالد بن الوليد",
    lessonNumber: 4,
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 5,
    audioFileId: "mock-audio-2",
    audioMimeType: "audio/mpeg",
    additionalT: "حفظ المتون",
    additionalU: "متن الجزرية",
    additionalV: "متقدم",
    additionalW: "باب مخارج الحروف",
    additionalX: "ممتاز",
    additionalY: "أونلاين",
    row: 5,
    isSaved: true // Already corrected
  },
  {
    studentId: "ST-604",
    studentName: "فاطمة الزهراء",
    lessonNumber: 21,
    imageSubmissionCount: 2,
    imageFileId: "mock-image-3",
    imageMimeType: "image/jpeg",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "خط الرقعة الحديث",
    additionalU: "الكلمات المركبة",
    additionalV: "متوسط",
    additionalW: "حكمة اليوم",
    additionalX: "ممتاز",
    additionalY: "حضوري",
    row: 6,
    isSaved: false
  }
];

export const initialMockTexts: PredefinedText[] = [
  { title: "أحسنت خطك رائع جداً", phrase: "أحسنت يا بني، كتابة ممتازة وخط رائع متقن وموزون على السطر.\nبارك الله في أناملك وواصل إبداعك!" },
  { title: "انتبه لزوايا الحرف والميل", phrase: "جميل جداً، ولكن يرجى الانتباه لزوايا هذا الحرف ومقدار ميلانه وقاعدة نقطته.\nأعد المحاولة وركز أكثر." },
  { title: "حاول مجدداً مع تخفيف يدك", phrase: "المحاولة ممتازة، ولكن خفف ضغط القلم عند النزول لتعطي نحافة مناسبة للحرف.\nحاول مجدداً." },
  { title: "ممتاز بارك الله فيك", phrase: "ممتاز جداً! قواعد الخط مضبوطة والحبر سليم.\nاستمر بالتقدم للدرس القادم." },
  { title: "يرجى الالتزام بمحاذاة السطر", phrase: "ملاحظة: تأكد من ملامسة كعب الحرف لسطر الكتابة، ولا ترفع يدك كثيراً.\nبالتوفيق." }
];

export const initialMockUsers: User[] = [
  { username: "سليمان المصحح", status: "نعم" },
  { username: "أحمد المساعد", status: "نعم" },
  { username: "زائر مؤقت", status: "نعم" },
  { username: "حساب معطل", status: "لا" }
];

// Base64 Calligraphy Mock Background Images
export const mockImages = {
  diwaniSample: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23faf7f2'/><line x1='100' y1='300' x2='700' y2='300' stroke='%23e2dcd0' stroke-width='2' stroke-dasharray='10,10'/><text x='400' y='280' font-family='Amiri, serif' font-size='64' fill='%23222' text-anchor='middle'>بسم الله الرحمن الرحيم</text><text x='400' y='360' font-family='Amiri, serif' font-size='24' fill='%23666' text-anchor='middle'>[تدريب خط ديواني جلي مفرغ لغرض التصحيح]</text></svg>",
  naskhSample: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23f5ede0'/><line x1='50' y1='250' x2='750' y2='250' stroke='%23c8bfae' stroke-width='1'/><line x1='50' y1='350' x2='750' y2='350' stroke='%23c8bfae' stroke-width='1'/><text x='400' y='230' font-family='Amiri, serif' font-size='56' fill='%23111' text-anchor='middle'>العلم نور والجهل ظلام</text><text x='400' y='330' font-family='Amiri, serif' font-size='22' fill='%23555' text-anchor='middle'>[تدريب خط النسخ الكلاسيكي - الطالب يحتاج ضبط النون الصاعدة]</text></svg>",
  ruqahSample: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23f9f8f6'/><line x1='100' y1='320' x2='700' y2='320' stroke='%23dacdbb' stroke-width='2'/><text x='400' y='290' font-family='Amiri, serif' font-size='60' fill='%232b2b2b' text-anchor='middle'>كن جميلا ترى الوجود جميلا</text></svg>"
};

// Beautiful Sound Mock URLs
export const mockAudios = {
  surahSample: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  makharijSample: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
};
