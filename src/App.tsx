import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ExamPlayer } from './components/cbt/ExamPlayer';

const MainApp: React.FC = () => {
  const { userProfile, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl mb-4 shadow-xl shadow-blue-500/20 border border-blue-400/30">
          CBT
        </div>
        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
          Memuat Sistem E-UJIAN SEKOLAH...
        </p>
      </div>
    );
  }

  // If not logged in, show Login Screen
  if (!userProfile) {
    return <LoginView />;
  }

  // If student is currently taking an exam, show full-screen CBT Exam Player
  if (activeExamId) {
    return (
      <ExamPlayer
        examId={activeExamId}
        user={userProfile}
        onExit={() => {
          setActiveExamId(null);
          setActiveTab('history');
        }}
      />
    );
  }

  // Set default tabs if current tab does not belong to the role
  const resolvedTab = () => {
    if (role === 'student' && activeTab !== 'availableExams' && activeTab !== 'history') {
      return 'availableExams';
    }
    if (role === 'teacher' && !['overview', 'questions', 'exams', 'monitoring', 'grades', 'auditLogs'].includes(activeTab)) {
      return 'overview';
    }
    return activeTab;
  };

  const currentTab = resolvedTab();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {role === 'admin' && (
            <AdminDashboard user={userProfile} activeTab={currentTab} />
          )}

          {role === 'teacher' && (
            <TeacherDashboard user={userProfile} activeTab={currentTab} />
          )}

          {role === 'student' && (
            <StudentDashboard
              user={userProfile}
              activeTab={currentTab}
              onStartExam={(examId) => setActiveExamId(examId)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
