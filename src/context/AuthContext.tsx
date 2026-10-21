import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  getUserProfile,
  setUserProfile,
  seedInitialSchoolData,
  logAuditEvent,
  DEMO_USERS,
  getAllUsers,
  getUserCredential
} from '../services/dbService';
import type { UserProfile, UserRole } from '../types/database';

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, className?: string, nisn?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentProfile: (data: Partial<UserProfile>) => Promise<void>;
  authErrorMessage: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Initialize DB and Seed once
  useEffect(() => {
    seedInitialSchoolData('srakananta@gmail.com').catch(err =>
      console.warn('Seed status:', err)
    );
  }, []);

  // Listen to Auth State and inspect account status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // First admin protection: only bootstrapped email becomes admin, others student!
            const isAdmin = user.email === 'srakananta@gmail.com';
            profile = {
              id: user.uid,
              uid: user.uid,
              name: user.displayName || (isAdmin ? 'Admin Sekolah' : 'Pengguna CBT'),
              email: user.email || '',
              role: isAdmin ? 'admin' : 'student',
              status: 'active',
              createdAt: new Date().toISOString()
            };
            await setUserProfile(profile);
          }

          // Check account status
          if (profile.status === 'suspended' || profile.status === 'inactive') {
            await fbSignOut(auth);
            setUserProfileState(null);
            setAuthErrorMessage('Akun Anda telah dinonaktifkan atau ditangguhkan oleh Administrator Sekolah.');
            setLoading(false);
            return;
          }

          setUserProfileState(profile);
        } catch (error) {
          console.error('Failed to sync user profile:', error);
        }
      } else {
        // Fallback demo role or stored local session from storage
        const storedUid = localStorage.getItem('eujian_authenticated_uid');
        const storedRole = localStorage.getItem('eujian_active_role') as UserRole;
        if (storedUid) {
          getUserProfile(storedUid).then(p => {
            if (p) setUserProfileState(p);
          }).catch(console.error);
        } else if (storedRole) {
          const demoUid = storedRole === 'admin'
            ? 'admin_demo_id'
            : storedRole === 'teacher'
            ? 'teacher_mtk_1'
            : 'student_9c_01';
          getUserProfile(demoUid).then(p => {
            if (p) setUserProfileState(p);
          }).catch(console.error);
        } else {
          setUserProfileState(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (identifier: string, pass: string) => {
    setLoading(true);
    setAuthErrorMessage(null);

    const cleanInput = identifier.trim();
    const cleanPass = pass.trim();

    try {
      // 1. Resolve email if identifier is NISN
      const allUsers = await getAllUsers();
      let matchedUser = allUsers.find(
        u => (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) ||
             (u.nisn && u.nisn.trim() === cleanInput)
      );

      const targetEmail = matchedUser?.email || cleanInput;

      // 2. Try Firebase Auth first
      let authSucceeded = false;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, targetEmail, cleanPass);
        const user = userCredential.user;
        const profile = await getUserProfile(user.uid);

        if (profile && (profile.status === 'suspended' || profile.status === 'inactive')) {
          await fbSignOut(auth);
          setUserProfileState(null);
          throw new Error('Akun Anda berstatus nonaktif atau ditangguhkan.');
        }

        setUserProfileState(profile);
        localStorage.removeItem('eujian_active_role');
        if (profile?.uid) {
          localStorage.setItem('eujian_authenticated_uid', profile.uid);
        }
        authSucceeded = true;

        await logAuditEvent({
          userId: user.uid,
          userName: profile?.name || targetEmail,
          role: profile?.role || 'student',
          action: 'USER_LOGIN',
          details: `Login berhasil menggunakan kredensial ${cleanInput}`
        });
      } catch (fbErr: any) {
        console.warn('Firebase Auth attempt note:', fbErr?.code, fbErr?.message);
        if (fbErr.message === 'Akun Anda berstatus nonaktif atau ditangguhkan.') {
          throw fbErr;
        }
      }

      // 3. Fallback verification for newly added / imported students or demo accounts
      if (!authSucceeded) {
        if (!matchedUser) {
          matchedUser = allUsers.find(
            u => (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) ||
                 (u.nisn && u.nisn.trim() === cleanInput)
          );
        }

        if (matchedUser) {
          if (matchedUser.status === 'suspended' || matchedUser.status === 'inactive') {
            throw new Error('Akun Anda berstatus nonaktif atau ditangguhkan.');
          }

          const storedCred = getUserCredential(matchedUser.email) ||
                             (matchedUser.nisn ? getUserCredential(matchedUser.nisn) : null) ||
                             matchedUser.tempPassword;

          // Default role passwords
          const isDemoMatch =
            cleanPass === 'Siswa123!*' ||
            cleanPass === 'Guru123!*' ||
            cleanPass === 'Admin123!*' ||
            (storedCred && storedCred === cleanPass);

          if (isDemoMatch) {
            setUserProfileState(matchedUser);
            localStorage.setItem('eujian_authenticated_uid', matchedUser.uid);
            localStorage.removeItem('eujian_active_role');

            await logAuditEvent({
              userId: matchedUser.uid,
              userName: matchedUser.name,
              role: matchedUser.role,
              action: 'USER_LOGIN_FALLBACK',
              details: `Login terverifikasi untuk akun ${matchedUser.name} (${cleanInput})`
            });
            return;
          }
        }

        throw new Error('Email/NISN atau kata sandi tidak cocok.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthErrorMessage(err.message || 'Gagal masuk. Silakan periksa kembali kredensial Anda.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    className?: string,
    nisn?: string
  ) => {
    setLoading(true);
    setAuthErrorMessage(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const user = userCredential.user;

      // New users ALWAYS register as 'student'; elevation requires admin action!
      const isBootstrappedAdmin = email.trim().toLowerCase() === 'srakananta@gmail.com';
      const newProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        role: isBootstrappedAdmin ? 'admin' : 'student',
        status: 'active',
        className: className?.trim(),
        nisn: nisn?.trim(),
        createdAt: new Date().toISOString()
      };

      await setUserProfile(newProfile);
      setUserProfileState(newProfile);
      localStorage.removeItem('eujian_active_role');

      await logAuditEvent({
        userId: user.uid,
        userName: name,
        role: newProfile.role,
        action: 'USER_REGISTER',
        details: `Pendaftaran akun baru sebagai ${newProfile.role}`
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthErrorMessage('Email ini sudah terdaftar. Silakan gunakan menu Masuk.');
      } else if (err.code === 'auth/weak-password') {
        setAuthErrorMessage('Kata sandi terlalu lemah (minimal 6 karakter).');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthErrorMessage(
          'Metode login Email/Password belum diaktifkan di Firebase Console. Buka Firebase Console > Authentication > Sign-in method > Aktifkan "Email/Password".'
        );
      } else {
        setAuthErrorMessage(err.message || 'Pendaftaran akun gagal.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setAuthErrorMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        throw new Error('Alamat email tidak terdaftar dalam sistem.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Format email tidak valid.');
      } else {
        throw new Error(err.message || 'Gagal mengirim email pemulihan kata sandi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthErrorMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        const isAdmin = user.email === 'srakananta@gmail.com';
        profile = {
          id: user.uid,
          uid: user.uid,
          name: user.displayName || 'Pengguna E-Ujian',
          email: user.email || '',
          role: isAdmin ? 'admin' : 'student',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setUserProfile(profile);
      }

      if (profile.status === 'suspended' || profile.status === 'inactive') {
        await fbSignOut(auth);
        setUserProfileState(null);
        throw new Error('Akun Anda dinonaktifkan.');
      }

      setUserProfileState(profile);
      localStorage.removeItem('eujian_active_role');
    } catch (error: any) {
      console.error('Google Sign In failed:', error);
      setAuthErrorMessage(error.message || 'Gagal masuk dengan Google.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    setLoading(true);
    const demoUid = targetRole === 'admin'
      ? 'admin_demo_id'
      : targetRole === 'teacher'
      ? 'teacher_mtk_1'
      : 'student_9c_01';

    try {
      let profile: UserProfile | null = null;
      try {
        profile = await getUserProfile(demoUid);
      } catch {
        profile = DEMO_USERS[demoUid] || null;
      }

      if (!profile) {
        profile = DEMO_USERS[demoUid] || null;
      }

      setUserProfileState(profile);
      localStorage.setItem('eujian_active_role', targetRole);
    } catch (err) {
      console.warn('Demo switch safe fallback:', err);
      setUserProfileState(DEMO_USERS[demoUid] || null);
      localStorage.setItem('eujian_active_role', targetRole);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('eujian_active_role');
    localStorage.removeItem('eujian_authenticated_uid');
    setUserProfileState(null);
    await fbSignOut(auth);
  };

  const updateCurrentProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      ...data,
      updatedAt: new Date().toISOString()
    };
    await setUserProfile(updated);
    setUserProfileState(updated);
  };

  const clearAuthError = () => setAuthErrorMessage(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        role: userProfile?.role || null,
        loading,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        signInWithGoogle,
        switchDemoRole,
        signOut,
        updateCurrentProfile,
        authErrorMessage,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
