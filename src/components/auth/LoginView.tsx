import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  LogIn,
  AlertCircle,
  Mail,
  Lock,
  UserPlus,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import type { UserRole } from '../../types/database';

export const LoginView: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    signInWithGoogle,
    switchDemoRole,
    authErrorMessage,
    clearAuthError
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Kelas IX-C');
  const [nisn, setNisn] = useState('');

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    clearAuthError();

    try {
      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          setLocalError('Email dan kata sandi wajib diisi.');
          return;
        }
        await loginWithEmail(email, password);
      } else {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setLocalError('Nama lengkap, email, dan kata sandi wajib diisi.');
          return;
        }
        await registerWithEmail(name, email, password, className, nisn);
      }
    } catch (err: any) {
      console.warn('Authentication attempted:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setSubmitting(true);
    setResetStatus(null);
    try {
      await resetPassword(resetEmail);
      setResetStatus(`Instruksi pemulihan kata sandi telah dikirim ke ${resetEmail}. Silakan periksa kotak masuk atau spam.`);
    } catch (err: any) {
      setResetStatus(err.message || 'Gagal mengirim email pemulihan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Preset demo account filler for easy testing
  const handlePrefillDemo = (role: UserRole) => {
    if (role === 'admin') {
      setEmail('srakananta@gmail.com');
      setPassword('Admin123!*');
    } else if (role === 'teacher') {
      setEmail('guru.matematika@smpn1.sch.id');
      setPassword('Guru123!*');
    } else {
      setEmail('farhan.9c@siswa.smpn1.sch.id');
      setPassword('Siswa123!*');
    }
  };

  const activeError = localError || authErrorMessage;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Lighting Effects */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 mb-3 font-black text-2xl border border-blue-400/40">
            CBT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            E-UJIAN SEKOLAH
          </h1>
          <p className="mt-1 text-xs text-blue-200 font-medium">
            Sistem CBT Ujian Online SMP Negeri 1 Harapan Bangsa
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-100">
          {/* Mode Switch Tabs (Masuk vs Daftar) */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => {
                setMode('login');
                clearAuthError();
                setLocalError(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 text-center ${
                mode === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Masuk Akun (Email & Password)
            </button>
            <button
              onClick={() => {
                setMode('register');
                clearAuthError();
                setLocalError(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 text-center ${
                mode === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Daftar Siswa Baru
            </button>
          </div>

          {/* Error Banner with Firebase Console Guide if Operation Not Allowed */}
          {activeError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-semibold">{activeError}</span>
              </div>
              {activeError.includes('Firebase Console') && (
                <div className="p-3 bg-white rounded-lg border border-rose-200 text-[11px] text-slate-700 space-y-1">
                  <p className="font-bold text-rose-900">Petunjuk Aktivasi Email/Password di Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                    <li>Buka <strong>console.firebase.google.com</strong></li>
                    <li>Pilih proyek: <code>nth-transit-wpt51</code></li>
                    <li>Buka menu <strong>Build &gt; Authentication &gt; Sign-in method</strong></li>
                    <li>Klik penyedia <strong>Email/Password</strong>, aktifkan, lalu klik <strong>Save</strong></li>
                  </ol>
                  <p className="text-slate-500 pt-1">
                    *Sebagai alternatif tanpa setup manual, Anda juga dapat menggunakan <strong>Akses Demo Langsung</strong> di bawah.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Muhammad Farhan"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rombel Kelas</label>
                    <input
                      type="text"
                      value={className}
                      onChange={e => setClassName(e.target.value)}
                      placeholder="Kelas IX-C"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">NISN (10 Digit)</label>
                    <input
                      type="text"
                      value={nisn}
                      onChange={e => setNisn(e.target.value)}
                      placeholder="0087654321"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-[11px] text-blue-800">
                  ℹ️ Akun baru otomatis didaftarkan sebagai <strong>Siswa CBT</strong> demi keamanan sistem sekolah.
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {mode === 'login' ? 'Email atau NISN Siswa' : 'Alamat Email Siswa'}
              </label>
              <div className="relative">
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'Email atau NISN (contoh: 0087654321 / email)' : 'nama@sekolah.sch.id'}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Lupa Sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Memproses...'
                  : mode === 'login'
                  ? 'Masuk ke Sistem CBT'
                  : 'Daftar Akun Siswa'}
              </span>
            </button>
          </form>

          {/* Secondary Google Auth Provider */}
          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Masuk dengan Google Auth</span>
            </button>
          </div>

          {/* Quick Demo Role Access */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                Akses Uji Coba Cepat (Tersinkron Firestore)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => switchDemoRole('admin')}
              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-center transition-colors cursor-pointer group"
            >
              <ShieldCheck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <span className="text-[11px] font-bold text-blue-950 block">Admin</span>
              <span className="text-[9px] text-blue-700 block">Sistem Master</span>
            </button>

            <button
              type="button"
              onClick={() => switchDemoRole('teacher')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-center transition-colors cursor-pointer group"
            >
              <BookOpen className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <span className="text-[11px] font-bold text-emerald-950 block">Guru</span>
              <span className="text-[9px] text-emerald-700 block">Bank Soal CBT</span>
            </button>

            <button
              type="button"
              onClick={() => switchDemoRole('student')}
              className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-center transition-colors cursor-pointer group"
            >
              <GraduationCap className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
              <span className="text-[11px] font-bold text-indigo-950 block">Siswa</span>
              <span className="text-[9px] text-indigo-700 block">Ruang Ujian</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-5 text-center text-slate-400 text-[11px]">
          <p>E-Ujian Sekolah CBT • Platform Ujian SMP/MTs Terpadu</p>
          <p className="text-slate-500 text-[10px] mt-0.5">
            Cloud Firestore Provisi AI Studio (ai-studio-eujiansekolah-9cc4d184-3f72-4f0d-bb30-7bcc4c5abfad)
          </p>
        </div>
      </div>

      {/* Password Recovery Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetStatus(null);
        }}
        title="Pemulihan Kata Sandi"
        maxWidth="sm"
      >
        <form onSubmit={handlePasswordReset} className="space-y-4 py-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            Masukkan alamat email yang terdaftar pada sistem E-UJIAN SEKOLAH. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda via Firebase Auth.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Pengguna</label>
            <input
              type="email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              placeholder="nama@sekolah.sch.id"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              required
            />
          </div>

          {resetStatus && (
            <div className={`p-3 rounded-xl text-xs ${resetStatus.includes('telah dikirim') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {resetStatus}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
