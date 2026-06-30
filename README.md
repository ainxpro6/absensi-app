# Panduan Setup — Sistem Absensi & Insentif Karyawan

Aplikasi ini adalah dashboard web interaktif untuk mengelola absensi harian dan menghitung insentif karyawan dalam siklus 10-harian (desade), terintegrasi secara langsung dengan **Google Sheets** sebagai database online.

---

## Cara Menghubungkan Aplikasi Web ke Google Sheets

### Langkah 1: Siapkan Google Sheets Baru
1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru.
2. Beri nama spreadsheet Anda, misalnya `Sistem Absensi Karyawan`.

### Langkah 2: Pasang Google Apps Script
1. Pada menu navigasi atas Google Sheets, pilih **Ekstensi (Extensions)** > **Apps Script**.
2. Hapus semua kode default yang ada di editor teks.
3. Buka file [google-apps-script.js](file:///c:/Users/user/Documents/Coding/absensi/google-apps-script.js) di folder ini, salin seluruh kodenya, lalu tempel (*paste*) ke editor Apps Script.
4. Simpan proyek dengan menekan ikon disket atau `Ctrl + S`.

### Langkah 3: Deploy/Terapkan Sebagai Aplikasi Web
1. Di pojok kanan atas editor Apps Script, klik tombol **Terapkan (Deploy)** > **Penerapan Baru (New deployment)**.
2. Klik ikon gir (pilih jenis penerapan) lalu pilih **Aplikasi Web (Web app)**.
3. Konfigurasikan setelan berikut:
   * **Deskripsi**: `Absensi API` (opsional)
   * **Jalankan sebagai (Execute as)**: Pilih **Saya (Me - email anda@gmail.com)**
   * **Yang memiliki akses (Who has access)**: Pilih **Siapa saja (Anyone)**
4. Klik **Terapkan (Deploy)**.
5. Google akan meminta otorisasi akses ke Spreadsheet Anda. Klik **Berikan Akses (Authorize Access)**, pilih akun Google Anda, klik *Advanced*, lalu pilih *Go to Absensi Backend (unsafe)* untuk mengizinkan script berjalan.
6. Setelah selesai, Anda akan melihat dialog dengan **URL Aplikasi Web (Web app URL)**. Salin URL tersebut!

### Langkah 4: Hubungkan URL ke Aplikasi Web
1. Buka file [index.html](file:///c:/Users/user/Documents/Coding/absensi/index.html) di browser Anda.
2. Secara default, aplikasi berjalan dalam **Mode Demo (Penyimpanan Lokal)**.
3. Klik tombol **Pengaturan** (ikon roda gigi ⚙️) di pojok kanan atas.
4. Tempelkan URL Aplikasi Web yang Anda salin pada langkah sebelumnya ke dalam kolom **Google Apps Script Web App URL**.
5. Klik **Simpan & Hubungkan**.
6. Status di pojok kanan atas akan berubah menjadi **Terhubung dengan Google Sheets** berwarna hijau. Aplikasi Anda sekarang aktif sinkron secara dua arah!
7. *Catatan:* Saat pertama kali terhubung, script akan mendeteksi lembar kerja kosong dan secara otomatis membuatkan struktur kolom, rumus matematika, serta memasukkan daftar nama 17 karyawan secara otomatis.

---

## Fitur Penggunaan Dashboard

1. **Input Anggaran**: Masukkan nominal anggaran di panel kontrol (minimum Rp 100.000) dan klik centang hijau. Nilai Jatah Dasar, Pool Potongan, dan Bonus akan langsung terhitung ulang.
2. **Pencatatan Presensi**: Klik kotak checkbox pada tanggal aktif karyawan. Centang berwarna merah menunjukkan **Absen (Tidak Hadir)**. Jika hadir, biarkan kosong.
3. **Pencarian Nama**: Ketik nama karyawan pada kotak pencarian untuk mempermudah pemantauan.
4. **Cetak Slip**: Klik **Cetak Laporan / PDF** untuk menampilkan slip insentif individual karyawan yang rapi dan siap dicetak/disimpan ke file PDF.
5. **Reset Absensi**: Klik tombol **Reset Absensi** untuk mengosongkan seluruh checklist kehadiran pada awal siklus desade baru.
