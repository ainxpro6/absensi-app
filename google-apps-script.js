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
 */

// Nama sheet yang digunakan
var SHEET_NAME = "Absensi_Siklus";

// Daftar 17 Karyawan terdaftar
var KARYAWAN_LIST = [
  "Anto", "Berry", "Bocil", "Davit", "Dede", "Doyok", 
  "Ega", "Fadil", "Farid", "Gugun", "Rahmen", "Otam", 
  "Alvian", "Riski", "Ari", "Ariel", "Iket"
];

/**
 * Endpoint GET: Membaca data anggaran dan absensi karyawan
 */
function doGet(e) {
  var sheet = getOrCreateSheet();
  var data = getSheetData(sheet);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: data
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint POST: Menerima perubahan dari aplikasi web
 */
function doPost(e) {
  var sheet = getOrCreateSheet();
  var result = { status: "error", message: "Invalid request" };
  
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }
    
    if (payload) {
      // 1. Update Anggaran (Sel S1) jika dikirimkan
      if (payload.budget !== undefined) {
        sheet.getRange("S1").setValue(Number(payload.budget));
      }
      
      // 2. Update status absensi jika dikirimkan
      if (payload.attendanceUpdates && Array.isArray(payload.attendanceUpdates)) {
        payload.attendanceUpdates.forEach(function(update) {
          // update = { employeeIndex: 0..16, dayIndex: 0..9, value: true/false }
          var row = update.employeeIndex + 2; // Baris data mulai dari 2
          var col = update.dayIndex + 2;      // Kolom tanggal B-K (2-11)
          sheet.getRange(row, col).setValue(update.value);
        });
      }
      
      // Kembalikan data terbaru setelah update
      SpreadsheetApp.flush(); // Paksa kalkulasi formula lembar kerja
      var updatedData = getSheetData(sheet);
      result = {
        status: "success",
        message: "Data successfully updated",
        data: updatedData
      };
    }
  } catch (error) {
    result = {
      status: "error",
      message: error.toString()
    };
  }
  
  // Mengatasi CORS: Bungkus respon agar bisa dibaca browser
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengambil data terstruktur dari Spreadsheet
 */
function getSheetData(sheet) {
  var budget = sheet.getRange("S1").getValue();
  var totalEmployees = sheet.getRange("S2").getValue();
  var totalRajin = sheet.getRange("S4").getValue();
  var totalPool = sheet.getRange("S5").getValue(); // Total Sisa Potongan (Denda Pool)
  
  // Ambil data baris 2 s/d 18 (17 karyawan), kolom A (Nama) hingga P (Total Akhir)
  var rangeValues = sheet.getRange(2, 1, 17, 16).getValues();
  
  var employees = rangeValues.map(function(row, idx) {
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
  for (var i = 2; i <= 18; i++) {
    // L: Total Absen
    sheet.getRange(i, 12).setFormula("=COUNTIF(B" + i + ":K" + i + "; TRUE)");
    
    // M: Jatah Dasar (Floored 5000)
    sheet.getRange(i, 13).setFormula("=FLOOR($S$1 / $S$2; 5000)");
    
    // N: Potongan Individu (Dibatasi agar denda tidak melebihi Jatah Dasar M2)
    sheet.getRange(i, 14).setFormula("=IF(L" + i + "=10; M" + i + "; MIN(L" + i + "*10000; 100000; M" + i + "))");
    
    // P: Total Akhir (Jika rajin, hitung sisa anggaran dibagi rata dan difloor 5000. Jika absen, jatah dasar - denda)
    sheet.getRange(i, 16).setFormula("=IF(L" + i + "=10; 0; IF(L" + i + "=0; IF($S$4>0; FLOOR(($S$1 - $S$3)/$S$4; 5000); M" + i + "); M" + i + " - N" + i + "))");
    
    // O: Bonus (Selisih Total Akhir dengan Jatah Dasar)
    sheet.getRange(i, 15).setFormula("=IF(L" + i + "=0; P" + i + " - M" + i + "; 0)");
  }
  
  // Format Kolom Uang (M, N, O, P) menjadi mata uang rupiah (IDR)
  sheet.getRange(2, 13, 17, 4).setNumberFormat('Rp#,##0');
  
  // 5. Setup Panel Kontrol di Kolom S
  sheet.getRange("R1").setValue("Anggaran Manual (S1)").setFontWeight("bold");
  sheet.getRange("S1").setValue(300000).setNumberFormat('Rp#,##0').setFontWeight("bold").setBackground("#FEF3C7"); // Default budget
  
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
