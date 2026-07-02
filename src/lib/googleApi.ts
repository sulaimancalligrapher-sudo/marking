import { StudentLesson, PredefinedText, WatermarkSettings, ProfileInfo, ContactInfo } from '../types';

// Extract Google Drive File ID from a URL
export function extractFileId(url: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.split('?')[0];
  const regex = /\/(?:d|folders|file\/d)\/([a-zA-Z0-9_-]+)/;
  const match = cleanUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  // Try fallback for direct IDs
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return url;
  }
  return null;
}

// Fetch spreadsheet values in batch
export async function fetchSpreadsheetData(spreadsheetId: string, token: string) {
  const ranges = [
    'A1!A2:Y',            // 0: Student lessons
    'A1!T1:Y1',          // 1: Additional columns headers
    'Profile!A2:C',      // 2: Profile info
    'Contact!A2:E',      // 3: Contacts info
    'Settings!B2:B',     // 4: Folder URL
    'Settings!B3:B100',  // 5: Stickers URLs
    'Settings!D2:E100',  // 6: Predefined texts
    'Settings!G2:G8',    // 7: Watermark settings
    'Settings!Z2:AB100', // 8: Users table
    'Settings!AC2:AC2',  // 9: Allowed Devices
  ];

  const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`فشل تحميل بيانات ورقة قوقل: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];

  // Parse Student Lessons (Range 0)
  const lessonsData: any[] = valueRanges[0]?.values || [];
  const displayLessonsData: any[] = lessonsData; // Standard values since we read text

  // Parse Headers (Range 1)
  const additionalHeaders: string[] = valueRanges[1]?.values?.[0] || [];

  // Parse Profile (Range 2)
  const profileRows = valueRanges[2]?.values || [];
  const profile: ProfileInfo = {
    logoUrl: profileRows[0]?.[2] || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071',
    name: profileRows[0]?.[1] || 'لوحة تصحيح الدروس',
    description: profileRows[1]?.[1] || 'منصة تصحيح الواجبات التفاعلية',
  };

  // Parse Contact (Range 3)
  const contactRows = valueRanges[3]?.values || [];
  const contact: ContactInfo = {
    facebook: contactRows[0]?.[0] || '',
    instagram: contactRows[0]?.[1] || '',
    youtube: contactRows[0]?.[2] || '',
    line: contactRows[0]?.[3] || '',
  };

  // Parse Folder (Range 4)
  const folderUrl = valueRanges[4]?.values?.[0]?.[0] || '';
  const folderId = extractFileId(folderUrl);

  // Parse Stickers (Range 5)
  const stickerUrls = valueRanges[5]?.values || [];
  const stickers: string[] = [];
  stickerUrls.forEach((row: any) => {
    if (row[0]) {
      const fid = extractFileId(row[0]);
      if (fid) stickers.push(fid);
    }
  });

  // Parse Predefined Texts (Range 6)
  const textRows = valueRanges[6]?.values || [];
  const predefinedTexts: PredefinedText[] = [];
  textRows.forEach((row: any) => {
    const phrase = row[0]?.toString().trim() || '';
    const title = row[1]?.toString().trim() || '';
    if (phrase && title) {
      predefinedTexts.push({ title, phrase });
    }
  });

  // Parse Watermark Settings (Range 7)
  const watermarkRows = valueRanges[7]?.values || [];
  const watermarkSettings: WatermarkSettings = {
    logoUrl: watermarkRows[0]?.[0] || '',
    opacity: watermarkRows[1]?.[0] ? parseFloat(watermarkRows[1]?.[0]) : 1,
    sizeFactor: watermarkRows[2]?.[0] ? parseFloat(watermarkRows[2]?.[0]) : 1,
    logoPosition: (watermarkRows[3]?.[0] || 'bottom-right') as any,
    textPrefix: watermarkRows[4]?.[0] || '',
    fontSize: watermarkRows[5]?.[0] ? parseInt(watermarkRows[5]?.[0]) : 20,
    textPosition: (watermarkRows[6]?.[0] || 'bottom-left') as any,
  };

  // Parse Users (Range 8)
  const userRows = valueRanges[8]?.values || [];
  const sheetUsers = userRows.map((row: any) => ({
    username: row[0]?.toString().trim() || '',
    password: row[1]?.toString().trim() || '',
    status: (row[2]?.toString().trim() || 'نعم') as 'نعم' | 'لا',
    allowedDevices: 1, // Will check AC
  })).filter(u => u.username !== '');

  // Parse Allowed Devices (Range 9)
  const allowedDevices = parseInt(valueRanges[9]?.values?.[0]?.[0]) || 1;

  // Process student lessons
  const studentLessons: StudentLesson[] = lessonsData.map((row: any, i: number) => {
    const imageUrl = row[4] || '';
    const audioUrl = row[6] || '';
    
    return {
      studentId: row[0] || '',
      studentName: row[1] || '',
      lessonNumber: row[2] || '',
      imageSubmissionCount: parseInt(row[3]) || 0,
      imageFileId: extractFileId(imageUrl),
      imageMimeType: imageUrl ? 'image/jpeg' : null, // Default, can verify later
      audioSubmissionCount: parseInt(row[5]) || 0,
      audioFileId: extractFileId(audioUrl),
      audioMimeType: audioUrl ? 'audio/mpeg' : null,
      additionalT: row[19] || '', // T (Col index 19)
      additionalU: row[20] || '', // U
      additionalV: row[21] || '', // V
      additionalW: row[22] || '', // W
      additionalX: row[23] || '', // X
      additionalY: row[24] || '', // Y
      row: i + 2,                  // Rows start from index 2 (row 1 is header)
      isSaved: row[7] === 'تم',     // Col H (Col index 7)
      notes: row[8] || '',         // I (Col index 8)
      imageGrade: row[9] || '',    // J
      modifiedImageUrl: row[10] || '', // K
      audioGrade: row[11] || '',   // L
      additionalImageUrl: row[12] || '', // M
      videoUrl: row[13] || '',     // N
      audioUrl: row[14] || '',     // O
      date: row[15] || '',         // P
      correctionCounter: parseInt(row[16]) || 0 // Q
    };
  });

  return {
    studentLessons,
    additionalHeaders,
    profile,
    contact,
    folderId,
    stickers,
    predefinedTexts,
    watermarkSettings,
    sheetUsers,
    allowedDevices,
  };
}

// Fetch Google Drive File Content as an Object URL
export async function fetchDriveFileAsUrl(fileId: string, token: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`فشل تحميل الملف من قوقل درايف: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Upload file directly to a Google Drive folder as Base64/Blob
export async function uploadFileToDrive(
  token: string,
  folderId: string,
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<string> {
  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Strip possible base64 headers
  const content = base64Data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    content +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`فشل رفع الملف إلى قوقل درايف: ${response.status} - ${errorText}`);
  }

  const fileInfo = await response.json();
  const fileId = fileInfo.id;

  // Make the file readable by anyone
  try {
    await makeFilePublic(fileId, token);
  } catch (err) {
    console.warn('Could not make file public, continuing...', err);
  }

  return `https://drive.google.com/file/d/${fileId}/view`;
}

// Make a Drive File accessible by anyone (read-only)
export async function makeFilePublic(fileId: string, token: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });
}

// Save correction data back to Google Sheets
export async function saveCorrectionToSheet(
  spreadsheetId: string,
  token: string,
  lesson: StudentLesson,
  updateData: {
    notes: string;
    imageGrade: string;
    audioGrade: string;
    modifiedUrl: string | null;
    additionalImageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    isNewCorrection: boolean;
  }
) {
  const row = lesson.row;
  const date = new Date();
  const formattedDate = date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0') + ' ' + 
    String(date.getHours()).padStart(2, '0') + ':' + 
    String(date.getMinutes()).padStart(2, '0') + ':' + 
    String(date.getSeconds()).padStart(2, '0');

  // Increment correction counter Q if it's a new correction or not completed
  let newCounter = lesson.correctionCounter;
  if (updateData.isNewCorrection && !lesson.isSaved) {
    newCounter = (lesson.correctionCounter || 0) + 1;
  }

  // Row columns are mapped as:
  // Col H (index 7): Status ('تم')
  // Col I (index 8): Notes
  // Col J (index 9): Image Grade
  // Col K (index 10): Modified Image URL
  // Col L (index 11): Audio Grade
  // Col M (index 12): Additional Image URL
  // Col N (index 13): Video URL
  // Col O (index 14): Audio URL
  // Col P (index 15): Date
  // Col Q (index 16): Correction Counter

  // We write range H{row}:Q{row}
  const range = `A1!H${row}:Q${row}`;
  const values = [[
    'تم',                                     // H
    updateData.notes || '',                  // I
    updateData.imageGrade || '',             // J
    updateData.modifiedUrl || lesson.modifiedImageUrl || '', // K
    updateData.audioGrade || '',             // L
    updateData.additionalImageUrl || lesson.additionalImageUrl || '', // M
    updateData.videoUrl || lesson.videoUrl || '',     // N
    updateData.audioUrl || updateData.audioUrl || lesson.audioUrl || '',     // O
    formattedDate,                           // P
    newCounter,                              // Q
  ]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`فشل تحديث درجات الطالب في ورقة قوقل: ${response.status} - ${err}`);
  }

  // Also write to CorrectionHistory
  try {
    await appendToHistory(spreadsheetId, token, lesson, updateData, formattedDate, newCounter);
  } catch (err) {
    console.error('فشل إلحاق السجل التاريخي للتصحيح:', err);
  }
}

// Append rows to CorrectionHistory sheet
async function appendToHistory(
  spreadsheetId: string,
  token: string,
  lesson: StudentLesson,
  updateData: any,
  formattedDate: string,
  newCounter: number
) {
  // We need to fetch Row A to Q first to match GAS code (which copies row values from A to Q)
  const rangeFetch = `A1!A${lesson.row}:Q${lesson.row}`;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeFetch)}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let rowValues = [[]];
  if (getResponse.ok) {
    const res = await getResponse.json();
    if (res.values && res.values[0]) {
      rowValues = res.values;
    }
  }

  if (rowValues[0].length === 0) {
    // Fallback if fetch failed
    rowValues = [[
      lesson.studentId,
      lesson.studentName,
      lesson.lessonNumber,
      lesson.imageSubmissionCount,
      lesson.imageFileId ? `https://drive.google.com/file/d/${lesson.imageFileId}/view` : '',
      lesson.audioSubmissionCount,
      lesson.audioFileId ? `https://drive.google.com/file/d/${lesson.audioFileId}/view` : '',
      'تم',
      updateData.notes,
      updateData.imageGrade,
      updateData.modifiedUrl || '',
      updateData.audioGrade,
      updateData.additionalImageUrl || '',
      updateData.videoUrl || '',
      updateData.audioUrl || '',
      formattedDate,
      newCounter
    ]];
  } else {
    // Update the values that were just saved (index 7 is H)
    rowValues[0][7] = 'تم';
    rowValues[0][8] = updateData.notes;
    rowValues[0][9] = updateData.imageGrade;
    rowValues[0][10] = updateData.modifiedUrl || rowValues[0][10] || '';
    rowValues[0][11] = updateData.audioGrade;
    rowValues[0][12] = updateData.additionalImageUrl || rowValues[0][12] || '';
    rowValues[0][13] = updateData.videoUrl || rowValues[0][13] || '';
    rowValues[0][14] = updateData.audioUrl || rowValues[0][14] || '';
    rowValues[0][15] = formattedDate;
    rowValues[0][16] = newCounter;
  }

  // Add the date as Column R (18th column)
  rowValues[0].push(formattedDate);

  // Append to CorrectionHistory
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CorrectionHistory!A1:R:append?valueInputOption=USER_ENTERED`;
  await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rowValues }),
  });
}
