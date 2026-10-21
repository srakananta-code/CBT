import React from 'react';
import {
  ClipboardList,
  Clock,
  Calendar,
  Users,
  Key,
  ShieldCheck,
  CheckCircle2,
  Award,
  Layers,
  BookOpen,
  Sparkles,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import type { Exam, Question, SchoolClass } from '../../types/database';

interface ExamPackagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Partial<Exam>;
  selectedQuestions: Question[];
  classes: SchoolClass[];
}

export const ExamPackagePreviewModal: React.FC<ExamPackagePreviewModalProps> = ({
  isOpen,
  onClose,
  exam,
  selectedQuestions,
  classes
}) => {
  if (!exam) return null;

  const totalWeight = selectedQuestions.reduce((acc, q) => acc + (q.weight || 10), 0);

  const examTypeLabels: Record<string, string> = {
    UH: 'Penilaian Harian (UH)',
    PTS: 'Penilaian Tengah Semester (PTS)',
    PAS: 'Penilaian Akhir Semester (PAS)',
    AAT: 'Asesmen Akhir Tahun (AAT)',
    TO: 'Try Out Ujian (TO)',
    US: 'Ujian Sekolah (US)',
    quiz: 'Kuis Harian'
  };

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'PG Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai'
  };

  const targetClassNames = exam.targetClassIds?.includes('all')
    ? 'Semua Rombel Belajar'
    : classes
        .filter(c => exam.targetClassIds?.includes(c.id))
        .map(c => c.name)
        .join(', ') || 'Belum dipilih';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Naskah & Lembar Paket Ujian CBT"
      maxWidth="4xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Exam Header Cover */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                {examTypeLabels[exam.examType || 'UH'] || exam.examType || 'Paket Ujian'}
              </span>
              <Badge variant={exam.status === 'published' ? 'success' : 'neutral'}>
                Status: {exam.status?.toUpperCase() || 'DRAFT'}
              </Badge>
            </div>
            <div className="text-xs text-blue-200">
              Tahun Ajaran: <strong>{exam.academicYearName || '2025/2026'}</strong>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {exam.title || 'Judul Paket Ujian'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-1">
              Mata Pelajaran: <strong>{exam.subjectName || '-'}</strong> • Guru Pengampu: <strong>{exam.teacherName || '-'}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <span className="text-blue-300 block text-[11px]">Durasi Pengerjaan</span>
              <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-amber-400" />
                {exam.durationMinutes || 60} Menit
              </span>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <span className="text-blue-300 block text-[11px]">Jumlah Butir Soal</span>
              <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                {selectedQuestions.length} Butir
              </span>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <span className="text-blue-300 block text-[11px]">Total Bobot Nilai</span>
              <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-purple-400" />
                {totalWeight} Poin (KKM {exam.passingScore || 75})
              </span>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <span className="text-blue-300 block text-[11px]">Sasaran Kelas</span>
              <span className="text-xs font-bold text-white line-clamp-1 mt-0.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                {targetClassNames}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Rules Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Konfigurasi Aturan & Pengawasan Ruang Ujian CBT:</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600 pt-1">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-800 block">Jadwal Pelaksanaan:</span>
              <span>
                Mulai: {exam.startTime ? new Date(exam.startTime).toLocaleString('id-ID') : '-'}
                <br />
                Selesai: {exam.endTime ? new Date(exam.endTime).toLocaleString('id-ID') : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-800 block">Integritas Soal:</span>
              <span>
                Acak Soal: <strong>{exam.rules?.shuffleQuestions ? 'Aktif' : 'Tidak'}</strong>
                <br />
                Acak Opsi: <strong>{exam.rules?.shuffleOptions ? 'Aktif' : 'Tidak'}</strong>
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-800 block">Pengawasan & Token:</span>
              <span>
                Pengawasan Layar: <strong>{exam.rules?.blockNewTab !== false ? 'Aktif (Maks 3 Pelanggaran)' : 'Nonaktif'}</strong>
                <br />
                Token Ujian: <strong>{exam.tokenEnabled && exam.token ? exam.token : 'Tanpa Token'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Questions List Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Daftar Butir Soal Terpasang ({selectedQuestions.length} Soal)</span>
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Total Bobot: {totalWeight} Poin
            </span>
          </div>

          {selectedQuestions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Belum Ada Soal yang Dipilih</p>
              <p className="text-[11px] text-slate-500">
                Pilih butir soal dari Bank Soal di formulir pembuatan ujian sebelum menerbitkan paket.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Badge variant="primary">{typeLabels[q.type] || q.type}</Badge>
                      {q.topic && <Badge variant="neutral">{q.topic}</Badge>}
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      Bobot: {q.weight || 10} Poin
                    </span>
                  </div>

                  {q.questionImage && (
                    <div className="py-2 text-center">
                      <img
                        src={q.questionImage}
                        alt="Ilustrasi Soal"
                        className="max-h-48 mx-auto rounded-xl border border-slate-200 object-contain shadow-2xs"
                      />
                    </div>
                  )}

                  <div className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                    <MathFormula content={q.questionText} />
                  </div>

                  {/* Options */}
                  {(q.type === 'multiple_choice' || q.type === 'complex_multiple_choice') && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map(opt => (
                        <div
                          key={opt.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {opt.id}
                            </span>
                            <div className="flex-1 text-slate-800">
                              <MathFormula content={opt.text} inline />
                            </div>
                          </div>
                          {opt.image && (
                            <div className="pl-7 pt-1">
                              <img
                                src={opt.image}
                                alt={`Gambar Opsi ${opt.id}`}
                                className="max-h-20 rounded border border-slate-200 object-contain"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True False */}
                  {q.type === 'true_false' && q.trueFalseStatements && (
                    <div className="space-y-1.5 pt-1 text-xs">
                      {q.trueFalseStatements.map((stmt, sIdx) => (
                        <div
                          key={stmt.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="text-slate-800">
                            <span className="font-bold mr-1.5">({sIdx + 1})</span>
                            <MathFormula content={stmt.statement} inline />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            [ Benar / Salah ]
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Short Answer */}
                  {q.type === 'short_answer' && (
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 text-xs text-purple-900 font-medium">
                      Kolom isian singkat yang akan diisi siswa secara langsung di layar ujian CBT.
                    </div>
                  )}

                  {/* Essay */}
                  {q.type === 'essay' && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                      Lembar jawaban esai yang akan diperiksa secara manual oleh guru pengampu berdasarkan rubrik penskoran.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </Modal>
  );
};
