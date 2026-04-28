import React, { useState } from 'react';
import { STITCH, ACCENT } from '../../utils/colorMap.js';
import { summarizeSchedule } from '../../utils/gemini.js';

export default function FocusPanel({
  selectedDate,
  tasks = [],
  appointments = [],
  onTaskClick,
  onApptClick,
  selectedProject = null,
  projectStats = null,
  onClearProject,
}) {
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAISummary = async () => {
    setAiLoading(true);
    setAiSummary('');
    const dayTasks = tasks.filter(t => {
      const s = t.task_date || t.due_date;
      const e = t.due_date || t.task_date;
      return s && s <= selectedDate && selectedDate <= (e || s);
    });
    const dayAppts = appointments.filter(a => a.date === selectedDate);
    const result = await summarizeSchedule(dayTasks, dayAppts, selectedDate);
    setAiLoading(false);
    setAiSummary(result || '요약할 일정이 없습니다.');
  };
  const dayItems = [
    ...appointments.filter(a => a.date === selectedDate).map(a => ({ ...a, type: 'appt' })),
    ...tasks.filter(t => {
      const s = t.task_date || t.due_date;
      const e = t.due_date || t.task_date;
      return s && s <= selectedDate && selectedDate <= (e || s);
    }).map(t => ({ ...t, type: 'task' }))
  ].sort((a, b) => (a.start_time || a.task_time || '99:99').localeCompare(b.start_time || b.task_time || '99:99'));

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Calculate actual productivity for the selected date
  const dayTasks = dayItems.filter(item => item.type === 'task');
  const doneTasks = dayTasks.filter(item => item.status === 'done').length;
  const productivity = dayTasks.length > 0 ? Math.round((doneTasks / dayTasks.length) * 100) : 0;

  return (
    <aside style={{
      width: 320,
      background: STITCH.side,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      overflowY: 'auto',
      borderLeft: '1px solid #f1f1f1',
    }}>
      {/* 프로젝트 대시보드 */}
      {selectedProject && projectStats && (
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: ACCENT,
        }}>
          <div style={{ padding: '16px 16px 12px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{selectedProject.name}</span>
              </div>
              <button
                onClick={onClearProject}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                전체 보기
              </button>
            </div>
            {/* 진행률 바 */}
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 6, height: 6, marginBottom: 8 }}>
              <div style={{ width: `${projectStats.progress}%`, height: '100%', background: '#fff', borderRadius: 6, transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>{projectStats.done} / {projectStats.total} 완료</span>
              <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Manrope, sans-serif' }}>{projectStats.progress}%</span>
            </div>
          </div>
          {/* 상태별 태스크 수 */}
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

      <div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: STITCH.text, marginBottom: 4, fontFamily: 'Manrope, sans-serif' }}>Today's Focus</h3>
        <p style={{ fontSize: 13, color: STITCH.softText, fontWeight: 500 }}>{dateStr}</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dayItems.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#ccc', fontSize: 13 }}>
             No events for today.
          </div>
        ) : (
          dayItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.type === 'appt' ? onApptClick(item) : onTaskClick(item)}
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.2s',
                border: '1px solid #f8f8f8',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ 
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', 
                  padding: '2px 8px', borderRadius: 10,
                  background: item.type === 'appt' ? '#eef2ff' : '#fff1f2',
                  color: item.type === 'appt' ? '#4338ca' : '#be123c'
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

      {/* AI 요약 카드 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #f1f1f1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiSummary ? 10 : 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>✨ AI 일정 요약</span>
          <button
            onClick={handleAISummary}
            disabled={aiLoading}
            style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: 'none', border: `1px solid ${ACCENT}33`, borderRadius: 8, padding: '3px 10px', cursor: 'pointer', opacity: aiLoading ? 0.6 : 1 }}
          >
            {aiLoading ? '생성 중...' : '요약 생성'}
          </button>
        </div>
        {aiSummary && (
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
        )}
      </div>

    </aside>
  );
}
