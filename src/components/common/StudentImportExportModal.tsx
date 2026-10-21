import React, { useState, useMemo } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Users,
  Building,
  GraduationCap,
  Layers,
  ArrowRight,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { importStudentsBatch, ImportStudentItem } from '../../services/adminAuthService';
import type { SchoolClass, Subject, UserProfile } from '../../types/database';

interface StudentImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  subjects: Subject[];
  users: UserProfile[];
  currentUser: UserProfile;
  onSuccess: () => void;
}

export const StudentImportExportModal: React.FC<StudentImportExportModalProps> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  users,
  currentUser,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Import states
  const [importRows, setImportRows] = useState<ImportStudentItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    totalImported: number;
    classesCreated: number;
    results: { name: string; nisn: string; className: string; status: 'success' | 'skipped'; message: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Export states
  const [exportClassFilter, setExportClassFilter] = useState('all');
  const [exportStatusFilter, setExportStatusFilter] = useState('all');

  const studentsList = useMemo(() => {
    return users.filter(u => u.role === 'student');
  }, [users]);

  // Download Sample CSV template
  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const templateData = [
      {
        'NISN': '0087654321',
        'Nama Lengkap': 'Muhammad Farhan',
        'Rombel Kelas': 'Kelas IX-C (Unggulan)',
        'Email': 'farhan.9c@siswa.smpn1.sch.id',
        'Password': 'Siswa123!*'
      },
      {
        'NISN': '0087654322',
        'Nama Lengkap': 'Siti Nurhaliza',
        'Rombel Kelas': 'Kelas IX-C (Unggulan)',
        'Email': 'siti.nurhaliza@siswa.smpn1.sch.id',
        'Password': 'Siswa123!*'
      },
      {
        'NISN': '0087654323',
        'Nama Lengkap': 'Budi Santoso Pratama',
        'Rombel Kelas': 'Kelas VIII-B',
        'Email': 'budi.santoso@siswa.smpn1.sch.id',
        'Password': 'Siswa123!*'
      },
      {
        'NISN': '0087654324',
        'Nama Lengkap': 'Aisyah Putri Azzahra',
        'Rombel Kelas': 'Kelas VII-A',
        'Email': 'aisyah.putri@siswa.smpn1.sch.id',
        'Password': 'Siswa123!*'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'Template_Import_Siswa_CBT.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Siswa_CBT.xlsx', { bookType: 'xlsx' });
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setImportError('File kosong atau format tidak sesuai.');
          return;
        }

        // Map various possible column header synonyms
        const mappedRows: ImportStudentItem[] = rawJson.map((row) => {
          const nisn = String(row['NISN'] || row['nisn'] || row['No Induk'] || row['Nomor Induk'] || '').trim();
          const name = String(row['Nama Lengkap'] || row['Nama Siswa'] || row['Nama'] || row['nama'] || '').trim();
          const className = String(row['Rombel Kelas'] || row['Kelas'] || row['Rombel'] || row['kelas'] || 'Kelas IX-C').trim();
          const email = String(row['Email'] || row['email'] || row['Surel'] || '').trim();
          const password = String(row['Password'] || row['Kata Sandi'] || row['password'] || 'Siswa123!*').trim();

          return {
            nisn,
            name,
            className,
            email: email || (nisn ? `${nisn}@siswa.smpn1.sch.id` : ''),
            password: password || 'Siswa123!*'
          };
        }).filter(r => r.name.length > 0 && r.nisn.length > 0);

        if (mappedRows.length === 0) {
          setImportError('Tidak ditemukan baris data siswa yang valid dengan kolom NISN dan Nama Lengkap.');
          return;
        }

        setImportRows(mappedRows);
      } catch (err: any) {
        console.error('File parse error:', err);
        setImportError(`Gagal membaca file: ${err?.message || 'Format tidak didukung'}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    setIsProcessing(true);
    setImportError(null);

    try {
      const res = await importStudentsBatch(importRows, {
        uid: currentUser.uid,
        name: currentUser.name
      });
      setImportSummary(res);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || 'Terjadi kesalahan saat memproses impor data.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export filtered students to Excel or CSV
  const handleExportData = (format: 'xlsx' | 'csv') => {
    let filtered = studentsList;

    if (exportClassFilter !== 'all') {
      filtered = filtered.filter(s => s.classId === exportClassFilter || s.className === exportClassFilter);
    }
    if (exportStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === exportStatusFilter);
    }

    const exportRows = filtered.map((s, idx) => {
      const cls = classes.find(c => c.id === s.classId || c.name === s.className);
      return {
        'No': idx + 1,
        'NISN': s.nisn || '-',
        'Nama Lengkap': s.name,
        'Rombel Kelas': s.className || cls?.name || '-',
        'Tingkat': cls?.grade || 'IX',
        'Wali Kelas': cls?.homeroomTeacherName || 'Belum Ditentukan',
        'Email Akun': s.email,
        'Status Akun': s.status === 'active' ? 'AKTIF' : 'DITANGGUHKAN',
        'Tanggal Terdaftar': new Date(s.createdAt).toLocaleDateString('id-ID')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Siswa');

    const timestamp = new Date().toISOString().substring(0, 10);
    const fileName = `Data_Siswa_CBT_SMPN1_${timestamp}.${format}`;

    if (format === 'csv') {
      XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Integrasi Data Siswa, Kelas & Guru Mata Pelajaran"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Data Siswa (Excel/CSV)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Data Siswa & Rekap Rombel</span>
          </button>
        </div>

        {/* =========================================================
            TAB 1: IMPORT DATA SISWA
            ========================================================= */}
        {activeTab === 'import' && (
          <div className="space-y-5">
            {/* Instruction Banner with Integration Context */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
              <Building className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">
                  Integrasi Otomatis ke Manajemen Rombel & Guru Mata Pelajaran:
                </p>
                <p className="mt-1 text-blue-800 leading-relaxed">
                  Siswa yang diimpor akan langsung dihubungkan ke kelas rombel terkait, memperbarui jumlah kuota siswa rombel secara dinamis, dan terhubung dengan guru pengampu mata pelajaran sesuai jenjang kelas (Tingkat VII, VIII, atau IX).
                </p>
              </div>
            </div>

            {/* Template Download Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Format Template Data Siswa</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gunakan format standar untuk NISN, Nama Lengkap, Rombel Kelas, dan Password.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .CSV</span>
                </button>
              </div>
            </div>

            {/* File Upload Drop Area */}
            {!importSummary && (
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-white">
                <input
                  type="file"
                  id="student-import-file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="student-import-file"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {fileName ? fileName : 'Klik untuk Mengunggah File Data Siswa (.xlsx / .csv)'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Maksimal 1.000 siswa per berkas impor.
                  </p>
                </label>
              </div>
            )}

            {/* Error Banner */}
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Preview Table of Rows Ready to Import */}
            {importRows.length > 0 && !importSummary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Pratinjau Data Impor ({importRows.length} Siswa)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Periksa kembali data sebelum melanjutkan proses.
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="px-3 py-2">No</th>
                        <th className="px-3 py-2">NISN</th>
                        <th className="px-3 py-2">Nama Lengkap</th>
                        <th className="px-3 py-2">Rombel Kelas</th>
                        <th className="px-3 py-2">Integrasi Guru & Mapel</th>
                        <th className="px-3 py-2">Email Akun</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {importRows.slice(0, 10).map((r, idx) => {
                        const matchedClass = classes.find(c => c.name.toLowerCase() === r.className.toLowerCase());
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono font-semibold text-blue-700">{r.nisn}</td>
                            <td className="px-3 py-2 font-bold">{r.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-800 border border-slate-200">
                                {r.className}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[11px]">
                              {matchedClass ? (
                                <span className="text-emerald-700 font-medium">
                                  ✓ Wali: {matchedClass.homeroomTeacherName || 'Otomatis'}
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium">
                                  + Buat Rombel Baru Otomatis
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-[11px]">{r.email}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {importRows.length > 10 && (
                  <p className="text-[11px] text-slate-500 text-center italic">
                    ...dan {importRows.length - 10} siswa lainnya siap diimpor.
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImportRows([]);
                      setFileName(null);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isProcessing}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memproses Impor Siswa...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Mulai Impor & Sinkron Rombel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Import Success Summary Screen */}
            {importSummary && (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">
                    Impor Data Siswa Berhasil Diselesaikan!
                  </h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Sebanyak <strong>{importSummary.totalImported} siswa</strong> berhasil didaftarkan dan terhubung ke manajemen rombel kelas sekolah.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-slate-700">
                    <span className="block text-slate-400">Total Siswa Diimpor</span>
                    <strong className="text-lg text-emerald-600 font-bold">{importSummary.totalImported}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-slate-700">
                    <span className="block text-slate-400">Rombel Baru Dibuat</span>
                    <strong className="text-lg text-blue-600 font-bold">{importSummary.classesCreated}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImportRows([]);
                    setFileName(null);
                    setImportSummary(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Tutup & Perbarui Daftar
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 2: EXPORT DATA SISWA & REKAP ROMBEL
            ========================================================= */}
        {activeTab === 'export' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">
                Export Data Siswa Lengkap Berdasarkan Rombel & Status
              </p>
              <p className="text-slate-500 leading-relaxed">
                Unduh file spreadsheet yang memuat seluruh NISN, nama lengkap, rombel belajar, wali kelas pengampu, status akun, dan statistik aktivitas CBT sekolah.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Filter Rombel Kelas
                </label>
                <select
                  value={exportClassFilter}
                  onChange={e => setExportClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Rombel ({studentsList.length} Siswa)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Filter Status Akun
                </label>
                <select
                  value={exportStatusFilter}
                  onChange={e => setExportStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Status (Aktif & Ditangguhkan)</option>
                  <option value="active">Hanya Akun Aktif</option>
                  <option value="suspended">Hanya Akun Ditangguhkan</option>
                </select>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Siap Mengekspor File Spreadsheet
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih format unduhan file yang Anda butuhkan:
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExportData('xlsx')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel (.XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportData('csv')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download CSV (.CSV)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
