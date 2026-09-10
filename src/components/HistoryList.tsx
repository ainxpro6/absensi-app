import React, { useState, useMemo } from 'react';
import type { DistributionHistory, HistoryFilter } from '../types';
import { formatRupiah } from '../lib/currency';
import {
  Calendar,
  Users,
  Search,
  Trash2,
  Eye,
  History as HistoryIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface HistoryListProps {
  historyList: DistributionHistory[];
  onViewDetail: (item: DistributionHistory) => void;
  onRequestDelete: (item: DistributionHistory) => void;
  onNavigateToCalculator: () => void;
  today: Date;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  historyList,
  onViewDetail,
  onRequestDelete,
  onNavigateToCalculator,
  today,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<HistoryFilter>('all');

  // Filter dan pencarian data
  const filteredList = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Bulan lalu
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    return historyList.filter((item) => {
      // 1. Filter Waktu
      if (filterMode === 'this_month') {
        const itemDate = new Date(item.createdAt);
        if (itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear) {
          return false;
        }
      } else if (filterMode === 'last_month') {
        const itemDate = new Date(item.createdAt);
        if (itemDate.getMonth() !== lastMonth || itemDate.getFullYear() !== lastMonthYear) {
          return false;
        }
      }

      // 2. Pencarian Nama Peserta atau Periode
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPeriod = item.periodLabel.toLowerCase().includes(q);
        const matchesParticipant = item.participants.some((p) =>
          p.name.toLowerCase().includes(q)
        );
        return matchesPeriod || matchesParticipant;
      }

      return true;
    });
  }, [historyList, searchQuery, filterMode, today]);

  return (
    <div className="history-view-wrapper">
      {/* 1. Header Riwayat */}
      <div className="history-header-card">
        <div className="history-header-main">
          <div>
            <div className="badge-history-title">
              <HistoryIcon size={14} />
              <span>Arsip Data Distribusi</span>
            </div>
            <h1 className="history-title">Riwayat Distribusi</h1>
            <p className="history-subtitle">
              Lihat kembali hasil pembagian dana dari periode sebelumnya yang telah tersimpan.
            </p>
          </div>
          <div className="history-stats-pill">
            <span className="font-numeric font-bold">{historyList.length}</span> Arsip Tersimpan
          </div>
        </div>

        {/* Search & Filter Bar */}
        {historyList.length > 0 && (
          <div className="history-filter-bar">
            {/* Search Input */}
            <div className="search-box-wrapper">
              <Search size={16} className="search-icon text-muted" />
              <input
                type="text"
                className="search-input-field"
                placeholder="Cari nama peserta atau periode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari riwayat"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus teks pencarian"
                >
                  ×
                </button>
              )}
            </div>

            {/* Time Filter Tabs */}
            <div className="filter-pill-group" role="tablist" aria-label="Filter periode riwayat">
              <button
                type="button"
                className={`btn-filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Semua ({historyList.length})
              </button>
              <button
                type="button"
                className={`btn-filter-pill ${filterMode === 'this_month' ? 'active' : ''}`}
                onClick={() => setFilterMode('this_month')}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                className={`btn-filter-pill ${filterMode === 'last_month' ? 'active' : ''}`}
                onClick={() => setFilterMode('last_month')}
              >
                Bulan Lalu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Content: Empty State vs Cards Grid */}
      {historyList.length === 0 ? (
        /* Empty State: Belum ada history sama sekali */
        <div className="history-empty-card">
          <div className="empty-icon-circle">
            <FolderOpen size={42} />
          </div>
          <h2 className="empty-title">Belum Ada Riwayat</h2>
          <p className="empty-desc">
            Belum ada hasil distribusi yang disimpan. Selesaikan satu periode pada kalkulator dan simpan
            hasilnya untuk melihatnya kembali di sini.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-empty-cta"
            onClick={onNavigateToCalculator}
          >
            <span>Buka Kalkulator</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        /* Empty State: Pencarian tidak menemukan hasil */
        <div className="history-empty-card">
          <div className="empty-icon-circle">
            <Search size={36} />
          </div>
          <h2 className="empty-title">Tidak Menemukan Riwayat</h2>
          <p className="empty-desc">
            Tidak ada riwayat yang cocok dengan kata kunci <strong>"{searchQuery}"</strong> atau filter waktu
            yang dipilih.
          </p>
          <button
            type="button"
            className="btn btn-secondary-outline"
            onClick={() => {
              setSearchQuery('');
              setFilterMode('all');
            }}
          >
            Reset Filter & Pencarian
          </button>
        </div>
      ) : (
        /* Grid of History Cards */
        <div className="history-card-grid">
          {filteredList.map((item) => {
            const savedDate = new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={item.id} className="history-snapshot-card">
                {/* Card Top: Period & Date */}
                <div className="card-top-row">
                  <div className="period-tag">
                    <Calendar size={13} />
                    <span>Periode {item.periodLabel}</span>
                  </div>
                  <div className="saved-date-label">
                    <Clock size={12} />
                    <span>{savedDate}</span>
                  </div>
                </div>

                {/* Card Middle: Summary Chips */}
                <div className="participant-summary-strip">
                  <span className="summary-pill pill-neutral">
                    <Users size={12} />
                    <span>{item.totalParticipants} peserta</span>
                  </span>
                  <span className="summary-pill pill-success">
                    <CheckCircle2 size={12} />
                    <span>{item.fullAttendance} Hadir Penuh</span>
                  </span>
                  {item.absentParticipants > 0 && (
                    <span className="summary-pill pill-error">
                      <span>{item.absentParticipants} Absen</span>
                    </span>
                  )}
                </div>

                {/* Financial Figures */}
                <div className="history-metrics-box">
                  <div className="metric-col">
                    <span className="metric-label">Total Dana</span>
                    <span className="metric-value font-numeric">{formatRupiah(item.totalFund)}</span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-label">Total Dibagikan</span>
                    <span className="metric-value font-numeric font-bold value-primary">
                      {formatRupiah(item.totalDistributed)}
                    </span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-label">Sisa Dana</span>
                    <span className="metric-value font-numeric value-warning">
                      {formatRupiah(item.remainder)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="history-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary-outline btn-card-action"
                    onClick={() => onViewDetail(item)}
                    title="Buka rincian lengkap riwayat ini"
                  >
                    <Eye size={15} />
                    <span>Lihat Detail</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost-danger btn-card-action"
                    onClick={() => onRequestDelete(item)}
                    title="Hapus riwayat periode ini"
                    aria-label={`Hapus riwayat periode ${item.periodLabel}`}
                  >
                    <Trash2 size={15} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
