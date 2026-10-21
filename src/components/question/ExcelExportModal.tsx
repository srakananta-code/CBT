import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Filter,
  FileText,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { exportQuestionsToExcelFile } from '../../services/excelQuestionService';
import type { Question, Subject, GradeLevel, QuestionType } from '../../types/database';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  subjects: Subject[];
  currentUserName: string;
  defaultSubjectId?: string;
  onAuditLog?: (action: string, details: string) => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  questions,
  subjects,
  currentUserName,
  defaultSubjectId,
  onAuditLog
}) => {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [filterSubjectId, setFilterSubjectId] = useState<string>(defaultSubjectId || 'all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filename, setFilename] = useState<string>('Bank_Soal_CBT');

  // Security: Kunci Jawaban Privat
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState<boolean>(false);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterSubjectId !== 'all' && q.subjectId !== filterSubjectId) return false;
      if (filterGrade !== 'all' && q.gradeLevel !== filterGrade) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;
      return true;
    });
  }, [questions, filterSubjectId, filterGrade, filterType]);

  const handleToggleIncludeKeys = (checked: boolean) => {
    if (checked) {
      setShowSecurityWarning(true);
    } else {
      setIncludeAnswerKey(false);
    }
  };

  const handleConfirmIncludeKeys = () => {
    setIncludeAnswerKey(true);
    setShowSecurityWarning(false);
  };

  const handleExecuteExport = () => {
    if (filteredQuestions.length === 0) {
      alert('Tidak ada butir soal yang sesuai dengan filter untuk diekspor.');
      return;
    }

    const curSubj = subjects.find(s => s.id === filterSubjectId);
    const subjectName = curSubj ? curSubj.name : 'Semua Mata Pelajaran';

    exportQuestionsToExcelFile({
      questions: filteredQuestions,
      format,
      includeAnswerKey,
      filename,
      metadata: {
        teacherName: currentUserName,
        subjectName,
        gradeLevel: filterGrade
      }
    });

    onAuditLog?.(
      `EXPORT_EXCEL_${format.toUpperCase()}`,
      `Mengekspor ${filteredQuestions.length} butir soal ke ${format.toUpperCase()}. Kunci jawaban privat: ${includeAnswerKey ? 'DISERTAKAN' : 'DISEMBUNYIKAN (AMAN)'}.`
    );

    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ekspor Bank Soal ke File Excel (XLSX / CSV)"
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Description */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Ekspor Berkas Spreadsheet Terstandar</span>
              <p className="text-emerald-800 text-[11px] leading-relaxed mt-0.5">
                Unduh kumpulan butir soal ke format Microsoft Excel (.xlsx) atau CSV sesuai kriteria filter yang Anda tentukan.
              </p>
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Format Berkas:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  format === 'xlsx'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="export_fmt"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="text-emerald-600"
                />
                <div>
                  <strong className="block text-xs text-slate-900">Microsoft Excel (.xlsx)</strong>
                  <span className="text-[10px] text-slate-500">Format spreadsheet modern lengkap</span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="export_fmt"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="text-emerald-600"
                />
                <div>
                  <strong className="block text-xs text-slate-900">Comma-Separated (.csv)</strong>
                  <span className="text-[10px] text-slate-500">Teks berbasis separator nilai koma</span>
                </div>
              </label>
            </div>
          </div>

          {/* Filter Options */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Filter Butir Soal yang Diekspor:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mata Pelajaran:
                </label>
                <select
                  value={filterSubjectId}
                  onChange={e => setFilterSubjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Semua Mapel</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tingkat Kelas:
                </label>
                <select
                  value={filterGrade}
                  onChange={e => setFilterGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Semua Kelas</option>
                  <option value="VII">Kelas VII</option>
                  <option value="VIII">Kelas VIII</option>
                  <option value="IX">Kelas IX</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jenis Soal:
                </label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Semua Jenis Soal</option>
                  <option value="multiple_choice">Pilihan Ganda</option>
                  <option value="complex_multiple_choice">PG Kompleks</option>
                  <option value="true_false">Benar / Salah</option>
                  <option value="short_answer">Isian Singkat</option>
                  <option value="essay">Uraian / Esai</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-500">Jumlah Soal Terpilih:</span>
              <strong className="text-emerald-700 font-bold bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                {filteredQuestions.length} Butir Soal
              </strong>
            </div>
          </div>

          {/* Filename Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Nama Berkas:
            </label>
            <input
              type="text"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
              placeholder="Contoh: Bank_Soal_Matematika_Kelas_IX"
            />
          </div>

          {/* Critical Security Protection for Answer Keys */}
          <div className={`p-4 rounded-2xl border transition-all ${
            includeAnswerKey
              ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={e => handleToggleIncludeKeys(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {includeAnswerKey ? (
                    <Lock className="w-4 h-4 text-amber-700" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className={`text-xs font-bold ${includeAnswerKey ? 'text-amber-900' : 'text-slate-800'}`}>
                    Sertakan Kunci Jawaban Privat & Pembahasan (Fungsi Khusus Guru / Admin)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {includeAnswerKey ? (
                    <span className="text-amber-800 font-medium">
                      ⚠️ PERINGATAN: Berkas ekspor akan memuat Kunci Jawaban Privat dan Pembahasan. Dokumen ini bersifat RAHASIA dan tidak boleh disebarkan ke siswa.
                    </span>
                  ) : (
                    <span>
                      Secara default, kunci jawaban dan pembahasan privat <strong>100% disembunyikan</strong> untuk menjamin keamanan naskah ujian.
                    </span>
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={filteredQuestions.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Berkas {format.toUpperCase()} ({filteredQuestions.length} Soal)</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Security Warning Modal when user checks includeAnswerKey */}
      <Modal
        isOpen={showSecurityWarning}
        onClose={() => setShowSecurityWarning(false)}
        title="Peringatan Keamanan Kunci Jawaban"
        maxWidth="sm"
      >
        <div className="py-2 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Konfirmasi Akses Data Sensitif
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kunci jawaban dan pembahasan privat hanya boleh diekspor untuk keperluan arsip penilaian guru atau kepanitiaan ujian resmi.
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 text-left font-medium">
            Pastikan berkas hasil unduhan tidak diunggah ke ruang publik atau dibagikan ke siswa sebelum ujian selesai.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSecurityWarning(false)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmIncludeKeys}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Saya Mengerti & Lanjutkan
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
