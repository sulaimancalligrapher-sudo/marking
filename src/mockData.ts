import { LessonItem, ProfileData, ContactData, PredefinedText, StickerItem, UserAuth, WatermarkSettings } from './types';

export const INITIAL_PROFILE: ProfileData = {
  logoUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=200', // Beautiful calligraphy artsy background
  title: 'أكاديمية الخط العربي والزخرفة الإسلامية',
  subtitle: 'النظام السحابي الاحترافي لتصحيح الدروس ومتابعة أداء الطلاب',
};

export const INITIAL_CONTACT: ContactData = {
  facebook: 'https://facebook.com/calligraphy',
  instagram: 'https://instagram.com/calligraphy',
  youtube: 'https://youtube.com/calligraphy',
  line: 'https://line.me/R/ti/p/calligraphy',
};

export const INITIAL_PREDEFINED_TEXTS: PredefinedText[] = [
  { title: 'ثناء وتشجيع عام', phrase: 'ما شاء الله تبارك الرحمن! كتابة متميزة وخط أنيق جداً. استمر في هذا الإتقان بارك الله فيك.' },
  { title: 'ميل حرف الألف', phrase: 'انتبه لزاوية ميل حرف الألف واللام؛ يجب أن تكون متوازية ومائلة قليلاً إلى اليمين بنسبة بسيطة جداً.' },
  { title: 'ضبط السطر', phrase: 'يرجى الالتزام بالسطر الأساسي للكتابة. بعض الحروف نزلت عن السطر دون داعٍ، ركز على الحروف المستقرة والنازلة.' },
  { title: 'رأس حرف الواو والقاف', phrase: 'فتحة رأس الواو / القاف تحتاج إلى تدوير أدق لتظهر الفراغات الداخلية (البياض) بشكل صحيح ومستدير.' },
  { title: 'طول الكشيدة والمدات', phrase: 'امتداد الكشيدة (المد) طويل زيادة عن الحد المقبول في قواعد هذا الخط، حاول تقليصها إلى حد ٧-٩ نقاط فقط.' },
  { title: 'تعديل زاوية القلم', phrase: 'زاوية مسك القلم (قطة القلم) تحتاج لتعديل لتكون ٧٥ درجة للحصول على السمك والرفع النموذجي للحروف.' },
  { title: 'حجم الكأس (النون والسين)', phrase: 'حجم كأس النون / السين / الصاد عميق وضيق نوعاً ما، اجعله يتسع لثلاث نقاط بعمق نقطتين مائلتين.' }
];

export const INITIAL_STICKERS: StickerItem[] = [
  { fileId: 'sticker_excellent', url: 'https://images.unsplash.com/photo-1572945281861-172ce530974d?auto=format&fit=crop&q=80&w=150' }, // Star / Gold Badge
  { fileId: 'sticker_good_try', url: 'https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?auto=format&fit=crop&q=80&w=150' }, // Smiley / Stamp
  { fileId: 'sticker_calligraphy_seal', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=150' } // Traditional red seal
];

export const INITIAL_USERS: UserAuth[] = [
  { username: 'سليمان الخطاط', status: 'نعم' },
  { username: 'المصحح أحمد', status: 'نعم' },
  { username: 'مساعد الخطاط', status: 'نعم' },
  { username: 'مصحح تجريبي', status: 'نعم' },
  { username: 'مستخدم محظور', status: 'لا' }
];

export const INITIAL_WATERMARK: WatermarkSettings = {
  logoUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&q=80&w=100', // Decorative art
  opacity: 0.5,
  sizeFactor: 0.3,
  logoPosition: 'bottom-right',
  textPrefix: 'إجازة وتصحيح معتمد - الأستاذ سليمان',
  fontSize: 22,
  textPosition: 'bottom-left'
};

export const INITIAL_LESSONS: LessonItem[] = [
  {
    studentId: '1001',
    studentName: 'محمد عبد الرحمن الفارس',
    lessonNumber: 1,
    imageSubmissionCount: 2,
    imageUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&q=80&w=800', // Traditional Arabic writing / design reference
    imageFileId: 'drive_img_1001',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 0,
    audioUrl: '',
    audioFileId: null,
    audioMimeType: null,
    isSaved: false,
    notes: '',
    imageGrade: '',
    modifiedImageUrl: '',
    audioGrade: '',
    additionalImageUrl: '',
    additionalVideoUrl: '',
    additionalAudioUrl: '',
    correctionDate: '',
    correctionCount: 0,
    additionalT: 'مبتدئ ممتاز',
    additionalU: 'خط الرقعة',
    additionalV: 'الدرس الأول: الحروف المفردة',
    additionalW: 'فترة صباحية',
    additionalX: 'نشط',
    additionalY: 'تقييم أولي مميز',
    row: 2,
    mediaType: 'image'
  },
  {
    studentId: '1002',
    studentName: 'فاطمة أحمد باوزير',
    lessonNumber: 4,
    imageSubmissionCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800', // Manuscript style
    imageFileId: 'drive_img_1002',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 2,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Professional audio test
    audioFileId: 'drive_aud_1002',
    audioMimeType: 'audio/mpeg',
    isSaved: true,
    notes: 'قراءة رائعة جداً للحروف، ومخارج نطق ممتازة. انتبهي لزمن المدود الطبيعية ولا تفرطي فيها.',
    imageGrade: '9.5/10',
    modifiedImageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800',
    audioGrade: '10/10',
    additionalImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=300',
    additionalVideoUrl: '',
    additionalAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    correctionDate: '2026-07-02 14:30:22',
    correctionCount: 1,
    additionalT: 'متوسط',
    additionalU: 'خط النسخ',
    additionalV: 'الدرس الرابع: الحروف المتصلة',
    additionalW: 'فترة مسائية',
    additionalX: 'نشط',
    additionalY: 'تطور سريع بالصوت والكتابة',
    row: 3,
    mediaType: 'audio'
  },
  {
    studentId: '1003',
    studentName: 'عبد الله السعيد الحربي',
    lessonNumber: 2,
    imageSubmissionCount: 0,
    imageUrl: '',
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 3,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    audioFileId: 'drive_aud_1003',
    audioMimeType: 'audio/mpeg',
    isSaved: false,
    notes: '',
    imageGrade: '',
    modifiedImageUrl: '',
    audioGrade: '',
    additionalImageUrl: '',
    additionalVideoUrl: '',
    additionalAudioUrl: '',
    correctionDate: '',
    correctionCount: 0,
    additionalT: 'متقدم',
    additionalU: 'خط الثلث الجلي',
    additionalV: 'الدرس الثاني: اتصالات الباء',
    additionalW: 'فترة مسائية',
    additionalX: 'بحاجة لمتابعة',
    additionalY: 'نبرات مميزة لكن يحتاج هدوء بالنطق',
    row: 4,
    mediaType: 'audio'
  },
  {
    studentId: '1004',
    studentName: 'زينب يوسف التايلاندية',
    lessonNumber: 7,
    imageSubmissionCount: 3,
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800', // Artistic canvas
    imageFileId: 'drive_img_1004',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 1,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    audioFileId: 'drive_aud_1004',
    audioMimeType: 'audio/mpeg',
    isSaved: false,
    notes: '',
    imageGrade: '',
    modifiedImageUrl: '',
    audioGrade: '',
    additionalImageUrl: '',
    additionalVideoUrl: '',
    additionalAudioUrl: '',
    correctionDate: '',
    correctionCount: 0,
    additionalT: 'أجنبي مبتدئ',
    additionalU: 'خط الديواني',
    additionalV: 'الدرس السابع: جملة البسملة',
    additionalW: 'أونلاين دولي',
    additionalX: 'نشط جداً',
    additionalY: 'خط جميل جداً لغير الناطقين بالعربية',
    row: 5,
    mediaType: 'image'
  },
  {
    studentId: '1005',
    studentName: 'سارة بنت فيصل آل سعود',
    lessonNumber: 12,
    imageSubmissionCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=800',
    imageFileId: 'drive_img_1005',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 0,
    audioUrl: '',
    audioFileId: null,
    audioMimeType: null,
    isSaved: false,
    notes: '',
    imageGrade: '',
    modifiedImageUrl: '',
    audioGrade: '',
    additionalImageUrl: '',
    additionalVideoUrl: '',
    additionalAudioUrl: '',
    correctionDate: '',
    correctionCount: 0,
    additionalT: 'متقدم متميز',
    additionalU: 'خط الإجازة',
    additionalV: 'الدرس الثاني عشر: لوحة التخرج',
    additionalW: 'خاص متميز',
    additionalX: 'نشط',
    additionalY: 'لوحة فنية رائعة تحتاج لمسات بسيطة وتعديلات طفيفة',
    row: 6,
    mediaType: 'image'
  }
];
