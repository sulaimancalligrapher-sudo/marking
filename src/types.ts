export interface StudentSubmission {
  studentId: string;
  studentName: string;
  lessonNumber: string;
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

export interface ProfileInfo {
  logoUrl: string;
  title: string;
  subtitle: string;
}

export interface ContactInfo {
  facebook: string;
  instagram: string;
  youtube: string;
  line: string;
}

export interface SavedCorrection {
  notes: string;
  imageGrade: string;
  audioGrade: string;
  modifiedImage?: string; // base64
  additionalImage?: string; // base64
  video?: string; // base64
  audio?: string; // base64
}

export interface AppUser {
  username: string;
  status: string;
}
