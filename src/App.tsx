import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppState, Person, TabType, DistributionHistory } from './types';
import { loadAppState, saveAppState, createDefaultState } from './lib/storage';
import { generateCurrentPeriodDays } from './lib/dates';
import { calculateDistribution } from './lib/calculation';
import {
  getHistoryList,
  saveHistory,
  deleteHistory,
  createDistributionSnapshot,
} from './services/historyStorage';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FinancialSummary } from './components/FinancialSummary';
import { SecondaryMetrics } from './components/SecondaryMetrics';
import { AttendanceTable } from './components/AttendanceTable';
import { CalculationTransparency } from './components/CalculationTransparency';
import { Rekapitulasi } from './components/Rekapitulasi';
import { HistoryList } from './components/HistoryList';
import { HistoryDetailModal } from './components/HistoryDetailModal';
import { GuideModal, ConfirmModal } from './components/Modals';
import { Toast, type ToastInfo } from './components/Toast';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  // Tanggal TODAY lokal browser
  const today = useMemo(() => new Date(), []);

  // Inisialisasi state dari localStorage dengan deteksi migrasi bulan otomatis
  const [state, setState] = useState<AppState>(() => loadAppState(today));

  // Active Navigation Tab: 'calculator' | 'recap' | 'history'
  const [activeTab, setActiveTab] = useState<TabType>('calculator');

  // History List State
  const [historyList, setHistoryList] = useState<DistributionHistory[]>(() => getHistoryList());

  // Selected History Detail for Modal View
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<DistributionHistory | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    const id = Date.now();
    setToast({ id, message, isError });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  // Modal states
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Simpan ke localStorage setiap ada perubahan state kalkulator
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Kalkulasi pembagian otomatis (Single Source of Truth)
  const calculation = useMemo(() => {
    return calculateDistribution(state.totalMoney, state.people);
  }, [state.totalMoney, state.people]);

  // Handler: Ubah Total Uang
  const handleMoneyChange = (newMoney: number) => {
    setState((prev) => ({
      ...prev,
      totalMoney: newMoney,
    }));
  };

  // Handler: Toggle Absen (Centang = TIDAK HADIR)
  const handleToggleAbsent = (personId: string, dayIndex: number) => {
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => {
        if (p.id !== personId) return p;
        const newAttendance = p.attendance.map((day, dIdx) => {
          if (dIdx !== dayIndex) return day;
          return {
            ...day,
            absent: !day.absent,
          };
        });
        return {
          ...p,
          attendance: newAttendance,
        };
      }),
    }));
  };

  // Handler: Update Nama Peserta secara Inline
  const handleUpdatePersonName = (personId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => {
        if (p.id !== personId) return p;
        return { ...p, name: newName };
      }),
    }));
  };

  // Handler: Tambah Orang
  const handleAddPerson = (name: string) => {
    const newPerson: Person = {
      id: `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      attendance: generateCurrentPeriodDays(today),
    };

    setState((prev) => ({
      ...prev,
      people: [...prev.people, newPerson],
    }));

    showToast(`Peserta "${name}" berhasil ditambahkan.`);
  };

  // Handler: Modal Hapus Orang
  const handleRequestDeletePerson = (person: Person) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Peserta?',
      message: `Data absensi untuk "${person.name}" akan ikut dihapus dari daftar kalkulasi.`,
      confirmLabel: 'Hapus Peserta',
      isDestructive: true,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          people: prev.people.filter((p) => p.id !== person.id),
        }));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast(`Peserta "${person.name}" berhasil dihapus.`);
      },
    });
  };

  // Handler: Modal Reset Seluruh Checkbox menjadi HADIR
  const handleRequestMarkAllPresent = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hadirkan Semua Peserta?',
      message: 'Seluruh tanda centang tidak hadir akan dihapus dan semua orang dinyatakan Hadir Penuh (10/10).',
      confirmLabel: 'Hadirkan Semua',
      isDestructive: false,
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          people: prev.people.map((p) => ({
            ...p,
            attendance: p.attendance.map((d) => ({ ...d, absent: false })),
          })),
        }));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast('Semua peserta berhasil dihadirkan penuh.');
      },
    });
  };

  // Handler: Modal Reset Penuh Data
  const handleRequestResetData = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Reset Seluruh Data?',
      message: 'Semua daftar peserta, absensi, dan total uang akan dikembalikan ke pengaturan default.',
      confirmLabel: 'Reset Data',
      isDestructive: true,
      onConfirm: () => {
        setState(createDefaultState(today));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast('Seluruh data berhasil di-reset ke default.');
      },
    });
  };

  // Handler: Simpan Snapshot ke Riwayat (dari Rekapitulasi)
  const handleSaveToHistory = () => {
    const snapshot = createDistributionSnapshot(state, calculation, today);
    const saveRes = saveHistory(snapshot);

    if (saveRes.isDuplicate) {
      showToast('Riwayat periode ini sudah tersimpan.');
    } else if (saveRes.success) {
      setHistoryList(getHistoryList());
      showToast('Riwayat berhasil disimpan.');
    } else {
      showToast('Gagal menyimpan riwayat.', true);
    }
  };

  // Handler: Request Hapus Riwayat Snapshot
  const handleRequestDeleteHistory = (item: DistributionHistory) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Hapus Riwayat?',
      message: `Riwayat periode ${item.periodLabel} akan dihapus secara permanen dari perangkat ini.`,
      confirmLabel: 'Hapus Riwayat',
      isDestructive: true,
      onConfirm: () => {
        deleteHistory(item.id);
        setHistoryList(getHistoryList());
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast('Riwayat berhasil dihapus.');
      },
    });
  };

  return (
    <>
      {/* 1. Header (Fixed 80px) dengan 3 Nav Tabs */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        historyCount={historyList.length}
        onOpenGuide={() => setIsGuideOpen(false || true)}
        onRequestReset={handleRequestResetData}
      />

      {/* 2. Main Content */}
      <main className="main-content">
        <div className="app-container content-stack">
          {/* TAB 1: KALKULATOR DISTRIBUSI */}
          {activeTab === 'calculator' && (
            <>
              {/* Hero SOP Guidance Banner */}
              <Hero today={today} />

              {/* Executive KPI Bento Grid (Total Uang, Bagian Dasar, Payout Full, Sisa) */}
              <FinancialSummary
                totalMoney={state.totalMoney}
                result={calculation}
                onMoneyChange={handleMoneyChange}
              />

              {/* Secondary Metrics Bar */}
              <SecondaryMetrics result={calculation} />

              {/* Attendance Workstation Matrix */}
              <AttendanceTable
                people={state.people}
                result={calculation}
                onToggleAbsent={handleToggleAbsent}
                onAddPerson={handleAddPerson}
                onUpdatePersonName={handleUpdatePersonName}
                onRequestDeletePerson={handleRequestDeletePerson}
                onRequestMarkAllPresent={handleRequestMarkAllPresent}
              />

              {/* Mathematical Audit Breakdown Collapsible */}
              <CalculationTransparency result={calculation} />
            </>
          )}

          {/* TAB 2: REKAPITULASI DISTRIBUSI */}
          {activeTab === 'recap' && (
            <Rekapitulasi
              state={state}
              calculation={calculation}
              today={today}
              onSaveToHistory={handleSaveToHistory}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {/* TAB 3: RIWAYAT DISTRIBUSI */}
          {activeTab === 'history' && (
            <HistoryList
              historyList={historyList}
              onViewDetail={(item) => setSelectedHistoryDetail(item)}
              onRequestDelete={handleRequestDeleteHistory}
              onNavigateToCalculator={() => setActiveTab('calculator')}
              today={today}
            />
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Modals */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel={confirmModalState.confirmLabel}
        isDestructive={confirmModalState.isDestructive}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Detail Riwayat Read-Only */}
      <HistoryDetailModal
        history={selectedHistoryDetail}
        isOpen={selectedHistoryDetail !== null}
        onClose={() => setSelectedHistoryDetail(null)}
      />

      {/* 5. Toast Notification */}
      <Toast toast={toast} />
    </>
  );
};
