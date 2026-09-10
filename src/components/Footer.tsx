import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="app-container footer-inner">
        <div className="flex items-center gap-1 font-body-sm">
          <span className="font-label-md text-on-surface" style={{ fontWeight: 700 }}>
            BagiKas 10 Hari
          </span>
          <span className="footer-bullet">•</span>
          <span>Algoritma Distribusi Transparan & Presisi Matematis</span>
        </div>

        <div className="flex items-center gap-3 font-label-sm">
          <span className="flex items-center gap-1">
            <ShieldCheck size={16} className="text-primary" />
            Format Rupiah Standar (IDR)
          </span>
          <span className="footer-bullet">•</span>
          <span>Tersimpan di Perangkat Pribadi</span>
        </div>
      </div>
    </footer>
  );
};
