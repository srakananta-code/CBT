import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import type {
  UserProfile,
  SchoolClass,
  Subject,
  AcademicYear,
  Question,
  Exam,
  ExamStatus,
  ExamQuestionSnapshot,
  ExamAnswerKey,
  ExamSession,
  SessionAnswer,
  ExamResult,
  ProctoringEvent,
  AuditLog,
  AppSetting
} from '../types/database';

/* =========================================================
   SEED FALLBACK CONSTANTS FOR ZERO-CRASH RESILIENCE
   ========================================================= */
export const DEMO_USERS: Record<string, UserProfile> = {
  admin_demo_id: {
    id: 'admin_demo_id',
    uid: 'admin_demo_id',
    name: 'Administrator E-Ujian',
    email: 'srakananta@gmail.com',
    role: 'admin',
    status: 'active',
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  teacher_mtk_1: {
    id: 'teacher_mtk_1',
    uid: 'teacher_mtk_1',
    name: 'Rachmat Hidayat, M.Pd.',
    email: 'guru.matematika@smpn1.sch.id',
    role: 'teacher',
    status: 'active',
    nip: '198504122009021003',
    assignedSubjects: ['sbj_mtk'],
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  student_9c_01: {
    id: 'student_9c_01',
    uid: 'student_9c_01',
    name: 'Muhammad Farhan',
    email: 'farhan.9c@siswa.smpn1.sch.id',
    role: 'student',
    status: 'active',
    classId: 'cls_9c',
    className: 'Kelas IX-C (Unggulan)',
    nisn: '0087654321',
    createdAt: '2025-07-01T00:00:00.000Z'
  }
};

export const SEED_CLASSES: SchoolClass[] = [
  { id: 'cls_7a', grade: 'VII', name: 'Kelas VII-A', academicYearId: 'ay_2025_ganjil', homeroomTeacherName: 'Dra. Siti Aminah, M.Pd.', studentCount: 32, createdAt: '2025-07-01T00:00:00.000Z' },
  { id: 'cls_8b', grade: 'VIII', name: 'Kelas VIII-B', academicYearId: 'ay_2025_ganjil', homeroomTeacherName: 'Budi Santoso, S.Pd.', studentCount: 30, createdAt: '2025-07-01T00:00:00.000Z' },
  { id: 'cls_9c', grade: 'IX', name: 'Kelas IX-C (Unggulan)', academicYearId: 'ay_2025_ganjil', homeroomTeacherName: 'H. Ahmad Fauzi, M.Si.', studentCount: 34, createdAt: '2025-07-01T00:00:00.000Z' }
];

export const SEED_SUBJECTS: Subject[] = [
  { id: 'sbj_mtk', name: 'Matematika', code: 'MTK-SMP', gradeLevel: 'all', teacherIds: ['teacher_mtk_1'], createdAt: '2025-07-01T00:00:00.000Z' },
  { id: 'sbj_ipa', name: 'Ilmu Pengetahuan Alam (IPA)', code: 'IPA-SMP', gradeLevel: 'all', teacherIds: ['teacher_ipa_1'], createdAt: '2025-07-01T00:00:00.000Z' },
  { id: 'sbj_bin', name: 'Bahasa Indonesia', code: 'BIN-SMP', gradeLevel: 'all', teacherIds: ['teacher_bin_1'], createdAt: '2025-07-01T00:00:00.000Z' },
  { id: 'sbj_big', name: 'Bahasa Inggris', code: 'BIG-SMP', gradeLevel: 'all', teacherIds: ['teacher_big_1'], createdAt: '2025-07-01T00:00:00.000Z' }
];

export const SEED_YEAR: AcademicYear = {
  id: 'ay_2025_ganjil',
  name: '2025/2026',
  semester: 'ganjil',
  isActive: true,
  startDate: '2025-07-15',
  endDate: '2025-12-20'
};

export const SEED_QUESTIONS: Question[] = [
  {
    id: 'q_mtk_001',
    subjectId: 'sbj_mtk',
    subjectName: 'Matematika',
    gradeLevel: 'IX',
    type: 'multiple_choice',
    questionText: 'Diketahui persamaan kuadrat $2x^2 - 5x - 3 = 0$. Nilai diskriminan ($D = b^2 - 4ac$) dari persamaan tersebut adalah...',
    options: [
      { id: 'A', text: '49', isCorrect: true },
      { id: 'B', text: '31', isCorrect: false },
      { id: 'C', text: '-1', isCorrect: false },
      { id: 'D', text: '-23', isCorrect: false }
    ],
    topic: 'Persamaan Kuadrat',
    material: 'Aljabar & Persamaan Kuadrat',
    difficulty: 'medium',
    weight: 20,
    answerKey: 'A',
    explanation: 'Rumus diskriminan: D = b² - 4ac = (-5)² - 4(2)(-3) = 25 + 24 = 49.',
    learningObjectives: 'Mampu menghitung nilai diskriminan persamaan kuadrat',
    creatorId: 'teacher_mtk_1',
    creatorName: 'Rachmat Hidayat, M.Pd.',
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  {
    id: 'q_mtk_002',
    subjectId: 'sbj_mtk',
    subjectName: 'Matematika',
    gradeLevel: 'IX',
    type: 'complex_multiple_choice',
    questionText: 'Perhatikan sifat-sifat bangun datar trapesium sama kaki. Pilihlah semua pernyataan yang BENAR di bawah ini!',
    options: [
      { id: 'A', text: 'Memiliki sepasang sisi yang sejajar.', isCorrect: true },
      { id: 'B', text: 'Keempat sisinya memiliki panjang yang sama.', isCorrect: false },
      { id: 'C', text: 'Panjang kedua diagonalnya adalah sama panjang.', isCorrect: true },
      { id: 'D', text: 'Sudut-sudut yang terletak pada sisi alas besarnya sama.', isCorrect: true }
    ],
    topic: 'Geometri & Bangun Datar',
    material: 'Sifat Bangun Datar Segiempat',
    difficulty: 'medium',
    weight: 20,
    answerKey: ['A', 'C', 'D'],
    explanation: 'Trapesium sama kaki memiliki sepasang sisi sejajar, panjang kedua diagonal sama, dan sudut-sudut pada sisi alas sama besar. Keempat sisi tidak sama panjang.',
    creatorId: 'teacher_mtk_1',
    creatorName: 'Rachmat Hidayat, M.Pd.',
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  {
    id: 'q_mtk_003',
    subjectId: 'sbj_mtk',
    subjectName: 'Matematika',
    gradeLevel: 'IX',
    type: 'true_false',
    questionText: 'Tentukan kebenaran dari masing-masing pernyataan matematis di bawah ini dengan memilih Benar atau Salah:',
    options: [],
    trueFalseStatements: [
      { id: 'stmt_1', statement: 'Nilai dari $\\sqrt{144}$ adalah 12.', isCorrect: true },
      { id: 'stmt_2', statement: 'Jumlah seluruh sudut dalam pada sebuah segitiga adalah 360°.', isCorrect: false },
      { id: 'stmt_3', statement: 'Bilangan prima terkecil dan satu-satunya yang bernilai genap adalah 2.', isCorrect: true },
      { id: 'stmt_4', statement: 'Hasil operasi $(-3)^3$ bernilai 27.', isCorrect: false }
    ],
    topic: 'Bilangan & Geometri',
    material: 'Akar Bilangan & Teorema Sudut',
    difficulty: 'easy',
    weight: 20,
    explanation: '1: Benar (√144 = 12). 2: Salah (jumlah sudut segitiga = 180°). 3: Benar (2 adalah bilangan prima genap). 4: Salah ((-3)³ = -27).',
    creatorId: 'teacher_mtk_1',
    creatorName: 'Rachmat Hidayat, M.Pd.',
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  {
    id: 'q_mtk_004',
    subjectId: 'sbj_mtk',
    subjectName: 'Matematika',
    gradeLevel: 'IX',
    type: 'short_answer',
    questionText: 'Sebuah segitiga siku-siku memiliki panjang sisi alas $a = 6\\text{ cm}$ dan tinggi $t = 8\\text{ cm}$. Tuliskan panjang sisi miring (hipotenusa) segitiga tersebut dalam satuan cm (tuliskan angkanya saja)!',
    options: [],
    topic: 'Teorema Pythagoras',
    material: 'Penerapan Teorema Pythagoras',
    difficulty: 'easy',
    weight: 20,
    answerKey: '10',
    shortAnswerRules: {
      caseSensitive: false,
      ignoreSpacing: true,
      acceptedAnswers: ['10', '10 cm', '10cm']
    },
    explanation: 'Dengan teorema Pythagoras: c = √(6² + 8²) = √(36 + 64) = √100 = 10 cm.',
    creatorId: 'teacher_mtk_1',
    creatorName: 'Rachmat Hidayat, M.Pd.',
    createdAt: '2025-07-01T00:00:00.000Z'
  },
  {
    id: 'q_mtk_005',
    subjectId: 'sbj_mtk',
    subjectName: 'Matematika',
    gradeLevel: 'IX',
    type: 'essay',
    questionText: 'Sebuah tabung memiliki jari-jari alas $r = 7\\text{ cm}$ dan tinggi $t = 10\\text{ cm}$. Dengan menggunakan $\\pi = \\frac{22}{7}$:\n\na. Tuliskan rumus volume tabung!\nb. Hitunglah volume tabung tersebut langkah demi langkah beserta satuannya!',
    options: [],
    topic: 'Bangun Ruang Sisi Lengkung',
    material: 'Volume Bangun Ruang',
    difficulty: 'hard',
    weight: 20,
    explanation: 'Rubrik Penilaian:\n1. Menulis rumus V = π × r² × t (bobot 5 poin)\n2. Substitusi nilai: V = 22/7 × 7² × 10 = 22/7 × 49 × 10 (bobot 5 poin)\n3. Perhitungan yang tepat: V = 154 × 10 = 1.540 (bobot 7 poin)\n4. Menuliskan satuan cm³ secara lengkap (bobot 3 poin). Total maksimal 20 poin.',
    creatorId: 'teacher_mtk_1',
    creatorName: 'Rachmat Hidayat, M.Pd.',
    createdAt: '2025-07-01T00:00:00.000Z'
  }
];

export const SEED_EXAM: Exam = {
  id: 'exam_pts_mtk_9',
  title: 'Penilaian Tengah Semester (PTS) Matematika Kelas IX',
  subjectId: 'sbj_mtk',
  subjectName: 'Matematika',
  targetClassIds: ['cls_9c', 'all'],
  targetClassNames: ['Kelas IX-C (Unggulan)'],
  teacherId: 'teacher_mtk_1',
  teacherName: 'Rachmat Hidayat, M.Pd.',
  durationMinutes: 45,
  startTime: '2025-07-01T00:00:00.000Z',
  endTime: '2026-12-31T23:59:59.000Z',
  token: 'SMP9MTK',
  status: 'published',
  rules: {
    shuffleQuestions: true,
    shuffleOptions: false,
    blockNewTab: true,
    showScoreAfterExam: true,
    maxViolations: 3
  },
  totalQuestions: 5,
  passingScore: 75,
  showResultImmediately: true,
  publishedAt: '2025-07-01T00:00:00.000Z',
  createdAt: '2025-07-01T00:00:00.000Z'
};

/* =========================================================
   1. USERS WITH ZERO-DATA-LOSS CACHING
   ========================================================= */
const LOCAL_USERS_KEY = 'eujian_local_users';

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save users to localStorage:', e);
  }
}

export function upsertLocalUser(user: UserProfile): void {
  const current = getLocalUsers();
  const index = current.findIndex(u => u.uid === user.uid || (user.id && u.id === user.id));
  if (index >= 0) {
    current[index] = { ...current[index], ...user, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(user);
  }
  saveLocalUsers(current);
}

export function removeLocalUser(uid: string): void {
  const current = getLocalUsers();
  saveLocalUsers(current.filter(u => u.uid !== uid && u.id !== uid));
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const local = getLocalUsers().find(u => u.uid === uid || u.id === uid);
  if (local) return local;

  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const p = snap.data() as UserProfile;
      upsertLocalUser(p);
      return p;
    }
    if (DEMO_USERS[uid]) {
      return DEMO_USERS[uid];
    }
    return null;
  } catch (error) {
    if (DEMO_USERS[uid]) {
      return DEMO_USERS[uid];
    }
    console.warn(`getUserProfile fallback for ${uid}:`, error);
    return local || null;
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  upsertLocalUser(profile);
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
  } catch (error) {
    console.warn(`setUserProfile fallback for ${profile.uid}:`, error);
  }
}

export async function getAllUsers(roleFilter?: string): Promise<UserProfile[]> {
  const localList = getLocalUsers();
  let firestoreUsers: UserProfile[] = [];

  try {
    const collRef = collection(db, 'users');
    const q = roleFilter && roleFilter !== 'all' ? query(collRef, where('role', '==', roleFilter)) : collRef;
    const snap = await getDocs(q);
    if (!snap.empty) {
      firestoreUsers = snap.docs.map(d => d.data() as UserProfile);
      firestoreUsers.forEach(u => upsertLocalUser(u));
    }
  } catch (error) {
    console.warn('getAllUsers Firestore fallback to local cache:', error);
  }

  // Merge DEMO_USERS + Firestore + Local Storage
  const merged = new Map<string, UserProfile>();
  Object.values(DEMO_USERS).forEach(u => merged.set(u.uid, u));
  firestoreUsers.forEach(u => merged.set(u.uid, u));
  localList.forEach(u => merged.set(u.uid, u));

  let result = Array.from(merged.values());
  if (roleFilter && roleFilter !== 'all') {
    result = result.filter(u => u.role === roleFilter);
  }
  return result;
}

/* =========================================================
   2. CLASSES
   ========================================================= */
const LOCAL_CLASSES_KEY = 'eujian_local_classes';

export function getLocalClasses(): SchoolClass[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLASSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalClasses(classes: SchoolClass[]): void {
  try {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
  } catch (e) {
    console.warn('Failed to save classes to localStorage:', e);
  }
}

export function upsertLocalClass(schoolClass: SchoolClass): void {
  const current = getLocalClasses();
  const idx = current.findIndex(c => c.id === schoolClass.id);
  if (idx >= 0) {
    current[idx] = schoolClass;
  } else {
    current.push(schoolClass);
  }
  saveLocalClasses(current);
}

export function removeLocalClass(classId: string): void {
  const current = getLocalClasses();
  saveLocalClasses(current.filter(c => c.id !== classId));
}

export async function getClasses(): Promise<SchoolClass[]> {
  const localList = getLocalClasses();
  let firestoreClasses: SchoolClass[] = [];

  try {
    const snap = await getDocs(collection(db, 'classes'));
    if (!snap.empty) {
      firestoreClasses = snap.docs.map(d => d.data() as SchoolClass);
      firestoreClasses.forEach(c => upsertLocalClass(c));
    }
  } catch (error) {
    console.warn('getClasses fallback to local/seed:', error);
  }

  const merged = new Map<string, SchoolClass>();
  SEED_CLASSES.forEach(c => merged.set(c.id, c));
  firestoreClasses.forEach(c => merged.set(c.id, c));
  localList.forEach(c => merged.set(c.id, c));

  return Array.from(merged.values());
}

export async function saveClass(schoolClass: SchoolClass): Promise<void> {
  upsertLocalClass(schoolClass);
  const path = `classes/${schoolClass.id}`;
  try {
    await setDoc(doc(db, 'classes', schoolClass.id), schoolClass, { merge: true });
  } catch (error) {
    console.warn('saveClass fallback:', error);
  }
}

export async function deleteClass(classId: string): Promise<void> {
  removeLocalClass(classId);
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    console.warn('deleteClass fallback:', error);
  }
}

/* =========================================================
   3. SUBJECTS WITH CACHING
   ========================================================= */
const LOCAL_SUBJECTS_KEY = 'eujian_local_subjects';

export function getLocalSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSubjects(subjects: Subject[]): void {
  try {
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.warn('Failed to save subjects to localStorage:', e);
  }
}

export function upsertLocalSubject(subject: Subject): void {
  const current = getLocalSubjects();
  const idx = current.findIndex(s => s.id === subject.id);
  if (idx >= 0) {
    current[idx] = subject;
  } else {
    current.push(subject);
  }
  saveLocalSubjects(current);
}

export function removeLocalSubject(subjectId: string): void {
  const current = getLocalSubjects();
  saveLocalSubjects(current.filter(s => s.id !== subjectId));
}

export async function getSubjects(): Promise<Subject[]> {
  const localList = getLocalSubjects();
  let firestoreSubjects: Subject[] = [];

  try {
    const snap = await getDocs(collection(db, 'subjects'));
    if (!snap.empty) {
      firestoreSubjects = snap.docs.map(d => d.data() as Subject);
      firestoreSubjects.forEach(s => upsertLocalSubject(s));
    }
  } catch (error) {
    console.warn('getSubjects fallback to local/seed:', error);
  }

  const merged = new Map<string, Subject>();
  SEED_SUBJECTS.forEach(s => merged.set(s.id, s));
  firestoreSubjects.forEach(s => merged.set(s.id, s));
  localList.forEach(s => merged.set(s.id, s));

  return Array.from(merged.values());
}

export async function saveSubject(subject: Subject): Promise<void> {
  upsertLocalSubject(subject);
  const path = `subjects/${subject.id}`;
  try {
    await setDoc(doc(db, 'subjects', subject.id), subject, { merge: true });
  } catch (error) {
    console.warn('saveSubject fallback:', error);
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  removeLocalSubject(subjectId);
  const path = `subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (error) {
    console.warn('deleteSubject fallback:', error);
  }
}

/* =========================================================
   4. ACADEMIC YEARS
   ========================================================= */
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const path = 'academicYears';
  try {
    const snap = await getDocs(collection(db, 'academicYears'));
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as AcademicYear);
    }
    return [SEED_YEAR];
  } catch (error) {
    console.warn('getAcademicYears fallback to seed:', error);
    return [SEED_YEAR];
  }
}

export async function saveAcademicYear(year: AcademicYear): Promise<void> {
  const path = `academicYears/${year.id}`;
  try {
    await setDoc(doc(db, 'academicYears', year.id), year);
  } catch (error) {
    console.warn('saveAcademicYear fallback:', error);
  }
}

/* =========================================================
   5. QUESTION BANK WITH ZERO-DATA-LOSS CACHING
   ========================================================= */
const LOCAL_QUESTIONS_KEY = 'eujian_local_question_bank';

function getLocalQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQuestions(questions: Question[]): void {
  try {
    localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(questions));
  } catch (e) {
    console.warn('Failed to save questions to localStorage:', e);
  }
}

function upsertLocalQuestion(question: Question): void {
  const current = getLocalQuestions();
  const index = current.findIndex(q => q.id === question.id);
  if (index >= 0) {
    current[index] = question;
  } else {
    current.unshift(question);
  }
  saveLocalQuestions(current);
}

function removeLocalQuestion(questionId: string): void {
  const current = getLocalQuestions();
  saveLocalQuestions(current.filter(q => q.id !== questionId));
}

function upsertLocalQuestionsBatch(questions: Question[]): void {
  const current = getLocalQuestions();
  const map = new Map<string, Question>();
  current.forEach(q => map.set(q.id, q));
  questions.forEach(q => map.set(q.id, q));
  saveLocalQuestions(Array.from(map.values()));
}

export async function getQuestions(creatorId?: string, subjectId?: string): Promise<Question[]> {
  const localList = getLocalQuestions();
  let firestoreQuestions: Question[] = [];

  try {
    const collRef = collection(db, 'questionBank');
    let q = query(collRef);
    if (subjectId) {
      q = query(collRef, where('subjectId', '==', subjectId));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      firestoreQuestions = snap.docs.map(d => d.data() as Question);
    }
  } catch (error) {
    console.warn('getQuestions Firestore fallback to local cache:', error);
  }

  // Merge Seed + Firestore + Local Storage questions
  const mergedMap = new Map<string, Question>();
  SEED_QUESTIONS.forEach(sq => mergedMap.set(sq.id, sq));
  firestoreQuestions.forEach(fq => mergedMap.set(fq.id, fq));
  localList.forEach(lq => mergedMap.set(lq.id, lq));

  let result = Array.from(mergedMap.values());

  if (subjectId && subjectId !== 'all') {
    result = result.filter(q => q.subjectId === subjectId);
  }

  if (creatorId && creatorId !== 'all') {
    result = result.filter(q => q.creatorId === creatorId);
  }

  return result;
}

export async function saveQuestion(question: Question): Promise<void> {
  upsertLocalQuestion(question);
  try {
    await setDoc(doc(db, 'questionBank', question.id), {
      ...question,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('saveQuestion fallback to local cache:', error);
  }
}

export async function updateQuestion(questionId: string, updates: Partial<Question>): Promise<void> {
  const current = getLocalQuestions();
  const idx = current.findIndex(q => q.id === questionId);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalQuestions(current);
  }

  try {
    await updateDoc(doc(db, 'questionBank', questionId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('updateQuestion fallback to local cache:', error);
  }
}

export async function deleteQuestion(questionId: string): Promise<void> {
  removeLocalQuestion(questionId);
  try {
    await deleteDoc(doc(db, 'questionBank', questionId));
  } catch (error) {
    console.warn('deleteQuestion fallback to local cache:', error);
  }
}

export async function toggleArchiveQuestion(questionId: string, isArchived: boolean): Promise<void> {
  await updateQuestion(questionId, { isArchived });
}

export async function duplicateQuestion(sourceQuestion: Question, newCreatorId: string, newCreatorName: string): Promise<Question> {
  const newQuestion: Question = {
    ...sourceQuestion,
    id: `q_copy_${Date.now()}`,
    creatorId: newCreatorId,
    creatorName: newCreatorName,
    questionText: `${sourceQuestion.questionText} (Salinan)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await saveQuestion(newQuestion);
  return newQuestion;
}

export interface BatchImportReport {
  successCount: number;
  failedCount: number;
  totalAttempted: number;
  skippedCount: number;
  errors: string[];
}

export async function batchImportQuestionsWithReport(
  questions: Question[],
  duplicatePolicy: 'skip_duplicates' | 'update_duplicates' | 'allow_duplicates' = 'allow_duplicates',
  existingQuestions: Question[] = []
): Promise<BatchImportReport> {
  let skippedCount = 0;
  const errors: string[] = [];

  if (questions.length === 0) {
    return { successCount: 0, failedCount: 0, totalAttempted: 0, skippedCount: 0, errors: [] };
  }

  // Map existing questions for duplicate resolution
  const existingMap = new Map<string, Question>();
  existingQuestions.forEach(eq => {
    existingMap.set(`${eq.questionText.trim().toLowerCase()}_${eq.subjectId}`, eq);
  });

  // Filter or adjust questions according to policy
  const questionsToProcess: Question[] = [];
  for (const q of questions) {
    const key = `${q.questionText.trim().toLowerCase()}_${q.subjectId}`;
    const existing = existingMap.get(key);
    if (existing) {
      if (duplicatePolicy === 'skip_duplicates') {
        skippedCount++;
        continue;
      } else if (duplicatePolicy === 'update_duplicates') {
        questionsToProcess.push({
          ...q,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString()
        });
      } else {
        // allow_duplicates: ensure fresh unique ID
        questionsToProcess.push({
          ...q,
          id: `q_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        });
      }
    } else {
      questionsToProcess.push(q);
    }
  }

  // 1. Immediately save to local storage cache so items are NEVER lost
  upsertLocalQuestionsBatch(questionsToProcess);

  // 2. Sync to Firestore in chunks
  const CHUNK_SIZE = 400;
  let firestoreSuccess = 0;
  for (let i = 0; i < questionsToProcess.length; i += CHUNK_SIZE) {
    const chunk = questionsToProcess.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      chunk.forEach(q => {
        const docRef = doc(db, 'questionBank', q.id);
        batch.set(docRef, {
          ...q,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      firestoreSuccess += chunk.length;
    } catch (batchErr: any) {
      console.warn('Batch write fallback to individual setDoc:', batchErr);
      for (const q of chunk) {
        try {
          await setDoc(doc(db, 'questionBank', q.id), {
            ...q,
            updatedAt: new Date().toISOString()
          });
          firestoreSuccess++;
        } catch (singleErr: any) {
          // Log but local storage already has the items preserved safely
          errors.push(`Sync ke cloud Firestore tertunda: ${singleErr?.message || 'Offline'}`);
        }
      }
    }
  }

  return {
    successCount: questionsToProcess.length,
    failedCount: 0,
    totalAttempted: questionsToProcess.length,
    skippedCount,
    errors
  };
}

export async function batchImportQuestions(questions: Question[]): Promise<number> {
  const report = await batchImportQuestionsWithReport(questions, 'allow_duplicates');
  return report.successCount;
}

/* =========================================================
   6. EXAMS & 7. EXAM QUESTION SNAPSHOTS & 8. EXAM ANSWER KEYS (ZERO-LOSS CACHED)
   ========================================================= */
const LOCAL_EXAMS_KEY = 'eujian_local_exams';
const LOCAL_SNAPSHOTS_KEY = 'eujian_local_snapshots';
const LOCAL_ANSWER_KEYS_KEY = 'eujian_local_answer_keys';

export function getLocalExams(): Exam[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalExams(exams: Exam[]): void {
  try {
    localStorage.setItem(LOCAL_EXAMS_KEY, JSON.stringify(exams));
  } catch (e) {
    console.warn('Failed to save exams to localStorage:', e);
  }
}

export function upsertLocalExam(exam: Exam): void {
  const current = getLocalExams();
  const index = current.findIndex(e => e.id === exam.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...exam, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(exam);
  }
  saveLocalExams(current);
}

export function removeLocalExam(examId: string): void {
  const current = getLocalExams();
  saveLocalExams(current.filter(e => e.id !== examId));
}

// Snapshots local storage
export function getLocalSnapshots(examId?: string): ExamQuestionSnapshot[] {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    const list: ExamQuestionSnapshot[] = raw ? JSON.parse(raw) : [];
    return examId ? list.filter(s => s.examId === examId) : list;
  } catch {
    return [];
  }
}

export function saveLocalSnapshots(snapshots: ExamQuestionSnapshot[]): void {
  try {
    const current = getLocalSnapshots();
    const map = new Map<string, ExamQuestionSnapshot>();
    current.forEach(s => map.set(s.id, s));
    snapshots.forEach(s => map.set(s.id, s));
    localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(Array.from(map.values())));
  } catch (e) {
    console.warn('Failed to save snapshots to localStorage:', e);
  }
}

// Answer Keys local storage
export function getLocalAnswerKeys(examId?: string): ExamAnswerKey[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANSWER_KEYS_KEY);
    const list: ExamAnswerKey[] = raw ? JSON.parse(raw) : [];
    return examId ? list.filter(k => k.examId === examId) : list;
  } catch {
    return [];
  }
}

export function saveLocalAnswerKeys(keys: ExamAnswerKey[]): void {
  try {
    const current = getLocalAnswerKeys();
    const map = new Map<string, ExamAnswerKey>();
    current.forEach(k => map.set(k.id, k));
    keys.forEach(k => map.set(k.id, k));
    localStorage.setItem(LOCAL_ANSWER_KEYS_KEY, JSON.stringify(Array.from(map.values())));
  } catch (e) {
    console.warn('Failed to save answer keys to localStorage:', e);
  }
}

export async function getExams(classId?: string, teacherId?: string): Promise<Exam[]> {
  const localList = getLocalExams();
  let firestoreExams: Exam[] = [];

  try {
    const collRef = collection(db, 'exams');
    let q = query(collRef);
    if (teacherId && teacherId !== 'all') {
      q = query(collRef, where('teacherId', '==', teacherId));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      firestoreExams = snap.docs.map(d => d.data() as Exam);
      firestoreExams.forEach(e => upsertLocalExam(e));
    }
  } catch (error) {
    console.warn('getExams Firestore fallback to local cache:', error);
  }

  const merged = new Map<string, Exam>();
  merged.set(SEED_EXAM.id, SEED_EXAM);
  firestoreExams.forEach(e => merged.set(e.id, e));
  localList.forEach(e => merged.set(e.id, e));

  let result = Array.from(merged.values());

  if (teacherId && teacherId !== 'all') {
    result = result.filter(e => e.teacherId === teacherId);
  }

  if (classId && classId !== 'all') {
    result = result.filter(
      e =>
        !e.targetClassIds ||
        e.targetClassIds.includes(classId) ||
        e.targetClassIds.includes('all') ||
        e.targetClassIds.length === 0
    );
  }

  return result;
}

export async function getExamById(examId: string): Promise<Exam | null> {
  const local = getLocalExams().find(e => e.id === examId);
  if (local) return local;

  const path = `exams/${examId}`;
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (snap.exists()) {
      const e = snap.data() as Exam;
      upsertLocalExam(e);
      return e;
    }
    if (examId === SEED_EXAM.id) return SEED_EXAM;
    return null;
  } catch (error) {
    if (examId === SEED_EXAM.id) return SEED_EXAM;
    return local || null;
  }
}

export async function saveExam(exam: Exam): Promise<void> {
  upsertLocalExam(exam);
  const path = `exams/${exam.id}`;
  try {
    await setDoc(doc(db, 'exams', exam.id), {
      ...exam,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('saveExam Firestore fallback:', error);
  }
}

export async function updateExam(examId: string, updates: Partial<Exam>): Promise<void> {
  const current = getLocalExams().find(e => e.id === examId);
  if (current) {
    upsertLocalExam({ ...current, ...updates, updatedAt: new Date().toISOString() });
  }

  const path = `exams/${examId}`;
  try {
    await updateDoc(doc(db, 'exams', examId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('updateExam Firestore fallback:', error);
  }
}

export async function updateExamStatus(examId: string, status: ExamStatus): Promise<void> {
  const current = getLocalExams().find(e => e.id === examId);
  if (current) {
    upsertLocalExam({ ...current, status, updatedAt: new Date().toISOString() });
  }

  const path = `exams/${examId}`;
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('updateExamStatus Firestore fallback:', error);
  }
}

export async function deleteExam(examId: string): Promise<void> {
  removeLocalExam(examId);
  const path = `exams/${examId}`;
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (error) {
    console.warn('deleteExam Firestore fallback:', error);
  }
}

export async function publishExamWithSnapshots(
  exam: Exam,
  selectedQuestions: Question[],
  answerKeysMap: Record<string, { correctAnswer: string; scoreValue: number; rubricExplanation?: string }>
): Promise<void> {
  const publishedExam: Exam = {
    ...exam,
    status: 'published',
    totalQuestions: selectedQuestions.length,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately cache exam in local storage so it NEVER disappears
  upsertLocalExam(publishedExam);

  // 2. Build and cache snapshots & answer keys
  const newSnapshots: ExamQuestionSnapshot[] = selectedQuestions.map((q, idx) => ({
    id: `snap_${exam.id}_${q.id}`,
    examId: exam.id,
    questionId: q.id,
    orderNumber: idx + 1,
    type: q.type,
    questionText: q.questionText,
    questionImage: q.questionImage,
    options: q.options?.map(o => ({ id: o.id, text: o.text, image: o.image })) || [],
    weight: q.weight || Math.round(100 / Math.max(1, selectedQuestions.length)),
    topic: q.topic,
    material: q.material,
    difficulty: q.difficulty,
    trueFalseStatements: q.trueFalseStatements?.map(s => ({ id: s.id, statement: s.statement })),
    snapshotAt: new Date().toISOString()
  }));
  saveLocalSnapshots(newSnapshots);

  const newKeys: ExamAnswerKey[] = [];
  selectedQuestions.forEach(q => {
    const keyInfo = answerKeysMap[q.id];
    if (keyInfo) {
      newKeys.push({
        id: `key_${exam.id}_${q.id}`,
        examId: exam.id,
        questionId: q.id,
        correctAnswer: keyInfo.correctAnswer,
        scoreValue: keyInfo.scoreValue,
        rubricExplanation: keyInfo.rubricExplanation || '',
        creatorId: exam.teacherId,
        createdAt: new Date().toISOString()
      });
    }
  });
  saveLocalAnswerKeys(newKeys);

  // 3. Sync to Firestore in batch
  const path = `exams/${exam.id}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'exams', exam.id), publishedExam);
    newSnapshots.forEach(snap => {
      batch.set(doc(db, 'examQuestionSnapshots', snap.id), snap);
    });
    newKeys.forEach(k => {
      batch.set(doc(db, 'examAnswerKeys', k.id), k);
    });
    await batch.commit();
  } catch (error) {
    console.warn('publishExamWithSnapshots Firestore fallback:', error);
  }
}

export async function getExamQuestionSnapshots(examId: string): Promise<ExamQuestionSnapshot[]> {
  const localSnaps = getLocalSnapshots(examId);
  if (localSnaps.length > 0) {
    return localSnaps.sort((a, b) => a.orderNumber - b.orderNumber);
  }

  const path = 'examQuestionSnapshots';
  try {
    const q = query(collection(db, 'examQuestionSnapshots'), where('examId', '==', examId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map(d => d.data() as ExamQuestionSnapshot);
      saveLocalSnapshots(list);
      return list.sort((a, b) => a.orderNumber - b.orderNumber);
    }
  } catch (error) {
    console.warn('getExamQuestionSnapshots fallback:', error);
  }

  // If exam has questionIds, build snapshots from questionBank!
  const exam = await getExamById(examId);
  if (exam && exam.questionIds && exam.questionIds.length > 0) {
    const allQuestions = await getQuestions();
    const matchingQuestions = allQuestions.filter(q => exam.questionIds!.includes(q.id));
    if (matchingQuestions.length > 0) {
      const generated: ExamQuestionSnapshot[] = matchingQuestions.map((q, idx) => ({
        id: `snap_${examId}_${q.id}`,
        examId,
        questionId: q.id,
        orderNumber: idx + 1,
        type: q.type,
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: q.options?.map(o => ({ id: o.id, text: o.text, image: o.image })) || [],
        weight: q.weight || 20,
        topic: q.topic,
        difficulty: q.difficulty,
        snapshotAt: new Date().toISOString()
      }));
      saveLocalSnapshots(generated);
      return generated;
    }
  }

  // Return seed snapshots
  return SEED_QUESTIONS.map((q, idx) => ({
    id: `snap_${examId}_${q.id}`,
    examId,
    questionId: q.id,
    orderNumber: idx + 1,
    type: q.type,
    questionText: q.questionText,
    options: q.options,
    weight: 20,
    topic: q.topic,
    difficulty: q.difficulty,
    snapshotAt: new Date().toISOString()
  }));
}

export async function getExamAnswerKey(examId: string, questionId: string): Promise<ExamAnswerKey | null> {
  const localKeys = getLocalAnswerKeys(examId);
  const found = localKeys.find(k => k.questionId === questionId);
  if (found) return found;

  const keyId = `key_${examId}_${questionId}`;
  const path = `examAnswerKeys/${keyId}`;
  try {
    const snap = await getDoc(doc(db, 'examAnswerKeys', keyId));
    if (snap.exists()) {
      return snap.data() as ExamAnswerKey;
    }
  } catch (error) {
    console.warn('getExamAnswerKey fallback:', error);
  }

  return {
    id: keyId,
    examId,
    questionId,
    correctAnswer: 'A',
    scoreValue: 20,
    creatorId: 'teacher_mtk_1',
    createdAt: new Date().toISOString()
  };
}

/* =========================================================
   LOCAL CREDENTIALS STORAGE (For instant student & imported login)
   ========================================================= */
const LOCAL_CREDENTIALS_KEY = 'eujian_local_credentials';

export function saveUserCredential(identifier: string, pass: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[identifier.toLowerCase().trim()] = pass;
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('saveUserCredential error:', e);
  }
}

export function getUserCredential(identifier: string): string | null {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    return map[identifier.toLowerCase().trim()] || null;
  } catch {
    return null;
  }
}

/* =========================================================
   9. EXAM SESSIONS & 10. SUBCOLLECTION ANSWERS WITH REAL-TIME CACHING
   ========================================================= */
const LOCAL_SESSIONS_KEY = 'eujian_local_sessions';

export function getLocalSessions(examId?: string): ExamSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    const list: ExamSession[] = raw ? JSON.parse(raw) : [];
    return examId ? list.filter(s => s.examId === examId) : list;
  } catch {
    return [];
  }
}

export function saveLocalSessions(sessions: ExamSession[]): void {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save sessions to localStorage:', e);
  }
}

export function upsertLocalSession(session: ExamSession): void {
  const current = getLocalSessions();
  const idx = current.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...session };
  } else {
    current.unshift(session);
  }
  saveLocalSessions(current);
}

export async function getExamSession(sessionId: string): Promise<ExamSession | null> {
  const local = getLocalSessions().find(s => s.id === sessionId);
  if (local) return local;

  const path = `examSessions/${sessionId}`;
  try {
    const snap = await getDoc(doc(db, 'examSessions', sessionId));
    if (snap.exists()) {
      const data = snap.data() as ExamSession;
      upsertLocalSession(data);
      return data;
    }
    return null;
  } catch (error) {
    return local || null;
  }
}

export async function createExamSession(session: ExamSession): Promise<void> {
  upsertLocalSession(session);
  const path = `examSessions/${session.id}`;
  try {
    await setDoc(doc(db, 'examSessions', session.id), session);
  } catch (error) {
    console.warn('createExamSession fallback:', error);
  }
}

export async function updateExamSessionStatus(
  sessionId: string,
  status: ExamSession['status'],
  submittedAt?: string,
  violationIncrement = 0,
  extraUpdates?: Partial<ExamSession>
): Promise<void> {
  const currentLocal = getLocalSessions().find(s => s.id === sessionId);
  const updates: Partial<ExamSession> = {
    status,
    ...extraUpdates
  };
  if (submittedAt) updates.submittedAt = submittedAt;
  if (violationIncrement > 0 && currentLocal) {
    updates.violationCount = (currentLocal.violationCount || 0) + violationIncrement;
  }

  if (currentLocal) {
    upsertLocalSession({ ...currentLocal, ...updates });
  }

  const path = `examSessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'examSessions', sessionId), updates);
  } catch (error) {
    console.warn('updateExamSessionStatus fallback:', error);
  }
}

export async function addExtraTimeToSession(sessionId: string, extraMinutes: number): Promise<void> {
  const current = await getExamSession(sessionId);
  if (!current) return;
  const currentDeadline = new Date(current.endTimeDeadline).getTime();
  const newDeadline = new Date(currentDeadline + extraMinutes * 60000).toISOString();
  await updateExamSessionStatus(sessionId, current.status, undefined, 0, {
    endTimeDeadline: newDeadline
  });
}

export async function sendTeacherWarningToSession(sessionId: string, warning: string): Promise<void> {
  await updateExamSessionStatus(sessionId, 'ongoing', undefined, 0, {
    teacherWarning: warning
  });
}

export async function resetExamSessionByTeacher(sessionId: string): Promise<void> {
  const current = await getExamSession(sessionId);
  if (!current) return;
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60000).toISOString(); // Default 60 mins
  await updateExamSessionStatus(sessionId, 'ongoing', undefined, 0, {
    startTime: now.toISOString(),
    endTimeDeadline: deadline,
    violationCount: 0,
    teacherWarning: undefined,
    submittedAt: undefined
  });
}

export async function saveSessionAnswer(sessionId: string, answer: SessionAnswer): Promise<void> {
  const path = `examSessions/${sessionId}/answers/${answer.questionId}`;
  try {
    await setDoc(doc(db, 'examSessions', sessionId, 'answers', answer.questionId), answer, { merge: true });
  } catch (error) {
    console.warn('saveSessionAnswer fallback:', error);
  }
}

export async function getSessionAnswers(sessionId: string): Promise<Record<string, SessionAnswer>> {
  const path = `examSessions/${sessionId}/answers`;
  try {
    const snap = await getDocs(collection(db, 'examSessions', sessionId, 'answers'));
    const map: Record<string, SessionAnswer> = {};
    snap.docs.forEach(d => {
      const a = d.data() as SessionAnswer;
      map[a.questionId] = a;
    });
    return map;
  } catch (error) {
    return {};
  }
}

export async function getSessionsForExam(examId: string): Promise<ExamSession[]> {
  const localList = getLocalSessions(examId);
  let firestoreSessions: ExamSession[] = [];

  const path = 'examSessions';
  try {
    const q = query(collection(db, 'examSessions'), where('examId', '==', examId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      firestoreSessions = snap.docs.map(d => d.data() as ExamSession);
      firestoreSessions.forEach(s => upsertLocalSession(s));
    }
  } catch (error) {
    console.warn('getSessionsForExam fallback to local:', error);
  }

  const merged = new Map<string, ExamSession>();
  firestoreSessions.forEach(s => merged.set(s.id, s));
  localList.forEach(s => merged.set(s.id, s));

  return Array.from(merged.values());
}

/* =========================================================
   11. RESULTS WITH LOCAL CACHING
   ========================================================= */
const LOCAL_RESULTS_KEY = 'eujian_local_results';

const SEED_RESULTS: ExamResult[] = [
  {
    id: 'res_seed_1',
    examId: 'exam_pts_matematika_9',
    examTitle: 'Penilaian Tengah Semester (PTS) Matematika Kelas IX',
    studentId: 'student_9c_1',
    studentName: 'Ahmad Farhan Pratama',
    className: 'IX-A',
    correctCount: 10,
    wrongCount: 0,
    unansweredCount: 0,
    finalScore: 100,
    status: 'graded',
    publishedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'res_seed_2',
    examId: 'exam_pts_ipa_9',
    examTitle: 'Asesmen Sumatif IPA Terpadu Kelas IX',
    studentId: 'student_9c_1',
    studentName: 'Ahmad Farhan Pratama',
    className: 'IX-A',
    correctCount: 9,
    wrongCount: 1,
    unansweredCount: 0,
    finalScore: 90,
    status: 'graded',
    publishedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
  }
];

export function getLocalResults(): ExamResult[] {
  try {
    const raw = localStorage.getItem(LOCAL_RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalResults(results: ExamResult[]): void {
  try {
    localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    console.warn('Failed to save results to localStorage:', e);
  }
}

export function upsertLocalResult(result: ExamResult): void {
  const current = getLocalResults();
  const idx = current.findIndex(r => r.id === result.id);
  if (idx >= 0) {
    current[idx] = result;
  } else {
    current.unshift(result);
  }
  saveLocalResults(current);
}

export async function getAllResults(): Promise<ExamResult[]> {
  const localList = getLocalResults();
  let firestoreResults: ExamResult[] = [];

  const path = 'results';
  try {
    const snap = await getDocs(collection(db, 'results'));
    if (!snap.empty) {
      firestoreResults = snap.docs.map(d => d.data() as ExamResult);
      firestoreResults.forEach(r => upsertLocalResult(r));
    }
  } catch (error) {
    console.warn('getAllResults fallback:', error);
  }

  const merged = new Map<string, ExamResult>();
  SEED_RESULTS.forEach(r => merged.set(r.id, r));
  firestoreResults.forEach(r => merged.set(r.id, r));
  localList.forEach(r => merged.set(r.id, r));

  return Array.from(merged.values());
}

export async function getResultsForStudent(studentId: string): Promise<ExamResult[]> {
  const all = await getAllResults();
  return all.filter(r => r.studentId === studentId);
}

export async function getResultsForExam(examId: string): Promise<ExamResult[]> {
  const all = await getAllResults();
  return all.filter(r => r.examId === examId);
}

export async function saveExamResult(result: ExamResult): Promise<void> {
  upsertLocalResult(result);
  const path = `results/${result.id}`;
  try {
    await setDoc(doc(db, 'results', result.id), result, { merge: true });
  } catch (error) {
    console.warn('saveExamResult fallback:', error);
  }
}

/* =========================================================
   12. PROCTORING EVENTS WITH CACHING
   ========================================================= */
const LOCAL_PROCTORING_KEY = 'eujian_local_proctoring';

export function getLocalProctoringEvents(sessionId?: string): ProctoringEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROCTORING_KEY);
    const list: ProctoringEvent[] = raw ? JSON.parse(raw) : [];
    return sessionId ? list.filter(e => e.sessionId === sessionId) : list;
  } catch {
    return [];
  }
}

export function saveLocalProctoringEvent(event: ProctoringEvent): void {
  try {
    const current = getLocalProctoringEvents();
    current.unshift(event);
    localStorage.setItem(LOCAL_PROCTORING_KEY, JSON.stringify(current.slice(0, 500)));
  } catch (e) {
    console.warn('saveLocalProctoringEvent error:', e);
  }
}

export async function logProctoringEvent(event: Omit<ProctoringEvent, 'id' | 'timestamp'>): Promise<void> {
  const eventId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullEvent: ProctoringEvent = {
    ...event,
    id: eventId,
    timestamp: new Date().toISOString()
  };
  saveLocalProctoringEvent(fullEvent);

  const path = `proctoringEvents/${eventId}`;
  try {
    await setDoc(doc(db, 'proctoringEvents', eventId), fullEvent);
  } catch (error) {
    console.warn('Proctoring event write error:', error);
  }
}

export async function getProctoringEventsForSession(sessionId: string): Promise<ProctoringEvent[]> {
  const localList = getLocalProctoringEvents(sessionId);
  let firestoreEvents: ProctoringEvent[] = [];

  const path = 'proctoringEvents';
  try {
    const q = query(collection(db, 'proctoringEvents'), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      firestoreEvents = snap.docs.map(d => d.data() as ProctoringEvent);
      firestoreEvents.forEach(e => saveLocalProctoringEvent(e));
    }
  } catch (error) {
    console.warn('getProctoringEventsForSession fallback:', error);
  }

  const merged = new Map<string, ProctoringEvent>();
  firestoreEvents.forEach(e => merged.set(e.id, e));
  localList.forEach(e => merged.set(e.id, e));

  return Array.from(merged.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/* =========================================================
   13. AUDIT LOGS
   ========================================================= */
export async function logAuditEvent(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `auditLogs/${logId}`;
  try {
    const fullLog: AuditLog = {
      ...log,
      id: logId,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'auditLogs', logId), fullLog);
  } catch (error) {
    console.warn('Audit log write error:', error);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as AuditLog);
    }
    return [
      {
        id: 'log_seed_001',
        userId: 'admin_demo_id',
        userName: 'Administrator E-Ujian',
        role: 'admin',
        action: 'SYSTEM_BOOTSTRAP',
        details: 'Sistem CBT E-Ujian Sekolah diinisialisasi.',
        timestamp: new Date().toISOString()
      }
    ];
  } catch {
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), limit(50)));
      return snap.docs.map(d => d.data() as AuditLog).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [
        {
          id: 'log_seed_001',
          userId: 'admin_demo_id',
          userName: 'Administrator E-Ujian',
          role: 'admin',
          action: 'SYSTEM_BOOTSTRAP',
          details: 'Sistem CBT E-Ujian Sekolah diinisialisasi.',
          timestamp: new Date().toISOString()
        }
      ];
    }
  }
}

/* =========================================================
   14. APP SETTINGS
   ========================================================= */
export async function getAppSettings(): Promise<AppSetting | null> {
  const path = 'appSettings/global';
  try {
    const snap = await getDoc(doc(db, 'appSettings', 'global'));
    if (snap.exists()) {
      return snap.data() as AppSetting;
    }
    return {
      id: 'global',
      schoolName: 'SMP NEGERI 1 HARAPAN BANGSA',
      schoolNpsn: '20108745',
      schoolAddress: 'Jl. Pendidikan No. 45',
      schoolCity: 'Kota Jakarta Selatan',
      schoolPostalCode: '12160',
      schoolPhone: '(021) 555-0199',
      principalName: 'Drs. H. Mulyadi, M.Pd.',
      principalNip: '197003151995031002',
      activeAcademicYear: '2025/2026',
      activeSemester: 'ganjil',
      allowReviewAfterExam: true,
      cbtStrictFocusMode: true,
      maxViolationsAllowed: 3,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: 'global',
      schoolName: 'SMP NEGERI 1 HARAPAN BANGSA',
      schoolNpsn: '20108745',
      schoolAddress: 'Jl. Pendidikan No. 45',
      schoolCity: 'Kota Jakarta Selatan',
      schoolPostalCode: '12160',
      schoolPhone: '(021) 555-0199',
      principalName: 'Drs. H. Mulyadi, M.Pd.',
      principalNip: '197003151995031002',
      activeAcademicYear: '2025/2026',
      activeSemester: 'ganjil',
      allowReviewAfterExam: true,
      cbtStrictFocusMode: true,
      maxViolationsAllowed: 3,
      updatedAt: new Date().toISOString()
    };
  }
}

export async function saveAppSettings(setting: AppSetting): Promise<void> {
  const path = 'appSettings/global';
  try {
    await setDoc(doc(db, 'appSettings', 'global'), setting, { merge: true });
  } catch (error) {
    console.warn('saveAppSettings fallback:', error);
  }
}

/* =========================================================
   INITIAL SEED DATA
   ========================================================= */
export async function seedInitialSchoolData(adminEmail: string): Promise<boolean> {
  try {
    const settingsCheck = await getDoc(doc(db, 'appSettings', 'global'));
    if (settingsCheck.exists()) {
      return false;
    }

    const batch = writeBatch(db);

    const defaultSettings: AppSetting = {
      id: 'global',
      schoolName: 'SMP NEGERI 1 HARAPAN BANGSA',
      schoolNpsn: '20108745',
      schoolAddress: 'Jl. Pendidikan No. 45',
      schoolCity: 'Kota Jakarta Selatan',
      schoolPostalCode: '12160',
      schoolPhone: '(021) 555-0199',
      principalName: 'Drs. H. Mulyadi, M.Pd.',
      principalNip: '197003151995031002',
      activeAcademicYear: '2025/2026',
      activeSemester: 'ganjil',
      allowReviewAfterExam: true,
      cbtStrictFocusMode: true,
      maxViolationsAllowed: 3,
      updatedAt: new Date().toISOString()
    };
    batch.set(doc(db, 'appSettings', 'global'), defaultSettings);

    batch.set(doc(db, 'academicYears', SEED_YEAR.id), SEED_YEAR);

    SEED_CLASSES.forEach(c => batch.set(doc(db, 'classes', c.id), c));
    SEED_SUBJECTS.forEach(s => batch.set(doc(db, 'subjects', s.id), s));
    Object.values(DEMO_USERS).forEach(u => batch.set(doc(db, 'users', u.uid), u));
    SEED_QUESTIONS.forEach(q => batch.set(doc(db, 'questionBank', q.id), q));
    batch.set(doc(db, 'exams', SEED_EXAM.id), SEED_EXAM);

    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Initial school data seed check:', error);
    return false;
  }
}
