import React from 'react';
import type { CalculationResult } from '../types';
import { formatRupiah } from '../lib/currency';

interface SecondaryMetricsProps {
  result: CalculationResult;
}

export const SecondaryMetrics: React.FC<SecondaryMetricsProps> = ({ result }) => {
  return (
    <section className="secondary-metrics-bar" aria-label="Ringkasan Partisipasi Peserta">
      <div className="metric-column">
        <span className="metric-col-label">Total Peserta (N)</span>
        <span className="metric-col-value">{result.totalPeople} Orang</span>
      </div>

      <div className="metric-column">
        <span className="metric-col-label">Hadir Penuh (10/10)</span>
        <span className="metric-col-value" style={{ color: 'var(--primary)' }}>
          {result.fullAttendees} Orang
        </span>
      </div>

      <div className="metric-column">
        <span className="metric-col-label">Absen (≥1 Hari)</span>
        <span className="metric-col-value" style={{ color: 'var(--error)' }}>
          {result.ineligiblePeople} Orang
        </span>
      </div>

      <div className="metric-column">
        <span className="metric-col-label">Bonus Dialihkan / Org</span>
        <span className="metric-col-value" style={{ color: 'var(--tertiary)' }}>
          +{formatRupiah(result.bonusPerFullAttendee)}
        </span>
      </div>
    </section>
  );
};
