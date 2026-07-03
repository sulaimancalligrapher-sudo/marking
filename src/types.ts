export interface LessonItem {
  studentId: string;
  studentName: string;
  lessonNumber: number;
  imageSubmissionCount: number;
  imageUrl?: string;
  imageFileId?: string | null;
  imageMimeType?: string | null;
  audioSubmissionCount: number;
  audioUrl?: string;
  audioFileId?: string | null;
  audioMimeType?: string | null;
  isSaved: boolean;
  notes: string;
  imageGrade: string;
  modifiedImageUrl: string;
  audioGrade: string;
  additionalImageUrl: string;
  additionalVideoUrl: string;
  additionalAudioUrl: string;
  correctionDate: string;
  correctionCount: number;
  additionalT: string;
  additionalU: string;
  additionalV: string;
  additionalW: string;
  additionalX: string;
  additionalY: string;
  row: number;
  mediaType: 'image' | 'audio';
}

export interface ProfileData {
  logoUrl: string;
  title: string;
  subtitle: string;
}

export interface ContactData {
  facebook: string;
  instagram: string;
  youtube: string;
  line: string;
}

export interface PredefinedText {
  title: string;
  phrase: string;
}

export interface StickerItem {
  fileId: string;
  url: string;
}

export interface UserAuth {
  username: string;
  status: string; // 'نعم' أو 'لا'
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

export interface AppConfig {
  webAppUrl: string;
  useLiveConnection: boolean;
}
