import React, { useState } from 'react';
import type { CalculationResult } from '../types';
import { formatRupiah } from '../lib/currency';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';

interface CalculationTransparencyProps {
  result: CalculationResult;
}

export const CalculationTransparency: React.FC<CalculationTransparencyProps> = ({ result }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="transparency-card">
      <button
        type="button"
        className="transparency-header-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-tertiary" />
          <span className="font-headline-sm font-bold">Rincian Perhitungan Matematis</span>
        </div>
        <div className="flex items-center gap-1 font-label-md text-tertiary">
          <span>{isOpen ? 'Tutup Rincian' : 'Buka Rincian'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="transparency-content">
          {/* Step 1: Bagian Dasar */}
          <div className="step-card">
            <div className="step-left">
              <span className="step-num">1</span>
              <div>
                <strong className="font-label-md text-on-surface">Bagian Dasar Awal:</strong>
                <p className="step-formula">
                  floor(({formatRupiah(result.totalMoney)} ÷ {result.totalPeople || 1}) / 5.000) × 5.000
                </p>
              </div>
            </div>
            <span className="step-val">{formatRupiah(result.baseShare)} / orang</span>
          </div>

          {/* Step 2: Pool Pengalihan */}
          <div className="step-card">
            <div className="step-left">
              <span className="step-num">2</span>
              <div>
                <strong className="font-label-md text-on-surface">Pool Dana Pengalihan:</strong>
                <p className="step-formula">
                  {formatRupiah(result.baseShare)} × {result.ineligiblePeople} orang yang absen
                </p>
              </div>
            </div>
            <span className="step-val">{formatRupiah(result.redistributedPool)}</span>
          </div>

          {/* Step 3: Bonus Peserta Full */}
          <div className="step-card">
            <div className="step-left">
              <span className="step-num">3</span>
              <div>
                <strong className="font-label-md text-on-surface">Bonus per Peserta Hadir Penuh:</strong>
                <p className="step-formula">
                  {result.fullAttendees > 0
                    ? `floor((${formatRupiah(result.redistributedPool)} ÷ ${result.fullAttendees}) / 5.000) × 5.000`
                    : 'Tidak ada penerima hadir penuh'}
                </p>
              </div>
            </div>
            <span className="step-val" style={{ color: 'var(--tertiary)' }}>
              +{formatRupiah(result.bonusPerFullAttendee)} / orang
            </span>
          </div>

          {/* Step 4: Total Diterima / Orang */}
          <div className="step-card">
            <div className="step-left">
              <span className="step-num">4</span>
              <div>
                <strong className="font-label-md text-on-surface">Total Diterima Peserta Full:</strong>
                <p className="step-formula">
                  {formatRupiah(result.baseShare)} (Dasar) + {formatRupiah(result.bonusPerFullAttendee)} (Bonus)
                </p>
              </div>
            </div>
            <span className="step-val" style={{ color: 'var(--primary)' }}>
              {formatRupiah(result.paymentPerFullAttendee)} / orang
            </span>
          </div>

          {/* Step 5: Sisa Dana */}
          <div className="step-card">
            <div className="step-left">
              <span className="step-num">5</span>
              <div>
                <strong className="font-label-md text-on-surface">Sisa Uang Tidak Terbagi:</strong>
                <p className="step-formula">
                  {formatRupiah(result.totalMoney)} (Total) - {formatRupiah(result.distributedTotal)} (Tersalurkan)
                </p>
              </div>
            </div>
            <span className="step-val">{formatRupiah(result.remainder)}</span>
          </div>
        </div>
      )}
    </section>
  );
};
