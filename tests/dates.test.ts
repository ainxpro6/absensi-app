import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCurrentPeriodDays,
  getCurrentPeriodKey,
  formatPeriodRange,
} from '../src/lib/dates';
import { loadAppState, saveAppState } from '../src/lib/storage';
import type { AppState, Person } from '../src/types';

describe('Date Utilities — Berdasarkan TODAY', () => {
  it('Test 1: TODAY 09/09/2026 menghasilkan periode 01/09 s.d. 10/09', () => {
    // Note: month index 8 adalah September (0-indexed)
    const today = new Date(2026, 8, 9);
    const days = generateCurrentPeriodDays(today);

    expect(days).toHaveLength(10);
    expect(days[0].dayLabel).toBe('01/09');
    expect(days[1].dayLabel).toBe('02/09');
    expect(days[8].dayLabel).toBe('09/09');
    expect(days[9].dayLabel).toBe('10/09');
    expect(getCurrentPeriodKey(today)).toBe('2026-09');
  });

  it('Test 2: TODAY 25/10/2026 menghasilkan periode 01/10 s.d. 10/10', () => {
    // month index 9 adalah Oktober
    const today = new Date(2026, 9, 25);
    const days = generateCurrentPeriodDays(today);

    expect(days).toHaveLength(10);
    expect(days[0].dayLabel).toBe('01/10');
    expect(days[9].dayLabel).toBe('10/10');
  });

  it('Test 3: TODAY 02/01/2027 menghasilkan periode 01/01 s.d. 10/01', () => {
    // month index 0 adalah Januari
    const today = new Date(2027, 0, 2);
    const days = generateCurrentPeriodDays(today);

    expect(days).toHaveLength(10);
    expect(days[0].dayLabel).toBe('01/01');
    expect(days[9].dayLabel).toBe('10/01');
  });

  it('Test 4: Pastikan dayLabel selalu berformat dd/mm', () => {
    const today = new Date(2026, 3, 5); // April 2026
    const days = generateCurrentPeriodDays(today);

    const ddmmRegex = /^(0[1-9]|10)\/(0[1-9]|1[0-2])$/;
    days.forEach((day) => {
      expect(day.dayLabel).toMatch(ddmmRegex);
    });
  });

  it('Test 5: Pastikan date selalu berformat YYYY-MM-DD', () => {
    const today = new Date(2026, 8, 9);
    const days = generateCurrentPeriodDays(today);

    expect(days[0].date).toBe('2026-09-01');
    expect(days[9].date).toBe('2026-09-10');

    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach((day) => {
      expect(day.date).toMatch(isoDateRegex);
    });
  });

  it('Format rentang periode untuk UI header terbaca dengan benar', () => {
    const today = new Date(2026, 8, 9);
    expect(formatPeriodRange(today)).toBe('01/09/2026 – 10/09/2026');
  });
});

describe('LocalStorage Migration antar Periode Bulan', () => {
  // Mock localStorage in node environment
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    // Polyfill localStorage if running in node env
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
          for (const k in mockStorage) delete mockStorage[k];
        },
      };
    }
  });

  it('Test 6: Migrasi saved period 2026-09 ke current period 2026-10', () => {
    const septemberDate = new Date(2026, 8, 15);
    const septemberDays = generateCurrentPeriodDays(septemberDate);

    // Andi absen di tanggal 03/09, Budi hadir penuh
    const savedPeople: Person[] = [
      {
        id: 'p-1',
        name: 'Andi',
        attendance: septemberDays.map((d, idx) => ({
          ...d,
          absent: idx === 2, // absen hari ke-3 (03/09)
        })),
      },
      {
        id: 'p-2',
        name: 'Budi',
        attendance: septemberDays.map((d) => ({
          ...d,
          absent: false,
        })),
      },
    ];

    const savedState: AppState = {
      periodKey: '2026-09',
      totalMoney: 1500000,
      people: savedPeople,
    };

    saveAppState(savedState);

    // Sekarang aplikasi dibuka pada Oktober 2026
    const octoberDate = new Date(2026, 9, 5);
    const loadedState = loadAppState(octoberDate);

    // Verifikasi:
    // 1. periodKey diperbarui ke 2026-10
    expect(loadedState.periodKey).toBe('2026-10');
    // 2. totalMoney tetap utuh
    expect(loadedState.totalMoney).toBe(1500000);
    // 3. orang tetap ada (Andi dan Budi)
    expect(loadedState.people).toHaveLength(2);
    expect(loadedState.people[0].name).toBe('Andi');
    expect(loadedState.people[1].name).toBe('Budi');
    // 4. status absensi di-reset ke HADIR (semua absent = false) untuk periode Oktober
    expect(loadedState.people[0].attendance[0].dayLabel).toBe('01/10');
    expect(loadedState.people[0].attendance[2].dayLabel).toBe('03/10');
    expect(loadedState.people[0].attendance[2].absent).toBe(false); // Reset ke HADIR!
    expect(loadedState.people[0].attendance.every((d) => !d.absent)).toBe(true);
    expect(loadedState.people[1].attendance.every((d) => !d.absent)).toBe(true);
  });

  it('Test 7: Tanpa localStorage data awal harus kosong (tidak ada peserta dummy)', () => {
    // Pastikan localStorage kosong
    const freshDate = new Date(2026, 8, 10);
    const loadedState = loadAppState(freshDate);

    expect(loadedState.people).toEqual([]);
    expect(loadedState.people).toHaveLength(0);
    expect(loadedState.periodKey).toBe('2026-09');
    expect(loadedState.totalMoney).toBe(1000000);
  });
});
