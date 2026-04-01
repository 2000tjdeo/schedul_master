import React, { useState, useRef, useEffect } from 'react';
import KanbanBoard from '../Kanban/KanbanBoard.jsx';
import CalendarPanel from '../Calendar/CalendarPanel.jsx';

const SPLIT_THRESHOLD = 1100; // px — 이 너비 미만이면 탭 모드

export default function SplitView({ tasks, appointments, onTaskClick, onApptClick, onCreateAppt, onMoveTask, onCreateTask, selectedDate, onSelectDate }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [activeTab, setActiveTab] = useState('kanban');

  // ResizeObserver로 컨테이너 너비 감지
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isSplit = containerWidth >= SPLIT_THRESHOLD;

  const boardEl = (
    <div style={{ overflow: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 12, height: '100%' }}>
      <KanbanBoard
        tasks={tasks}
        onTaskClick={onTaskClick}
        onMoveTask={onMoveTask}
        onCreateTask={onCreateTask}
      />
    </div>
  );

  const calEl = (
    <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid #f0f0f0', height: '100%' }}>
      <CalendarPanel
        tasks={tasks}
        appointments={appointments}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onTaskClick={onTaskClick}
        onApptClick={onApptClick}
        onCreateAppt={onCreateAppt}
      />
    </div>
  );

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isSplit ? (
        /* ── 넓은 화면: 좌우 나란히 ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, overflow: 'hidden' }}>
          {boardEl}
          {calEl}
        </div>
      ) : (
        /* ── 좁은 화면: 탭 전환 ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 탭 버튼 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, background: '#f0f0f0', borderRadius: 10, padding: 4, alignSelf: 'flex-start' }}>
            {[['kanban', '칸반'], ['calendar', '달력']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '6px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13,
                  background: activeTab === key ? '#fff' : 'transparent',
                  color: activeTab === key ? '#E63325' : '#888',
                  boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* 탭 콘텐츠 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'kanban' ? boardEl : calEl}
          </div>
        </div>
      )}
    </div>
  );
}
