import React from 'react';
import { Menu, LogOut, ShieldAlert, UserCheck, GraduationCap, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/database';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { userProfile, role, switchDemoRole, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              SMP / MTs
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Sistem CBT Ujian Sekolah Terintegrasi
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quick Role Switcher for seamless testing across all roles */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 px-2 hidden md:inline">
            Mode Peran:
          </span>
          <button
            onClick={() => switchDemoRole('admin')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              role === 'admin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Beralih ke Admin"
          >
            Admin
          </button>
          <button
            onClick={() => switchDemoRole('teacher')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              role === 'teacher'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Beralih ke Guru"
          >
            Guru
          </button>
          <button
            onClick={() => switchDemoRole('student')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Beralih ke Siswa"
          >
            Siswa
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {userProfile?.name || 'Pengguna'}
            </p>
            <p className="text-[11px] text-slate-500 capitalize">
              {role === 'admin' ? 'Super Admin' : role === 'teacher' ? 'Guru' : 'Peserta Ujian'}
            </p>
          </div>

          <button
            onClick={signOut}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Keluar dari sistem"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
