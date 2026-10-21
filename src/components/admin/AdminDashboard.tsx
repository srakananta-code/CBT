import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  CalendarDays,
  FileQuestion,
  ClipboardList,
  Award,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  Plus,
  Trash2,
  Edit,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Download,
  FileText,
  Building,
  KeyRound,
  UserX,
  Phone,
  Globe,
  MapPin,
  RefreshCw,
  Upload,
  Copy,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import { MathFormula } from '../common/MathFormula';
import { ExportResultModal } from './ExportResultModal';
import { QuestionEditorModal } from '../question/QuestionEditorModal';
import { QuestionImportModal } from '../question/QuestionImportModal';
import { QuestionExportModal } from '../question/QuestionExportModal';
import { QuestionDetailModal } from '../question/QuestionDetailModal';
import { StudentImportExportModal } from '../common/StudentImportExportModal';
import { ExamEditorModal } from '../teacher/ExamEditorModal';
import { ExamResultPdfReport } from '../common/ExamResultPdfReport';
import {
  exportResultsToCSV,
  exportResultsToPDF
} from '../../services/exportService';
import {
  getAllUsers,
  getClasses,
  saveClass,
  deleteClass,
  getSubjects,
  saveSubject,
  deleteSubject,
  getAcademicYears,
  saveAcademicYear,
  getQuestions,
  saveQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  toggleArchiveQuestion,
  getExams,
  saveExam,
  publishExamWithSnapshots,
  getAllResults,
  getResultsForExam,
  getResultsForStudent,
  getAuditLogs,
  getAppSettings,
  saveAppSettings,
  logAuditEvent
} from '../../services/dbService';
import {
  createAccountByAdmin,
  updateUserByAdmin,
  toggleAccountStatusByAdmin,
  deleteUserByAdmin
} from '../../services/adminAuthService';
import type {
  UserProfile,
  SchoolClass,
  Subject,
  AcademicYear,
  Question,
  Exam,
  ExamResult,
  AuditLog,
  AppSetting,
  UserStatus,
  GradeLevel
} from '../../types/database';

interface AdminDashboardProps {
  user: UserProfile;
  activeTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, activeTab }) => {
  // Database States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<AppSetting | null>(null);
  const [loading, setLoading] = useState(true);

  // Notification Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [examFilter, setExamFilter] = useState<string>('all');

  // Export Modal State & Report Filters
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportExamFilter, setReportExamFilter] = useState<string>('all');
  const [reportClassFilter, setReportClassFilter] = useState<string>('all');

  // Question Specific Filters & Modals
  const [questionGradeFilter, setQuestionGradeFilter] = useState<string>('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('all');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState<string>('all');
  const [questionArchiveFilter, setQuestionArchiveFilter] = useState<'all' | 'active' | 'archived'>('active');

  const [isAdminQuestionEditorOpen, setIsAdminQuestionEditorOpen] = useState(false);
  const [adminEditingQuestion, setAdminEditingQuestion] = useState<Question | null>(null);
  const [isAdminQuestionImportOpen, setIsAdminQuestionImportOpen] = useState(false);
  const [isAdminQuestionExportOpen, setIsAdminQuestionExportOpen] = useState(false);
  const [adminSelectedDetailQuestion, setAdminSelectedDetailQuestion] = useState<Question | null>(null);

  // Pagination States per active tab
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals: User Form (Teacher / Student)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [userRoleTarget, setUserRoleTarget] = useState<'teacher' | 'student'>('teacher');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [userClassIdInput, setUserClassIdInput] = useState('');
  const [userNisnInput, setUserNisnInput] = useState('');
  const [userNipInput, setUserNipInput] = useState('');
  const [userAssignedSubjects, setUserAssignedSubjects] = useState<string[]>([]);
  const [isStudentImportExportOpen, setIsStudentImportExportOpen] = useState(false);
  const [isAdminExamModalOpen, setIsAdminExamModalOpen] = useState(false);
  const [adminEditingExam, setAdminEditingExam] = useState<Exam | null>(null);
  const [adminSelectedExamForPdf, setAdminSelectedExamForPdf] = useState<Exam | null>(null);

  // Modals: Class Form
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classGradeInput, setClassGradeInput] = useState<'VII' | 'VIII' | 'IX'>('VII');
  const [classHomeroomTeacherId, setClassHomeroomTeacherId] = useState('');

  // Modals: Subject Form
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectCodeInput, setSubjectCodeInput] = useState('');
  const [subjectGradeLevelInput, setSubjectGradeLevelInput] = useState<'VII' | 'VIII' | 'IX' | 'all'>('all');
  const [subjectTeachersInput, setSubjectTeachersInput] = useState<string[]>([]);

  // Modals: Academic Year Form
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearNameInput, setYearNameInput] = useState('2025/2026');
  const [yearSemesterInput, setYearSemesterInput] = useState<'ganjil' | 'genap'>('ganjil');

  // Detail Modal State
  const [detailItem, setDetailItem] = useState<{ title: string; content: React.ReactNode } | null>(null);

  // Deletion Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'user' | 'class' | 'subject' | 'question' | 'exam';
    id: string;
    title: string;
  } | null>(null);

  // Reset page when switching tab or changing search
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setStatusFilter('all');
    setClassFilter('all');
  }, [activeTab]);

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [uList, cList, sList, ayList, qList, exList, alList, appSet] = await Promise.all([
        getAllUsers(),
        getClasses(),
        getSubjects(),
        getAcademicYears(),
        getQuestions(),
        getExams(),
        getAuditLogs(),
        getAppSettings()
      ]);

      setUsers(uList);
      setClasses(cList);
      setSubjects(sList);
      setAcademicYears(ayList);
      setQuestions(qList);
      setExams(exList);
      setAuditLogs(alList);
      setSettings(appSet);

      // Load results for all exams
      const allResultsList = await getAllResults();
      if (allResultsList && allResultsList.length > 0) {
        setResults(allResultsList);
      } else if (exList.length > 0) {
        const allResPromises = exList.map(e => getResultsForExam(e.id));
        const resArrays = await Promise.all(allResPromises);
        setResults(resArrays.flat());
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showToast('error', 'Gagal memuat data dari database Firestore.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     QUICK EXPORT ACTIONS (CSV & PDF)
     ========================================================= */
  const handleQuickExportCSV = () => {
    if (resultsFiltered.length === 0) {
      showToast('error', 'Tidak ada data hasil ujian yang dapat diekspor.');
      return;
    }
    const currentExam = examFilter !== 'all' ? exams.find(e => e.id === examFilter) : null;
    const usersMap: Record<string, UserProfile> = {};
    users.forEach(u => {
      usersMap[u.uid] = u;
      usersMap[u.id] = u;
    });

    exportResultsToCSV({
      results: resultsFiltered,
      exam: currentExam,
      settings,
      usersMap,
      filterDescription: currentExam ? `Ujian: ${currentExam.title}` : 'Semua Paket Ujian'
    });

    logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'admin',
      action: 'EXPORT_RESULTS_CSV',
      details: `Admin mengunduh rekap hasil ujian format CSV (${resultsFiltered.length} baris data peserta).`
    });
    showToast('success', `Berhasil mengekspor ${resultsFiltered.length} data ke berkas CSV (Excel).`);
  };

  const handleQuickExportPDF = () => {
    if (resultsFiltered.length === 0) {
      showToast('error', 'Tidak ada data hasil ujian yang dapat diekspor.');
      return;
    }
    const currentExam = examFilter !== 'all' ? exams.find(e => e.id === examFilter) : null;
    const usersMap: Record<string, UserProfile> = {};
    users.forEach(u => {
      usersMap[u.uid] = u;
      usersMap[u.id] = u;
    });

    exportResultsToPDF({
      results: resultsFiltered,
      exam: currentExam,
      settings,
      usersMap,
      filterDescription: currentExam ? `Ujian: ${currentExam.title}` : 'Semua Paket Ujian',
      orientation: 'landscape'
    });

    logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'admin',
      action: 'EXPORT_RESULTS_PDF',
      details: `Admin mengunduh dokumen resmi PDF (${resultsFiltered.length} peserta).`
    });
    showToast('success', `Berhasil mengunduh dokumen PDF resmi (${resultsFiltered.length} peserta).`);
  };

  /* =========================================================
     ADMIN EXAM OPERATIONS
     ========================================================= */
  const handleAdminSaveExam = async (exam: Exam, selectedQuestions: Question[], isPublish: boolean) => {
    try {
      if (isPublish) {
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
          role: 'admin',
          action: 'ADMIN_PUBLISH_EXAM',
          details: `Admin menerbitkan paket ujian CBT "${exam.title}" (${selectedQuestions.length} snapshot soal beku).`
        });
        showToast('success', `Paket ujian "${exam.title}" berhasil diterbitkan.`);
      } else {
        await saveExam(exam);
        await logAuditEvent({
          userId: user.uid,
          userName: user.name,
          role: 'admin',
          action: 'ADMIN_SAVE_EXAM_DRAFT',
          details: `Admin menyimpan draft paket ujian "${exam.title}".`
        });
        showToast('success', `Draft paket ujian "${exam.title}" berhasil disimpan.`);
      }
      setIsAdminExamModalOpen(false);
      setAdminEditingExam(null);
      loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast('error', `Gagal menyimpan paket ujian: ${err?.message || 'Error'}`);
    }
  };

  /* =========================================================
     ADMIN QUESTION OPERATIONS
     ========================================================= */
  const handleAdminSaveQuestion = async (q: Question) => {
    await saveQuestion(q);
    await logAuditEvent({
      userId: user.uid,
      userName: user.name,
      role: 'admin',
      action: adminEditingQuestion ? 'ADMIN_UPDATE_QUESTION' : 'ADMIN_CREATE_QUESTION',
      details: `Admin ${adminEditingQuestion ? 'memperbarui' : 'membuat'} butir soal (${q.type}): ${q.questionText.substring(0, 40)}...`
    });
    showToast('success', `Berhasil ${adminEditingQuestion ? 'memperbarui' : 'menyimpan'} butir soal ke bank soal.`);
    setAdminEditingQuestion(null);
    loadAllData();
  };

  const handleAdminDuplicateQuestion = async (sourceQ: Question) => {
    try {
      const duplicated = await duplicateQuestion(sourceQ, user.uid, user.name);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'ADMIN_DUPLICATE_QUESTION',
        details: `Admin menduplikasi butir soal ${sourceQ.id} menjadi ${duplicated.id}`
      });
      showToast('success', 'Butir soal berhasil diduplikasi sebagai variasi.');
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal menduplikasi butir soal.');
    }
  };

  const handleAdminToggleArchive = async (targetQ: Question) => {
    const nextArchived = !targetQ.isArchived;
    try {
      await toggleArchiveQuestion(targetQ.id, nextArchived);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: nextArchived ? 'ADMIN_ARCHIVE_QUESTION' : 'ADMIN_RESTORE_QUESTION',
        details: `Admin ${nextArchived ? 'mengarsipkan' : 'mengaktifkan kembali'} butir soal ${targetQ.id}`
      });
      showToast('success', `Butir soal berhasil ${nextArchived ? 'diarsipkan' : 'diaktifkan kembali'}.`);
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Gagal memperbarui status arsip butir soal.');
    }
  };

  const handleAdminImportSuccess = (count: number, subjectId?: string, grade?: GradeLevel) => {
    if (subjectId) {
      setSubjectFilter(subjectId);
    }
    if (grade) {
      setQuestionGradeFilter(grade);
    }
    setQuestionArchiveFilter('active');
    setSearchQuery('');
    const subjName = subjects.find(s => s.id === subjectId)?.name || 'mata pelajaran terkait';
    showToast('success', `Berhasil mengimpor ${count} butir soal ke ${subjName}. Filter telah disesuaikan agar soal langsung terlihat.`);
    loadAllData();
  };

  /* =========================================================
     USER OPERATIONS (TEACHER & STUDENT)
     ========================================================= */
  const handleOpenUserModal = (role: 'teacher' | 'student', existingUser?: UserProfile) => {
    setUserRoleTarget(role);
    if (existingUser) {
      setUserModalMode('edit');
      setEditingUserId(existingUser.uid);
      setUserNameInput(existingUser.name);
      setUserEmailInput(existingUser.email);
      setUserPasswordInput('');
      setUserClassIdInput(existingUser.classId || '');
      setUserNisnInput(existingUser.nisn || '');
      setUserNipInput(existingUser.nip || '');
      setUserAssignedSubjects(existingUser.assignedSubjects || []);
    } else {
      setUserModalMode('create');
      setEditingUserId(null);
      setUserNameInput('');
      setUserEmailInput('');
      setUserPasswordInput(role === 'teacher' ? 'Guru123!*' : 'Siswa123!*');
      setUserClassIdInput(classes[0]?.id || '');
      setUserNisnInput('');
      setUserNipInput('');
      setUserAssignedSubjects([]);
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim() || !userEmailInput.trim()) {
      showToast('error', 'Nama dan Email wajib diisi.');
      return;
    }

    try {
      const selectedClass = classes.find(c => c.id === userClassIdInput);

      if (userModalMode === 'create') {
        const res = await createAccountByAdmin({
          name: userNameInput,
          email: userEmailInput,
          password: userPasswordInput,
          role: userRoleTarget,
          status: 'active',
          classId: userRoleTarget === 'student' ? userClassIdInput : undefined,
          className: userRoleTarget === 'student' ? selectedClass?.name : undefined,
          nisn: userRoleTarget === 'student' ? userNisnInput : undefined,
          nip: userRoleTarget === 'teacher' ? userNipInput : undefined,
          assignedSubjects: userRoleTarget === 'teacher' ? userAssignedSubjects : undefined,
          adminActor: {
            uid: user.uid,
            name: user.name
          }
        });
        showToast('success', res.message);
      } else if (editingUserId) {
        await updateUserByAdmin(
          editingUserId,
          {
            name: userNameInput,
            classId: userRoleTarget === 'student' ? userClassIdInput : undefined,
            className: userRoleTarget === 'student' ? selectedClass?.name : undefined,
            nisn: userRoleTarget === 'student' ? userNisnInput : undefined,
            nip: userRoleTarget === 'teacher' ? userNipInput : undefined,
            assignedSubjects: userRoleTarget === 'teacher' ? userAssignedSubjects : undefined
          },
          { uid: user.uid, name: user.name }
        );
        showToast('success', `Data ${userRoleTarget === 'teacher' ? 'Guru' : 'Siswa'} berhasil diperbarui.`);
      }

      setIsUserModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan data pengguna.');
    }
  };

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const newStatus: UserStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await toggleAccountStatusByAdmin(
        targetUser.uid,
        newStatus,
        targetUser.name,
        { uid: user.uid, name: user.name }
      );
      showToast(
        'success',
        `Status akun ${targetUser.name} diubah menjadi ${newStatus === 'active' ? 'AKTIF' : 'DITANGGUHKAN'}.`
      );
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Gagal mengubah status akun.');
    }
  };

  /* =========================================================
     CLASS OPERATIONS
     ========================================================= */
  const handleOpenClassModal = (existingClass?: SchoolClass) => {
    if (existingClass) {
      setEditingClassId(existingClass.id);
      setClassNameInput(existingClass.name);
      setClassGradeInput(existingClass.grade);
      setClassHomeroomTeacherId(existingClass.homeroomTeacherId || '');
    } else {
      setEditingClassId(null);
      setClassNameInput('');
      setClassGradeInput('VII');
      setClassHomeroomTeacherId('');
    }
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      showToast('error', 'Nama rombel kelas wajib diisi.');
      return;
    }

    try {
      const selectedTeacher = users.find(u => u.uid === classHomeroomTeacherId);
      const classId = editingClassId || `cls_${Date.now()}`;
      const classData: SchoolClass = {
        id: classId,
        grade: classGradeInput,
        name: classNameInput.trim(),
        academicYearId: academicYears[0]?.id || 'ay_current',
        homeroomTeacherId: classHomeroomTeacherId || undefined,
        homeroomTeacherName: selectedTeacher?.name || 'Belum Ditentukan',
        studentCount: classes.find(c => c.id === classId)?.studentCount || 30,
        createdAt: new Date().toISOString()
      };

      await saveClass(classData);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: editingClassId ? 'UPDATE_CLASS' : 'CREATE_CLASS',
        details: `Admin ${editingClassId ? 'memperbarui' : 'membuat'} kelas ${classNameInput}`
      });

      showToast('success', `Rombel ${classNameInput} berhasil disimpan.`);
      setIsClassModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan kelas.');
    }
  };

  /* =========================================================
     SUBJECT OPERATIONS
     ========================================================= */
  const handleOpenSubjectModal = (existingSubject?: Subject) => {
    if (existingSubject) {
      setEditingSubjectId(existingSubject.id);
      setSubjectNameInput(existingSubject.name);
      setSubjectCodeInput(existingSubject.code);
      setSubjectGradeLevelInput(existingSubject.gradeLevel);
      setSubjectTeachersInput(existingSubject.teacherIds || []);
    } else {
      setEditingSubjectId(null);
      setSubjectNameInput('');
      setSubjectCodeInput('');
      setSubjectGradeLevelInput('all');
      setSubjectTeachersInput([]);
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectNameInput.trim() || !subjectCodeInput.trim()) {
      showToast('error', 'Nama dan Kode mata pelajaran wajib diisi.');
      return;
    }

    try {
      const sbjId = editingSubjectId || `sbj_${Date.now()}`;
      const newSubject: Subject = {
        id: sbjId,
        name: subjectNameInput.trim(),
        code: subjectCodeInput.trim().toUpperCase(),
        gradeLevel: subjectGradeLevelInput,
        teacherIds: subjectTeachersInput,
        createdAt: new Date().toISOString()
      };

      await saveSubject(newSubject);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: editingSubjectId ? 'UPDATE_SUBJECT' : 'CREATE_SUBJECT',
        details: `Admin ${editingSubjectId ? 'memperbarui' : 'menambahkan'} mapel ${subjectNameInput}`
      });

      showToast('success', `Mata pelajaran ${subjectNameInput} berhasil disimpan.`);
      setIsSubjectModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan mata pelajaran.');
    }
  };

  /* =========================================================
     ACADEMIC YEAR OPERATIONS
     ========================================================= */
  const handleSaveAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const yearId = `ay_${Date.now()}`;
      const newYear: AcademicYear = {
        id: yearId,
        name: yearNameInput.trim(),
        semester: yearSemesterInput,
        isActive: true,
        startDate: new Date().toISOString()
      };

      await saveAcademicYear(newYear);
      showToast('success', `Tahun ajaran ${yearNameInput} semester ${yearSemesterInput} diaktifkan.`);
      setIsYearModalOpen(false);
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan tahun ajaran.');
    }
  };

  /* =========================================================
     SCHOOL SETTINGS SAVE
     ========================================================= */
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await saveAppSettings(settings);
      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'admin',
        action: 'UPDATE_SETTINGS',
        details: 'Admin memperbarui data identitas sekolah dan aturan CBT'
      });
      showToast('success', 'Konfigurasi sekolah & kop laporan berhasil diperbarui.');
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan pengaturan sekolah.');
    }
  };

  /* =========================================================
     CONFIRM DELETION DISPATCHER
     ========================================================= */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'user') {
        await deleteUserByAdmin(deleteTarget.id, deleteTarget.title, { uid: user.uid, name: user.name });
      } else if (deleteTarget.type === 'class') {
        await deleteClass(deleteTarget.id);
      } else if (deleteTarget.type === 'subject') {
        await deleteSubject(deleteTarget.id);
      } else if (deleteTarget.type === 'question') {
        await deleteQuestion(deleteTarget.id);
      }
      showToast('success', `${deleteTarget.title} berhasil dihapus.`);
      setDeleteTarget(null);
      loadAllData();
    } catch (err: any) {
      showToast('error', 'Gagal menghapus data.');
    }
  };

  /* =========================================================
     FILTERED & PAGINATED LISTS
     ========================================================= */
  const teachersList = useMemo(() => {
    return users.filter(u => {
      if (u.role !== 'teacher') return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.nip && u.nip.includes(q));
      }
      return true;
    });
  }, [users, statusFilter, searchQuery]);

  const studentsList = useMemo(() => {
    return users.filter(u => {
      if (u.role !== 'student') return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (classFilter !== 'all' && u.classId !== classFilter && u.className !== classFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.nisn && u.nisn.includes(q));
      }
      return true;
    });
  }, [users, statusFilter, classFilter, searchQuery]);

  const classesFiltered = useMemo(() => {
    return classes.filter(c => {
      if (gradeFilter !== 'all' && c.grade !== gradeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.homeroomTeacherName && c.homeroomTeacherName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [classes, gradeFilter, searchQuery]);

  const subjectsFiltered = useMemo(() => {
    return subjects.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subjects, searchQuery]);

  const questionsFiltered = useMemo(() => {
    return questions.filter(q => {
      if (questionArchiveFilter === 'active' && q.isArchived) return false;
      if (questionArchiveFilter === 'archived' && !q.isArchived) return false;
      if (subjectFilter !== 'all' && q.subjectId !== subjectFilter) return false;
      if (questionGradeFilter !== 'all' && q.gradeLevel !== questionGradeFilter) return false;
      if (questionTypeFilter !== 'all' && q.type !== questionTypeFilter) return false;
      if (questionDifficultyFilter !== 'all' && q.difficulty !== questionDifficultyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          q.questionText.toLowerCase().includes(query) ||
          (q.topic && q.topic.toLowerCase().includes(query)) ||
          (q.material && q.material.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [
    questions,
    subjectFilter,
    questionGradeFilter,
    questionTypeFilter,
    questionDifficultyFilter,
    questionArchiveFilter,
    searchQuery
  ]);

  const examsFiltered = useMemo(() => {
    return exams.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return e.title.toLowerCase().includes(q) || e.subjectName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [exams, searchQuery]);

  const resultsFiltered = useMemo(() => {
    return results.filter(r => {
      if (examFilter !== 'all' && r.examId !== examFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.studentName.toLowerCase().includes(q) || (r.className && r.className.toLowerCase().includes(q));
      }
      return true;
    });
  }, [results, examFilter, searchQuery]);

  const reportResultsFiltered = useMemo(() => {
    return results.filter(r => {
      if (reportExamFilter !== 'all' && r.examId !== reportExamFilter) return false;
      if (reportClassFilter !== 'all') {
        const cls = classes.find(c => c.id === reportClassFilter);
        if (cls && !r.className.toLowerCase().includes(cls.name.toLowerCase())) return false;
      }
      return true;
    });
  }, [results, reportExamFilter, reportClassFilter, classes]);

  const auditLogsFiltered = useMemo(() => {
    return auditLogs.filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return l.userName.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
      }
      return true;
    });
  }, [auditLogs, searchQuery]);

  // Generic paginator slice
  const getPaginatedItems = <T,>(items: T[]): T[] => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  if (loading) {
    return (
      <div className="p-12 text-center font-sans">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menyinkronkan Basis Data Admin...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================
          1. DASHBOARD OVERVIEW (STATISTIK REAL DARI DATABASE)
          ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dashboard Administrator</h2>
              <p className="text-xs text-slate-500">
                Statistik sistem terverifikasi secara realtime dari koleksi Cloud Firestore.
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Muat Ulang Database</span>
            </button>
          </div>

          {/* Real Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Guru Pengampu"
              value={users.filter(u => u.role === 'teacher').length}
              subtitle="Pendidik Terdaftar"
              icon={UserCheck}
              color="emerald"
            />
            <StatCard
              title="Siswa CBT"
              value={users.filter(u => u.role === 'student').length}
              subtitle="Peserta Ujian Aktif"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Rombongan Belajar"
              value={classes.length}
              subtitle="Kelas VII, VIII, IX"
              icon={GraduationCap}
              color="indigo"
            />
            <StatCard
              title="Mata Pelajaran"
              value={subjects.length}
              subtitle="Kurikulum Terdaftar"
              icon={BookOpen}
              color="amber"
            />
            <StatCard
              title="Bank Soal"
              value={questions.length}
              subtitle="Item Soal Terverifikasi"
              icon={FileQuestion}
              color="purple"
            />
            <StatCard
              title="Paket Ujian"
              value={exams.length}
              subtitle="Jadwal CBT Sekolah"
              icon={ClipboardList}
              color="blue"
            />
            <StatCard
              title="Hasil Ujian Masuk"
              value={results.length}
              subtitle="Lembar Jawaban Dinilai"
              icon={Award}
              color="emerald"
            />
            <StatCard
              title="Audit Sistem"
              value={auditLogs.length}
              subtitle="Catatan Aktivitas"
              icon={ShieldCheck}
              color="amber"
            />
          </div>

          {/* Quick Actions & School Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Identitas Satuan Pendidikan & Status Kalender</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-slate-400 block font-semibold">Nama Sekolah</span>
                  <span className="font-bold text-slate-800 text-sm">{settings?.schoolName || 'SMPN 1 Harapan Bangsa'}</span>
                  <span className="text-slate-500 block">NPSN: {settings?.schoolNpsn || '20108745'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-slate-400 block font-semibold">Tahun Ajaran & Semester</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {settings?.activeAcademicYear || '2025/2026'} - Semester {settings?.activeSemester?.toUpperCase() || 'GANJIL'}
                  </span>
                  <span className="text-emerald-600 block font-medium">Status: Aktif</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Aksi Cepat Administrator:</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleOpenUserModal('teacher')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Guru Baru
                  </button>
                  <button
                    onClick={() => handleOpenUserModal('student')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Siswa Baru
                  </button>
                  <button
                    onClick={() => handleOpenClassModal()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Rombel Kelas
                  </button>
                  <button
                    onClick={() => handleOpenSubjectModal()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Mata Pelajaran
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Audit Aktivitas Terkini</span>
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                {auditLogs.slice(0, 7).map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{log.action}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. MANAJEMEN GURU (CRUD, SEARCH, FILTER, PAGINATION)
          ========================================================= */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Manajemen Guru & Tenaga Pendidik</span>
              </h2>
              <p className="text-xs text-slate-500">
                Total {teachersList.length} guru terdaftar. Pembuatan akun menggunakan mekanisme secondary auth terproteksi.
              </p>
            </div>
            <button
              onClick={() => handleOpenUserModal('teacher')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama guru, email, atau NIP..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>

          {/* Teachers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Guru</th>
                    <th className="px-5 py-3">Email & NIP</th>
                    <th className="px-5 py-3">Mapel Pengampu</th>
                    <th className="px-5 py-3 text-center">Status Akun</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {getPaginatedItems(teachersList).map(t => (
                    <tr key={t.uid} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800">{t.email}</div>
                        <div className="text-[11px] text-slate-400">NIP: {t.nip || 'Belum diisi'}</div>
                      </td>
                      <td className="px-5 py-3">
                        {t.assignedSubjects && t.assignedSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.assignedSubjects.map(subId => {
                              const s = subjects.find(sub => sub.id === subId);
                              return (
                                <span key={subId} className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-medium">
                                  {s?.name || subId}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400">Belum ditugaskan</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant={t.status === 'active' ? 'success' : 'danger'}>
                          {t.status === 'active' ? 'Aktif' : 'Ditangguhkan'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setDetailItem({
                                title: `Detail Guru: ${t.name}`,
                                content: (
                                  <div className="space-y-3 text-xs">
                                    <p><strong>Nama:</strong> {t.name}</p>
                                    <p><strong>Email:</strong> {t.email}</p>
                                    <p><strong>NIP:</strong> {t.nip || '-'}</p>
                                    <p><strong>Status:</strong> {t.status}</p>
                                    <p><strong>UID Database:</strong> <code>{t.uid}</code></p>
                                    <p><strong>Dibuat Pada:</strong> {new Date(t.createdAt).toLocaleString('id-ID')}</p>
                                  </div>
                                )
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenUserModal('teacher', t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(t)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              t.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={t.status === 'active' ? 'Tangguhkan Akun' : 'Aktifkan Akun'}
                          >
                            {t.status === 'active' ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'user', id: t.uid, title: `Guru: ${t.name}` })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachersList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data guru yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={teachersList.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          3. MANAJEMEN SISWA (CRUD, SEARCH, FILTER KELAS, PAGINATION)
          ========================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Manajemen Siswa CBT</span>
              </h2>
              <p className="text-xs text-slate-500">
                Total {studentsList.length} siswa terdaftar dalam basis data sekolah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudentImportExportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Impor atau ekspor data siswa terintegrasi dengan rombel kelas dan mapel guru"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Impor / Ekspor Data Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenUserModal('student')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa Baru</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama siswa, email, atau NISN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Rombel Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-5 py-3">Rombel Kelas</th>
                    <th className="px-5 py-3">NISN</th>
                    <th className="px-5 py-3">Email Pengguna</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {getPaginatedItems(studentsList).map(s => (
                    <tr key={s.uid} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-medium border border-blue-200">
                          {s.className || 'Belum diatur'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600">{s.nisn || '-'}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{s.email}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant={s.status === 'active' ? 'success' : 'danger'}>
                          {s.status === 'active' ? 'Aktif' : 'Ditangguhkan'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setDetailItem({
                                title: `Detail Siswa: ${s.name}`,
                                content: (
                                  <div className="space-y-3 text-xs">
                                    <p><strong>Nama Lengkap:</strong> {s.name}</p>
                                    <p><strong>NISN:</strong> {s.nisn || '-'}</p>
                                    <p><strong>Rombel Kelas:</strong> {s.className || '-'}</p>
                                    <p><strong>Email Akun:</strong> {s.email}</p>
                                    <p><strong>Status CBT:</strong> {s.status}</p>
                                    <p><strong>ID Database:</strong> <code>{s.uid}</code></p>
                                  </div>
                                )
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenUserModal('student', s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Edit Siswa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(s)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              s.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={s.status === 'active' ? 'Tangguhkan Akun' : 'Aktifkan Akun'}
                          >
                            {s.status === 'active' ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'user', id: s.uid, title: `Siswa: ${s.name}` })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {studentsList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data siswa yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={studentsList.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          4. MANAJEMEN KELAS (ROMBEL SMP/MTS)
          ========================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Rombongan Belajar (Kelas)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tingkat VII, VIII, dan IX beserta penetapan wali kelas pengampu.
              </p>
            </div>
            <button
              onClick={() => handleOpenClassModal()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classesFiltered.map(c => {
              const studentsInClass = users.filter(u => u.role === 'student' && (u.classId === c.id || u.className === c.name));
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="primary">Tingkat {c.grade}</Badge>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenClassModal(c)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'class', id: c.id, title: `Kelas ${c.name}` })}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Wali Kelas: <strong>{c.homeroomTeacherName || 'Belum diatur'}</strong>
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                    <span>Terdaftar: <strong>{studentsInClass.length} Siswa</strong></span>
                    <span className="font-semibold text-emerald-600">Aktif</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          5. MATA PELAJARAN
          ========================================================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>Mata Pelajaran Kurikulum</span>
              </h2>
              <p className="text-xs text-slate-500">
                Daftar mata pelajaran ujian serta penetapan guru pengampu mata pelajaran.
              </p>
            </div>
            <button
              onClick={() => handleOpenSubjectModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mata Pelajaran</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectsFiltered.map(s => {
              const assignedTeachers = users.filter(u => u.role === 'teacher' && s.teacherIds?.includes(u.uid));
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {s.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenSubjectModal(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'subject', id: s.id, title: `Mapel ${s.name}` })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{s.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">Jenjang: SMP/MTs ({s.gradeLevel === 'all' ? 'Semua Tingkat' : `Kelas ${s.gradeLevel}`})</p>

                    <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 block mb-1">Guru Pengampu:</span>
                      {assignedTeachers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedTeachers.map(gt => (
                            <span key={gt.uid} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {gt.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada guru pengampu</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          6. TAHUN AJARAN & SEMESTER
          ========================================================= */}
      {activeTab === 'academicYears' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <span>Tahun Ajaran & Status Semester</span>
              </h2>
              <p className="text-xs text-slate-500">
                Periode aktif kalender akademik yang menjadi acuan jadwal ujian CBT.
              </p>
            </div>
            <button
              onClick={() => setIsYearModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Periode Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <div className="space-y-3">
              {academicYears.map(ay => (
                <div key={ay.id} className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-blue-950">Tahun Ajaran {ay.name}</h4>
                    <p className="text-xs text-blue-700 capitalize">Semester: {ay.semester}</p>
                  </div>
                  <Badge variant={ay.isActive ? 'success' : 'neutral'}>
                    {ay.isActive ? 'Semester Aktif' : 'Arsip'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          7. BANK SOAL
          ========================================================= */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-purple-600" />
                <span>Supervisi & Pengelolaan Bank Soal Sekolah</span>
              </h2>
              <p className="text-xs text-slate-500">
                Total {questions.length} butir soal terdaftar ({questionsFiltered.length} butir sesuai filter) • Multi-format LaTeX & terproteksi kunci jawaban privat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdminEditingQuestion(null);
                  setIsAdminQuestionEditorOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Butir Soal</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAdminQuestionImportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Impor kumpulan soal dari file DOC / DOCX / TXT / CBT"
              >
                <Upload className="w-4 h-4" />
                <span>Import Soal Cerdas</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAdminQuestionExportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Ekspor bank soal ke file PDF resmi atau Word DOC"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Soal (PDF / DOC)</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari teks soal, materi, topik, rumus..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Mapel</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={questionGradeFilter}
                onChange={e => setQuestionGradeFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
                <option value="IX">Kelas IX</option>
              </select>

              <select
                value={questionTypeFilter}
                onChange={e => setQuestionTypeFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Tipe Soal</option>
                <option value="multiple_choice">Pilihan Ganda (PG)</option>
                <option value="complex_multiple_choice">PG Kompleks</option>
                <option value="true_false">Benar / Salah</option>
                <option value="short_answer">Isian Singkat</option>
                <option value="essay">Uraian / Esai</option>
              </select>

              <select
                value={questionDifficultyFilter}
                onChange={e => setQuestionDifficultyFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Kesulitan</option>
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sukar (HOTS)</option>
              </select>

              <select
                value={questionArchiveFilter}
                onChange={e => setQuestionArchiveFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
              >
                <option value="active">Soal Aktif</option>
                <option value="archived">Diarsipkan</option>
                <option value="all">Semua Status</option>
              </select>
            </div>
          </div>

          {/* Question List */}
          {questionsFiltered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-800">Tidak Ada Butir Soal yang Sesuai</p>
              <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau kriteria filter di atas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getPaginatedItems(questionsFiltered).map((q, idx) => {
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
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center">
                          {(currentPage - 1) * pageSize + idx + 1}
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

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAdminSelectedDetailQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Lihat Detail & Kunci Jawaban"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminEditingQuestion(q);
                            setIsAdminQuestionEditorOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Butir Soal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminDuplicateQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Duplikasi Butir Soal"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminToggleArchive(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title={q.isArchived ? 'Aktifkan Kembali Soal' : 'Arsipkan Soal'}
                        >
                          {q.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'question', id: q.id, title: `Soal: ${q.topic || q.id}` })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {q.questionImage && (
                      <div className="pl-8 mb-3">
                        <img
                          src={q.questionImage}
                          alt="Ilustrasi Soal"
                          className="max-h-40 rounded-xl border border-slate-200 object-contain"
                        />
                      </div>
                    )}

                    <div className="text-sm text-slate-800 font-medium mb-3 pl-8 leading-relaxed">
                      <MathFormula content={q.questionText} />
                    </div>

                    {/* Options / Statements Preview */}
                    <div className="pl-8">
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
                                className={`p-2 rounded-lg border flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300'
                                    : 'bg-slate-50 border-slate-200/60 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`font-bold text-xs shrink-0 ${
                                    isCorrect ? 'text-emerald-700' : 'text-slate-600'
                                  }`}
                                >
                                  {opt.id}.
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

                      {q.type === 'true_false' && q.trueFalseStatements && (
                        <div className="space-y-1 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {q.trueFalseStatements.map((stmt, sIdx) => (
                            <div key={stmt.id} className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-200/60 last:border-0">
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

                      {q.type === 'short_answer' && (
                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-xs flex items-center justify-between">
                          <span className="text-purple-900 font-semibold">
                            Kunci Jawaban: <strong className="font-mono">{Array.isArray(q.answerKey) ? q.answerKey.join(', ') : (q.answerKey || '-')}</strong>
                          </span>
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold">Uraian / Esai:</span> Evaluasi manual guru sesuai rubrik penskoran.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={questionsFiltered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* =========================================================
          8. PAKET UJIAN CBT
          ========================================================= */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span>Paket Ujian CBT Sekolah</span>
              </h2>
              <p className="text-xs text-slate-500">
                Seluruh jadwal ujian aktif dan konfigurasi keamanan anti-curang.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdminEditingExam(null);
                setIsAdminExamModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Paket Ujian Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examsFiltered.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {e.subjectName}
                    </span>
                    <Badge variant={e.status === 'published' ? 'success' : 'neutral'}>
                      {e.status === 'published' ? 'Aktif Diterbitkan' : e.status}
                    </Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{e.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">Guru: {e.teacherName}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div>Durasi: <strong>{e.durationMinutes} Menit</strong></div>
                    <div>Jumlah Soal: <strong>{e.totalQuestions} Soal</strong></div>
                    <div>Token: <strong className="font-mono text-blue-700">{e.token || 'Tanpa Token'}</strong></div>
                    <div>KKM: <strong>{e.passingScore}</strong></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Dibuat: {new Date(e.createdAt).toLocaleDateString('id-ID')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-semibold mr-1">
                      Target: {e.targetClassNames?.join(', ') || 'Semua Kelas'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminEditingExam(e);
                        setIsAdminExamModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit Konfigurasi Paket Ujian"
                    >
                      <Edit className="w-3 h-3 text-slate-500" />
                      <span>Edit Paket</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          9. HASIL UJIAN
          ========================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Rekapitulasi Hasil Ujian</span>
              </h2>
              <p className="text-xs text-slate-500">
                Nilai akhir peserta terhitung otomatis terhadap kunci jawaban yang aman dan tersimpan di database.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleQuickExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Unduh seluruh baris yang sedang tampil ke berkas CSV (Excel)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={handleQuickExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Unduh dokumen PDF resmi siap cetak"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetExam = exams.find(e => e.id === examFilter) || exams[0] || null;
                  if (targetExam) {
                    setAdminSelectedExamForPdf(targetExam);
                  } else {
                    showToast('error', 'Belum ada paket ujian untuk dicetak rapot.');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Cetak laporan hasil ujian resmi dengan format kop sekolah dan tanda tangan"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rapor Kop Sekolah</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Opsi Ekspor Lengkap...</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama siswa atau kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <select
              value={examFilter}
              onChange={e => setExamFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Paket Ujian ({exams.length})</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
              <span>Total: <strong className="text-slate-800">{resultsFiltered.length}</strong> Nilai</span>
              <span>•</span>
              <span>Rata-rata: <strong className="text-blue-600">{resultsFiltered.length > 0 ? Math.round(resultsFiltered.reduce((a, b) => a + b.finalScore, 0) / resultsFiltered.length) : 0}</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-5 py-3">Kelas</th>
                    <th className="px-5 py-3">Ujian</th>
                    <th className="px-5 py-3 text-center">Benar</th>
                    <th className="px-5 py-3 text-center">Salah</th>
                    <th className="px-5 py-3 text-center">Nilai Akhir</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {getPaginatedItems(resultsFiltered).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="px-5 py-3">{r.className}</td>
                      <td className="px-5 py-3 text-slate-600">{r.examTitle || 'Ujian CBT'}</td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600">{r.correctCount}</td>
                      <td className="px-5 py-3 text-center font-bold text-rose-600">{r.wrongCount}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-sm text-blue-600">{r.finalScore}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant={r.finalScore >= 75 ? 'success' : 'warning'}>
                          {r.finalScore >= 75 ? 'Tuntas' : 'Remedial'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {resultsFiltered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Belum ada data nilai ujian yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={resultsFiltered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          10. LAPORAN & CETAK REKAPITULASI
          ========================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <span>Laporan & Cetak Lembar Hasil Evaluasi</span>
              </h2>
              <p className="text-xs text-slate-500">
                Format resmi dengan Kop Surat Sekolah, ringkasan statistik, dan pengesahan Kepala Sekolah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => {
                  const currentExam = reportExamFilter !== 'all' ? exams.find(e => e.id === reportExamFilter) : null;
                  const usersMap: Record<string, UserProfile> = {};
                  users.forEach(u => { usersMap[u.uid] = u; usersMap[u.id] = u; });
                  exportResultsToCSV({
                    results: reportResultsFiltered,
                    exam: currentExam,
                    settings,
                    usersMap,
                    filterDescription: `Laporan: ${currentExam ? currentExam.title : 'Semua Ujian'}`
                  });
                  logAuditEvent({
                    userId: user.uid,
                    userName: user.name,
                    role: 'admin',
                    action: 'EXPORT_RESULTS_CSV',
                    details: `Admin mengunduh laporan format CSV (${reportResultsFiltered.length} siswa).`
                  });
                  showToast('success', `Berhasil mengekspor ${reportResultsFiltered.length} baris laporan ke CSV.`);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Unduh laporan sebagai berkas CSV (Excel)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentExam = reportExamFilter !== 'all' ? exams.find(e => e.id === reportExamFilter) : null;
                  const usersMap: Record<string, UserProfile> = {};
                  users.forEach(u => { usersMap[u.uid] = u; usersMap[u.id] = u; });
                  exportResultsToPDF({
                    results: reportResultsFiltered,
                    exam: currentExam,
                    settings,
                    usersMap,
                    filterDescription: `Laporan: ${currentExam ? currentExam.title : 'Semua Ujian'}`,
                    orientation: 'landscape'
                  });
                  logAuditEvent({
                    userId: user.uid,
                    userName: user.name,
                    role: 'admin',
                    action: 'EXPORT_RESULTS_PDF',
                    details: `Admin mengunduh laporan format PDF (${reportResultsFiltered.length} siswa).`
                  });
                  showToast('success', `Berhasil mengunduh dokumen laporan PDF resmi.`);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Unduh dokumen PDF resmi langsung"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Cetak lembar laporan fisik atau simpan ke printer PDF browser"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Buka dialog pengaturan ekspor lanjutan"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Opsi Lanjutan</span>
              </button>
            </div>
          </div>

          {/* Filter Bar untuk Lembar Laporan */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs print:hidden">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Saring Laporan:</span>
            </span>
            <select
              value={reportExamFilter}
              onChange={e => setReportExamFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Paket Ujian ({exams.length})</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <select
              value={reportClassFilter}
              onChange={e => setReportClassFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Kelas ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 ml-auto">
              Menampilkan <strong>{reportResultsFiltered.length}</strong> peserta pada lembar laporan.
            </span>
          </div>

          {/* Printable Report Canvas */}
          <div className="bg-white rounded-2xl border border-slate-300 p-8 shadow-md text-slate-900 space-y-6 print:m-0 print:border-none print:shadow-none">
            {/* Kop Surat Sekolah */}
            <div className="border-b-4 border-double border-slate-900 pb-4 text-center">
              <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
                PEMERINTAH DAERAH DINAS PENDIDIKAN
              </h1>
              <h2 className="text-xl font-extrabold uppercase text-slate-900">
                {settings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {settings?.schoolAddress || 'Jl. Pendidikan No. 45'}{settings?.schoolCity ? `, ${settings.schoolCity}` : ''} • NPSN: {settings?.schoolNpsn || '20108745'} • Telp: {settings?.schoolPhone || '(021) 555-0199'}
              </p>
            </div>

            {/* Judul Laporan */}
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold uppercase underline">
                REKAPITULASI HASIL COMPUTER BASED TEST (CBT)
              </h3>
              <p className="text-xs text-slate-600">
                {reportExamFilter !== 'all' ? (
                  <span className="font-semibold text-slate-800">
                    {exams.find(e => e.id === reportExamFilter)?.title} •{' '}
                  </span>
                ) : null}
                Tahun Ajaran {settings?.activeAcademicYear || '2025/2026'} Semester {settings?.activeSemester?.toUpperCase() || 'GANJIL'}
                {reportClassFilter !== 'all' ? ` • ${classes.find(c => c.id === reportClassFilter)?.name}` : ''}
              </p>
            </div>

            {/* Statistik Evaluasi Ringkas */}
            <div className="grid grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Total Peserta Selesai:</span>
                <span className="font-bold text-sm">{reportResultsFiltered.length} Siswa</span>
              </div>
              <div>
                <span className="text-slate-500 block">Rata-rata Nilai:</span>
                <span className="font-bold text-sm text-blue-700">
                  {reportResultsFiltered.length > 0
                    ? Math.round(reportResultsFiltered.reduce((acc, r) => acc + r.finalScore, 0) / reportResultsFiltered.length)
                    : 0}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Nilai Tertinggi:</span>
                <span className="font-bold text-sm text-emerald-600">
                  {reportResultsFiltered.length > 0 ? Math.max(...reportResultsFiltered.map(r => r.finalScore)) : 0}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Nilai Terendah:</span>
                <span className="font-bold text-sm text-rose-600">
                  {reportResultsFiltered.length > 0 ? Math.min(...reportResultsFiltered.map(r => r.finalScore)) : 0}
                </span>
              </div>
            </div>

            {/* Tabel Laporan Hasil */}
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                  <th className="p-2 border-r border-slate-300">Kelas</th>
                  <th className="p-2 border-r border-slate-300">Nama Ujian</th>
                  <th className="p-2 border-r border-slate-300 text-center">Benar</th>
                  <th className="p-2 border-r border-slate-300 text-center">Salah</th>
                  <th className="p-2 border-r border-slate-300 text-center">Nilai</th>
                  <th className="p-2 text-center">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportResultsFiltered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-2 text-center border-r border-slate-200">{i + 1}</td>
                    <td className="p-2 font-medium border-r border-slate-200">{r.studentName}</td>
                    <td className="p-2 border-r border-slate-200">{r.className}</td>
                    <td className="p-2 border-r border-slate-200">{r.examTitle}</td>
                    <td className="p-2 text-center border-r border-slate-200 font-bold text-emerald-700">{r.correctCount}</td>
                    <td className="p-2 text-center border-r border-slate-200 font-bold text-rose-700">{r.wrongCount}</td>
                    <td className="p-2 text-center border-r border-slate-200 font-black">{r.finalScore}</td>
                    <td className="p-2 text-center font-bold">
                      {r.finalScore >= 75 ? 'TUNTAS' : 'REMEDIAL'}
                    </td>
                  </tr>
                ))}
                {reportResultsFiltered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Tidak ada data hasil ujian yang sesuai dengan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pengesahan Kepala Sekolah */}
            <div className="pt-6 flex justify-end text-xs">
              <div className="text-center w-64 space-y-1">
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah</p>
                <div className="h-16" />
                <p className="font-bold underline uppercase">{settings?.principalName || 'Drs. H. Mulyadi, M.Pd.'}</p>
                <p className="text-slate-500 font-mono">NIP. {settings?.principalNip || '197003151995031002'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          11. AUDIT AKTIVITAS SISTEM
          ========================================================= */}
      {activeTab === 'auditLogs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Audit Rekam Jejak Sistem</span>
              </h2>
              <p className="text-xs text-slate-500">
                Log kronologis operasi administratif, pembuatan akun, dan sesi ujian CBT.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari aksi atau nama pengguna..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3">Pengguna</th>
                    <th className="px-5 py-3 text-center">Peran</th>
                    <th className="px-5 py-3">Tindakan</th>
                    <th className="px-5 py-3">Rincian Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {getPaginatedItems(auditLogsFiltered).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{log.userName}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant="neutral">{log.role}</Badge>
                      </td>
                      <td className="px-5 py-3 font-bold text-blue-700">{log.action}</td>
                      <td className="px-5 py-3 text-slate-600 max-w-sm truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={auditLogsFiltered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          12. PENGATURAN SEKOLAH LENGKAP
          ========================================================= */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-700" />
                <span>Pengaturan Identitas Sekolah & Aturan CBT</span>
              </h2>
              <p className="text-xs text-slate-500">
                Identitas ini digunakan secara otomatis pada kop surat laporan ujian dan tampilan siswa.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Identitas Resmi Satuan Pendidikan</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Satuan Pendidikan / Sekolah</label>
                  <input
                    type="text"
                    value={settings.schoolName}
                    onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NPSN Sekolah</label>
                  <input
                    type="text"
                    value={settings.schoolNpsn}
                    onChange={e => setSettings({ ...settings, schoolNpsn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={settings.schoolAddress || ''}
                    onChange={e => setSettings({ ...settings, schoolAddress: e.target.value })}
                    placeholder="Contoh: Jl. Ki Hajar Dewantara No. 12"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={settings.schoolCity || ''}
                    onChange={e => setSettings({ ...settings, schoolCity: e.target.value })}
                    placeholder="Kota Jakarta Selatan"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon Sekolah</label>
                  <input
                    type="text"
                    value={settings.schoolPhone || ''}
                    onChange={e => setSettings({ ...settings, schoolPhone: e.target.value })}
                    placeholder="(021) 555-0199"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Pengesahan Kepala Sekolah</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                  <input
                    type="text"
                    value={settings.principalName || ''}
                    onChange={e => setSettings({ ...settings, principalName: e.target.value })}
                    placeholder="Drs. H. Mulyadi, M.Pd."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    value={settings.principalNip || ''}
                    onChange={e => setSettings({ ...settings, principalNip: e.target.value })}
                    placeholder="197003151995031002"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Kebijakan Pengawasan Ujian CBT</span>
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <label className="flex items-center gap-2 text-slate-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cbtStrictFocusMode}
                    onChange={e => setSettings({ ...settings, cbtStrictFocusMode: e.target.checked })}
                  />
                  <span>Aktifkan Mode Anti-Curang (Deteksi Siswa Berpindah Tab / Layar Kehilangan Fokus)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowReviewAfterExam}
                    onChange={e => setSettings({ ...settings, allowReviewAfterExam: e.target.checked })}
                  />
                  <span>Izinkan Siswa Melihat Pembahasan Setelah Ujian Selesai</span>
                </label>
                <div className="pt-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Batas Maksimal Pelanggaran Sebelum Ujian Ditangguhkan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxViolationsAllowed}
                    onChange={e => setSettings({ ...settings, maxViolationsAllowed: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Simpan Seluruh Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          MODAL: USER FORM (TEACHER OR STUDENT)
          ========================================================= */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={`${userModalMode === 'create' ? 'Tambah Akun' : 'Edit Data'} ${userRoleTarget === 'teacher' ? 'Guru' : 'Siswa'}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4 py-1 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={userNameInput}
              onChange={e => setUserNameInput(e.target.value)}
              placeholder="Contoh: Muhammad Farhan"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Pengguna</label>
            <input
              type="email"
              value={userEmailInput}
              onChange={e => setUserEmailInput(e.target.value)}
              disabled={userModalMode === 'edit'}
              placeholder="nama@sekolah.sch.id"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
              required
            />
          </div>

          {userModalMode === 'create' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kata Sandi Awal (Minimal 6 Karakter)
              </label>
              <input
                type="password"
                value={userPasswordInput}
                onChange={e => setUserPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                required
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Akun didaftarkan melalui alur secondary auth terisolasi tanpa memutuskan sesi login Admin.
              </p>
            </div>
          )}

          {userRoleTarget === 'student' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel Kelas</label>
                <select
                  value={userClassIdInput}
                  onChange={e => setUserClassIdInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Pilih Rombel</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">NISN (10 Digit)</label>
                <input
                  type="text"
                  value={userNisnInput}
                  onChange={e => setUserNisnInput(e.target.value)}
                  placeholder="0087654321"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 mb-1">NIP Guru (Nomor Induk Pegawai)</label>
              <input
                type="text"
                value={userNipInput}
                onChange={e => setUserNipInput(e.target.value)}
                placeholder="198504122009021003"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl mb-3"
              />

              <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran yang Diampu</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                {subjects.map(sub => {
                  const isChecked = userAssignedSubjects.includes(sub.id);
                  return (
                    <label key={sub.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setUserAssignedSubjects(userAssignedSubjects.filter(id => id !== sub.id));
                          } else {
                            setUserAssignedSubjects([...userAssignedSubjects, sub.id]);
                          }
                        }}
                      />
                      <span>{sub.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 bg-slate-100 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              {userModalMode === 'create' ? 'Daftarkan Akun' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL: CLASS FORM
          ========================================================= */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClassId ? 'Edit Rombel Kelas' : 'Tambah Rombel Kelas'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveClass} className="space-y-4 py-1 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tingkat Jenjang</label>
            <select
              value={classGradeInput}
              onChange={e => setClassGradeInput(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="VII">Kelas VII (Tujuh)</option>
              <option value="VIII">Kelas VIII (Delapan)</option>
              <option value="IX">Kelas IX (Sembilan)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Rombel</label>
            <input
              type="text"
              value={classNameInput}
              onChange={e => setClassNameInput(e.target.value)}
              placeholder="Contoh: Kelas VII-A"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Wali Kelas</label>
            <select
              value={classHomeroomTeacherId}
              onChange={e => setClassHomeroomTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="">Pilih Wali Kelas (Guru)</option>
              {users.filter(u => u.role === 'teacher').map(t => (
                <option key={t.uid} value={t.uid}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="px-4 py-2 bg-slate-100 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Simpan Kelas
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL: SUBJECT FORM
          ========================================================= */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubjectId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4 py-1 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
            <input
              type="text"
              value={subjectNameInput}
              onChange={e => setSubjectNameInput(e.target.value)}
              placeholder="Contoh: Pendidikan Pancasila"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Kode Mapel</label>
            <input
              type="text"
              value={subjectCodeInput}
              onChange={e => setSubjectCodeInput(e.target.value)}
              placeholder="Contoh: PPKN-SMP"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Jenjang Tingkat</label>
            <select
              value={subjectGradeLevelInput}
              onChange={e => setSubjectGradeLevelInput(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="all">Semua Tingkat (VII, VIII, IX)</option>
              <option value="VII">Khusus Kelas VII</option>
              <option value="VIII">Khusus Kelas VIII</option>
              <option value="IX">Khusus Kelas IX</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="px-4 py-2 bg-slate-100 font-semibold rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 cursor-pointer"
            >
              Simpan Mapel
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          MODAL: ACADEMIC YEAR FORM
          ========================================================= */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        title="Tambah Tahun Ajaran Baru"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveAcademicYear} className="space-y-4 py-1 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
            <input
              type="text"
              value={yearNameInput}
              onChange={e => setYearNameInput(e.target.value)}
              placeholder="2025/2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Semester</label>
            <select
              value={yearSemesterInput}
              onChange={e => setYearSemesterInput(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="ganjil">Ganjil</option>
              <option value="genap">Genap</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsYearModalOpen(false)}
              className="px-4 py-2 bg-slate-100 font-semibold rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg cursor-pointer"
            >
              Aktifkan Periode
            </button>
          </div>
        </form>
      </Modal>

      {/* Generic Detail Modal */}
      {detailItem && (
        <Modal
          isOpen={true}
          onClose={() => setDetailItem(null)}
          title={detailItem.title}
          maxWidth="sm"
        >
          <div className="py-2">
            {detailItem.content}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Ekspor & Cetak Hasil Ujian CBT */}
      <ExportResultModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        results={results}
        exams={exams}
        classes={classes}
        users={users}
        settings={settings}
        defaultExamId={examFilter !== 'all' ? examFilter : (reportExamFilter !== 'all' ? reportExamFilter : 'all')}
        onAuditLog={(action, details) => {
          logAuditEvent({
            userId: user.uid,
            userName: user.name,
            role: 'admin',
            action,
            details
          });
        }}
        onSuccessToast={msg => showToast('success', msg)}
      />

      {/* Admin Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isAdminQuestionEditorOpen}
        onClose={() => {
          setIsAdminQuestionEditorOpen(false);
          setAdminEditingQuestion(null);
        }}
        onSave={handleAdminSaveQuestion}
        subjects={subjects}
        initialQuestion={adminEditingQuestion}
        currentUser={{ uid: user.uid, name: user.name }}
      />

      {/* Admin Smart Question Import Modal (Excel XLSX / CSV / DOC / TXT) */}
      <QuestionImportModal
        isOpen={isAdminQuestionImportOpen}
        onClose={() => setIsAdminQuestionImportOpen(false)}
        subjects={subjects}
        currentUser={{ uid: user.uid, name: user.name }}
        onSuccess={handleAdminImportSuccess}
        existingQuestions={questions}
      />

      {/* Admin Question Export Modal (PDF, DOC, JSON) */}
      <QuestionExportModal
        isOpen={isAdminQuestionExportOpen}
        onClose={() => setIsAdminQuestionExportOpen(false)}
        questions={questions}
        subjects={subjects}
        settings={settings}
        currentUserName={user.name}
        onAuditLog={(action, details) => {
          logAuditEvent({
            userId: user.uid,
            userName: user.name,
            role: 'admin',
            action,
            details
          });
        }}
      />

      {/* Admin Question Detail Modal */}
      <QuestionDetailModal
        isOpen={!!adminSelectedDetailQuestion}
        onClose={() => setAdminSelectedDetailQuestion(null)}
        question={adminSelectedDetailQuestion}
        onEdit={q => {
          setAdminEditingQuestion(q);
          setIsAdminQuestionEditorOpen(true);
        }}
      />

      {/* Confirmation Dialog for Deletions */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Penghapusan Data"
        message={`Apakah Anda yakin ingin menghapus permanen [${deleteTarget?.title}] dari database? Tindakan ini tidak dapat dikembalikan.`}
        confirmLabel="Hapus Permanen"
      />

      {/* Student Import & Export Modal (Integrated with Classes & Subjects) */}
      <StudentImportExportModal
        isOpen={isStudentImportExportOpen}
        onClose={() => setIsStudentImportExportOpen(false)}
        classes={classes}
        subjects={subjects}
        users={users}
        currentUser={user}
        onSuccess={() => {
          loadAllData();
          showToast('success', 'Data siswa berhasil disinkronkan ke rombel dan manajemen sekolah.');
        }}
      />

      {/* Admin Exam Editor Modal (Freeze Snapshot & Configuration) */}
      <ExamEditorModal
        isOpen={isAdminExamModalOpen}
        onClose={() => {
          setIsAdminExamModalOpen(false);
          setAdminEditingExam(null);
        }}
        onSave={handleAdminSaveExam}
        existingExam={adminEditingExam}
        questions={questions}
        subjects={subjects}
        classes={classes}
        academicYears={academicYears}
        currentUser={user}
      />

      {/* Admin Exam Result PDF Report with School Branding */}
      {adminSelectedExamForPdf && (
        <ExamResultPdfReport
          isOpen={true}
          onClose={() => setAdminSelectedExamForPdf(null)}
          exam={adminSelectedExamForPdf}
          results={results}
          schoolSettings={settings || undefined}
        />
      )}
    </div>
  );
};
