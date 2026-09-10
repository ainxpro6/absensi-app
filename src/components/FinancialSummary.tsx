import React, { useState, useEffect } from 'react';
import type { CalculationResult } from '../types';
import { formatRupiah, parseRupiahInput } from '../lib/currency';
import { PieChart, Award, Hourglass, Info, CheckCircle2 } from 'lucide-react';

interface FinancialSummaryProps {
  totalMoney: number;
  result: CalculationResult;
  onMoneyChange: (val: number) => void;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalMoney,
  result,
  onMoneyChange,
}) => {
  // Format input with live dot separators: e.g. "1.000.000"
  const formatInputDisplay = (val: number) => {
    if (!val) return '';
    return val.toLocaleString('id-ID');
  };

  const [displayValue, setDisplayValue] = useState<string>(formatInputDisplay(totalMoney));

  useEffect(() => {
    setDisplayValue(formatInputDisplay(totalMoney));
  }, [totalMoney]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseRupiahInput(raw);
    setDisplayValue(raw);
    onMoneyChange(parsed);
  };

  const handleBlur = () => {
    setDisplayValue(formatInputDisplay(totalMoney));
  };

  const addAmount = (delta: number) => {
    onMoneyChange(Math.max(0, totalMoney + delta));
  };

  const setExactAmount = (amount: number) => {
    onMoneyChange(amount);
  };

  // Formula string for base share
  const baseFormulaText = result.totalPeople > 0
    ? `floor((${formatRupiah(result.totalMoney)} / ${result.totalPeople}) / 5rb) × 5rb`
    : 'Belum ada peserta';

  return (
    <section className="bento-grid">
      {/* 1. Input Total Dana Kas (T) */}
      <div className="bento-card">
        <div>
          <div className="bento-card-header">
            <label htmlFor="input-total-money" className="bento-card-label">
              Total Dana Kas (T)
            </label>
            <span className="font-label-sm text-primary flex items-center gap-1">
              <span className="save-pulse-dot"></span> Terbuka
            </span>
          </div>

          <div className="money-input-box">
            <span className="money-prefix">Rp</span>
            <input
              id="input-total-money"
              type="text"
              inputMode="numeric"
              className="money-input-field"
              placeholder="1.000.000"
              value={displayValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              aria-label="Total Dana Kas yang dibagikan"
            />
          </div>

          <div className="quick-presets-grid">
            <button
              type="button"
              className="btn-preset"
              onClick={() => addAmount(100000)}
              title="Tambah Rp100.000"
            >
              +100rb
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => addAmount(500000)}
              title="Tambah Rp500.000"
            >
              +500rb
            </button>
            <button
              type="button"
              className="btn-preset"
              onClick={() => addAmount(1000000)}
              title="Tambah Rp1.000.000"
            >
              +1jt
            </button>
            <button
              type="button"
              className="btn-preset btn-preset-accent"
              onClick={() => setExactAmount(1000000)}
              title="Atur Rp1.000.000 Pas"
            >
              1jt Pas
            </button>
          </div>
        </div>

        <p className="font-body-sm text-on-surface-variant" style={{ marginTop: '0.75rem' }}>
          Minimal dana valid: Rp5.000
        </p>
      </div>

      {/* 2. Bagian Dasar / Org */}
      <div className="bento-card">
        <div className="bento-card-header">
          <span className="bento-card-label">Bagian Dasar / Org</span>
          <PieChart size={18} className="text-tertiary" />
        </div>

        <div>
          <div className="font-numeric-stat" style={{ color: 'var(--on-surface)' }}>
            {formatRupiah(result.baseShare)}
          </div>
          <p className="font-body-sm text-on-surface-variant" style={{ marginTop: '0.2rem' }}>
            {baseFormulaText}
          </p>
        </div>

        <div className="flex items-center gap-1 font-label-sm text-tertiary">
          <Info size={14} />
          <span>Dihitung dari total seluruh peserta</span>
        </div>
      </div>

      {/* 3. Diterima / Orang Full (Highlight Master) */}
      <div className="bento-card bento-card-highlight">
        <div className="highlight-ambient" aria-hidden="true"></div>

        <div className="bento-card-header">
          <span className="bento-card-label highlight-label">Diterima / Orang Full</span>
          <Award size={20} className="text-on-primary-container" />
        </div>

        <div>
          <div className="highlight-value">
            {formatRupiah(result.paymentPerFullAttendee)}
          </div>
          <p className="highlight-desc">
            {formatRupiah(result.baseShare)} + {formatRupiah(result.bonusPerFullAttendee)} (Bonus)
          </p>
        </div>

        <div className="highlight-footer">
          <span>{result.fullAttendees} dari {result.totalPeople} peserta hadir full</span>
          <CheckCircle2 size={16} />
        </div>
      </div>

      {/* 4. Sisa Tidak Terbagi */}
      <div className="bento-card">
        <div className="bento-card-header">
          <span className="bento-card-label">Sisa Tidak Terbagi</span>
          <Hourglass size={18} className="text-tertiary" />
        </div>

        <div>
          <div className="font-numeric-stat" style={{ color: 'var(--on-surface)' }}>
            {formatRupiah(result.remainder)}
          </div>
          <p className="font-body-sm text-on-surface-variant" style={{ marginTop: '0.2rem' }}>
            Sisa pembulatan ke kas berikutnya
          </p>
        </div>

        <div className="flex items-center justify-between font-label-sm">
          <span className="text-on-surface-variant">
            Tersalurkan: {formatRupiah(result.distributedTotal)}
          </span>
          <span className={`badge-sisa ${result.remainder > 0 ? 'badge-sisa-active' : 'badge-sisa-zero'}`}>
            {result.remainder > 0 ? 'Ada Sisa Uang' : 'Habis Terbagi'}
          </span>
        </div>
      </div>
    </section>
  );
};
