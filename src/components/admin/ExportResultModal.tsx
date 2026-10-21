import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building,
  GraduationCap,
  Users,
  Award,
  Sliders
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  exportResultsToCSV,
  exportResultsToPDF,
  calculateResultSummary
} from '../../services/exportService';
import type {
  ExamResult,
  Exam,
  SchoolClass,
  UserProfile,
  AppSetting
} from '../../types/database';

interface ExportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExamResult[];
  exams: Exam[];
  classes: SchoolClass[];
  users: UserProfile[];
  settings: AppSetting | null;
  onAuditLog: (action: string, details: string) => void;
  onSuccessToast: (message: string) => void;
  defaultExamId?: string;
  defaultClassId?: string;
}

export const ExportResultModal: React.FC<ExportResultModalProps> = ({
  isOpen,
  onClose,
  results,
  exams,
  classes,
  users,
  settings,
  onAuditLog,
  onSuccessToast,
  defaultExamId = 'all',
  defaultClassId = 'all'
}) => {
  // Filter States
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId);
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial'>('all');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isExporting, setIsExporting] = useState(false);

  // Users Map for quick NISN lookups
  const usersMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    users.forEach(u => {
      map[u.uid] = u;
      map[u.id] = u;
    });
    return map;
  }, [users]);

  // Selected Exam object
  const currentExam = useMemo(() => {
    if (selectedExamId === 'all') return null;
    return exams.find(e => e.id === selectedExamId) || null;
  }, [selectedExamId, exams]);

  // Selected Class object
  const currentClass = useMemo(() => {
    if (selectedClassId === 'all') return null;
    return classes.find(c => c.id === selectedClassId) || null;
  }, [selectedClassId, classes]);

  const passingScore = currentExam?.passingScore || 75;

  // Filtered Results
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      // Filter by Exam
      if (selectedExamId !== 'all' && r.examId !== selectedExamId) {
        return false;
      }
      // Filter by Class (check r.className contains or matches class name)
      if (selectedClassId !== 'all' && currentClass) {
        if (!r.className.toLowerCase().includes(currentClass.name.toLowerCase())) {
          return false;
        }
      }
      // Filter by Status (Tuntas / Remedial)
      if (statusFilter === 'passed' && r.finalScore < passingScore) {
        return false;
      }
      if (statusFilter === 'remedial' && r.finalScore >= passingScore) {
        return false;
      }
      return true;
    });
  }, [results, selectedExamId, selectedClassId, currentClass, statusFilter, passingScore]);

  // Summary statistics
  const summary = useMemo(() => {
    return calculateResultSummary(filteredResults, passingScore);
  }, [filteredResults, passingScore]);

  // Filter description for reporting
  const filterDescription = useMemo(() => {
    const parts: string[] = [];
    if (currentExam) parts.push(`Ujian: ${currentExam.title}`);
    else parts.push('Semua Paket Ujian');

    if (currentClass) parts.push(`Kelas: ${currentClass.name}`);
    else parts.push('Semua Kelas');

    if (statusFilter === 'passed') parts.push('Hanya Siswa Tuntas');
    else if (statusFilter === 'remedial') parts.push('Hanya Siswa Remedial');

    return parts.join(' | ');
  }, [currentExam, currentClass, statusFilter]);

  // Handler: Export CSV
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data hasil ujian yang sesuai dengan kriteria filter.');
      return;
    }

    try {
      setIsExporting(true);
      exportResultsToCSV({
        results: filteredResults,
        exam: currentExam,
        settings,
        usersMap,
        filterDescription
      });

      onAuditLog(
        'EXPORT_RESULTS_CSV',
        `Admin mengekspor rekap hasil ujian format CSV (${filteredResults.length} data peserta).`
      );
      onSuccessToast(`Berhasil mengekspor ${filteredResults.length} data nilai ke format CSV (Excel).`);
      onClose();
    } catch (error) {
      console.error('CSV Export Error:', error);
      alert('Terjadi kesalahan saat memproses ekspor CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handler: Export PDF
  const handleExportPDF = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data hasil ujian yang sesuai dengan kriteria filter.');
      return;
    }

    try {
      setIsExporting(true);
      exportResultsToPDF({
        results: filteredResults,
        exam: currentExam,
        settings,
        usersMap,
        filterDescription,
        orientation: pdfOrientation
      });

      onAuditLog(
        'EXPORT_RESULTS_PDF',
        `Admin mengekspor rekap hasil ujian format PDF resmi (${filteredResults.length} data peserta).`
      );
      onSuccessToast(`Berhasil mengunduh dokumen PDF resmi (${filteredResults.length} peserta).`);
      onClose();
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Terjadi kesalahan saat memproses ekspor PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ekspor & Rekapitulasi Hasil Ujian CBT"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Description */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950">
              Ekspor Hasil Evaluasi untuk Pelaporan & Arsip Offline
            </h4>
            <p className="text-[11px] text-blue-700 leading-relaxed mt-0.5">
              Pilih kriteria filter paket ujian, kelas, dan status kelulusan. Data dapat diunduh dalam format <strong>CSV (Excel)</strong> dengan UTF-8 BOM atau <strong>PDF Resmi</strong> lengkap dengan Kop Surat Sekolah dan pengesahan Kepala Sekolah.
            </p>
          </div>
        </div>

        {/* Filter Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Pilih Paket Ujian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Paket Ujian</span>
            </label>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Paket Ujian ({results.length} total)</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilih Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kelas Siswa</span>
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Tingkat {c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Status Kelulusan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kriteria Kelulusan</span>
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Siswa (Tuntas & Remedial)</option>
              <option value="passed">Hanya Tuntas (Nilai &ge; {passingScore})</option>
              <option value="remedial">Hanya Remedial (Nilai &lt; {passingScore})</option>
            </select>
          </div>
        </div>

        {/* Statistical Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Ringkasan Data Terpilih</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              Standar KKM: <strong className="text-slate-800">{passingScore}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Terpilih</span>
              <span className="text-base font-extrabold text-slate-900">{summary.totalStudents}</span>
              <span className="text-[10px] text-slate-500 ml-1">Siswa</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Rata-rata Nilai</span>
              <span className="text-base font-extrabold text-blue-600">{summary.averageScore}</span>
              <span className="text-[10px] text-slate-500 ml-1">/ 100</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tuntas</span>
              <span className="text-base font-extrabold text-emerald-600">{summary.passedCount}</span>
              <span className="text-[10px] text-emerald-600 ml-1">({summary.passRate}%)</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Remedial</span>
              <span className="text-base font-extrabold text-rose-600">{summary.remedialCount}</span>
              <span className="text-[10px] text-rose-600 ml-1">Siswa</span>
            </div>
          </div>
        </div>

        {/* Data Preview Table (Max 5 items) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700">
              Pratinjau Data ({filteredResults.length} Siswa Terpilih)
            </label>
            {filteredResults.length > 5 && (
              <span className="text-[11px] text-slate-400">
                Menampilkan 5 baris pertama
              </span>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-44 overflow-y-auto">
            {filteredResults.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2 w-8 text-center">No</th>
                    <th className="px-3 py-2">Nama Siswa</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2 text-center">Benar</th>
                    <th className="px-3 py-2 text-center">Salah</th>
                    <th className="px-3 py-2 text-center">Nilai</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {filteredResults.slice(0, 5).map((r, i) => (
                    <tr key={r.id}>
                      <td className="px-3 py-1.5 text-center text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="px-3 py-1.5">{r.className}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-emerald-600">{r.correctCount}</td>
                      <td className="px-3 py-1.5 text-center font-bold text-rose-600">{r.wrongCount}</td>
                      <td className="px-3 py-1.5 text-center font-extrabold text-blue-600">{r.finalScore}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge variant={r.finalScore >= passingScore ? 'success' : 'warning'} size="sm">
                          {r.finalScore >= passingScore ? 'Tuntas' : 'Remedial'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Tidak ada data hasil ujian yang sesuai dengan kriteria filter saat ini.
              </div>
            )}
          </div>
        </div>

        {/* Format Selection & Options */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-xs font-bold text-slate-800 mb-2.5">
            Pilih Format Berkas Ekspor:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opsi 1: CSV */}
            <div
              onClick={handleExportCSV}
              className="group p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 transition-all cursor-pointer flex items-start gap-3.5 shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-emerald-950">Format CSV (Excel)</h5>
                  <Badge variant="success" size="sm">.csv</Badge>
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
                  Kompatibel dengan Microsoft Excel, Google Sheets, dan LibreOffice. Dilengkapi UTF-8 BOM agar aksen dan angka tidak rusak.
                </p>
                <button
                  type="button"
                  disabled={isExporting || filteredResults.length === 0}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Berkas CSV</span>
                </button>
              </div>
            </div>

            {/* Opsi 2: PDF */}
            <div
              onClick={handleExportPDF}
              className="group p-4 rounded-xl border-2 border-rose-500/30 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-500 transition-all cursor-pointer flex items-start gap-3.5 shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-rose-950">Format Dokumen PDF Resmi</h5>
                  <Badge variant="danger" size="sm">.pdf</Badge>
                </div>
                <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
                  Dokumen siap cetak dengan Kop Surat Dinas Pendidikan & Sekolah, tabel berpaginasi, dan pengesahan Kepala Sekolah.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={pdfOrientation}
                    onChange={e => setPdfOrientation(e.target.value as any)}
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] border border-rose-300 rounded-lg px-2 py-1 bg-white text-slate-700"
                  >
                    <option value="landscape">Landscape (Lebar)</option>
                    <option value="portrait">Portrait (Tegak)</option>
                  </select>
                  <button
                    type="button"
                    disabled={isExporting || filteredResults.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF Resmi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-[11px] text-slate-500">
            Sekolah: <strong className="text-slate-700">{settings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
