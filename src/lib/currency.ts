import { ROUNDING_UNIT } from '../types';

/**
 * Pembulatan turun ke kelipatan Rp5.000.
 * Aturan PRD: floor((nilai / 5000)) * 5000
 */
export function floorTo5000(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value / ROUNDING_UNIT) * ROUNDING_UNIT;
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format angka integer ke string Rupiah (contoh: Rp1.000.000).
 */
export function formatRupiah(value: number): string {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  // Intl format sering menghasilkan "Rp 1.000.000" dengan spasi; kita standarkan menjadi "Rp" tanpa spasi berlebih
  return rupiahFormatter.format(safeValue).replace(/\s+/g, '');
}

/**
 * Parse input string dari user menjadi integer Rupiah.
 */
export function parseRupiahInput(input: string): number {
  const cleaned = input.replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
