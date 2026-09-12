import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCurrentPeriodDays,
  getCurrentPeriodKey,
  formatPeriodRange,
  getPeriodInfo,
} from '../src/lib/dates';
import { loadAppState, saveAppState } from '../src/lib/storage';
import type { AppState, Person } from '../src/types';

describe('Date Utilities — Aturan 3 Periode Berdasarkan Local Date (TODAY)', () => {
  it('Kondisi Sekarang: 12 September 2026 menghasilkan Periode 2 (11/09/2026 – 20/09/2026)', () => {
    // Note: month index 8 adalah September (0-indexed)
    const today = new Date(2026, 8, 12);
    expect(formatPeriodRange(today)).toBe('11/09/2026 – 20/09/2026');
    expect(getCurrentPeriodKey(today)).toBe('2026-09-P2');

    const info = getPeriodInfo(today);
    expect(info.startDay).toBe(11);
    expect(info.endDay).toBe(20);
    expect(info.periodNumber).toBe(2);
    expect(info.totalDays).toBe(10);
    expect(info.startDate).toBe('2026-09-11');
    expect(info.endDate).toBe('2026-09-20');

    const days = generateCurrentPeriodDays(today);
    expect(days).toHaveLength(10);
    expect(days[0].dayLabel).toBe('11/09');
    expect(days[0].date).toBe('2026-09-11');
    expect(days[9].dayLabel).toBe('20/09');
    expect(days[9].date).toBe('2026-09-20');
  });

  describe('Boundary Tests Periode 1 (Tanggal 1 – 10)', () => {
    it('Day 1 (01 September 2026) -> Periode 01/09/2026 – 10/09/2026', () => {
      const d1 = new Date(2026, 8, 1);
      expect(formatPeriodRange(d1)).toBe('01/09/2026 – 10/09/2026');
      expect(getCurrentPeriodKey(d1)).toBe('2026-09-P1');
      const days = generateCurrentPeriodDays(d1);
      expect(days).toHaveLength(10);
      expect(days[0].dayLabel).toBe('01/09');
      expect(days[9].dayLabel).toBe('10/09');
    });

    it('Day 10 (10 September 2026) -> Periode 01/09/2026 – 10/09/2026', () => {
      const d10 = new Date(2026, 8, 10);
      expect(formatPeriodRange(d10)).toBe('01/09/2026 – 10/09/2026');
      expect(getCurrentPeriodKey(d10)).toBe('2026-09-P1');
      const days = generateCurrentPeriodDays(d10);
      expect(days).toHaveLength(10);
      expect(days[0].dayLabel).toBe('01/09');
      expect(days[9].dayLabel).toBe('10/09');
    });
  });

  describe('Boundary Tests Periode 2 (Tanggal 11 – 20)', () => {
    it('Day 11 (11 September 2026) -> Periode 11/09/2026 – 20/09/2026', () => {
      const d11 = new Date(2026, 8, 11);
      expect(formatPeriodRange(d11)).toBe('11/09/2026 – 20/09/2026');
      expect(getCurrentPeriodKey(d11)).toBe('2026-09-P2');
      const days = generateCurrentPeriodDays(d11);
      expect(days).toHaveLength(10);
      expect(days[0].dayLabel).toBe('11/09');
      expect(days[9].dayLabel).toBe('20/09');
    });

    it('Day 20 (20 September 2026) -> Periode 11/09/2026 – 20/09/2026', () => {
      const d20 = new Date(2026, 8, 20);
      expect(formatPeriodRange(d20)).toBe('11/09/2026 – 20/09/2026');
      expect(getCurrentPeriodKey(d20)).toBe('2026-09-P2');
      const days = generateCurrentPeriodDays(d20);
      expect(days).toHaveLength(10);
      expect(days[0].dayLabel).toBe('11/09');
      expect(days[9].dayLabel).toBe('20/09');
    });
  });

  describe('Boundary Tests Periode 3 (Tanggal 21 – Akhir Bulan Dinamis)', () => {
    it('Day 21 (21 September 2026) -> Periode 21/09/2026 – 30/09/2026', () => {
      const d21 = new Date(2026, 8, 21);
      expect(formatPeriodRange(d21)).toBe('21/09/2026 – 30/09/2026');
      expect(getCurrentPeriodKey(d21)).toBe('2026-09-P3');
      const days = generateCurrentPeriodDays(d21);
      expect(days).toHaveLength(10);
      expect(days[0].dayLabel).toBe('21/09');
      expect(days[9].dayLabel).toBe('30/09');
    });

    it('Last Day of September (30 September 2026) -> Periode 21/09/2026 – 30/09/2026', () => {
      const d30Sep = new Date(2026, 8, 30);
      expect(formatPeriodRange(d30Sep)).toBe('21/09/2026 – 30/09/2026');
      expect(getCurrentPeriodKey(d30Sep)).toBe('2026-09-P3');
      const days = generateCurrentPeriodDays(d30Sep);
      expect(days).toHaveLength(10);
      expect(days[9].dayLabel).toBe('30/09');
    });

    it('Last Day of October (31 Oktober 2026) -> Periode 21/10/2026 – 31/10/2026 (11 hari)', () => {
      const d31Oct = new Date(2026, 9, 31);
      expect(formatPeriodRange(d31Oct)).toBe('21/10/2026 – 31/10/2026');
      expect(getCurrentPeriodKey(d31Oct)).toBe('2026-10-P3');
      const days = generateCurrentPeriodDays(d31Oct);
      expect(days).toHaveLength(11);
      expect(days[0].dayLabel).toBe('21/10');
      expect(days[10].dayLabel).toBe('31/10');
    });

    it('February 2026 (28 Februari 2026, non-kabisat) -> Periode 21/02/2026 – 28/02/2026 (8 hari)', () => {
      const d28Feb = new Date(2026, 1, 28);
      expect(formatPeriodRange(d28Feb)).toBe('21/02/2026 – 28/02/2026');
      expect(getCurrentPeriodKey(d28Feb)).toBe('2026-02-P3');
      const days = generateCurrentPeriodDays(d28Feb);
      expect(days).toHaveLength(8);
      expect(days[0].dayLabel).toBe('21/02');
      expect(days[7].dayLabel).toBe('28/02');
    });

    it('February 2028 (29 Februari 2028, tahun kabisat) -> Periode 21/02/2028 – 29/02/2028 (9 hari)', () => {
      const d29FebLeap = new Date(2028, 1, 29);
      expect(formatPeriodRange(d29FebLeap)).toBe('21/02/2028 – 29/02/2028');
      expect(getCurrentPeriodKey(d29FebLeap)).toBe('2028-02-P3');
      const days = generateCurrentPeriodDays(d29FebLeap);
      expect(days).toHaveLength(9);
      expect(days[0].dayLabel).toBe('21/02');
      expect(days[8].dayLabel).toBe('29/02');
    });
  });

  describe('Month Transition Tests', () => {
    it('Transisi bulan: 30 September -> 01 Oktober', () => {
      const d30Sep = new Date(2026, 8, 30);
      const d01Oct = new Date(2026, 9, 1);

      expect(formatPeriodRange(d30Sep)).toBe('21/09/2026 – 30/09/2026');
      expect(formatPeriodRange(d01Oct)).toBe('01/10/2026 – 10/10/2026');
      expect(getCurrentPeriodKey(d30Sep)).toBe('2026-09-P3');
      expect(getCurrentPeriodKey(d01Oct)).toBe('2026-10-P1');
    });

    it('Transisi tahun baru: 31 Desember 2026 -> 01 Januari 2027', () => {
      const d31Dec = new Date(2026, 11, 31);
      const d01Jan = new Date(2027, 0, 1);

      expect(formatPeriodRange(d31Dec)).toBe('21/12/2026 – 31/12/2026');
      expect(formatPeriodRange(d01Jan)).toBe('01/01/2027 – 10/01/2027');
      expect(getCurrentPeriodKey(d31Dec)).toBe('2026-12-P3');
      expect(getCurrentPeriodKey(d01Jan)).toBe('2027-01-P1');
    });
  });

  describe('Format String Validation', () => {
    it('Pastikan dayLabel selalu berformat dd/mm', () => {
      const today = new Date(2026, 3, 15); // 15 April 2026
      const days = generateCurrentPeriodDays(today);

      const ddmmRegex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/;
      days.forEach((day) => {
        expect(day.dayLabel).toMatch(ddmmRegex);
      });
    });

    it('Pastikan date selalu berformat YYYY-MM-DD', () => {
      const today = new Date(2026, 8, 12);
      const days = generateCurrentPeriodDays(today);

      expect(days[0].date).toBe('2026-09-11');
      expect(days[9].date).toBe('2026-09-20');

      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      days.forEach((day) => {
        expect(day.date).toMatch(isoDateRegex);
      });
    });
  });
});

describe('LocalStorage Migration antar Periode', () => {
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
          for (const k in mockStorage) delete mockStorage[k];
        },
      };
    }
  });

  it('Migrasi dari Periode 1 ke Periode 2 dalam bulan yang sama (10 -> 11 September)', () => {
    const p1Date = new Date(2026, 8, 10); // 10 September (Periode 1)
    const p1Days = generateCurrentPeriodDays(p1Date);

    const savedPeople: Person[] = [
      {
        id: 'p-1',
        name: 'Andi',
        attendance: p1Days.map((d, idx) => ({ ...d, absent: idx === 1 })),
      },
      {
        id: 'p-2',
        name: 'Budi',
        attendance: p1Days.map((d) => ({ ...d, absent: false })),
      },
    ];

    const savedState: AppState = {
      periodKey: '2026-09-P1',
      totalMoney: 1500000,
      people: savedPeople,
    };

    saveAppState(savedState);

    // Sekarang aplikasi dibuka pada 11 September (Periode 2)
    const p2Date = new Date(2026, 8, 11);
    const loadedState = loadAppState(p2Date);

    // Verifikasi migrasi:
    expect(loadedState.periodKey).toBe('2026-09-P2');
    expect(loadedState.totalMoney).toBe(1500000);
    expect(loadedState.people).toHaveLength(2);
    expect(loadedState.people[0].name).toBe('Andi');
    expect(loadedState.people[1].name).toBe('Budi');
    // Tanggal baru Periode 2 (11/09 - 20/09)
    expect(loadedState.people[0].attendance[0].dayLabel).toBe('11/09');
    expect(loadedState.people[0].attendance[9].dayLabel).toBe('20/09');
    // Absensi di-reset ke HADIR (absent = false)
    expect(loadedState.people[0].attendance.every((d) => !d.absent)).toBe(true);
    expect(loadedState.people[1].attendance.every((d) => !d.absent)).toBe(true);
  });

  it('Migrasi dari Periode 2 ke Periode 3 dalam bulan yang sama (20 -> 21 September)', () => {
    const p2Date = new Date(2026, 8, 20);
    const p2Days = generateCurrentPeriodDays(p2Date);

    const savedState: AppState = {
      periodKey: '2026-09-P2',
      totalMoney: 2000000,
      people: [
        {
          id: 'p-1',
          name: 'Candra',
          attendance: p2Days.map((d) => ({ ...d, absent: false })),
        },
      ],
    };

    saveAppState(savedState);

    const p3Date = new Date(2026, 8, 21);
    const loadedState = loadAppState(p3Date);

    expect(loadedState.periodKey).toBe('2026-09-P3');
    expect(loadedState.people[0].attendance[0].dayLabel).toBe('21/09');
    expect(loadedState.people[0].attendance[9].dayLabel).toBe('30/09');
  });

  it('Migrasi dari Periode 3 ke Periode 1 bulan berikutnya (30 September -> 01 Oktober)', () => {
    const p3Date = new Date(2026, 8, 30);
    const p3Days = generateCurrentPeriodDays(p3Date);

    const savedState: AppState = {
      periodKey: '2026-09-P3',
      totalMoney: 1200000,
      people: [
        {
          id: 'p-1',
          name: 'Dewi',
          attendance: p3Days.map((d, idx) => ({ ...d, absent: idx === 0 })),
        },
      ],
    };

    saveAppState(savedState);

    const octDate = new Date(2026, 9, 1);
    const loadedState = loadAppState(octDate);

    expect(loadedState.periodKey).toBe('2026-10-P1');
    expect(loadedState.totalMoney).toBe(1200000);
    expect(loadedState.people[0].attendance[0].dayLabel).toBe('01/10');
    expect(loadedState.people[0].attendance[9].dayLabel).toBe('10/10');
    expect(loadedState.people[0].attendance.every((d) => !d.absent)).toBe(true);
  });

  it('Migrasi dari format legacy YYYY-MM ke format baru YYYY-MM-PX', () => {
    const legacyState: AppState = {
      periodKey: '2026-09',
      totalMoney: 1000000,
      people: [
        {
          id: 'p-1',
          name: 'Eko',
          attendance: [],
        },
      ],
    };

    saveAppState(legacyState);

    // Dibuka pada 12 September 2026
    const today = new Date(2026, 8, 12);
    const loadedState = loadAppState(today);

    expect(loadedState.periodKey).toBe('2026-09-P2');
    expect(loadedState.people[0].name).toBe('Eko');
    expect(loadedState.people[0].attendance).toHaveLength(10);
    expect(loadedState.people[0].attendance[0].dayLabel).toBe('11/09');
    expect(loadedState.people[0].attendance[9].dayLabel).toBe('20/09');
  });

  it('Tanpa localStorage data awal harus kosong (tidak ada peserta dummy)', () => {
    const freshDate = new Date(2026, 8, 12);
    const loadedState = loadAppState(freshDate);

    expect(loadedState.people).toEqual([]);
    expect(loadedState.people).toHaveLength(0);
    expect(loadedState.periodKey).toBe('2026-09-P2');
    expect(loadedState.totalMoney).toBe(1000000);
  });
});
