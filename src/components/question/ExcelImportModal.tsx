import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Copy,
  Info,
  HelpCircle,
  FileCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Save,
  X,
  RefreshCw,
  Search
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  generateQuestionExcelTemplate,
  parseAndValidateQuestionExcel,
  executeExcelBatchImport,
  type ExcelImportSummary,
  type ExcelRowValidation,
  type DuplicatePolicy,
  type BatchSaveResult
} from '../../services/excelQuestionService';
import type { Question, UserProfile, Subject } from '../../types/database';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuestions: Question[];
  subjects: Subject[];
  currentUser: UserProfile;
  onSuccess: (result: BatchSaveResult) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingQuestions,
  subjects,
  currentUser,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter & tab in preview
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip');

  // Confirmation & Save State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<BatchSaveResult | null>(null);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(false);

  // Reset when closed
  const handleClose = () => {
    setSelectedFile(null);
    setFileName('');
    setSummary(null);
    setValidationError(null);
    setShowConfirmModal(false);
    setSaveResult(null);
    onClose();
  };

  const handleDownloadTemplate = () => {
    generateQuestionExcelTemplate();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      setValidationError('Berkas yang dipilih kosong (0 byte). Silakan pilih berkas Excel yang valid.');
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);
    setValidationError(null);
    setSummary(null);
    setSaveResult(null);

    try {
      setIsValidating(true);
      const res = await parseAndValidateQuestionExcel(
        file,
        existingQuestions,
        { uid: currentUser.uid, name: currentUser.name }
      );
      setSummary(res);
      if (res.invalidCount > 0 && res.validCount === 0) {
        setActiveTab('invalid');
      } else {
        setActiveTab('all');
      }
    } catch (err: any) {
      console.error(err);
      setValidationError(err?.message || 'Gagal memproses berkas Excel. Pastikan format kolom sesuai template.');
    } finally {
      setIsValidating(false);
    }
  };

  // Filtered rows for preview
  const filteredRows = useMemo(() => {
    if (!summary) return [];
    return summary.rows.filter(r => {
      // Tab filter
      if (activeTab === 'valid' && !r.isValid) return false;
      if (activeTab === 'invalid' && r.isValid) return false;
      if (activeTab === 'duplicate' && !r.isDuplicate) return false;

      // Search filter
      if (previewSearch.trim()) {
        const query = previewSearch.toLowerCase();
        const text = (r.question?.questionText || r.raw['Teks_Pertanyaan'] || '').toLowerCase();
        const subj = (r.question?.subjectName || r.raw['Mata_Pelajaran'] || '').toLowerCase();
        const rowStr = String(r.rowNumber);
        if (!text.includes(query) && !subj.includes(query) && !rowStr.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [summary, activeTab, previewSearch]);

  const handleTriggerSave = () => {
    if (!summary || summary.validCount === 0) return;
    setShowConfirmModal(true);
  };

  const handleExecuteSave = async () => {
    if (!summary) return;
    setIsSaving(true);
    try {
      const result = await executeExcelBatchImport(summary.rows, duplicatePolicy);
      setSaveResult(result);
      setShowConfirmModal(false);
      onSuccess(result);
    } catch (err: any) {
      console.error(err);
      setValidationError(err?.message || 'Terjadi kesalahan sistem saat menyimpan ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'PG Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai'
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Impor Bank Soal dari Berkas Excel (XLSX / CSV)"
        maxWidth="4xl"
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Action Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Modul Impor Cerdas Bank Soal Excel
                </h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                  Dukung 5 jenis soal (PG, PG Kompleks, Benar/Salah, Isian Singkat, dan Esai) dengan validasi ketat per baris dan deteksi duplikat otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Unduh template XLSX lengkap dengan petunjuk kolom"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Template XLSX</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{showGuidelines ? 'Tutup Petunjuk' : 'Petunjuk Format'}</span>
              </button>
            </div>
          </div>

          {/* Toggleable Guidelines */}
          {showGuidelines && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs text-slate-700">
              <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Struktur Kolom & Representasi Kunci Jawaban Resmi:</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-blue-700 block mb-1">1. Pilihan Ganda (PG)</span>
                  Kolom <code className="bg-slate-100 px-1 py-0.5 rounded">Jenis_Soal: PG</code>, Opsi A-D (atau E), Kunci diisi satu huruf kapital (misal: <code className="bg-slate-100 px-1 py-0.5 rounded">A</code>).
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-indigo-700 block mb-1">2. PG Kompleks (PGK)</span>
                  Kolom <code className="bg-slate-100 px-1 py-0.5 rounded">Jenis_Soal: PGK</code>, Kunci diisi beberapa huruf dipisahkan koma (misal: <code className="bg-slate-100 px-1 py-0.5 rounded">A, C, D</code>).
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-amber-700 block mb-1">3. Benar / Salah (BS)</span>
                  Kolom <code className="bg-slate-100 px-1 py-0.5 rounded">Jenis_Soal: BS</code>, Kunci diisi pasangan pernyataan & status dipisahkan titik koma (misal: <code className="bg-slate-100 px-1 py-0.5 rounded">Pernyataan A | BENAR ; Pernyataan B | SALAH</code>).
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-purple-700 block mb-1">4. Isian Singkat & Esai</span>
                  Isian Singkat diisi jawaban utama di <code className="bg-slate-100 px-1 py-0.5 rounded">Kunci_Jawaban</code> dan variasi sinonim di kolom <code className="bg-slate-100 px-1 py-0.5 rounded">Variasi_Jawaban_Isian</code>. Esai diisi <code className="bg-slate-100 px-1 py-0.5 rounded">RUBRIK_PENILAIAN</code>.
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Pilih Berkas Excel (.xlsx, .xls, .csv):
            </label>
            <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 bg-emerald-50/20 text-center transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-question-upload"
              />
              <label
                htmlFor="excel-question-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {fileName ? `Berkas Terpilih: ${fileName}` : 'Klik untuk Memilih Berkas Excel dari Komputer'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Mendukung format Microsoft Excel .xlsx, .xls, dan .csv
                </span>
              </label>
            </div>
          </div>

          {/* Validation In Progress */}
          {isValidating && (
            <div className="p-4 bg-slate-50 rounded-xl text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                Sedang memvalidasi struktur berkas dan konsistensi kunci jawaban...
              </p>
            </div>
          )}

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Gagal Memvalidasi Berkas:</strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Baris Soal</span>
                  <span className="text-lg font-bold text-slate-800">{summary.totalRows}</span>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-700 block">Baris Valid Siap Impor</span>
                  <span className="text-lg font-bold text-emerald-800">{summary.validCount}</span>
                </div>
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-rose-700 block">Baris Tidak Valid</span>
                  <span className="text-lg font-bold text-rose-800">{summary.invalidCount}</span>
                </div>
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-700 block">Duplikat Terdeteksi</span>
                  <span className="text-lg font-bold text-amber-800">{summary.duplicateCount}</span>
                </div>
              </div>

              {/* Duplicate Handling Policy */}
              {summary.duplicateCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Kebijakan Penanganan {summary.duplicateCount} Soal Duplikat:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_policy"
                        value="skip"
                        checked={duplicatePolicy === 'skip'}
                        onChange={() => setDuplicatePolicy('skip')}
                        className="text-amber-600"
                      />
                      <div>
                        <strong className="block text-slate-800">Lewati (Rekomendasi)</strong>
                        <span className="text-[10px] text-slate-500">Abaikan soal yang sudah ada</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_policy"
                        value="allow_copy"
                        checked={duplicatePolicy === 'allow_copy'}
                        onChange={() => setDuplicatePolicy('allow_copy')}
                        className="text-amber-600"
                      />
                      <div>
                        <strong className="block text-slate-800">Simpan Sebagai Salinan</strong>
                        <span className="text-[10px] text-slate-500">Buat butir soal variasi baru</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_policy"
                        value="overwrite"
                        checked={duplicatePolicy === 'overwrite'}
                        onChange={() => setDuplicatePolicy('overwrite')}
                        className="text-amber-600"
                      />
                      <div>
                        <strong className="block text-slate-800">Tetap Impor</strong>
                        <span className="text-[10px] text-slate-500">Simpan apa adanya</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                      activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({summary.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                      activeTab === 'valid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Valid ({summary.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('invalid')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                      activeTab === 'invalid' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bermasalah ({summary.invalidCount})
                  </button>
                  {summary.duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('duplicate')}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                        activeTab === 'duplicate' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Duplikat ({summary.duplicateCount})
                    </button>
                  )}
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari baris atau teks soal..."
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              {/* Rows Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center w-14">Baris</th>
                        <th className="px-3 py-2 text-left w-24">Tipe</th>
                        <th className="px-3 py-2 text-left w-28">Mapel / Kelas</th>
                        <th className="px-3 py-2 text-left">Teks Pertanyaan</th>
                        <th className="px-3 py-2 text-left w-28">Kunci Jawaban</th>
                        <th className="px-3 py-2 text-left w-48">Status & Kesalahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map(row => {
                        const rawText = row.question?.questionText || row.raw['Teks_Pertanyaan'] || '-';
                        const rawType = row.question?.type || row.raw['Jenis_Soal'] || '-';
                        const rawKey = typeof row.question?.answerKey === 'string'
                          ? row.question.answerKey
                          : (Array.isArray(row.question?.answerKey) ? row.question.answerKey.join(', ') : (row.raw['Kunci_Jawaban'] || '-'));

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-slate-50 transition-colors ${
                              !row.isValid ? 'bg-rose-50/30' : row.isDuplicate ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-600">
                              #{row.rowNumber}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              <Badge variant={row.question?.type === 'multiple_choice' ? 'primary' : 'neutral'}>
                                {typeLabels[rawType] || rawType}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="font-semibold text-slate-800 line-clamp-1">
                                {row.question?.subjectName || row.raw['Mata_Pelajaran'] || 'Umum'}
                              </div>
                              <span className="text-[10px] text-slate-500">
                                Kelas {row.question?.gradeLevel || row.raw['Tingkat_Kelas'] || 'IX'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              <div className="line-clamp-2">{rawText}</div>
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">
                              <span className="line-clamp-1">{rawKey}</span>
                            </td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Valid
                                  </span>
                                  {row.isDuplicate && (
                                    <span className="block text-[10px] font-bold text-amber-700">
                                      ⚠️ Terdeteksi Duplikat di Bank Soal
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    <AlertCircle className="w-3 h-3" /> Tidak Valid
                                  </span>
                                  <ul className="text-[10px] text-rose-600 list-disc list-inside space-y-0.5">
                                    {row.errors.map((err, i) => (
                                      <li key={i}>{err}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Outcome */}
          {saveResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Operasi Impor Berhasil Diselesaikan!</span>
              </div>
              <p className="text-xs text-emerald-800">
                Database mengonfirmasi: <strong>{saveResult.successCount} butir soal</strong> berhasil disimpan secara permanen ke Bank Soal.
                {saveResult.failCount > 0 && ` Terdapat ${saveResult.failCount} butir gagal disimpan.`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              {saveResult ? 'Selesai & Tutup' : 'Batal'}
            </button>

            {summary && summary.validCount > 0 && !saveResult && (
              <button
                type="button"
                onClick={handleTriggerSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Simpan {summary.validCount} Soal Valid ke Bank Soal</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog Before Save */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Konfirmasi Penyimpanan Bank Soal"
        maxWidth="md"
      >
        <div className="py-2 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Anda akan mengimpor <strong>{summary?.validCount} butir soal valid</strong> ke Bank Soal CBT sekolah.
            Operasi ini menggunakan <em>batch write</em> aman yang tidak akan menghapus atau merusak soal yang sudah ada.
          </p>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Baris File:</span>
              <span className="font-bold text-slate-900">{summary?.totalRows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Soal Valid yang Disimpan:</span>
              <span className="font-bold text-emerald-700">{summary?.validCount} butir</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Soal Duplikat:</span>
              <span className="font-bold text-amber-700">
                {summary?.duplicateCount} ({duplicatePolicy === 'skip' ? 'Dilewati' : duplicatePolicy === 'allow_copy' ? 'Disimpan Salinan' : 'Tetap Diimpor'})
              </span>
            </div>
            {summary && summary.invalidCount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Baris Tidak Valid (Dilewati):</span>
                <span className="font-bold text-rose-700">{summary.invalidCount} baris</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Periksa Kembali
            </button>
            <button
              type="button"
              onClick={handleExecuteSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <span>Ya, Konfirmasi & Simpan</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
