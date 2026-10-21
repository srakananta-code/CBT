import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Plus,
  Trash2,
  Image as ImageIcon,
  Type,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table,
  Code,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  Sliders,
  CheckSquare,
  Sparkles,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import type {
  Question,
  QuestionType,
  QuestionOption,
  GradeLevel,
  DifficultyLevel,
  Subject,
  TrueFalseStatement,
  ShortAnswerRule
} from '../../types/database';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
  subjects: Subject[];
  initialQuestion?: Question | null;
  currentUser: { uid: string; name: string };
  defaultSubjectId?: string;
  defaultGrade?: GradeLevel;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  initialQuestion,
  currentUser,
  defaultSubjectId,
  defaultGrade = 'IX'
}) => {
  // Mode: Editor vs Student Preview
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Basic Meta
  const [qType, setQType] = useState<QuestionType>('multiple_choice');
  const [subjectId, setSubjectId] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('IX');
  const [topic, setTopic] = useState<string>('');
  const [material, setMaterial] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [weight, setWeight] = useState<number>(10);
  const [learningObjectives, setLearningObjectives] = useState<string>('');

  // Question Content
  const [questionText, setQuestionText] = useState<string>('');
  const [questionImage, setQuestionImage] = useState<string>('');
  const [showImageInput, setShowImageInput] = useState<boolean>(false);

  // Options for Multiple Choice & Complex
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'A', text: '', isCorrect: true },
    { id: 'B', text: '', isCorrect: false },
    { id: 'C', text: '', isCorrect: false },
    { id: 'D', text: '', isCorrect: false }
  ]);

  // True/False Statements
  const [tfStatements, setTfStatements] = useState<TrueFalseStatement[]>([
    { id: 'stmt_1', statement: '', isCorrect: true },
    { id: 'stmt_2', statement: '', isCorrect: false }
  ]);

  // Short Answer
  const [shortAnswerKey, setShortAnswerKey] = useState<string>('');
  const [acceptedAnswersStr, setAcceptedAnswersStr] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [ignoreSpacing, setIgnoreSpacing] = useState<boolean>(true);

  // Private Explanation & Rubric
  const [explanation, setExplanation] = useState<string>('');

  // Validation & Saving
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [openOptionImageIdx, setOpenOptionImageIdx] = useState<number | null>(null);

  // Reset or Populate on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialQuestion) {
      setQType(initialQuestion.type || 'multiple_choice');
      setSubjectId(initialQuestion.subjectId);
      setGradeLevel(initialQuestion.gradeLevel || 'IX');
      setTopic(initialQuestion.topic || '');
      setMaterial(initialQuestion.material || '');
      setDifficulty(initialQuestion.difficulty || 'medium');
      setWeight(initialQuestion.weight || 10);
      setLearningObjectives(initialQuestion.learningObjectives || '');
      setQuestionText(initialQuestion.questionText || '');
      setQuestionImage(initialQuestion.questionImage || '');
      setShowImageInput(!!initialQuestion.questionImage);
      setExplanation(initialQuestion.explanation || '');

      // Options & Keys
      if (initialQuestion.options && initialQuestion.options.length > 0) {
        setOptions(initialQuestion.options);
      } else {
        setOptions([
          { id: 'A', text: '', isCorrect: true },
          { id: 'B', text: '', isCorrect: false },
          { id: 'C', text: '', isCorrect: false },
          { id: 'D', text: '', isCorrect: false }
        ]);
      }

      // True/False
      if (initialQuestion.trueFalseStatements && initialQuestion.trueFalseStatements.length > 0) {
        setTfStatements(initialQuestion.trueFalseStatements);
      } else {
        setTfStatements([
          { id: 'stmt_1', statement: '', isCorrect: true },
          { id: 'stmt_2', statement: '', isCorrect: false }
        ]);
      }

      // Short Answer
      if (initialQuestion.type === 'short_answer') {
        const key = typeof initialQuestion.answerKey === 'string' ? initialQuestion.answerKey : '';
        setShortAnswerKey(key);
        const accepted = initialQuestion.shortAnswerRules?.acceptedAnswers || [];
        setAcceptedAnswersStr(accepted.join(', '));
        setCaseSensitive(initialQuestion.shortAnswerRules?.caseSensitive || false);
        setIgnoreSpacing(initialQuestion.shortAnswerRules?.ignoreSpacing !== false);
      } else {
        setShortAnswerKey('');
        setAcceptedAnswersStr('');
      }
    } else {
      // New Question defaults
      setQType('multiple_choice');
      setSubjectId(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
      setGradeLevel(defaultGrade);
      setTopic('');
      setMaterial('');
      setDifficulty('medium');
      setWeight(10);
      setLearningObjectives('');
      setQuestionText('');
      setQuestionImage('');
      setShowImageInput(false);
      setExplanation('');
      setOptions([
        { id: 'A', text: '', isCorrect: true },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false }
      ]);
      setTfStatements([
        { id: 'stmt_1', statement: '', isCorrect: true },
        { id: 'stmt_2', statement: '', isCorrect: false }
      ]);
      setShortAnswerKey('');
      setAcceptedAnswersStr('');
      setCaseSensitive(false);
      setIgnoreSpacing(true);
    }
    setErrorMsg(null);
    setActiveTab('editor');
  }, [isOpen, initialQuestion, defaultSubjectId, defaultGrade, subjects]);

  // Insert helper into question text
  const insertTextAtCursor = (insertion: string) => {
    setQuestionText(prev => prev + insertion);
  };

  const insertLatexTemplate = (template: string) => {
    insertTextAtCursor(`$${template}$`);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Ukuran gambar maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setQuestionImage(ev.target.result as string);
          setShowImageInput(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Multiple Choice Option Handlers
  const handleOptionTextChange = (idx: number, text: string) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], text };
      return updated;
    });
  };

  const handleOptionImageChange = (idx: number, imageUrl: string) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], image: imageUrl.trim() || undefined };
      return updated;
    });
  };

  const handleOptionImageFileUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg(`Ukuran gambar opsi ${options[idx]?.id || ''} maksimal 2MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          handleOptionImageChange(idx, ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetSingleCorrect = (idx: number) => {
    setOptions(prev =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx
      }))
    );
  };

  const handleToggleMultipleCorrect = (idx: number) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isCorrect: !updated[idx].isCorrect };
      return updated;
    });
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const nextLetter = String.fromCharCode(65 + options.length);
    setOptions(prev => [...prev, { id: nextLetter, text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) {
      setErrorMsg('Minimal harus ada 2 pilihan jawaban.');
      return;
    }
    const filtered = options.filter((_, i) => i !== idx);
    const reindexed = filtered.map((opt, i) => ({
      ...opt,
      id: String.fromCharCode(65 + i)
    }));
    // Ensure at least one correct if multiple choice
    if (qType === 'multiple_choice' && !reindexed.some(o => o.isCorrect) && reindexed.length > 0) {
      reindexed[0].isCorrect = true;
    }
    setOptions(reindexed);
  };

  // True/False Handlers
  const handleTfStatementChange = (idx: number, text: string) => {
    setTfStatements(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], statement: text };
      return updated;
    });
  };

  const handleTfCorrectToggle = (idx: number, isCorrect: boolean) => {
    setTfStatements(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isCorrect };
      return updated;
    });
  };

  const handleAddTfStatement = () => {
    setTfStatements(prev => [
      ...prev,
      { id: `stmt_${Date.now()}_${prev.length + 1}`, statement: '', isCorrect: true }
    ]);
  };

  const handleRemoveTfStatement = (idx: number) => {
    if (tfStatements.length <= 1) {
      setErrorMsg('Minimal harus ada 1 pernyataan.');
      return;
    }
    setTfStatements(prev => prev.filter((_, i) => i !== idx));
  };

  // Submission Validation & Save
  const handleSave = async () => {
    setErrorMsg(null);

    if (!questionText.trim()) {
      setErrorMsg('Teks pertanyaan wajib diisi.');
      return;
    }

    const curSubj = subjects.find(s => s.id === subjectId) || subjects[0];
    if (!curSubj) {
      setErrorMsg('Mata pelajaran belum dipilih.');
      return;
    }

    // Validation per type
    let finalAnswerKey: any = undefined;
    let finalRules: ShortAnswerRule | undefined = undefined;

    if (qType === 'multiple_choice') {
      const emptyOpt = options.find(o => !o.text.trim());
      if (emptyOpt) {
        setErrorMsg(`Teks pilihan ${emptyOpt.id} tidak boleh kosong.`);
        return;
      }
      const correct = options.find(o => o.isCorrect);
      if (!correct) {
        setErrorMsg('Pilih tepat satu opsi jawaban benar untuk Pilihan Ganda.');
        return;
      }
      finalAnswerKey = correct.id;
    } else if (qType === 'complex_multiple_choice') {
      const emptyOpt = options.find(o => !o.text.trim());
      if (emptyOpt) {
        setErrorMsg(`Teks pilihan ${emptyOpt.id} tidak boleh kosong.`);
        return;
      }
      const correctOnes = options.filter(o => o.isCorrect).map(o => o.id);
      if (correctOnes.length === 0) {
        setErrorMsg('Pilih minimal satu kunci jawaban benar untuk Pilihan Ganda Kompleks.');
        return;
      }
      finalAnswerKey = correctOnes;
    } else if (qType === 'true_false') {
      const emptyStmt = tfStatements.find(s => !s.statement.trim());
      if (emptyStmt) {
        setErrorMsg('Semua pernyataan Benar/Salah wajib diisi teksnya.');
        return;
      }
      finalAnswerKey = tfStatements.map(s => (s.isCorrect ? 'B' : 'S'));
    } else if (qType === 'short_answer') {
      if (!shortAnswerKey.trim()) {
        setErrorMsg('Kunci jawaban isian singkat utama wajib diisi.');
        return;
      }
      const extraList = acceptedAnswersStr
        .split(/[,;\n]/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
      const allAccepted = Array.from(new Set([shortAnswerKey.trim(), ...extraList]));

      finalAnswerKey = shortAnswerKey.trim();
      finalRules = {
        caseSensitive,
        ignoreSpacing,
        acceptedAnswers: allAccepted
      };
    } else if (qType === 'essay') {
      finalAnswerKey = 'RUBRIK_PENILAIAN_MANUAL';
    }

    const questionId = initialQuestion?.id || `q_${Date.now()}`;

    const newQuestion: Question = {
      id: questionId,
      subjectId: curSubj.id,
      subjectName: curSubj.name,
      gradeLevel,
      type: qType,
      questionText: questionText.trim(),
      questionImage: questionImage.trim() || undefined,
      options: (qType === 'multiple_choice' || qType === 'complex_multiple_choice') ? options : [],
      topic: topic.trim() || 'Umum',
      material: material.trim() || undefined,
      difficulty,
      learningObjectives: learningObjectives.trim() || undefined,
      weight: Number(weight) || 10,
      answerKey: finalAnswerKey,
      trueFalseStatements: qType === 'true_false' ? tfStatements : undefined,
      shortAnswerRules: finalRules,
      explanation: explanation.trim() || undefined,
      creatorId: initialQuestion?.creatorId || currentUser.uid,
      creatorName: initialQuestion?.creatorName || currentUser.name,
      createdAt: initialQuestion?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      await onSave(newQuestion);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Gagal menyimpan butir soal ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialQuestion ? 'Edit Butir Soal Bank Soal' : 'Editor Bank Soal CBT Lengkap'}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Header Tabs: Editor Mode vs Live Student Preview */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor Soal & Kunci</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Tampilan Siswa</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>KaTeX LaTeX Engine & Format Otomatis Siap</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* TAB 1: FULL EDITOR */}
        {activeTab === 'editor' && (
          <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
            {/* 1. Kategori & Metadata Soal */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Identitas & Parameter Butir Soal</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Jenis Soal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jenis Soal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={qType}
                    onChange={e => setQType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="multiple_choice">Pilihan Ganda (Tepat 1 Jawaban)</option>
                    <option value="complex_multiple_choice">Pilihan Ganda Kompleks (Multi Kunci)</option>
                    <option value="true_false">Benar / Salah (Pernyataan)</option>
                    <option value="short_answer">Isian Singkat (Normalisasi Teks)</option>
                    <option value="essay">Uraian / Esai (Pemeriksaan Manual)</option>
                  </select>
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                {/* Tingkat Kelas */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tingkat Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={e => setGradeLevel(e.target.value as GradeLevel)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="VII">Kelas VII (Tujuh)</option>
                    <option value="VIII">Kelas VIII (Delapan)</option>
                    <option value="IX">Kelas IX (Sembilan)</option>
                  </select>
                </div>

                {/* Tingkat Kesulitan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="easy">Mudah (Dasar)</option>
                    <option value="medium">Sedang (Standar)</option>
                    <option value="hard">Sukar (HOTS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Materi Pokok */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Materi Pokok / Bab
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bangun Ruang Sisi Lengkung"
                    value={material}
                    onChange={e => setMaterial(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Topik / Subtopik */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Topik Spesifik
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Volume & Luas Tabung"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Bobot Soal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bobot Nilai (Poin)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weight}
                    onChange={e => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Capaian Pembelajaran Opsional */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tujuan Pembelajaran / Kompetensi Dasar (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Peserta didik mampu menganalisis luas permukaan dan volume tabung secara akurat."
                  value={learningObjectives}
                  onChange={e => setLearningObjectives(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 2. Text Editor Toolbar & Question Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900">
                  Teks Pertanyaan Soal <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Gunakan <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">$rumus$</code> untuk LaTeX inline
                </span>
              </div>

              {/* Formatting & LaTeX Formula Toolbar */}
              <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
                {/* Basic Text Format */}
                <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('**teks tebal**')}
                    title="Tebal (Bold)"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('*teks miring*')}
                    title="Miring (Italic)"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('<u>teks garis bawah</u>')}
                    title="Garis Bawah (Underline)"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('\n- Poin daftar\n- Poin daftar')}
                    title="Daftar Poin (List)"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('\n1. Langkah pertama\n2. Langkah kedua')}
                    title="Daftar Bernomor"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor('\n| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Data A | Data B | Data C |\n')}
                    title="Sisipkan Tabel Markdown"
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* LaTeX Formula Shortcuts */}
                <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                  <span className="text-[10px] font-bold text-blue-700 px-1">LaTeX:</span>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\frac{a}{b}')}
                    title="Pecahan \frac{a}{b}"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    a/b
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('x^2')}
                    title="Pangkat x²"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    x²
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\sqrt{x}')}
                    title="Akar kuadrat \sqrt{x}"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    √x
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\pi')}
                    title="Simbol Pi π"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    π
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\times')}
                    title="Perkalian ×"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\pm')}
                    title="Plus Minus ±"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    ±
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\int_a^b f(x)\\,dx')}
                    title="Integral \int"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    ∫
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLatexTemplate('\\sum_{i=1}^n x_i')}
                    title="Sigma \sum"
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-mono cursor-pointer"
                  >
                    ∑
                  </button>
                </div>

                {/* Image Trigger */}
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    showImageInput || questionImage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{questionImage ? 'Gambar Terpasang' : 'Sisipkan Gambar'}</span>
                </button>
              </div>

              {/* Optional Question Image Box */}
              {showImageInput && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Lampiran Gambar Soal (Diagram / Grafik / Ilustrasi)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionImage('');
                        setShowImageInput(false);
                      }}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        URL Gambar Online (Direct Link)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/diagram_geometri.png"
                        value={questionImage}
                        onChange={e => setQuestionImage(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Atau Upload dari Komputer (Max 2MB)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  {questionImage && (
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-500 font-semibold mb-1">Pratinjau Gambar:</p>
                      <div className="relative inline-block border border-slate-300 rounded-lg overflow-hidden bg-white max-h-48">
                        <img
                          src={questionImage}
                          alt="Ilustrasi Soal"
                          className="max-h-44 object-contain"
                          onError={() => setErrorMsg('Gagal memuat URL gambar. Pastikan URL valid.')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Question Text Area */}
              <textarea
                rows={5}
                placeholder="Tuliskan teks pertanyaan soal di sini. Contoh: Diketahui prisma segitiga siku-siku dengan alas $a = 6\text{ cm}$ dan tinggi $t = 8\text{ cm}$..."
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                className="w-full p-3.5 border border-slate-300 rounded-2xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-sans leading-relaxed"
              />

              {/* Instant Mini LaTeX Preview of Question Text */}
              {questionText && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Live Math & Text Render</span>
                  </div>
                  <MathFormula content={questionText} className="text-xs" />
                </div>
              )}
            </div>

            {/* 3. Dynamic Section based on Question Type */}
            <div className="border-t border-slate-200 pt-4 space-y-4">
              {/* TYPE: PILIHAN GANDA (SINGLE CORRECT) */}
              {qType === 'multiple_choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Pilihan Jawaban & Kunci Tunggal</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Klik tombol radio bulat untuk menentukan kunci jawaban yang benar.
                      </p>
                    </div>
                    {options.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Opsi ({String.fromCharCode(65 + options.length)})</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {options.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border transition-all ${
                          opt.isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Radio for Correct Answer */}
                          <label className="flex items-center gap-2 pt-1 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name="correctAnswerOption"
                              checked={opt.isCorrect}
                              onChange={() => handleSetSingleCorrect(idx)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                              opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {opt.id}
                            </span>
                          </label>

                          {/* Option Text Input */}
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder={`Teks pilihan jawaban ${opt.id}... (Bisa LaTeX misal $x = 5$)`}
                              value={opt.text}
                              onChange={e => handleOptionTextChange(idx, e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                            {opt.text.includes('$') && (
                              <div className="pt-0.5 pl-1">
                                <MathFormula content={opt.text} inline className="text-xs" />
                              </div>
                            )}
                          </div>

                          {/* Image Button on Option */}
                          <button
                            type="button"
                            onClick={() => setOpenOptionImageIdx(openOptionImageIdx === idx ? null : idx)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1 ${
                              opt.image
                                ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Sisipkan gambar pada opsi jawaban ini"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {opt.image && <span className="text-[10px]">Gambar</span>}
                          </button>

                          {/* Remove Option */}
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                              title="Hapus opsi ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Optional Image Box for this option */}
                        {(openOptionImageIdx === idx || opt.image) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 pl-9 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                              <span className="flex items-center gap-1 text-blue-700">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Gambar Pendukung Opsi {opt.id}:</span>
                              </span>
                              {opt.image && (
                                <button
                                  type="button"
                                  onClick={() => handleOptionImageChange(idx, '')}
                                  className="text-rose-600 hover:underline cursor-pointer text-[10px]"
                                >
                                  Hapus Gambar Opsi
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <input
                                type="url"
                                placeholder="URL Gambar Opsi (https://...)"
                                value={opt.image || ''}
                                onChange={e => handleOptionImageChange(idx, e.target.value)}
                                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleOptionImageFileUpload(idx, e)}
                                className="w-full text-[11px] text-slate-600 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-blue-600 file:text-white cursor-pointer"
                              />
                            </div>
                            {opt.image && (
                              <div className="inline-block mt-1 p-1 bg-white border border-slate-200 rounded-lg">
                                <img
                                  src={opt.image}
                                  alt={`Opsi ${opt.id}`}
                                  className="max-h-24 object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TYPE: PILIHAN GANDA KOMPLEKS (MULTIPLE CORRECT) */}
              {qType === 'complex_multiple_choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                        <span>Pilihan Ganda Kompleks (Bisa Beberapa Jawaban Benar)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Centang kotak pada semua pilihan yang bernilai benar.
                      </p>
                    </div>
                    {options.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Opsi ({String.fromCharCode(65 + options.length)})</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {options.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border transition-all ${
                          opt.isCorrect
                            ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox for Multiple Correct */}
                          <label className="flex items-center gap-2 pt-1 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={opt.isCorrect}
                              onChange={() => handleToggleMultipleCorrect(idx)}
                              className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                              opt.isCorrect ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {opt.id}
                            </span>
                          </label>

                          {/* Option Text Input */}
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder={`Teks pernyataan opsi ${opt.id}...`}
                              value={opt.text}
                              onChange={e => handleOptionTextChange(idx, e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                            {opt.text.includes('$') && (
                              <div className="pt-0.5 pl-1">
                                <MathFormula content={opt.text} inline className="text-xs" />
                              </div>
                            )}
                          </div>

                          {/* Image Button on Option */}
                          <button
                            type="button"
                            onClick={() => setOpenOptionImageIdx(openOptionImageIdx === idx ? null : idx)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1 ${
                              opt.image
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Sisipkan gambar pada opsi jawaban ini"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {opt.image && <span className="text-[10px]">Gambar</span>}
                          </button>

                          {/* Remove Option */}
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                              title="Hapus opsi ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Optional Image Box for this complex option */}
                        {(openOptionImageIdx === idx || opt.image) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 pl-9 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                              <span className="flex items-center gap-1 text-indigo-700">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Gambar Pendukung Opsi {opt.id}:</span>
                              </span>
                              {opt.image && (
                                <button
                                  type="button"
                                  onClick={() => handleOptionImageChange(idx, '')}
                                  className="text-rose-600 hover:underline cursor-pointer text-[10px]"
                                >
                                  Hapus Gambar Opsi
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <input
                                type="url"
                                placeholder="URL Gambar Opsi (https://...)"
                                value={opt.image || ''}
                                onChange={e => handleOptionImageChange(idx, e.target.value)}
                                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleOptionImageFileUpload(idx, e)}
                                className="w-full text-[11px] text-slate-600 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-indigo-600 file:text-white cursor-pointer"
                              />
                            </div>
                            {opt.image && (
                              <div className="inline-block mt-1 p-1 bg-white border border-slate-200 rounded-lg">
                                <img
                                  src={opt.image}
                                  alt={`Opsi ${opt.id}`}
                                  className="max-h-24 object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TYPE: BENAR / SALAH (TRUE / FALSE STATEMENTS) */}
              {qType === 'true_false' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        <span>Daftar Pernyataan Benar / Salah</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Setiap pernyataan akan dievaluasi oleh siswa dengan opsi [Benar] atau [Salah].
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTfStatement}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pernyataan</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {tfStatements.map((stmt, idx) => (
                      <div
                        key={stmt.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Tuliskan teks pernyataan (misal: Nilai dari $\sqrt{144}$ adalah 12)..."
                            value={stmt.statement}
                            onChange={e => handleTfStatementChange(idx, e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Toggle Benar vs Salah */}
                        <div className="flex items-center gap-2 shrink-0 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleTfCorrectToggle(idx, true)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              stmt.isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            BENAR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTfCorrectToggle(idx, false)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              !stmt.isCorrect
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            SALAH
                          </button>
                        </div>

                        {tfStatements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTfStatement(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TYPE: ISIAN SINGKAT (SHORT ANSWER) */}
              {qType === 'short_answer' && (
                <div className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
                  <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-purple-600" />
                    <span>Kunci Jawaban Isian Singkat & Aturan Normalisasi</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kunci Jawaban Utama <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 10 cm atau Soekarno"
                        value={shortAnswerKey}
                        onChange={e => setShortAnswerKey(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Variasi Jawaban Lain yang Diterima (Pisahkan Koma)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 10, 10cm, sepuluh sentimeter"
                        value={acceptedAnswersStr}
                        onChange={e => setAcceptedAnswersStr(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={!caseSensitive}
                        onChange={e => setCaseSensitive(!e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                      />
                      <span>Abaikan huruf besar / kecil (Case-Insensitive)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={ignoreSpacing}
                        onChange={e => setIgnoreSpacing(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                      />
                      <span>Abaikan spasi ekstra / ganda</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TYPE: URAIAN / ESAI */}
              {qType === 'essay' && (
                <div className="space-y-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Pedoman Penilaian Esai & Rubrik Penskoran</span>
                    </h4>
                    <Badge variant="warning">Pemeriksaan Manual Guru</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Tuliskan kriteria pemberian poin agar guru pengampu dapat menilai jawaban esai siswa secara objektif.
                  </p>
                </div>
              )}

              {/* 4. Private Explanation & Rubric */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pembahasan Privat & Rubrik Penskoran</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🔒 Terisolasi Privat (Hanya Guru & Admin)
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Tuliskan langkah penyelesaian, rumus yang digunakan, atau pembahasan rinci butir soal ini..."
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-2xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STUDENT PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Pratinjau Persis Tampilan Siswa:</strong> Kunci jawaban dan pembahasan privat 100% disembunyikan.
                </span>
              </div>
              <Badge variant="primary">Simulasi Ruang Ujian Siswa</Badge>
            </div>

            {/* Simulated Question Card */}
            <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-xs space-y-5">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                    1
                  </span>
                  <Badge variant="neutral">
                    {subjects.find(s => s.id === subjectId)?.name || 'Mata Pelajaran'}
                  </Badge>
                  <Badge variant="primary">Kelas {gradeLevel}</Badge>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Bobot: {weight} Poin
                </span>
              </div>

              {/* Question Image if present */}
              {questionImage && (
                <div className="text-center py-2">
                  <img
                    src={questionImage}
                    alt="Gambar Soal"
                    className="max-h-64 mx-auto rounded-xl border border-slate-200 object-contain"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="text-sm font-medium text-slate-900 leading-relaxed pl-2">
                <MathFormula content={questionText || 'Belum ada teks pertanyaan.'} />
              </div>

              {/* Interactive Options as Student Sees */}
              <div className="pt-2 pl-2">
                {/* 1. Multiple Choice */}
                {qType === 'multiple_choice' && (
                  <div className="space-y-2">
                    {options.map(opt => (
                      <label
                        key={opt.id}
                        className="flex flex-col p-3 rounded-xl border border-slate-200 hover:bg-blue-50/40 hover:border-blue-300 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="preview_student_radio"
                            className="w-4 h-4 text-blue-600 mt-0.5 cursor-pointer"
                          />
                          <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {opt.id}
                          </span>
                          <div className="text-xs text-slate-800 font-normal flex-1">
                            <MathFormula content={opt.text || `(Pilihan ${opt.id})`} inline />
                          </div>
                        </div>
                        {opt.image && (
                          <div className="mt-2 pl-8">
                            <img
                              src={opt.image}
                              alt={`Gambar Opsi ${opt.id}`}
                              className="max-h-36 rounded-lg border border-slate-200 object-contain shadow-2xs"
                            />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* 2. Complex Multiple Choice */}
                {qType === 'complex_multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 italic mb-2">
                      *Pilihlah semua jawaban yang menurut Anda benar (bisa lebih dari satu).
                    </p>
                    {options.map(opt => (
                      <label
                        key={opt.id}
                        className="flex flex-col p-3 rounded-xl border border-slate-200 hover:bg-indigo-50/40 hover:border-indigo-300 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                          />
                          <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {opt.id}
                          </span>
                          <div className="text-xs text-slate-800 font-normal flex-1">
                            <MathFormula content={opt.text || `(Pilihan ${opt.id})`} inline />
                          </div>
                        </div>
                        {opt.image && (
                          <div className="mt-2 pl-8">
                            <img
                              src={opt.image}
                              alt={`Gambar Opsi ${opt.id}`}
                              className="max-h-36 rounded-lg border border-slate-200 object-contain shadow-2xs"
                            />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* 3. True / False */}
                {qType === 'true_false' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Pernyataan</th>
                          <th className="px-4 py-2.5 text-center w-28">Benar</th>
                          <th className="px-4 py-2.5 text-center w-28">Salah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {tfStatements.map((stmt, sIdx) => (
                          <tr key={stmt.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-800 font-medium">
                              <span className="font-bold mr-1.5">{sIdx + 1}.</span>
                              <MathFormula content={stmt.statement || `(Pernyataan ke-${sIdx + 1})`} inline />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`preview_tf_${stmt.id}`}
                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`preview_tf_${stmt.id}`}
                                className="w-4 h-4 text-rose-600 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Short Answer */}
                {qType === 'short_answer' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tuliskan Jawaban Singkat Anda:
                    </label>
                    <input
                      type="text"
                      placeholder="Ketikkan jawaban Anda di sini..."
                      className="w-full max-w-md px-3.5 py-2.5 border-2 border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* 5. Essay */}
                {qType === 'essay' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Lembar Pengerjaan Jawaban Uraian Siswa:
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Tuliskan uraian dan penjelasan lengkap langkah pengerjaan Anda di sini..."
                      className="w-full p-3.5 border-2 border-slate-300 rounded-2xl text-xs bg-white text-slate-900 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-xs text-slate-500">
            {initialQuestion ? 'Mengedit soal yang sudah tersimpan.' : 'Soal baru akan disimpan ke Bank Soal.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Butir Soal'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
