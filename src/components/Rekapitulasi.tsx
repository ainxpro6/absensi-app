import React, { useMemo } from 'react';
import type { AppState, CalculationResult } from '../types';
import { formatRupiah } from '../lib/currency';
import { getParticipantStatus } from '../services/historyStorage';
import {
  Printer,
  BookmarkPlus,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  History as HistoryIcon,
} from 'lucide-react';

interface RekapitulasiProps {
  state: AppState;
  calculation: CalculationResult;
  today: Date;
  onSaveToHistory: () => void;
  onNavigateToHistory: () => void;
}

export const Rekapitulasi: React.FC<RekapitulasiProps> = ({
  state,
  calculation,
  today,
  onSaveToHistory,
  onNavigateToHistory,
}) => {
  // Label periode dinamis (contoh: 01/09 – 10/09)
  const periodLabel = useMemo(() => {
    const firstPerson = state.people[0];
    const start = firstPerson?.attendance[0]?.dayLabel;
    const end = firstPerson?.attendance[firstPerson.attendance.length - 1]?.dayLabel;
    if (start && end) {
      return `${start} – ${end}`;
    }
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    return `01/${monthStr} – 10/${monthStr}`;
  }, [state.people, today]);

  // Evaluasi metrik kehadiran peserta
  const attendanceBreakdown = useMemo(() => {
    let fullCount = 0;
    let partialCount = 0;
    let zeroCount = 0;

    state.people.forEach((p) => {
      const presentCount = p.attendance.filter((d) => !d.absent).length;
      if (presentCount === 10) {
        fullCount += 1;
      } else if (presentCount > 0) {
        partialCount += 1;
      } else {
        zeroCount += 1;
      }
    });

    const total = state.people.length || 1;
    const fullPercent = Math.round((fullCount / total) * 100);
    const partialPercent = Math.round((partialCount / total) * 100);
    const zeroPercent = Math.round((zeroCount / total) * 100);

    return {
      fullCount,
      partialCount,
      zeroCount,
      fullPercent,
      partialPercent,
      zeroPercent,
    };
  }, [state.people]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rekap-view-wrapper">
      {/* 1. Header Rekapitulasi */}
      <div className="rekap-header-card">
        <div className="rekap-header-main">
          <div className="rekap-header-title-area">
            <div className="rekap-badge-period">
              <Calendar size={14} />
              <span>Periode {periodLabel}</span>
            </div>
            <h1 className="rekap-title">Rekapitulasi Distribusi</h1>
            <p className="rekap-subtitle">
              Ringkasan hasil pembagian dana berdasarkan kehadiran peserta.
            </p>
          </div>

          {/* Action buttons */}
          <div className="rekap-actions no-print">
            <button
              type="button"
              className="btn btn-primary btn-save-history"
              onClick={onSaveToHistory}
              title="Simpan snapshot hasil distribusi ini ke Riwayat"
            >
              <BookmarkPlus size={16} />
              <span>Simpan ke Riwayat</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary-outline"
              onClick={onNavigateToHistory}
              title="Lihat seluruh arsip riwayat tersimpan"
            >
              <HistoryIcon size={16} />
              <span>Lihat Riwayat</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary-outline btn-print-rekap"
              onClick={handlePrint}
              title="Cetak format rapi rekapitulasi distribusi"
            >
              <Printer size={16} />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Grid (6 Kartu Metrik) */}
      <div className="rekap-kpi-grid">
        {/* Total Dana */}
        <div className="rekap-kpi-card">
          <span className="rekap-kpi-label">Total Dana</span>
          <div className="rekap-kpi-value value-primary font-numeric">
            {formatRupiah(calculation.totalMoney)}
          </div>
          <span className="rekap-kpi-note">Target anggaran periode</span>
        </div>

        {/* Total Peserta */}
        <div className="rekap-kpi-card">
          <span className="rekap-kpi-label">Total Peserta</span>
          <div className="rekap-kpi-value font-numeric">
            {calculation.totalPeople} <span className="kpi-unit">orang</span>
          </div>
          <span className="rekap-kpi-note">Terdaftar pada periode ini</span>
        </div>

        {/* Hadir Penuh */}
        <div className="rekap-kpi-card kpi-card-success">
          <span className="rekap-kpi-label">Hadir Penuh</span>
          <div className="rekap-kpi-value value-success font-numeric">
            {calculation.fullAttendees} <span className="kpi-unit">orang</span>
          </div>
          <span className="rekap-kpi-note">Berhak menerima pembagian dana</span>
        </div>

        {/* Peserta Absen */}
        <div className="rekap-kpi-card">
          <span className="rekap-kpi-label">Peserta Absen</span>
          <div className="rekap-kpi-value value-error font-numeric">
            {calculation.ineligiblePeople} <span className="kpi-unit">orang</span>
          </div>
          <span className="rekap-kpi-note">Absen minimal 1 hari (gugur)</span>
        </div>

        {/* Total Dibagikan */}
        <div className="rekap-kpi-card kpi-card-highlight">
          <span className="rekap-kpi-label">Total Dibagikan</span>
          <div className="rekap-kpi-value value-primary font-numeric">
            {formatRupiah(calculation.distributedTotal)}
          </div>
          <span className="rekap-kpi-note">
            {calculation.fullAttendees > 0
              ? `${formatRupiah(calculation.paymentPerFullAttendee)} / orang`
              : 'Belum ada penerima'}
          </span>
        </div>

        {/* Sisa Dana */}
        <div className="rekap-kpi-card">
          <span className="rekap-kpi-label">Sisa Dana</span>
          <div className="rekap-kpi-value value-warning font-numeric">
            {formatRupiah(calculation.remainder)}
          </div>
          <span className="rekap-kpi-note">
            {calculation.remainder > 0
              ? 'Sisa pembulatan ke kas'
              : 'Terbagi habis sempurna'}
          </span>
        </div>
      </div>

      {/* 3. Section Detail Pembagian & Rekap Kehadiran (2 Column Layout) */}
      <div className="rekap-analysis-grid">
        {/* Left: Detail Pembagian Dana */}
        <div className="rekap-analysis-card">
          <div className="card-header-simple">
            <div className="icon-badge-sm">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="card-title-sm">Detail Pembagian Dana</h2>
              <p className="card-desc-sm">Struktur perolehan dana dan alokasi bonus redistribusi</p>
            </div>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="breakdown-item-name">Total Dana</span>
              <span className="breakdown-item-value font-numeric">{formatRupiah(calculation.totalMoney)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-item-name">Jumlah Peserta</span>
              <span className="breakdown-item-value font-numeric">{calculation.totalPeople} orang</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-item-name">Bagian Dasar / Peserta</span>
              <span className="breakdown-item-value font-numeric">{formatRupiah(calculation.baseShare)}</span>
            </div>
            <div className="breakdown-row highlight-bonus">
              <span className="breakdown-item-name">Total Bonus Dialihkan</span>
              <span className="breakdown-item-value value-success font-numeric">
                +{formatRupiah(calculation.redistributedPool)}
              </span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-item-name">Total Dibagikan</span>
              <span className="breakdown-item-value font-numeric font-bold">
                {formatRupiah(calculation.distributedTotal)}
              </span>
            </div>
            <div className="breakdown-row highlight-remainder">
              <span className="breakdown-item-name">Sisa Tidak Terbagi</span>
              <span className="breakdown-item-value font-numeric">{formatRupiah(calculation.remainder)}</span>
            </div>
          </div>

          {/* Rincian per penerima hak jika ada bonus */}
          {calculation.fullAttendees > 0 && (
            <div className="rekap-payout-box">
              <div className="payout-box-header">
                <span className="payout-box-title">Penerima Hadir Penuh:</span>
                <span className="payout-box-total font-numeric">
                  {formatRupiah(calculation.paymentPerFullAttendee)}
                </span>
              </div>
              <div className="payout-box-math font-numeric">
                <span>Bagian Dasar: {formatRupiah(calculation.baseShare)}</span>
                {calculation.bonusPerFullAttendee > 0 && (
                  <span> + Bonus Dialihkan: {formatRupiah(calculation.bonusPerFullAttendee)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Rekap Kehadiran Peserta */}
        <div className="rekap-analysis-card">
          <div className="card-header-simple">
            <div className="icon-badge-sm">
              <Users size={16} />
            </div>
            <div>
              <h2 className="card-title-sm">Rekap Kehadiran</h2>
              <p className="card-desc-sm">Komposisi absensi seluruh peserta selama 10 hari</p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="attendance-progress-wrapper" aria-label="Progress rasio kehadiran">
            <div className="progress-bar-composite">
              <div
                className="progress-segment segment-full"
                style={{ width: `${attendanceBreakdown.fullPercent}%` }}
                title={`Hadir Penuh: ${attendanceBreakdown.fullPercent}%`}
              />
              <div
                className="progress-segment segment-partial"
                style={{ width: `${attendanceBreakdown.partialPercent}%` }}
                title={`Absen Sebagian: ${attendanceBreakdown.partialPercent}%`}
              />
              <div
                className="progress-segment segment-zero"
                style={{ width: `${attendanceBreakdown.zeroPercent}%` }}
                title={`Tidak Dapat Bagian: ${attendanceBreakdown.zeroPercent}%`}
              />
            </div>
          </div>

          {/* 3 Status Counters */}
          <div className="attendance-status-rows">
            <div className="status-metric-row">
              <div className="status-metric-left">
                <span className="status-dot dot-success"></span>
                <span className="status-metric-name">Hadir Penuh</span>
              </div>
              <div className="status-metric-right">
                <span className="font-numeric font-bold">{attendanceBreakdown.fullCount} orang</span>
                <span className="status-metric-pct">({attendanceBreakdown.fullPercent}%)</span>
              </div>
            </div>

            <div className="status-metric-row">
              <div className="status-metric-left">
                <span className="status-dot dot-warning"></span>
                <span className="status-metric-name">Absen Sebagian</span>
              </div>
              <div className="status-metric-right">
                <span className="font-numeric font-bold">{attendanceBreakdown.partialCount} orang</span>
                <span className="status-metric-pct">({attendanceBreakdown.partialPercent}%)</span>
              </div>
            </div>

            <div className="status-metric-row">
              <div className="status-metric-left">
                <span className="status-dot dot-error"></span>
                <span className="status-metric-name">Tidak Dapat Bagian (0 Hari)</span>
              </div>
              <div className="status-metric-right">
                <span className="font-numeric font-bold">{attendanceBreakdown.zeroCount} orang</span>
                <span className="status-metric-pct">({attendanceBreakdown.zeroPercent}%)</span>
              </div>
            </div>
          </div>

          <div className="attendance-note-box">
            <AlertCircle size={14} className="text-muted flex-shrink-0" />
            <span>
              Aturan: Hanya peserta dengan <strong>Hadir Penuh (10/10)</strong> yang berhak mendapatkan pembagian dana.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Tabel Rekapitulasi Peserta Lengkap */}
      <div className="rekap-table-card">
        <div className="table-card-header">
          <div>
            <h2 className="card-title-md">Rincian Pembagian Per Peserta</h2>
            <p className="card-desc-sm">
              Daftar seluruh peserta beserta bagian dasar, bonus dialihkan, dan nominal akhir
            </p>
          </div>
          <span className="table-record-count font-numeric">{state.people.length} Peserta Terdaftar</span>
        </div>

        <div className="table-responsive">
          <table className="rekap-table" aria-label="Tabel Rekapitulasi Peserta">
            <thead>
              <tr>
                <th style={{ width: '3.5rem', textAlign: 'center' }}>NO</th>
                <th>PESERTA</th>
                <th style={{ textAlign: 'center', width: '8.5rem' }}>KEHADIRAN</th>
                <th style={{ textAlign: 'center', width: '10rem' }}>STATUS</th>
                <th style={{ textAlign: 'right', width: '9rem' }}>BAGIAN DASAR</th>
                <th style={{ textAlign: 'right', width: '9.5rem' }}>BONUS DIALIHKAN</th>
                <th style={{ textAlign: 'right', width: '10rem', paddingRight: '1.25rem' }}>TOTAL DITERIMA</th>
              </tr>
            </thead>
            <tbody>
              {state.people.map((person, idx) => {
                const personRes = calculation.people.find((p) => p.id === person.id) || {
                  absentCount: person.attendance.filter((d) => d.absent).length,
                  presentCount: 10 - person.attendance.filter((d) => d.absent).length,
                  eligible: person.attendance.every((d) => !d.absent),
                  payment: 0,
                };

                const isEligible = personRes.eligible;
                const status = getParticipantStatus(personRes.presentCount);
                const baseShareAmount = isEligible ? calculation.baseShare : 0;
                const bonusAmount = isEligible ? calculation.bonusPerFullAttendee : 0;

                return (
                  <tr key={person.id} className={!isEligible ? 'row-ineligible' : 'row-eligible'}>
                    <td style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>{idx + 1}</td>
                    <td className="font-semibold text-primary-name">{person.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="font-numeric font-bold">{personRes.presentCount}/10</span>{' '}
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>hari</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {status === 'Hadir Penuh' ? (
                        <span className="status-badge-pill badge-full-eligible">
                          <CheckCircle2 size={13} />
                          <span>Hadir Penuh</span>
                        </span>
                      ) : status === 'Absen Sebagian' ? (
                        <span className="status-badge-pill badge-absent-ineligible">
                          <XCircle size={13} />
                          <span>Absen Sebagian</span>
                        </span>
                      ) : (
                        <span className="status-badge-pill badge-zero-ineligible">
                          <AlertCircle size={13} />
                          <span>Tidak Hadir (0 Hari)</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-numeric">
                      {isEligible ? formatRupiah(baseShareAmount) : <span className="text-muted">Rp0</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-numeric">
                      {bonusAmount > 0 ? (
                        <span className="text-success font-semibold">+{formatRupiah(bonusAmount)}</span>
                      ) : (
                        <span className="text-muted">Rp0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }} className="font-numeric">
                      {isEligible ? (
                        <span className="payout-eligible font-bold">{formatRupiah(personRes.payment)}</span>
                      ) : (
                        <span className="payout-ineligible">Rp0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>
                  Total Terdistribusi:
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }} className="font-numeric">
                  {calculation.fullAttendees} Berhak
                </td>
                <td style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                  {calculation.ineligiblePeople} Gugur
                </td>
                <td style={{ textAlign: 'right' }} className="font-numeric font-semibold">
                  {formatRupiah(calculation.baseShare * calculation.fullAttendees)}
                </td>
                <td style={{ textAlign: 'right' }} className="font-numeric font-semibold text-success">
                  +{formatRupiah(calculation.bonusPerFullAttendee * calculation.fullAttendees)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, paddingRight: '1.25rem' }} className="font-numeric text-primary-total">
                  {formatRupiah(calculation.distributedTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print-Only Document Footer */}
      <div className="print-only-footer">
        <div className="print-signature-grid">
          <div className="print-signature-box">
            <p>Dibuat Oleh:</p>
            <div className="signature-blank-line"></div>
            <p>Pengelola Kas / Admin</p>
          </div>
          <div className="print-signature-box">
            <p>Mengetahui:</p>
            <div className="signature-blank-line"></div>
            <p>Perwakilan Peserta</p>
          </div>
        </div>
        <p className="print-timestamp">
          Dicetak otomatis oleh BagiKas 10 Hari pada {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
        </p>
      </div>
    </div>
  );
};
