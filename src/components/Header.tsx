import React from 'react';
import { Landmark, HelpCircle, RotateCcw, User } from 'lucide-react';
import type { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  historyCount: number;
  onOpenGuide: () => void;
  onRequestReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  onOpenGuide,
  onRequestReset,
}) => {
  return (
    <header className="app-header">
      <div className="app-container header-inner">
        {/* Brand */}
        <button
          type="button"
          className="header-brand header-brand-btn"
          onClick={() => onTabChange('calculator')}
          title="Ke Halaman Utama Kalkulator"
        >
          <div className="brand-icon-box" aria-hidden="true">
            <Landmark size={20} />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">BagiKas 10 Hari</span>
              <span className="brand-save-badge">
                <span className="save-pulse-dot"></span>
                Otomatis Simpan (localStorage)
              </span>
            </div>
            <span className="brand-tagline">Kalkulator Absensi & Distribusi Dana</span>
          </div>
        </button>

        {/* Center Nav tabs: Kalkulator | Rekapitulasi | Riwayat */}
        <nav className="header-nav" aria-label="Navigasi Utama">
          <button
            type="button"
            className={`nav-link ${activeTab === 'calculator' ? 'nav-link-active' : 'nav-link-inactive'}`}
            onClick={() => onTabChange('calculator')}
            aria-current={activeTab === 'calculator' ? 'page' : undefined}
          >
            Kalkulator
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'recap' ? 'nav-link-active' : 'nav-link-inactive'}`}
            onClick={() => onTabChange('recap')}
            aria-current={activeTab === 'recap' ? 'page' : undefined}
          >
            Rekapitulasi
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'history' ? 'nav-link-active' : 'nav-link-inactive'}`}
            onClick={() => onTabChange('history')}
            aria-current={activeTab === 'history' ? 'page' : undefined}
          >
            <span>Riwayat</span>
            {historyCount > 0 && (
              <span className="nav-history-badge font-numeric">{historyCount}</span>
            )}
          </button>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <button
            type="button"
            id="btn-panduan"
            className="btn-header btn-header-neutral"
            onClick={onOpenGuide}
            title="Buka Panduan Aturan Algoritma"
          >
            <HelpCircle size={16} className="text-tertiary" />
            <span className="btn-header-label">Panduan Aturan</span>
          </button>

          <button
            type="button"
            id="btn-reset-data"
            className="btn-header btn-header-danger"
            onClick={onRequestReset}
            title="Reset Seluruh Data"
          >
            <RotateCcw size={16} />
            <span className="btn-header-label">Reset Data</span>
          </button>

          <div className="avatar-badge" aria-label="Akun Pengguna">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
};
