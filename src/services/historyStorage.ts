import type {
  AppState,
  CalculationResult,
  DistributionHistory,
  DistributionHistoryParticipant,
  ParticipantStatus,
} from '../types';
import { getPeriodInfo } from '../lib/dates';

export const HISTORY_STORAGE_KEY = 'bagiKas.history';

/**
 * Helper untuk menentukan status kehadiran peserta dalam format deskriptif.
 */
export function getParticipantStatus(presentCount: number, totalDays: number = 10): ParticipantStatus {
  if (presentCount === totalDays) return 'Hadir Penuh';
  if (presentCount > 0) return 'Absen Sebagian';
  return 'Tidak Dapat Bagian';
}

/**
 * Membuat snapshot murni (pure plain object) yang immutable dari state & calculation result.
 * Tidak menyimpan referensi mutable ke state aplikasi saat ini.
 */
export function createDistributionSnapshot(
  state: AppState,
  calculation: CalculationResult,
  today: Date = new Date()
): DistributionHistory {
  const period = getPeriodInfo(today);
  const firstPerson = state.people[0];
  const firstDay = firstPerson?.attendance[0];
  const lastDay = firstPerson?.attendance[firstPerson.attendance.length - 1];

  const periodStart = firstDay?.date || period.startDate;
  const periodEnd = lastDay?.date || period.endDate;
  const startLabel = firstDay?.dayLabel || period.startLabel;
  const endLabel = lastDay?.dayLabel || period.endLabel;
  const periodLabel = `${startLabel} – ${endLabel}`;
  const totalDays = firstPerson?.attendance.length || period.totalDays;

  const participants: DistributionHistoryParticipant[] = state.people.map((person) => {
    const personTotalDays = person.attendance.length || totalDays;
    const personRes = calculation.people.find((p) => p.id === person.id) || {
      absentCount: person.attendance.filter((d) => d.absent).length,
      presentCount: personTotalDays - person.attendance.filter((d) => d.absent).length,
      eligible: person.attendance.every((d) => !d.absent),
      payment: 0,
    };

    const isEligible = personRes.eligible;

    return {
      id: String(person.id),
      name: String(person.name),
      presentDays: personRes.presentCount,
      absentDays: personRes.absentCount,
      baseShare: isEligible ? calculation.baseShare : 0,
      transferredBonus: isEligible ? calculation.bonusPerFullAttendee : 0,
      received: personRes.payment,
      status: getParticipantStatus(personRes.presentCount, personTotalDays),
    };
  });

  const snapshot: DistributionHistory = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    periodStart,
    periodEnd,
    periodLabel,
    totalDays,
    totalFund: calculation.totalMoney,
    totalParticipants: calculation.totalPeople,
    fullAttendance: calculation.fullAttendees,
    absentParticipants: calculation.ineligiblePeople,
    totalDistributed: calculation.distributedTotal,
    remainder: calculation.remainder,
    participants,
    createdAt: new Date().toISOString(),
  };

  // Pastikan immutable melalui deep serialization
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Memeriksa apakah terdapat snapshot yang identik pada periode yang sama.
 * Identik: periode sama, total dana sama, total dibagikan sama, dan rincian nominal peserta sama.
 */
export function isIdenticalSnapshot(
  a: DistributionHistory,
  b: DistributionHistory
): boolean {
  if (
    a.periodStart !== b.periodStart ||
    a.periodEnd !== b.periodEnd ||
    a.totalFund !== b.totalFund ||
    a.totalParticipants !== b.totalParticipants ||
    a.fullAttendance !== b.fullAttendance ||
    a.totalDistributed !== b.totalDistributed ||
    a.remainder !== b.remainder ||
    a.participants.length !== b.participants.length
  ) {
    return false;
  }

  return a.participants.every((pA) => {
    const pB = b.participants.find((p) => p.name === pA.name);
    if (!pB) return false;
    return (
      pA.presentDays === pB.presentDays &&
      pA.received === pB.received &&
      pA.status === pB.status
    );
  });
}

/**
 * Mengambil seluruh daftar riwayat dari localStorage.
 * Hasil selalu diurutkan berdasarkan createdAt descending (terbaru di atas).
 * Resilient terhadap format corrupt / storage error.
 */
export function getHistoryList(): DistributionHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validList: DistributionHistory[] = parsed.filter((item): item is DistributionHistory => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.periodStart === 'string' &&
        typeof item.totalFund === 'number' &&
        Array.isArray(item.participants) &&
        typeof item.createdAt === 'string'
      );
    });

    // Urutkan createdAt descending (terbaru paling atas)
    return validList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.warn('Gagal membaca riwayat dari localStorage, mengembalikan array kosong:', err);
    return [];
  }
}

export type SaveHistoryResult = {
  success: boolean;
  isDuplicate: boolean;
  item?: DistributionHistory;
};

/**
 * Menyimpan snapshot ke localStorage.
 * Menolak duplikasi jika snapshot identik untuk periode yang sama sudah tersimpan.
 */
export function saveHistory(snapshot: DistributionHistory): SaveHistoryResult {
  try {
    const currentList = getHistoryList();

    // Cek duplikasi identik
    const duplicate = currentList.find((existing) => isIdenticalSnapshot(existing, snapshot));
    if (duplicate) {
      return {
        success: false,
        isDuplicate: true,
        item: duplicate,
      };
    }

    // Buat deep clone snapshot agar 100% immutable
    const immutableSnapshot: DistributionHistory = JSON.parse(JSON.stringify(snapshot));

    const updatedList = [immutableSnapshot, ...currentList];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));

    return {
      success: true,
      isDuplicate: false,
      item: immutableSnapshot,
    };
  } catch (err) {
    console.error('Gagal menyimpan riwayat ke localStorage:', err);
    return {
      success: false,
      isDuplicate: false,
    };
  }
}

/**
 * Menghapus satu riwayat berdasarkan id.
 */
export function deleteHistory(id: string): boolean {
  try {
    const currentList = getHistoryList();
    const updatedList = currentList.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
    return true;
  } catch (err) {
    console.error('Gagal menghapus riwayat dari localStorage:', err);
    return false;
  }
}

/**
 * Mencari satu riwayat berdasarkan id.
 */
export function findHistoryById(id: string): DistributionHistory | null {
  const list = getHistoryList();
  return list.find((item) => item.id === id) || null;
}
