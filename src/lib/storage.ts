import type { AppState, Person } from '../types';
import { getCurrentPeriodKey, generateCurrentPeriodDays } from './dates';

const STORAGE_KEY = 'absensi_10_hari_state_v2';

export function createDefaultState(today: Date = new Date()): AppState {
  return {
    periodKey: getCurrentPeriodKey(today),
    totalMoney: 1000000,
    people: [],
  };
}

/**
 * Memuat state dari localStorage.
 * Jika periodKey yang tersimpan berbeda dari periode berjalan (TODAY):
 * - Daftar orang dan Total Uang tetap dipertahankan.
 * - Status absensi di-reset menjadi HADIR (absent = false) dengan tanggal 10 hari kalender periode baru.
 * - periodKey diperbarui ke periode saat ini.
 */
export function loadAppState(today: Date = new Date()): AppState {
  const currentPeriodKey = getCurrentPeriodKey(today);
  const currentDays = generateCurrentPeriodDays(today);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState(today);
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultState(today);
    }

    const totalMoney =
      typeof parsed.totalMoney === 'number' && parsed.totalMoney >= 0
        ? Math.floor(parsed.totalMoney)
        : 1000000;

    const rawPeople = Array.isArray(parsed.people) ? parsed.people : [];

    // Validasi daftar orang
    const validPeople: Person[] = rawPeople.map((p: any, idx: number) => {
      const id = typeof p?.id === 'string' && p.id ? p.id : `person-${idx}`;
      const name = typeof p?.name === 'string' ? p.name.trim() || `Orang ${idx + 1}` : `Orang ${idx + 1}`;
      return {
        id,
        name,
        attendance: currentDays.map((day) => ({ ...day })),
      };
    });

    // Cek apakah periode telah berganti (misal: disimpan di September 2026, dibuka di Oktober 2026)
    if (parsed.periodKey !== currentPeriodKey) {
      // Periode baru: orang & uang tetap, absensi di-reset ke HADIR untuk periode baru
      const migratedState: AppState = {
        periodKey: currentPeriodKey,
        totalMoney,
        people: validPeople.map((p) => ({
          ...p,
          attendance: currentDays.map((d) => ({ ...d, absent: false })),
        })),
      };
      saveAppState(migratedState);
      return migratedState;
    }

    // Periode sama: kembalikan status absensi yang telah diisi sebelumnya
    const restoredPeople: Person[] = validPeople.map((p, pIdx) => {
      const savedAttendance = rawPeople[pIdx]?.attendance;
      const attendance = currentDays.map((day, dIdx) => {
        const savedDay = Array.isArray(savedAttendance) ? savedAttendance[dIdx] : undefined;
        return {
          ...day,
          absent: Boolean(savedDay?.absent),
        };
      });
      return {
        ...p,
        attendance,
      };
    });

    return {
      periodKey: currentPeriodKey,
      totalMoney,
      people: restoredPeople,
    };
  } catch (err) {
    console.warn('Gagal memuat state dari localStorage, menggunakan default:', err);
    return createDefaultState(today);
  }
}

/**
 * Menyimpan state ke localStorage.
 */
export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Gagal menyimpan state ke localStorage:', err);
  }
}
