import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  PlayCircle,
  Award,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  BookOpen,
  Trophy,
  Zap,
  Target,
  Shield,
  Sparkles
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { getExams, getResultsForStudent } from '../../services/dbService';
import type { Exam, ExamResult, UserProfile } from '../../types/database';

interface StudentDashboardProps {
  user: UserProfile;
  activeTab: string;
  onStartExam: (examId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  activeTab,
  onStartExam
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamForToken, setSelectedExamForToken] = useState<Exam | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [examList, resultList] = await Promise.all([
          getExams(user.classId || 'all'),
          getResultsForStudent(user.uid)
        ]);
        setExams(examList);
        setResults(resultList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleOpenExamModal = (exam: Exam) => {
    setSelectedExamForToken(exam);
    setTokenInput(exam.token || '');
    setTokenError(null);
  };

  const handleVerifyAndStart = () => {
    if (!selectedExamForToken) return;

    if (selectedExamForToken.token && tokenInput.trim().toUpperCase() !== selectedExamForToken.token.toUpperCase()) {
      setTokenError('Token ujian tidak valid. Silakan tanyakan kepada pengawas ruang.');
      return;
    }

    const examId = selectedExamForToken.id;
    setSelectedExamForToken(null);
    onStartExam(examId);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memuat data ujian siswa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="bg-linear-to-r from-[#0a192f] to-[#1e3a8a] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wide">
                Peserta CBT Ujian Sekolah
              </span>
              <span className="text-xs text-blue-200">•</span>
              <span className="text-xs text-blue-200 font-medium">SMPN 1 Harapan Bangsa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-blue-100">
              <span>NISN: <strong>{user.nisn || '0087654321'}</strong></span>
              <span>•</span>
              <span>Rombel: <strong>{user.className || 'Kelas IX-C (Unggulan)'}</strong></span>
              <span>•</span>
              <span>Semester: <strong>Ganjil 2025/2026</strong></span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-xl flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-300" />
            <div>
              <p className="text-[11px] text-blue-100 uppercase tracking-wider font-semibold">Ujian Selesai</p>
              <p className="text-xl font-bold text-white">{results.length} Paket</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab: Available Exams */}
      {activeTab === 'availableExams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <span>Daftar Ujian Aktif & Terjadwal</span>
            </h3>
            <span className="text-xs text-slate-500">
              Total {exams.length} ujian tersedia
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum Ada Ujian Terjadwal</p>
              <p className="text-xs text-slate-500 mt-1">Ujian baru akan muncul sesuai jadwal dari guru mata pelajaran.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => {
                const isCompleted = results.some(r => r.examId === exam.id);

                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {exam.subjectName}
                        </span>
                        {isCompleted ? (
                          <Badge variant="success">Sudah Dikerjakan</Badge>
                        ) : (
                          <Badge variant="primary">Aktif</Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {exam.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Pengampu: {exam.teacherName}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{exam.durationMinutes} Menit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                          <span>{exam.totalQuestions} Butir Soal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Token: {exam.token ? 'Diperlukan' : 'Bebas'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-slate-400" />
                          <span>KKM: {exam.passingScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      {isCompleted ? (
                        <div className="flex items-center justify-between text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-2 rounded-xl">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Ujian telah diselesaikan
                          </span>
                          <span className="font-bold">
                            Skor: {results.find(r => r.examId === exam.id)?.finalScore}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenExamModal(exam)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Mulai Kerjakan CBT</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: History and Grades */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Pencapaian Lencana (Badges) & Riwayat Ujian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Koleksi lencana prestasi akademik dan integritas pengerjaan CBT Anda.
              </p>
            </div>
          </div>

          {/* =========================================================
              STUDENT ACHIEVEMENT SYSTEM: BADGES SHOWCASE
              ========================================================= */}
          {(() => {
            const hasPerfectScore = results.some(r => r.finalScore === 100);
            const hasQuickSolver = results.some(r => r.finalScore >= 75);
            const hasHonorRoll = results.some(r => r.finalScore >= 90);
            const hasExamMaster = results.length >= 3;
            const hasIntegrityChampion = results.length > 0;
            const hasConfidentMaster = results.some(r => r.unansweredCount === 0);

            const badgesList = [
              {
                id: 'badge_perfect',
                title: 'Perfect Score',
                nameId: 'Nilai Sempurna',
                desc: 'Meraih skor sempurna 100 pada sesi ujian CBT',
                unlocked: hasPerfectScore,
                icon: Trophy,
                gradient: 'from-amber-400 to-yellow-600',
                border: 'border-amber-300',
                bg: 'bg-amber-50',
                text: 'text-amber-800'
              },
              {
                id: 'badge_quick',
                title: 'Quick Solver',
                nameId: 'Penyelesai Cepat',
                desc: 'Menyelesaikan ujian tepat waktu dan melampaui KKM',
                unlocked: hasQuickSolver,
                icon: Zap,
                gradient: 'from-blue-500 to-indigo-600',
                border: 'border-blue-300',
                bg: 'bg-blue-50',
                text: 'text-blue-800'
              },
              {
                id: 'badge_honor',
                title: 'Honor Roll',
                nameId: 'Bintang Prestasi',
                desc: 'Meraih nilai istimewa ≥ 90 pada naskah ujian',
                unlocked: hasHonorRoll,
                icon: Target,
                gradient: 'from-purple-500 to-pink-600',
                border: 'border-purple-300',
                bg: 'bg-purple-50',
                text: 'text-purple-800'
              },
              {
                id: 'badge_integrity',
                title: 'Integrity Champion',
                nameId: 'Integritas Unggul',
                desc: 'Menyelesaikan CBT dengan disiplin penuh tanpa pelanggaran',
                unlocked: hasIntegrityChampion,
                icon: Shield,
                gradient: 'from-emerald-400 to-teal-600',
                border: 'border-emerald-300',
                bg: 'bg-emerald-50',
                text: 'text-emerald-800'
              },
              {
                id: 'badge_master',
                title: 'Exam Master',
                nameId: 'Juara Ujian',
                desc: `Menyelesaikan minimal 3 paket ujian CBT (${results.length}/3 Selesai)`,
                unlocked: hasExamMaster,
                icon: Award,
                gradient: 'from-orange-400 to-red-600',
                border: 'border-orange-300',
                bg: 'bg-orange-50',
                text: 'text-orange-800'
              },
              {
                id: 'badge_confident',
                title: 'Confident Solver',
                nameId: 'Tuntas Tanpa Ragu',
                desc: 'Menjawab 100% butir soal tanpa meninggalkan jawaban kosong',
                unlocked: hasConfidentMaster,
                icon: Sparkles,
                gradient: 'from-cyan-400 to-blue-600',
                border: 'border-cyan-300',
                bg: 'bg-cyan-50',
                text: 'text-cyan-800'
              }
            ];

            const unlockedCount = badgesList.filter(b => b.unlocked).length;

            return (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Koleksi Lencana Prestasi Siswa ({unlockedCount}/{badgesList.length} Terbuka)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Raih seluruh lencana dengan meningkatkan nilai dan disiplin CBT Anda.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Level Siswa: {unlockedCount >= 4 ? '⭐ Master CBT' : unlockedCount >= 2 ? '🎖️ Pejuang Ujian' : '🌱 Pemula'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {badgesList.map(badge => {
                    const IconComp = badge.icon;
                    return (
                      <div
                        key={badge.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          badge.unlocked
                            ? `${badge.bg} ${badge.border} shadow-2xs`
                            : 'bg-slate-50/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                            badge.unlocked
                              ? `bg-linear-to-br ${badge.gradient} text-white`
                              : 'bg-slate-300 text-slate-500'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className={`text-xs font-bold truncate ${badge.unlocked ? badge.text : 'text-slate-600'}`}>
                              {badge.title}
                            </h5>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                badge.unlocked
                                  ? 'bg-white/80 text-emerald-700 border border-emerald-300'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {badge.unlocked ? 'Terbuka' : 'Terkunci'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold">{badge.nameId}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {badge.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Exam Results Table */}
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">Belum Ada Riwayat Ujian</p>
              <p className="text-xs text-slate-500 mt-1">Nilai akan ditampilkan setelah Anda menyelesaikan sesi ujian CBT.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Riwayat Naskah CBT yang Telah Dikerjakan ({results.length} Paket)
                </span>
                <span className="text-[11px] text-slate-500">
                  Rata-rata Nilai: <strong>{Math.round(results.reduce((a, b) => a + b.finalScore, 0) / results.length)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Nama Ujian</th>
                      <th className="px-5 py-3 text-center">Benar</th>
                      <th className="px-5 py-3 text-center">Salah</th>
                      <th className="px-5 py-3 text-center">Kosong</th>
                      <th className="px-5 py-3 text-center">Nilai Akhir</th>
                      <th className="px-5 py-3 text-center">Status & Lencana</th>
                      <th className="px-5 py-3">Waktu Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {results.map(res => (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {res.examTitle || 'Ujian Sekolah'}
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-emerald-600">
                          {res.correctCount}
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-rose-600">
                          {res.wrongCount}
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-slate-500">
                          {res.unansweredCount}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-extrabold text-sm ${
                              res.finalScore >= 75
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {res.finalScore}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Badge variant="success">Lulus</Badge>
                            {res.finalScore === 100 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-0.5">
                                🏆 100
                              </span>
                            )}
                            {res.finalScore >= 90 && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center gap-0.5">
                                ⭐ Honor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {res.publishedAt ? new Date(res.publishedAt).toLocaleString('id-ID') : '-'}
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

      {/* Token Verification Modal */}
      {selectedExamForToken && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedExamForToken(null)}
          title="Konfirmasi Mulai Ujian CBT"
          maxWidth="sm"
        >
          <div className="py-2">
            <h4 className="text-sm font-bold text-slate-900">{selectedExamForToken.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Durasi: {selectedExamForToken.durationMinutes} Menit • {selectedExamForToken.totalQuestions} Butir Soal
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              <strong>Ketentuan Ujian:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-800">
                <li>Dilarang membuka tab/aplikasi lain selama ujian.</li>
                <li>Waktu ujian berjalan otomatis dan tidak dapat di-pause.</li>
                <li>Jawaban tersimpan otomatis secara berkala di Firestore.</li>
              </ul>
            </div>

            {selectedExamForToken.token && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Masukkan Token Ujian
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: SMP9MTK"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase tracking-wider text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                {tokenError && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{tokenError}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedExamForToken(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleVerifyAndStart}
                className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Mulai Kerjakan Sekarang
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
