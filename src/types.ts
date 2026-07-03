export interface StudentRecord {
  studentId: string;
  studentName: string;
  lessonNumber: number | string;
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
  logoPosition: string;
  textPrefix: string;
  fontSize: number;
  textPosition: string;
}

export interface UserAccount {
  username: string;
  status: string;
}

export interface SavedCorrectionData {
  notes: string;
  imageGrade: string;
  modifiedImage: string;
  audioGrade: string;
  additionalImage: string;
  video: string;
  audio: string;
}
