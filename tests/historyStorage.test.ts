import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHistoryList,
  saveHistory,
  deleteHistory,
  findHistoryById,
  createDistributionSnapshot,
  HISTORY_STORAGE_KEY,
} from '../src/services/historyStorage';
import { calculateDistribution } from '../src/lib/calculation';
import { generateCurrentPeriodDays } from '../src/lib/dates';
import type { AppState, Person } from '../src/types';

describe('History Storage Service — Immutability, Persistence, & Deduplication', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    if (typeof globalThis.localStorage === 'undefined') {
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          for (const key in mockStorage) {
            delete mockStorage[key];
          }
        },
      };
    } else {
      localStorage.clear();
    }
  });

  const sampleDate = new Date(2026, 8, 9); // September 2026

  function createTestAppState(totalMoney = 1000000, absentIndex?: number): AppState {
    const days = generateCurrentPeriodDays(sampleDate);
    const people: Person[] = ['Andi', 'Budi', 'Cici', 'Dedi', 'Eko'].map((name, idx) => ({
      id: `p-${idx}`,
      name,
      attendance: days.map((d, dIdx) => ({
        ...d,
        absent: idx === absentIndex && dIdx === 0, // Orang ke-absentIndex tidak hadir di hari ke-0 jika diset
      })),
    }));

    return {
      periodKey: '2026-09',
      totalMoney,
      people,
    };
  }

  it('1. Menyimpan snapshot riwayat dan memuatnya kembali secara terurut (descending)', () => {
    const state = createTestAppState();
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    const result = saveHistory(snapshot);
    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(false);

    const historyList = getHistoryList();
    expect(historyList).toHaveLength(1);
    expect(historyList[0].totalFund).toBe(1000000);
    expect(historyList[0].fullAttendance).toBe(5);
    expect(historyList[0].periodStart).toBe('2026-09-01');
    expect(historyList[0].periodEnd).toBe('2026-09-10');
    expect(historyList[0].participants[0].received).toBe(200000);
  });

  it('2. Menolak penyimpanan duplikat identik', () => {
    const state = createTestAppState();
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    const firstSave = saveHistory(snapshot);
    expect(firstSave.success).toBe(true);

    // Coba simpan kembali snapshot yang identik
    const duplicateSave = saveHistory(snapshot);
    expect(duplicateSave.success).toBe(false);
    expect(duplicateSave.isDuplicate).toBe(true);

    const historyList = getHistoryList();
    expect(historyList).toHaveLength(1); // Tetap 1, tidak terduplikasi
  });

  it('3. Snapshot bersifat IMMUTABLE: perubahan pada kalkulator saat ini tidak merusak snapshot tersimpan', () => {
    const state = createTestAppState(1000000);
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    saveHistory(snapshot);

    // User mengubah kalkulator menjadi Rp2.000.000 dan Andi absen
    state.totalMoney = 2000000;
    state.people[0].attendance[0].absent = true;
    state.people[0].name = 'Andi Diubah';

    // Ambil kembali snapshot dari history
    const saved = getHistoryList()[0];
    expect(saved.totalFund).toBe(1000000); // Tetap 1 juta
    expect(saved.participants[0].name).toBe('Andi'); // Tetap nama asli
    expect(saved.participants[0].received).toBe(200000); // Tetap Rp200.000
    expect(saved.fullAttendance).toBe(5); // Tetap 5 hadir penuh
  });

  it('4. Menghapus riwayat berdasarkan ID', () => {
    const state = createTestAppState();
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    saveHistory(snapshot);
    const saved = getHistoryList()[0];

    const deleteResult = deleteHistory(saved.id);
    expect(deleteResult).toBe(true);

    const historyListAfter = getHistoryList();
    expect(historyListAfter).toHaveLength(0);
  });

  it('5. Mencari riwayat berdasarkan ID (findHistoryById)', () => {
    const state = createTestAppState();
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    saveHistory(snapshot);
    const saved = getHistoryList()[0];

    const found = findHistoryById(saved.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(saved.id);

    const notFound = findHistoryById('non-existent-id');
    expect(notFound).toBeNull();
  });

  it('6. Menangani data corrupt di localStorage secara aman tanpa crash', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, 'invalid-json{{{corrupted');

    const list = getHistoryList();
    expect(list).toEqual([]);

    // Menyimpan snapshot baru tetap berjalan normal
    const state = createTestAppState();
    const calculation = calculateDistribution(state.totalMoney, state.people);
    const snapshot = createDistributionSnapshot(state, calculation, sampleDate);

    const saveResult = saveHistory(snapshot);
    expect(saveResult.success).toBe(true);
    expect(getHistoryList()).toHaveLength(1);
  });
});
