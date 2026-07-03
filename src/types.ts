export interface StudentRow {
  studentId: string | number;
  studentName: string;
  lessonNumber: string | number;
  imageSubmissionCount: number;
  imageFileId: string | null;
  imageMimeType: string | null;
  audioSubmissionCount: number;
  audioFileId: string | null;
  audioMimeType: string | null;
  additionalT: string;
  additionalU: string;
  additionalV: string;
  additionalW: string;
  additionalX: string;
  additionalY: string;
  row: number;
  isSaved: boolean;
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

export interface User {
  username: string;
  status: string;
}

export interface AppSettings {
  googleAppsScriptUrl: string;
  watermark: WatermarkSettings;
  predefinedTexts: PredefinedText[];
  users: User[];
  profileName: string;
  profileSub: string;
  profileLogo: string;
}
