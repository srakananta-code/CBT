import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Tag,
  CheckCircle,
  XCircle,
  Copy,
  Edit,
  Trash2,
  Share2,
  FolderPlus,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import type { Question, Subject, GradeLevel, QuestionType, DifficultyLevel } from '../../types/database';

interface CentralQuestionBankProps {
  questions: Question[];
  subjects: Subject[];
  onAddQuestion: () => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (question: Question) => void;
  onDuplicateQuestion: (question: Question) => void;
  onCreateExamFromQuestions: (selectedQuestions: Question[]) => void;
}

export const CentralQuestionBank: React.FC<CentralQuestionBankProps> = ({
  questions,
  subjects,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onCreateExamFromQuestions
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select for reusing in exams
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Collect all unique tags across questions
  const allTags = useMemo(() => {
    const set = new Set<string>();
    // Default system tags
    ['PTS2025', 'PAS2025', 'HOTS', 'Pythagoras', 'Aljabar', 'Geometri', 'TataSurya', 'Literasi'].forEach(t => set.add(t));
    questions.forEach(q => {
      q.tags?.forEach(t => set.add(t.replace(/^#/, '')));
      if (q.topic) set.add(q.topic.replace(/\s+/g, ''));
    });
    return Array.from(set);
  }, [questions]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (q.isArchived) return false;
      if (selectedSubjectId !== 'all' && q.subjectId !== selectedSubjectId) return false;
      if (selectedGrade !== 'all' && q.gradeLevel !== selectedGrade) return false;
      if (selectedType !== 'all' && q.type !== selectedType) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedTag !== 'all') {
        const hasTag = q.tags?.some(t => t.toLowerCase() === selectedTag.toLowerCase()) ||
                       q.topic?.toLowerCase().includes(selectedTag.toLowerCase());
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inText = q.questionText.toLowerCase().includes(query);
        const inTopic = q.topic?.toLowerCase().includes(query);
        const inSubj = q.subjectName.toLowerCase().includes(query);
        const inTag = q.tags?.some(t => t.toLowerCase().includes(query));
        if (!inText && !inTopic && !inSubj && !inTag) return false;
      }
      return true;
    });
  }, [questions, selectedSubjectId, selectedGrade, selectedType, selectedDifficulty, selectedTag, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (qId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    }
  };

  const handleCreateExam = () => {
    const selected = questions.filter(q => selectedQuestionIds.includes(q.id));
    onCreateExamFromQuestions(selected);
  };

  const typeLabels: Record<QuestionType, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'PG Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai',
    matching: 'Menjodohkan'
  };

  const difficultyColors: Record<DifficultyLevel, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
    easy: { variant: 'success', label: 'Mudah' },
    medium: { variant: 'warning', label: 'Sedang' },
    hard: { variant: 'danger', label: 'Sulit' }
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-linear-to-r from-blue-900 via-indigo-900 to-[#0a192f] rounded-2xl text-white shadow-md gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 uppercase tracking-wide">
              Modul Terpusat Guru
            </span>
            <span className="text-xs text-blue-300">•</span>
            <span className="text-xs text-blue-200 font-medium">Bank Soal Multi-Mata Pelajaran</span>
          </div>
          <h2 className="text-xl font-bold">Bank Soal Terpusat & Repositori Ujian</h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Kelola, kategorisasikan, beri label/tag, dan gunakan kembali butir soal untuk berbagai paket ujian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedQuestionIds.length > 0 && (
            <button
              onClick={handleCreateExam}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Gunakan {selectedQuestionIds.length} Soal ke Ujian</span>
            </button>
          )}

          <button
            onClick={onAddQuestion}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Butir Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Categorization Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        {/* Search & Main Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari naskah soal, topik, materi, atau rumus..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Jenjang Kelas</option>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
              <option value="IX">Kelas IX</option>
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Tipe Soal</option>
              <option value="multiple_choice">Pilihan Ganda</option>
              <option value="complex_multiple_choice">PG Kompleks</option>
              <option value="true_false">Benar / Salah</option>
              <option value="short_answer">Isian Singkat</option>
              <option value="essay">Uraian / Esai</option>
            </select>
          </div>
        </div>

        {/* Tag Cloud Filter */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5" /> Label / Tag:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              selectedTag === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Tag
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Header Bar */}
      <div className="flex items-center justify-between text-xs px-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Pilih Semua ({filteredQuestions.length} Butir Soal Ditemukan)</span>
          </button>
          {selectedQuestionIds.length > 0 && (
            <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {selectedQuestionIds.length} Soal Terpilih
            </span>
          )}
        </div>

        {selectedQuestionIds.length > 0 && (
          <button
            type="button"
            onClick={handleCreateExam}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Kemas ke Paket Ujian Baru</span>
          </button>
        )}
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-800">Tidak Ada Soal yang Cocok</p>
            <p className="text-xs text-slate-400 mt-1">
              Sesuaikan kata kunci pencarian atau filter subjek/tag di atas.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isSelected = selectedQuestionIds.includes(q.id);
            const diffInfo = difficultyColors[q.difficulty] || { variant: 'warning', label: q.difficulty };

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(q.id)}
                      className="cursor-pointer text-slate-400 hover:text-blue-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                        {q.subjectName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        Kelas {q.gradeLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {typeLabels[q.type]}
                      </span>
                      <Badge variant={diffInfo.variant}>
                        {diffInfo.label}
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        Bobot: <strong>{q.weight || 10} Poin</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDuplicateQuestion(q)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
                      title="Duplikasi Butir Soal"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditQuestion(q)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs cursor-pointer"
                      title="Edit Butir Soal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteQuestion(q)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                      title="Hapus Butir Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="py-3.5 space-y-3">
                  <div className="text-sm text-slate-900 leading-relaxed">
                    <MathFormula content={q.questionText} />
                  </div>

                  {q.questionImage && (
                    <img
                      src={q.questionImage}
                      alt="Ilustrasi Soal"
                      className="max-h-48 rounded-xl border border-slate-200 object-contain"
                    />
                  )}

                  {/* Options Display for multiple choice */}
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map(opt => {
                        const isCorrectOpt = opt.id === q.answerKey || opt.isCorrect;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                              isCorrectOpt
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium'
                                : 'border-slate-200 text-slate-700 bg-white'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                isCorrectOpt
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <div className="flex-1">
                              <MathFormula content={opt.text} />
                            </div>
                            {isCorrectOpt && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tags & Topic Footer */}
                  <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Topik: {q.topic}</span>
                      {q.tags && q.tags.length > 0 && (
                        <>
                          <span>•</span>
                          {q.tags.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded bg-slate-100 text-blue-700 font-mono">
                              #{t.replace(/^#/, '')}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    <span className="text-slate-400">
                      Oleh: {q.creatorName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
