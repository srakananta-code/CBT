import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Users,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  MessageSquare,
  PlusCircle,
  Lock,
  Unlock,
  Send,
  Flag,
  Radio,
  FileText,
  Camera,
  Eye,
  Keyboard,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  getSessionsForExam,
  getProctoringEventsForSession,
  addExtraTimeToSession,
  sendTeacherWarningToSession,
  updateExamSessionStatus,
  resetExamSessionByTeacher,
  logAuditEvent
} from '../../services/dbService';
import type {
  Exam,
  ExamSession,
  ProctoringEvent,
  UserProfile,
  SchoolClass
} from '../../types/database';

interface LiveExamMonitorProps {
  exams: Exam[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  currentUser: UserProfile;
  classes: SchoolClass[];
  users: UserProfile[];
}

export const LiveExamMonitor: React.FC<LiveExamMonitorProps> = ({
  exams,
  selectedExamId,
  onSelectExam,
  currentUser,
  classes,
  users
}) => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high_risk' | 'flagged'>('all');

  // Screenshot Preview Modal
  const [selectedScreenshotPreview, setSelectedScreenshotPreview] = useState<{
    url: string;
    studentName: string;
    time: string;
    details?: string;
    riskLevel?: string;
  } | null>(null);

  // Proctoring Log Modal
  const [selectedSessionForLog, setSelectedSessionForLog] = useState<ExamSession | null>(null);
  const [sessionEvents, setSessionEvents] = useState<ProctoringEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Warning Modal
  const [selectedSessionForWarning, setSelectedSessionForWarning] = useState<ExamSession | null>(null);
  const [warningMessage, setWarningMessage] = useState('Harap tetap fokus pada layar ujian dan jangan membuka tab atau aplikasi lain!');

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const activeExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || exams[0];
  }, [exams, selectedExamId]);

  // Load sessions for currently active exam
  const fetchSessions = async () => {
    if (!activeExam) return;
    try {
      const sess = await getSessionsForExam(activeExam.id);
      setSessions(sess);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load exam sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeExam?.id]);

  // Auto-refresh interval (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh || !activeExam) return;

    const interval = setInterval(() => {
      fetchSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeExam?.id]);

  // Calculate live metrics
  // Eligible students from target classes
  const eligibleStudents = useMemo(() => {
    if (!activeExam) return [];
    const allStudents = users.filter(u => u.role === 'student');
    if (!activeExam.targetClassIds || activeExam.targetClassIds.includes('all')) {
      return allStudents;
    }
    return allStudents.filter(u => u.classId && activeExam.targetClassIds.includes(u.classId));
  }, [users, activeExam]);

  const ongoingSessions = sessions.filter(s => s.status === 'ongoing');
  const submittedSessions = sessions.filter(s => s.status === 'submitted');
  const flaggedSessions = sessions.filter(s => (s.violationCount || 0) > 0);
  const notStartedCount = Math.max(0, eligibleStudents.length - sessions.length);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (classFilter !== 'all' && s.studentClass !== classFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (riskFilter === 'high_risk' && s.aiRiskLevel !== 'high' && s.aiRiskLevel !== 'critical') return false;
      if (riskFilter === 'flagged' && (!s.violationCount || s.violationCount === 0)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = s.studentName.toLowerCase().includes(q);
        const inClass = s.studentClass?.toLowerCase().includes(q);
        if (!inName && !inClass) return false;
      }
      return true;
    });
  }, [sessions, classFilter, statusFilter, riskFilter, searchQuery]);

  // View Proctoring Events
  const handleOpenProctoringLog = async (sess: ExamSession) => {
    setSelectedSessionForLog(sess);
    setLoadingEvents(true);
    try {
      const evts = await getProctoringEventsForSession(sess.id);
      setSessionEvents(evts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Add extra time
  const handleAddExtraTime = async (session: ExamSession, minutes: number) => {
    setActionLoadingId(session.id);
    try {
      await addExtraTimeToSession(session.id, minutes);
      await logAuditEvent({
        userId: currentUser.uid,
        userName: currentUser.name,
        role: 'teacher',
        action: 'PROCTOR_EXTEND_TIME',
        details: `Guru memberikan tambahan waktu +${minutes} menit untuk siswa ${session.studentName} pada ujian ${activeExam?.title}.`
      });
      await fetchSessions();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Send warning
  const handleSendWarning = async () => {
    if (!selectedSessionForWarning || !warningMessage.trim()) return;
    try {
      await sendTeacherWarningToSession(selectedSessionForWarning.id, warningMessage.trim());
      await logAuditEvent({
        userId: currentUser.uid,
        userName: currentUser.name,
        role: 'teacher',
        action: 'PROCTOR_SEND_WARNING',
        details: `Guru mengirim peringatan kepada ${selectedSessionForWarning.studentName}: "${warningMessage.trim()}"`
      });
      setSelectedSessionForWarning(null);
      await fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  // Force submit
  const handleForceSubmit = async (session: ExamSession) => {
    if (!window.confirm(`Konfirmasi paksa kumpulkan ujian untuk siswa "${session.studentName}"?`)) return;
    setActionLoadingId(session.id);
    try {
      await updateExamSessionStatus(session.id, 'submitted', new Date().toISOString());
      await logAuditEvent({
        userId: currentUser.uid,
        userName: currentUser.name,
        role: 'teacher',
        action: 'PROCTOR_FORCE_SUBMIT',
        details: `Guru mengumpulkan secara paksa sesi ujian siswa ${session.studentName}.`
      });
      await fetchSessions();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset Session
  const handleResetSession = async (session: ExamSession) => {
    if (!window.confirm(`Reset sesi ujian untuk "${session.studentName}"? Siswa dapat mengulang pengerjaan.`)) return;
    setActionLoadingId(session.id);
    try {
      await resetExamSessionByTeacher(session.id);
      await logAuditEvent({
        userId: currentUser.uid,
        userName: currentUser.name,
        role: 'teacher',
        action: 'PROCTOR_RESET_SESSION',
        details: `Guru mereset sesi ujian siswa ${session.studentName}.`
      });
      await fetchSessions();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Exam Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-linear-to-r from-[#0a192f] to-[#1e3a8a] rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Proctoring Dashboard
            </span>
            <span className="text-xs text-blue-200">•</span>
            <span className="text-xs text-blue-200 font-medium">Pemantau Real-Time CBT</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">
            Monitoring Peserta & Integritas Ujian
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Pantau progres pengerjaan, sisa waktu, dan deteksi kecurangan secara langsung.
          </p>
        </div>

        {/* Exam Picker & Auto-refresh Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <label className="text-[11px] text-blue-200 font-semibold">Pilih Paket:</label>
            <select
              value={activeExam?.id || ''}
              onChange={e => onSelectExam(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id} className="text-slate-900">
                  {e.title} ({e.subjectName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              autoRefresh
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'bg-white/10 border-white/20 text-slate-300'
            }`}
            title="Auto refresh setiap 5 detik"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Auto (5s)</span>
          </button>

          <button
            type="button"
            onClick={fetchSessions}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Segarkan data sekarang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Target Siswa
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{eligibleStudents.length}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Siswa terdaftar di rombel</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Sedang Ujian
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{ongoingSessions.length}</p>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Aktif di layar CBT</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
            Sudah Selesai
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">{submittedSessions.length}</p>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Telah dikumpulkan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Belum Mulai
          </span>
          <p className="text-2xl font-black text-slate-700 mt-1">{notStartedCount}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Belum login token</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Pelanggaran
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">{flaggedSessions.length}</p>
          <span className="text-[10px] text-rose-700 mt-0.5 block">Tab switch / blur terdeteksi</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 relative w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama peserta atau rombel..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Rombel</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="ongoing">Sedang Mengerjakan</option>
            <option value="submitted">Sudah Selesai</option>
          </select>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="all">Semua AI & Disiplin</option>
            <option value="flagged">Ada Pelanggaran Sesi</option>
            <option value="high_risk">Risiko AI Tinggi / Kritis</option>
          </select>
        </div>
      </div>

      {/* Live Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Daftar Sesi Pengerjaan Peserta ({filteredSessions.length} Sesi Terbuka)
          </span>
          <span className="text-slate-400 text-[11px]">
            Diperbarui: {lastRefreshed.toLocaleTimeString('id-ID')}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Belum Ada Sesi Peserta Aktif</p>
            <p className="text-xs text-slate-400 mt-1">
              Siswa yang memasukkan token ujian akan otomatis muncul pada dashboard pengawasan ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Siswa & Rombel</th>
                  <th className="px-4 py-3">Status CBT</th>
                  <th className="px-4 py-3">Sisa Waktu</th>
                  <th className="px-4 py-3">Pelanggaran (Proctoring)</th>
                  <th className="px-4 py-3">AI Proctoring & Snapshot</th>
                  <th className="px-4 py-3 text-right">Tindakan Pengawas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSessions.map(sess => {
                  const deadlineTime = new Date(sess.endTimeDeadline).getTime();
                  const remainingSec = Math.max(0, Math.floor((deadlineTime - Date.now()) / 1000));
                  const remMin = Math.floor(remainingSec / 60);
                  const remSec = remainingSec % 60;
                  const formattedTime = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
                  const isTimeOut = remainingSec === 0 && sess.status === 'ongoing';

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Siswa */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{sess.studentName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
                            {sess.studentClass}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400 truncate max-w-xs">{sess.userAgent?.split(') ')[0] || 'Browser Desktop'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {sess.status === 'ongoing' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold text-emerald-700 text-xs">Sedang Mengerjakan</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-blue-700 text-xs">Ujian Selesai</span>
                          </div>
                        )}
                      </td>

                      {/* Sisa Waktu */}
                      <td className="px-4 py-3">
                        {sess.status === 'ongoing' ? (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            remMin < 5
                              ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {formattedTime}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">Terkumpul</span>
                        )}
                      </td>

                      {/* Pelanggaran */}
                      <td className="px-4 py-3">
                        {sess.violationCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenProctoringLog(sess)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>{sess.violationCount} Kali Terdeteksi</span>
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disiplin (0)
                          </span>
                        )}
                      </td>

                      {/* AI Proctoring & Snapshot */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sess.aiRiskLevel === 'high' || sess.aiRiskLevel === 'critical'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                : sess.aiRiskLevel === 'medium'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            AI: {sess.aiRiskLevel ? sess.aiRiskLevel.toUpperCase() : 'NORMAL'}
                          </span>

                          {sess.lastScreenshotUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedScreenshotPreview({
                                  url: sess.lastScreenshotUrl!,
                                  studentName: sess.studentName,
                                  time: sess.lastScreenshotTime ? new Date(sess.lastScreenshotTime).toLocaleTimeString('id-ID') : 'Terkini',
                                  details: sess.lastAnalysisSummary || 'Verifikasi tangkapan layar berkala AI Proctoring',
                                  riskLevel: sess.aiRiskLevel
                                })
                              }
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer border border-slate-200 transition-colors"
                              title="Buka tangkapan layar AI proctoring siswa"
                            >
                              <Camera className="w-3 h-3 text-blue-600" />
                              <span>Lihat Snapshot</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                          )}
                        </div>
                      </td>

                      {/* Tindakan Pengawas */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionForWarning(sess)}
                            className="p-1.5 hover:bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer"
                            title="Kirim pesan peringatan langsung ke layar siswa"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {sess.status === 'ongoing' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAddExtraTime(sess, 5)}
                                disabled={actionLoadingId === sess.id}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                title="Tambah waktu +5 menit"
                              >
                                +5 Menit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleForceSubmit(sess)}
                                disabled={actionLoadingId === sess.id}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                title="Paksa kumpulkan ujian"
                              >
                                Paksa Kumpulkan
                              </button>
                            </>
                          )}

                          {sess.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => handleResetSession(sess)}
                              disabled={actionLoadingId === sess.id}
                              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Reset sesi agar siswa dapat mengulang"
                            >
                              Reset Sesi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proctoring Log Detail Modal */}
      {selectedSessionForLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSessionForLog(null)}
          title={`Log Pelanggaran Disiplin CBT - ${selectedSessionForLog.studentName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Total Pelanggaran Tercatat</p>
                <p className="text-slate-600">Siswa: {selectedSessionForLog.studentName} ({selectedSessionForLog.studentClass})</p>
              </div>
              <span className="text-xl font-black text-rose-600">{selectedSessionForLog.violationCount}x</span>
            </div>

            {loadingEvents ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                Memuat riwayat insiden...
              </div>
            ) : sessionEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Tidak ada rincian log terperinci tersimpan.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sessionEvents.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          ev.eventType === 'tab_switch' || ev.eventType === 'keystroke_anomaly'
                            ? 'bg-rose-100 text-rose-800'
                            : ev.eventType === 'window_blur'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ev.eventType === 'tab_switch'
                            ? 'Pindah Tab'
                            : ev.eventType === 'window_blur'
                            ? 'Kehilangan Fokus (Blur)'
                            : ev.eventType === 'keystroke_anomaly'
                            ? 'Anomali Ketikan / Shortcut'
                            : ev.eventType === 'periodic_screenshot'
                            ? 'Snapshot Periodik'
                            : ev.eventType}
                        </span>
                        {ev.aiRiskLevel && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                            ev.aiRiskLevel === 'high' || ev.aiRiskLevel === 'critical'
                              ? 'bg-rose-600 text-white'
                              : ev.aiRiskLevel === 'medium'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {ev.aiRiskLevel}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-700">{ev.details}</p>
                    {ev.screenshotUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotPreview({
                            url: ev.screenshotUrl!,
                            studentName: selectedSessionForLog.studentName,
                            time: new Date(ev.timestamp).toLocaleTimeString('id-ID'),
                            details: ev.details,
                            riskLevel: ev.aiRiskLevel
                          })}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Buka Tangkapan Layar Insiden Ini</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedSessionForLog(null)}
              className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </Modal>
      )}

      {/* Direct Warning Message Modal */}
      {selectedSessionForWarning && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSessionForWarning(null)}
          title={`Kirim Peringatan Langsung ke ${selectedSessionForWarning.studentName}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pesan ini akan muncul sebagai kotak dialog peringatan prioritas tinggi di layar siswa secara seketika.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Isi Pesan Peringatan
              </label>
              <textarea
                value={warningMessage}
                onChange={e => setWarningMessage(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                placeholder="Tuliskan peringatan kepada siswa..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSessionForWarning(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendWarning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirimkan ke Layar Siswa</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Proctoring Screenshot Full Preview Modal */}
      {selectedScreenshotPreview && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedScreenshotPreview(null)}
          title={`Tangkapan Layar AI Proctoring - ${selectedScreenshotPreview.studentName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Waktu Capture: </span>
                <strong className="font-mono">{selectedScreenshotPreview.time} WIB</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Tingkat Risiko AI: </span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  selectedScreenshotPreview.riskLevel === 'high' || selectedScreenshotPreview.riskLevel === 'critical'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                    : selectedScreenshotPreview.riskLevel === 'medium'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedScreenshotPreview.riskLevel ? selectedScreenshotPreview.riskLevel.toUpperCase() : 'NORMAL'}
                </span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-slate-900 flex items-center justify-center min-h-[220px]">
              <img
                src={selectedScreenshotPreview.url}
                alt="AI Proctoring Snapshot"
                className="w-full h-auto max-h-[420px] object-contain"
              />
            </div>

            {selectedScreenshotPreview.details && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Analisis AI Proctoring: </span>
                  <span>{selectedScreenshotPreview.details}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedScreenshotPreview(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Tutup Preview
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
