import React, { useRef, useState, useEffect } from 'react';
import KanbanCard from './KanbanCard.jsx';

const COLUMNS = [
  { id: 'todo',        label: '할 일',   dot: '#64748b', countBg: '#f1f5f9', countColor: '#475569' },
  { id: 'in_progress', label: '진행 중', dot: '#f59e0b', countBg: '#fef3c7', countColor: '#92400e' },
  { id: 'done',        label: '완료',    dot: '#10b981', countBg: '#d1fae5', countColor: '#065f46' },
];

export default function MobileKanbanBoard({ tasks, onTaskClick, onMoveTask, onCreateTask }) {
  const scrollRef = useRef(null);
  const [activeCol, setActiveCol] = useState(0);

  const tasksByStatus = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
  };

  // scroll-snap 위치 감지 → 활성 dot 업데이트
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.offsetWidth);
      setActiveCol(Math.min(idx, COLUMNS.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // dot 클릭 → 해당 컬럼으로 스냅
  const goToCol = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.offsetWidth * idx, behavior: 'smooth' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── 컬럼 헤더 탭 (고정) ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #f0f0f0',
        background: '#fff', flexShrink: 0, padding: '0 4px',
      }}>
        {COLUMNS.map((col, idx) => {
          const count = tasksByStatus[col.id]?.length || 0;
          const isActive = activeCol === idx;
          return (
            <button
              key={col.id}
              onClick={() => goToCol(idx)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, position: 'relative',
                borderBottom: isActive ? `2px solid ${col.dot}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: col.dot,
                opacity: isActive ? 1 : 0.4,
              }} />
              <span style={{
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#111' : '#9ca3af',
              }}>
                {col.label}
              </span>
              <span style={{
                padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: isActive ? col.countBg : '#f5f5f5',
                color: isActive ? col.countColor : '#aaa',
                transition: 'all 0.15s',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 수평 스크롤 컬럼 영역 ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          display: 'flex',
          overflowX: 'scroll',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',          // Firefox
        }}
      >
        <style>{`
          .mobile-kanban-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.id] || [];
          return (
            <div
              key={col.id}
              style={{
                minWidth: '100%',
                width: '100%',
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                padding: '12px 12px 80px',   // 하단 여유 (+ 버튼 공간)
                boxSizing: 'border-box',
                gap: 10,
              }}
            >
              {/* 카드 없을 때 */}
              {colTasks.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: 160,
                  color: '#d1d5db', fontSize: 13, gap: 8,
                }}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  작업이 없습니다
                </div>
              )}

              {/* 카드 목록 */}
              {colTasks.map(task => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onMoveTask={onMoveTask}
                />
              ))}

              {/* 작업 추가 버튼 */}
              <button
                onClick={() => onCreateTask(col.id)}
                style={{
                  width: '100%', padding: '12px', marginTop: 4,
                  border: `1.5px dashed ${col.dot}40`,
                  borderRadius: 12, background: `${col.dot}08`,
                  cursor: 'pointer', color: col.dot,
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {col.label}에 작업 추가
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 하단 dot 인디케이터 ── */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        {COLUMNS.map((col, idx) => (
          <div
            key={col.id}
            style={{
              width: activeCol === idx ? 20 : 6,
              height: 6, borderRadius: 3,
              background: activeCol === idx ? col.dot : '#d1d5db',
              transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
