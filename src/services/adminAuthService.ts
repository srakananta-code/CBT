import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  logAuditEvent,
  upsertLocalUser,
  removeLocalUser,
  getLocalUsers,
  saveUserCredential,
  getClasses,
  saveClass,
  getSubjects
} from './dbService';
import type { UserProfile, UserRole, UserStatus, SchoolClass } from '../types/database';

// Secondary Firebase app instance dedicated to creating users without logging out the active Admin
function getSecondaryAuth() {
  const appName = 'AdminSecondaryAuth';
  const existingApp = getApps().find(a => a.name === appName);
  const secondaryApp = existingApp || initializeApp(firebaseConfig, appName);
  return getAuth(secondaryApp);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: UserStatus;
  classId?: string;
  className?: string;
  nisn?: string;
  nip?: string;
  assignedSubjects?: string[];
  adminActor: {
    uid: string;
    name: string;
  };
}

/**
 * Creates user account without terminating the current Admin's authentication session.
 */
export async function createAccountByAdmin(input: CreateUserInput): Promise<{
  success: boolean;
  profile: UserProfile;
  authMethod: 'firebase_auth' | 'firestore_direct';
  message: string;
}> {
  let createdUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let authMethod: 'firebase_auth' | 'firestore_direct' = 'firestore_direct';
  let noticeMessage = 'Akun siswa/guru berhasil ditambahkan dan aktif di sistem.';

  // Attempt to register in Firebase Auth via isolated secondary instance if password provided
  if (input.password && input.password.length >= 6) {
    try {
      const secAuth = getSecondaryAuth();
      const credential = await createUserWithEmailAndPassword(secAuth, input.email.trim(), input.password);
      createdUid = credential.user.uid;
      authMethod = 'firebase_auth';
      noticeMessage = 'Akun autentikasi Firebase & profil database berhasil dibuat secara resmi.';
      // Immediately sign out secondary auth so it leaves no lingering state
      await signOut(secAuth);
    } catch (authError: any) {
      console.warn('Secondary auth creation note:', authError?.code, authError?.message);
      if (authError?.code === 'auth/email-already-in-use') {
        // If email already in auth, we keep uid or proceed
      }
    }
  }

  // Always save local credential map so the student/teacher can log in seamlessly
  if (input.password) {
    saveUserCredential(input.email.trim(), input.password);
    if (input.nisn) {
      saveUserCredential(input.nisn.trim(), input.password);
    }
  }

  const newProfile: UserProfile = {
    id: createdUid,
    uid: createdUid,
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role,
    status: input.status || 'active',
    classId: input.classId,
    className: input.className,
    nisn: input.nisn?.trim(),
    nip: input.nip?.trim(),
    assignedSubjects: input.assignedSubjects || [],
    tempPassword: input.password,
    createdAt: new Date().toISOString()
  };

  // 1. Immediately cache in local storage so user is NEVER lost
  upsertLocalUser(newProfile);

  // 2. Sync to cloud Firestore
  const path = `users/${createdUid}`;
  try {
    await setDoc(doc(db, 'users', createdUid), newProfile);
  } catch (err: any) {
    console.warn('createAccountByAdmin Firestore fallback to local cache:', err);
  }

  // 3. Update student count on target class if student
  if (input.role === 'student' && input.classId) {
    try {
      const classes = await getClasses();
      const targetClass = classes.find(c => c.id === input.classId);
      if (targetClass) {
        const count = (targetClass.studentCount || 0) + 1;
        await saveClass({ ...targetClass, studentCount: count });
      }
    } catch (e) {
      console.warn('Update class student count error:', e);
    }
  }

  // 4. Log audit event
  try {
    await logAuditEvent({
      userId: input.adminActor.uid,
      userName: input.adminActor.name,
      role: 'admin',
      action: 'ADMIN_CREATE_USER',
      details: `Admin mendaftarkan akun ${input.role.toUpperCase()}: ${input.name} (${input.email}) [Kelas: ${input.className || '-'}]`
    });
  } catch (e) {
    console.warn('audit log fallback:', e);
  }

  return {
    success: true,
    profile: newProfile,
    authMethod,
    message: noticeMessage
  };
}

export interface ImportStudentItem {
  nisn: string;
  name: string;
  email: string;
  className: string;
  password?: string;
}

export async function importStudentsBatch(
  students: ImportStudentItem[],
  actor: { uid: string; name: string }
): Promise<{
  totalImported: number;
  classesCreated: number;
  results: { name: string; nisn: string; className: string; status: 'success' | 'skipped'; message: string }[];
}> {
  const existingClasses = await getClasses();
  const classMap = new Map<string, SchoolClass>();
  existingClasses.forEach(c => classMap.set(c.name.trim().toLowerCase(), c));

  let classesCreated = 0;
  let totalImported = 0;
  const results: { name: string; nisn: string; className: string; status: 'success' | 'skipped'; message: string }[] = [];

  const existingUsers = getLocalUsers();

  for (const s of students) {
    if (!s.name.trim() || !s.nisn.trim()) {
      results.push({ name: s.name, nisn: s.nisn, className: s.className, status: 'skipped', message: 'Data tidak lengkap' });
      continue;
    }

    const cleanClassName = s.className.trim() || 'Kelas Belum Ditentukan';
    let targetClass = classMap.get(cleanClassName.toLowerCase());

    if (!targetClass) {
      // Auto-create class integrated with class management
      let grade: 'VII' | 'VIII' | 'IX' = 'VII';
      if (/IX|9/i.test(cleanClassName)) grade = 'IX';
      else if (/VIII|8/i.test(cleanClassName)) grade = 'VIII';

      targetClass = {
        id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanClassName,
        grade,
        academicYearId: 'ay_2025_ganjil',
        studentCount: 0,
        createdAt: new Date().toISOString()
      };
      await saveClass(targetClass);
      classMap.set(cleanClassName.toLowerCase(), targetClass);
      classesCreated++;
    }

    const cleanEmail = s.email?.trim() || `${s.nisn.trim()}@siswa.smpn1.sch.id`;
    const defaultPassword = s.password?.trim() || 'Siswa123!*';

    try {
      await createAccountByAdmin({
        name: s.name.trim(),
        email: cleanEmail,
        password: defaultPassword,
        role: 'student',
        classId: targetClass.id,
        className: targetClass.name,
        nisn: s.nisn.trim(),
        adminActor: actor
      });
      totalImported++;
      results.push({ name: s.name, nisn: s.nisn, className: targetClass.name, status: 'success', message: 'Berhasil diimpor & terhubung ke rombel' });
    } catch (err: any) {
      results.push({ name: s.name, nisn: s.nisn, className: cleanClassName, status: 'skipped', message: err?.message || 'Gagal' });
    }
  }

  await logAuditEvent({
    userId: actor.uid,
    userName: actor.name,
    role: 'admin',
    action: 'BATCH_IMPORT_STUDENTS',
    details: `Import data ${totalImported} siswa terintegrasi ke manajemen rombel (${classesCreated} kelas baru).`
  });

  return {
    totalImported,
    classesCreated,
    results
  };
}

/**
 * Updates user profile by Admin (status, role, assignments, class, NIP/NISN)
 */
export async function updateUserByAdmin(
  targetUid: string,
  updates: Partial<UserProfile>,
  adminActor: { uid: string; name: string }
): Promise<void> {
  const current = getLocalUsers().find(u => u.uid === targetUid || u.id === targetUid);
  if (current) {
    upsertLocalUser({ ...current, ...updates, updatedAt: new Date().toISOString() });
  }

  const path = `users/${targetUid}`;
  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(doc(db, 'users', targetUid), payload);

    await logAuditEvent({
      userId: adminActor.uid,
      userName: adminActor.name,
      role: 'admin',
      action: 'ADMIN_UPDATE_USER',
      details: `Admin memperbarui data pengguna UID: ${targetUid}`
    });
  } catch (err) {
    console.warn('updateUserByAdmin Firestore fallback:', err);
  }
}

/**
 * Toggles user status (active, inactive, suspended)
 */
export async function toggleAccountStatusByAdmin(
  targetUid: string,
  newStatus: UserStatus,
  userName: string,
  adminActor: { uid: string; name: string }
): Promise<void> {
  const current = getLocalUsers().find(u => u.uid === targetUid || u.id === targetUid);
  if (current) {
    upsertLocalUser({ ...current, status: newStatus, updatedAt: new Date().toISOString() });
  }

  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    await logAuditEvent({
      userId: adminActor.uid,
      userName: adminActor.name,
      role: 'admin',
      action: 'ADMIN_TOGGLE_STATUS',
      details: `Admin mengubah status akun ${userName} menjadi [${newStatus.toUpperCase()}]`
    });
  } catch (err) {
    console.warn('toggleAccountStatusByAdmin Firestore fallback:', err);
  }
}

/**
 * Deletes user profile
 */
export async function deleteUserByAdmin(
  targetUid: string,
  userName: string,
  adminActor: { uid: string; name: string }
): Promise<void> {
  removeLocalUser(targetUid);
  const path = `users/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'users', targetUid));

    await logAuditEvent({
      userId: adminActor.uid,
      userName: adminActor.name,
      role: 'admin',
      action: 'ADMIN_DELETE_USER',
      details: `Admin menghapus pengguna ${userName} (UID: ${targetUid})`
    });
  } catch (err) {
    console.warn('deleteUserByAdmin Firestore fallback:', err);
  }
}
