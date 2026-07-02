export interface StudentLesson {
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
  notes: string;
  imageGrade: string;
  audioGrade: string;
  modifiedImageUrl: string;
  additionalImageUrl: string;
  videoUrl: string;
  audioUrl: string;
  date: string;
  correctionCounter: number;
}

export interface PredefinedText {
  title: string;
  phrase: string;
}

export interface Sticker {
  fileId: string;
  name: string;
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
  name: string;
  description: string;
}

export interface ContactInfo {
  facebook: string;
  instagram: string;
  youtube: string;
  line: string;
}

export interface SheetUser {
  username: string;
  status: 'نعم' | 'لا';
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface DrawingPath {
  points: DrawingPoint[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

export interface PlacedSticker {
  x: number;
  y: number;
  base64: string;
  size: number;
}

export interface PlacedText {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  background: {
    enabled: boolean;
    color: string;
  };
}

export interface HistoryAction {
  type: 'path' | 'sticker' | 'text';
  data: any;
  index: number;
}
