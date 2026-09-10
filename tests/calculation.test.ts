import { describe, it, expect } from 'vitest';
import { calculateDistribution } from '../src/lib/calculation';
import { floorTo5000, formatRupiah, parseRupiahInput } from '../src/lib/currency';
import { generateCurrentPeriodDays } from '../src/lib/dates';
import type { Person } from '../src/types';

function createTestPerson(name: string, absentIndices: number[] = []): Person {
  const baseDays = generateCurrentPeriodDays(new Date(2026, 8, 9));
  const attendance = baseDays.map((day, idx) => ({
    ...day,
    absent: absentIndices.includes(idx),
  }));

  return {
    id: `test-${name}`,
    name,
    attendance,
  };
}

describe('Audit Kalkulasi Sesuai Rumus Spreadsheet', () => {
  it('Scenario A (CONTOH WAJIB): 22 peserta, Rp4.450.000, 7 absen, 15 hadir penuh => Rp295.000 / peserta hadir, Rp0 / absen, sisa Rp25.000', () => {
    // Buat 22 peserta: 7 absen dan 15 hadir penuh
    const people: Person[] = [];
    for (let i = 1; i <= 7; i++) {
      people.push(createTestPerson(`Absen-${i}`, [0])); // absen hari pertama
    }
    for (let i = 1; i <= 15; i++) {
      people.push(createTestPerson(`Hadir-${i}`, [])); // hadir penuh
    }

    const result = calculateDistribution(4450000, people);

    expect(result.totalPeople).toBe(22);
    expect(result.fullAttendees).toBe(15);
    expect(result.ineligiblePeople).toBe(7);
    // Bagian Dasar = FLOOR(4.450.000 / 22; 5000) = Rp200.000
    expect(result.baseShare).toBe(200000);
    // Total Diterima Hadir Penuh = FLOOR(4.450.000 / 15; 5000) = Rp295.000
    expect(result.paymentPerFullAttendee).toBe(295000);
    // Penyesuaian = 295.000 - 200.000 = 95.000
    expect(result.bonusPerFullAttendee).toBe(95000);
    // Total Tersalurkan = 15 * 295.000 = 4.425.000
    expect(result.distributedTotal).toBe(4425000);
    // Sisa Dana = 4.450.000 - 4.425.000 = Rp25.000
    expect(result.remainder).toBe(25000);
    // Invariant: Total Dibagikan + Remainder = Total Dana
    expect(result.distributedTotal + result.remainder).toBe(4450000);

    result.people.forEach((p) => {
      if (p.name.startsWith('Hadir')) {
        expect(p.eligible).toBe(true);
        expect(p.payment).toBe(295000);
      } else {
        expect(p.eligible).toBe(false);
        expect(p.payment).toBe(0);
      }
    });
  });

  it('Scenario B: 5 peserta, Rp1.000.000, semua hadir => Rp200.000 / peserta, sisa Rp0', () => {
    const people = ['Andi', 'Budi', 'Cici', 'Dedi', 'Eko'].map((n) =>
      createTestPerson(n, [])
    );
    const result = calculateDistribution(1000000, people);

    expect(result.totalPeople).toBe(5);
    expect(result.fullAttendees).toBe(5);
    expect(result.ineligiblePeople).toBe(0);
    expect(result.baseShare).toBe(200000);
    expect(result.paymentPerFullAttendee).toBe(200000);
    expect(result.bonusPerFullAttendee).toBe(0);
    expect(result.distributedTotal).toBe(1000000);
    expect(result.remainder).toBe(0);
    expect(result.distributedTotal + result.remainder).toBe(1000000);

    result.people.forEach((p) => {
      expect(p.payment).toBe(200000);
      expect(p.eligible).toBe(true);
    });
  });

  it('Scenario C (Generic Combination): 7 peserta, Rp1.000.000, 2 absen, 5 hadir => Rp200.000 / peserta, sisa Rp0', () => {
    const people = [
      createTestPerson('A1', [0]),
      createTestPerson('A2', [5, 6]),
      createTestPerson('F1', []),
      createTestPerson('F2', []),
      createTestPerson('F3', []),
      createTestPerson('F4', []),
      createTestPerson('F5', []),
    ];
    const result = calculateDistribution(1000000, people);

    expect(result.totalPeople).toBe(7);
    expect(result.fullAttendees).toBe(5);
    expect(result.ineligiblePeople).toBe(2);
    // Bagian Dasar = FLOOR(1.000.000 / 7; 5000) = 140.000
    expect(result.baseShare).toBe(140000);
    // Total Diterima = FLOOR(1.000.000 / 5; 5000) = 200.000
    expect(result.paymentPerFullAttendee).toBe(200000);
    // Penyesuaian = 200.000 - 140.000 = 60.000
    expect(result.bonusPerFullAttendee).toBe(60000);
    // Total Dibagikan = 5 * 200.000 = 1.000.000
    expect(result.distributedTotal).toBe(1000000);
    expect(result.remainder).toBe(0);
    expect(result.distributedTotal + result.remainder).toBe(1000000);

    result.people.forEach((p) => {
      if (p.name.startsWith('F')) {
        expect(p.payment).toBe(200000);
        expect(p.eligible).toBe(true);
      } else {
        expect(p.payment).toBe(0);
        expect(p.eligible).toBe(false);
      }
    });
  });

  it('Scenario D (Generic Combination dengan Sisa): 18 peserta, Rp5.000.000, 4 absen, 14 hadir => Rp355.000 / peserta, sisa Rp30.000', () => {
    const people: Person[] = [];
    for (let i = 1; i <= 4; i++) {
      people.push(createTestPerson(`Absen-${i}`, [i]));
    }
    for (let i = 1; i <= 14; i++) {
      people.push(createTestPerson(`Hadir-${i}`, []));
    }

    const result = calculateDistribution(5000000, people);

    expect(result.totalPeople).toBe(18);
    expect(result.fullAttendees).toBe(14);
    expect(result.ineligiblePeople).toBe(4);
    // FLOOR(5.000.000 / 18; 5000) = 275.000
    expect(result.baseShare).toBe(275000);
    // FLOOR(5.000.000 / 14; 5000) = 355.000
    expect(result.paymentPerFullAttendee).toBe(355000);
    expect(result.bonusPerFullAttendee).toBe(80000);
    // 14 * 355.000 = 4.970.000
    expect(result.distributedTotal).toBe(4970000);
    expect(result.remainder).toBe(30000);
    expect(result.distributedTotal + result.remainder).toBe(5000000);
  });

  it('Edge Case 1: 0 orang => safe empty result tanpa error atau NaN', () => {
    const result = calculateDistribution(1000000, []);

    expect(result.totalPeople).toBe(0);
    expect(result.fullAttendees).toBe(0);
    expect(result.baseShare).toBe(0);
    expect(result.distributedTotal).toBe(0);
    expect(result.remainder).toBe(1000000);
    expect(result.people).toHaveLength(0);
  });

  it('Edge Case 2: 1 orang hadir, Rp1.000.000 => Rp1.000.000, sisa Rp0', () => {
    const people = [createTestPerson('Solo', [])];
    const result = calculateDistribution(1000000, people);

    expect(result.fullAttendees).toBe(1);
    expect(result.baseShare).toBe(1000000);
    expect(result.paymentPerFullAttendee).toBe(1000000);
    expect(result.distributedTotal).toBe(1000000);
    expect(result.remainder).toBe(0);
    expect(result.people[0].payment).toBe(1000000);
  });

  it('Edge Case 3: 1 orang absen, Rp1.000.000 => Rp0, sisa Rp1.000.000', () => {
    const people = [createTestPerson('Solo', [1])];
    const result = calculateDistribution(1000000, people);

    expect(result.fullAttendees).toBe(0);
    expect(result.ineligiblePeople).toBe(1);
    expect(result.distributedTotal).toBe(0);
    expect(result.remainder).toBe(1000000);
    expect(result.people[0].payment).toBe(0);
  });

  it('Edge Case 4: Semua orang absen => semua Rp0, sisa = total uang', () => {
    const people = [
      createTestPerson('A', [0]),
      createTestPerson('B', [1]),
      createTestPerson('C', [2]),
    ];
    const result = calculateDistribution(600000, people);

    expect(result.fullAttendees).toBe(0);
    expect(result.ineligiblePeople).toBe(3);
    expect(result.distributedTotal).toBe(0);
    expect(result.remainder).toBe(600000);
    result.people.forEach((p) => {
      expect(p.payment).toBe(0);
      expect(p.eligible).toBe(false);
    });
  });

  it('Edge Case 5: Total uang Rp0 => semua Rp0, sisa Rp0', () => {
    const people = ['A', 'B', 'C'].map((n) => createTestPerson(n, []));
    const result = calculateDistribution(0, people);

    expect(result.totalMoney).toBe(0);
    expect(result.baseShare).toBe(0);
    expect(result.bonusPerFullAttendee).toBe(0);
    expect(result.paymentPerFullAttendee).toBe(0);
    expect(result.distributedTotal).toBe(0);
    expect(result.remainder).toBe(0);
    result.people.forEach((p) => {
      expect(p.payment).toBe(0);
    });
  });

  it('Edge Case 6: Total < Rp5.000 (Rp4.999) => semua Rp0, sisa Rp4.999', () => {
    const people = ['A', 'B', 'C'].map((n) => createTestPerson(n, []));
    const result = calculateDistribution(4999, people);

    expect(result.baseShare).toBe(0);
    expect(result.paymentPerFullAttendee).toBe(0);
    expect(result.distributedTotal).toBe(0);
    expect(result.remainder).toBe(4999);
  });

  it('Verifikasi Non-Proporsional: Hadir 9/10, 8/10, 5/10, 1/10 tetap Rp0', () => {
    const people = [
      createTestPerson('Hadir9', [0]),
      createTestPerson('Hadir8', [0, 1]),
      createTestPerson('Hadir5', [0, 1, 2, 3, 4]),
      createTestPerson('Hadir1', [0, 1, 2, 3, 4, 5, 6, 7, 8]),
      createTestPerson('HadirFull', []),
    ];
    const result = calculateDistribution(1000000, people);

    expect(result.fullAttendees).toBe(1);
    expect(result.ineligiblePeople).toBe(4);

    const nonFull = result.people.filter((p) => p.name !== 'HadirFull');
    nonFull.forEach((p) => {
      expect(p.eligible).toBe(false);
      expect(p.payment).toBe(0);
    });

    const full = result.people.find((p) => p.name === 'HadirFull')!;
    expect(full.eligible).toBe(true);
    expect(full.payment).toBeGreaterThan(0);
  });
});

describe('Audit Pembulatan floorTo5000 & Currency Formatting', () => {
  it('Memastikan aturan pembulatan turun kelipatan Rp5.000 sesuai contoh audit', () => {
    expect(floorTo5000(142857.14)).toBe(140000);
    expect(floorTo5000(56000)).toBe(55000);
    expect(floorTo5000(4999)).toBe(0);
    expect(floorTo5000(5000)).toBe(5000);
    expect(floorTo5000(5001)).toBe(5000);
    expect(floorTo5000(9999)).toBe(5000);
    expect(floorTo5000(10000)).toBe(10000);
    expect(floorTo5000(0)).toBe(0);
    expect(floorTo5000(-5000)).toBe(0);
  });

  it('Format Rupiah konsisten tanpa spasi ganda atau format asing', () => {
    expect(formatRupiah(1000000)).toBe('Rp1.000.000');
    expect(formatRupiah(250000)).toBe('Rp250.000');
    expect(formatRupiah(195000)).toBe('Rp195.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(25000)).toBe('Rp25.000');
  });

  it('Parse input Rupiah fleksibel dan aman', () => {
    expect(parseRupiahInput('1000000')).toBe(1000000);
    expect(parseRupiahInput('Rp 1.000.000')).toBe(1000000);
    expect(parseRupiahInput('Rp. 250.000,00')).toBe(25000000); // strip non-digit
    expect(parseRupiahInput('abc')).toBe(0);
    expect(parseRupiahInput('')).toBe(0);
  });
});
