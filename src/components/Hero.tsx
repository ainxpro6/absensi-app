import React from 'react';
import { formatPeriodRange } from '../lib/dates';
import { Scale, Calendar, AlertCircle } from 'lucide-react';

interface HeroProps {
  today?: Date;
}

export const Hero: React.FC<HeroProps> = ({ today = new Date() }) => {
  const periodText = formatPeriodRange(today);

  return (
    <section className="hero-card">
      <div className="hero-ambient-glow" aria-hidden="true"></div>
      <div className="hero-body">
        <div className="hero-badge">
          <Scale size={14} />
          <span>Standar Operasional Distribusi Dana Tetap 10 Hari</span>
        </div>

        <h1 className="hero-title">
          Kalkulator Pembagian Kas Berbasis Absensi 10 Hari
        </h1>

        <div className="hero-period-strip">
          <div className="period-pill">
            <Calendar size={14} />
            <span>Periode Berjalan: <strong>{periodText}</strong></span>
          </div>

          <div className="hero-guidance-note">
            <AlertCircle size={15} className="text-tertiary" />
            <span>
              Centang hanya jika peserta <strong className="note-tag-absent">TIDAK HADIR</strong>. Kotak kosong berarti <strong className="note-tag-present">HADIR</strong>.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
