import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  Building,
  Printer,
  ShieldCheck,
  GraduationCap,
  Layers,
  BookOpen
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  exportQuestionsToPDF,
  exportQuestionsToDoc,
  exportQuestionsToJSON,
  exportQuestionsToExcel
} from '../../services/questionExportImportService';
import type { Question, Subject, GradeLevel, AppSetting, QuestionType } from '../../types/database';

interface QuestionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  subjects: Subject[];
  settings?: AppSetting | null;
  currentUserName: string;
  defaultSubjectId?: string;
  onAuditLog?: (action: string, details: string) => void;
}

export const QuestionExportModal: React.FC<QuestionExportModalProps> = ({
  isOpen,
  onClose,
  questions,
  subjects,
  settings,
  currentUserName,
  defaultSubjectId,
  onAuditLog
}) => {
  // Export Format: XLSX, CSV, DOC, PDF, JSON
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'doc' | 'pdf' | 'json'>('xlsx');

  // Filters
  const [filterSubjectId, setFilterSubjectId] = useState<string>(defaultSubjectId || 'all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Document Config
  const [docTitle, setDocTitle] = useState<string>('Bank_Soal_CBT');
  const [authorName, setAuthorName] = useState<string>(currentUserName);
  
  // Prompt 5 Security: Default false for general exports, only enabled with explicit confirmation
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(false);
  const [includeExplanation, setIncludeExplanation] = useState<boolean>(false);

  // Selected Question IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(true);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterSubjectId !== 'all' && q.subjectId !== filterSubjectId) return false;
      if (filterGrade !== 'all' && q.gradeLevel !== filterGrade) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;
      return true;
    });
  }, [questions, filterSubjectId, filterGrade, filterType]);

  // Questions to export
  const exportTargetQuestions = useMemo(() => {
    if (selectAll) return filteredQuestions;
    return filteredQuestions.filter(q => selectedIds.includes(q.id));
  }, [filteredQuestions, selectAll, selectedIds]);

  const handleToggleSelectQuestion = (id: string) => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds(filteredQuestions.filter(q => q.id !== id).map(q => q.id));
    } else {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(i => i !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleExecuteExport = () => {
    if (exportTargetQuestions.length === 0) {
      alert('Tidak ada butir soal yang dipilih untuk diekspor.');
      return;
    }

    const curSubj = subjects.find(s => s.id === filterSubjectId);
    const subjectName = curSubj ? curSubj.name : 'Semua Mata Pelajaran';

    const opts = {
      questions: exportTargetQuestions,
      subjectName,
      gradeLevel: filterGrade as any,
      title: docTitle,
      includeAnswerKey,
      includeExplanation,
      settings: settings || null,
      teacherName: authorName
    };

    if (exportFormat === 'xlsx' || exportFormat === 'csv') {
      exportQuestionsToExcel({
        questions: exportTargetQuestions,
        format: exportFormat,
        includeAnswerKey,
        includeExplanation,
        fileName: docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
      });
    } else if (exportFormat === 'pdf') {
      exportQuestionsToPDF(opts);
    } else if (exportFormat === 'doc') {
      exportQuestionsToDoc(opts);
    } else if (exportFormat === 'json') {
      exportQuestionsToJSON(exportTargetQuestions, 'bank_soal_cbt');
    }

    onAuditLog?.(
      `EXPORT_QUESTION_BANK_${exportFormat.toUpperCase()}`,
      `Mengekspor ${exportTargetQuestions.length} butir soal ke format ${exportFormat.toUpperCase()} (${docTitle}) - Kunci privat: ${includeAnswerKey ? 'YA' : 'TIDAK'}.`
    );

    onClose();
  };

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'PG Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ekspor Bank Soal CBT (Excel, Word, PDF, JSON)"
      maxWidth="3xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Format Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Pilih Format Berkas Ekspor:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => setExportFormat('xlsx')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col items-start gap-2 ${
                exportFormat === 'xlsx'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">Excel (XLSX)</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Format tabel spreadsheet resmi.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col items-start gap-2 ${
                exportFormat === 'csv'
                  ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-teal-100 text-teal-700 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">CSV (Data)</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Tabel data comma-separated.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('doc')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col items-start gap-2 ${
                exportFormat === 'doc'
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">Word (DOC)</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Dapat diedit di Word / Docs.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col items-start gap-2 ${
                exportFormat === 'pdf'
                  ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">PDF Resmi</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Siap cetak & arsip kop surat.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col items-start gap-2 ${
                exportFormat === 'json'
                  ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">JSON CBT</span>
                <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                  Cadangan mentah sistem.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Butir Soal yang Diekspor</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Mata Pelajaran</label>
              <select
                value={filterSubjectId}
                onChange={e => setFilterSubjectId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
              >
                <option value="all">Semua Mata Pelajaran</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tingkat Kelas</label>
              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
              >
                <option value="all">Semua Kelas</option>
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
                <option value="IX">Kelas IX</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Jenis Soal</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
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
        </div>

        {/* Naskah Document Config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Header Dokumen Naskah
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Guru / Penyusun Soal
            </label>
            <input
              type="text"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold"
            />
          </div>
        </div>

        {/* Security & Options Toggles */}
        {/* Security & Options Toggles Sesuai Kebijakan Prompt 5 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Kebijakan Keamanan Kunci Jawaban & Pembahasan Privat:</span>
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-semibold">
              Kewenangan Guru / Admin
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Secara default, ekspor umum <strong>TIDAK</strong> menyertakan kunci jawaban atau pembahasan sensitif guna mencegah kebocoran soal ujian ke siswa. Kunci jawaban hanya boleh diekspor untuk arsip guru atau naskah master.
          </p>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-800 pt-1 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={e => setIncludeAnswerKey(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500 cursor-pointer"
              />
              <span>Sertakan Kunci Jawaban Privat (Dokumen Rahasia Guru)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                disabled={!includeAnswerKey}
                checked={includeExplanation}
                onChange={e => setIncludeExplanation(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500 cursor-pointer disabled:opacity-40"
              />
              <span>Sertakan Pembahasan Privat & Rubrik Penskoran</span>
            </label>
          </div>

          {includeAnswerKey && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Peringatan Otoritas:</strong> Anda mengaktifkan opsi ekspor kunci jawaban resmi. Pastikan dokumen ini tidak diunggah ke ruang publik atau dibagikan kepada peserta sebelum seluruh sesi ujian selesai.
              </span>
            </div>
          )}
        </div>

        {/* Checklist of Question Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Pilih Butir Soal ({exportTargetQuestions.length} dari {filteredQuestions.length} terpilih):
            </span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={e => {
                  setSelectAll(e.target.checked);
                  if (e.target.checked) {
                    setSelectedIds(filteredQuestions.map(q => q.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
                className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
              />
              <span>Pilih Semua Hasil Filter</span>
            </label>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {filteredQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Tidak ada butir soal yang sesuai filter.</p>
            ) : (
              filteredQuestions.map((q, idx) => {
                const isChecked = selectAll || selectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleSelectQuestion(q.id)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-white border-blue-300 shadow-2xs'
                        : 'bg-white/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                      />
                      <span className="font-extrabold text-slate-700 shrink-0">#{idx + 1}</span>
                      <Badge variant="neutral">{typeLabels[q.type] || q.type}</Badge>
                      <span className="text-slate-800 truncate font-medium">
                        {q.questionText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500 font-semibold">
                      <span>{q.difficulty}</span>
                      <span>•</span>
                      <span>Bobot: {q.weight}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={exportTargetQuestions.length === 0}
            onClick={handleExecuteExport}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>
              Unduh Berkas {exportFormat.toUpperCase()} ({exportTargetQuestions.length} Soal)
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
