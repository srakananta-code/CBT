import React, { useState, useEffect, useMemo } from 'react';
import {
  FileQuestion,
  ClipboardList,
  Activity,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Key,
  Users,
  Search,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Copy,
  Archive,
  ArchiveRestore,
  Filter,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  Printer,
  Zap,
  X
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MathFormula } from '../common/MathFormula';
import { QuestionEditorModal } from '../question/QuestionEditorModal';
import { QuestionImportModal } from '../question/QuestionImportModal';
import { QuestionExportModal } from '../question/QuestionExportModal';
import { QuestionDetailModal } from '../question/QuestionDetailModal';
import { ExamEditorModal } from './ExamEditorModal';
import {
  exportResultsToCSV,
  exportResultsToPDF
} from '../../services/exportService';
import {
  getQuestions,
  saveQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  toggleArchiveQuestion,
  getExams,
  saveExam,
  publishExamWithSnapshots,
  getClasses,
  getSubjects,
  getSessionsForExam,
  getResultsForExam,
  getAcademicYears,
  getAppSettings,
  getAllUsers,
  getAuditLogs,
  logAuditEvent
} from '../../services/dbService';
import { LiveExamMonitor } from './LiveExamMonitor';
import { CentralQuestionBank } from './CentralQuestionBank';
import { StudentImportExportModal } from '../common/StudentImportExportModal';
import { ExamResultPdfReport } from '../common/ExamResultPdfReport';
import type {
  Question,
  Exam,
  SchoolClass,
  Subject,
  ExamSession,
  ExamResult,
  UserProfile,
  AcademicYear,
  AppSetting,
  GradeLevel,
  QuestionType,
  AuditLog
} from '../../types/database';

interface TeacherDashboardProps {
  user: UserProfile;
  activeTab: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, activeTab }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<AppSetting | null>(null);
  const [loading, setLoading] = useState(true);

  // Question Filters State
  const [qSearchQuery, setQSearchQuery] = useState('');
  const [qFilterSubject, setQFilterSubject] = useState('all');
  const [qFilterGrade, setQFilterGrade] = useState('all');
  const [qFilterType, setQFilterType] = useState('all');
  const [qFilterDifficulty, setQFilterDifficulty] = useState('all');
  const [qFilterArchived, setQFilterArchived] = useState<'all' | 'active' | 'archived'>('active');
  const [qFilterCreator, setQFilterCreator] = useState<'all' | 'mine'>('all');

  // Question View Mode & Modals State
  const [questionViewMode, setQuestionViewMode] = useState<'bank' | 'list'>('bank');
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isQuestionImportOpen, setIsQuestionImportOpen] = useState(false);
  const [isQuestionExportOpen, setIsQuestionExportOpen] = useState(false);
  const [selectedDetailQuestion, setSelectedDetailQuestion] = useState<Question | null>(null);

  // Student Import & Export Modal
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Exam Result PDF Report Modal with School Branding
  const [selectedExamForPdfReport, setSelectedExamForPdfReport] = useState<Exam | null>(null);

  // Audit Logs Filter
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Exam creation & edit modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [examSubjectId, setExamSubjectId] = useState('');
  const [examClassId, setExamClassId] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [examToken, setExamToken] = useState('SMP' + Math.floor(100 + Math.random() * 900));

  // Question delete confirmation
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  // Active exam for monitoring/results
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qList, exList, clList, subList, st, ayList, usersList, logsList] = await Promise.all([
        getQuestions(),
        getExams(),
        getClasses(),
        getSubjects(),
        getAppSettings(),
        getAcademicYears(),
        getAllUsers(),
        getAuditLogs()
      ]);
      setQuestions(qList);
      setExams(exList);
      setClasses(clList);
      setSubjects(subList);
      setSettings(st);
      setAcademicYears(ayList);
      setAllUsers(usersList);
      setAuditLogs(logsList);

      if (subList.length > 0) {
        setExamSubjectId(subList[0].id);
      }
      if (clList.length > 0) {
        setExamClassId(clList[0].id);
      }
      if (exList.length > 0) {
        setSelectedExamId(exList[0].id);
        const [sessList, resList] = await Promise.all([
          getSessionsForExam(exList[0].id),
          getResultsForExam(exList[0].id)
        ]);
        setSessions(sessList);
        setResults(resList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExamForMonitoring = async (examId: string) => {
    setSelectedExamId(examId);
    try {
      const [sessList, resList] = await Promise.all([
        getSessionsForExam(examId),
        getResultsForExam(examId)
      ]);
      setSessions(sessList);
      setResults(resList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeacherExportCSV = async () => {
    if (results.length === 0) return;
    const currentExam = exams.find(e => e.id === selectedExamId) || null;
    const settings = await getAppSettings();
    exportResultsToCSV({
      results,
      exam: currentExam,
      settings,
      filterDescription: currentExam ? `Ujian: ${currentExam.title}` : undefined
    });
    logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'teacher',
      action: 'EXPORT_RESULTS_CSV',
      details: `Guru mengunduh rekap nilai ujian ${currentExam?.title || ''} format CSV (${results.length} siswa).`
    });
  };

  const handleTeacherExportPDF = async () => {
    if (results.length === 0) return;
    const currentExam = exams.find(e => e.id === selectedExamId) || null;
    const settings = await getAppSettings();
    exportResultsToPDF({
      results,
      exam: currentExam,
      settings,
      filterDescription: currentExam ? `Ujian: ${currentExam.title}` : undefined,
      orientation: 'landscape'
    });
    logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'teacher',
      action: 'EXPORT_RESULTS_PDF',
      details: `Guru mengunduh rekap nilai ujian ${currentExam?.title || ''} format PDF (${results.length} siswa).`
    });
  };

  const handleSaveQuestion = async (q: Question) => {
    await saveQuestion(q);
    await logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'teacher',
      action: editingQuestion ? 'UPDATE_QUESTION' : 'CREATE_QUESTION',
      details: `${editingQuestion ? 'Memperbarui' : 'Membuat'} butir soal (${q.type}): ${q.questionText.substring(0, 40)}...`
    });
    showToast('success', `Berhasil ${editingQuestion ? 'memperbarui' : 'menyimpan'} butir soal ke bank soal.`);
    setEditingQuestion(null);
    loadData();
  };

  const handleDuplicateQuestion = async (sourceQ: Question) => {
    try {
      const duplicated = await duplicateQuestion(sourceQ, user.uid, user.name);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'teacher',
        action: 'DUPLICATE_QUESTION',
        details: `Menduplikasi butir soal ${sourceQ.id} menjadi ${duplicated.id}`
      });
      showToast('success', `Butir soal berhasil diduplikasi sebagai variasi.`);
      loadData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal menduplikasi soal.');
    }
  };

  const handleToggleArchive = async (targetQ: Question) => {
    const nextArchived = !targetQ.isArchived;
    try {
      await toggleArchiveQuestion(targetQ.id, nextArchived);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'teacher',
        action: nextArchived ? 'ARCHIVE_QUESTION' : 'RESTORE_QUESTION',
        details: `${nextArchived ? 'Mengarsipkan' : 'Mengaktifkan kembali'} butir soal ${targetQ.id}`
      });
      showToast('success', `Butir soal berhasil ${nextArchived ? 'diarsipkan' : 'diaktifkan kembali'}.`);
      loadData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal memperbarui status arsip soal.');
    }
  };

  const handleDeleteQuestionConfirm = async () => {
    if (!questionToDelete) return;
    try {
      await deleteQuestion(questionToDelete.id);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'teacher',
        action: 'DELETE_QUESTION',
        details: `Menghapus butir soal ${questionToDelete.id}`
      });
      showToast('success', 'Butir soal berhasil dihapus dari bank soal.');
      setQuestionToDelete(null);
      loadData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal menghapus soal.');
    }
  };

  const handleImportSuccess = (count: number, subjectId?: string, grade?: GradeLevel) => {
    if (subjectId) {
      setQFilterSubject(subjectId);
    }
    if (grade) {
      setQFilterGrade(grade);
    }
    setQFilterArchived('active');
    setQFilterCreator('all');
    setQSearchQuery('');
    const subjName = subjects.find(s => s.id === subjectId)?.name || 'mata pelajaran terkait';
    showToast('success', `Berhasil mengimpor ${count} butir soal ke ${subjName}. Filter telah disesuaikan agar soal langsung terlihat.`);
    loadData();
  };

  // Filtered Questions Memo
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Archive filter
      if (qFilterArchived === 'active' && q.isArchived) return false;
      if (qFilterArchived === 'archived' && !q.isArchived) return false;

      // Creator filter
      if (qFilterCreator === 'mine' && q.creatorId !== user.uid) return false;

      // Subject filter
      if (qFilterSubject !== 'all' && q.subjectId !== qFilterSubject) return false;

      // Grade filter
      if (qFilterGrade !== 'all' && q.gradeLevel !== qFilterGrade) return false;

      // Type filter
      if (qFilterType !== 'all' && q.type !== qFilterType) return false;

      // Difficulty filter
      if (qFilterDifficulty !== 'all' && q.difficulty !== qFilterDifficulty) return false;

      // Search query
      if (qSearchQuery.trim()) {
        const queryLower = qSearchQuery.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(queryLower);
        const matchesTopic = q.topic?.toLowerCase().includes(queryLower);
        const matchesMaterial = q.material?.toLowerCase().includes(queryLower);
        const matchesSubj = q.subjectName.toLowerCase().includes(queryLower);
        if (!matchesText && !matchesTopic && !matchesMaterial && !matchesSubj) return false;
      }

      return true;
    });
  }, [
    questions,
    qFilterArchived,
    qFilterCreator,
    user.uid,
    qFilterSubject,
    qFilterGrade,
    qFilterType,
    qFilterDifficulty,
    qSearchQuery
  ]);

  const handleCreateExamFromQuestions = (selectedQuestions: Question[]) => {
    if (selectedQuestions.length === 0) {
      showToast('error', 'Pilih minimal satu butir soal dari bank soal.');
      return;
    }
    const qIds = selectedQuestions.map(q => q.id);
    const subjId = selectedQuestions[0]?.subjectId || (subjects[0]?.id ?? '');
    const currentSubj = subjects.find(s => s.id === subjId);
    const newExamDraft: Exam = {
      id: `exam_${Date.now()}`,
      title: `Paket Ujian CBT - ${currentSubj?.name || 'Bank Soal'}`,
      examType: 'PTS',
      academicYearId: academicYears[0]?.id || 'ay_current',
      academicYearName: academicYears[0]?.name || '2025/2026',
      subjectId: subjId,
      subjectName: currentSubj?.name || 'Mata Pelajaran',
      targetClassIds: ['all'],
      targetClassNames: ['Semua Rombel Belajar'],
      teacherId: user.uid,
      teacherName: user.name,
      durationMinutes: 60,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'draft',
      rules: {
        shuffleQuestions: true,
        shuffleOptions: false,
        blockNewTab: true,
        showScoreAfterExam: true,
        maxViolations: 3,
        showDiscussionAfterExam: false,
        scoringMethod: 'standard'
      },
      questionIds: qIds,
      totalQuestions: qIds.length,
      passingScore: 75,
      showResultImmediately: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingExam(newExamDraft);
    setIsExamModalOpen(true);
    showToast('success', `${qIds.length} butir soal dari bank soal berhasil diimpor ke paket ujian baru.`);
  };

  const handleSaveExamFromEditor = async (exam: Exam, selectedQuestions: Question[], isPublish: boolean) => {
    try {
      if (isPublish) {
        // Freeze snapshot soal dan kunci jawaban privat (Prompt 6)
        const keysMap: Record<string, { correctAnswer: string; scoreValue: number; rubricExplanation?: string }> = {};
        selectedQuestions.forEach(q => {
          let cAns = '';
          if (q.type === 'multiple_choice') {
            cAns = typeof q.answerKey === 'string' ? q.answerKey : 'A';
          } else if (q.type === 'complex_multiple_choice') {
            cAns = Array.isArray(q.answerKey) ? JSON.stringify(q.answerKey) : JSON.stringify([q.answerKey]);
          } else if (q.type === 'true_false') {
            const tfMap: Record<string, string> = {};
            q.trueFalseStatements?.forEach(s => {
              tfMap[s.id] = s.isCorrect ? 'B' : 'S';
            });
            cAns = JSON.stringify(tfMap);
          } else if (q.type === 'short_answer') {
            cAns = Array.isArray(q.answerKey) ? q.answerKey.join('|') : String(q.answerKey || '');
          } else {
            cAns = String(q.answerKey || q.explanation || '');
          }

          keysMap[q.id] = {
            correctAnswer: cAns,
            scoreValue: q.weight || 10,
            rubricExplanation: q.explanation || 'Kunci jawaban terproteksi'
          };
        });

        await publishExamWithSnapshots(exam, selectedQuestions, keysMap);
        await logAuditEvent({
          userId: user.uid,
          userName: user.name,
          role: 'teacher',
          action: 'PUBLISH_EXAM_SNAPSHOT',
          details: `Menerbitkan paket ujian CBT "${exam.title}" (${selectedQuestions.length} snapshot soal beku).`
        });
        showToast('success', `Paket ujian "${exam.title}" berhasil diterbitkan bersama snapshot naskah.`);
      } else {
        await saveExam(exam);
        await logAuditEvent({
          userId: user.uid,
          userName: user.name,
          role: 'teacher',
          action: 'SAVE_EXAM_DRAFT',
          details: `Menyimpan draft paket ujian "${exam.title}".`
        });
        showToast('success', `Draft paket ujian "${exam.title}" berhasil disimpan.`);
      }
      setIsExamModalOpen(false);
      setEditingExam(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast('error', `Gagal menyimpan paket ujian: ${err?.message || 'Error'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memuat data guru...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Bank Soal Saya"
              value={questions.length}
              subtitle="Butir Soal Terdaftar"
              icon={FileQuestion}
              color="blue"
            />
            <StatCard
              title="Paket Ujian CBT"
              value={exams.length}
              subtitle="Paket Ujian Aktif"
              icon={ClipboardList}
              color="emerald"
            />
            <StatCard
              title="Peserta Mengerjakan"
              value={sessions.filter(s => s.status === 'ongoing').length}
              subtitle="Siswa Aktif di Ruang CBT"
              icon={Activity}
              color="amber"
            />
            <StatCard
              title="Nilai Masuk"
              value={results.length}
              subtitle="Hasil Pengerjaan Siswa"
              icon={GraduationCap}
              color="indigo"
            />
          </div>

          {/* Quick Actions & Integration Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Aksi Cepat & Akses Fitur Guru CBT</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionEditorOpen(true);
                }}
                className="p-3 bg-blue-50 hover:bg-blue-100/80 text-blue-900 rounded-xl border border-blue-200 text-left transition-colors cursor-pointer"
              >
                <FileQuestion className="w-5 h-5 text-blue-600 mb-1.5" />
                <span className="font-bold text-xs block">Tambah Butir Soal</span>
                <span className="text-[11px] text-blue-600">Editor multi-tipe & formula</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingExam(null);
                  setIsExamModalOpen(true);
                }}
                className="p-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 rounded-xl border border-emerald-200 text-left transition-colors cursor-pointer"
              >
                <ClipboardList className="w-5 h-5 text-emerald-600 mb-1.5" />
                <span className="font-bold text-xs block">Buat Paket Ujian</span>
                <span className="text-[11px] text-emerald-600">Jadwal, token & freeze snapshot</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportExportModalOpen(true)}
                className="p-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 rounded-xl border border-indigo-200 text-left transition-colors cursor-pointer"
              >
                <Users className="w-5 h-5 text-indigo-600 mb-1.5" />
                <span className="font-bold text-xs block">Impor / Ekspor Siswa</span>
                <span className="text-[11px] text-indigo-600">Terintegrasi rombel & mapel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (exams.length > 0) {
                    setSelectedExamForPdfReport(exams[0]);
                  } else {
                    showToast('error', 'Belum ada paket ujian untuk dicetak rapot.');
                  }
                }}
                className="p-3 bg-rose-50 hover:bg-rose-100/80 text-rose-900 rounded-xl border border-rose-200 text-left transition-colors cursor-pointer"
              >
                <Printer className="w-5 h-5 text-rose-600 mb-1.5" />
                <span className="font-bold text-xs block">Cetak Rapor Kop</span>
                <span className="text-[11px] text-rose-600">Format PDF resmi sekolah</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Panduan Praktis Guru CBT E-UJIAN SEKOLAH
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <span className="font-bold text-blue-900 block mb-1">1. Buat Bank Soal</span>
                Tambahkan butir soal bertingkat (Mudah, Sedang, Sulit) lengkap dengan formula matematika dan kunci jawaban terproteksi.
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <span className="font-bold text-emerald-900 block mb-1">2. Jadwalkan Paket Ujian</span>
                Atur durasi pengerjaan, token masuk ruang ujian, dan sasaran kelas rombongan belajar.
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                <span className="font-bold text-indigo-900 block mb-1">3. Pantau & Rekap Nilai</span>
                Monitoring pengerjaan siswa secara realtime dan lihat rekapitulasi nilai akhir peserta.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Question Bank & Management */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Sub-tab view mode switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuestionViewMode('bank')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  questionViewMode === 'bank'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Bank Soal Terpusat (Tag & Kategori)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionViewMode('list')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  questionViewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileQuestion className="w-4 h-4" />
                <span>Daftar & Editor Butir Soal ({filteredQuestions.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionEditorOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Soal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQuestionImportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Impor kumpulan soal dari file DOC / DOCX / TXT / Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Import Soal Cerdas</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQuestionExportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Ekspor bank soal ke file PDF resmi atau Word DOC"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Soal</span>
              </button>
            </div>
          </div>

          {questionViewMode === 'bank' ? (
            <CentralQuestionBank
              questions={questions}
              subjects={subjects}
              onAddQuestion={() => {
                setEditingQuestion(null);
                setIsQuestionEditorOpen(true);
              }}
              onEditQuestion={q => {
                setEditingQuestion(q);
                setIsQuestionEditorOpen(true);
              }}
              onDeleteQuestion={q => setQuestionToDelete(q)}
              onDuplicateQuestion={handleDuplicateQuestion}
              onCreateExamFromQuestions={handleCreateExamFromQuestions}
            />
          ) : (
            <div className="space-y-4">
              {/* Header Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileQuestion className="w-5 h-5 text-blue-600" />
                    <span>Daftar Butir Soal Saya & Editor</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total {questions.length} butir soal terdaftar ({filteredQuestions.length} butir sesuai filter aktif) • Kunci jawaban terisolasi privat aman.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionEditorOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Butir Soal</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQuestionImportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Impor kumpulan soal dari file DOC / DOCX / TXT / Teks CBT"
              >
                <Upload className="w-4 h-4" />
                <span>Import Soal Cerdas</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQuestionExportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Ekspor bank soal ke file PDF resmi atau Word DOC"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Soal (PDF / DOC)</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                toastMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{toastMsg.message}</span>
            </div>
          )}

          {/* Search & Multi-Filter Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari teks soal, materi, topik, rumus..."
                  value={qSearchQuery}
                  onChange={e => setQSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden"
                />
                {qSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setQSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Subject */}
              <select
                value={qFilterSubject}
                onChange={e => setQFilterSubject(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Mapel</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Filter Grade */}
              <select
                value={qFilterGrade}
                onChange={e => setQFilterGrade(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
                <option value="IX">Kelas IX</option>
              </select>

              {/* Filter Question Type */}
              <select
                value={qFilterType}
                onChange={e => setQFilterType(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Tipe Soal</option>
                <option value="multiple_choice">Pilihan Ganda (PG)</option>
                <option value="complex_multiple_choice">PG Kompleks</option>
                <option value="true_false">Benar / Salah</option>
                <option value="short_answer">Isian Singkat</option>
                <option value="essay">Uraian / Esai</option>
              </select>

              {/* Filter Difficulty */}
              <select
                value={qFilterDifficulty}
                onChange={e => setQFilterDifficulty(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Kesulitan</option>
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sukar (HOTS)</option>
              </select>

              {/* Filter Archive Status */}
              <select
                value={qFilterArchived}
                onChange={e => setQFilterArchived(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="active">Soal Aktif</option>
                <option value="archived">Diarsipkan</option>
                <option value="all">Semua Status</option>
              </select>

              {/* Filter Creator */}
              <select
                value={qFilterCreator}
                onChange={e => setQFilterCreator(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Pembuat</option>
                <option value="mine">Hanya Soal Saya</option>
              </select>
            </div>
          </div>

          {/* Question List View */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800">Tidak Ada Butir Soal yang Sesuai</p>
                <p className="text-xs text-slate-500 mt-1">
                  {questions.length === 0
                    ? 'Bank soal masih kosong. Buat butir soal baru atau import dokumen soal.'
                    : 'Tidak ditemukan soal dengan kriteria filter aktif di atas.'}
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setIsQuestionEditorOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Buat Soal Baru
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuestionImportOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Import Dokumen Soal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredQuestions.map((q, idx) => {
                const typeLabels: Record<string, string> = {
                  multiple_choice: 'Pilihan Ganda',
                  complex_multiple_choice: 'PG Kompleks',
                  true_false: 'Benar / Salah',
                  short_answer: 'Isian Singkat',
                  essay: 'Uraian / Esai'
                };

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all hover:border-slate-300 ${
                      q.isArchived ? 'border-amber-200 bg-amber-50/20 opacity-80' : 'border-slate-200/90'
                    }`}
                  >
                    {/* Card Top: Badges & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <Badge variant="primary">{q.subjectName}</Badge>
                        <Badge variant="neutral">Kelas {q.gradeLevel}</Badge>
                        <Badge
                          variant={
                            q.type === 'multiple_choice'
                              ? 'primary'
                              : q.type === 'complex_multiple_choice'
                              ? 'warning'
                              : q.type === 'true_false'
                              ? 'neutral'
                              : q.type === 'short_answer'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {typeLabels[q.type] || q.type}
                        </Badge>
                        <Badge
                          variant={
                            q.difficulty === 'easy'
                              ? 'success'
                              : q.difficulty === 'medium'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {q.difficulty === 'easy'
                            ? 'Mudah'
                            : q.difficulty === 'medium'
                            ? 'Sedang'
                            : 'Sukar'}
                        </Badge>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Bobot: {q.weight || 10}
                        </span>
                        {q.material && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Materi: {q.material}
                          </span>
                        )}
                        {q.isArchived && (
                          <Badge variant="warning">Diarsipkan</Badge>
                        )}
                      </div>

                      {/* Action Button Group per Question */}
                      <div className="flex items-center gap-1">
                        {/* Detail View */}
                        <button
                          type="button"
                          onClick={() => setSelectedDetailQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Lihat Detail & Kunci Jawaban"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Question */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsQuestionEditorOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Butir Soal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Duplicate Question */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Duplikasi Butir Soal"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Archive / Restore */}
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title={q.isArchived ? 'Aktifkan Kembali Soal' : 'Arsipkan Soal'}
                        >
                          {q.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>

                        {/* Delete Question */}
                        <button
                          type="button"
                          onClick={() => setQuestionToDelete(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Image if present */}
                    {q.questionImage && (
                      <div className="pl-8 mb-3">
                        <img
                          src={q.questionImage}
                          alt="Ilustrasi Soal"
                          className="max-h-40 rounded-xl border border-slate-200 object-contain"
                        />
                      </div>
                    )}

                    {/* Question Text with KaTeX LaTeX */}
                    <div className="text-sm text-slate-900 font-medium mb-3.5 pl-8 leading-relaxed">
                      <MathFormula content={q.questionText} />
                    </div>

                    {/* Option / Statement Structure */}
                    <div className="pl-8">
                      {/* Multiple Choice & Complex */}
                      {(q.type === 'multiple_choice' || q.type === 'complex_multiple_choice') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map(opt => {
                            const isCorrect =
                              opt.isCorrect ||
                              (typeof q.answerKey === 'string' && q.answerKey === opt.id) ||
                              (Array.isArray(q.answerKey) && q.answerKey.includes(opt.id));

                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300'
                                    : 'bg-slate-50 border-slate-200/80 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <div className="flex-1 font-normal">
                                  <MathFormula content={opt.text} inline />
                                </div>
                                {isCorrect && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False */}
                      {q.type === 'true_false' && q.trueFalseStatements && (
                        <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {q.trueFalseStatements.map((stmt, sIdx) => (
                            <div key={stmt.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 last:border-0">
                              <span className="text-slate-800">
                                <strong>({sIdx + 1})</strong> <MathFormula content={stmt.statement} inline />
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${stmt.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {stmt.isCorrect ? 'BENAR' : 'SALAH'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Short Answer */}
                      {q.type === 'short_answer' && (
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between">
                          <span className="text-purple-900 font-semibold">
                            Kunci Jawaban: <strong className="font-mono">{Array.isArray(q.answerKey) ? q.answerKey.join(', ') : (q.answerKey || '-')}</strong>
                          </span>
                          <span className="text-[11px] text-purple-700">
                            Variasi: {q.shortAnswerRules?.acceptedAnswers.join(', ') || '-'}
                          </span>
                        </div>
                      )}

                      {/* Essay */}
                      {q.type === 'essay' && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold">Uraian / Esai:</span> Evaluasi manual guru sesuai rubrik penskoran.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Exams Management */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                <span>Paket Ujian CBT</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi jadwal, token, dan durasi pengerjaan ujian siswa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportExportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Impor atau ekspor data siswa terintegrasi dengan rombel kelas dan mapel guru"
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Impor / Ekspor Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExam(null);
                  setIsExamModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Paket Ujian Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(exam => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {exam.subjectName}
                    </span>
                    <Badge variant={exam.status === 'published' ? 'success' : 'neutral'}>
                      {exam.status === 'published' ? 'Aktif' : exam.status}
                    </Badge>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{exam.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Sasaran: {exam.targetClassNames?.join(', ') || 'Semua Kelas'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div>Durasi: <strong>{exam.durationMinutes} Menit</strong></div>
                    <div>Jumlah Soal: <strong>{exam.totalQuestions} Soal</strong></div>
                    <div>Token: <strong className="font-mono text-blue-700">{exam.token || 'Tanpa Token'}</strong></div>
                    <div>KKM: <strong>{exam.passingScore}</strong></div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Dibuat: {new Date(exam.createdAt).toLocaleDateString('id-ID')}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingExam(exam);
                        setIsExamModalOpen(true);
                      }}
                      className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
                      title="Edit / Konfigurasi Paket Ujian"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Paket</span>
                    </button>
                    <button
                      onClick={() => handleSelectExamForMonitoring(exam.id)}
                      className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Lihat Monitoring →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Realtime Monitoring Dashboard for Teachers */}
      {activeTab === 'monitoring' && (
        <LiveExamMonitor
          exams={exams}
          selectedExamId={selectedExamId}
          onSelectExam={handleSelectExamForMonitoring}
          currentUser={user}
          classes={classes}
          users={allUsers}
        />
      )}

      {/* Tab: Grades & Results */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Rekapitulasi Nilai Siswa</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai terintegrasi langsung dengan kunci jawaban yang aman di Firestore.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {exams.length > 0 && (
                <select
                  value={selectedExamId}
                  onChange={e => handleSelectExamForMonitoring(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-700 cursor-pointer"
                >
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              )}
              {results.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleTeacherExportCSV}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="Unduh rekap nilai ke format CSV (Excel)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Unduh CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTeacherExportPDF}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="Unduh rekap nilai ke format PDF resmi"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentExam = exams.find(e => e.id === selectedExamId) || exams[0] || null;
                      if (currentExam) {
                        setSelectedExamForPdfReport(currentExam);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="Cetak Laporan Format PDF Resmi Lengkap Kop Surat & Logo Sekolah"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Rapor Kop Sekolah</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum Ada Hasil Nilai</p>
              <p className="text-xs text-slate-500 mt-1">Nilai akan terhitung otomatis saat peserta menyelesaikan lembar ujian.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Nama Siswa</th>
                      <th className="px-5 py-3">Kelas</th>
                      <th className="px-5 py-3 text-center">Benar</th>
                      <th className="px-5 py-3 text-center">Salah</th>
                      <th className="px-5 py-3 text-center">Nilai Akhir</th>
                      <th className="px-5 py-3 text-center">Kelulusan (KKM 75)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-semibold text-slate-900">{r.studentName}</td>
                        <td className="px-5 py-3">{r.className}</td>
                        <td className="px-5 py-3 text-center font-bold text-emerald-600">{r.correctCount}</td>
                        <td className="px-5 py-3 text-center font-bold text-rose-600">{r.wrongCount}</td>
                        <td className="px-5 py-3 text-center font-extrabold text-sm text-blue-600">{r.finalScore}</td>
                        <td className="px-5 py-3 text-center">
                          {r.finalScore >= 75 ? (
                            <Badge variant="success">Tuntas</Badge>
                          ) : (
                            <Badge variant="warning">Remedial</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Detailed Audit Logs for Teachers (Prompt 9: Track all changes made to exam configurations, timestamps & user IDs) */}
      {activeTab === 'auditLogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Audit Log Transparansi Konfigurasi & Aktivitas Ujian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekam jejak seluruh perubahan konfigurasi paket ujian, pembuatan bank soal, jadwal, token, dan penanganan siswa dengan User ID dan timestamp.
              </p>
            </div>
          </div>

          {/* Search & Action Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari aktivitas, ID pengguna, nama guru, atau judul ujian..."
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <select
              value={auditActionFilter}
              onChange={e => setAuditActionFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 cursor-pointer font-medium"
            >
              <option value="all">Semua Tipe Aksi</option>
              <option value="PUBLISH_EXAM_SNAPSHOT">Penerbitan Naskah (Snapshot Beku)</option>
              <option value="SAVE_EXAM_DRAFT">Simpan Draft Ujian</option>
              <option value="CREATE_QUESTION">Tambah Butir Soal</option>
              <option value="UPDATE_QUESTION">Ubah Butir Soal</option>
              <option value="DELETE_QUESTION">Hapus Butir Soal</option>
              <option value="DUPLICATE_QUESTION">Duplikasi Soal</option>
              <option value="ADD_EXTRA_TIME">Penambahan Waktu Ujian</option>
              <option value="TEACHER_WARNING">Peringatan Pengawas</option>
              <option value="RESET_EXAM_SESSION">Reset Sesi Siswa</option>
              <option value="UNLOCK_EXAM_SCREEN">Buka Kunci Layar</option>
              <option value="EXPORT_RESULTS_PDF">Ekspor PDF Nilai</option>
              <option value="EXPORT_RESULTS_CSV">Ekspor CSV Nilai</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          {(() => {
            const filteredLogs = auditLogs.filter(log => {
              if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
              if (auditSearchQuery.trim()) {
                const q = auditSearchQuery.toLowerCase();
                const inAct = log.action.toLowerCase().includes(q);
                const inDet = log.details.toLowerCase().includes(q);
                const inUser = log.userName.toLowerCase().includes(q);
                const inId = log.userId.toLowerCase().includes(q);
                if (!inAct && !inDet && !inUser && !inId) return false;
              }
              return true;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">Belum Ada Catatan Audit Log</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh perubahan paket ujian atau tindakan pengawas akan otomatis tercatat di sini.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Waktu (WIB)</th>
                        <th className="px-5 py-3">Aktor (Pengguna)</th>
                        <th className="px-5 py-3">User ID</th>
                        <th className="px-5 py-3">Jenis Tindakan</th>
                        <th className="px-5 py-3">Rincian Konfigurasi & Transparansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}{' '}
                            {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{log.userName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {log.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600">
                              {log.userId}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.action.includes('EXAM') || log.action.includes('SNAPSHOT')
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : log.action.includes('WARNING') || log.action.includes('RESET')
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : log.action.includes('DELETE')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-800 font-normal">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Full Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isQuestionEditorOpen}
        onClose={() => {
          setIsQuestionEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        subjects={subjects}
        initialQuestion={editingQuestion}
        currentUser={{ uid: user.uid, name: user.name }}
      />

      {/* Smart Question Import Modal (Excel XLSX / CSV / DOC / TXT) */}
      <QuestionImportModal
        isOpen={isQuestionImportOpen}
        onClose={() => setIsQuestionImportOpen(false)}
        subjects={subjects}
        currentUser={{ uid: user.uid, name: user.name }}
        onSuccess={handleImportSuccess}
        defaultSubjectId={qFilterSubject !== 'all' ? qFilterSubject : undefined}
        defaultGrade={qFilterGrade !== 'all' ? (qFilterGrade as GradeLevel) : 'IX'}
        existingQuestions={questions}
      />

      {/* Question Export Modal (Excel, CSV, PDF, DOC, JSON) */}
      <QuestionExportModal
        isOpen={isQuestionExportOpen}
        onClose={() => setIsQuestionExportOpen(false)}
        questions={questions}
        subjects={subjects}
        settings={settings}
        currentUserName={user.name}
        defaultSubjectId={qFilterSubject !== 'all' ? qFilterSubject : undefined}
        onAuditLog={(action, details) => {
          logAuditEvent({
            userId: user.uid,
            userName: user.name,
            role: 'teacher',
            action,
            details
          });
        }}
      />

      {/* Question Detail View Modal */}
      <QuestionDetailModal
        isOpen={!!selectedDetailQuestion}
        onClose={() => setSelectedDetailQuestion(null)}
        question={selectedDetailQuestion}
        onEdit={q => {
          setEditingQuestion(q);
          setIsQuestionEditorOpen(true);
        }}
      />

      {/* Modal Paket Ujian Lengkap & Terjadwal (Prompt 6: Snapshot Freeze, Proctoring, Anti-Cheat, Token, Shuffle) */}
      <ExamEditorModal
        isOpen={isExamModalOpen}
        onClose={() => {
          setIsExamModalOpen(false);
          setEditingExam(null);
        }}
        onSave={handleSaveExamFromEditor}
        existingExam={editingExam}
        questions={questions}
        classes={classes}
        subjects={subjects}
        academicYears={academicYears}
        currentUser={user}
      />

      {/* Delete Question Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleDeleteQuestionConfirm}
        title="Konfirmasi Hapus Butir Soal"
        message="Apakah Anda yakin ingin menghapus butir soal ini beserta kunci jawabannya dari sistem? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Soal"
      />

      {/* Formatted PDF Report Modal with School Branding */}
      {selectedExamForPdfReport && (
        <ExamResultPdfReport
          isOpen={!!selectedExamForPdfReport}
          onClose={() => setSelectedExamForPdfReport(null)}
          exam={selectedExamForPdfReport}
          results={results}
          schoolSettings={settings || undefined}
        />
      )}

      {/* Student Import & Export Modal (Integrated with Class & Subject Management) */}
      <StudentImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        classes={classes}
        subjects={subjects}
        users={allUsers}
        currentUser={user}
        onSuccess={() => {
          loadData();
          showToast('success', 'Data siswa berhasil disinkronkan ke rombel dan manajemen sekolah.');
        }}
      />
    </div>
  );
};
