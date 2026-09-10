import React, { useState } from 'react';
import type { Person, CalculationResult } from '../types';
import { formatRupiah } from '../lib/currency';
import { UserPlus, CheckCheck, Trash2, CheckCircle2, XCircle, X, Users, ArrowRight } from 'lucide-react';

interface AttendanceTableProps {
  people: Person[];
  result: CalculationResult;
  onToggleAbsent: (personId: string, dayIndex: number) => void;
  onAddPerson: (name: string) => void;
  onUpdatePersonName: (personId: string, newName: string) => void;
  onRequestDeletePerson: (person: Person) => void;
  onRequestMarkAllPresent: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  people,
  result,
  onToggleAbsent,
  onAddPerson,
  onUpdatePersonName,
  onRequestDeletePerson,
  onRequestMarkAllPresent,
}) => {
  const [newName, setNewName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddPerson(trimmed);
    setNewName('');
  };

  const dayLabels = people.length > 0 && people[0].attendance.length === 10
    ? people[0].attendance.map((d) => d.dayLabel)
    : [];

  return (
    <section className="workstation-card">
      {/* Matrix Action Header */}
      <div className="workstation-header">
        <div>
          <h2 className="font-headline-md text-on-surface">
            Daftar Absensi Peserta (10 Hari Kerja)
          </h2>
          <p className="font-body-sm text-on-surface-variant" style={{ marginTop: '0.2rem' }}>
            Perhatian: Checkbox tidak dicentang (<span className="note-tag-present">Kosong</span>) = Hadir. Checkbox dicentang (<span className="note-tag-absent">Merah/Silang</span>) = <strong className="note-tag-absent">TIDAK HADIR</strong>.
          </p>
        </div>

        <div className="workstation-actions">
          <form className="add-form" onSubmit={handleAddSubmit}>
            <input
              type="text"
              className="input-name-new"
              placeholder="Nama Peserta Baru..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Nama peserta baru"
            />
            <button
              type="submit"
              className="btn-primary-action"
              disabled={!newName.trim()}
              title="Tambah peserta baru"
            >
              <UserPlus size={16} />
              <span>Tambah</span>
            </button>
          </form>

          {people.length > 0 && (
            <button
              type="button"
              className="btn-mark-all"
              onClick={onRequestMarkAllPresent}
              title="Reset seluruh absensi menjadi Hadir Penuh"
            >
              <CheckCheck size={16} className="text-primary" />
              <span>Hadirkan Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State Alert */}
      {people.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Users size={40} className="text-on-surface-variant" style={{ opacity: 0.6 }} />
          <h3 className="font-headline-sm text-on-surface">Tambahkan minimal 1 orang untuk menghitung</h3>
          <p className="font-body-sm text-on-surface-variant" style={{ maxWidth: '420px' }}>
            Ketik nama peserta pada kolom input di atas untuk memulai kalkulasi pembagian kas berdasarkan kehadiran 10 hari.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile scroll hint */}
          <div className="flex items-center gap-1 font-label-sm text-on-surface-variant md:hidden" style={{ fontSize: '11px' }}>
            <span>Geser tabel</span>
            <ArrowRight size={13} />
            <span>untuk melihat seluruh 10 tanggal</span>
          </div>

          {/* Attendance Table */}
          <div className="table-scroll-container">
            <table className="matrix-table" aria-label="Tabel Matrix Absensi 10 Hari">
              <thead>
                <tr>
                  <th style={{ width: '3rem', textAlign: 'center' }}>No</th>
                  <th className="th-name-sticky">Nama Peserta</th>
                  {dayLabels.map((label, idx) => (
                    <th
                      key={idx}
                      className="matrix-cell-day"
                      title={`Tanggal ${label} - Centang jika TIDAK HADIR`}
                    >
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--on-surface)', fontSize: '12px' }}>
                        {label}
                      </div>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', width: '5.5rem' }}>Kehadiran</th>
                  <th style={{ textAlign: 'center', width: '10rem' }}>Status Kelayakan</th>
                  <th style={{ textAlign: 'right', minWidth: '8.5rem', paddingRight: '1.25rem' }}>Nominal Diterima</th>
                  <th style={{ textAlign: 'center', width: '3.5rem' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person, pIdx) => {
                  const personRes = result.people.find((p) => p.id === person.id) || {
                    absentCount: person.attendance.filter((d) => d.absent).length,
                    presentCount: 10 - person.attendance.filter((d) => d.absent).length,
                    eligible: person.attendance.every((d) => !d.absent),
                    payment: 0,
                  };

                  const isEligible = personRes.eligible;

                  return (
                    <tr
                      key={person.id}
                      className={`matrix-row ${!isEligible ? 'matrix-row-ineligible' : ''}`}
                    >
                      <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {pIdx + 1}
                      </td>

                      {/* Sticky Name with Inline Editing */}
                      <td className="td-name-sticky">
                        <input
                          type="text"
                          className="input-name-inline"
                          value={person.name}
                          onChange={(e) => onUpdatePersonName(person.id, e.target.value)}
                          aria-label={`Edit nama peserta ${person.name}`}
                        />
                      </td>

                      {/* 10 Attendance Days */}
                      {person.attendance.map((day, dIdx) => (
                        <td key={dIdx} className="matrix-cell-day">
                          <label
                            className="cell-checkbox-target"
                            title={`Tanggal ${day.dayLabel} - ${person.name}: ${day.absent ? 'TIDAK HADIR (Dicentang)' : 'HADIR (Kosong)'}`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={day.absent}
                              onChange={() => onToggleAbsent(person.id, dIdx)}
                              aria-label={`${person.name} — ${day.dayLabel} — ${day.absent ? 'Tidak hadir' : 'Hadir'}`}
                            />
                            <div className={`checkbox-box ${day.absent ? 'box-absent' : 'box-present'}`} aria-hidden="true">
                              {day.absent ? (
                                <X size={15} strokeWidth={3} />
                              ) : null}
                            </div>
                          </label>
                        </td>
                      ))}

                      {/* Kehadiran (e.g. 10/10 or 9/10) */}
                      <td style={{ textAlign: 'center', fontSize: '12px' }}>
                        <span style={{ fontWeight: 700, color: isEligible ? 'var(--primary)' : 'var(--error)' }}>
                          {personRes.presentCount}
                        </span>
                        <span style={{ color: 'var(--on-surface-variant)' }}>/10</span>
                      </td>

                      {/* Status Kelayakan Pill Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {isEligible ? (
                          <span className="status-badge-pill badge-full-eligible">
                            <CheckCircle2 size={14} />
                            <span>Hadir Penuh (10/10)</span>
                          </span>
                        ) : (
                          <span className="status-badge-pill badge-absent-ineligible">
                            <XCircle size={14} />
                            <span>Absen ({personRes.absentCount} Hari)</span>
                          </span>
                        )}
                      </td>

                      {/* Nominal Diterima */}
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                        {isEligible ? (
                          <span className="payout-eligible">
                            {formatRupiah(personRes.payment)}
                          </span>
                        ) : (
                          <span className="payout-ineligible">
                            Rp0
                          </span>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-row-delete"
                          onClick={() => onRequestDeletePerson(person)}
                          title={`Hapus peserta ${person.name}`}
                          aria-label={`Hapus peserta ${person.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer */}
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                    Ringkasan Distribusi Total:
                  </td>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                    10 Hari Penuh
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.3 }}>
                    <span>{result.fullAttendees} Peserta</span>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>Dapat Bagian</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--on-surface-variant)', lineHeight: 1.3 }}>
                    <span>{result.ineligiblePeople} Peserta</span>
                    <span style={{ display: 'block', fontSize: '11px' }}>Tidak Dapat Bagian</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--on-surface)', paddingRight: '1.25rem' }}>
                    {formatRupiah(result.distributedTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
