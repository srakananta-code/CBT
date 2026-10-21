export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type GradeLevel = 'VII' | 'VIII' | 'IX';
export type SemesterType = 'ganjil' | 'genap';
export type QuestionType =
  | 'multiple_choice'
  | 'complex_multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'matching';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
export type SessionStatus = 'ongoing' | 'submitted' | 'timed_out' | 'blocked';
export type ResultStatus = 'pending' | 'graded' | 'published';
export type ProctoringEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'keyboard_shortcut'
  | 'keystroke_anomaly'
  | 'periodic_screenshot'
  | 'ai_anomaly_detected';

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  classId?: string;
  className?: string;
  nisn?: string;
  nip?: string;
  assignedSubjects?: string[];
  tempPassword?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentBadge {
  id: string;
  title: string;
  description: string;
  category: 'score' | 'speed' | 'integrity' | 'mastery' | 'consistency';
  icon: string;
  color: string;
  bgGradient: string;
  unlockedAt?: string;
  isUnlocked: boolean;
  progressText?: string;
}

export interface SchoolClass {
  id: string;
  grade: GradeLevel;
  name: string;
  academicYearId: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  studentCount?: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  gradeLevel: GradeLevel | 'all';
  teacherIds: string[];
  createdAt: string;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2025/2026"
  semester: SemesterType;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D", "E"
  text: string;
  image?: string;
  isCorrect?: boolean;
}

export interface TrueFalseStatement {
  id: string;
  statement: string;
  isCorrect: boolean; // true = Benar, false = Salah
}

export interface ShortAnswerRule {
  caseSensitive: boolean;
  ignoreSpacing: boolean;
  acceptedAnswers: string[]; // Variasi jawaban yang diterima, misal: ["Soekarno", "Ir. Soekarno", "Sukarno"]
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: GradeLevel;
  type: QuestionType;
  questionText: string;
  questionImage?: string;
  options: QuestionOption[];
  topic: string;
  material?: string; // Pokok bahasan/materi
  difficulty: DifficultyLevel;
  learningObjectives?: string; // Capaian / Tujuan pembelajaran opsional
  weight?: number; // Bobot nilai soal (default 10)
  tags?: string[]; // Tag untuk bank soal terpusat (e.g. #PTS2025, #Aljabar, #HOTS)
  isArchived?: boolean; // Status aktif atau diarsipkan
  // Data kunci dan pembahasan privat (hanya guru & admin, jangan kirim ke siswa)
  answerKey?: string | string[]; // Untuk PG (string misal 'A'), PG Kompleks (string[] misal ['A','C']), Isian Singkat
  trueFalseStatements?: TrueFalseStatement[]; // Khusus tipe Benar/Salah bertingkat
  shortAnswerRules?: ShortAnswerRule; // Aturan normalisasi isian singkat
  explanation?: string; // Pembahasan privat dan rubrik penskoran esai
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt?: string;
}

export type ExamType = 'UH' | 'PTS' | 'PAS' | 'AAT' | 'TO' | 'US' | 'quiz';

export interface ExamRules {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  blockNewTab: boolean;
  showScoreAfterExam: boolean;
  maxViolations: number;
  showDiscussionAfterExam?: boolean; // Kebijakan tampilan pembahasan setelah ujian
  scoringMethod?: 'standard' | 'penalty'; // Pengaturan penilaian
}

export interface Exam {
  id: string;
  title: string;
  examType?: ExamType; // Jenis ujian: UH, PTS, PAS, AAT, TO, US, quiz
  academicYearId?: string; // Tahun ajaran
  academicYearName?: string;
  subjectId: string;
  subjectName: string;
  targetClassIds: string[];
  targetClassNames: string[];
  teacherId: string;
  teacherName: string;
  durationMinutes: number;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  maxAttempts?: number; // Batas percobaan (default 1)
  tokenEnabled?: boolean; // Token ujian opsional
  token?: string;
  status: ExamStatus; // 'draft' | 'published' | 'ongoing' | 'completed' | 'archived'
  rules: ExamRules;
  questionIds?: string[]; // Daftar ID soal yang dipilih
  totalQuestions: number;
  totalWeight?: number; // Total bobot soal
  passingScore: number;
  showResultImmediately: boolean; // Pengaturan publikasi nilai
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Snapshot soal ujian yang di-freeze saat ujian diterbitkan.
 * Siswa hanya membaca dari sini; aman dan terpisah dari perubahan di bank soal.
 */
export interface ExamQuestionSnapshot {
  id: string;
  examId: string;
  questionId: string;
  orderNumber: number;
  type: QuestionType;
  questionText: string;
  questionImage?: string;
  options: QuestionOption[];
  weight: number;
  topic?: string;
  material?: string;
  difficulty?: DifficultyLevel;
  trueFalseStatements?: { id: string; statement: string }[]; // Siswa hanya menerima pernyataan tanpa kunci isCorrect
  snapshotAt: string;
}

/**
 * Kunci jawaban sensitif yang dilindungi secara ketat dari akses siswa.
 */
export interface ExamAnswerKey {
  id: string;
  examId: string;
  questionId: string;
  correctAnswer: string;
  scoreValue: number;
  rubricExplanation?: string;
  creatorId: string;
  createdAt: string;
}

export type AnswerKey = ExamAnswerKey;

export interface ExamSession {
  id: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  startTime: string;
  endTimeDeadline: string;
  submittedAt?: string;
  status: SessionStatus;
  violationCount: number;
  shuffledQuestionIds?: string[]; // Pemetaan urutan soal konsisten untuk sesi ini
  shuffledOptionOrders?: Record<string, string[]>; // Pemetaan urutan opsi konsisten per butir
  attemptNumber?: number; // Percobaan ke-N
  ipAddress?: string;
  userAgent?: string;
  currentQuestionIndex?: number;
  answeredCount?: number;
  doubtfulCount?: number;
  teacherWarning?: string;
  aiRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  lastAnalysisSummary?: string;
  lastScreenshotUrl?: string;
  lastScreenshotTime?: string;
  unusualKeystrokeCount?: number;
}

/**
 * Jawaban peserta per butir soal di subkoleksi examSessions/{sessionId}/answers
 */
export interface SessionAnswer {
  id: string;
  sessionId: string;
  examId: string;
  studentId: string;
  questionId: string;
  selectedOption?: string; // 'A', 'B', etc.
  essayAnswer?: string;
  isDoubtful: boolean;
  updatedAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName: string;
  className: string;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  finalScore: number;
  status: ResultStatus;
  publishedAt?: string;
  gradedBy?: string;
}

export interface ProctoringEvent {
  id: string;
  sessionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  eventType: ProctoringEventType;
  details: string;
  timestamp: string;
  aiRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  aiAnalysisSummary?: string;
  screenshotUrl?: string;
  keystrokeMetrics?: {
    wpm?: number;
    rapidBurstDetected?: boolean;
    unauthorizedKeysCombo?: string[];
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AppSetting {
  id: string;
  schoolName: string;
  schoolNpsn: string;
  schoolAddress?: string;
  schoolCity?: string;
  schoolPostalCode?: string;
  schoolPhone?: string;
  schoolWebsite?: string;
  schoolLogoUrl?: string;
  principalName?: string;
  principalNip?: string;
  activeAcademicYear: string;
  activeSemester: SemesterType;
  allowReviewAfterExam: boolean;
  cbtStrictFocusMode: boolean;
  maxViolationsAllowed: number;
  updatedAt?: string;
}
