import React from 'react';
import type { DistributionHistory } from '../types';
import { formatRupiah } from '../lib/currency';
import {
  X,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Landmark,
} from 'lucide-react';

interface HistoryDetailModalProps {
  history: DistributionHistory | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  history,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !history) return null;

  const formattedDate = new Date(history.createdAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-box-lg"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="history-modal-badge">
              <Calendar size={14} />
              <span>Periode {history.periodLabel}</span>
            </div>
            <h2 className="modal-title">Detail Riwayat Distribusi</h2>
            <div className="modal-saved-time">
              <Clock size={13} />
              <span>Disimpan pada {formattedDate}</span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup Detail Riwayat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-scrollable">
          {/* Read-Only Alert */}
          <div className="history-readonly-notice">
            <Landmark size={15} />
            <span>
              Snapshot ini bersifat <strong>read-only</strong> dan merekam kondisi distribusi saat disimpan.
            </span>
          </div>

          {/* 6 KPI Cards */}
          <div className="history-kpi-grid">
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Total Dana</span>
              <div className="kpi-val-sm font-numeric value-primary">
                {formatRupiah(history.totalFund)}
              </div>
            </div>
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Total Peserta</span>
              <div className="kpi-val-sm font-numeric">
                {history.totalParticipants} orang
              </div>
            </div>
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Hadir Penuh</span>
              <div className="kpi-val-sm font-numeric value-success">
                {history.fullAttendance} orang
              </div>
            </div>
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Peserta Absen</span>
              <div className="kpi-val-sm font-numeric value-error">
                {history.absentParticipants} orang
              </div>
            </div>
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Total Dibagikan</span>
              <div className="kpi-val-sm font-numeric font-bold">
                {formatRupiah(history.totalDistributed)}
              </div>
            </div>
            <div className="history-kpi-card">
              <span className="kpi-label-sm">Sisa Dana</span>
              <div className="kpi-val-sm font-numeric value-warning">
                {formatRupiah(history.remainder)}
              </div>
            </div>
          </div>

          {/* Tabel Peserta Snapshot */}
          <div className="history-table-wrapper">
            <table className="rekap-table" aria-label="Tabel Snapshot Peserta">
              <thead>
                <tr>
                  <th style={{ width: '3rem', textAlign: 'center' }}>NO</th>
                  <th>PESERTA</th>
                  <th style={{ textAlign: 'center', width: '8rem' }}>KEHADIRAN</th>
                  <th style={{ textAlign: 'center', width: '9rem' }}>STATUS</th>
                  <th style={{ textAlign: 'right', width: '8.5rem' }}>BAGIAN DASAR</th>
                  <th style={{ textAlign: 'right', width: '8.5rem' }}>BONUS</th>
                  <th style={{ textAlign: 'right', width: '9.5rem', paddingRight: '1rem' }}>DITERIMA</th>
                </tr>
              </thead>
              <tbody>
                {history.participants.map((p, pIdx) => {
                  const isEligible = p.status === 'Hadir Penuh';
                  return (
                    <tr key={p.id || pIdx} className={!isEligible ? 'row-ineligible' : ''}>
                      <td style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>{pIdx + 1}</td>
                      <td className="font-semibold">{p.name}</td>
                      <td style={{ textAlign: 'center' }} className="font-numeric">
                        {p.presentDays}/10 hari
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status === 'Hadir Penuh' ? (
                          <span className="status-badge-pill badge-full-eligible">
                            <CheckCircle2 size={12} />
                            <span>Hadir Penuh</span>
                          </span>
                        ) : p.status === 'Absen Sebagian' ? (
                          <span className="status-badge-pill badge-absent-ineligible">
                            <XCircle size={12} />
                            <span>Absen Sebagian</span>
                          </span>
                        ) : (
                          <span className="status-badge-pill badge-zero-ineligible">
                            <AlertCircle size={12} />
                            <span>0 Hari</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-numeric">
                        {formatRupiah(p.baseShare)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-numeric">
                        {p.transferredBonus > 0 ? (
                          <span className="text-success">+{formatRupiah(p.transferredBonus)}</span>
                        ) : (
                          'Rp0'
                        )}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem' }} className="font-numeric font-bold">
                        {isEligible ? (
                          <span className="payout-eligible">{formatRupiah(p.received)}</span>
                        ) : (
                          <span className="payout-ineligible">Rp0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary-outline"
            onClick={handlePrint}
            title="Cetak format cetak slip snapshot ini"
          >
            <Printer size={15} />
            <span>Cetak Slip</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
