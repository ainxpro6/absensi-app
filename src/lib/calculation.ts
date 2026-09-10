import type { Person, CalculationResult, PersonResult } from '../types';
import { PERIOD_DAYS } from '../types';
import { floorTo5000 } from './currency';

/**
 * Fungsi kalkulasi pembagian murni (pure function).
 * Mengimplementasikan aturan:
 * - Pembagian dasar dihitung dari Total Uang dibagi seluruh orang (N), dibulatkan turun ke Rp5.000.
 * - Seseorang dinyatakan tidak berhak (eligible = false) jika absen >= 1 hari.
 * - Hak dasar orang yang tidak hadir dialihkan ke pool redistribusi.
 * - Pool redistribusi dibagi rata ke orang yang hadir full (F), dibulatkan turun ke Rp5.000.
 * - Sisa uang = Total Uang - Total yang dibagikan.
 */
export function calculateDistribution(
  totalMoney: number,
  people: Person[]
): CalculationResult {
  const safeTotalMoney = Number.isFinite(totalMoney) && totalMoney > 0 ? Math.floor(totalMoney) : 0;
  const totalPeople = people.length;

  if (totalPeople === 0) {
    return {
      totalMoney: safeTotalMoney,
      totalPeople: 0,
      fullAttendees: 0,
      ineligiblePeople: 0,
      baseShare: 0,
      redistributedPool: 0,
      bonusPerFullAttendee: 0,
      paymentPerFullAttendee: 0,
      distributedTotal: 0,
      remainder: safeTotalMoney,
      people: [],
    };
  }

  // 1. Pembagian awal (Bagian Dasar) = FLOOR($B$25/$K$25; 5000)
  const baseShare = floorTo5000(safeTotalMoney / totalPeople);

  // 2. Evaluasi absensi per orang
  // Peserta yang memiliki absen >= 1 hari mendapatkan Rp0 (N >= 1 => Rp0)
  const evaluatedPeople = people.map((person) => {
    const totalDays = person.attendance.length || PERIOD_DAYS;
    const absentCount = person.attendance.filter((day) => day.absent).length;
    const presentCount = totalDays - absentCount;
    const eligible = absentCount === 0;

    return {
      id: person.id,
      name: person.name,
      absentCount,
      presentCount,
      eligible,
    };
  });

  const fullAttendees = evaluatedPeople.filter((p) => p.eligible).length; // B28 = COUNTIF(N2:N23; 0)
  const ineligiblePeople = totalPeople - fullAttendees;

  // 3. Bagian Peserta Absen (B27 = SUM(P2:P23)) = Rp0 (setiap peserta absen mendapat Rp0)
  const totalAbsentShare = 0;

  // 4. Total Diterima Peserta Hadir Penuh = FLOOR(($B$25 - $B$27) / $B$28; 5000)
  let paymentPerFullAttendee = 0;
  let bonusPerFullAttendee = 0;
  let redistributedPool = 0;
  let distributedTotal = 0;

  if (fullAttendees > 0) {
    paymentPerFullAttendee = floorTo5000((safeTotalMoney - totalAbsentShare) / fullAttendees);
    bonusPerFullAttendee = Math.max(0, paymentPerFullAttendee - baseShare);
    redistributedPool = bonusPerFullAttendee * fullAttendees;
    distributedTotal = paymentPerFullAttendee * fullAttendees;
  }

  const remainder = safeTotalMoney - distributedTotal;

  const peopleResults: PersonResult[] = evaluatedPeople.map((person) => ({
    id: person.id,
    name: person.name,
    absentCount: person.absentCount,
    presentCount: person.presentCount,
    eligible: person.eligible,
    payment: person.eligible ? paymentPerFullAttendee : 0,
  }));

  return {
    totalMoney: safeTotalMoney,
    totalPeople,
    fullAttendees,
    ineligiblePeople,
    baseShare,
    redistributedPool,
    bonusPerFullAttendee,
    paymentPerFullAttendee,
    distributedTotal,
    remainder,
    people: peopleResults,
  };
}
