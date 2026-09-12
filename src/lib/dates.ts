import type { AttendanceDay } from '../types';

export interface PeriodInfo {
  year: number;
  month: number; // 1-12
  periodNumber: 1 | 2 | 3;
  startDay: number;
  endDay: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startLabel: string; // dd/mm
  endLabel: string;   // dd/mm
  periodLabel: string; // dd/mm/yyyy – dd/mm/yyyy
  periodKey: string;   // YYYY-MM-P1, YYYY-MM-P2, YYYY-MM-P3
  totalDays: number;
}

/**
 * Menghitung informasi periode berjalan berdasarkan tanggal lokal (TODAY).
 * Menggunakan getFullYear(), getMonth(), dan getDate() lokal (bukan UTC / toISOString).
 * Aturan Periode:
 * - Periode 1: tanggal 1 – 10
 * - Periode 2: tanggal 11 – 20
 * - Periode 3: tanggal 21 – akhir bulan (dihitung dinamis, jangan hard-code 30/31)
 */
export function getPeriodInfo(today: Date = new Date()): PeriodInfo {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Hitung hari terakhir bulan ini secara dinamis menggunakan local date
  // new Date(year, monthIndex + 1, 0) menghasilkan tanggal terakhir bulan berjalan
  const lastDayOfMonth = new Date(year, today.getMonth() + 1, 0).getDate();

  let startDay = 1;
  let endDay = 10;
  let periodNumber: 1 | 2 | 3 = 1;

  if (day <= 10) {
    startDay = 1;
    endDay = 10;
    periodNumber = 1;
  } else if (day <= 20) {
    startDay = 11;
    endDay = 20;
    periodNumber = 2;
  } else {
    startDay = 21;
    endDay = lastDayOfMonth;
    periodNumber = 3;
  }

  const monthStr = String(month).padStart(2, '0');
  const startDayStr = String(startDay).padStart(2, '0');
  const endDayStr = String(endDay).padStart(2, '0');

  const startDate = `${year}-${monthStr}-${startDayStr}`;
  const endDate = `${year}-${monthStr}-${endDayStr}`;
  const startLabel = `${startDayStr}/${monthStr}`;
  const endLabel = `${endDayStr}/${monthStr}`;
  const periodLabel = `${startLabel}/${year} – ${endLabel}/${year}`;
  const periodKey = `${year}-${monthStr}-P${periodNumber}`;
  const totalDays = endDay - startDay + 1;

  return {
    year,
    month,
    periodNumber,
    startDay,
    endDay,
    startDate,
    endDate,
    startLabel,
    endLabel,
    periodLabel,
    periodKey,
    totalDays,
  };
}

/**
 * Mendapatkan periodKey format "YYYY-MM-PX" (misal: "2026-09-P2")
 * berdasarkan tanggal lokal hari ini (TODAY).
 * Menggunakan getFullYear(), getMonth(), dan getDate() lokal, bukan toISOString(),
 * untuk menghindari pergeseran tanggal akibat timezone.
 */
export function getCurrentPeriodKey(today: Date = new Date()): string {
  return getPeriodInfo(today).periodKey;
}

/**
 * Menghasilkan daftar tanggal kalender untuk periode berjalan (TODAY).
 * Periode 1: 1 s.d. 10 (10 hari)
 * Periode 2: 11 s.d. 20 (10 hari)
 * Periode 3: 21 s.d. akhir bulan (8 s.d. 11 hari dinamis)
 * Format tampilan: dd/mm (contoh: "11/09")
 * Format internal: YYYY-MM-DD (contoh: "2026-09-11")
 */
export function generateCurrentPeriodDays(today: Date = new Date()): AttendanceDay[] {
  const period = getPeriodInfo(today);
  const monthStr = String(period.month).padStart(2, '0');

  const days: AttendanceDay[] = [];
  for (let day = period.startDay; day <= period.endDay; day++) {
    const dayStr = String(day).padStart(2, '0');
    days.push({
      date: `${period.year}-${monthStr}-${dayStr}`,
      dayLabel: `${dayStr}/${monthStr}`,
      absent: false, // Default tidak dicentang = HADIR
    });
  }

  return days;
}

/**
 * Format rentang periode informatif untuk Header & Hero UI.
 * Contoh: "11/09/2026 – 20/09/2026"
 */
export function formatPeriodRange(today: Date = new Date()): string {
  return getPeriodInfo(today).periodLabel;
}
