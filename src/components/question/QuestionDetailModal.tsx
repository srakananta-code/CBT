import React from 'react';
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Calendar,
  User,
  BookOpen,
  Award,
  Layers,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import type { Question, QuestionType } from '../../types/database';

interface QuestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onEdit?: (question: Question) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  isOpen,
  onClose,
  question,
  onEdit
}) => {
  if (!question) return null;

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda (Tepat 1 Jawaban)',
    complex_multiple_choice: 'Pilihan Ganda Kompleks (Multi Kunci)',
    true_false: 'Benar / Salah (Pernyataan Bertingkat)',
    short_answer: 'Isian Singkat (Normalisasi Teks)',
    essay: 'Uraian / Esai (Pemeriksaan Manual)'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Lengkap Butir Soal Bank Soal"
      maxWidth="3xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header Tags & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{question.subjectName}</Badge>
            <Badge variant="neutral">Kelas {question.gradeLevel}</Badge>
            <Badge
              variant={
                question.difficulty === 'easy'
                  ? 'success'
                  : question.difficulty === 'medium'
                  ? 'warning'
                  : 'danger'
              }
            >
              {question.difficulty === 'easy'
                ? 'Mudah'
                : question.difficulty === 'medium'
                ? 'Sedang'
                : 'Sukar (HOTS)'}
            </Badge>
            <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Bobot: {question.weight || 10} Poin
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Tipe: <strong className="text-slate-800">{typeLabels[question.type] || question.type}</strong>
          </div>
        </div>

        {/* Topik & Materi jika ada */}
        {(question.topic || question.material || question.learningObjectives) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-blue-50/40 p-3 rounded-xl border border-blue-200/80">
            {question.material && (
              <div>
                <span className="font-bold text-blue-950 block">Materi Pokok:</span>
                <span className="text-blue-800">{question.material}</span>
              </div>
            )}
            {question.topic && (
              <div>
                <span className="font-bold text-blue-950 block">Topik / Subtopik:</span>
                <span className="text-blue-800">{question.topic}</span>
              </div>
            )}
            {question.learningObjectives && (
              <div className="sm:col-span-2 pt-1 border-t border-blue-200/60">
                <span className="font-bold text-blue-950 block">Tujuan Pembelajaran:</span>
                <span className="text-blue-800 italic">{question.learningObjectives}</span>
              </div>
            )}
          </div>
        )}

        {/* Question Image if present */}
        {question.questionImage && (
          <div className="text-center py-2">
            <img
              src={question.questionImage}
              alt="Gambar Soal"
              className="max-h-64 mx-auto rounded-xl border border-slate-200 object-contain shadow-2xs"
            />
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Isi Pertanyaan Soal:
          </span>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-sm font-medium leading-relaxed text-slate-900">
            <MathFormula content={question.questionText} />
          </div>
        </div>

        {/* Options / Statements breakdown */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Struktur Opsi & Jawaban:
          </span>

          {/* Multiple Choice & Complex */}
          {(question.type === 'multiple_choice' || question.type === 'complex_multiple_choice') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {question.options.map(opt => {
                const isCorrect =
                  opt.isCorrect ||
                  (typeof question.answerKey === 'string' && question.answerKey === opt.id) ||
                  (Array.isArray(question.answerKey) && question.answerKey.includes(opt.id));

                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex flex-col gap-2 ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <div className="flex-1">
                        <MathFormula content={opt.text} inline />
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                          Kunci
                        </span>
                      )}
                    </div>
                    {opt.image && (
                      <div className="pl-8 pt-1">
                        <img
                          src={opt.image}
                          alt={`Gambar Opsi ${opt.id}`}
                          className="max-h-28 rounded-lg border border-slate-200 object-contain shadow-2xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {question.type === 'true_false' && question.trueFalseStatements && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left">Pernyataan</th>
                    <th className="px-4 py-2 text-center w-36">Kunci Sebenarnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {question.trueFalseStatements.map((stmt, sIdx) => (
                    <tr key={stmt.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-800">
                        <span className="font-bold mr-1.5">{sIdx + 1}.</span>
                        <MathFormula content={stmt.statement} inline />
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">
                        {stmt.isCorrect ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            ✓ BENAR
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                            ✗ SALAH
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Short Answer */}
          {question.type === 'short_answer' && (
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900">Kunci Jawaban yang Diterima:</span>
                <span className="text-[11px] text-purple-700 font-medium">
                  {question.shortAnswerRules?.caseSensitive ? 'Huruf besar/kecil berpengaruh' : 'Abaikan huruf besar/kecil'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(question.shortAnswerRules?.acceptedAnswers || [question.answerKey as string]).map((ans, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 font-mono font-bold text-purple-900 text-xs"
                  >
                    "{ans}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Essay */}
          {question.type === 'essay' && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-1">Metode Evaluasi:</span>
              <p className="text-amber-800">
                Pemeriksaan manual oleh guru pengampu berdasarkan rubrik penilaian dan poin maksimal {question.weight || 20} poin.
              </p>
            </div>
          )}
        </div>

        {/* Private Explanation & Discussion */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Pembahasan Privat & Pedoman Rubrik Guru:</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Akses Terbatas Guru & Admin
            </span>
          </div>

          <div className="text-xs text-emerald-900 leading-relaxed font-sans">
            {question.explanation ? (
              <MathFormula content={question.explanation} />
            ) : (
              <span className="italic text-emerald-700">Tidak ada pembahasan khusus yang dicatat.</span>
            )}
          </div>
        </div>

        {/* Creator and Timestamp Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Penyusun: <strong>{question.creatorName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Dibuat: {new Date(question.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(question);
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Edit Soal Ini
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
