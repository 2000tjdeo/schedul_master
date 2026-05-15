import React, { useState, useEffect, useRef } from 'react';
import { STITCH, ACCENT } from '../../utils/colorMap.js';
import { summarizeSchedule, weeklyProjectSummary } from '../../utils/gemini.js';
import ProjectFeed from '../Notes/ProjectFeed.jsx';
import useTaskStore from '../../store/taskStore.js';

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = dt => dt.toISOString().slice(0, 10);
  return { start: fmt(mon), end: fmt(sun) };
}

export default function FocusPanel({
  selectedDate,
  tasks = [],
  appointments = [],
  onTaskClick,
  onApptClick,
  selectedProject = null,
  projectStats = null,
  onClearProject,
  users = [],
  currentUser = null,
  projects = [],
}) {
  const addNote = useTaskStore(s => s.addNote);

  const [focusTab, setFocusTab] = useState('schedule');
  const [briefingTab, setBriefingTab] = useState('today');
  const [todaySummary, setTodaySummary] = useState('');
  const [weeklySummary, setWeeklySummary] = useState('');
  const [todayLoading, setTodayLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [saveProjectId, setSaveProjectId] = useState('');

  // cache: { [dateKey]: summary }
  const todayCache = useRef({});
  const weeklyCache = useRef({});

  const week = getWeekRange(selectedDate);
  const weekKey = week.start;

  const dayTasks = tasks.filter(t => {
    const s = t.task_date || t.due_date;
    const e = t.due_date || t.task_date;
    return s && s <= selectedDate && selectedDate <= (e || s);
  });
  const dayAppts = appointments.filter(a => a.date === selectedDate);

  const weekTasks = tasks.filter(t => {
    const d = t.task_date || t.due_date;
    return d && d >= week.start && d <= week.end;
  });
  const weekAppts = appointments.filter(a => a.date >= week.start && a.date <= week.end);

  const dayItems = [
    ...dayAppts.map(a => ({ ...a, type: 'appt' })),
    ...dayTasks.map(t => ({ ...t, type: 'task' })),
  ].sort((a, b) => (a.start_time || a.task_time || '99:99').localeCompare(b.start_time || b.task_time || '99:99'));

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  // 날짜 바뀌면 오늘 탭으로 리셋
  useEffect(() => {
    setBriefingTab('today');
    if (todayCache.current[selectedDate]) {
      setTodaySummary(todayCache.current[selectedDate]);
    } else {
      setTodaySummary('');
    }
  }, [selectedDate]);

  const handleTodaySummary = async () => {
    if (todayCache.current[selectedDate]) {
      setTodaySummary(todayCache.current[selectedDate]);
      return;
    }
    setTodayLoading(true);
    const result = await summarizeSchedule(dayTasks, dayAppts, selectedDate);
    const text = result || '요약할 일정이 없습니다.';
    todayCache.current[selectedDate] = text;
    setTodaySummary(text);
    setTodayLoading(false);
  };

  const handleWeeklySummary = async () => {
    if (weeklyCache.current[weekKey]) {
      setWeeklySummary(weeklyCache.current[weekKey]);
      return;
    }
    setWeeklyLoading(true);
    const result = await weeklyProjectSummary(weekTasks, weekAppts, projects, week.start, week.end);
    const text = result || '이번 주 데이터가 부족합니다.';
    weeklyCache.current[weekKey] = text;
    setWeeklySummary(text);
    setWeeklyLoading(false);
  };

  const FALLBACK_TEXTS = ['요약할 일정이 없습니다.', '이번 주 데이터가 부족합니다.'];

  const handleSaveNote = async () => {
    const summary = briefingTab === 'today' ? todaySummary : weeklySummary;
    if (!summary || saving) return;
    // 폴백 텍스트는 저장 차단
    if (FALLBACK_TEXTS.includes(summary.trim())) return;
    const pid = selectedProject?.id || saveProjectId;
    if (!pid) {
      setShowProjectPicker(true);
      return;
    }
    setSaving(true);
    setShowProjectPicker(false);
    const header = briefingTab === 'today'
      ? `AI 일일 브리핑 · ${dateStr}`
      : `AI 주간 요약 · ${week.start} ~ ${week.end}`;
    // title 없이 content에 헤더 포함 — NoteForm progress 타입에 title 입력란 없음
    await addNote({
      type: 'progress',
      content: `[${header}]\n\n${summary}`,
      project_id: pid,
      from_user_id: currentUser?.id || null,
    });
    setSaving(false);
    setSaveProjectId('');
  };

  const currentSummary = briefingTab === 'today' ? todaySummary : weeklySummary;
  const currentLoading = briefingTab === 'today' ? todayLoading : weeklyLoading;
  const handleGenerate = briefingTab === 'today' ? handleTodaySummary : handleWeeklySummary;

  return (
    <aside style={{
      width: 320,
      background: STITCH.side,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      overflowY: 'auto',
      borderLeft: '1px solid #f1f1f1',
    }}>

      {/* 프로젝트 탭 (일정/피드) */}
      {selectedProject && (
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3, flexShrink: 0 }}>
          {[
            { id: 'schedule', label: '일정', icon: 'calendar_today' },
            { id: 'feed',     label: '피드', icon: 'feed' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFocusTab(t.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: focusTab === t.id ? '#fff' : 'transparent',
                fontSize: 12, fontWeight: focusTab === t.id ? 700 : 500,
                color: focusTab === t.id ? '#1a1c1c' : '#9ca3af',
                boxShadow: focusTab === t.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s', fontFamily: 'Manrope, sans-serif',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: focusTab === t.id ? "'FILL' 1" : "'FILL' 0" }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 피드 탭 */}
      {selectedProject && focusTab === 'feed' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ProjectFeed
            projectId={selectedProject.id}
            projectName={selectedProject.name || selectedProject.title}
            users={users}
            tasks={tasks}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* 일정 탭 */}
      {(!selectedProject || focusTab === 'schedule') && (<>

        {/* ── AI 브리핑 카드 ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', overflow: 'hidden' }}>
          {/* 헤더 */}
          <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1c1c' }}>✨ AI 브리핑</span>
            {/* 오늘 / 이번 주 탭 */}
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
              {[{ id: 'today', label: '오늘' }, { id: 'week', label: '이번 주' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setBriefingTab(t.id)}
                  style={{
                    padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                    background: briefingTab === t.id ? '#fff' : 'transparent',
                    color: briefingTab === t.id ? '#1a1c1c' : '#9ca3af',
                    boxShadow: briefingTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* 요약 내용 */}
          <div style={{ padding: '10px 14px' }}>
            {currentSummary ? (
              <p style={{ fontSize: 12, color: '#555', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                {currentSummary}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#c4c4c4', margin: 0 }}>
                {briefingTab === 'today'
                  ? `${dateStr} 일정을 요약합니다.`
                  : `${week.start} ~ ${week.end} 주간을 요약합니다.`}
              </p>
            )}
          </div>

          {/* 프로젝트 선택 picker (project_id 없을 때) */}
          {showProjectPicker && currentSummary && (
            <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={saveProjectId}
                onChange={e => setSaveProjectId(e.target.value)}
                style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', background: '#fff' }}
              >
                <option value="">프로젝트 선택</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.title}</option>
                ))}
              </select>
              <button
                onClick={handleSaveNote}
                disabled={!saveProjectId || saving}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: ACCENT, border: 'none', borderRadius: 8,
                  padding: '4px 10px', cursor: 'pointer',
                  opacity: (!saveProjectId || saving) ? 0.5 : 1,
                }}
              >{saving ? '저장 중...' : '저장'}</button>
              <button
                onClick={() => setShowProjectPicker(false)}
                style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
              >취소</button>
            </div>
          )}

          {/* 하단 액션 */}
          <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            {currentSummary && !showProjectPicker && (
              <button
                onClick={handleSaveNote}
                disabled={saving}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#52525b',
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  padding: '4px 10px', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bookmark</span>
                {saving ? '저장 중...' : '노트 저장'}
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={currentLoading}
              style={{
                fontSize: 11, fontWeight: 700, color: ACCENT,
                background: 'none', border: `1px solid ${ACCENT}44`,
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                opacity: currentLoading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
              {currentLoading ? '생성 중...' : currentSummary ? '재생성' : '생성'}
            </button>
          </div>
        </div>

        {/* ── 프로젝트 카드 ── */}
        {selectedProject && projectStats && (
          <div style={{ borderRadius: 16, overflow: 'hidden', background: ACCENT }}>
            <div style={{ padding: '16px 16px 12px', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{selectedProject.name}</span>
                </div>
                <button
                  onClick={onClearProject}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >전체 보기</button>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 6, height: 6, marginBottom: 8 }}>
                <div style={{ width: `${projectStats.progress}%`, height: '100%', background: '#fff', borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{projectStats.done} / {projectStats.total} 완료</span>
                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Manrope, sans-serif' }}>{projectStats.progress}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)' }}>
              {[
                { label: '할 일', count: projectStats.total - projectStats.done - (projectStats.inProgress || 0) },
                { label: '진행 중', count: projectStats.inProgress || 0 },
                { label: '완료', count: projectStats.done },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{s.count}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Today's Focus ── */}
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: STITCH.text, marginBottom: 4, fontFamily: 'Manrope, sans-serif' }}>Today's Focus</h3>
          <p style={{ fontSize: 13, color: STITCH.softText, fontWeight: 500 }}>{dateStr}</p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dayItems.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#ccc', fontSize: 13 }}>
              일정이 없습니다.
            </div>
          ) : (
            dayItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.type === 'appt' ? onApptClick(item) : onTaskClick(item)}
                style={{
                  background: '#fff', padding: '16px', borderRadius: 16,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s', border: '1px solid #f8f8f8',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 10,
                    background: item.type === 'appt' ? '#eef2ff' : '#fff1f2',
                    color: item.type === 'appt' ? '#4338ca' : '#be123c',
                  }}>
                    {item.type === 'appt' ? 'Appointment' : 'Task'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                    {item.start_time || item.task_time || 'All Day'}
                  </span>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1a1c1c', lineHeight: 1.4 }}>{item.title}</h4>
              </div>
            ))
          )}
        </div>

      </>)}
    </aside>
  );
}
