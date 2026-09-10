import type { AttendanceDay } from '../types';
import { PERIOD_DAYS } from '../types';

/**
 * Mendapatkan periodKey format "YYYY-MM" berdasarkan tanggal lokal hari ini (TODAY).
 * Menggunakan getFullYear() dan getMonth() lokal, bukan toISOString(),
 * untuk menghindari pergeseran tanggal akibat timezone.
 */
export function getCurrentPeriodKey(today: Date = new Date()): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Menghasilkan 10 tanggal kalender pertama (01 s.d. 10) dari bulan dan tahun berjalan (TODAY).
 * Format tampilan: dd/mm (contoh: "01/09")
 * Format internal: YYYY-MM-DD (contoh: "2026-09-01")
 */
export function generateCurrentPeriodDays(today: Date = new Date()): AttendanceDay[] {
  const year = today.getFullYear();
  const monthNumber = today.getMonth() + 1;
  const monthStr = String(monthNumber).padStart(2, '0');

  const days: AttendanceDay[] = [];
  for (let day = 1; day <= PERIOD_DAYS; day++) {
    const dayStr = String(day).padStart(2, '0');
    days.push({
      date: `${year}-${monthStr}-${dayStr}`,
      dayLabel: `${dayStr}/${monthStr}`,
      absent: false, // Default tidak dicentang = HADIR
    });
  }

  return days;
}

/**
 * Format rentang periode informatif untuk Header UI.
 * Contoh: "01/09/2026 – 10/09/2026"
 */
export function formatPeriodRange(today: Date = new Date()): string {
  const year = today.getFullYear();
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const lastDayStr = String(PERIOD_DAYS).padStart(2, '0');
  return `01/${monthStr}/${year} – ${lastDayStr}/${monthStr}/${year}`;
}
