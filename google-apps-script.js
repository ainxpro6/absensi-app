/**
 * Google Apps Script (GAS) Backend untuk Aplikasi Web Absensi & Insentif
 * 
 * Tempatkan script ini di Google Sheets Anda:
 * 1. Di Google Sheets, buka menu Ekstensi (Extensions) > Apps Script.
 * 2. Hapus semua kode bawaan, lalu tempel kode ini.
 * 3. Simpan proyek dengan nama "Absensi Backend".
 * 4. Klik tombol "Terapkan" (Deploy) > "Penerapan baru" (New deployment).
 * 5. Pilih jenis penerapan "Aplikasi Web" (Web app).
 * 6. Setel:
 *    - Jalankan sebagai (Execute as): Saya (Me / email Anda)
 *    - Yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 7. Klik "Terapkan" (Deploy), lalu salin URL Aplikasi Web yang diberikan.
 * 
 * CATATAN PENTING MENGENAI LOCALE FORMULA:
 * =========================================
 * Script ini menggunakan tanda titik koma (;) sebagai pemisah argumen formula
 * Google Sheets, karena locale Indonesia (id_ID) menggunakan koma (,) sebagai
 * pemisah desimal. Jika Sheets Anda menggunakan locale English (en_US),
 * ganti semua titik koma (;) dalam formula menjadi koma (,).
 * 
 * Contoh:
 *   Locale ID: =FLOOR($S$1 / $S$2; 5000)
 *   Locale EN: =FLOOR($S$1 / $S$2, 5000)
 */

// ==================== KONFIGURASI ====================

/** Nama sheet yang digunakan */
var SHEET_NAME = "Absensi_Siklus";

/** Durasi cache dalam detik (30 detik) */
var CACHE_TTL_SECONDS = 30;

/** Kunci cache */
var CACHE_KEY = "absensi_sheet_data";

/** Batas validasi */
var VALIDATION = {
  MIN_EMPLOYEE_INDEX: 0,
  MAX_EMPLOYEE_INDEX: 16,
  MIN_DAY_INDEX: 0,
  MAX_DAY_INDEX: 9,
  MIN_BUDGET: 100000,
  MAX_BUDGET: 100000000
};

// Daftar 17 Karyawan terdaftar
var KARYAWAN_LIST = [
  "Anto", "Berry", "Bocil", "Davit", "Dede", "Doyok", 
  "Ega", "Fadil", "Farid", "Gugun", "Rahmen", "Otam", 
  "Alvian", "Riski", "Ari", "Ariel", "Iket"
];

// ==================== ERROR CODES ====================

var ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  LOCK_TIMEOUT: "LOCK_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_PAYLOAD: "INVALID_PAYLOAD"
};

// ==================== ENDPOINTS ====================

/**
 * Endpoint GET: Membaca data anggaran dan absensi karyawan
 * Menggunakan CacheService untuk mengurangi beban baca spreadsheet.
 */
function doGet(e) {
  try {
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get(CACHE_KEY);
    
    if (cachedData) {
      // Cache hit — kembalikan data dari cache
      return createJsonResponse({
        status: "success",
        data: JSON.parse(cachedData),
        cached: true
      });
    }
    
    // Cache miss — baca dari spreadsheet
    var sheet = getOrCreateSheet();
    var data = getSheetData(sheet);
    
    // Simpan ke cache (TTL 30 detik)
    try {
      cache.put(CACHE_KEY, JSON.stringify(data), CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      // Cache error tidak fatal, lanjutkan saja
      Logger.log("Cache write failed: " + cacheErr.toString());
    }
    
    return createJsonResponse({
      status: "success",
      data: data,
      cached: false
    });
    
  } catch (error) {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Gagal membaca data: " + error.toString());
  }
}

/**
 * Endpoint POST: Menerima perubahan dari aplikasi web
 * Menggunakan LockService untuk mencegah concurrent writes.
 * Menggunakan batch write (setValues) untuk performa optimal.
 */
function doPost(e) {
  // Acquire script-level lock untuk mencegah race condition
  var lock = LockService.getScriptLock();
  
  try {
    // Tunggu maksimal 10 detik untuk mendapatkan lock
    if (!lock.tryLock(10000)) {
      return createErrorResponse(
        ErrorCodes.LOCK_TIMEOUT, 
        "Server sedang sibuk memproses permintaan lain. Silakan coba lagi."
      );
    }
    
    // Parse payload
    var payload = parsePayload(e);
    if (!payload) {
      return createErrorResponse(ErrorCodes.INVALID_PAYLOAD, "Format data tidak valid.");
    }
    
    // Validasi payload
    var validationError = validatePayload(payload);
    if (validationError) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, validationError);
    }
    
    var sheet = getOrCreateSheet();
    
    // 1. Update Anggaran (Sel S1) jika dikirimkan
    if (payload.budget !== undefined) {
      sheet.getRange("S1").setValue(Number(payload.budget));
    }
    
    // 2. Batch update status absensi menggunakan setValues()
    if (payload.attendanceUpdates && payload.attendanceUpdates.length > 0) {
      batchUpdateAttendance(sheet, payload.attendanceUpdates);
    }
    
    // Paksa kalkulasi formula spreadsheet
    SpreadsheetApp.flush();
    
    // Baca data terbaru setelah update
    var updatedData = getSheetData(sheet);
    
    // Invalidate cache setelah perubahan
    invalidateCache();
    
    return createJsonResponse({
      status: "success",
      message: "Data berhasil diperbarui",
      data: updatedData
    });
    
  } catch (error) {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, "Gagal memperbarui data: " + error.toString());
  } finally {
    // Selalu lepaskan lock
    lock.releaseLock();
  }
}

// ==================== BATCH OPERATIONS ====================

/**
 * Batch update attendance menggunakan setValues() untuk performa optimal.
 * Alih-alih menulis satu sel per satu (N kali API call),
 * kita baca seluruh range, modifikasi di memory, lalu tulis kembali sekaligus.
 */
function batchUpdateAttendance(sheet, updates) {
  // Baca seluruh range checkbox sekaligus (B2:K18 = 17 baris × 10 kolom)
  var checkboxRange = sheet.getRange(2, 2, 17, 10);
  var values = checkboxRange.getValues();
  
  // Modifikasi nilai di memory
  updates.forEach(function(update) {
    var empIdx = update.employeeIndex;
    var dayIdx = update.dayIndex;
    values[empIdx][dayIdx] = update.value === true;
  });
  
  // Tulis kembali sekaligus (1 API call, bukan N API calls)
  checkboxRange.setValues(values);
}

// ==================== VALIDATION ====================

/**
 * Parse payload dari request POST
 */
function parsePayload(e) {
  try {
    if (e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
    return e.parameter || null;
  } catch (parseErr) {
    return null;
  }
}

/**
 * Validasi payload sebelum diproses.
 * Mengembalikan string error message jika tidak valid, null jika valid.
 */
function validatePayload(payload) {
  // Validasi budget
  if (payload.budget !== undefined) {
    var budget = Number(payload.budget);
    if (isNaN(budget)) {
      return "Nominal anggaran harus berupa angka.";
    }
    if (budget < VALIDATION.MIN_BUDGET) {
      return "Nominal anggaran minimal Rp " + VALIDATION.MIN_BUDGET.toLocaleString("id-ID") + ".";
    }
    if (budget > VALIDATION.MAX_BUDGET) {
      return "Nominal anggaran melebihi batas maksimal.";
    }
  }
  
  // Validasi attendance updates
  if (payload.attendanceUpdates) {
    if (!Array.isArray(payload.attendanceUpdates)) {
      return "Format attendanceUpdates harus berupa array.";
    }
    
    for (var i = 0; i < payload.attendanceUpdates.length; i++) {
      var update = payload.attendanceUpdates[i];
      
      // Validasi employeeIndex
      if (typeof update.employeeIndex !== "number" || 
          update.employeeIndex < VALIDATION.MIN_EMPLOYEE_INDEX || 
          update.employeeIndex > VALIDATION.MAX_EMPLOYEE_INDEX ||
          update.employeeIndex !== Math.floor(update.employeeIndex)) {
        return "Index karyawan tidak valid: " + update.employeeIndex + " (harus 0-16, bilangan bulat).";
      }
      
      // Validasi dayIndex
      if (typeof update.dayIndex !== "number" || 
          update.dayIndex < VALIDATION.MIN_DAY_INDEX || 
          update.dayIndex > VALIDATION.MAX_DAY_INDEX ||
          update.dayIndex !== Math.floor(update.dayIndex)) {
        return "Index hari tidak valid: " + update.dayIndex + " (harus 0-9, bilangan bulat).";
      }
      
      // Validasi value (harus boolean)
      if (typeof update.value !== "boolean") {
        return "Nilai kehadiran harus berupa boolean (true/false).";
      }
    }
  }
  
  // Payload harus mengandung setidaknya satu perubahan
  if (payload.budget === undefined && 
      (!payload.attendanceUpdates || payload.attendanceUpdates.length === 0)) {
    return "Tidak ada perubahan yang dikirimkan.";
  }
  
  return null; // Valid
}

// ==================== DATA ACCESS ====================

/**
 * Mengambil data terstruktur dari Spreadsheet
 */
function getSheetData(sheet) {
  var budget = sheet.getRange("S1").getValue();
  var totalEmployees = sheet.getRange("S2").getValue();
  var totalRajin = sheet.getRange("S4").getValue();
  var totalPool = sheet.getRange("S5").getValue();
  
  // Ambil data baris 2 s/d 18 (17 karyawan), kolom A (Nama) hingga P (Total Akhir)
  var rangeValues = sheet.getRange(2, 1, 17, 16).getValues();
  
  var employees = rangeValues.map(function(row) {
    var attendance = [];
    for (var i = 1; i <= 10; i++) {
      attendance.push(row[i] === true); // Kolom B-K (indeks 1-10)
    }
    
    return {
      name: row[0],                 // Kolom A
      attendance: attendance,       // Kolom B-K
      totalAbsen: Number(row[11]),  // Kolom L
      jatahDasar: Number(row[12]),  // Kolom M
      potongan: Number(row[13]),    // Kolom N
      bonus: Number(row[14]),       // Kolom O
      totalAkhir: Number(row[15])   // Kolom P
    };
  });
  
  return {
    budget: Number(budget),
    totalEmployees: Number(totalEmployees),
    totalPool: Number(totalPool),
    totalRajin: Number(totalRajin),
    employees: employees
  };
}

// ==================== SHEET MANAGEMENT ====================

/**
 * Mengambil sheet aktif atau membuatnya baru jika belum ada
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initializeSheetStructure(sheet);
  }
  return sheet;
}

/**
 * Menginisialisasi tabel utama, checkbox, dan formula di Google Sheets
 * 
 * PENTING: Formula menggunakan titik koma (;) sebagai separator.
 * Ini sesuai dengan locale Indonesia (id_ID).
 * Jika Google Sheets Anda menggunakan locale English, ganti ; dengan ,
 */
function initializeSheetStructure(sheet) {
  sheet.clear();
  
  // 1. Setup Header (Baris 1)
  var headers = [
    "Nama Karyawan", 
    "Hari 1", "Hari 2", "Hari 3", "Hari 4", "Hari 5", 
    "Hari 6", "Hari 7", "Hari 8", "Hari 9", "Hari 10",
    "Total Absen", "Jatah Dasar", "Potongan", "Bonus", "Total Akhir"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  
  // 2. Setup Data Karyawan (Baris 2-18)
  var nameValues = KARYAWAN_LIST.map(function(name) { return [name]; });
  sheet.getRange(2, 1, 17, 1).setValues(nameValues);
  
  // 3. Pasang Checkbox di Kolom B s/d K (Baris 2-18)
  var checkboxRange = sheet.getRange(2, 2, 17, 10);
  checkboxRange.insertCheckboxes();
  
  // 4. Setup Formula di Kolom L s/d P (Baris 2-18)
  // CATATAN: Separator ";" untuk locale Indonesia. Ganti ke "," untuk locale English.
  for (var i = 2; i <= 18; i++) {
    // L: Total Absen — menghitung jumlah TRUE (hari absen) dalam rentang B-K
    sheet.getRange(i, 12).setFormula("=COUNTIF(B" + i + ":K" + i + "; TRUE)");
    
    // M: Jatah Dasar — anggaran dibagi karyawan, dibulatkan ke bawah kelipatan 5000
    sheet.getRange(i, 13).setFormula("=FLOOR($S$1 / $S$2; 5000)");
    
    // N: Potongan Individu — absen 10 hari = potong semua, <10 = Rp10rb/hari (maks 100rb)
    sheet.getRange(i, 14).setFormula("=IF(L" + i + "=10; M" + i + "; MIN(L" + i + "*10000; 100000; M" + i + "))");
    
    // P: Total Akhir — karyawan rajin dapat sisa anggaran dibagi rata (floor 5000)
    sheet.getRange(i, 16).setFormula("=IF(L" + i + "=10; 0; IF(L" + i + "=0; IF($S$4>0; FLOOR(($S$1 - $S$3)/$S$4; 5000); M" + i + "); M" + i + " - N" + i + "))");
    
    // O: Bonus — selisih antara Total Akhir dan Jatah Dasar untuk karyawan rajin
    sheet.getRange(i, 15).setFormula("=IF(L" + i + "=0; P" + i + " - M" + i + "; 0)");
  }
  
  // Format Kolom Uang (M, N, O, P) menjadi mata uang rupiah (IDR)
  sheet.getRange(2, 13, 17, 4).setNumberFormat('Rp#,##0');
  
  // 5. Setup Panel Kontrol di Kolom S
  sheet.getRange("R1").setValue("Anggaran Manual (S1)").setFontWeight("bold");
  sheet.getRange("S1").setValue(300000).setNumberFormat('Rp#,##0').setFontWeight("bold").setBackground("#FEF3C7");
  
  sheet.getRange("R2").setValue("Jumlah Karyawan (S2)");
  sheet.getRange("S2").setFormula("=COUNTA(A2:A18)");
  
  sheet.getRange("R3").setValue("Total Bayar Absen (S3)");
  sheet.getRange("S3").setFormula("=SUMIF(L2:L18; \">0\"; P2:P18)").setNumberFormat('Rp#,##0');
  
  sheet.getRange("R4").setValue("Karyawan 0 Absen (S4)");
  sheet.getRange("S4").setFormula("=COUNTIF(L2:L18; 0)");

  sheet.getRange("R5").setValue("Total Sisa Potongan (S5)");
  sheet.getRange("S5").setFormula("=SUM(N2:N18)").setNumberFormat('Rp#,##0');
  
  // Rapikan lebar kolom
  sheet.autoResizeColumns(1, 20);
}

// ==================== HELPERS ====================

/**
 * Membuat JSON response standar
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Membuat error response terstandarisasi
 */
function createErrorResponse(code, message) {
  return createJsonResponse({
    status: "error",
    code: code,
    message: message
  });
}

/**
 * Invalidate cache setelah data berubah
 */
function invalidateCache() {
  try {
    CacheService.getScriptCache().remove(CACHE_KEY);
  } catch (e) {
    Logger.log("Cache invalidation failed: " + e.toString());
  }
}
