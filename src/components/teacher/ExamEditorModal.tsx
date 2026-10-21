import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Users,
  Key,
  BookOpen,
  Filter,
  Search,
  Sparkles,
  Shuffle,
  Award,
  Layers,
  Save,
  Send,
  HelpCircle,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import { ExamPackagePreviewModal } from './ExamPackagePreviewModal';
import type {
  Exam,
  ExamType,
  ExamStatus,
  ExamRules,
  Question,
  SchoolClass,
  Subject,
  AcademicYear,
  UserProfile,
  GradeLevel,
  DifficultyLevel,
  QuestionType
} from '../../types/database';

interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: Exam, selectedQuestions: Question[], isPublish: boolean) => Promise<void>;
  existingExam?: Exam | null;
  questions: Question[];
  classes: SchoolClass[];
  subjects: Subject[];
  academicYears: AcademicYear[];
  currentUser: UserProfile;
}

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingExam,
  questions,
  classes,
  subjects,
  academicYears,
  currentUser
}) => {
  // Navigation Tabs inside modal
  const [activeTab, setActiveTab] = useState<'identity' | 'schedule' | 'security' | 'questions'>('identity');

  // Form States: Identity
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('PTS');
  const [academicYearId, setAcademicYearId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [targetClassIds, setTargetClassIds] = useState<string[]>([]);

  // Form States: Schedule & Security
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [tokenEnabled, setTokenEnabled] = useState(true);
  const [token, setToken] = useState('');

  // Form States: Rules & Proctoring
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [blockNewTab, setBlockNewTab] = useState(true);
  const [maxViolations, setMaxViolations] = useState(3);
  const [passingScore, setPassingScore] = useState(75);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [showDiscussionAfterExam, setShowDiscussionAfterExam] = useState(false);
  const [scoringMethod, setScoringMethod] = useState<'standard' | 'penalty'>('standard');

  // Question Selection States
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [qSearch, setQSearch] = useState('');
  const [qSubjectFilter, setQSubjectFilter] = useState('all');
  const [qGradeFilter, setQGradeFilter] = useState('all');
  const [qTypeFilter, setQTypeFilter] = useState('all');
  const [qDifficultyFilter, setQDifficultyFilter] = useState('all');

  // Preview & Submit
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or populate form
  useEffect(() => {
    if (!isOpen) return;

    if (existingExam) {
      setTitle(existingExam.title || '');
      setExamType(existingExam.examType || 'PTS');
      setAcademicYearId(existingExam.academicYearId || (academicYears.find(y => y.isActive)?.id || ''));
      setSubjectId(existingExam.subjectId || '');
      setTargetClassIds(existingExam.targetClassIds || []);
      setStartTime(existingExam.startTime ? existingExam.startTime.substring(0, 16) : '');
      setEndTime(existingExam.endTime ? existingExam.endTime.substring(0, 16) : '');
      setDurationMinutes(existingExam.durationMinutes || 60);
      setMaxAttempts(existingExam.maxAttempts || 1);
      setTokenEnabled(existingExam.tokenEnabled !== false);
      setToken(existingExam.token || '');

      setShuffleQuestions(existingExam.rules?.shuffleQuestions ?? true);
      setShuffleOptions(existingExam.rules?.shuffleOptions ?? false);
      setBlockNewTab(existingExam.rules?.blockNewTab ?? true);
      setMaxViolations(existingExam.rules?.maxViolations ?? 3);
      setPassingScore(existingExam.passingScore || 75);
      setShowResultImmediately(existingExam.showResultImmediately ?? true);
      setShowDiscussionAfterExam(existingExam.rules?.showDiscussionAfterExam ?? false);
      setScoringMethod(existingExam.rules?.scoringMethod || 'standard');

      setSelectedQuestionIds(existingExam.questionIds || []);
    } else {
      // Default New Exam values
      setTitle('');
      setExamType('PTS');
      const activeYear = academicYears.find(y => y.isActive) || academicYears[0];
      setAcademicYearId(activeYear?.id || '');
      const defaultSubj = subjects[0]?.id || '';
      setSubjectId(defaultSubj);
      setTargetClassIds(classes.length > 0 ? [classes[0].id] : []);

      // Default start time: today at next hour
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      const startStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
      const endNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days window
      const endStr = new Date(endNow.getTime() - endNow.getTimezoneOffset() * 60000).toISOString().substring(0, 16);

      setStartTime(startStr);
      setEndTime(endStr);
      setDurationMinutes(60);
      setMaxAttempts(1);
      setTokenEnabled(true);
      generateRandomToken();

      setShuffleQuestions(true);
      setShuffleOptions(false);
      setBlockNewTab(true);
      setMaxViolations(3);
      setPassingScore(75);
      setShowResultImmediately(true);
      setShowDiscussionAfterExam(false);
      setScoringMethod('standard');

      setSelectedQuestionIds([]);
    }

    setErrorMsg(null);
    setActiveTab('identity');
  }, [isOpen, existingExam, subjects, classes, academicYears]);

  const generateRandomToken = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let res = 'SMP';
    for (let i = 0; i < 2; i++) res += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 2; i++) res += numbers.charAt(Math.floor(Math.random() * numbers.length));
    setToken(res);
  };

  // Filter bank soal for question selection tab
  const filteredBankQuestions = useMemo(() => {
    return questions.filter(q => {
      // Don't show archived questions
      if (q.isArchived) return false;

      // Subject filter (if user sets specific filter or matches current exam subject)
      if (qSubjectFilter !== 'all' && q.subjectId !== qSubjectFilter) return false;
      if (qGradeFilter !== 'all' && q.gradeLevel !== qGradeFilter) return false;
      if (qTypeFilter !== 'all' && q.type !== qTypeFilter) return false;
      if (qDifficultyFilter !== 'all' && q.difficulty !== qDifficultyFilter) return false;

      if (qSearch.trim()) {
        const query = qSearch.toLowerCase();
        const inText = q.questionText.toLowerCase().includes(query);
        const inTopic = q.topic?.toLowerCase().includes(query);
        const inSubj = q.subjectName.toLowerCase().includes(query);
        if (!inText && !inTopic && !inSubj) return false;
      }

      return true;
    });
  }, [questions, qSubjectFilter, qGradeFilter, qTypeFilter, qDifficultyFilter, qSearch]);

  // Selected question objects
  const selectedQuestions = useMemo(() => {
    return questions.filter(q => selectedQuestionIds.includes(q.id));
  }, [questions, selectedQuestionIds]);

  const totalCalculatedWeight = useMemo(() => {
    return selectedQuestions.reduce((acc, q) => acc + (q.weight || 10), 0);
  }, [selectedQuestions]);

  const handleToggleQuestionSelect = (qId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredBankQuestions.map(q => q.id);
    setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedQuestionIds([]);
  };

  const handleToggleTargetClass = (classId: string) => {
    if (classId === 'all') {
      if (targetClassIds.includes('all')) {
        setTargetClassIds([]);
      } else {
        setTargetClassIds(['all']);
      }
      return;
    }

    const withoutAll = targetClassIds.filter(id => id !== 'all');
    if (withoutAll.includes(classId)) {
      setTargetClassIds(withoutAll.filter(id => id !== classId));
    } else {
      setTargetClassIds([...withoutAll, classId]);
    }
  };

  // Validation & Save Handler
  const handleSaveAction = async (isPublish: boolean) => {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Nama / Judul ujian wajib diisi.');
      setActiveTab('identity');
      return;
    }

    if (!subjectId) {
      setErrorMsg('Mata pelajaran belum dipilih.');
      setActiveTab('identity');
      return;
    }

    if (targetClassIds.length === 0) {
      setErrorMsg('Pilih minimal satu kelas sasaran atau Semua Rombel.');
      setActiveTab('identity');
      return;
    }

    if (!startTime || !endTime) {
      setErrorMsg('Jadwal tanggal mulai dan tanggal selesai wajib ditentukan.');
      setActiveTab('schedule');
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setErrorMsg('Waktu selesai ujian harus lebih lambat dari waktu mulai.');
      setActiveTab('schedule');
      return;
    }

    if (durationMinutes < 5) {
      setErrorMsg('Durasi ujian minimal 5 menit.');
      setActiveTab('schedule');
      return;
    }

    if (isPublish && selectedQuestionIds.length === 0) {
      setErrorMsg('Penerbitan ujian memerlukan minimal 1 butir soal terpilih dari Bank Soal.');
      setActiveTab('questions');
      return;
    }

    const currentSubject = subjects.find(s => s.id === subjectId);
    const currentAcademicYear = academicYears.find(y => y.id === academicYearId);

    const targetClassNames = targetClassIds.includes('all')
      ? ['Semua Rombel Belajar']
      : classes.filter(c => targetClassIds.includes(c.id)).map(c => c.name);

    const examId = existingExam?.id || `exam_${Date.now()}`;
    const status: ExamStatus = isPublish ? 'published' : (existingExam?.status || 'draft');

    const examRules: ExamRules = {
      shuffleQuestions,
      shuffleOptions,
      blockNewTab,
      showScoreAfterExam: showResultImmediately,
      maxViolations: Number(maxViolations) || 3,
      showDiscussionAfterExam,
      scoringMethod
    };

    const examPayload: Exam = {
      id: examId,
      title: title.trim(),
      examType,
      academicYearId: currentAcademicYear?.id || academicYearId,
      academicYearName: currentAcademicYear?.name || '2025/2026',
      subjectId,
      subjectName: currentSubject?.name || 'Mata Pelajaran',
      targetClassIds,
      targetClassNames,
      teacherId: existingExam?.teacherId || currentUser.uid,
      teacherName: existingExam?.teacherName || currentUser.name,
      durationMinutes: Number(durationMinutes),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      maxAttempts: Number(maxAttempts) || 1,
      tokenEnabled,
      token: tokenEnabled ? token.trim() : undefined,
      status,
      rules: examRules,
      questionIds: selectedQuestionIds,
      totalQuestions: selectedQuestions.length,
      totalWeight: totalCalculatedWeight,
      passingScore: Number(passingScore) || 75,
      showResultImmediately,
      publishedAt: isPublish ? new Date().toISOString() : existingExam?.publishedAt,
      createdAt: existingExam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      await onSave(examPayload, selectedQuestions, isPublish);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Gagal menyimpan konfigurasi paket ujian.');
    } finally {
      setIsSubmitting(false);
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
        onClose={onClose}
        title={existingExam ? 'Edit Paket Ujian CBT' : 'Formulir Pembuatan Paket & Jadwal Ujian CBT'}
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'identity' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>1. Identitas & Sasaran</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'schedule' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>2. Jadwal & Akses</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'security' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>3. Aturan & Pengawasan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'questions' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>4. Pemilihan Soal ({selectedQuestionIds.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Pratinjau Paket</span>
            </button>
          </div>

          {/* Validation Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          {/* TAB 1: IDENTITAS & SASARAN */}
          {activeTab === 'identity' && (
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <span>Identitas Naskah Paket Ujian</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama / Judul Ujian <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Penilaian Tengah Semester Ganjil Matematika Kelas IX"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jenis Ujian <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={examType}
                      onChange={e => setExamType(e.target.value as ExamType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="UH">Penilaian Harian (UH)</option>
                      <option value="PTS">Penilaian Tengah Semester (PTS)</option>
                      <option value="PAS">Penilaian Akhir Semester (PAS)</option>
                      <option value="AAT">Asesmen Akhir Tahun (AAT)</option>
                      <option value="TO">Try Out Ujian (TO)</option>
                      <option value="US">Ujian Sekolah Resmi (US)</option>
                      <option value="quiz">Kuis Harian</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={subjectId}
                      onChange={e => {
                        setSubjectId(e.target.value);
                        setQSubjectFilter(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tahun Ajaran Aktif <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={academicYearId}
                      onChange={e => setAcademicYearId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>
                          TP {y.name} - Semester {y.semester.toUpperCase()} {y.isActive ? '(Aktif)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Target Classes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Kelas Sasaran Peserta Ujian <span className="text-rose-500">*</span></span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggleTargetClass('all')}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                      targetClassIds.includes('all')
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    {targetClassIds.includes('all') ? '✓ Semua Rombel Terpilih' : 'Pilih Semua Rombel'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classes.map(c => {
                    const isChecked = targetClassIds.includes('all') || targetClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTargetClass(c.id)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <span className="text-xs">{c.name} ({c.grade})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JADWAL & AKSES */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Jadwal Pelaksanaan & Durasi Pengerjaan</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal & Jam Mulai Ujian <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal & Jam Selesai Ujian <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Durasi Pengerjaan Peserta (Menit) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Waktu hitung mundur per siswa saat menekan tombol Mulai Ujian.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batas Percobaan Pengerjaan (Attempt Limit)
                    </label>
                    <select
                      value={maxAttempts}
                      onChange={e => setMaxAttempts(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="1">1 Kali Pengerjaan (Resmi)</option>
                      <option value="2">2 Kali Percobaan (Remedial Langsung)</option>
                      <option value="3">3 Kali Percobaan (Latihan Mandiri)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Token Access Configuration */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Token Masuk Ruang Ujian</h5>
                      <span className="text-[11px] text-slate-500">Mencegah siswa masuk sebelum diizinkan pengawas</span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tokenEnabled}
                      onChange={e => setTokenEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {tokenEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={token}
                      onChange={e => setToken(e.target.value.toUpperCase())}
                      placeholder="Masukkan Token (Misal: SMP9MTK)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest uppercase bg-white text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={generateRandomToken}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Acak Token</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ATURAN, PENILAIAN & PENGAWASAN */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              {/* Proctoring Policy */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <div>
                      <h5 className="text-xs font-bold text-rose-950">
                        Pengawasan Anti-Kecurangan (Tab Switching Proctoring)
                      </h5>
                      <span className="text-[11px] text-rose-700">
                        Aktif secara default untuk integritas ujian resmi sekolah
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockNewTab}
                      onChange={e => setBlockNewTab(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-rose-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>

                {blockNewTab && (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                    <span className="font-bold block">Kebijakan Tetap Pengawasan:</span>
                    <p className="text-[11px] leading-relaxed">
                      Sistem akan merekam setiap kali siswa berpindah tab atau meminimalkan jendela.
                      Batas maksimal pelanggaran adalah <strong>{maxViolations} kejadian</strong>. Pelanggaran ke-3 akan menyebabkan lembar ujian dikumpulkan secara otomatis (*auto-submit*).
                    </p>
                  </div>
                )}
              </div>

              {/* Shuffling Questions & Options */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-blue-600" />
                  <span>Pengacakan Soal & Opsi (Konsisten per Sesi Siswa)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={e => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                    />
                    <div>
                      <strong className="block text-slate-900">Acak Urutan Butir Soal</strong>
                      <span className="text-[11px] text-slate-500">
                        Setiap siswa menerima urutan nomor soal berbeda namun tetap konsisten pada sesinya.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={e => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                    />
                    <div>
                      <strong className="block text-slate-900">Acak Urutan Pilihan Jawaban</strong>
                      <span className="text-[11px] text-slate-500">
                        Urutan opsi A, B, C, D diacak dengan pemetaan yang aman untuk penilaian.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Scoring and Result Publication */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Kebijakan Penilaian & Publikasi Hasil</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kriteria Ketuntasan Minimal (KKM / Passing Score)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passingScore}
                      onChange={e => setPassingScore(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Metode Penilaian
                    </label>
                    <select
                      value={scoringMethod}
                      onChange={e => setScoringMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold"
                    >
                      <option value="standard">Standar (Hanya Jawaban Benar Dihitung)</option>
                      <option value="penalty">Penalti (Salah Mengurangi Nilai)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showResultImmediately}
                      onChange={e => setShowResultImmediately(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                    />
                    <div>
                      <strong className="block text-slate-900">Publikasi Nilai Langsung</strong>
                      <span className="text-[11px] text-slate-500">
                        Siswa langsung melihat nilai setelah menekan tombol Selesai Ujian.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDiscussionAfterExam}
                      onChange={e => setShowDiscussionAfterExam(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                    />
                    <div>
                      <strong className="block text-slate-900">Buka Pembahasan Pasca Ujian</strong>
                      <span className="text-[11px] text-slate-500">
                        Izinkan siswa melihat kunci & pembahasan setelah jadwal ujian berakhir.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PEMILIHAN SOAL */}
          {activeTab === 'questions' && (
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              {/* Metric bar of completeness */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl font-bold">
                    {selectedQuestionIds.length} Soal
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 block">
                      Total Bobot Terpasang: {totalCalculatedWeight} Poin
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Target KKM: {passingScore} Poin
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={selectedQuestionIds.length > 0 ? 'success' : 'warning'}>
                    {selectedQuestionIds.length > 0 ? 'Kelengkapan Siap Terbit' : 'Belum Ada Soal Terpilih'}
                  </Badge>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Pilih Semua ({filteredBankQuestions.length})
                  </button>
                  {selectedQuestionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
              </div>

              {/* Filters for bank soal */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari teks soal, materi, topik..."
                      value={qSearch}
                      onChange={e => setQSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <select
                    value={qSubjectFilter}
                    onChange={e => setQSubjectFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
                  >
                    <option value="all">Semua Mapel</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <select
                    value={qGradeFilter}
                    onChange={e => setQGradeFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
                  >
                    <option value="all">Semua Kelas</option>
                    <option value="VII">Kelas VII</option>
                    <option value="VIII">Kelas VIII</option>
                    <option value="IX">Kelas IX</option>
                  </select>

                  <select
                    value={qTypeFilter}
                    onChange={e => setQTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
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

              {/* Questions Checklist */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredBankQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
                    Tidak ada butir soal yang sesuai filter.
                  </div>
                ) : (
                  filteredBankQuestions.map(q => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestionSelect(q.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer shrink-0"
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={isSelected ? 'primary' : 'neutral'}>
                              {typeLabels[q.type] || q.type}
                            </Badge>
                            <span className="text-[11px] font-bold text-slate-700">
                              {q.subjectName} (Kelas {q.gradeLevel})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Bobot: {q.weight || 10} poin
                            </span>
                            {q.topic && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {q.topic}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-800 line-clamp-2 leading-relaxed">
                            <MathFormula content={q.questionText} inline />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveAction(false)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Sebagai Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAction(true)}
                disabled={isSubmitting || selectedQuestionIds.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Terbitkan Ujian (Publish Snapshot)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Package Preview Modal */}
      <ExamPackagePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        exam={{
          title,
          examType,
          subjectName: subjects.find(s => s.id === subjectId)?.name,
          teacherName: currentUser.name,
          academicYearName: academicYears.find(y => y.id === academicYearId)?.name,
          durationMinutes,
          passingScore,
          targetClassIds,
          startTime,
          endTime,
          tokenEnabled,
          token,
          status: 'draft',
          rules: {
            shuffleQuestions,
            shuffleOptions,
            blockNewTab,
            maxViolations,
            showScoreAfterExam: showResultImmediately,
            showDiscussionAfterExam,
            scoringMethod
          }
        }}
        selectedQuestions={selectedQuestions}
        classes={classes}
      />
    </>
  );
};
