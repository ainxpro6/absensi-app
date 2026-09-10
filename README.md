# Web Pembagian Uang 10 Hari (Berbasis Kalender Berjalan)

Aplikasi web modern untuk menghitung pembagian total uang kepada daftar orang berdasarkan kehadiran selama **10 hari kalender pertama** dari bulan berjalan (**TODAY**).

## Aturan Inti

1. **Periode Otomatis (Berdasarkan TODAY)**:
   - Periode selalu mengambil **10 hari kalender pertama** dari bulan dan tahun saat aplikasi dibuka (menggunakan tanggal lokal browser).
   - Format label tanggal: `dd/mm` (contoh: `01/09`, `02/09`, ..., `10/09`).
   - Tidak ada pilihan manual bulan atau tahun.
2. **Checkbox Hanya untuk TIDAK HADIR**:
   - `☐ Tidak dicentang` = **HADIR** (default semua hari).
   - `☑ Dicentang` = **TIDAK HADIR**.
3. **Kelayakan (Eligibility)**:
   - Jika seseorang tidak hadir **minimal 1 hari** (misal hadir 9/10), orang tersebut mendapatkan **Rp0**.
   - Hanya orang yang **hadir penuh 10/10** yang berhak mendapatkan pembagian uang.
4. **Kalkulasi & Pembulatan**:
   - **Bagian Dasar** = `floor((Total Uang / Seluruh Orang) / 5000) * 5000`. Pembagian awal selalu membagi dengan seluruh orang terdaftar ($N$).
   - **Dana Dialihkan** = Bagian dasar orang yang tidak hadir dikumpulkan ke pool redistribusi.
   - **Bonus Hadir Full** = `floor((Dana Dialihkan / Jumlah Hadir Full) / 5000) * 5000`.
   - **Diterima Hadir Full** = Bagian Dasar + Bonus Hadir Full.
   - **Sisa Uang (Tidak Terbagi)** = `Total Uang - Total yang Dibagikan`. Selalu ditampilkan transparan dan tidak dipaksakan habis.
5. **Transisi Pergantian Bulan (LocalStorage)**:
   - Aplikasi melacak `periodKey` (misal: `"2026-09"`).
   - Jika aplikasi dibuka pada bulan berikutnya (misal `"2026-10"`), status absensi otomatis di-reset menjadi **HADIR** untuk periode baru, sementara nama peserta dan Total Uang tetap dipertahankan.

---

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite 6
- **Styling:** Vanilla CSS modern (CSS variables, responsive table, custom checkbox, high contrast, smooth animations)
- **Icons:** Lucide React
- **Testing:** Vitest
- **Persistence:** Browser `localStorage` dengan validasi skema

---

## Cara Menjalankan

### 1. Menjalankan Server Pengembangan
```powershell
npm run dev
```

### 2. Menjalankan Unit Test (Vitest)
```powershell
npm test
```

### 3. Membangun Bundle Produksi
```powershell
npm run build
```

### 4. Deploy ke GitHub Pages
```powershell
npm run deploy
```

---

## Struktur Kode

```text
src/
├── components/
│   ├── AttendanceTable.tsx         # Matrix 10 hari dengan checkbox tidak hadir & inline editing
│   ├── CalculationTransparency.tsx # Rincian transparansi rumus matematis
│   ├── FinancialSummary.tsx        # Bento grid metrik keuangan & input dana
│   ├── Footer.tsx                  # Footer status & hak cipta
│   ├── Header.tsx                  # Header navigasi 3 tab & aksi global
│   ├── Hero.tsx                    # Banner standar operasional distribusi 10 hari
│   ├── HistoryDetailModal.tsx      # Modal read-only detail arsip riwayat
│   ├── HistoryList.tsx             # Daftar riwayat distribusi tersimpan
│   ├── Modals.tsx                  # Modal panduan aturan & konfirmasi
│   ├── Rekapitulasi.tsx            # Halaman rekapitulasi, cetak laporan & simpan arsip
│   ├── SecondaryMetrics.tsx        # Metrik sekunder rasio kelayakan
│   └── Toast.tsx                   # Notifikasi interaktif
├── lib/
│   ├── calculation.ts              # Pure business logic kalkulasi pembagian
│   ├── currency.ts                 # Helper format Rupiah & pembulatan Rp5.000
│   ├── dates.ts                    # Helper generator 10 hari kalender dari TODAY
│   └── storage.ts                  # LocalStorage state dengan migrasi periodKey
├── services/
│   └── historyStorage.ts           # Service immutable snapshot & persistensi riwayat
├── types/
│   └── index.ts                    # Definisi TypeScript untuk absensi & snapshot
├── App.tsx                         # Komponen utama & state management
├── index.css                       # Design system tokens & responsive styles
└── main.tsx                        # Entry point React
tests/
├── calculation.test.ts             # Pengujian skenario kalkulasi & pembulatan
├── dates.test.ts                   # Pengujian tanggal TODAY, format dd/mm & migrasi storage
└── historyStorage.test.ts          # Pengujian snapshot riwayat & deduplikasi
```
