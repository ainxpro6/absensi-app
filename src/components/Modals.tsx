import React, { useEffect } from 'react';
import { X, CheckSquare, AlertOctagon, Coins } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-guide-title">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2 text-primary font-headline-sm font-bold" id="modal-guide-title">
            <Coins size={20} />
            <span>Panduan Algoritma BagiKas 10 Hari</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup panduan"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 font-body-sm text-on-surface">
          {/* Rule 1 */}
          <div className="modal-rule-block">
            <CheckSquare size={20} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong className="text-on-surface font-semibold">1. Makna Kotak Absensi (01/mm – 10/mm):</strong>
              <p className="text-on-surface-variant" style={{ marginTop: '0.15rem' }}>
                Aplikasi menetapkan seluruh peserta <strong>HADIR</strong> secara otomatis. Anda <strong>HANYA</strong> mencentang kotak hari jika peserta tersebut <strong>TIDAK HADIR</strong>.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="modal-rule-block">
            <AlertOctagon size={20} className="text-error" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong className="text-on-surface font-semibold">2. Aturan Ketat Gugur (All or Nothing):</strong>
              <p className="text-on-surface-variant" style={{ marginTop: '0.15rem' }}>
                Peserta yang hadir 9 dari 10 hari (absen minimal 1 hari) mendapat <strong style={{ color: 'var(--error)' }}>Rp0</strong>. Tidak ada pembayaran prorata atau proporsional.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="modal-rule-block">
            <Coins size={20} className="text-tertiary" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong className="text-on-surface font-semibold">3. Pengalihan & Pembulatan Turun Rp5.000:</strong>
              <p className="text-on-surface-variant" style={{ marginTop: '0.15rem' }}>
                Hak bagian dasar peserta yang gugur dialihkan menjadi bonus bagi peserta hadir penuh 10/10. Semua pembulatan menggunakan pembulatan ke bawah (<code style={{ backgroundColor: 'var(--surface-container)', padding: '2px 4px', borderRadius: '4px' }}>Math.floor(x / 5000) * 5000</code>). Sisa rupiah tidak terbagi tetap ditampilkan transparan.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary-action"
          style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginTop: '0.5rem' }}
          onClick={onClose}
        >
          Saya Mengerti Aturan Ini
        </button>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-box" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-headline-sm font-bold text-on-surface" id="confirm-modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <p className="font-body-md text-on-surface-variant">
          {message}
        </p>

        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn-mark-all"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-primary-action"
            style={{
              backgroundColor: isDestructive ? 'var(--error)' : 'var(--primary)',
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
