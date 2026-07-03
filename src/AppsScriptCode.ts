export const APPS_SCRIPT_CODE = `/**
 * مصفوفة برمجية كاملة لمنصة تصحيح الدروس الذكية
 * انسخ هذا الكود بالكامل وضعه في Apps Script الخاص بالجدول الدراسي (Extensions -> Apps Script)
 * ثم انشر المشروع كتطبيق ويب (Deploy -> New Deployment -> Web App)
 * واجعل صلاحية الدخول: (Anyone)
 */

function doGet(e) {
  var action = e.parameter.action;
  var response;
  
  try {
    if (action === 'getInitialData') {
      response = getInitialData();
    } else if (action === 'getMediaAsBase64') {
      response = getMediaAsBase64(e.parameter.fileId);
    } else if (action === 'getSavedData') {
      response = getSavedData(Number(e.parameter.row));
    } else if (action === 'getUsers') {
      response = getUsers();
    } else {
      response = { success: false, error: 'أمر غير معروف' };
    }
  } catch (err) {
    response = { success: false, error: err.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response;
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'saveAllMedia') {
      response = saveAllMedia(
        postData.canvasBase64,
        postData.canvasFilename,
        postData.imageBase64,
        postData.imageFilename,
        postData.videoBase64,
        postData.videoFilename,
        postData.audioBase64,
        postData.audioFilename,
        Number(postData.row),
        postData.notes,
        postData.imageGrade,
        postData.audioGrade
      );
    } else if (action === 'loginUser') {
      response = loginUser(
        postData.username,
        postData.deviceId,
        postData.lat,
        postData.lng
      );
    } else {
      response = { success: false, error: 'أمر غير معروف' };
    }
  } catch (err) {
    response = { success: false, error: err.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// جلب جميع البيانات الأساسية دفعة واحدة لسرعة التحميل
function getInitialData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // شيت الملف الشخصي وروابط التواصل
  var profileSheet = ss.getSheetByName('Profile');
  var contactSheet = ss.getSheetByName('Contact');
  var profileData = profileSheet ? profileSheet.getDataRange().getValues() : [];
  var contactData = contactSheet ? contactSheet.getDataRange().getValues() : [];
  
  var profile = {
    logoUrl: (profileData[1] && profileData[1][2]) || '',
    title: (profileData[1] && profileData[1][1]) || 'منصة تصحيح الدروس',
    subtitle: (profileData[2] && profileData[2][1]) || 'مرحباً بك في لوحة التحكم'
  };
  
  var contact = {
    facebook: (contactData[1] && contactData[1][0]) || '',
    instagram: (contactData[1] && contactData[1][1]) || '',
    youtube: (contactData[1] && contactData[1][2]) || '',
    line: (contactData[1] && contactData[1][3]) || ''
  };
  
  // شيت البيانات الرئيسي A1
  var sheet = ss.getSheetByName('A1');
  if (!sheet) throw new Error('الورقة A1 غير موجودة!');
  
  var lastRow = sheet.getLastRow();
  var tableData = [];
  var headersRange = [];
  
  if (lastRow >= 1) {
    // قراءة البيانات من A2 إلى Y
    var range = sheet.getRange('A2:Y' + lastRow).getValues();
    var displayRange = sheet.getRange('T2:Y' + lastRow).getDisplayValues();
    headersRange = sheet.getRange('T1:Y1').getValues()[0];
    
    for (var i = 0; i < range.length; i++) {
      var imageUrl = range[i][4]; // E
      var audioUrl = range[i][6]; // G
      
      var imageFileId = imageUrl ? extractFileId(imageUrl) : null;
      var audioFileId = audioUrl ? extractFileId(audioUrl) : null;
      
      tableData.push({
        studentId: String(range[i][0] || ''),
        studentName: String(range[i][1] || ''),
        lessonNumber: String(range[i][2] || ''),
        imageSubmissionCount: Number(range[i][3] || 0),
        imageFileId: imageFileId,
        imageMimeType: imageUrl ? 'image/jpeg' : null, // افتراضي
        audioSubmissionCount: Number(range[i][5] || 0),
        audioFileId: audioFileId,
        audioMimeType: audioUrl ? 'audio/mpeg' : null, // افتراضي
        additionalT: String(displayRange[i][0] || ''),
        additionalU: String(displayRange[i][1] || ''),
        additionalV: String(displayRange[i][2] || ''),
        additionalW: String(displayRange[i][3] || ''),
        additionalX: String(displayRange[i][4] || ''),
        additionalY: String(displayRange[i][5] || ''),
        row: i + 2,
        isSaved: range[i][7] === 'تم'
      });
    }
  }
  
  // شيت الإعدادات والعبارات المحددة مسبقاً والستيكرات والوترمارك
  var settingsSheet = ss.getSheetByName('Settings');
  var predefinedTexts = [];
  var stickerUrls = [];
  var watermark = {
    logoUrl: '', opacity: 1, sizeFactor: 1, logoPosition: 'bottom-right',
    textPrefix: '', fontSize: 20, textPosition: 'bottom-left'
  };
  
  if (settingsSheet) {
    var settingsLastRow = settingsSheet.getLastRow();
    
    // العبارات المحددة مسبقاً من D2:E
    if (settingsLastRow >= 2) {
      var textRange = settingsSheet.getRange('D2:E' + settingsLastRow).getValues();
      for (var i = 0; i < textRange.length; i++) {
        var phrase = textRange[i][0] ? textRange[i][0].toString().trim() : '';
        var title = textRange[i][1] ? textRange[i][1].toString().trim() : '';
        if (phrase && title) {
          predefinedTexts.push({ title: title, phrase: phrase });
        }
      }
      
      // الستيكرات من B3:B
      var stickerRange = settingsSheet.getRange('B3:B' + settingsLastRow).getValues();
      for (var i = 0; i < stickerRange.length; i++) {
        if (stickerRange[i][0]) {
          try {
            stickerUrls.push(extractFileId(stickerRange[i][0]));
          } catch(e) {}
        }
      }
    }
    
    // إعدادات الوترمارك G2:G8
    var wmRange = settingsSheet.getRange('G2:G8').getValues();
    watermark = {
      logoUrl: wmRange[0] ? String(wmRange[0][0] || '').trim() : '',
      opacity: wmRange[1] ? parseFloat(wmRange[1][0] || '1') : 1,
      sizeFactor: wmRange[2] ? parseFloat(wmRange[2][0] || '1') : 1,
      logoPosition: wmRange[3] ? String(wmRange[3][0] || 'bottom-right').trim() : 'bottom-right',
      textPrefix: wmRange[4] ? String(wmRange[4][0] || '').trim() : '',
      fontSize: wmRange[5] ? parseInt(wmRange[5][0] || '20') : 20,
      textPosition: wmRange[6] ? String(wmRange[6][0] || 'bottom-left').trim() : 'bottom-left'
    };
  }
  
  return {
    success: true,
    profile: profile,
    contact: contact,
    tableData: tableData,
    additionalHeaders: headersRange ? headersRange.map(function(h) { return String(h || '').trim(); }) : [],
    predefinedTexts: predefinedTexts,
    stickerUrls: stickerUrls,
    watermark: watermark
  };
}

// استخراج المعرّف (fileId) من روابط جوجل درايف المتنوعة
function extractFileId(url) {
  if (!url) return '';
  var cleanUrl = url.split('?')[0];
  var regex = /\\/(?:d|folders|file\\/d)\\/([a-zA-Z0-9_-]+)/;
  var match = cleanUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  // في حال كان مدخل الرابط هو المعرف نفسه
  if (url.indexOf('/') === -1 && url.length > 15) {
    return url;
  }
  return url;
}

// قراءة ملف من درايف كـ Base64 لتجنب مشاكل الـ iFrame وعرض الصور الكبيرة بسلاسة
function getMediaAsBase64(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    return {
      success: true,
      contentType: contentType,
      base64: "data:" + contentType + ";base64," + base64
    };
  } catch (e) {
    return { success: false, error: 'فشل قراءة الملف: ' + e.message };
  }
}

// جلب البيانات المحفوظة للتصحيح السابق لتعديلها
function getSavedData(row) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('A1');
    var range = sheet.getRange('I' + row + ':O' + row).getValues()[0];
    
    var data = {
      success: true,
      notes: range[0] || '', // I
      imageGrade: range[1] || '', // J
      modifiedImageUrl: range[2] || '', // K
      audioGrade: range[3] || '', // L
      additionalImageUrl: range[4] || '', // M
      videoUrl: range[5] || '', // N
      audioUrl: range[6] || '' // O
    };
    
    return data;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// حفظ التصحيح والملفات المرفقة (الرسم، الصورة الإضافية، الفيديو المرفق، التسجيل الصوتي)
function saveAllMedia(canvasBase64, canvasFilename, imageBase64, imageFilename, videoBase64, videoFilename, audioBase64, audioFilename, row, notes, imageGrade, audioGrade) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('A1');
    var settingsSheet = ss.getSheetByName('Settings');
    
    var folderUrl = settingsSheet ? settingsSheet.getRange('B2').getValue() : '';
    if (!folderUrl) {
      throw new Error('خلية المجلد Settings!B2 فارغة! يرجى إضافة رابط مجلد الحفظ.');
    }
    
    var folderId = extractFileId(folderUrl);
    var folder = DriveApp.getFolderById(folderId);
    var urls = { modified: '', image: '', video: '', audio: '' };
    
    // زيادة عداد التصحيح في العمود Q وتفريغ نطاق التصحيح السابق في حال كان تصحيح جديد
    var currentH = sheet.getRange('H' + row).getValue();
    if (currentH !== 'تم') {
      var currentQ = Number(sheet.getRange('Q' + row).getValue() || 0);
      sheet.getRange('Q' + row).setValue(currentQ + 1);
      sheet.getRange('I' + row + ':P' + row).clearContent();
    }
    
    var currentData = sheet.getRange('I' + row + ':O' + row).getValues()[0];
    urls.modified = currentData[2] || '';
    urls.image = currentData[4] || '';
    urls.video = currentData[5] || '';
    urls.audio = currentData[6] || '';
    
    // 1. حفظ صورة السبورة المعدلة
    if (canvasBase64 && canvasBase64.indexOf('data:image/') === 0) {
      urls.modified = uploadBase64File(folder, canvasBase64, canvasFilename);
    }
    
    // 2. حفظ الصورة الإضافية
    if (imageBase64 && imageBase64.indexOf('data:image/') === 0) {
      urls.image = uploadBase64File(folder, imageBase64, imageFilename);
    }
    
    // 3. حفظ الفيديو المرفق
    if (videoBase64 && videoBase64.indexOf('data:video/') === 0) {
      urls.video = uploadBase64File(folder, videoBase64, videoFilename);
    }
    
    // 4. حفظ التسجيل الصوتي للمصحح
    if (audioBase64 && audioBase64.indexOf('data:audio/') === 0) {
      urls.audio = uploadBase64File(folder, audioBase64, audioFilename);
    }
    
    // تحديث الشيت بالقيم الجديدة
    var formattedDate = Utilities.formatDate(new Date(), "GMT+03:00", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange('I' + row).setValue(notes || ''); // I
    sheet.getRange('J' + row).setValue(imageGrade || ''); // J
    sheet.getRange('K' + row).setValue(urls.modified || ''); // K
    sheet.getRange('L' + row).setValue(audioGrade || ''); // L
    sheet.getRange('M' + row).setValue(urls.image || ''); // M
    sheet.getRange('N' + row).setValue(urls.video || ''); // N
    sheet.getRange('O' + row).setValue(urls.audio || ''); // O
    sheet.getRange('P' + row).setValue(formattedDate); // P
    sheet.getRange('H' + row).setValue('تم'); // H
    
    // حفظ نسخة أرشفة في ورقة تاريخية CorrectionHistory
    try {
      var historySheet = ss.getSheetByName('CorrectionHistory');
      if (!historySheet) {
        historySheet = ss.insertSheet('CorrectionHistory');
        var headers = sheet.getRange('A1:Q1').getValues();
        historySheet.getRange('A1:Q1').setValues(headers);
        historySheet.getRange('R1').setValue('تاريخ وأرشيف الحفظ');
      }
      var rowData = sheet.getRange('A' + row + ':Q' + row).getValues();
      rowData[0].push(formattedDate);
      historySheet.appendRow(rowData[0]);
    } catch(errArch) {
      Logger.log('خطأ أرشيف الحفظ: ' + errArch.message);
    }
    
    return { success: true, urls: urls };
    
  } catch (e) {
    return { success: false, error: 'خطأ أثناء الحفظ: ' + e.message };
  }
}

// دالة مساعدة لرفع ملف Base64 إلى Google Drive
function uploadBase64File(folder, base64Data, filename) {
  var match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('تنسيق ملف غير صالح');
  
  var contentType = match[1];
  var rawBytes = Utilities.base64Decode(match[2]);
  var blob = Utilities.newBlob(rawBytes, contentType, filename);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// جلب مستخدمي النظام من شيت الإعدادات للأمان والتحقق من الأجهزة
function getUsers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return [];
  
  var lastRow = settingsSheet.getLastRow();
  if (lastRow < 2) return [];
  
  var usersData = settingsSheet.getRange('Z2:AB' + lastRow).getValues();
  var list = [];
  for (var i = 0; i < usersData.length; i++) {
    var username = usersData[i][0] ? usersData[i][0].toString().trim() : '';
    var password = usersData[i][1] ? usersData[i][1].toString().trim() : '';
    var status = usersData[i][2] ? usersData[i][2].toString().trim() : '';
    if (username) {
      list.push({ username: username, password: password, status: status });
    }
  }
  return list;
}

// التحقق من تسجيل دخول المستخدم وتسجيل رمز تعريفي للجهاز لتفادي المشاركة العشوائية
function loginUser(username, deviceId, lat, lng) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return { success: false, message: 'شيت الإعدادات غير موجود' };
  
  var lastRow = settingsSheet.getLastRow();
  var usersRange = settingsSheet.getRange("Z2:AX" + lastRow);
  var usersData = usersRange.getValues();
  
  var userRow = -1;
  for (var i = 0; i < usersData.length; i++) {
    if (usersData[i][0].toString().trim() === username) {
      userRow = i + 2;
      break;
    }
  }
  
  if (userRow === -1) {
    return { success: false, message: 'المستخدم غير مسجل بالنظام' };
  }
  
  // خلايا تسجيل الأجهزة العشرة
  var deviceColumns = [
    {locationCol: 30, deviceCol: 31}, // AE, AF
    {locationCol: 32, deviceCol: 33}, // AG, AH
    {locationCol: 34, deviceCol: 35}, // AI, AJ
    {locationCol: 36, deviceCol: 37}, // AK, AL
    {locationCol: 38, deviceCol: 39}, // AM, AN
    {locationCol: 40, deviceCol: 41}, // AO, AP
    {locationCol: 42, deviceCol: 43}, // AQ, AR
    {locationCol: 44, deviceCol: 45}, // AS, AT
    {locationCol: 46, deviceCol: 47}, // AU, AV
    {locationCol: 48, deviceCol: 49}  // AW, AX
  ];
  
  var allowedDevices = parseInt(settingsSheet.getRange(userRow, 29).getValue()) || 1;
  allowedDevices = Math.min(allowedDevices, 10);
  
  // فحص تسجيل الجهاز الحالي
  var deviceIndex = -1;
  for (var j = 0; j < allowedDevices; j++) {
    var curId = settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim();
    if (curId === deviceId) {
      deviceIndex = j;
      break;
    }
  }
  
  // إحصاء الأجهزة النشطة
  var registeredCount = 0;
  for (var j = 0; j < allowedDevices; j++) {
    if (settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim() !== '') {
      registeredCount++;
    }
  }
  
  if (deviceIndex === -1) {
    if (registeredCount >= allowedDevices) {
      return { success: false, message: 'عذراً، تجاوزت الحد الأقصى للأجهزة المسموح بها!' };
    }
    // إيجاد خانة شاغرة للجهاز الجديد
    for (var j = 0; j < allowedDevices; j++) {
      if (settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim() === '') {
        deviceIndex = j;
        break;
      }
    }
  }
  
  // استنتاج المدينة أو الدولة عن طريق خطوط الطول والعرض للتحقق الأمني
  var location = 'موقع غير معروف';
  if (lat && lng) {
    try {
      var geocoder = Maps.newGeocoder().reverseGeocode(lat, lng);
      if (geocoder.results && geocoder.results.length > 0) {
        location = geocoder.results[0].formatted_address;
      }
    } catch(e) {
      location = lat + ", " + lng;
    }
  }
  
  if (deviceIndex !== -1) {
    settingsSheet.getRange(userRow, deviceColumns[deviceIndex].locationCol).setValue(location);
    settingsSheet.getRange(userRow, deviceColumns[deviceIndex].deviceCol).setValue(deviceId);
    return { success: true, message: 'تم الدخول بنجاح وتوثيق الجهاز.' };
  }
  
  return { success: false, message: 'حدث خطأ غير متوقع في تعيين الجهاز.' };
}
`;

