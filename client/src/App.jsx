import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useTaskStore from './store/taskStore.js';
import useViewMode from './hooks/useViewMode.js';
import useGlobalVoice from './hooks/useGlobalVoice.js';
import { supabase } from './lib/supabase.js';
import { STITCH, ACCENT } from './utils/colorMap.js';

import TopBar          from './components/TopBar/TopBar.jsx';
import AppSidebar      from './components/Layout/AppSidebar.jsx';
import FocusPanel      from './components/Layout/FocusPanel.jsx';
import BottomNav       from './components/Layout/BottomNav.jsx';
import Toast           from './components/common/Toast.jsx';
import TaskModal       from './components/TaskModal.jsx';
import UnifiedCreateModal from './components/UnifiedCreateModal.jsx';
import AppointmentModal from './components/AppointmentModal.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Calendar
import CalendarPanel   from './components/Calendar/CalendarPanel.jsx';
import MiniCalendar    from './components/Calendar/MiniCalendar.jsx';
import BentoSchedule   from './components/Calendar/BentoSchedule.jsx';
import TimelineCalendar from './components/Calendar/TimelineCalendar.jsx';

// Kanban / Tasks
import KanbanBoard     from './components/Kanban/KanbanBoard.jsx';
import MobileKanbanBoard from './components/Kanban/MobileKanbanBoard.jsx';

// Archive
import ArchiveView from './components/Archive/ArchiveView.jsx';
import FeedPage from './pages/FeedPage.jsx';

// ── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [needPin, setNeedPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createUser = useTaskStore(s => s.createUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setLoading(true);
    setError('');
    try {
      let loggedUser = null;
      let reqPin = false;
      let errMsg = null;
      const { data: existingUser } = await supabase.from('sm_users').select('*').eq('name', name.trim()).maybeSingle();
      if (existingUser) {
        if (existingUser.pin) {
          if (!pin) { reqPin = true; errMsg = 'Please enter PIN.'; }
          else if (existingUser.pin !== pin) { errMsg = 'Invalid PIN.'; }
          else { loggedUser = existingUser; }
        } else { loggedUser = existingUser; }
      } else {
        const res = await createUser(name.trim());
        if (res.error) errMsg = res.error;
        else loggedUser = res;
      }
      if (reqPin) { setNeedPin(true); setError(errMsg); setLoading(false); return; }
      if (errMsg) { setError(errMsg); setLoading(false); return; }
      onLogin(loggedUser);
    } catch (err) {
      console.error(err);
      setError('Database connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #f5f3ff 0%, #f0f9ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: 360, padding: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: `0 8px 24px ${ACCENT}44` }}>
             <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1", color: '#fff' }}>calendar_month</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0, fontFamily: 'Manrope, sans-serif' }}>Schedule Master</h1>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="text" placeholder="Your Name" value={name} onChange={e => { setName(e.target.value); setNeedPin(false); setError(''); }} autoFocus maxLength={30} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', color: '#111' }} />
          {needPin && (
              <input type="password" inputMode="numeric" placeholder="4-6 Digit PIN" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setError(''); }} maxLength={6} autoFocus style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', color: '#111', textAlign: 'center' }} />
          )}
          {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '-4px 0 0' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1, transition: 'all 0.15s', fontFamily: 'inherit' }}>
            {loading ? 'Logging in...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Task List View ───────────────────────────────────────────────────────────
function TaskListView({ tasks, onTaskClick }) {
  const STATUS_COLOR = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#10b981' };
  const groups = [ { status: 'in_progress', label: 'In Progress' }, { status: 'todo', label: 'To Do' }, { status: 'done', label: 'Completed' } ];
  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      {groups.map(({ status, label }) => {
        const items = tasks.filter(t => t.status === status);
        return (
          <div key={status} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[status] }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(t => (
                <div key={t.id} onClick={() => onTaskClick(t)} style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '1px solid #f1f1f1', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', border: `2px solid ${STATUS_COLOR[t.status]}` }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.status === 'done' ? '#9ca3af' : '#111' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App Component ────────────────────────────────────────────────────────
export default function App() {
  const [currentUser,    setCurrentUser]    = useState(null);
  const [selectedTask,   setSelectedTask]   = useState(null);
  const [selectedAppt,   setSelectedAppt]   = useState(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [createType,     setCreateType]     = useState('task');
  const [createDate,     setCreateDate]     = useState(null);
  const [createStatus,   setCreateStatus]   = useState('todo');
  const [showAdmin,      setShowAdmin]      = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [activeTab,      setActiveTab]      = useState('calendar'); // calendar, kanban, tasks, archived, timeline
  const [showArchived,   setShowArchived]   = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null); // 프로젝트 컨텍스트 모드

  const {
    tasks, users, appointments, projects, loading, toast, selectedDate,
    fetchTasks, fetchUsers, fetchAppointments, fetchProjects,
    addTask, updateTask, deleteTask, moveTask,
    addAppointment, updateAppointment, deleteAppointment,
    getComments, addComment, setSelectedDate,
    startRealtimeSync, stopRealtimeSync,
  } = useTaskStore();

  const { isMobile, isTablet, isDesktop } = useViewMode();

  // 사이드바 상태값 (모바일 전용 드로어 열림 상태. 데스크탑/태블릿에서는 상시 랜더링됨)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('schedule_master_user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); }
      catch { localStorage.removeItem('schedule_master_user'); }
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('schedule_master_user', JSON.stringify(user));
  };
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('schedule_master_user');
  };

  useEffect(() => {
    if (currentUser) {
      fetchTasks(); fetchUsers(); fetchAppointments(); fetchProjects();
      startRealtimeSync();
    }
    return () => stopRealtimeSync();
  }, [currentUser, fetchTasks, fetchUsers, fetchAppointments]);

  const handleCreateTask = useCallback(async (data) => addTask({ ...data, created_by: currentUser?.id }), [addTask, currentUser]);
  const handleUpdateTask = useCallback(async (id, data) => {
    const result = await updateTask(id, data);
    if (!result?.error && selectedTask?.id === id) setSelectedTask(result);
    return result;
  }, [updateTask, selectedTask]);
  const handleDeleteTask = useCallback(async (id) => {
    const result = await deleteTask(id);
    if (!result?.error) setSelectedTask(null);
    return result;
  }, [deleteTask]);
  const handleAddComment = useCallback((taskId, content) =>
    addComment(taskId, { user_id: currentUser?.id, user_name: currentUser?.name, content }),
  [addComment, currentUser]);

  const openCreateTask = useCallback((status = 'todo', date) => {
    setCreateType('task'); setCreateStatus(status); setCreateDate(date ?? selectedDate); setShowCreate(true);
  }, [selectedDate]);
  const openCreateAppt = useCallback((date) => {
    setCreateType('appointment'); setCreateDate(date ?? selectedDate); setShowCreate(true);
  }, [selectedDate]);

  // 음성으로 인식된 자연어 텍스트 (UnifiedCreateModal에 전달용)
  const [voiceNLText, setVoiceNLText] = useState('');
  // Gemini/대화에서 이미 파싱된 데이터 → 모달에 직접 주입 (NLStrip 재파싱 없이)
  const [voiceParsedData, setVoiceParsedData] = useState(null);

  // ── 글로벌 음성 명령: 자연어 텍스트 → 모달 열기 + 파싱 데이터 직접 주입 ────────
  // modalType: 'task' | 'appointment' | null (Gemini가 판단, null이면 키워드로 추정)
  const handleNLVoiceCommand = useCallback((parsed, rawText, modalType = null) => {
    const isAppt = modalType === 'appointment' ||
      (!modalType && rawText && (rawText.includes('약속') || rawText.includes('미팅') || rawText.includes('회의')));
    setCreateType(isAppt ? 'appointment' : 'task');
    setCreateDate(parsed.task_date ?? parsed.date ?? selectedDate);
    // 이미 파싱된 데이터를 직접 폼에 주입 (NLStrip 재파싱 불필요 → 데이터 손실 방지)
    setVoiceParsedData(parsed);
    setVoiceNLText(''); // NLStrip 자동 재파싱 비활성화
    setShowCreate(true);
  }, [selectedDate]);

  // ── 음성 명령: 기존 항목 날짜 이동 ("팀 미팅 내일로 이동해줘") ─────────────────
  const handleMoveItem = useCallback(async (title, modalType, newYmd) => {
    const searchTitle = title.toLowerCase();
    const showToast = useTaskStore.getState().showToast;

    // 약속에서 먼저 검색 (modalType이 appointment이거나 미지정)
    if (modalType !== 'task') {
      const match = appointments.find(a =>
        a.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(a.title.toLowerCase())
      );
      if (match) {
        await updateAppointment(match.id, { date: newYmd });
        fetchAppointments();
        showToast(`"${match.title}" → ${newYmd.slice(5).replace('-', '/')} 이동됨 ✅`, 'success');
        setSelectedDate(newYmd);
        return;
      }
    }
    // 업무에서 검색
    if (modalType !== 'appointment') {
      const match = (tasks || []).find(t =>
        t.title.toLowerCase().includes(searchTitle) ||
        searchTitle.includes(t.title.toLowerCase())
      );
      if (match) {
        await updateTask(match.id, { task_date: newYmd });
        fetchTasks();
        showToast(`"${match.title}" → ${newYmd.slice(5).replace('-', '/')} 이동됨 ✅`, 'success');
        setSelectedDate(newYmd);
        return;
      }
    }
    // 찾지 못한 경우
    showToast(`"${title}"을(를) 찾을 수 없습니다 😅`, 'error');
  }, [appointments, tasks, updateAppointment, updateTask, fetchAppointments, fetchTasks]);

  // ── useGlobalVoice 훅 연결 (PTT + Gemini) ───────────────────────────────────
  const { status: voiceStatus, startListening, stopListening, supported: voiceSupported, convQuestion } = useGlobalVoice({
    onCreateTask:  () => openCreateTask(),
    onCreateAppt:  () => openCreateAppt(),
    onTabChange:   setActiveTab,
    onSelectToday: () => setSelectedDate(new Date().toISOString().slice(0, 10)),
    onSelectDate:  (ymd) => setSelectedDate(ymd),
    onNLCommand:   handleNLVoiceCommand,
    onMoveItem:    handleMoveItem,  // 날짜 이동 음성 명령
    onShowToast:   (msg) => useTaskStore.getState().showToast(msg, 'info'),
  });

  const allTasks = tasks || [];

  // 'archived' 상태인 것과 그렇지 않은 것을 분리
  const activeTasks = allTasks.filter(t => t.status !== 'archived');
  const archivedTasks = allTasks.filter(t => t.status === 'archived');

  // Board/Tasks/Timeline용: 활성 태스크만 (archived 제외)
  const filteredTasks = activeTasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q)) return false;
    }
    if (selectedProjectId && task.project_id !== selectedProjectId) return false;
    return true;
  });

  // Calendar용: archived 포함 전체 (캘린더에는 완료 항목도 잔류)
  const calendarTasks = allTasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q)) return false;
    }
    if (selectedProjectId && task.project_id !== selectedProjectId) return false;
    return true;
  });

  // 선택된 프로젝트 정보
  const selectedProject = projects?.find(p => p.id === selectedProjectId) || null;

  // 프로젝트별 진행률 계산
  const projectStats = useMemo(() => {
    if (!selectedProject) return null;
    const projectTasks = allTasks.filter(t => t.project_id === selectedProjectId && t.status !== 'archived');
    if (projectTasks.length === 0) return null;
    const done = projectTasks.filter(t => t.status === 'done').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    return { total: projectTasks.length, done, inProgress, progress: Math.round((done / projectTasks.length) * 100) };
  }, [allTasks, selectedProjectId]);

  const stats = { 
    total: activeTasks.length, 
    todo: activeTasks.filter(t => t.status === 'todo').length, 
    in_progress: activeTasks.filter(t => t.status === 'in_progress').length, 
    done: activeTasks.filter(t => t.status === 'done').length,
    archived: archivedTasks.length
  };

  // ── 캘린더 드래그앤드롭: 날짜 이동 핸들러 (early return 위에 선언 필수) ────────
  const handleTaskDateDrop = useCallback(async (task, newYmd) => {
    const updates = { task_date: newYmd };
    if (task.task_date && task.due_date && task.task_date !== task.due_date) {
      const start = new Date(task.task_date);
      const end   = new Date(task.due_date);
      const newStart = new Date(newYmd);
      const offsetDays = Math.round((newStart - start) / 86400000);
      const newEnd = new Date(end);
      newEnd.setDate(newEnd.getDate() + offsetDays);
      updates.due_date = newEnd.toISOString().slice(0, 10);
    }
    await updateTask(task.id, updates);
    fetchTasks();
    useTaskStore.getState().showToast(`"${task.title}" → ${newYmd.slice(5).replace('-', '/')} 이동됨 ✅`, 'success');
  }, [updateTask, fetchTasks]);

  const handleApptDateDrop = useCallback(async (appt, newYmd) => {
    await updateAppointment(appt.id, { date: newYmd });
    fetchAppointments();
    useTaskStore.getState().showToast(`"${appt.title}" → ${newYmd.slice(5).replace('-', '/')} 이동됨 ✅`, 'success');
  }, [updateAppointment, fetchAppointments]);

  // ── early return: 로그인 안 된 경우 / 로딩 중 ─────────────────────────────────
  if (!currentUser) return <LoginModal onLogin={handleLogin} />;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: STITCH.bg }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const calProps = { tasks: calendarTasks, appointments, selectedDate, onSelectDate: setSelectedDate, onTaskClick: setSelectedTask, onApptClick: setSelectedAppt, onCreateAppt: openCreateAppt, onTaskDateDrop: handleTaskDateDrop, onApptDateDrop: handleApptDateDrop };
  const boardProps = { tasks: filteredTasks, onTaskClick: setSelectedTask, onMoveTask: moveTask, onCreateTask: openCreateTask, projects: projects };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: STITCH.bg, fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Sidebar ── */}
      <AppSidebar
        open={!isMobile || sidebarOpen}
        isMobile={isMobile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
        users={users}
        onClose={() => setSidebarOpen(false)}
        onCreateNew={() => openCreateTask()}
        currentUser={currentUser}
        onLogout={handleLogout}
        onAdmin={() => setShowAdmin(true)}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onArchiveProject={useTaskStore.getState().archiveProject}
        viewDate={selectedDate}
      />

      {/* ── Main Area ── */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 256,
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        
        <TopBar
          user={currentUser}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          isMobile={isMobile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAdmin={() => setShowAdmin(true)}
          voiceStatus={voiceStatus}
          onVoiceStart={startListening}
          onVoiceStop={stopListening}
          voiceSupported={voiceSupported}
        />


        {/* ── 음성 인식 중 오버레이 ── */}
        {(voiceStatus === 'listening' || voiceStatus === 'processing') && (
          <div
            onClick={voiceStatus === 'listening' ? stopListening : undefined}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20,
            }}
          >
            {/* 마이크 아이콘 (pulse 애니메이션) */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: voiceStatus === 'listening' ? '#ef4444' : '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: voiceStatus === 'listening'
                ? '0 0 0 16px rgba(239,68,68,0.2), 0 0 0 32px rgba(239,68,68,0.1)'
                : '0 0 0 16px rgba(245,158,11,0.2)',
              animation: 'voice-ripple 1.2s ease-out infinite',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#fff' }}>
                {voiceStatus === 'listening' ? 'mic' : 'hourglass_top'}
              </span>
            </div>

            {/* 안내 텍스트 */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'Manrope', marginBottom: 8 }}>
                {voiceStatus === 'listening' ? '듣고 있습니다...' : 'AI가 처리 중...'}
              </p>
              {/* 대화 중일 때: AI 질문 표시 */}
              {convQuestion && (
                <div style={{
                  background: 'rgba(255,255,255,0.18)', borderRadius: 14,
                  padding: '10px 20px', marginBottom: 8,
                  color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'Manrope',
                }}>
                  💬 {convQuestion}
                </div>
              )}
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter' }}>
                {convQuestion
                  ? '버튼을 꾹 눌러서 답변하세요'
                  : voiceStatus === 'listening'
                    ? '말하고 버튼을 떼면 AI가 처리합니다'
                    : '잠시만 기다려주세요'}
              </p>
            </div>

            {/* 명령어 힌트 카드 */}
            {voiceStatus === 'listening' && (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '14px 24px',
                display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
                maxWidth: 480,
              }}>
                {['내일 2시 팀 미팅', '새 업무', '4월8일 확인', '캘린더', '오늘'].map(cmd => (
                  <span key={cmd} style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 20, padding: '6px 14px',
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Manrope',
                  }}>
                    "{cmd}"
                  </span>
                ))}
              </div>
            )}

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              화면을 누르면 취소
            </p>

            {/* ripple 애니메이션 CSS */}
            <style>{`
              @keyframes voice-ripple {
                0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 0 0 0 rgba(239,68,68,0.2); }
                70%  { box-shadow: 0 0 0 20px rgba(239,68,68,0), 0 0 0 40px rgba(239,68,68,0); }
                100% { box-shadow: 0 0 0 0 rgba(239,68,68,0), 0 0 0 0 rgba(239,68,68,0); }
              }
            `}</style>
          </div>
        )}

        {/* Dynamic Content Structure */}
        <section style={{ flex: 1, display: 'flex', overflowY: 'auto', overflowX: 'hidden' }}>
          
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            width: '100%',
            overflowY: 'auto',
            // 모바일: 하단 네비게이션 바(약 80px) + safe-area만큼 여백 추가
            padding: isMobile ? '16px 16px calc(90px + env(safe-area-inset-bottom, 0px)) 16px' : '32px',
          }}>
            {/* Main Tabs (Calendar/Board/Tasks) */}
            <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', minHeight: isDesktop || isTablet ? 650 : 'auto' }}>
              {activeTab === 'calendar' && (
                 isMobile ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ background: '#fff', borderRadius: 24, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <MiniCalendar tasks={filteredTasks} appointments={appointments} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                      </div>
                      <BentoSchedule selectedDate={selectedDate} tasks={filteredTasks} appointments={appointments} onTaskClick={setSelectedTask} onApptClick={setSelectedAppt} />
                   </div>
                 ) : (
                   <CalendarPanel {...calProps} />
                 )
              )}
              {activeTab === 'kanban' && (isMobile ? <MobileKanbanBoard {...boardProps} /> : <KanbanBoard {...boardProps} />)}
              {activeTab === 'timeline' && (
                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <TimelineCalendar 
                    projectTitle="Project Timeline"
                    projectTasks={activeTasks}
                    projectAppointments={appointments}
                    onDateSelect={setSelectedDate}
                    onTaskClick={setSelectedTask}
                    onApptClick={setSelectedAppt}
                    projects={projects}
                  />
                </div>
              )}
              {activeTab === 'feed' && (
                <FeedPage
                  projects={projects}
                  users={users}
                  tasks={filteredTasks}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'archived' && (
                <ArchiveView
                  tasks={archivedTasks}
                  projects={projects}
                  onTaskClick={setSelectedTask}
                  onRestoreTask={(id) => handleUpdateTask(id, { status: 'done' })}
                />
              )}
            </div>

            {/* Tablet View: FocusPanel appears BELOW Calendar in same scrollable area */}
            {isTablet && activeTab === 'calendar' && (
               <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f1f1' }}>
                 <BentoSchedule selectedDate={selectedDate} tasks={filteredTasks} appointments={appointments} onTaskClick={setSelectedTask} onApptClick={setSelectedAppt} />
               </div>
            )}
          </div>

          {/* Desktop View: FocusPanel is persistent on the right */}
          {isDesktop && activeTab === 'calendar' && (
            <div style={{ width: 320, flexShrink: 0, height: '100%', overflowY: 'auto', background: STITCH.side }}>
              <FocusPanel selectedDate={selectedDate} tasks={filteredTasks} appointments={appointments} onTaskClick={setSelectedTask} onApptClick={setSelectedAppt} selectedProject={selectedProject} projectStats={projectStats} onClearProject={() => setSelectedProjectId(null)} users={users} currentUser={currentUser} />
            </div>
          )}

        </section>

        {isMobile && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            voiceStatus={voiceStatus}
            onVoiceStart={startListening}
            onVoiceStop={stopListening}
            voiceSupported={voiceSupported}
          />
        )}
      </main>

      {/* Floating Action Elements */}
      {isMobile && (
        <button onClick={() => openCreateTask()} style={{ position: 'fixed', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 16, background: `linear-gradient(to bottom, ${ACCENT}, #8d0000)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${ACCENT}55`, zIndex: 45 }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 32 }}>add</span>
        </button>
      )}

      {selectedAppt && <AppointmentModal appt={selectedAppt} currentUser={currentUser} onClose={() => setSelectedAppt(null)} onUpdate={async (id, data) => { const result = await updateAppointment(id, data); if (!result?.error) setSelectedAppt(result); return result; }} onDelete={deleteAppointment} />}
      {selectedTask && <TaskModal task={selectedTask} users={users} currentUser={currentUser} onClose={() => setSelectedTask(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onAddComment={handleAddComment} getComments={getComments} projects={projects} />}
      {showCreate && <UnifiedCreateModal defaultType={createType} defaultDate={createDate} defaultStatus={createStatus} defaultProjectId={selectedProjectId} initialNLText={voiceNLText} initialParsedData={voiceParsedData} users={users} currentUser={currentUser} projects={projects} onClose={() => { setShowCreate(false); setVoiceNLText(''); setVoiceParsedData(null); }} onCreate={async (data) => { await handleCreateTask(data); fetchTasks(); }} onCreateAppt={async (data) => { await addAppointment(data); fetchAppointments(); }} />}
      {showAdmin && <AdminPage currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
      <Toast toast={toast} />
      <style>{`* { box-sizing: border-box; } .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
