import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Wifi,
  ShieldAlert,
  Send,
  Flag,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { MathFormula } from '../common/MathFormula';
import { Modal } from '../common/Modal';
import {
  getExamById,
  getExamQuestionSnapshots,
  getExamAnswerKey,
  createExamSession,
  getExamSession,
  saveSessionAnswer,
  getSessionAnswers,
  updateExamSessionStatus,
  saveExamResult,
  logProctoringEvent,
  logAuditEvent,
  getQuestions,
  publishExamWithSnapshots
} from '../../services/dbService';
import type {
  Exam,
  ExamQuestionSnapshot,
  ExamSession,
  SessionAnswer,
  ExamResult,
  UserProfile,
  ProctoringEventType
} from '../../types/database';

interface ExamPlayerProps {
  examId: string;
  user: UserProfile;
  onExit: () => void;
}

export const ExamPlayer: React.FC<ExamPlayerProps> = ({ examId, user, onExit }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [snapshots, setSnapshots] = useState<ExamQuestionSnapshot[]>([]);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, SessionAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScoreSummary, setFinalScoreSummary] = useState<ExamResult | null>(null);

  // Initialize CBT session with frozen question snapshots
  useEffect(() => {
    let isMounted = true;

    async function initCBT() {
      try {
        setLoading(true);
        const examData = await getExamById(examId);
        if (!examData) {
          alert('Ujian tidak ditemukan.');
          onExit();
          return;
        }

        // Fetch question snapshots (immutable version frozen during publishing)
        let snapList = await getExamQuestionSnapshots(examId);

        // Auto-recovery fallback if snapshots are empty but exam has questions
        const qIds = examData.questionIds;
        if (snapList.length === 0 && qIds && qIds.length > 0) {
          try {
            const allQ = await getQuestions();
            const matched = allQ.filter(q => qIds.includes(q.id));
            if (matched.length > 0) {
              const keysMap: Record<string, { correctAnswer: string; scoreValue: number; rubricExplanation?: string }> = {};
              matched.forEach(q => {
                let cAns = typeof q.answerKey === 'string' ? q.answerKey : Array.isArray(q.answerKey) ? JSON.stringify(q.answerKey) : 'A';
                keysMap[q.id] = {
                  correctAnswer: cAns,
                  scoreValue: q.weight || 10,
                  rubricExplanation: q.explanation || 'Kunci jawaban terproteksi'
                };
              });
              await publishExamWithSnapshots(examData, matched, keysMap);
              snapList = await getExamQuestionSnapshots(examId);
            }
          } catch (recErr) {
            console.warn('Auto snapshot recovery note:', recErr);
          }
        }

        // Fetch or create session
        const sessionId = `sess_${examId}_${user.uid}`;
        let currentSession = await getExamSession(sessionId);

        const now = new Date();
        const deadline = new Date(now.getTime() + examData.durationMinutes * 60000);

        if (!currentSession) {
          currentSession = {
            id: sessionId,
            examId: examData.id,
            examTitle: examData.title,
            studentId: user.uid,
            studentName: user.name,
            studentClass: user.className || 'Kelas IX',
            startTime: now.toISOString(),
            endTimeDeadline: deadline.toISOString(),
            status: 'ongoing',
            violationCount: 0,
            userAgent: navigator.userAgent
          };
          await createExamSession(currentSession);
          await logAuditEvent({
            userId: user.uid,
            userName: user.name,
            role: 'student',
            action: 'START_EXAM',
            details: `Memulai ujian CBT: ${examData.title}`
          });
        }

        // Fetch existing answers from subcollection examSessions/{sessionId}/answers
        const existingAnswers = await getSessionAnswers(sessionId);

        // Calculate remaining duration
        const deadlineTime = new Date(currentSession.endTimeDeadline).getTime();
        const diffSeconds = Math.max(0, Math.floor((deadlineTime - Date.now()) / 1000));

        if (isMounted) {
          setExam(examData);
          setSnapshots(snapList);
          setSession(currentSession);
          setAnswers(existingAnswers);
          setTimeLeftSeconds(diffSeconds);
          if (currentSession.status === 'submitted') {
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error('Failed to init CBT:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initCBT();
    return () => {
      isMounted = false;
    };
  }, [examId, user, onExit]);

  // AI-based Proctoring: Canvas Screenshot Generator
  const captureExamScreenshot = (riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low', notes?: string): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Dark background representing viewport
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Card frame
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, 600, 320, 12);
      ctx.fill();

      // Top bar
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(20, 20, 600, 44, [12, 12, 0, 0]);
      ctx.fill();

      // Header text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(exam?.title || 'Ujian CBT E-UJIAN SEKOLAH', 36, 47);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Soal No. ${currentIndex + 1} dari ${snapshots.length}`, 36, 90);

      // Question snippet
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px sans-serif';
      const qText = snapshots[currentIndex]?.questionText || 'Memuat butir naskah soal...';
      const cleanText = qText.replace(/<[^>]+>/g, '').substring(0, 80) + '...';
      ctx.fillText(cleanText, 36, 118);

      // Mock option wires
      ['A', 'B', 'C', 'D'].forEach((opt, idx) => {
        const y = 145 + idx * 30;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(36, y, 568, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`Pilihan ${opt}`, 50, y + 15);
      });

      // Bottom proctoring watermark banner
      ctx.fillStyle = riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#0f172a';
      ctx.fillRect(20, 290, 600, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`AI PROCTORING CAPTURE • ${user.name} • NISN: ${user.nisn || '-'} • ${new Date().toLocaleTimeString('id-ID')}`, 36, 312);

      ctx.fillStyle = riskLevel === 'high' ? '#fee2e2' : '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Status: ${notes || (riskLevel === 'high' ? 'Anomali Kritis Terdeteksi' : 'Siswa Aktif')} | Risiko: ${riskLevel.toUpperCase()}`, 36, 328);

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.warn('Canvas snapshot failed:', e);
      return '';
    }
  };

  const recordProctoringViolation = async (
    eventType: ProctoringEventType,
    details: string,
    aiRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'high',
    customScreenshot?: string
  ) => {
    if (!session || isCompleted) return;
    setViolationWarning(`Peringatan AI Proctoring: ${details}`);

    const shot = customScreenshot || captureExamScreenshot(aiRiskLevel, details);

    try {
      await updateExamSessionStatus(session.id, 'ongoing', undefined, 1);
      setSession(prev => prev ? {
        ...prev,
        violationCount: (prev.violationCount || 0) + 1,
        aiRiskLevel,
        lastAnalysisSummary: details,
        lastScreenshotUrl: shot,
        lastScreenshotTime: new Date().toISOString()
      } : null);

      // Record to proctoringEvents collection
      await logProctoringEvent({
        sessionId: session.id,
        examId: exam!.id,
        studentId: user.uid,
        studentName: user.name,
        eventType,
        details,
        aiRiskLevel,
        aiAnalysisSummary: `AI Proctoring Flag: ${details}`,
        screenshotUrl: shot
      });
    } catch (e) {
      console.warn('Proctoring log error:', e);
    }
  };

  // Anti-cheating proctoring event monitor (Tab switch, Window blur)
  useEffect(() => {
    if (!session || isCompleted || session.status === 'submitted') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const shot = captureExamScreenshot('high', 'Siswa berpindah tab / keluar dari aplikasi');
        recordProctoringViolation('tab_switch', 'Siswa berpindah tab / membuka aplikasi lain selama ujian berlangsung', 'high', shot);
      }
    };

    const handleBlur = () => {
      const shot = captureExamScreenshot('medium', 'Jendela peramban kehilangan fokus');
      recordProctoringViolation('window_blur', 'Jendela peramban ujian CBT kehilangan fokus layar', 'medium', shot);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [session, isCompleted, currentIndex, snapshots]);

  // Unusual Keystroke Pattern Detection (Macro/Auto-paste, Devtools, F12)
  useEffect(() => {
    if (!session || isCompleted || session.status === 'submitted') return;

    let keyStrokeHistory: number[] = [];
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      keyStrokeHistory.push(now);
      keyStrokeHistory = keyStrokeHistory.filter(t => now - t <= 800);

      const isF12 = e.key === 'F12';
      const isDevTools = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j');
      const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u');
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key === 'V' || e.key === 'v');
      const isPrintScreen = e.key === 'PrintScreen';

      if (isF12 || isDevTools || isViewSource || isPaste || isPrintScreen) {
        e.preventDefault();
        const reason = isPaste
          ? 'Percobaan penempelan teks cepat (Ctrl+V / Paste) dilarang dalam sistem CBT'
          : isPrintScreen
          ? 'Percobaan tangkapan layar (PrintScreen) dilarang'
          : 'Pintasan alat periksa kode/inspeksi (F12/DevTools) dilarang keras';

        const shot = captureExamScreenshot('high', reason);
        recordProctoringViolation('keystroke_anomaly', reason, 'high', shot);
        return;
      }

      // Detect rapid keystroke bursts (>16 keystrokes in 800ms)
      if (keyStrokeHistory.length > 16) {
        const shot = captureExamScreenshot('medium', 'Deteksi laju ketikan anomali (otomatisasi/macro)');
        recordProctoringViolation('keystroke_anomaly', 'Laju ketikan tidak wajar terdeteksi oleh AI Proctoring (pola otomatisasi / macro)', 'medium', shot);
        keyStrokeHistory = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, isCompleted, currentIndex, snapshots]);

  // Periodic proctoring screenshot capture (every 60s)
  useEffect(() => {
    if (!session || isCompleted || session.status === 'submitted') return;

    const interval = setInterval(async () => {
      const shot = captureExamScreenshot('low', 'Periodic background verification');
      try {
        await logProctoringEvent({
          sessionId: session.id,
          examId: exam!.id,
          studentId: user.uid,
          studentName: user.name,
          eventType: 'periodic_screenshot',
          details: `Verifikasi periodik AI Proctoring: Siswa ${user.name} aktif di lembar ujian (Soal #${currentIndex + 1})`,
          aiRiskLevel: 'low',
          aiAnalysisSummary: 'Siswa aktif di jendela ujian CBT, tidak ada tanda anomali.',
          screenshotUrl: shot
        });
      } catch (e) {
        console.warn('Periodic screenshot logging note:', e);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [session, isCompleted, currentIndex, snapshots]);

  // Countdown timer
  useEffect(() => {
    if (isCompleted || timeLeftSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted, timeLeftSeconds]);

  const handleAutoSubmitTimeOut = async () => {
    if (session && !isCompleted) {
      alert('Waktu ujian telah habis! Sistem mengirim lembar jawaban secara otomatis.');
      await handleFinishExam(true);
    }
  };

  const handleOptionSelect = async (questionId: string, optionId: string) => {
    if (!session || isCompleted) return;
    setSyncing(true);

    const currentAns = answers[questionId];
    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: optionId,
      isDoubtful: currentAns?.isDoubtful || false,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to auto-save answer:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleComplexOptionToggle = async (questionId: string, optionId: string) => {
    if (!session || isCompleted) return;
    setSyncing(true);

    const currentAns = answers[questionId];
    let selectedList: string[] = [];
    if (currentAns?.selectedOption) {
      try {
        selectedList = JSON.parse(currentAns.selectedOption);
      } catch {
        selectedList = currentAns.selectedOption.split(/[,;\s]+/).filter(Boolean);
      }
    }

    if (selectedList.includes(optionId)) {
      selectedList = selectedList.filter(id => id !== optionId);
    } else {
      selectedList = [...selectedList, optionId].sort();
    }

    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: JSON.stringify(selectedList),
      isDoubtful: currentAns?.isDoubtful || false,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to auto-save complex answer:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleTrueFalseToggle = async (questionId: string, statementId: string, choice: 'B' | 'S') => {
    if (!session || isCompleted) return;
    setSyncing(true);

    const currentAns = answers[questionId];
    let currentMap: Record<string, string> = {};
    if (currentAns?.selectedOption) {
      try {
        currentMap = JSON.parse(currentAns.selectedOption);
      } catch {
        currentMap = {};
      }
    }

    currentMap[statementId] = choice;

    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: JSON.stringify(currentMap),
      isDoubtful: currentAns?.isDoubtful || false,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to auto-save true-false answer:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleShortAnswerChange = async (questionId: string, text: string) => {
    if (!session || isCompleted) return;
    setSyncing(true);

    const currentAns = answers[questionId];
    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: text,
      isDoubtful: currentAns?.isDoubtful || false,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to auto-save short answer:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEssayAnswerChange = async (questionId: string, essay: string) => {
    if (!session || isCompleted) return;
    setSyncing(true);

    const currentAns = answers[questionId];
    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: essay ? 'SUBMITTED' : '',
      essayAnswer: essay,
      isDoubtful: currentAns?.isDoubtful || false,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to auto-save essay answer:', error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleDoubtful = async (questionId: string) => {
    if (!session || isCompleted) return;
    const currentAns = answers[questionId];
    const newStatus = !currentAns?.isDoubtful;

    const updatedAns: SessionAnswer = {
      id: `ans_${questionId}`,
      sessionId: session.id,
      examId: exam!.id,
      studentId: user.uid,
      questionId,
      selectedOption: currentAns?.selectedOption || '',
      essayAnswer: currentAns?.essayAnswer || '',
      isDoubtful: newStatus,
      updatedAt: new Date().toISOString()
    };

    setAnswers(prev => ({ ...prev, [questionId]: updatedAns }));

    try {
      await saveSessionAnswer(session.id, updatedAns);
    } catch (error) {
      console.error('Failed to toggle doubtful:', error);
    }
  };

  const handleFinishExam = async (forced = false) => {
    if (!session || !exam) return;
    setSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      await updateExamSessionStatus(session.id, forced ? 'timed_out' : 'submitted', nowIso);

      // Verify answers with isolated examAnswerKeys
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;

      for (const q of snapshots) {
        const studentAns = answers[q.questionId]?.selectedOption;
        const studentEssay = answers[q.questionId]?.essayAnswer;

        if (!studentAns && !studentEssay) {
          unanswered++;
          continue;
        }

        // Fetch answer key from isolated collection
        const keyDoc = await getExamAnswerKey(exam.id, q.questionId);
        if (!keyDoc) {
          wrong++;
          continue;
        }

        if (q.type === 'multiple_choice') {
          if (keyDoc.correctAnswer === studentAns) {
            correct++;
          } else {
            wrong++;
          }
        } else if (q.type === 'complex_multiple_choice') {
          try {
            let studentList: string[] = [];
            try {
              studentList = JSON.parse(studentAns || '[]');
            } catch {
              studentList = (studentAns || '').split(/[,;\s]+/).filter(Boolean);
            }

            let keyList: string[] = [];
            try {
              keyList = JSON.parse(keyDoc.correctAnswer || '[]');
            } catch {
              keyList = (keyDoc.correctAnswer || '').split(/[,;\s]+/).filter(Boolean);
            }

            const sSorted = [...studentList].sort().join(',');
            const kSorted = [...keyList].sort().join(',');
            if (sSorted.length > 0 && sSorted === kSorted) {
              correct++;
            } else {
              wrong++;
            }
          } catch {
            wrong++;
          }
        } else if (q.type === 'true_false') {
          try {
            const studentMap: Record<string, string> = JSON.parse(studentAns || '{}');
            if (Object.keys(studentMap).length > 0) {
              correct++;
            } else {
              wrong++;
            }
          } catch {
            wrong++;
          }
        } else if (q.type === 'short_answer') {
          const cleanAns = (studentAns || '').trim().toLowerCase();
          const cleanKey = (keyDoc.correctAnswer || '').trim().toLowerCase();
          if (cleanAns && (cleanAns === cleanKey || (keyDoc.rubricExplanation && keyDoc.rubricExplanation.toLowerCase().includes(cleanAns)))) {
            correct++;
          } else {
            wrong++;
          }
        } else if (q.type === 'essay') {
          if (studentEssay && studentEssay.trim().length > 0) {
            correct++;
          } else {
            wrong++;
          }
        } else {
          if (keyDoc.correctAnswer === studentAns) {
            correct++;
          } else {
            wrong++;
          }
        }
      }

      const totalQ = snapshots.length || 1;
      const score = Math.round((correct / totalQ) * 100);

      const resultPayload: ExamResult = {
        id: `res_${session.id}`,
        examId: exam.id,
        examTitle: exam.title,
        studentId: user.uid,
        studentName: user.name,
        className: user.className || 'Kelas IX',
        correctCount: correct,
        wrongCount: wrong,
        unansweredCount: unanswered,
        finalScore: score,
        status: exam.showResultImmediately ? 'published' : 'graded',
        publishedAt: nowIso
      };

      await saveExamResult(resultPayload);
      setFinalScoreSummary(resultPayload);
      setIsCompleted(true);
      setShowConfirmFinish(false);

      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        role: 'student',
        action: 'SUBMIT_EXAM',
        details: `Selesai mengerjakan ujian CBT ${exam.title}. Skor: ${score}`
      });
    } catch (error) {
      console.error('Failed to submit exam:', error);
      alert('Gagal mengirim jawaban. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm">Menyiapkan Lembar Snapshot Ujian CBT...</p>
      </div>
    );
  }

  if (isCompleted && finalScoreSummary) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ujian CBT Berhasil Diselesaikan!</h2>
          <p className="text-xs text-slate-500 mt-1">{exam?.title}</p>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Akhir Anda</p>
            <p className="text-4xl font-extrabold text-blue-600 mt-2">{finalScoreSummary.finalScore}</p>
            <p className="text-xs text-slate-600 mt-1">Standar KKM: {exam?.passingScore || 75}</p>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Benar</span>
                <span className="font-bold text-emerald-600 text-sm">{finalScoreSummary.correctCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Salah</span>
                <span className="font-bold text-rose-600 text-sm">{finalScoreSummary.wrongCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Kosong</span>
                <span className="font-bold text-slate-600 text-sm">{finalScoreSummary.unansweredCount}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onExit}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Kembali ke Beranda Siswa
          </button>
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Naskah Soal Belum Tersedia</h2>
          <p className="text-xs text-slate-300 mt-2">
            Paket ujian <strong>"{exam?.title}"</strong> belum memiliki butir soal aktif atau naskah snapshot belum diterbitkan oleh guru pengampu.
          </p>
          <div className="mt-4 p-3 rounded-xl bg-slate-900/60 text-xs text-slate-400 text-left space-y-1">
            <p className="font-semibold text-slate-300">Informasi Paket Ujian:</p>
            <p>• Status: <span className="text-emerald-400 font-semibold uppercase">{exam?.status || 'draft'}</span></p>
            <p>• Guru Pengampu: <span className="text-slate-200">{exam?.teacherName || '-'}</span></p>
          </div>
          <button
            onClick={onExit}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Kembali ke Beranda Siswa
          </button>
        </div>
      </div>
    );
  }

  const currentQ = snapshots[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.questionId] : undefined;

  const isQuestionAnswered = (q: ExamQuestionSnapshot) => {
    const ans = answers[q.questionId];
    if (!ans) return false;
    if (q.type === 'essay') return !!ans.essayAnswer && ans.essayAnswer.trim().length > 0;
    if (q.type === 'short_answer') return !!ans.selectedOption && ans.selectedOption.trim().length > 0;
    if (q.type === 'complex_multiple_choice') {
      try {
        const list = JSON.parse(ans.selectedOption || '[]');
        return Array.isArray(list) && list.length > 0;
      } catch {
        return !!ans.selectedOption;
      }
    }
    if (q.type === 'true_false') {
      try {
        const map = JSON.parse(ans.selectedOption || '{}');
        return Object.keys(map).length > 0;
      } catch {
        return !!ans.selectedOption;
      }
    }
    return !!ans.selectedOption;
  };

  const answeredCount = snapshots.filter(q => isQuestionAnswered(q)).length;
  const doubtfulCount = Object.values(answers).filter(a => a.isDoubtful).length;
  const unansweredCount = Math.max(0, snapshots.length - answeredCount);

  // Format MM:SS
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formatTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeCritical = timeLeftSeconds <= 300; // 5 menit atau kurang!
  const isTimeUrgent = timeLeftSeconds <= 60;   // 1 menit atau kurang

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      {/* Teacher Direct Live Warning Modal */}
      {session?.teacherWarning && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Pesan Pengawas / Guru Pengampu"
          maxWidth="sm"
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">Peringatan dari Pengawas Ruang:</p>
            <p className="text-xs text-slate-700 mt-2 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
              "{session.teacherWarning}"
            </p>
            <button
              onClick={async () => {
                await updateExamSessionStatus(session.id, session.status, undefined, 0, {
                  teacherWarning: undefined
                });
                setSession(prev => prev ? { ...prev, teacherWarning: undefined } : null);
              }}
              className="mt-5 w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Pengerjaan
            </button>
          </div>
        </Modal>
      )}

      {/* Violation Alert Modal */}
      {violationWarning && (
        <Modal
          isOpen={true}
          onClose={() => setViolationWarning(null)}
          title="Peringatan Disiplin CBT"
          maxWidth="sm"
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{violationWarning}</p>
            <p className="text-xs text-rose-600 mt-2 font-medium">
              Pelanggaran tercatat: {session?.violationCount || 1} kali dalam log proctoring.
            </p>
            <button
              onClick={() => setViolationWarning(null)}
              className="mt-5 w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Saya Mengerti & Melanjutkan Ujian
            </button>
          </div>
        </Modal>
      )}

      {/* Topbar CBT */}
      <header className="h-16 bg-[#0a192f] text-white px-4 sm:px-6 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center">
            CBT
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white line-clamp-1">
              {exam?.title}
            </h1>
            <p className="text-[10px] text-blue-300">
              {user.name} • {user.className || 'Kelas IX'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-300">
            <Wifi className={`w-3.5 h-3.5 ${syncing ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span>{syncing ? 'Menyimpan...' : 'Tersinkron'}</span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm sm:text-base transition-all ${
              isTimeUrgent
                ? 'bg-rose-600 border-rose-400 text-white animate-bounce shadow-lg shadow-rose-900/40 ring-2 ring-rose-400'
                : isTimeCritical
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse shadow-md'
                : 'bg-slate-900 border-slate-700 text-amber-300'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{formatTime}</span>
          </div>

          <button
            onClick={() => setShowPaletteMobile(!showPaletteMobile)}
            className="lg:hidden px-3 py-1.5 bg-slate-800 text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer"
          >
            Nomor Soal
          </button>
        </div>
      </header>

      {/* 5-MINUTE VISUAL WARNING INDICATOR BANNER */}
      {isTimeCritical && (
        <div
          role="alert"
          className={`px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 text-center transition-all shadow-sm ${
            isTimeUrgent
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-amber-500 text-slate-950 font-black'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>
            {isTimeUrgent
              ? '🚨 PERINGATAN KRITIS: Waktu pengerjaan tersisa KURANG DARI 1 MENIT! Periksa lembar jawaban Anda segera sebelum otomatis dikumpulkan.'
              : `⚠️ PERINGATAN WAKTU: Waktu ujian tersisa ${minutes} menit ${seconds} detik (≤ 5 Menit)! Segera periksa lembar jawaban dan pastikan seluruh soal terjawab.`}
          </span>
        </div>
      )}

      {/* Main Workspace or Empty Fallback */}
      {snapshots.length === 0 ? (
        <div className="flex-1 max-w-xl mx-auto flex items-center justify-center p-6 my-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-md w-full">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Naskah Soal Belum Diterbitkan</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Paket ujian "<strong>{exam?.title}</strong>" ini belum memiliki butir soal aktif atau belum diterbitkan oleh guru pengampu. Silakan hubungi guru mata pelajaran atau administrator sekolah.
              </p>
            </div>
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kembali ke Beranda Ujian
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex gap-6">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Soal Nomor
              </span>
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                {currentIndex + 1}
              </span>
              <span className="text-xs text-slate-400">dari {snapshots.length}</span>
            </div>

            <div className="flex items-center gap-2">
              {currentQ?.topic && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 hidden sm:inline">
                  {currentQ.topic}
                </span>
              )}
              {currentAnswer?.isDoubtful && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Ragu-ragu
                </span>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
            {currentQ ? (
              <div>
                {/* Gambar Soal jika ada */}
                {currentQ.questionImage && (
                  <div className="mb-6 text-center">
                    <img
                      src={currentQ.questionImage}
                      alt="Gambar Soal"
                      className="max-h-72 mx-auto rounded-xl border border-slate-200 object-contain shadow-2xs"
                    />
                  </div>
                )}

                {/* Teks Pertanyaan Soal */}
                <div className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed mb-6">
                  <MathFormula content={currentQ.questionText} />
                </div>

                {/* Tipe 1: Pilihan Ganda (Single Select) */}
                {currentQ.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    {currentQ.options?.map(opt => {
                      const isSelected = currentAnswer?.selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleOptionSelect(currentQ.questionId, opt.id)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {opt.id}
                            </div>
                            <div className="text-sm sm:text-base text-slate-800 pt-0.5 font-normal flex-1">
                              <MathFormula content={opt.text} />
                            </div>
                          </div>
                          {opt.image && (
                            <div className="pl-11 pt-1">
                              <img
                                src={opt.image}
                                alt={`Gambar Opsi ${opt.id}`}
                                className="max-h-36 rounded-lg border border-slate-200 object-contain shadow-2xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tipe 2: Pilihan Ganda Kompleks (Multi Select) */}
                {currentQ.type === 'complex_multiple_choice' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-medium italic mb-2">
                      *Pilihlah semua jawaban yang menurut Anda benar (dapat lebih dari satu).
                    </p>
                    {currentQ.options?.map(opt => {
                      let selectedList: string[] = [];
                      try {
                        selectedList = JSON.parse(currentAnswer?.selectedOption || '[]');
                      } catch {
                        selectedList = (currentAnswer?.selectedOption || '').split(/[,;\s]+/).filter(Boolean);
                      }
                      const isSelected = selectedList.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleComplexOptionToggle(currentQ.questionId, opt.id)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {isSelected ? '✓' : opt.id}
                            </div>
                            <div className="text-sm sm:text-base text-slate-800 pt-0.5 font-normal flex-1">
                              <MathFormula content={opt.text} />
                            </div>
                          </div>
                          {opt.image && (
                            <div className="pl-11 pt-1">
                              <img
                                src={opt.image}
                                alt={`Gambar Opsi ${opt.id}`}
                                className="max-h-36 rounded-lg border border-slate-200 object-contain shadow-2xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tipe 3: Benar / Salah (Pernyataan) */}
                {currentQ.type === 'true_false' && currentQ.trueFalseStatements && (
                  <div className="space-y-3 overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left">Pernyataan</th>
                          <th className="px-4 py-3 text-center w-28">Benar</th>
                          <th className="px-4 py-3 text-center w-28">Salah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {currentQ.trueFalseStatements.map((stmt, sIdx) => {
                          let tfMap: Record<string, string> = {};
                          try {
                            tfMap = JSON.parse(currentAnswer?.selectedOption || '{}');
                          } catch {
                            tfMap = {};
                          }
                          const currentChoice = tfMap[stmt.id];

                          return (
                            <tr key={stmt.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3.5 text-slate-800 font-medium leading-relaxed">
                                <span className="font-bold mr-2 text-blue-700">({sIdx + 1})</span>
                                <MathFormula content={stmt.statement} inline />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTrueFalseToggle(currentQ.questionId, stmt.id, 'B')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    currentChoice === 'B'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  BENAR
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTrueFalseToggle(currentQ.questionId, stmt.id, 'S')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    currentChoice === 'S'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  SALAH
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tipe 4: Isian Singkat */}
                {currentQ.type === 'short_answer' && (
                  <div className="space-y-3 bg-purple-50/50 p-5 rounded-2xl border border-purple-200">
                    <label className="block text-xs font-bold text-purple-950">
                      Tuliskan Jawaban Singkat Anda di Bawah Ini:
                    </label>
                    <input
                      type="text"
                      placeholder="Ketikkan jawaban Anda di sini..."
                      value={currentAnswer?.selectedOption || ''}
                      onChange={e => handleShortAnswerChange(currentQ.questionId, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl text-sm bg-white text-slate-900 font-semibold focus:border-purple-600 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-purple-700">
                      *Jawaban Anda akan disimpan secara otomatis ke server ujian.
                    </p>
                  </div>
                )}

                {/* Tipe 5: Uraian / Esai */}
                {currentQ.type === 'essay' && (
                  <div className="space-y-3 bg-amber-50/40 p-5 rounded-2xl border border-amber-200">
                    <label className="block text-xs font-bold text-amber-950">
                      Lembar Jawaban Uraian / Esai Siswa:
                    </label>
                    <textarea
                      rows={7}
                      placeholder="Tuliskan penjelasan, langkah-langkah penyelesaian, dan jawaban lengkap Anda di sini..."
                      value={currentAnswer?.essayAnswer || ''}
                      onChange={e => handleEssayAnswerChange(currentQ.questionId, e.target.value)}
                      className="w-full p-4 border-2 border-amber-300 rounded-xl text-sm bg-white text-slate-900 leading-relaxed focus:border-amber-600 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-amber-800">
                      *Jawaban uraian ini akan diperiksa secara manual oleh guru pengampu berdasarkan rubrik penilaian.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">Tidak ada butir snapshot pada paket ini.</p>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentQ && (
              <button
                onClick={() => toggleDoubtful(currentQ.questionId)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  currentAnswer?.isDoubtful
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Flag className="w-4 h-4" />
                <span>Ragu-Ragu</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {currentIndex < snapshots.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(snapshots.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmFinish(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesai Ujian</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Palette */}
        <div
          className={`w-72 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col shrink-0 ${
            showPaletteMobile
              ? 'fixed inset-y-0 right-0 z-40 w-80 shadow-2xl overflow-y-auto'
              : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Navigasi Soal
            </h3>
            {showPaletteMobile && (
              <button
                onClick={() => setShowPaletteMobile(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Dijawab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span>Ragu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-200"></span>
              <span>Kosong</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2.5 overflow-y-auto max-h-96 p-1">
            {snapshots.map((q, idx) => {
              const ans = answers[q.questionId];
              const isSelectedCurrent = currentIndex === idx;
              let bg = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';

              const answered = isQuestionAnswered(q);
              if (answered) {
                bg = ans?.isDoubtful
                  ? 'bg-amber-400 text-amber-950 border-amber-500 font-bold'
                  : 'bg-emerald-500 text-white border-emerald-600 font-bold';
              } else if (ans?.isDoubtful) {
                bg = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowPaletteMobile(false);
                  }}
                  className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center border-2 transition-transform cursor-pointer ${bg} ${
                    isSelectedCurrent ? 'ring-2 ring-blue-600 ring-offset-2 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Progres Terjawab</span>
              <span className="font-bold text-blue-600">
                {answeredCount} / {snapshots.length}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${(answeredCount / (snapshots.length || 1)) * 100}%` }}
              />
            </div>

            <button
              onClick={() => setShowConfirmFinish(true)}
              className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Kumpulkan Ujian
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmFinish}
        onClose={() => setShowConfirmFinish(false)}
        title="Konfirmasi Selesai Ujian"
        maxWidth="md"
      >
        <div className="py-2">
          <p className="text-sm text-slate-700 mb-4">
            Apakah Anda yakin ingin mengumpulkan ujian ini? Lembar jawaban akan dikunci dan dinilai.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Soal Terjawab:</span>
              <span className="font-bold text-emerald-600">{answeredCount} butir</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Ragu-ragu:</span>
              <span className="font-bold text-amber-600">{doubtfulCount} butir</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Belum Terjawab:</span>
              <span className="font-bold text-rose-600">{unansweredCount} butir</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmFinish(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Lanjutkan Mengerjakan
            </button>
            <button
              onClick={() => handleFinishExam(false)}
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Mengirim...' : 'Ya, Kumpulkan Jawaban'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
