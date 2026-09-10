export const ROUNDING_UNIT = 5000;
export const PERIOD_DAYS = 10;

export type AttendanceDay = {
  date: string;     // Format internal: "YYYY-MM-DD"
  dayLabel: string; // Format tampilan UI: "dd/mm" (contoh: "01/09")
  absent: boolean;  // true = TIDAK HADIR, false = HADIR
};

export type Person = {
  id: string;
  name: string;
  attendance: AttendanceDay[]; // Selalu berisi tepat 10 hari
};

export type AppState = {
  periodKey: string; // Format: "YYYY-MM" (misal: "2026-09")
  totalMoney: number;
  people: Person[];
};

export type PersonResult = {
  id: string;
  name: string;
  absentCount: number;
  presentCount: number;
  eligible: boolean; // true jika absentCount === 0 (Hadir Full)
  payment: number;   // Nominal uang integer Rupiah yang diterima
};

export type CalculationResult = {
  totalMoney: number;
  totalPeople: number;
  fullAttendees: number;
  ineligiblePeople: number;
  baseShare: number;
  redistributedPool: number;
  bonusPerFullAttendee: number;
  paymentPerFullAttendee: number;
  distributedTotal: number;
  remainder: number;
  people: PersonResult[];
};

export type ParticipantStatus = 'Hadir Penuh' | 'Absen Sebagian' | 'Tidak Dapat Bagian';

export type DistributionHistoryParticipant = {
  id: string;
  name: string;
  presentDays: number;
  absentDays: number;
  baseShare: number;
  transferredBonus: number;
  received: number;
  status: ParticipantStatus;
};

export type DistributionHistory = {
  id: string;
  periodStart: string; // Format internal ISO: "YYYY-MM-01"
  periodEnd: string;   // Format internal ISO: "YYYY-MM-10"
  periodLabel: string; // Format tampilan UI: "01/09 – 10/09"
  totalDays: number;   // 10

  totalFund: number;
  totalParticipants: number;
  fullAttendance: number;
  absentParticipants: number;

  totalDistributed: number;
  remainder: number;

  participants: DistributionHistoryParticipant[];

  createdAt: string; // ISO string
};

export type HistoryFilter = 'all' | 'this_month' | 'last_month';
export type TabType = 'calculator' | 'recap' | 'history';
