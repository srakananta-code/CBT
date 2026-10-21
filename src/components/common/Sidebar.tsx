import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  FileQuestion,
  ClipboardList,
  Award,
  FileSpreadsheet,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen
}) => {
  const { role, userProfile } = useAuth();

  const getMenuItems = () => {
    if (role === 'admin') {
      return [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'teachers', label: 'Manajemen Guru', icon: UserCheck },
        { id: 'students', label: 'Manajemen Siswa', icon: Users },
        { id: 'classes', label: 'Manajemen Kelas', icon: GraduationCap },
        { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
        { id: 'academicYears', label: 'Tahun Ajaran', icon: CalendarDays },
        { id: 'questions', label: 'Bank Soal', icon: FileQuestion },
        { id: 'exams', label: 'Paket Ujian', icon: ClipboardList },
        { id: 'results', label: 'Hasil Ujian', icon: Award },
        { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
        { id: 'auditLogs', label: 'Audit Aktivitas', icon: ShieldCheck },
        { id: 'settings', label: 'Pengaturan Sekolah', icon: Settings }
      ];
    }

    if (role === 'teacher') {
      return [
        { id: 'overview', label: 'Ringkasan Guru', icon: LayoutDashboard },
        { id: 'questions', label: 'Bank Soal Terpusat', icon: FileQuestion },
        { id: 'exams', label: 'Paket Ujian CBT', icon: ClipboardList },
        { id: 'monitoring', label: 'Live Monitoring CBT', icon: Award },
        { id: 'grades', label: 'Rekap Nilai & PDF', icon: GraduationCap },
        { id: 'auditLogs', label: 'Audit Log Ujian', icon: ShieldCheck }
      ];
    }

    // Student menu
    return [
      { id: 'availableExams', label: 'Jadwal Ujian Aktif', icon: ClipboardList },
      { id: 'history', label: 'Riwayat & Nilai Ujian', icon: Award }
    ];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0a192f] text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-[#071324] shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md">
            E
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">E-UJIAN SEKOLAH</h1>
            <p className="text-[10px] text-blue-300 font-medium">CBT SMP/MTs INDONESIA</p>
          </div>
        </div>

        {/* User Profile Info */}
        <div className="p-3 mx-3 my-2.5 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.name || 'Pengguna'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${userProfile?.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Guru Pengampu' : 'Siswa CBT'}
                </span>
              </div>
            </div>
          </div>
          {userProfile?.className && (
            <p className="text-[10px] text-blue-300 mt-2 font-medium bg-blue-950/40 px-2 py-0.5 rounded truncate">
              {userProfile.className}
            </p>
          )}
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {role === 'admin' ? 'Menu Administrator' : 'Menu Navigasi'}
          </p>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 bg-[#071324]/50 shrink-0">
          <p className="font-semibold text-slate-300 truncate">SMPN 1 Harapan Bangsa</p>
          <p className="text-[10px] text-slate-400">T.A. 2025/2026 Ganjil • CBT v1.0</p>
        </div>
      </aside>
    </>
  );
};
